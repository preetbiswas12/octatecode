/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { URI } from '../../../../base/common/uri.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { ICollaborationService } from './collaborationService.js';
import { IOperationalTransformService } from './operationalTransform.js';
import {
	CollaborativeEdit,
	FileSnapshot,
	CollaborationStatus,
} from '../common/collaborationServiceTypes.js';

export interface IFileSyncService {
	readonly _serviceBrand: undefined;
	initialize(): void;
}

export const IFileSyncService = createDecorator<IFileSyncService>('fileSyncService');

class FileSyncService extends Disposable implements IFileSyncService {
	readonly _serviceBrand: undefined;

	private fileVersions: Map<string, number> = new Map();
	private syncDelayer = new ThrottledDelayer<void>(500);
	private isApplyingRemoteEdit = false;

	// Retry logic for failed syncs
	private failedSyncs: Map<string, { retries: number; timestamp: number }> = new Map();
	private readonly MAX_SYNC_RETRIES = 3;

	constructor(
		@IModelService private modelService: IModelService,
		@ICollaborationService private collaborationService: ICollaborationService,
		@IOperationalTransformService private otService: IOperationalTransformService,
	) {
		super();
	}

	initialize(): void {
		// Listen for file changes and broadcast them
		this.modelService.onModelAdded((model) => {
			this.monitorModel(model);
		});

		// Listen for remote edits
		const editUnsub = this.collaborationService.onEditReceived((edit) => {
			this.applyRemoteEdit(edit);
		});
		this._register(toDisposable(() => editUnsub()));

		// Listen for collaboration status changes
		const statusUnsub = this.collaborationService.onStatusChanged((status) => {
			if (status === CollaborationStatus.CONNECTED) {
				this.retryFailedSyncs();
			}
		});
		this._register(toDisposable(() => statusUnsub()));

		// Monitor existing models
		for (const model of this.modelService.getModels()) {
			this.monitorModel(model);
		}
	}

	private monitorModel(model: any): void {
		const uri = model.uri.toString();

		// Initialize version tracking
		if (!this.fileVersions.has(uri)) {
			this.fileVersions.set(uri, 0);
		}

		// Listen for changes
		model.onDidChangeContent((event: any) => {
			if (this.isApplyingRemoteEdit) return; // Don't broadcast edits we're applying

			this.syncDelayer.trigger(async () => {
				await this.broadcastFileChange(model, event);
			}).catch((error) => {
				console.error('[FileSync] Error broadcasting change:', error);
				// Will be retried automatically
			});
		});
	}

	private async broadcastFileChange(model: any, event: any): Promise<void> {
		const uri = model.uri.toString();
		const version = (this.fileVersions.get(uri) || 0) + 1;
		this.fileVersions.set(uri, version);

		try {
			const snapshot: FileSnapshot = {
				fileUri: uri,
				version,
				content: model.getValue(),
				timestamp: Date.now(),
				userId: '', // Will be set by collaboration service
			};

			await this.collaborationService.broadcastFileSync(snapshot);

			// Clear any retry state for this file
			this.failedSyncs.delete(uri);
		} catch (error) {
			console.error('[FileSync] Error broadcasting file change:', error);
			this.recordFailedSync(uri);
		}
	}

	private recordFailedSync(uri: string): void {
		const existing = this.failedSyncs.get(uri) || { retries: 0, timestamp: Date.now() };

		if (existing.retries < this.MAX_SYNC_RETRIES) {
			this.failedSyncs.set(uri, {
				retries: existing.retries + 1,
				timestamp: Date.now(),
			});
			console.log(`[FileSync] Scheduled retry for ${uri} (attempt ${existing.retries + 1}/${this.MAX_SYNC_RETRIES})`);
		} else {
			console.error(`[FileSync] Max retries reached for ${uri}`);
			this.failedSyncs.delete(uri);
		}
	}

	private retryFailedSyncs(): void {
		for (const [uri] of this.failedSyncs) {
			const model = this.modelService.getModels().find(m => m.uri.toString() === uri);
			if (model) {
				console.log(`[FileSync] Retrying sync for ${uri}`);
				this.broadcastFileChange(model, null).catch(() => {
					// Already logged in broadcastFileChange
				});
			}
		}
	}

	private async applyRemoteEdit(edit: CollaborativeEdit): Promise<void> {
		try {
			const uri = URI.parse(edit.fileUri);
			const model = this.modelService.getModel(uri);

			if (!model) {
				console.warn('[FileSync] Model not found for:', edit.fileUri);
				return;
			}

			this.isApplyingRemoteEdit = true;

			// Get current version and content for OT
			const currentVersion = (this.fileVersions.get(edit.fileUri) || 0) + 1;
			const currentContent = model.getValue();

			// Add operation to OT service and get history
			const operation = this.otService.addOperation(edit, currentVersion);
			const history = this.otService.getOperationHistory(edit.fileUri);

			// Transform operation against history (excluding itself)
			const otherOps = history.filter(op => op.id !== operation.id);
			const transformedOp = this.otService.transformOperation(operation, otherOps);

			// Validate transformation
			if (!this.otService.validateOperationSequence(edit.fileUri)) {
				console.error('[FileSync] Operation sequence invalid after transformation');
				return;
			}

			// Apply transformed operation
			const newContent = this.otService.applyOperation(currentContent, transformedOp);

			// Update model (will trigger change event, but we have isApplyingRemoteEdit flag)
			model.setValue(newContent);

			// Update version
			this.fileVersions.set(edit.fileUri, currentVersion);

			console.log(
				`[FileSync] Applied OT-transformed edit to ${edit.fileUri} from ${edit.userId} (v${currentVersion})`
			);
		} catch (error) {
			console.error('[FileSync] Error applying remote edit:', error);
		} finally {
			this.isApplyingRemoteEdit = false;
		}
	}

	override dispose(): void {
		this.syncDelayer.dispose();
		this.failedSyncs.clear();
		super.dispose();
	}
}

registerSingleton(IFileSyncService, FileSyncService, InstantiationType.Eager);
