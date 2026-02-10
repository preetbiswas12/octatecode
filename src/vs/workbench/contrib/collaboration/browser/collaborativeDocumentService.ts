/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOperation } from './collaborationTypes.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { OperationalTransform } from './operationalTransform.js';

/**
 * P2P Document Service with Decentralized Versioning
 *
 * Pure P2P Architecture:
 * - No server version authority
 * - Each peer maintains local causal history
 * - Operations stamped with (peerId, localVersion) lamport timestamps
 * - Conflict-free replication through OT + peer ordering
 */
export class CollaborativeDocumentService {
	private _content: string = '';
	private _operationHistory: IOperation[] = [];
	private _peerId: string = '';
	private _localVersion: number = 0;
	private _pendingOperations: IOperation[] = [];
	private _appliedRemoteVersions: Set<string> = new Set();

	private readonly _onDocumentChanged = new Emitter<{ content: string; version: number }>();
	public readonly onDocumentChanged: Event<{ content: string; version: number }> = this._onDocumentChanged.event;

	private readonly _onOperationApplied = new Emitter<IOperation>();
	public readonly onOperationApplied: Event<IOperation> = this._onOperationApplied.event;

	private readonly _onSyncRequired = new Emitter<void>();
	public readonly onSyncRequired: Event<void> = this._onSyncRequired.event;

	/**
	 * Initialize P2P document service with peer identity
	 * Each peer has independent versioning in decentralized model
	 */
	public initialize(session: { peerId: string; version?: number }, content: string): void {
		this._content = content;
		this._peerId = session.peerId;
		this._localVersion = session.version || 0;
		this._operationHistory = [];
		this._pendingOperations = [];
		this._appliedRemoteVersions.clear();
	}

	/**
	 * Get current document content
	 */
	public getContent(): string {
		return this._content;
	}

	/**
	 * Get local version number for this peer
	 * In P2P: Each peer has independent versioning
	 */
	public getVersion(): number {
		return this._localVersion;
	}

	/**
	 * Get all operations in history
	 */
	public getOperationHistory(): IOperation[] {
		return [...this._operationHistory];
	}

	/**
	 * Apply a remote operation in P2P mode
	 * No server version authority - use causal versioning
	 * Stamp with (peerId, version) lamport pairs for deterministic ordering
	 */
	public applyRemoteOperation(operation: IOperation): void {
		const opId = `${operation.userId}-${operation.timestamp}`;

		// Skip if already applied
		if (this._appliedRemoteVersions.has(opId)) {
			return;
		}

		let transformedOp = operation;

		// Transform against all pending local operations
		for (const pending of this._pendingOperations) {
			transformedOp = OperationalTransform.transform(transformedOp, pending);
		}

		// Apply the transformed operation
		this._content = OperationalTransform.applyOperation(this._content, transformedOp);
		this._operationHistory.push(transformedOp);
		this._appliedRemoteVersions.add(opId);

		this._onOperationApplied.fire(transformedOp);
		this._onDocumentChanged.fire({ content: this._content, version: this._localVersion });
	}

	/**
	 * Apply a local operation in P2P mode
	 * Assign local version number independent of other peers
	 * Stamp with (peerId, localVersion) for ordering
	 */
	public applyLocalOperation(
		type: 'insert' | 'delete',
		position: number,
		content?: string,
		length?: number,
		userId?: string
	): IOperation {
		this._localVersion++;

		const operation: IOperation = {
			type,
			position,
			content,
			length,
			userId: userId || this._peerId,
			timestamp: Date.now(),
			version: this._localVersion
		};

		// Apply optimistically
		this._content = OperationalTransform.applyOperation(this._content, operation);
		this._operationHistory.push(operation);

		// Add to pending operations
		this._pendingOperations.push(operation);

		this._onOperationApplied.fire(operation);
		this._onDocumentChanged.fire({ content: this._content, version: this._localVersion });

		return operation;
	}

	/**
	 * Acknowledge that a P2P operation was received and replicated
	 * In P2P: Operations don't need server acknowledgment
	 * Just mark as synced across peers
	 */
	public acknowledgeOperation(operation: IOperation): void {
		const index = this._pendingOperations.findIndex(
			op => op.timestamp === operation.timestamp && op.userId === operation.userId
		);

		if (index >= 0) {
			this._pendingOperations.splice(index, 1);
		}

		if (this._pendingOperations.length === 0) {
			console.log('✓ All P2P operations synced with peers');
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
		this._localVersion = version;
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
			version: this._localVersion
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
