/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-nocheck

import { Emitter, Event } from '../../../../base/common/event.js';
import {
	ISignalingServer,
	SignalingMessage,
	SignalingMessageType,
	WebRTCOffer,
	WebRTCAnswer,
	ICECandidate,
	RemoteOperation,
	RoomState
} from '../common/p2pTypes.js';
import { roomManager } from './roomManager.js';

interface ClientConnection {
	userId: string;
	roomId: string;
	socket: any;
	isAlive: boolean;
}

/**
 * SignalingServer handles WebSocket signaling for P2P connections
 * Features:
 * - Room creation/joining/leaving with signaling
 * - WebRTC offer/answer/ICE candidate exchange
 * - Operation broadcasting
 * - Heartbeat/keep-alive
 * - Connection management
 */
export class SignalingServer implements ISignalingServer {
	private wss: any = null;
	private port: number = 0;
	private clients: Map<any, ClientConnection> = new Map();
	private heartbeatInterval: NodeJS.Timeout | null = null;

	// Events
	private readonly _onClientConnected = new Emitter<{ userId: string; roomId: string }>();
	public readonly onClientConnected = this._onClientConnected.event;

	private readonly _onClientDisconnected = new Emitter<{ userId: string; roomId: string }>();
	public readonly onClientDisconnected = this._onClientDisconnected.event;

	constructor() {
		// Will be initialized when start() is called
	}

	/**
	 * Start the signaling server
	 */
	public async start(port: number): Promise<void> {
		this.port = port;

		try {
			// Dynamically import ws (WebSocket)
			const ws = await import('ws');

			this.wss = new ws.Server({ port });

			this.wss.on('connection', (socket: any) => {
				this.handleNewConnection(socket);
			});

			this.wss.on('error', (error: any) => {
				console.error(`[SignalingServer] Server error:`, error);
			});

			// Start heartbeat
			this.startHeartbeat();

			console.log(`[SignalingServer] Started on port ${port}`);
		} catch (error) {
			console.error(`[SignalingServer] Failed to start:`, error);
			throw error;
		}
	}

