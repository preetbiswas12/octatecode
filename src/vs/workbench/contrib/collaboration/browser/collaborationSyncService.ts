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
 * NEW: Token-based authentication with server signaling only
 * P2P operations flow via WebRTC data channels (not server)
 */
export class CollaborationSyncService {
	private _socket: WebSocket | null = null;
	private _serverUrl: string = '';
	private _httpBaseUrl: string = '';
	private _sessionId: string | null = null;
	private _userId: string = '';
	private _roomId: string = '';
	private _authToken: string = '';
	private _reconnectAttempts: number = 0;
	private _reconnectDelay: number = 10; // milliseconds
	private _maxReconnectDelay: number = 30000;
	private _messageQueue: ICollaborationMessage[] = [];
	private _connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;
	private _dataChannels: Map<string, RTCDataChannel> = new Map(); // userId -> data channel
	private _peerConnections: Map<string, RTCPeerConnection> = new Map(); // userId -> peer connection

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

		// Extract HTTP base URL from WebSocket URL
		if (serverUrl.startsWith('ws://')) {
			this._httpBaseUrl = serverUrl.replace('ws://', 'http://');
		} else if (serverUrl.startsWith('wss://')) {
			this._httpBaseUrl = serverUrl.replace('wss://', 'https://');
		} else {
			this._httpBaseUrl = `http://${serverUrl.replace(/:\d+$/, '')}:3000`;
		}
	}

	/**
	 * Generate authentication token from HTTP token endpoint (NEW)
	 */
	private async generateAuthToken(roomId: string): Promise<string> {
		try {
			const response = await fetch(`${this._httpBaseUrl}/api/auth/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: this._userId,
					roomId: roomId
				})
			});

			if (!response.ok) {
				throw new Error(`Token generation failed: ${response.statusText}`);
			}

			const data = await response.json();
			return data.token;
		} catch (error) {
			console.error('[Collab] Failed to generate auth token:', error);
			throw error;
		}
	}

	/**
	 * Connect to collaboration server with token-based auth
	 */
	public async connect(roomId?: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this._roomId = roomId || this._roomId;
				if (!this._roomId) {
					reject(new Error('Room ID required for connection'));
					return;
				}

				this.setConnectionStatus(ConnectionStatus.Connecting);

				// For development, use localhost; for production, use provided serverUrl
				const wsUrl = this._serverUrl.startsWith('ws')
					? this._serverUrl
					: `ws://${this._serverUrl}`;

				this._socket = new WebSocket(wsUrl);

				this._socket.onopen = async () => {
					console.log('[Collab] Connected to server');
					this.setConnectionStatus(ConnectionStatus.Connected);
					this._reconnectAttempts = 0;
					this._reconnectDelay = 10;

					try {
						// Step 1: Generate auth token (NEW)
						console.log('[Collab] Generating auth token...');
						this._authToken = await this.generateAuthToken(this._roomId);

						// Step 2: Send authentication with token
						this.send({
							type: 'auth',
							data: {
								token: this._authToken,
								userId: this._userId,
								roomId: this._roomId
							}
						});

						resolve();
					} catch (error) {
						console.error('[Collab] Token generation failed:', error);
						reject(error);
					}
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
	 * Send an operation via P2P data channel (not server)
	 * NEW: Operations flow peer-to-peer, server no longer broadcasts
	 */
	public sendOperation(operation: IOperation): void {
		// NEW: Send via data channels to all connected peers
		for (const [userId, dataChannel] of this._dataChannels.entries()) {
			if (dataChannel.readyState === 'open') {
				const message = JSON.stringify({
					type: 'operation',
					data: operation
				});
				dataChannel.send(message);
				console.log(`[Collab] Sent operation to peer ${userId} via P2P`);
			}
		}

		// Fallback: If no P2P channels yet, queue in server (for initial sync)
		if (this._dataChannels.size === 0) {
			console.log('[Collab] No P2P connections yet, queuing operation');
			this.send({
				type: 'operation-sync-request',
				sessionId: this._sessionId || undefined,
				data: operation
			});
		}
	}

	/**
	 * Create WebRTC peer connection for P2P operation exchange (NEW)
	 */
	private async setupPeerConnection(remotePeerId: string): Promise<void> {
		try {
			const peerConnection = new RTCPeerConnection({
				iceServers: [
					{ urls: 'stun:stun.l.google.com:19302' },
					{ urls: 'stun:stun1.l.google.com:19302' }
				]
			});

			this._peerConnections.set(remotePeerId, peerConnection);

			// Create data channel for operations
			const dataChannel = peerConnection.createDataChannel('operations', {
				ordered: true
			});
			this.setupDataChannel(remotePeerId, dataChannel);

			// Handle incoming data channels
			peerConnection.ondatachannel = (event) => {
				console.log(`[Collab P2P] Received data channel from ${remotePeerId}`);
				this.setupDataChannel(remotePeerId, event.channel);
			};

			// Handle ICE candidates and send via signaling server
			peerConnection.onicecandidate = (event) => {
				if (event.candidate) {
					this.send({
						type: 'webrtc-ice-candidate',
						data: {
							to: remotePeerId,
							candidate: event.candidate
						}
					});
				}
			};

			// Create and send offer
			const offer = await peerConnection.createOffer();
			await peerConnection.setLocalDescription(offer);

			this.send({
				type: 'webrtc-offer',
				data: {
					to: remotePeerId,
					offer: offer
				}
			});

			console.log(`[Collab P2P] Initiated connection to ${remotePeerId}`);
		} catch (error) {
			console.error(`[Collab P2P] Failed to setup peer connection with ${remotePeerId}:`, error);
		}
	}

	/**
	 * Setup data channel for operation exchange (NEW)
	 */
	private setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
		dataChannel.binaryType = 'arraybuffer';

		dataChannel.onopen = () => {
			console.log(`[Collab P2P] Data channel opened with ${peerId}`);
			this._dataChannels.set(peerId, dataChannel);
		};

		dataChannel.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data as string);
				if (message.type === 'operation') {
					console.log(`[Collab P2P] Received operation from ${peerId}`);
					this._onRemoteOperation.fire(message.data);
				}
			} catch (error) {
				console.error(`[Collab P2P] Failed to parse P2P message:`, error);
			}
		};

		dataChannel.onclose = () => {
			console.log(`[Collab P2P] Data channel closed with ${peerId}`);
			this._dataChannels.delete(peerId);
		};

		dataChannel.onerror = (error) => {
			console.error(`[Collab P2P] Data channel error with ${peerId}:`, error);
		};
	}

	/**
	 * Handle WebRTC SDP offer from peer (NEW)
	 */
	private async handleWebRTCOffer(from: string, offer: RTCSessionDescriptionInit): Promise<void> {
		try {
			let peerConnection = this._peerConnections.get(from);

			if (!peerConnection) {
				peerConnection = new RTCPeerConnection({
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{ urls: 'stun:stun1.l.google.com:19302' }
					]
				});
				this._peerConnections.set(from, peerConnection);

				// Handle incoming data channels from offer
				peerConnection.ondatachannel = (event) => {
					console.log(`[Collab P2P] Received data channel from offer ${from}`);
					this.setupDataChannel(from, event.channel);
				};

				// Handle ICE candidates
				peerConnection.onicecandidate = (event) => {
					if (event.candidate) {
						this.send({
							type: 'webrtc-ice-candidate',
							data: {
								to: from,
								candidate: event.candidate
							}
						});
					}
				};
			}

			await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
			const answer = await peerConnection.createAnswer();
			await peerConnection.setLocalDescription(answer);

			this.send({
				type: 'webrtc-answer',
				data: {
					to: from,
					answer: answer
				}
			});

			console.log(`[Collab P2P] Answered offer from ${from}`);
		} catch (error) {
			console.error(`[Collab P2P] Failed to handle offer from ${from}:`, error);
		}
	}

	/**
	 * Handle WebRTC SDP answer from peer (NEW)
	 */
	private async handleWebRTCAnswer(from: string, answer: RTCSessionDescriptionInit): Promise<void> {
		try {
			const peerConnection = this._peerConnections.get(from);
			if (!peerConnection) {
				console.error(`[Collab P2P] No peer connection found for ${from}`);
				return;
			}

			await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
			console.log(`[Collab P2P] Applied answer from ${from}`);
		} catch (error) {
			console.error(`[Collab P2P] Failed to apply answer from ${from}:`, error);
		}
	}

	/**
	 * Handle ICE candidate from peer (NEW)
	 */
	private async handleICECandidate(from: string, candidate: RTCIceCandidate): Promise<void> {
		try {
			const peerConnection = this._peerConnections.get(from);
			if (!peerConnection) {
				console.error(`[Collab P2P] No peer connection found for ICE candidate from ${from}`);
				return;
			}

			await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
			console.log(`[Collab P2P] Added ICE candidate from ${from}`);
		} catch (error) {
			console.error(`[Collab P2P] Failed to add ICE candidate from ${from}:`, error);
		}
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
					// Remote operation (fallback from server if no P2P yet)
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
					// NEW: When peer joins, establish P2P connection
					console.log(`[Collab] User joined: ${message.data.userId}`);
					this._onUserJoined.fire({
						userId: message.data.userId,
						userName: message.data.userName
					});
					// Initiate P2P connection with new peer
					this.setupPeerConnection(message.data.userId);
					break;

				case 'user-left':
					this._onUserLeft.fire(message.data.userId);
					// Cleanup P2P connection
					const peerConn = this._peerConnections.get(message.data.userId);
					if (peerConn) {
						peerConn.close();
						this._peerConnections.delete(message.data.userId);
					}
					this._dataChannels.delete(message.data.userId);
					break;

				// NEW: WebRTC signaling messages
				case 'webrtc-offer':
					console.log(`[Collab P2P] Received offer from ${message.data.from}`);
					this.handleWebRTCOffer(message.data.from, message.data.offer);
					break;

				case 'webrtc-answer':
					console.log(`[Collab P2P] Received answer from ${message.data.from}`);
					this.handleWebRTCAnswer(message.data.from, message.data.answer);
					break;

				case 'webrtc-ice-candidate':
					console.log(`[Collab P2P] Received ICE candidate from ${message.data.from}`);
					this.handleICECandidate(message.data.from, message.data.candidate);
					break;

				case 'error':
					console.error('[Collab] Server error:', message.data);
					break;

				default:
					console.warn('[Collab] Unknown message type:', message.type);
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
