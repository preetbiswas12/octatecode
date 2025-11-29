/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOperation } from './collaborationTypes.js';

/**
 * Operational Transform (OT) engine for conflict-free concurrent editing
 *
 * This implementation handles all combinations of insert and delete operations,
 * with deterministic conflict resolution using user ID comparison as a tiebreaker.
 */

export namespace OperationalTransform {
	/**
	 * Transform operation op1 against operation op2.
	 * Returns a new operation that represents op1 after op2 has been applied.
	 *
	 * This handles all four cases:
	 * 1. Insert vs Insert
	 * 2. Insert vs Delete
	 * 3. Delete vs Insert
	 * 4. Delete vs Delete
	 */
	export function transform(op1: IOperation, op2: IOperation): IOperation {
		// Same operation, no transformation needed
		if (op1.type === op2.type && op1.position === op2.position && op1.userId === op2.userId) {
			return op1;
		}

		// Insert vs Insert
		if (op1.type === 'insert' && op2.type === 'insert') {
			return transformInsertInsert(op1, op2);
		}

		// Insert vs Delete
		if (op1.type === 'insert' && op2.type === 'delete') {
			return transformInsertDelete(op1, op2);
		}

		// Delete vs Insert
		if (op1.type === 'delete' && op2.type === 'insert') {
			return transformDeleteInsert(op1, op2);
		}

		// Delete vs Delete
		if (op1.type === 'delete' && op2.type === 'delete') {
			return transformDeleteDelete(op1, op2);
		}

		return op1;
	}

	/**
	 * Insert vs Insert transformation
	 * When two users insert at the same position, use userId as tiebreaker
	 */
	function transformInsertInsert(op1: IOperation, op2: IOperation): IOperation {
		if (op1.position < op2.position) {
			// op1 is before op2, no adjustment needed
			return op1;
		} else if (op1.position > op2.position) {
			// op1 is after op2, shift right by length of op2's insertion
			return {
				...op1,
				position: op1.position + (op2.content?.length || 0)
			};
		} else {
			// Same position: use userId as tiebreaker (deterministic)
			if (op1.userId < op2.userId) {
				// op1 wins, stays at same position
				return op1;
			} else {
				// op1 loses, shifts right
				return {
					...op1,
					position: op1.position + (op2.content?.length || 0)
				};
			}
		}
	}

	/**
	 * Insert vs Delete transformation
	 * op1 is an insert, op2 is a delete
	 */
	function transformInsertDelete(op1: IOperation, op2: IOperation): IOperation {
		if (op1.position < op2.position) {
			// Insert is before delete range, no change
			return op1;
		} else if (op1.position >= op2.position + (op2.length || 0)) {
			// Insert is after delete range, shift left
			return {
				...op1,
				position: op1.position - (op2.length || 0)
			};
		} else {
			// Insert is within delete range
			// Position should be at start of deleted region
			return {
				...op1,
				position: op2.position
			};
		}
	}

	/**
	 * Delete vs Insert transformation
	 * op1 is a delete, op2 is an insert
	 */
	function transformDeleteInsert(op1: IOperation, op2: IOperation): IOperation {
		const deleteStart = op1.position;
		const deleteEnd = op1.position + (op1.length || 0);

		if (op2.position < deleteStart) {
			// Insert is before delete, shift delete right
			return {
				...op1,
				position: op1.position + (op2.content?.length || 0)
			};
		} else if (op2.position >= deleteEnd) {
			// Insert is after delete, no change to delete
			return op1;
		} else {
			// Insert is within delete range, extend delete
			return {
				...op1,
				length: (op1.length || 0) + (op2.content?.length || 0)
			};
		}
	}

	/**
	 * Delete vs Delete transformation
	 * Both are deletes
	 */
	function transformDeleteDelete(op1: IOperation, op2: IOperation): IOperation {
		const d1Start = op1.position;
		const d1End = op1.position + (op1.length || 0);
		const d2Start = op2.position;
		const d2End = op2.position + (op2.length || 0);

		if (d1End <= d2Start) {
			// op1 is completely before op2
			return op1;
		} else if (d1Start >= d2End) {
			// op1 is completely after op2, shift left
			return {
				...op1,
				position: op1.position - (op2.length || 0)
			};
		} else {
			// Ranges overlap, need to adjust
			const deleteStart = Math.max(d1Start, d2Start);
			const deleteEnd = Math.min(d1End, d2End);
			const overlapLength = deleteEnd - deleteStart;

			if (d1Start < d2Start) {
				// op1 starts before op2
				return {
					...op1,
					length: Math.max(0, (op1.length || 0) - overlapLength)
				};
			} else if (d1Start > d2Start) {
				// op1 starts after op2
				return {
					...op1,
					position: Math.max(d2Start, d1Start - (op2.length || 0)),
					length: Math.max(0, (op1.length || 0) - overlapLength)
				};
			} else {
				// Same start position, use userId tiebreaker
				if (op1.userId < op2.userId) {
					// op1 wins
					return op1;
				} else {
					// op1 loses, reduce length
					return {
						...op1,
						length: Math.max(0, (op1.length || 0) - overlapLength)
					};
				}
			}
		}
	}

	/**
	 * Apply an operation to text
	 */
	export function applyOperation(text: string, operation: IOperation): string {
		if (operation.type === 'insert') {
			const content = operation.content || '';
			return text.slice(0, operation.position) + content + text.slice(operation.position);
		} else if (operation.type === 'delete') {
			const length = operation.length || 0;
			return text.slice(0, operation.position) + text.slice(operation.position + length);
		}
		return text;
	}

	/**
	 * Transform a cursor position based on an operation
	 */
	export function transformCursorPosition(cursorPos: number, operation: IOperation): number {
		if (operation.type === 'insert') {
			if (cursorPos >= operation.position) {
				return cursorPos + (operation.content?.length || 0);
			}
		} else if (operation.type === 'delete') {
			const deleteStart = operation.position;
			const deleteEnd = operation.position + (operation.length || 0);

			if (cursorPos >= deleteEnd) {
				return cursorPos - (operation.length || 0);
			} else if (cursorPos >= deleteStart) {
				return deleteStart;
			}
		}
		return cursorPos;
	}

	/**
	 * Transform a selection range based on an operation
	 */
	export function transformSelectionRange(
		start: number,
		end: number,
		operation: IOperation
	): { start: number; end: number } {
		return {
			start: transformCursorPosition(start, operation),
			end: transformCursorPosition(end, operation)
		};
	}
}
