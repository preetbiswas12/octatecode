/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CursorUpdate } from '../websocketService.js';

export interface RemoteCursor {
	userId: string;
	userName: string;
	line: number;
	column: number;
	color: string;
	decorationId: string;
}

/**
 * Service for rendering remote user cursors in the editor
 */
export class CursorRenderingService {
	private remoteCursors: Map<string, RemoteCursor> = new Map();
	private colorPool: string[] = [
		'#E74C3C', // Red
		'#3498DB', // Blue
		'#2ECC71', // Green
		'#F39C12', // Orange
		'#9B59B6', // Purple
		'#1ABC9C', // Turquoise
		'#E67E22', // Carrot
		'#34495E'  // Dark grey
	];
	private colorIndex: number = 0;

	constructor() {
	}

	/**
	 * Get next available color for a user
	 */
	private getNextColor(): string {
		const color = this.colorPool[this.colorIndex % this.colorPool.length];
		this.colorIndex++;
		return color;
	}

	/**
	 * Get or create color for user
	 */
	private getUserColor(userId: string): string {
		// Check if we already have a color for this user
		for (const cursor of this.remoteCursors.values()) {
			if (cursor.userId === userId) {
				return cursor.color;
			}
		}
		// Assign new color
		return this.getNextColor();
	}

	/**
	 * Update remote cursor position
	 */
	public updateRemoteCursor(update: CursorUpdate): void {
		try {
			const userId = update.userId;
			const { line, column } = update;

			// Validate line and column
			if (line < 0 || column < 0) {
				console.warn('Invalid cursor position:', { line, column });
				return;
			}

			// Get or create cursor tracking object
			let remoteCursor = this.remoteCursors.get(userId);
			if (!remoteCursor) {
				remoteCursor = {
					userId,
					userName: update.userName,
					line,
					column,
					color: this.getUserColor(userId),
					decorationId: ''
				};
				this.remoteCursors.set(userId, remoteCursor);
			} else {
				remoteCursor.line = line;
				remoteCursor.column = column;
			}

			// Store for later rendering (actual rendering done by editor integration)
		} catch (error) {
			console.error('Error updating remote cursor:', error);
		}
	}

	/**
	 * Remove cursor when user leaves or goes offline
	 */
	public removeRemoteCursor(userId: string): void {
		try {
			const cursor = this.remoteCursors.get(userId);
			if (cursor) {
				this.remoteCursors.delete(userId);
			}
		} catch (error) {
			console.error('Error removing cursor:', error);
		}
	}

	/**
	 * Clear all remote cursors
	 */
	public clearAllRemoteCursors(): void {
		try {
			this.remoteCursors.clear();
		} catch (error) {
			console.error('Error clearing remote cursors:', error);
		}
	}

	/**
	 * Get all active remote cursors
	 */
	public getRemoteCursors(): RemoteCursor[] {
		return Array.from(this.remoteCursors.values());
	}

	/**
	 * Get remote cursor for specific user
	 */
	public getRemoteCursor(userId: string): RemoteCursor | undefined {
		return this.remoteCursors.get(userId);
	}
}
