/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperationService } from './services/operationService.js';
import { CursorRenderingService } from './services/cursorRenderingService.js';
import { PresenceTrackingService, presenceTrackingService } from './services/presenceTrackingService.js';
import { collaborationState } from './collaborationState.js';
import { supabaseService } from './supabaseService.js';

/**
 * Main integration service that coordinates all collaboration features
 * Connects editor changes, WebSocket events, and UI updates
 */
export class CollaborationEditorIntegration {
	private operationService: OperationService;
	private cursorService: CursorRenderingService;
	private presenceService: PresenceTrackingService;

	constructor(getContent: () => string, applyEdit: (range: any, text: string) => void) {
		this.operationService = new OperationService(getContent, applyEdit);
		this.cursorService = new CursorRenderingService();
		this.presenceService = presenceTrackingService;

		this.setupCollaborationListeners();
	}

	/**
	 * Setup collaboration event listeners
	 */
	private setupCollaborationListeners(): void {
		// Listen for remote operations
		collaborationState.onRemoteOperationReceived((operation: any) => {
			console.log(`📥 Received operation from ${operation.userName}:`, operation);

			// Apply the operation to the model
			const success = this.operationService.applyRemoteOperation(operation);

			if (success) {
				console.log('✅ Operation applied successfully');
				// Process any pending operations
				this.operationService.processPendingOperations();
			} else {
				console.warn('⚠️ Failed to apply operation, may be queued');
			}
		});

		// Listen for remote cursor updates
		collaborationState.onRemoteCursorUpdate((cursor: any) => {
			console.log(`👆 ${cursor.userName} moved cursor to line ${cursor.line}:${cursor.column}`);
			this.cursorService.updateRemoteCursor(cursor);
		});

		// Listen for presence updates
		collaborationState.onUserPresenceChanged((presence: any) => {
			console.log(`👤 User presence update:`, presence.userName, presence.isActive ? 'online' : 'offline');
			this.presenceService.updateUserPresence(presence);
		});

		// Listen to session end
		collaborationState.onSessionEnded(() => {
			this.cleanup();
		});
	}

	/**
	 * Send local operation to remote collaborators
	 */
	public async sendLocalOperation(event: any): Promise<void> {
		const session = collaborationState.getActiveSession();
		if (!session) {
			return;
		}

		try {
			// Build operation from change event
			for (const change of event.changes) {
				const operation = {
					type: change.text.length === 0 ? 'delete' : (change.rangeLength > 0 ? 'replace' : 'insert'),
					position: change.rangeOffset,
					content: change.text,
					length: change.rangeLength
				};

				// Save to database
				await supabaseService.saveDocumentChanges(
					session.room.roomId,
					session.userId,
					JSON.stringify(operation),
					0 // version
				);

				// Send to other collaborators via WebSocket
				// (WebSocket message will be broadcast by backend)
			}
		} catch (error) {
			console.error('Error sending local operation:', error);
		}
	}

	/**
	 * Send cursor update to remote collaborators
	 */
	public sendCursorUpdate(line: number, column: number): void {
		const session = collaborationState.getActiveSession();
		if (!session) {
			return;
		}

		try {
			// Send via WebSocket for real-time cursor sync
			// (Implementation in websocketService)
		} catch (error) {
			console.error('Error sending cursor update:', error);
		}
	}

	/**
	 * Generate unique operation ID (reserved for future use)
	 */
	// Placeholder for future operation ID generation
	// private _generateOperationId(): string {
	// 	return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	// }

	/**
	 * Get active users in this session
	 */
	public getActiveUsers() {
		return this.presenceService.getActiveUsers();
	}

	/**
	 * Get remote cursors
	 */
	public getRemoteCursors() {
		return this.cursorService.getRemoteCursors();
	}

	/**
	 * Cleanup and dispose resources
	 */
	public cleanup(): void {
		this.cursorService.clearAllRemoteCursors();
	}

	/**
	 * Dispose the entire integration
	 */
	public dispose(): void {
		this.cleanup();
	}
}

