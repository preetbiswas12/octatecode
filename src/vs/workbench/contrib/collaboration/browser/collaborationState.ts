/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { CollaborationRoom } from './supabaseService.js';
import { websocketService, RemoteOperation, CursorUpdate, UserPresence } from './websocketService.js';

export interface ActiveCollaborationSession {
	room: CollaborationRoom;
	userId: string;
	userName: string;
	isHost: boolean;
	startedAt: Date;
}

/**
 * Global state manager for collaboration sessions
 * Tracks the currently active collaboration session across the entire IDE
 */
class CollaborationState {
	private _activeSession: ActiveCollaborationSession | null = null;

	private readonly _onSessionStarted = new Emitter<ActiveCollaborationSession>();
	public readonly onSessionStarted: Event<ActiveCollaborationSession> = this._onSessionStarted.event;

	private readonly _onSessionEnded = new Emitter<void>();
	public readonly onSessionEnded: Event<void> = this._onSessionEnded.event;

	private readonly _onSessionUpdated = new Emitter<ActiveCollaborationSession>();
	public readonly onSessionUpdated: Event<ActiveCollaborationSession> = this._onSessionUpdated.event;

	private readonly _onRemoteOperationReceived = new Emitter<RemoteOperation>();
	public readonly onRemoteOperationReceived: Event<RemoteOperation> = this._onRemoteOperationReceived.event;

	private readonly _onRemoteCursorUpdate = new Emitter<CursorUpdate>();
	public readonly onRemoteCursorUpdate: Event<CursorUpdate> = this._onRemoteCursorUpdate.event;

	private readonly _onUserPresenceChanged = new Emitter<UserPresence>();
	public readonly onUserPresenceChanged: Event<UserPresence> = this._onUserPresenceChanged.event;

	constructor() {
		// Listen to WebSocket events
		websocketService.onOperationReceived((operation) => {
			if (this._activeSession && operation.userId !== this._activeSession.userId) {
				this._onRemoteOperationReceived.fire(operation);
			}
		});

		websocketService.onCursorUpdate((cursor) => {
			if (this._activeSession && cursor.userId !== this._activeSession.userId) {
				this._onRemoteCursorUpdate.fire(cursor);
			}
		});

		websocketService.onUserPresenceChanged((presence) => {
			this._onUserPresenceChanged.fire(presence);
		});
	}

	/**
	 * Get the currently active collaboration session
	 */
	public getActiveSession(): ActiveCollaborationSession | null {
		return this._activeSession;
	}

	/**
	 * Check if there is an active collaboration session
	 */
	public hasActiveSession(): boolean {
		return this._activeSession !== null;
	}

	/**
	 * Start a new collaboration session
	 */
	public startSession(session: ActiveCollaborationSession): void {
		this._activeSession = session;
		this._onSessionStarted.fire(session);
	}

	/**
	 * End the current collaboration session
	 */
	public endSession(): void {
		if (this._activeSession) {
			this._activeSession = null;
			this._onSessionEnded.fire();
		}
	}

	/**
	 * Update the current session
	 */
	public updateSession(updates: Partial<ActiveCollaborationSession>): void {
		if (this._activeSession) {
			this._activeSession = { ...this._activeSession, ...updates };
			this._onSessionUpdated.fire(this._activeSession);
		}
	}

	/**
	 * Get session status text
	 */
	public getStatusText(): string {
		if (!this._activeSession) {
			return 'No active collaboration session';
		}

		const role = this._activeSession.isHost ? 'Host' : 'Guest';
		return `${role} in "${this._activeSession.room.name}" (Version: ${this._activeSession.room.version})`;
	}

	/**
	 * Get session details
	 */
	public getSessionDetails(): string {
		if (!this._activeSession) {
			return '';
		}

		const session = this._activeSession;
		return `
Room: ${session.room.name}
Room ID: ${session.room.roomId}
Workspace: ${session.room.fileId}
Role: ${session.isHost ? 'Host' : 'Guest'}
Your Name: ${session.userName}
Version: ${session.room.version}
Started: ${session.startedAt.toLocaleTimeString()}
		`.trim();
	}
}

// Export singleton instance
export const collaborationState = new CollaborationState();
