/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { Emitter } from '../../../../base/common/event.js';
import { CollaborativeEdit } from '../common/collaborationServiceTypes.js';

/**
 * Operational Transform (OT) for handling concurrent edits without conflicts
 *
 * This implementation uses the standard OT algorithm:
 * 1. All operations are represented as edits (insert/delete)
 * 2. Operations are tracked with: userId, operationId, version, timestamp
 * 3. When concurrent edits occur, we transform them to maintain consistency
 * 4. The transformation ensures: Op1 ○ Op2 ≡ Op2' ○ Op1' (transformation property)
 *
 * Key concepts:
 * - Operation: An edit with position and content
 * - History: All operations in causal order
 * - Transform: Adjust operation positions based on prior operations
 * - Integration: Apply transformed operations to document
 */

export interface Operation {
	id: string;
	userId: string;
	version: number;
	timestamp: number;
	type: 'insert' | 'delete';
	position: number; // 0-indexed character position in file
	content?: string; // for insert operations
	length?: number;  // for delete operations
}

export interface OperationMetadata {
	operationId: string;
	userId: string;
	version: number;
	timestamp: number;
}

export interface DocumentState {
	fileUri: string;
	content: string;
	version: number;
	userId?: string;
}

export interface IOperationalTransformService {
	readonly _serviceBrand: undefined;
	initialize(): void;
	addOperation(edit: CollaborativeEdit, version: number): Operation;
	getOperationHistory(fileUri: string): Operation[];
	transformOperation(op: Operation, history: Operation[]): Operation;
	transformOperations(op1: Operation, op2: Operation): { op1Prime: Operation; op2Prime: Operation };
	applyOperation(content: string, operation: Operation): string;
	validateOperationSequence(fileUri: string): boolean;
	onOperationApplied: (callback: (event: OperationAppliedEvent) => void) => () => void;
}

export interface OperationAppliedEvent {
	fileUri: string;
	operation: Operation;
	newVersion: number;
	success: boolean;
	error?: string;
}

export const IOperationalTransformService = createDecorator<IOperationalTransformService>('operationalTransformService');

// Exported for testing - use IOperationalTransformService for production code
export class OperationalTransformService extends Disposable implements IOperationalTransformService {
	readonly _serviceBrand: undefined;

	private operationHistory: Map<string, Operation[]> = new Map();
	private documentVersions: Map<string, number> = new Map();
	private pendingOperations: Map<string, Operation[]> = new Map();
	private operationAppliedEmitter = new Emitter<OperationAppliedEvent>();
	readonly onOperationApplied = (callback: (event: OperationAppliedEvent) => void) => {
		const disposable = this.operationAppliedEmitter.event(callback);
		return () => disposable.dispose();
	};

	constructor() {
		super();
	}

	initialize(): void {
		// Service initialization
		console.log('[OT] Operational Transform Service initialized');
	}

	/**
	 * Convert a CollaborativeEdit to an Operation
	 * Converts line/character positions to absolute character position
	 */
	addOperation(edit: CollaborativeEdit, version: number): Operation {
		const content = edit.newText;
		const fileUri = edit.fileUri;

		// Initialize file tracking
		if (!this.operationHistory.has(fileUri)) {
			this.operationHistory.set(fileUri, []);
			this.documentVersions.set(fileUri, 0);
		}

		// Convert to single-position format (line/char to absolute position)
		const position = this.calculateAbsolutePosition(
			edit.startLine,
			edit.startCharacter,
			fileUri
		);

		const operation: Operation = {
			id: edit.operationId,
			userId: edit.userId,
			version,
			timestamp: edit.timestamp,
			type: edit.startLine === edit.endLine && edit.startCharacter === edit.endCharacter
				? 'insert'
				: 'delete',
			position,
			content: content || undefined,
			length: content.length || (edit.endCharacter - edit.startCharacter),
		};

		// Add to history
		const history = this.operationHistory.get(fileUri) || [];
		history.push(operation);
		this.operationHistory.set(fileUri, history);

		// Update version
		this.documentVersions.set(fileUri, version);

		console.log(`[OT] Added operation: ${operation.id} (${operation.type}) at version ${version}`);

		return operation;
	}

	/**
	 * Get all operations for a file in order
	 */
	getOperationHistory(fileUri: string): Operation[] {
		return this.operationHistory.get(fileUri) || [];
	}

	/**
	 * Transform a single operation against the history of prior operations
	 * Adjusts the operation's position based on all prior operations
	 */
	transformOperation(op: Operation, history: Operation[]): Operation {
		let transformedOp = { ...op };

		for (const priorOp of history) {
			// Don't transform against self
			if (priorOp.id === op.id) continue;

			// Transform position based on prior operation
			const { op1Prime: transformedAgainstPrior } = this.transformOperations(
				transformedOp,
				priorOp
			);
			transformedOp = transformedAgainstPrior;
		}

		return transformedOp;
	}

