/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	ICollaborationSession,
	IRemoteUser,
	generateSessionId,
	generateUserId,
	ConnectionStatus
} from './collaborationTypes.js';
import { CollaborativeDocumentService } from './collaborativeDocumentService.js';
import { CollaborationSyncService } from './collaborationSyncService.js';
import { PresenceService } from './presenceService.js';
import { CollaborationUIController } from './collaborationUIController.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { mainWindow } from '../../../../base/browser/window.js';

/**
 * Main orchestrator for managing collaborative editing session
 * Coordinates all collaboration services: document, sync, presence, UI
 */
export class CollaborationManager {
	private _session: ICollaborationSession | null = null;
	private _userId: string = '';
	private _userName: string = '';
	private _isHost: boolean = false;

	private _documentService: CollaborativeDocumentService;
	private _syncService: CollaborationSyncService;
	private _presenceService: PresenceService;
	private _uiController: CollaborationUIController;

	private _cursorUpdateTimeout: number | null = null;
	private _presenceUpdateInterval: number | null = null;

	private readonly _onSessionStarted = new Emitter<ICollaborationSession>();
	public readonly onSessionStarted: Event<ICollaborationSession> = this._onSessionStarted.event;

	private readonly _onSessionEnded = new Emitter<void>();
	public readonly onSessionEnded: Event<void> = this._onSessionEnded.event;

	private readonly _onError = new Emitter<Error>();
	public readonly onError: Event<Error> = this._onError.event;

	private readonly _onConnectionStatusChanged = new Emitter<ConnectionStatus>();
	public readonly onConnectionStatusChanged: Event<ConnectionStatus> = this._onConnectionStatusChanged.event;

	constructor(
		private _editor: ICodeEditor,
		serverUrl: string = 'localhost:3001'
	) {
		this._userId = generateUserId();
		this._documentService = new CollaborativeDocumentService();
		this._syncService = new CollaborationSyncService(serverUrl, this._userId);
		this._presenceService = new PresenceService();
		this._uiController = new CollaborationUIController(this._editor, this._presenceService);

		this._setupEventListeners();
	}

	private _setupEventListeners(): void {
		// Sync service events
		this._syncService.onRemoteOperation((op: any) => {
			this._documentService.applyRemoteOperation(op);
		});

		this._syncService.onOperationAcknowledged((op: any) => {
			this._documentService.acknowledgeOperation(op);
		});

		this._syncService.onSyncComplete((data: any) => {
			this._documentService.resetState(data.content, data.version);
		});

		this._syncService.onUserJoined((data: any) => {
			this._presenceService.updateUser(data.userId, data.userName);
		});

		this._syncService.onUserLeft((userId: string) => {
			this._presenceService.removeUser(userId);
		});

		this._syncService.onConnectionStatusChanged((status: ConnectionStatus) => {
			this._onConnectionStatusChanged.fire(status);
		});
	}

	/**
	 * Start as host - create a new collaboration room
	 */
	public async startAsHost(roomName: string, fileId: string, userName: string): Promise<void> {
		try {
			this._isHost = true;
			this._userName = userName;
			this._session = {
				sessionId: generateSessionId(),
				fileId,
				roomName,
				host: this._userId,
				owner: this._userId,
				createdAt: Date.now(),
				peerId: this._userId,
				version: 0,
				isActive: true
			};

			// Connect to server
			await this._syncService.connect();

			// Create room on server
			this._syncService.createSession(roomName, fileId, userName);

			// Add self to presence
			this._presenceService.updateUser(this._userId, userName);

			// Get current editor content
			const content = this._editor.getModel()?.getValue() || '';
			this._documentService.initialize(this._session, content);

			// Start broadcasting presence
			this._startPresenceBroadcast();

			this._onSessionStarted.fire(this._session);
		} catch (error) {
			this._onError.fire(error as Error);
			throw error;
		}
	}

