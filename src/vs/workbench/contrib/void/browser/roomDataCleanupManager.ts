/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Room Data Cleanup Manager
 * Automatically cleans up and deletes all room data when a room is closed
 */

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';

export interface RoomDataRegistry {
	roomId: string;
	cursorData: Map<string, any>; // userId -> cursor position
	fileData: Map<string, any>; // fileUri -> file content/metadata
	chatData: SharedChatMessage[]; // chat messages
	peerData: Map<string, any>; // userId -> peer info
	editHistory: CollaborativeEdit[]; // all edits in chronological order
	syncTimestamps: Map<string, number>; // fileUri -> last sync time
	createdAt: number;
	closedAt?: number;
}

export interface SharedChatMessage {
	id: string;
	userId: string;
	userName: string;
	content: string;
	timestamp: number;
	edited?: boolean;
	editedAt?: number;
}

export interface CollaborativeEdit {
	id: string;
	userId: string;
	fileUri: string;
	content: string;
	startLine: number;
	endLine: number;
	timestamp: number;
	operationId: string;
	version: number;
}

export class RoomDataCleanupManager extends Disposable {
	private roomDataRegistry: Map<string, RoomDataRegistry> = new Map();
	private roomDeletedEmitter = new Emitter<{ roomId: string; dataSize: number }>();
	private cleanupScheduler: Map<string, NodeJS.Timeout> = new Map();

	onRoomDataDeleted = this.roomDeletedEmitter.event;

	/**
	 * Register a new room for data tracking
	 */
	registerRoom(roomId: string): RoomDataRegistry {
		if (this.roomDataRegistry.has(roomId)) {
			console.warn(`[RoomDataCleanupManager] Room ${roomId} already registered`);
			return this.roomDataRegistry.get(roomId)!;
		}

		const roomData: RoomDataRegistry = {
			roomId,
			cursorData: new Map(),
			fileData: new Map(),
			chatData: [],
			peerData: new Map(),
			editHistory: [],
			syncTimestamps: new Map(),
			createdAt: Date.now(),
		};

		this.roomDataRegistry.set(roomId, roomData);
		console.log(`[RoomDataCleanupManager] Registered room: ${roomId}`);

		return roomData;
	}

