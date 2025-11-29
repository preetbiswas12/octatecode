/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IOperation } from '../src/vs/workbench/contrib/collaboration/browser/collaborationTypes.js';

// WebSocket types imported for runtime
const ws = require('ws');

interface IRoom {
	id: string;
	name: string;
	fileId: string;
	host: string;
	content: string;
	operations: IOperation[];
	version: number;
	clients: Map<string, IClient>;
	createdAt: number;
}

interface IClient {
	userId: string;
	userName: string;
	socket: any;
	version: number;
}

interface IServerMessage {
	type: string;
	data?: any;
	sessionId?: string;
	userId?: string;
}

/**
 * WebSocket server for real-time collaborative code editing
 * Manages rooms, operations, and user presence
 */
class CollaborationServer {
	private _wss: any;
	private _rooms: Map<string, IRoom> = new Map();
	private _clientRooms: Map<any, string> = new Map();
	private _port: number;

	constructor(port: number = 3001) {
		this._port = port;
		this._wss = new ws.Server({ port });
		this._setupWebSocketHandlers();
	}

	private _setupWebSocketHandlers(): void {
		this._wss.on('connection', (socket: any) => {
			console.log(`[Server] New client connected`);

			socket.on('message', (data: any) => {
				this._handleMessage(socket, data);
			});

			socket.on('close', () => {
				this._handleClientDisconnect(socket);
			});

			socket.on('error', (error: any) => {
				console.error(`[Server] WebSocket error:`, error);
			});
		});

		console.log(`[Server] WebSocket server listening on port ${this._port}`);
	}

