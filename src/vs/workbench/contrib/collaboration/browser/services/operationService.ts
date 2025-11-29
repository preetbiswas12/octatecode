/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RemoteOperation } from '../websocketService.js';

export interface ParsedOperation {
	type: 'insert' | 'delete' | 'replace';
	position: number;
	content?: string;
	length?: number;
}

/**
 * Service for applying remote operations to the editor
 * Handles operational transformation and conflict resolution
 */
export class OperationService {
	private localVersion: number = 0;
	private pendingOperations: Map<string, RemoteOperation> = new Map();
	private getContent: () => string;
	private applyEdit: (range: any, text: string) => void;

	constructor(getContent: () => string, applyEdit: (range: any, text: string) => void) {
		this.getContent = getContent;
		this.applyEdit = applyEdit;
		this.localVersion = 0;
	}

	/**
	 * Parse operation data from remote user
	 */
	private parseOperation(data: string): ParsedOperation | null {
		try {
			const op = JSON.parse(data);

			if (!op.type || !(['insert', 'delete', 'replace'].includes(op.type))) {
				console.warn('Invalid operation type:', op.type);
				return null;
			}

			if (typeof op.position !== 'number' || op.position < 0) {
				console.warn('Invalid position:', op.position);
				return null;
			}

			return op as ParsedOperation;
		} catch (error) {
			console.error('Failed to parse operation:', error);
			return null;
		}
	}

	/**
	 * Apply remote operation to the model
	 */
	public applyRemoteOperation(operation: RemoteOperation): boolean {
		try {
			// Check version consistency
			if (operation.version < this.localVersion) {
				console.warn(`Operation version (${operation.version}) behind local version (${this.localVersion}). Queuing for later.`);
				this.pendingOperations.set(operation.operationId, operation);
				return false;
			}

			const parsed = this.parseOperation(operation.data);
			if (!parsed) {
				console.error('Failed to parse operation:', operation);
				return false;
			}

			// Apply the operation based on type
			switch (parsed.type) {
				case 'insert':
					return this.applyInsert(parsed.position, parsed.content || '');
				case 'delete':
					return this.applyDelete(parsed.position, parsed.length || 0);
				case 'replace':
					return this.applyReplace(parsed.position, parsed.length || 0, parsed.content || '');
				default:
					console.warn('Unknown operation type:', parsed.type);
					return false;
			}
		} catch (error) {
			console.error('Error applying remote operation:', error);
			return false;
		}
	}

	/**
	 * Apply insert operation
	 */
	private applyInsert(position: number, content: string): boolean {
		try {
			const text = this.getContent();
			if (position < 0 || position > text.length) {
				console.warn('Insert position out of bounds:', position);
				return false;
			}

			try {
				this.applyEdit({ start: position, end: position }, content);
				this.localVersion++;
				return true;
			} catch (error) {
				console.error('Failed to apply insert:', error);
				return false;
			}
		} catch (error) {
			console.error('Failed to apply insert:', error);
			return false;
		}
	}

	/**
	 * Apply delete operation
	 */
	private applyDelete(position: number, length: number): boolean {
		try {
			const text = this.getContent();
			if (position < 0 || length < 0 || position + length > text.length) {
				console.warn('Delete range out of bounds:', { position, length });
				return false;
			}

			try {
				this.applyEdit({ start: position, end: position + length }, '');
				this.localVersion++;
				return true;
			} catch (error) {
				console.error('Failed to apply delete:', error);
				return false;
			}
		} catch (error) {
			console.error('Failed to apply delete:', error);
			return false;
		}
	}

	/**
	 * Apply replace operation
	 */
	private applyReplace(position: number, length: number, content: string): boolean {
		try {
			const text = this.getContent();
			if (position < 0 || length < 0 || position + length > text.length) {
				console.warn('Replace range out of bounds:', { position, length });
				return false;
			}

			try {
				this.applyEdit({ start: position, end: position + length }, content);
				this.localVersion++;
				return true;
			} catch (error) {
				console.error('Failed to apply replace:', error);
				return false;
			}
		} catch (error) {
			console.error('Failed to apply replace:', error);
			return false;
		}
	}

	/**
	 * Process pending operations that were queued
	 */
	public processPendingOperations(): void {
		const sorted = Array.from(this.pendingOperations.values())
			.sort((a, b) => a.version - b.version);

		for (const op of sorted) {
			if (op.version === this.localVersion) {
				this.applyRemoteOperation(op);
				this.pendingOperations.delete(op.operationId);
			}
		}
	}

	/**
	 * Get current local version
	 */
	public getLocalVersion(): number {
		return this.localVersion;
	}

	/**
	 * Set local version (for sync)
	 */
	public setLocalVersion(version: number): void {
		this.localVersion = version;
	}
}