	/**
	 * Core transformation function
	 * Given two concurrent operations, produces transformed versions that can be applied in any order
	 *
	 * Transformation property: T(Op1, Op2); T(Op2, Op1) produces consistent results
	 */
	transformOperations(
		op1: Operation,
		op2: Operation
	): { op1Prime: Operation; op2Prime: Operation } {
		const op1Prime = { ...op1 };
		const op2Prime = { ...op2 };

		// Case 1: Both are inserts
		if (op1.type === 'insert' && op2.type === 'insert') {
			if (op1.position < op2.position) {
				// op1 comes before op2, op2 needs to shift right
				op2Prime.position += op1.content?.length || 0;
			} else if (op1.position > op2.position) {
				// op2 comes before op1, op1 needs to shift right
				op1Prime.position += op2.content?.length || 0;
			} else {
				// Same position: resolve by userId (deterministic)
				if (op1.userId > op2.userId) {
					op2Prime.position += op1.content?.length || 0;
				} else {
					op1Prime.position += op2.content?.length || 0;
				}
			}
		}
		// Case 2: op1 is insert, op2 is delete
		else if (op1.type === 'insert' && op2.type === 'delete') {
			if (op1.position <= op2.position) {
				// Insert before or at delete start: delete shifts right
				op2Prime.position += op1.content?.length || 0;
			} else if (op1.position >= op2.position + (op2.length || 0)) {
				// Insert after delete: no change to insert position
				op1Prime.position -= op2.length || 0;
			} else {
				// Insert inside delete range: split behavior
				// Insert takes precedence (delete will split around it)
				op2Prime.length = (op2.length || 0) + (op1.content?.length || 0);
			}
		}
		// Case 3: op1 is delete, op2 is insert
		else if (op1.type === 'delete' && op2.type === 'insert') {
			if (op2.position <= op1.position) {
				// Insert before or at delete start: delete shifts right
				op1Prime.position += op2.content?.length || 0;
			} else if (op2.position >= op1.position + (op1.length || 0)) {
				// Insert after delete: no change to delete range
				op2Prime.position -= op1.length || 0;
			} else {
				// Insert inside delete range: insert is deleted
				// Delete absorbs the insert
				op1Prime.length = (op1.length || 0) + (op2.content?.length || 0);
			}
		}
		// Case 4: Both are deletes
		else if (op1.type === 'delete' && op2.type === 'delete') {
			const op1Start = op1.position;
			const op1End = op1.position + (op1.length || 0);
			const op2Start = op2.position;
			const op2End = op2.position + (op2.length || 0);

			if (op1End <= op2Start) {
				// op1 completely before op2
				op2Prime.position -= op1.length || 0;
			} else if (op2End <= op1Start) {
				// op2 completely before op1
				op1Prime.position -= op2.length || 0;
			} else if (op1Start <= op2Start && op2End <= op1End) {
				// op2 completely inside op1: op2 has no effect
				op2Prime.length = 0;
			} else if (op2Start <= op1Start && op1End <= op2End) {
				// op1 completely inside op2: op1 has no effect
				op1Prime.length = 0;
			} else if (op1Start < op2Start) {
				// Partial overlap: op1 starts first
				const deletedByOp1 = op2Start - op1Start;
				op2Prime.position = op1Start;
				op2Prime.length = Math.max(0, (op2.length || 0) - deletedByOp1);
				op1Prime.length = (op1.length || 0) - Math.min(op1.length || 0, (op2.length || 0) - deletedByOp1);
			} else {
				// Partial overlap: op2 starts first
				const deletedByOp2 = op1Start - op2Start;
				op1Prime.position = op2Start;
				op1Prime.length = Math.max(0, (op1.length || 0) - deletedByOp2);
				op2Prime.length = (op2.length || 0) - Math.min(op2.length || 0, (op1.length || 0) - deletedByOp2);
			}
		}

		return { op1Prime: op1Prime, op2Prime: op2Prime };
	}

	/**
	 * Apply an operation to document content
	 * Returns the new content after applying the operation
	 */
	applyOperation(content: string, operation: Operation): string {
		try {
			if (operation.type === 'insert') {
				// Insert text at position
				const before = content.substring(0, operation.position);
				const after = content.substring(operation.position);
				return before + (operation.content || '') + after;
			} else if (operation.type === 'delete') {
				// Delete text from position
				const before = content.substring(0, operation.position);
				const after = content.substring(
					operation.position + (operation.length || 0)
				);
				return before + after;
			}
		} catch (error) {
			console.error('[OT] Error applying operation:', error);
			throw error;
		}
		return content;
	}

	/**
	 * Validate that all operations in history are properly ordered
	 */
	validateOperationSequence(fileUri: string): boolean {
		const history = this.operationHistory.get(fileUri) || [];

		for (let i = 0; i < history.length; i++) {
			const current = history[i];

			// Check version monotonicity
			if (i > 0) {
				const prev = history[i - 1];
				if (current.version < prev.version) {
					console.error(
						`[OT] Version violation: ${current.version} after ${prev.version}`
					);
					return false;
				}
			}

			// Check position validity
			if (current.position < 0) {
				console.error(`[OT] Invalid position: ${current.position}`);
				return false;
			}

			// Check operation type has correct fields
			if (current.type === 'insert' && !current.content) {
				console.error(`[OT] Insert operation missing content`);
				return false;
			}
			if (current.type === 'delete' && !current.length) {
				console.error(`[OT] Delete operation missing length`);
				return false;
			}
		}

		return true;
	}

	/**
	 * Convert line/character position to absolute character position
	 * This is a simplified version - actual implementation would need document content
	 */
	private calculateAbsolutePosition(line: number, character: number, fileUri: string): number {
		// Simplified: assume average 80 chars per line
		// In real implementation, would use actual document content
		return line * 80 + character;
	}

	override dispose(): void {
		this.operationHistory.clear();
		this.documentVersions.clear();
		this.pendingOperations.clear();
		this.operationAppliedEmitter.dispose();
		super.dispose();
	}
}

registerSingleton(
	IOperationalTransformService,
	OperationalTransformService,
	InstantiationType.Eager
);
