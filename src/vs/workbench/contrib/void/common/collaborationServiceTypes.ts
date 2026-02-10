/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Collaboration Service Types
 * Shared types for P2P collaboration across browser and main process
 */

export enum CollaborationStatus {
	IDLE = 'idle',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	DISCONNECTED = 'disconnected',
	ERROR = 'error',
}

export interface RoomInfo {
	roomId: string;
	roomName: string;
	hostId: string;
	hostName: string;
	peerCount: number;
	createdAt: number;
	peers: PeerPresence[];
}

export interface PeerPresence {
	userId: string;
	userName: string;
	isHost: boolean;
	connectedAt: number;
	color: string; // for cursor rendering
	isOnline: boolean;
	lastHeartbeat: number;
}

export interface CollaborativeEdit {
	fileUri: string;
	startLine: number;
	startCharacter: number;
	endLine: number;
	endCharacter: number;
	newText: string;
	userId: string;
	timestamp: number;
	operationId: string; // for OT tracking
}

export interface CursorUpdate {
	userId: string;
	fileUri: string;
	line: number;
	character: number;
	selectionStart?: { line: number; character: number };
	selectionEnd?: { line: number; character: number };
	timestamp: number;
}

export interface SharedChatMessage {
	id: string;
	userId: string;
	userName: string;
	content: string;
	timestamp: number;
	role: 'user' | 'assistant';
}

export interface FileSnapshot {
	fileUri: string;
	version: number;
	content: string;
	timestamp: number;
	userId: string;
}

export interface SyncMessage {
	type: 'edit' | 'cursor' | 'file-sync' | 'chat' | 'presence' | 'heartbeat';
	data: CollaborativeEdit | CursorUpdate | SharedChatMessage | FileSnapshot | PeerPresence;
	timestamp: number;
}

export interface ICollaborationService {
	readonly _serviceBrand: undefined;

	// Room management
	createRoom(roomName: string, userName: string): Promise<RoomInfo>;
	joinRoom(roomId: string, userName: string): Promise<RoomInfo>;
	leaveRoom(): Promise<void>;

	// State
	getCurrentRoom(): RoomInfo | null;
	getStatus(): CollaborationStatus;
	getPeers(): PeerPresence[];

	// Events
	onRoomChanged: (callback: (room: RoomInfo | null) => void) => () => void;
	onStatusChanged: (callback: (status: CollaborationStatus) => void) => () => void;
	onPeerPresence: (callback: (peer: PeerPresence) => void) => () => void;
	onEditReceived: (callback: (edit: CollaborativeEdit) => void) => () => void;
	onCursorUpdate: (callback: (cursor: CursorUpdate) => void) => () => void;
	onChatMessage: (callback: (message: SharedChatMessage) => void) => () => void;

	// Broadcast operations
	broadcastEdit(edit: CollaborativeEdit): Promise<void>;
	broadcastCursor(cursor: CursorUpdate): Promise<void>;
	broadcastChat(message: SharedChatMessage): Promise<void>;
	broadcastFileSync(snapshot: FileSnapshot): Promise<void>;
	broadcastPresence(presence: PeerPresence): Promise<void>;

	// File sync
	requestFileSynchronization(fileUri: string): Promise<FileSnapshot>;
}

export const ICollaborationService = (function () {
	return {
		toString: () => 'ICollaborationService',
	};
})();