	/**
	 * Stop the signaling server
	 */
	public async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.heartbeatInterval) {
				clearInterval(this.heartbeatInterval);
				this.heartbeatInterval = null;
			}

			// Close all connections
			for (const [socket, client] of this.clients) {
				socket.close();
				this._onClientDisconnected.fire({ userId: client.userId, roomId: client.roomId });
			}

			this.clients.clear();

			if (this.wss) {
				this.wss.close((error: any) => {
					if (error) {
						console.error(`[SignalingServer] Error closing:`, error);
						reject(error);
					} else {
						console.log(`[SignalingServer] Stopped`);
						resolve();
					}
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Handle new WebSocket connection
	 */
	private handleNewConnection(socket: any): void {
		console.log(`[SignalingServer] New client connection`);

		socket.on('message', (data: any) => {
			this.handleMessage(socket, data);
		});

		socket.on('close', () => {
			this.handleClientDisconnect(socket);
		});

		socket.on('error', (error: any) => {
			console.error(`[SignalingServer] Socket error:`, error);
		});

		socket.on('pong', () => {
			const client = this.clients.get(socket);
			if (client) {
				client.isAlive = true;
			}
		});
	}

	/**
	 * Handle incoming message
	 */
	private handleMessage(socket: any, data: any): void {
		try {
			const message = JSON.parse(data.toString()) as SignalingMessage;

			console.log(`[SignalingServer] Message from ${message.userId}: ${message.type}`);

			switch (message.type) {
				case SignalingMessageType.AUTH:
					this.handleAuth(socket, message);
					break;

				case SignalingMessageType.CREATE_ROOM:
					this.handleCreateRoom(socket, message);
					break;

				case SignalingMessageType.JOIN_ROOM:
					this.handleJoinRoom(socket, message);
					break;

				case SignalingMessageType.LEAVE_ROOM:
					this.handleLeaveRoom(socket, message);
					break;

				case SignalingMessageType.SDP_OFFER:
					this.handleSDPOffer(socket, message);
					break;

				case SignalingMessageType.SDP_ANSWER:
					this.handleSDPAnswer(socket, message);
					break;

				case SignalingMessageType.ICE_CANDIDATE:
					this.handleICECandidate(socket, message);
					break;

				case SignalingMessageType.OPERATION:
					this.handleOperation(socket, message);
					break;

				case SignalingMessageType.HEARTBEAT:
					this.handleHeartbeat(socket, message);
					break;

				default:
					console.warn(`[SignalingServer] Unknown message type: ${message.type}`);
					this.sendError(socket, `Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error(`[SignalingServer] Failed to parse message:`, error);
			this.sendError(socket, 'Invalid message format');
		}
	}

	/**
	 * Handle authentication
	 */
	private handleAuth(socket: any, message: SignalingMessage): void {
		const { userId, userName, roomId } = message.data || {};

		if (!userId) {
			this.sendError(socket, 'Missing userId');
			return;
		}

		// Store client connection info
		const client: ClientConnection = {
			userId,
			roomId: roomId || '',
			socket,
			isAlive: true
		};

		this.clients.set(socket, client);

		this.send(socket, {
			type: SignalingMessageType.AUTH_SUCCESS,
			roomId: roomId || '',
			userId,
			data: { userId, userName }
		});

		console.log(`[SignalingServer] Client authenticated: ${userId}`);
	}

	/**
	 * Handle room creation
	 */
	private handleCreateRoom(socket: any, message: SignalingMessage): void {
		const { roomId, roomName, fileId, content, version } = message.data || {};
		const { userId, userName } = message;

		if (!roomId || !roomName || !userId) {
			this.sendError(socket, 'Missing required fields');
			return;
		}

		// Create room in room manager
		const metadata = roomManager.createRoom(roomId, roomName, userId, userName || 'Host', fileId, content, version);

		// Update client connection
		const client = this.clients.get(socket);
		if (client) {
			client.roomId = roomId;
			this._onClientConnected.fire({ userId, roomId });
		}

		// Send confirmation
		this.send(socket, {
			type: SignalingMessageType.ROOM_CREATED,
			roomId,
			userId,
			data: { metadata }
		});

		console.log(`[SignalingServer] Room created: ${roomId}`);
	}

	/**
	 * Handle room joining
	 */
	private handleJoinRoom(socket: any, message: SignalingMessage): void {
		const { roomId } = message.data || {};
		const { userId, userName } = message;

		if (!roomId || !userId) {
			this.sendError(socket, 'Missing required fields');
			return;
		}

		// Join room in room manager
		const metadata = roomManager.joinRoom(roomId, userId, userName || 'Guest');

		if (!metadata) {
			this.sendError(socket, `Room not found: ${roomId}`);
			return;
		}

		// Update client connection
		const client = this.clients.get(socket);
		if (client) {
			client.roomId = roomId;
			this._onClientConnected.fire({ userId, roomId });
		}

		// Send confirmation with peer list
		const peers = roomManager.getPeerList(roomId);
		this.send(socket, {
			type: SignalingMessageType.ROOM_JOINED,
			roomId,
			userId,
			data: { metadata, peers }
		});

		// Introduce new peer to other peers in the room
		this.broadcastToRoom(roomId, {
			type: SignalingMessageType.INTRODUCE_PEERS,
			roomId,
			userId: 'server',
			data: {
				joinedUser: { userId, userName },
				otherPeers: peers.filter(p => p.userId !== userId)
			}
		});

		console.log(`[SignalingServer] User ${userId} joined room ${roomId}`);
	}

	/**
	 * Handle room leaving
	 */
	private handleLeaveRoom(socket: any, message: SignalingMessage): void {
		const client = this.clients.get(socket);
		if (!client) {
			return;
		}

		const { roomId } = message.data || client;
		const { userId } = message;

		roomManager.leaveRoom(roomId, userId);

		// Notify others in room
		this.broadcastToRoom(roomId, {
			type: SignalingMessageType.LEAVE_ROOM,
			roomId,
			userId,
			data: {}
		});

		this._onClientDisconnected.fire({ userId, roomId });

		console.log(`[SignalingServer] User ${userId} left room ${roomId}`);
	}

	/**
	 * Handle WebRTC SDP offer
	 */
	private handleSDPOffer(socket: any, message: SignalingMessage): void {
		const { roomId, targetUserId } = message.data || {};

		if (!roomId || !targetUserId) {
			this.sendError(socket, 'Missing roomId or targetUserId');
			return;
		}

		// Forward offer to target user
		this.forwardToUser(roomId, targetUserId, {
			type: SignalingMessageType.SDP_OFFER,
			roomId,
			userId: message.userId,
			data: message.data
		});

		console.log(`[SignalingServer] SDP offer from ${message.userId} to ${targetUserId}`);
	}

	/**
	 * Handle WebRTC SDP answer
	 */
	private handleSDPAnswer(socket: any, message: SignalingMessage): void {
		const { roomId, targetUserId } = message.data || {};

		if (!roomId || !targetUserId) {
			this.sendError(socket, 'Missing roomId or targetUserId');
			return;
		}

		// Forward answer to target user
		this.forwardToUser(roomId, targetUserId, {
			type: SignalingMessageType.SDP_ANSWER,
			roomId,
			userId: message.userId,
			data: message.data
		});

		console.log(`[SignalingServer] SDP answer from ${message.userId} to ${targetUserId}`);
	}

	/**
	 * Handle WebRTC ICE candidate
	 */
	private handleICECandidate(socket: any, message: SignalingMessage): void {
		const { roomId, targetUserId } = message.data || {};

		if (!roomId || !targetUserId) {
			console.warn(`[SignalingServer] ICE candidate missing roomId or targetUserId`);
			return;
		}

		// Forward candidate to target user
		this.forwardToUser(roomId, targetUserId, {
			type: SignalingMessageType.ICE_CANDIDATE,
			roomId,
			userId: message.userId,
			data: message.data
		});
	}

	/**
	 * Handle SDP offer (public method for testing)
	 */
	public handleSDPOffer(roomId: string, userId: string, offer: WebRTCOffer): void {
		// This is called by room manager to handle offers
		// Forward to all other peers in room
		this.broadcastToRoom(roomId, {
			type: SignalingMessageType.SDP_OFFER,
			roomId,
			userId,
			data: { offer }
		});
	}

	/**
	 * Handle ICE candidate (public method for testing)
	 */
	public handleICECandidate(roomId: string, userId: string, candidate: ICECandidate): void {
		// Forward to all other peers in room
		this.broadcastToRoom(roomId, {
			type: SignalingMessageType.ICE_CANDIDATE,
			roomId,
			userId,
			data: { candidate }
		});
	}

	/**
	 * Handle operation broadcast
	 */
	private handleOperation(socket: any, message: SignalingMessage): void {
		const { roomId } = message.data || {};

		if (!roomId) {
			this.sendError(socket, 'Missing roomId');
			return;
		}

		const operation = message.data as RemoteOperation;

		// Record operation stats
		roomManager.recordOperation(roomId, operation);

		// Broadcast to room (except sender)
		this.broadcastToRoom(
			roomId,
			{
				type: SignalingMessageType.OPERATION,
				roomId,
				userId: message.userId,
				data: operation
			},
			message.userId
		);

		console.log(`[SignalingServer] Operation from ${message.userId} in room ${roomId}`);
	}

	/**
	 * Broadcast operation to room (public method)
	 */
	public broadcastOperation(roomId: string, operation: RemoteOperation): void {
		this.broadcastToRoom(
			roomId,
			{
				type: SignalingMessageType.OPERATION,
				roomId,
				userId: operation.userId,
				data: operation
			},
			operation.userId
		);
	}

	/**
	 * Handle heartbeat
	 */
	private handleHeartbeat(socket: any, message: SignalingMessage): void {
		const { roomId } = message.data || {};
		if (roomId) {
			roomManager.updatePeerHeartbeat(roomId, message.userId);
		}

		this.send(socket, {
			type: SignalingMessageType.HEARTBEAT_ACK,
			roomId: roomId || '',
			userId: message.userId
		});
	}

	/**
	 * Handle client disconnect
	 */
	private handleClientDisconnect(socket: any): void {
		const client = this.clients.get(socket);
		if (!client) {
			return;
		}

		const { userId, roomId } = client;

		// Leave room
		if (roomId) {
			roomManager.leaveRoom(roomId, userId);

			// Notify others
			this.broadcastToRoom(roomId, {
				type: SignalingMessageType.LEAVE_ROOM,
				roomId,
				userId,
				data: {}
			});
		}

		this.clients.delete(socket);
		this._onClientDisconnected.fire({ userId, roomId });

		console.log(`[SignalingServer] Client disconnected: ${userId}`);
	}

	/**
	 * Send message to specific client
	 */
	private send(socket: any, message: SignalingMessage): void {
		if (socket.readyState === 1) { // OPEN
			socket.send(JSON.stringify(message));
		}
	}

	/**
	 * Send error to client
	 */
	private sendError(socket: any, error: string): void {
		this.send(socket, {
			type: SignalingMessageType.ERROR,
			roomId: '',
			userId: '',
			data: { error }
		});
	}

	/**
	 * Forward message to specific user in a room
	 */
	private forwardToUser(roomId: string, targetUserId: string, message: SignalingMessage): void {
		for (const [socket, client] of this.clients) {
			if (client.roomId === roomId && client.userId === targetUserId) {
				this.send(socket, message);
				return;
			}
		}

		console.warn(`[SignalingServer] Target user not found: ${targetUserId} in room ${roomId}`);
	}

	/**
	 * Broadcast message to all clients in a room
	 */
	private broadcastToRoom(roomId: string, message: SignalingMessage, exceptUserId?: string): void {
		for (const [socket, client] of this.clients) {
			if (client.roomId === roomId && client.userId !== exceptUserId) {
				this.send(socket, message);
			}
		}
	}

	/**
	 * Start heartbeat timer to detect dead connections
	 */
	private startHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {
			for (const [socket, client] of this.clients) {
				if (client.isAlive === false) {
					socket.close();
					continue;
				}

				client.isAlive = false;
				socket.ping();
			}
		}, 30000); // Every 30 seconds

		console.log(`[SignalingServer] Heartbeat interval started (every 30s)`);
	}
}

// Export singleton instance
export const signalingServer = new SignalingServer();