	/**
	 * Join as guest - join an existing collaboration room
	 */
	public async joinAsGuest(sessionId: string, userName: string): Promise<void> {
		try {
			this._isHost = false;
			this._userName = userName;

			// First, fetch room data from API to pass to WebSocket server
			const backendUrl = (window as any).__COLLABORATION_BACKEND_URL__ || 'http://localhost:3000';
			const roomData = await fetch(`${backendUrl}/api/rooms/${sessionId}`)
				.then(r => r.json())
				.catch(err => {
					console.warn('Failed to fetch room data:', err);
					return null;
				});

			// Connect to server
			await this._syncService.connect();

			// Join room on server with room data
			this._syncService.joinSession(sessionId, userName, roomData);

			// Add self to presence
			this._presenceService.updateUser(this._userId, userName);

			// Wait for sync from server
			const syncData = await new Promise<{ content: string; version: number }>((resolve) => {
				const unsub = this._syncService.onSyncComplete((data: any) => {
					unsub.dispose();
					resolve(data);
				});
			});

			// Initialize document with synced content
			this._session = {
				sessionId,
				fileId: '',
				roomName: '',
				host: '',
				owner: '',
				createdAt: 0,
				peerId: this._userId,
				version: syncData.version,
				isActive: true
			};

			this._documentService.initialize(this._session, syncData.content);

			// Update editor content
			this._editor.getModel()?.setValue(syncData.content);

			// Start broadcasting presence
			this._startPresenceBroadcast();

			this._onSessionStarted.fire(this._session);
		} catch (error) {
			this._onError.fire(error as Error);
			throw error;
		}
	}

	/**
	 * Apply a local edit (insert or delete)
	 */
	public applyLocalEdit(type: 'insert' | 'delete', position: number, content?: string, length?: number): void {
		if (!this._session) {
			console.warn('No active collaboration session');
			return;
		}

		try {
			const operation = this._documentService.applyLocalOperation(type, position, content, length, this._userId);

			// Send to server
			this._syncService.sendOperation(operation);
		} catch (error) {
			this._onError.fire(error as Error);
		}
	}

	/**
	 * Broadcast cursor position to other users
	 */
	public broadcastCursorPosition(position: number, selectionStart?: number, selectionEnd?: number): void {
		if (!this._session) {
			return;
		}

		// Throttle cursor updates to reduce network traffic
		if (this._cursorUpdateTimeout) {
			mainWindow.clearTimeout(this._cursorUpdateTimeout);
		}

		this._cursorUpdateTimeout = mainWindow.setTimeout(() => {
			this._syncService.broadcastPresence(position, selectionStart, selectionEnd, true);
		}, 50);
	}

	/**
	 * Start periodic presence broadcasting
	 */
	private _startPresenceBroadcast(): void {
		this._presenceUpdateInterval = mainWindow.setInterval(() => {
			const model = this._editor.getModel();
			if (model) {
				const selection = this._editor.getSelection();
				if (selection) {
					const cursorPosition = model.getOffsetAt(selection.getStartPosition());
					const selectionStart = model.getOffsetAt(selection.getStartPosition());
					const selectionEnd = model.getOffsetAt(selection.getEndPosition());

					this._syncService.broadcastPresence(cursorPosition, selectionStart, selectionEnd, true);
				}
			}
		}, 500);
	}

	/**
	 * End collaboration session
	 */
	public endCollaboration(): void {
		if (this._presenceUpdateInterval) {
			mainWindow.clearInterval(this._presenceUpdateInterval);
		}

		if (this._cursorUpdateTimeout) {
			mainWindow.clearTimeout(this._cursorUpdateTimeout);
		}

		this._uiController.removeAllRemoteCursors();
		this._presenceService.clearUsers();
		this._syncService.disconnect();

		this._session = null;
		this._onSessionEnded.fire();
	}

	/**
	 * Get current session
	 */
	public getSession(): ICollaborationSession | null {
		return this._session;
	}

	/**
	 * Get current user ID
	 */
	public getUserId(): string {
		return this._userId;
	}

	/**
	 * Get current user name
	 */
	public getUserName(): string {
		return this._userName;
	}

	/**
	 * Check if this is the host
	 */
	public isHost(): boolean {
		return this._isHost;
	}

	/**
	 * Get remote users
	 */
	public getRemoteUsers(): IRemoteUser[] {
		return this._presenceService.getAllUsers();
	}

	/**
	 * Get document content
	 */
	public getDocumentContent(): string {
		return this._documentService.getContent();
	}

	/**
	 * Get document version
	 */
	public getDocumentVersion(): number {
		return this._documentService.getVersion();
	}

	/**
	 * Get connection status
	 */
	public getConnectionStatus(): ConnectionStatus {
		return this._syncService.getConnectionStatus();
	}

	/**
	 * Get statistics
	 */
	public getStats() {
		return {
			session: this._session,
			userId: this._userId,
			userName: this._userName,
			isHost: this._isHost,
			document: this._documentService.getStats(),
			presence: this._presenceService.getStats(),
			connectionStatus: this._syncService.getConnectionStatus()
		};
	}

	/**
	 * Dispose all resources
	 */
	public dispose(): void {
		this.endCollaboration();
		this._documentService.dispose();
		this._syncService.dispose();
		this._presenceService.dispose();
		this._uiController.dispose();
	}
}
