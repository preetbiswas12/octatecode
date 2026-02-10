/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * P2P Architecture Types
 * Shared types for P2P signaling and room management
 */

export enum RoomState {
	CREATING = 'creating',
	ACTIVE = 'active',
	IDLE = 'idle',
	CLOSING = 'closing',
	CLOSED = 'closed'
}

export interface RoomMetadata {
	roomId: string;
	roomName: string;
	hostId: string;
	hostName: string;
	createdAt: number;
	lastActivity: number;
	state: RoomState;
	peerCount: number;
	fileId?: string;
	content?: string;
	version?: number;
}

export interface PeerInfo {
	userId: string;
	userName: string;
	isHost: boolean;
	connectedAt: number;
	lastHeartbeat: number;
	rtcEndpoint?: string;
}

export interface SignalingMessage {
	type: SignalingMessageType;
	roomId: string;
	userId: string;
	userName?: string;
	data?: any;
	timestamp?: number;
}

export enum SignalingMessageType {
	// Room lifecycle
	CREATE_ROOM = 'create-room',
	ROOM_CREATED = 'room-created',
	JOIN_ROOM = 'join-room',
	ROOM_JOINED = 'room-joined',
	LEAVE_ROOM = 'leave-room',
	ROOM_CLOSED = 'room-closed',

	// Peer introduction (for P2P mesh)
	INTRODUCE_PEERS = 'introduce-peers',
	PEER_INFO = 'peer-info',

	// WebRTC signaling
	SDP_OFFER = 'sdp-offer',
	SDP_ANSWER = 'sdp-answer',
	ICE_CANDIDATE = 'ice-candidate',

	// Operation sync
	OPERATION = 'operation',
	CURSOR_UPDATE = 'cursor-update',
	PRESENCE = 'presence',

	// Connection management
	HEARTBEAT = 'heartbeat',
	HEARTBEAT_ACK = 'heartbeat-ack',
	ERROR = 'error',
	AUTH = 'auth',
	AUTH_SUCCESS = 'auth-success'
}

export interface WebRTCOffer {
	type: 'offer';
	sdp: string;
}

export interface WebRTCAnswer {
	type: 'answer';
	sdp: string;
}

export interface ICECandidate {
	candidate: string;
	sdpMLineIndex?: number;
	sdpMid?: string;
}

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

// Server stats for monitoring
export interface ServerStats {
	uptime: number;
	activeRooms: number;
	totalConnections: number;
	memoryUsage: {
		heapUsed: number;
		heapTotal: number;
		external: number;
	};
	cpuUsage: {
		user: number;
		system: number;
	};
	timestamp: number;
}

export interface RoomStats {
	roomId: string;
	peerCount: number;
	operationCount: number;
	createdAt: number;
	lastActivity: number;
	state: RoomState;
	bandwidth?: {
		sent: number;
		received: number;
	};
}

// Interface for room manager
export interface IRoomManager {
	createRoom(
		roomId: string,
		roomName: string,
		hostId: string,
		hostName: string,
		fileId?: string,
		content?: string,
		version?: number
	): RoomMetadata;

	joinRoom(
		roomId: string,
		userId: string,
		userName: string
	): RoomMetadata | null;

	leaveRoom(roomId: string, userId: string): void;

	getRoomMetadata(roomId: string): RoomMetadata | null;

	getAllRooms(): RoomMetadata[];

	broadcastToRoom(
		roomId: string,
		message: SignalingMessage,
		exceptUserId?: string
	): void;

	getPeerList(roomId: string): PeerInfo[];

	getStats(): ServerStats;

	getRoomStats(roomId: string): RoomStats | null;

	cleanup(): void;
}

// Interface for signaling server
export interface ISignalingServer {
	start(port: number): Promise<void>;
	stop(): Promise<void>;
	handleSDPOffer(roomId: string, userId: string, offer: WebRTCOffer): void;
	handleICECandidate(roomId: string, userId: string, candidate: ICECandidate): void;
	broadcastOperation(roomId: string, operation: RemoteOperation): void;
}