	/**
	 * Add cursor data to a room
	 */
	addCursorData(roomId: string, userId: string, cursorPosition: any): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.cursorData.set(userId, cursorPosition);
		}
	}

	/**
	 * Add file data to a room
	 */
	addFileData(roomId: string, fileUri: string, fileContent: any): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.fileData.set(fileUri, fileContent);
			roomData.syncTimestamps.set(fileUri, Date.now());
		}
	}

	/**
	 * Add chat message to a room
	 */
	addChatMessage(roomId: string, message: SharedChatMessage): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.chatData.push(message);
		}
	}

	/**
	 * Add peer info to a room
	 */
	addPeerData(roomId: string, userId: string, peerInfo: any): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.peerData.set(userId, peerInfo);
		}
	}

	/**
	 * Add edit to room history
	 */
	addEdit(roomId: string, edit: CollaborativeEdit): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.editHistory.push(edit);
		}
	}

	/**
	 * Remove cursor data for a peer (e.g., when peer leaves)
	 */
	removeCursorData(roomId: string, userId: string): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.cursorData.delete(userId);
		}
	}

	/**
	 * Remove peer data (e.g., when peer disconnects)
	 */
	removePeerData(roomId: string, userId: string): void {
		const roomData = this.getRoomData(roomId);
		if (roomData) {
			roomData.peerData.delete(userId);
			roomData.cursorData.delete(userId);
		}
	}

	/**
	 * Get room data registry
	 */
	getRoomData(roomId: string): RoomDataRegistry | null {
		return this.roomDataRegistry.get(roomId) || null;
	}

	/**
	 * Get all room data
	 */
	getAllRoomData(): RoomDataRegistry[] {
		return Array.from(this.roomDataRegistry.values());
	}

	/**
	 * Get data size for a room (in bytes)
	 */
	getRoomDataSize(roomId: string): number {
		const roomData = this.getRoomData(roomId);
		if (!roomData) return 0;

		let size = 0;

		// Estimate cursor data size
		for (const [_, cursor] of roomData.cursorData) {
			size += JSON.stringify(cursor).length;
		}

		// Estimate file data size
		for (const [_, fileData] of roomData.fileData) {
			size += JSON.stringify(fileData).length;
		}

		// Estimate chat data size
		for (const msg of roomData.chatData) {
			size += JSON.stringify(msg).length;
		}

		// Estimate peer data size
		for (const [_, peerInfo] of roomData.peerData) {
			size += JSON.stringify(peerInfo).length;
		}

		// Estimate edit history size
		for (const edit of roomData.editHistory) {
			size += JSON.stringify(edit).length;
		}

		return size;
	}

	/**
	 * Close room and schedule data deletion
	 * @param roomId - Room ID to close
	 * @param delayMs - Delay before deleting data (default 5000ms, for graceful shutdown)
	 */
	closeRoom(roomId: string, delayMs: number = 5000): void {
		const roomData = this.getRoomData(roomId);
		if (!roomData) {
			console.warn(`[RoomDataCleanupManager] Room not found: ${roomId}`);
			return;
		}

		roomData.closedAt = Date.now();
		console.log(`[RoomDataCleanupManager] Room closed: ${roomId}, scheduling cleanup in ${delayMs}ms`);

		// Cancel any existing cleanup timer for this room
		const existingTimer = this.cleanupScheduler.get(roomId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Schedule data deletion
		const timer = setTimeout(() => {
			this.deleteRoomData(roomId);
		}, delayMs);

		this.cleanupScheduler.set(roomId, timer);
	}

	/**
	 * Immediately delete all data for a room
	 */
	deleteRoomData(roomId: string): void {
		const roomData = this.getRoomData(roomId);
		if (!roomData) {
			console.warn(`[RoomDataCleanupManager] Room not found: ${roomId}`);
			return;
		}

		const dataSize = this.getRoomDataSize(roomId);

		// Clear all data structures
		roomData.cursorData.clear();
		roomData.fileData.clear();
		roomData.chatData = [];
		roomData.peerData.clear();
		roomData.editHistory = [];
		roomData.syncTimestamps.clear();

		// Remove from registry
		this.roomDataRegistry.delete(roomId);

		// Clear any pending cleanup timer
		const timer = this.cleanupScheduler.get(roomId);
		if (timer) {
			clearTimeout(timer);
			this.cleanupScheduler.delete(roomId);
		}

		console.log(
			`[RoomDataCleanupManager] Room data deleted: ${roomId} (${(dataSize / 1024).toFixed(2)}KB freed)`
		);

		// Emit cleanup event
		this.roomDeletedEmitter.fire({ roomId, dataSize });
	}

	/**
	 * Force cleanup of all rooms (usually called on shutdown)
	 */
	cleanupAllRooms(): void {
		const roomIds = Array.from(this.roomDataRegistry.keys());
		console.log(`[RoomDataCleanupManager] Cleaning up ${roomIds.length} rooms`);

		for (const roomId of roomIds) {
			this.deleteRoomData(roomId);
		}
	}

	/**
	 * Audit room data usage
	 */
	auditRoomUsage(): {
		totalRooms: number;
		totalDataSize: number;
		rooms: Array<{ roomId: string; dataSize: number; peerCount: number; messageCount: number }>;
	} {
		let totalDataSize = 0;
		const rooms = [];

		for (const [roomId, roomData] of this.roomDataRegistry) {
			const dataSize = this.getRoomDataSize(roomId);
			totalDataSize += dataSize;

			rooms.push({
				roomId,
				dataSize,
				peerCount: roomData.peerData.size,
				messageCount: roomData.chatData.length,
			});
		}

		return {
			totalRooms: this.roomDataRegistry.size,
			totalDataSize,
			rooms: rooms.sort((a, b) => b.dataSize - a.dataSize), // Sort by size descending
		};
	}

	/**
	 * Get memory usage report
	 */
	getMemoryReport(): string {
		const audit = this.auditRoomUsage();
		const totalMb = (audit.totalDataSize / 1024 / 1024).toFixed(2);

		let report = 'ROOM DATA MEMORY AUDIT\n';
		report += '=====================\n\n';
		report += `Total Rooms: ${audit.totalRooms}\n`;
		report += `Total Memory: ${totalMb}MB\n\n`;

		if (audit.rooms.length === 0) {
			report += 'No active rooms\n';
			return report;
		}

		report += 'Room Details:\n';
		for (const room of audit.rooms) {
			const mb = (room.dataSize / 1024 / 1024).toFixed(2);
			report += `  ${room.roomId}: ${mb}MB (${room.peerCount} peers, ${room.messageCount} messages)\n`;
		}

		return report;
	}

	/**
	 * Cancel cleanup for a room (if re-opening)
	 */
	cancelCleanup(roomId: string): void {
		const timer = this.cleanupScheduler.get(roomId);
		if (timer) {
			clearTimeout(timer);
			this.cleanupScheduler.delete(roomId);
			console.log(`[RoomDataCleanupManager] Cleanup cancelled for room: ${roomId}`);
		}
	}

	/**
	 * Get cleanup status for a room
	 */
	getCleanupStatus(roomId: string): {
		isRegistered: boolean;
		isClosed: boolean;
		pendingCleanup: boolean;
		dataSize: number;
	} {
		const roomData = this.getRoomData(roomId);
		const hasPendingCleanup = this.cleanupScheduler.has(roomId);

		return {
			isRegistered: roomData !== null,
			isClosed: roomData?.closedAt !== undefined,
			pendingCleanup: hasPendingCleanup,
			dataSize: this.getRoomDataSize(roomId),
		};
	}

	override dispose(): void {
		// Cleanup all pending timers
		for (const timer of this.cleanupScheduler.values()) {
			clearTimeout(timer);
		}
		this.cleanupScheduler.clear();

		// Clear all room data
		this.cleanupAllRooms();

		this.roomDeletedEmitter.dispose();
		super.dispose();
	}
}

// Singleton instance
let instance: RoomDataCleanupManager | null = null;

export function getRoomDataCleanupManager(): RoomDataCleanupManager {
	if (!instance) {
		instance = new RoomDataCleanupManager();
	}
	return instance;
}
