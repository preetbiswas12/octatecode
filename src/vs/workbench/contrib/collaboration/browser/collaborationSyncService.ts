/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOperation, ConnectionStatus } from './collaborationTypes.js';
import { Emitter, Event } from '../../../../base/common/event.js';

export interface ICollaborationMessage {
	type: string;
	data?: any;
	sessionId?: string;
	userId?: string;
	timestamp?: number;
}

/**
 * Service for WebSocket transport, room management, and network synchronization
 */
export class CollaborationSyncService {
	private _socket: WebSocket | null = null;
	private _serverUrl: string = '';
	private _sessionId: string | null = null;
	private _userId: string = '';
	private _jwt: string = '';
	private _reconnectAttempts: number = 0;
	private _reconnectDelay: number = 10; // milliseconds
	private _maxReconnectDelay: number = 30000;
	private _messageQueue: ICollaborationMessage[] = [];
	private _connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;

	private readonly _onRemoteOperation = new Emitter<IOperation>();
	public readonly onRemoteOperation: Event<IOperation> = this._onRemoteOperation.event;

	private readonly _onSyncComplete = new Emitter<{ content: string; version: number }>();
	public readonly onSyncComplete: Event<{ content: string; version: number }> = this._onSyncComplete.event;

	private readonly _onUserJoined = new Emitter<{ userId: string; userName: string }>();
	public readonly onUserJoined: Event<{ userId: string; userName: string }> = this._onUserJoined.event;

	private readonly _onUserLeft = new Emitter<string>();
	public readonly onUserLeft: Event<string> = this._onUserLeft.event;

	private readonly _onConnectionStatusChanged = new Emitter<ConnectionStatus>();
	public readonly onConnectionStatusChanged: Event<ConnectionStatus> = this._onConnectionStatusChanged.event;

	private readonly _onOperationAcknowledged = new Emitter<IOperation>();
	public readonly onOperationAcknowledged: Event<IOperation> = this._onOperationAcknowledged.event;

	constructor(serverUrl: string, userId: string) {
		this._serverUrl = serverUrl;
		this._userId = userId;
		this._jwt = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
	}

	/**
	 * Connect to collaboration server
	 */
	public async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.setConnectionStatus(ConnectionStatus.Connecting);

				// For development, use localhost; for production, use provided serverUrl
				const wsUrl = this._serverUrl.startsWith('ws')
					? this._serverUrl
					: `ws://${this._serverUrl}`;

				this._socket = new WebSocket(wsUrl);

				this._socket.onopen = () => {
					console.log('[Collab] Connected to server');
					this.setConnectionStatus(ConnectionStatus.Connected);
					this._reconnectAttempts = 0;
					this._reconnectDelay = 10;

					// Send authentication
					this.send({
						type: 'auth',
						data: { token: this._jwt, userId: this._userId }
					});

					resolve();
				};

				this._socket.onmessage = (event) => this.handleMessage(event.data);

				this._socket.onerror = (error) => {
					console.error('[Collab] WebSocket error:', error);
					this.setConnectionStatus(ConnectionStatus.Offline);
					reject(error);
				};

