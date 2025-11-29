/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { mainWindow } from '../../../../base/browser/window.js';

export interface RemoteOperation {
	operationId: string;
	userId: string;
	userName: string;
	data: string;
	version: number;
	timestamp: number;
}

export interface CursorUpdate {
	userId: string;
	userName: string;
	line: number;
	column: number;
	timestamp: number;
}

export interface UserPresence {
	userId: string;
	userName: string;
	isActive: boolean;
	lastSeen: number;
}

/**
 * WebSocket service for real-time collaboration
 * Handles operation sync, cursor tracking, and user awareness
 */
class WebSocketService {
	private ws: WebSocket | null = null;
	private wsUrl: string = 'wss://octate.qzz.io/collaborate';
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 3000;
	private heartbeatInterval: NodeJS.Timeout | null = null;

	private roomId: string | null = null;
	private userId: string | null = null;
	private userName: string | null = null;

	// Events
	private readonly _onOperationReceived = new Emitter<RemoteOperation>();
	public readonly onOperationReceived: Event<RemoteOperation> = this._onOperationReceived.event;

	private readonly _onCursorUpdate = new Emitter<CursorUpdate>();
	public readonly onCursorUpdate: Event<CursorUpdate> = this._onCursorUpdate.event;

	private readonly _onUserPresenceChanged = new Emitter<UserPresence>();
	public readonly onUserPresenceChanged: Event<UserPresence> = this._onUserPresenceChanged.event;

	private readonly _onConnected = new Emitter<void>();
	public readonly onConnected: Event<void> = this._onConnected.event;

	private readonly _onDisconnected = new Emitter<void>();
	public readonly onDisconnected: Event<void> = this._onDisconnected.event;

	private readonly _onError = new Emitter<string>();
	public readonly onError: Event<string> = this._onError.event;