	private _handleMessage(socket: any, data: any): void {
		try {
			const message = JSON.parse(data.toString()) as IServerMessage;

			switch (message.type) {
				case 'auth':
					this._handleAuth(socket, message);
					break;

				case 'create-room':
					this._handleCreateRoom(socket, message);
					break;

				case 'join-room':
					this._handleJoinRoom(socket, message);
					break;

				case 'operation':
					this._handleOperation(socket, message);
					break;

				case 'presence':
					this._handlePresence(socket, message);
					break;

				default:
					console.warn(`[Server] Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error(`[Server] Failed to parse message:`, error);
		}
	}

	private _handleAuth(socket: any, message: IServerMessage): void {
		const token = message.data?.token;
		const userId = message.data?.userId;

		// For development mode, allow auth with just userId
		if (userId) {
			console.log(`[Server] Client authenticated: ${userId}`);
			this._send(socket, {
				type: 'auth-success',
				data: { userId }
			});
			return;
		}

		this._sendError(socket, 'Invalid auth data');
	}

	private _handleCreateRoom(socket: any, message: IServerMessage): void {
		const { roomName, fileId, userName, userId, content, version } = message.data || {};
		const hostId = userId || message.userId;

		if (!roomName || !fileId || !hostId) {
			this._sendError(socket, 'Missing required fields: roomName, fileId, userId');
			return;
		}

		// Generate room ID if not provided
		const roomId = message.data?.roomId || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Create room
		const room: IRoom = {
			id: roomId,
			name: roomName,
			fileId,
			host: hostId,
			content: content || '',
			operations: [],
			version: version || 0,
			clients: new Map(),
			createdAt: Date.now()
		};

		this._rooms.set(roomId, room);
		this._clientRooms.set(socket, roomId);

		// Add client to room
		room.clients.set(hostId, {
			userId: hostId,
			userName: userName || 'Host',
			socket: socket,
			version: 0
		});

		console.log(`[Server] Room created: ${roomId} by ${hostId} with name "${roomName}"`);

		// Send sync to client
		this._sendSync(socket, room);

		// Notify other clients in room
		this._broadcastToRoom(roomId, {
			type: 'user-joined',
			data: { userId: hostId, userName: userName || 'Host' }
		}, hostId);
	}

	private _handleJoinRoom(socket: any, message: IServerMessage): void {
		const { roomId, userId, userName, fileId, roomName, host, content, version } = message.data || {};

		if (!roomId || !userId) {
			this._sendError(socket, 'Missing required fields');
			return;
		}

		// Check if room exists, if not create it with provided data
		let room = this._rooms.get(roomId);
		if (!room) {
			console.log(`[Server] Room not found in memory: ${roomId}. Creating room from join message...`);

			// Create room on-the-fly from join message data (sent by both host via sendRoomCreationData and guests)
			room = {
				id: roomId,
				name: roomName || `Room ${roomId}`,
				fileId: fileId || '',
				host: host || userId,
				content: content || '',
				operations: [],
				version: version || 0,
				clients: new Map(),
				createdAt: Date.now()
			};

			this._rooms.set(roomId, room);
			console.log(`[Server] Room created from join message: ${roomId} with initial content (${(content || '').length} chars)`);
		}

		// Add client to room
		room.clients.set(userId, {
			userId,
			userName,
			socket: socket,
			version: room.version
		});

		this._clientRooms.set(socket, roomId);

		console.log(`[Server] Client joined room: ${roomId}, user: ${userId}`);

		// Send full sync to joining client
		this._sendSync(socket, room);

		// Send room-joined confirmation
		this._send(socket, {
			type: 'room-joined',
			data: { roomId, userId, userName }
		});

		// Notify other clients in room
		this._broadcastToRoom(roomId, {
			type: 'user-joined',
			data: { userId, userName }
		}, userId);

		// Send all current users to new client
		const users = Array.from(room.clients.values()).map(client => ({
			userId: client.userId,
			userName: client.userName
		}));

		this._send(socket, {
			type: 'room-users',
			data: { users }
		});
	}

	private _handleOperation(socket: any, message: IServerMessage): void {
		const roomId = this._clientRooms.get(socket);
		if (!roomId) {
			return;
		}

		const room = this._rooms.get(roomId);
		if (!room) {
			return;
		}

		const operation = message.data as IOperation;
		if (!operation) {
			return;
		}

		// Update room version and content
		room.version++;
		(operation as any).version = room.version;

		// Apply operation to room content
		room.content = this._applyOperation(room.content, operation);

		// Store operation in history
		room.operations.push(operation);

		console.log(`[Server] Operation applied in room ${roomId}: ${operation.type} at ${operation.position}`);

		// Send ACK to sender
		this._send(socket, {
			type: 'ack',
			data: operation
		});

		// Broadcast operation to other clients
		this._broadcastToRoom(roomId, {
			type: 'operation',
			data: operation
		}, operation.userId);
	}

	private _handlePresence(socket: any, message: IServerMessage): void {
		const roomId = this._clientRooms.get(socket);
		if (!roomId) {
			return;
		}

		// Broadcast presence to other clients in room
		this._broadcastToRoom(roomId, {
			type: 'presence',
			data: message.data
		});
	}

	private _handleClientDisconnect(socket: any): void {
		const roomId = this._clientRooms.get(socket);
		if (!roomId) {
			return;
		}

		const room = this._rooms.get(roomId);
		if (!room) {
			return;
		}

		// Find and remove client
		let userId: string | null = null;
		for (const [id, client] of room.clients) {
			if (client.socket === socket) {
				userId = id;
				room.clients.delete(id);
				break;
			}
		}

		console.log(`[Server] Client disconnected from room ${roomId}, user: ${userId}`);

		if (userId) {
			// Notify other clients
			this._broadcastToRoom(roomId, {
				type: 'user-left',
				data: { userId }
			});
		}

		// Delete room if empty
		if (room.clients.size === 0) {
			this._rooms.delete(roomId);
			console.log(`[Server] Room deleted: ${roomId}`);
		}

		this._clientRooms.delete(socket);
	}

	private _applyOperation(text: string, operation: IOperation): string {
		if (operation.type === 'insert') {
			const content = operation.content || '';
			return text.slice(0, operation.position) + content + text.slice(operation.position);
		} else if (operation.type === 'delete') {
			const length = operation.length || 0;
			return text.slice(0, operation.position) + text.slice(operation.position + length);
		}
		return text;
	}

	private _sendSync(socket: any, room: IRoom): void {
		this._send(socket, {
			type: 'sync',
			data: {
				roomId: room.id,
				content: room.content,
				version: room.version
			}
		});
	}

	private _send(socket: any, message: any): void {
		if (socket.readyState === 1) { // WebSocket.OPEN = 1
			socket.send(JSON.stringify(message));
		}
	}

	private _sendError(socket: any, error: string): void {
		this._send(socket, { type: 'error', data: { message: error } });
	}

	private _broadcastToRoom(roomId: string, message: any, excludeUserId?: string): void {
		const room = this._rooms.get(roomId);
		if (!room) {
			return;
		}

		for (const [userId, client] of room.clients) {
			if (excludeUserId && userId === excludeUserId) {
				continue;
			}

			this._send(client.socket, message);
		}
	}

	public start(): void {
		console.log(`[Server] Collaboration server started on port ${this._port}`);
	}

	public stop(): void {
		this._wss.close();
		console.log(`[Server] Collaboration server stopped`);
	}
}

// Start server if run directly
if (require.main === module) {
	const port = parseInt(process.env.COLLAB_PORT || '3001', 10);
	const server = new CollaborationServer(port);
	server.start();

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n[Server] Shutting down...');
		server.stop();
		process.exit(0);
	});
}

export { CollaborationServer, IRoom, IClient };