				this._socket.onclose = () => {
					console.log('[Collab] Disconnected from server');
					this.setConnectionStatus(ConnectionStatus.Disconnected);
					this.scheduleReconnect();
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Create a new collaboration session (room)
	 */
	public createSession(roomName: string, fileId: string, userName: string): void {
		this.send({
			type: 'create-room',
			data: { roomName, fileId, userName }
		});
	}

	/**
	 * Join an existing collaboration session
	 */
	public joinSession(sessionId: string, userName: string, roomData?: any): void {
		this._sessionId = sessionId;
		this.send({
			type: 'join-room',
			data: {
				roomId: sessionId,
				userName: userName,
				// Include room metadata if available
				...(roomData && {
					fileId: roomData.file_id || roomData.fileId || 'default',
					roomName: roomData.name || 'Unnamed Room',
					host: roomData.host,
					content: roomData.content || '',
					version: roomData.version || 0
				})
			}
		});
	}

	/**
	 * Send an operation to the server
	 */
	public sendOperation(operation: IOperation): void {
		this.send({
			type: 'operation',
			sessionId: this._sessionId || undefined,
			data: operation
		});
	}

	/**
	 * Broadcast presence information (cursor, selection, activity)
	 */
	public broadcastPresence(
		cursorPosition: number,
		selectionStart?: number,
		selectionEnd?: number,
		isActive?: boolean
	): void {
		this.send({
			type: 'presence',
			sessionId: this._sessionId || undefined,
			data: {
				userId: this._userId,
				cursorPosition,
				selectionStart,
				selectionEnd,
				isActive: isActive !== false
			}
		});
	}

	/**
	 * Handle incoming messages from server
	 */
	private handleMessage(rawData: string): void {
		try {
			const message = JSON.parse(rawData) as ICollaborationMessage;

			switch (message.type) {
				case 'sync':
					// Full document sync (on join or reconnect)
					this._onSyncComplete.fire({
						content: message.data.content,
						version: message.data.version
					});
					this._sessionId = message.data.sessionId;
					break;

				case 'operation':
					// Remote operation
					this._onRemoteOperation.fire(message.data);
					break;

				case 'ack':
					// Operation acknowledged by server
					this._onOperationAcknowledged.fire(message.data);
					break;

				case 'presence':
					// Remote user presence update
					// Handled separately by presence service
					break;

				case 'user-joined':
					this._onUserJoined.fire({
						userId: message.data.userId,
						userName: message.data.userName
					});
					break;

				case 'user-left':
					this._onUserLeft.fire(message.data.userId);
					break;

				case 'error':
					console.error('[Collab] Server error:', message.data);
					break;
			}
		} catch (error) {
			console.error('[Collab] Failed to parse message:', error);
		}
	}

	/**
	 * Send a message, queueing if offline
	 */
	private send(message: ICollaborationMessage): void {
		if (this._socket && this._socket.readyState === WebSocket.OPEN) {
			this._socket.send(JSON.stringify(message));
		} else {
			// Queue message for later delivery
			this._messageQueue.push(message);
			console.log('[Collab] Queued message, connection offline', this._messageQueue.length);
		}
	}


	/**
	 * Schedule automatic reconnection with exponential backoff
	 */
	private scheduleReconnect(): void {
		if (this._reconnectAttempts >= 10) {
			console.warn('[Collab] Max reconnect attempts reached');
			return;
		}

		const delay = Math.min(
			this._reconnectDelay * Math.pow(2, this._reconnectAttempts),
			this._maxReconnectDelay
		);

		console.log(`[Collab] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts + 1})`);

		setTimeout(() => {
			this._reconnectAttempts++;
			this.connect().catch((_err: any) => {
				console.error('[Collab] Reconnect failed:', _err);
				this.scheduleReconnect();
			});
		}, delay);
	}

	/**
	 * Disconnect from server
	 */
	public disconnect(): void {
		if (this._socket) {
			this._socket.close();
			this._socket = null;
		}
		this.setConnectionStatus(ConnectionStatus.Disconnected);
	}

	/**
	 * Check if connected
	 */
	public isConnected(): boolean {
		return this._connectionStatus === ConnectionStatus.Connected;
	}

	/**
	 * Get connection status
	 */
	public getConnectionStatus(): ConnectionStatus {
		return this._connectionStatus;
	}

	/**
	 * Set connection status and fire event
	 */
	private setConnectionStatus(status: ConnectionStatus): void {
		if (this._connectionStatus !== status) {
			this._connectionStatus = status;
			this._onConnectionStatusChanged.fire(status);
		}
	}

	/**
	 * Dispose resources
	 */
	public dispose(): void {
		this.disconnect();
		this._onRemoteOperation.dispose();
		this._onSyncComplete.dispose();
		this._onUserJoined.dispose();
		this._onUserLeft.dispose();
		this._onConnectionStatusChanged.dispose();
		this._onOperationAcknowledged.dispose();
	}
}