	/**
	 * Connect to WebSocket server
	 */
	public connect(wsUrl: string, roomId: string, userId: string, userName: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.wsUrl = wsUrl;
			this.roomId = roomId;
			this.userId = userId;
			this.userName = userName;

			try {
				this.ws = new WebSocket(this.wsUrl);

				this.ws.addEventListener('open', () => {
					console.log('✓ WebSocket connected');
					this.reconnectAttempts = 0;

					// Send auth message with room context (development mode)
					this.send({
						type: 'auth',
						data: {
							roomId: roomId,
							userId: userId,
							userName: userName,
							token: null
						}
					});

					// Start heartbeat
					this.startHeartbeat();
					this._onConnected.fire();
					resolve();
				});

				this.ws.addEventListener('message', (event) => {
					this.handleMessage(event.data);
				});

				this.ws.addEventListener('error', (event) => {
					console.error('✗ WebSocket error:', event);
					this._onError.fire('WebSocket error occurred');
					reject(new Error('WebSocket connection failed'));
				});

				this.ws.addEventListener('close', () => {
					console.warn('⊘ WebSocket closed');
					this.stopHeartbeat();
					this._onDisconnected.fire();
					this.attemptReconnect();
				});
			} catch (error) {
				console.error('Failed to create WebSocket:', error);
				reject(error);
			}
		});
	}

	/**
	 * Handle incoming messages
	 */
	private handleMessage(data: string): void {
		try {
			const message = JSON.parse(data);

			switch (message.type) {
				case 'auth-success':
					console.log('✓ Authenticated successfully');
					console.log('  Joining room:', this.roomId, 'as user:', this.userId);
					// Now send join-room message with proper format
					this.send({
						type: 'join-room',
						data: {
							roomId: this.roomId,
							userId: this.userId,
							userName: this.userName
						}
					});
					break;

				case 'auth-error':
					console.error('✗ Authentication error:', message.data?.message);
					this._onError.fire(message.data?.message || 'Authentication error');
					// Don't disconnect immediately - backend may still accept room-based auth
					break;

				case 'room-joined':
					console.log('✓ Successfully joined room');
					break;

				case 'operation':
					this._onOperationReceived.fire({
						operationId: message.operationId || message.data?.operationId,
						userId: message.userId || message.data?.userId,
						userName: message.userName || message.data?.userName,
						data: message.data?.data || (typeof message.data === 'string' ? message.data : JSON.stringify(message.data)),
						version: message.version || message.data?.version,
						timestamp: message.timestamp || message.data?.timestamp
					});
					break;

				case 'cursor':
					this._onCursorUpdate.fire({
						userId: message.userId || message.data?.userId,
						userName: message.userName || message.data?.userName,
						line: message.line ?? message.data?.line,
						column: message.column ?? message.data?.column,
						timestamp: message.timestamp || message.data?.timestamp
					});
					break;

				case 'presence':
					this._onUserPresenceChanged.fire({
						userId: message.userId || message.data?.userId,
						userName: message.userName || message.data?.userName,
						isActive: message.isActive ?? message.data?.isActive ?? true,
						lastSeen: message.lastSeen || message.data?.lastSeen || Date.now()
					});
					break;

				case 'ack':
					console.log('✓ Server acknowledged:', message.data?.operationId || message.operationId);
					break;

				case 'sync':
					console.log('✓ Sync received:', message.data);
					break;

				case 'welcome':
					console.log('✓ Connected to collaboration server');
					break;

				case 'joined':
					console.log('✓ Successfully joined room');
					break;

				case 'error':
					console.error('✗ Server error:', message.data?.message || message.message || 'Unknown error');
					console.error('  Error details:', message.data || message);
					this._onError.fire(message.data?.message || message.message || 'Server error occurred');
					break;

				case 'user_joined':
					console.log('✓ User joined:', message.data?.userName || message.userName);
					this._onUserPresenceChanged.fire({
						userId: message.data?.userId || message.userId,
						userName: message.data?.userName || message.userName,
						isActive: true,
						lastSeen: Date.now()
					});
					break;

				case 'user_left':
					console.log('✓ User left:', message.data?.userId || message.userId);
					break;

				case 'sync-response':
					console.log('✓ Sync response received with', message.data?.operations?.length || 0, 'operations');
					// Emit all sync operations
					if (message.data?.operations && Array.isArray(message.data.operations)) {
						message.data.operations.forEach((op: any) => {
							this._onOperationReceived.fire({
								operationId: op.operationId,
								userId: op.userId,
								userName: op.userName,
								data: typeof op.data === 'string' ? op.data : JSON.stringify(op.data),
								version: op.version,
								timestamp: op.timestamp
							});
						});
					}
					break;

				case 'pong':
					// Heartbeat response - silently ignore
					break;

				default:
					console.warn('Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('Error handling message:', error);
		}
	}

	/**
	 * Send operation to other users
	 */
	public sendOperation(operationId: string, data: string, version: number): void {
		if (!this.isConnected()) {
			console.warn('WebSocket not connected, queuing operation');
			return;
		}

		this.send({
			type: 'operation',
			roomId: this.roomId,
			operationId,
			userId: this.userId,
			userName: this.userName,
			data,
			version,
			timestamp: Date.now()
		});
	}

	/**
	 * Send cursor position update
	 */
	public sendCursorUpdate(line: number, column: number): void {
		if (!this.isConnected()) {
			return;
		}

		this.send({
			type: 'cursor',
			roomId: this.roomId,
			userId: this.userId,
			userName: this.userName,
			line,
			column,
			timestamp: Date.now()
		});
	}

	/**
	 * Send room creation data after connecting as host
	 */
	public sendRoomCreationData(roomName: string, fileId: string, content: string = '', version: number = 0): void {
		if (!this.isConnected()) {
			console.warn('WebSocket not connected, cannot send room creation data');
			return;
		}

		this.send({
			type: 'join-room',
			data: {
				roomId: this.roomId,
				userId: this.userId,
				userName: this.userName,
				roomName,
				fileId,
				host: this.userId,
				content,
				version
			}
		});
	}

	/**
	 * Send raw message
	 */
	private send(message: any): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(JSON.stringify(message));
			} catch (error) {
				console.error('Failed to send message:', error);
			}
		}
	}

	/**
	 * Start heartbeat to keep connection alive
	 */
	private startHeartbeat(): void {
		const heartbeatFn = () => {
			if (this.isConnected()) {
				this.send({
					type: 'ping',
					timestamp: Date.now()
				});
			}
		};
		this.heartbeatInterval = mainWindow.setInterval(heartbeatFn, 30000) as any; // Every 30 seconds
	}

	/**
	 * Stop heartbeat
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			mainWindow.clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	/**
	 * Attempt to reconnect
	 */
	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('✗ Max reconnection attempts reached');
			this._onError.fire('Failed to reconnect to WebSocket');
			return;
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
		console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

		setTimeout(() => {
			if (this.roomId && this.userId && this.userName) {
				this.connect(this.wsUrl, this.roomId, this.userId, this.userName).catch(error => {
					console.error('Reconnection failed:', error);
				});
			}
		}, delay);
	}

	/**
	 * Check if WebSocket is connected
	 */
	public isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	/**
	 * Disconnect WebSocket
	 */
	public disconnect(): void {
		this.stopHeartbeat();
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * Get connection status
	 */
	public getStatus(): string {
		if (!this.ws) {
			return 'disconnected';
		}
		switch (this.ws.readyState) {
			case WebSocket.CONNECTING:
				return 'connecting';
			case WebSocket.OPEN:
				return 'connected';
			case WebSocket.CLOSING:
				return 'closing';
			case WebSocket.CLOSED:
				return 'closed';
			default:
				return 'unknown';
		}
	}
}

// Export singleton instance
export const websocketService = new WebSocketService();
