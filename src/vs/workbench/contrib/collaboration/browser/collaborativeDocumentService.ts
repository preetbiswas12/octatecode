/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOperation } from './collaborationTypes.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { OperationalTransform } from './operationalTransform.js';

/**
 * Service for managing collaborative document state and operation history
 */
export class CollaborativeDocumentService {
	private _content: string = '';
	private _operationHistory: IOperation[] = [];
	private _currentVersion: number = 0;
	private _pendingOperations: IOperation[] = [];

	private readonly _onDocumentChanged = new Emitter<{ content: string; version: number }>();
	public readonly onDocumentChanged: Event<{ content: string; version: number }> = this._onDocumentChanged.event;

	private readonly _onOperationApplied = new Emitter<IOperation>();
	public readonly onOperationApplied: Event<IOperation> = this._onOperationApplied.event;

	private readonly _onSyncRequired = new Emitter<void>();
	public readonly onSyncRequired: Event<void> = this._onSyncRequired.event;

	constructor(initialContent: string = '') {
		this._content = initialContent;
	}

	/**
	 * Initialize the document service with a collaboration session
	 */
	public initialize(session: { version: number }, content: string): void {
		this._content = content;
		this._currentVersion = session.version;
		this._operationHistory = [];
		this._pendingOperations = [];
	}

	/**
	 * Get current document content
	 */
	public getContent(): string {
		return this._content;
	}

	/**
	 * Get current document version
	 */
	public getVersion(): number {
		return this._currentVersion;
	}

	/**
	 * Get all operations in history
	 */
	public getOperationHistory(): IOperation[] {
		return [...this._operationHistory];
	}

	/**
	 * Apply a remote operation to the local document
	 * This handles OT transformation against pending operations
	 */
	public applyRemoteOperation(operation: IOperation): void {
		if (operation.version <= this._currentVersion) {
			console.warn('Received operation with old version, ignoring', operation);
			return;
		}

		let transformedOp = operation;

		// Transform against all pending operations
		for (const pending of this._pendingOperations) {
			transformedOp = OperationalTransform.transform(transformedOp, pending);
		}

		// Apply the transformed operation
		this._content = OperationalTransform.applyOperation(this._content, transformedOp);
		this._currentVersion = operation.version;
		this._operationHistory.push(transformedOp);

		this._onOperationApplied.fire(transformedOp);
		this._onDocumentChanged.fire({ content: this._content, version: this._currentVersion });
	}

	/**
	 * Apply a local operation
	 * This creates an operation and applies it optimistically
	 */
	public applyLocalOperation(
		type: 'insert' | 'delete',
		position: number,
		content?: string,
		length?: number,
		userId?: string
	): IOperation {
		const operation: IOperation = {
			type,
			position,
			content,
			length,
			userId: userId || 'local',
			timestamp: Date.now(),
			version: this._currentVersion + 1
		};

		// Apply optimistically
		this._content = OperationalTransform.applyOperation(this._content, operation);
		this._currentVersion = operation.version;
		this._operationHistory.push(operation);

		// Add to pending operations
		this._pendingOperations.push(operation);

		this._onOperationApplied.fire(operation);
		this._onDocumentChanged.fire({ content: this._content, version: this._currentVersion });

		return operation;
	}

	/**
	 * Acknowledge that a pending operation has been processed by the server
	 */
	public acknowledgeOperation(operation: IOperation): void {
		const index = this._pendingOperations.findIndex(
			op => op.timestamp === operation.timestamp && op.userId === operation.userId
		);

		if (index >= 0) {
			this._pendingOperations.splice(index, 1);
		}

		if (this._pendingOperations.length === 0) {
			// All operations synced
		}
	}

	/**
	 * Get pending operations (not yet acknowledged by server)
	 */
	public getPendingOperations(): IOperation[] {
		return [...this._pendingOperations];
	}

	/**
	 * Request full sync from server (when connection restored)
	 */
	public requestSync(): void {
		this._onSyncRequired.fire();
	}

	/**
	 * Reset document state (on sync from server)
	 */
	public resetState(content: string, version: number): void {
		this._content = content;
		this._currentVersion = version;
		this._pendingOperations = [];
	}

	/**
	 * Get document statistics
	 */
	public getStats(): { contentLength: number; operationCount: number; pendingCount: number; version: number } {
		return {
			contentLength: this._content.length,
			operationCount: this._operationHistory.length,
			pendingCount: this._pendingOperations.length,
			version: this._currentVersion
		};
	}

	/**
	 * Dispose resources
	 */
	public dispose(): void {
		this._onDocumentChanged.dispose();
		this._onOperationApplied.dispose();
		this._onSyncRequired.dispose();
	}
}
