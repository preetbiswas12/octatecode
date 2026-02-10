/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-nocheck

import { Emitter, Event } from '../../../../base/common/event.js';
import {
	IRoomManager,
	RoomMetadata,
	RoomState,
	RoomStats,
	PeerInfo,
	SignalingMessage,
	ServerStats,
	RemoteOperation
} from '../common/p2pTypes.js';

interface RoomData {
	metadata: RoomMetadata;
	peers: Map<string, PeerInfo>;
	operationCount: number;
	bandwidthUsage: { sent: number; received: number };
	cleanupTimer?: NodeJS.Timeout;
}

/**
 * RoomManager handles room lifecycle and peer management for P2P collaboration
 * Features:
 * - Room creation/joining/leaving
 * - Active/Idle state management
 * - TTL-based auto-cleanup (3 hours inactive)
 * - Activity timeout (5 minutes)
 * - Memory and operation tracking
 */
export class RoomManager implements IRoomManager {
	private rooms: Map<string, RoomData> = new Map();
	private cleanupInterval: NodeJS.Timeout | null = null;
	private serverStartTime = Date.now();

	// Events for state changes
	private readonly _onRoomCreated = new Emitter<RoomMetadata>();
	public readonly onRoomCreated: Event<RoomMetadata> = this._onRoomCreated.event;

	private readonly _onRoomClosed = new Emitter<string>();
	public readonly onRoomClosed: Event<string> = this._onRoomClosed.event;

	private readonly _onPeerJoined = new Emitter<{ roomId: string; peer: PeerInfo }>();
	public readonly onPeerJoined: Event<{ roomId: string; peer: PeerInfo }> = this._onPeerJoined.event;

	private readonly _onPeerLeft = new Emitter<{ roomId: string; userId: string }>();
	public readonly onPeerLeft: Event<{ roomId: string; userId: string }> = this._onPeerLeft.event;

	// Configuration constants
	private readonly ROOM_INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours
	private readonly PEER_HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
	private readonly CLEANUP_CHECK_INTERVAL = 60 * 1000; // 1 minute

	constructor() {
		this.startCleanupInterval();
	}

	/**
	 * Create a new room
	 */
	public createRoom(
		roomId: string,
		roomName: string,
		hostId: string,
		hostName: string,
		fileId?: string,
		content?: string,
		version?: number
	): RoomMetadata {
		// Check if room already exists
		if (this.rooms.has(roomId)) {
			const existing = this.rooms.get(roomId)!;
			console.log(`[RoomManager] Room ${roomId} already exists, returning existing metadata`);
			return existing.metadata;
		}

		const now = Date.now();
		const metadata: RoomMetadata = {
			roomId,
			roomName,
			hostId,
			hostName,
			createdAt: now,
			lastActivity: now,
			state: RoomState.ACTIVE,
			peerCount: 1,
			fileId,
			content,
			version
		};

		const roomData: RoomData = {
			metadata,
			peers: new Map([
				[
					hostId,
					{
						userId: hostId,
						userName: hostName,
						isHost: true,
						connectedAt: now,
						lastHeartbeat: now
					}
				]
			]),
			operationCount: 0,
			bandwidthUsage: { sent: 0, received: 0 }
		};

		this.rooms.set(roomId, roomData);

		console.log(`[RoomManager] Room created: ${roomId} by ${hostId}`);
		this._onRoomCreated.fire(metadata);

		return metadata;
	}

	/**
	 * Join an existing room
	 */
	public joinRoom(roomId: string, userId: string, userName: string): RoomMetadata | null {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			console.warn(`[RoomManager] Room not found: ${roomId}`);
			return null;
		}

		// Check if user already in room
		if (roomData.peers.has(userId)) {
			console.log(`[RoomManager] User ${userId} already in room ${roomId}`);
			return roomData.metadata;
		}

		const now = Date.now();
		const peerInfo: PeerInfo = {
			userId,
			userName,
			isHost: false,
			connectedAt: now,
			lastHeartbeat: now
		};

		roomData.peers.set(userId, peerInfo);
		roomData.metadata.peerCount = roomData.peers.size;
		roomData.metadata.lastActivity = now;

		// Activate server (if it was idle)
		roomData.metadata.state = RoomState.ACTIVE;

		console.log(`[RoomManager] User ${userId} joined room ${roomId} (${roomData.metadata.peerCount} peers)`);
		this._onPeerJoined.fire({ roomId, peer: peerInfo });

		// Schedule idle check (5 seconds after join completes)
		this.scheduleIdleCheck(roomId);

		return roomData.metadata;
	}

	/**
	 * Leave a room
	 */
	public leaveRoom(roomId: string, userId: string): void {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			return;
		}

		roomData.peers.delete(userId);
		roomData.metadata.peerCount = roomData.peers.size;
		roomData.metadata.lastActivity = Date.now();

		console.log(`[RoomManager] User ${userId} left room ${roomId} (${roomData.metadata.peerCount} peers remaining)`);
		this._onPeerLeft.fire({ roomId, userId });

		// If room is now empty, mark as idle
		if (roomData.peers.size === 0) {
			roomData.metadata.state = RoomState.IDLE;
			console.log(`[RoomManager] Room ${roomId} is now IDLE (no peers)`);
		}
	}

	/**
	 * Get room metadata
	 */
	public getRoomMetadata(roomId: string): RoomMetadata | null {
		const roomData = this.rooms.get(roomId);
		return roomData?.metadata ?? null;
	}

	/**
	 * Get all active rooms
	 */
	public getAllRooms(): RoomMetadata[] {
		return Array.from(this.rooms.values()).map(rd => rd.metadata);
	}

	/**
	 * Broadcast message to all peers in a room
	 */
	public broadcastToRoom(
		roomId: string,
		message: SignalingMessage,
		exceptUserId?: string
	): void {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			console.warn(`[RoomManager] Cannot broadcast to non-existent room: ${roomId}`);
			return;
		}

		// Track bandwidth (simplified)
		const messageSize = JSON.stringify(message).length;
		roomData.bandwidthUsage.sent += messageSize;

		console.log(
			`[RoomManager] Broadcasting to room ${roomId} (${roomData.peers.size} peers, except ${exceptUserId ?? 'none'})`
		);

		// In real implementation, this would be done by signaling server
		// For now, just log the broadcast intent
		for (const [peerId, peer] of roomData.peers) {
			if (peerId !== exceptUserId) {
				console.log(`[RoomManager] Message to ${peerId}: ${message.type}`);
			}
		}
	}

	/**
	 * Get list of peers in a room
	 */
	public getPeerList(roomId: string): PeerInfo[] {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			return [];
		}
		return Array.from(roomData.peers.values());
	}

	/**
	 * Update peer heartbeat (keep-alive)
	 */
	public updatePeerHeartbeat(roomId: string, userId: string): boolean {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			return false;
		}

		const peer = roomData.peers.get(userId);
		if (!peer) {
			return false;
		}

		peer.lastHeartbeat = Date.now();
		roomData.metadata.lastActivity = Date.now();

		return true;
	}

	/**
	 * Record operation (for stats)
	 */
	public recordOperation(roomId: string, operation: RemoteOperation): void {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			return;
		}

		roomData.operationCount++;
		roomData.metadata.lastActivity = Date.now();
		roomData.bandwidthUsage.received += JSON.stringify(operation).length;
	}

	/**
	 * Get server stats
	 */
	public getStats(): ServerStats {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		return {
			uptime: Date.now() - this.serverStartTime,
			activeRooms: Array.from(this.rooms.values()).filter(r => r.metadata.state === RoomState.ACTIVE).length,
			totalConnections: Array.from(this.rooms.values()).reduce((sum, r) => sum + r.metadata.peerCount, 0),
			memoryUsage: {
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				external: memUsage.external
			},
			cpuUsage: {
				user: cpuUsage.user,
				system: cpuUsage.system
			},
			timestamp: Date.now()
		};
	}

	/**
	 * Get stats for a specific room
	 */
	public getRoomStats(roomId: string): RoomStats | null {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			return null;
		}

		return {
			roomId,
			peerCount: roomData.metadata.peerCount,
			operationCount: roomData.operationCount,
			createdAt: roomData.metadata.createdAt,
			lastActivity: roomData.metadata.lastActivity,
			state: roomData.metadata.state,
			bandwidth: { ...roomData.bandwidthUsage }
		};
	}

	/**
	 * Schedule an idle check for a room (5 seconds after join)
	 */
	private scheduleIdleCheck(roomId: string): void {
		const roomData = this.rooms.get(roomId);
		if (!roomData) {
			return;
		}

		// Clear existing timer if any
		if (roomData.cleanupTimer) {
			clearTimeout(roomData.cleanupTimer);
		}

		// Set new timer: 5 seconds after join, transition to idle if all peers done
		roomData.cleanupTimer = setTimeout(() => {
			const room = this.rooms.get(roomId);
			if (room && room.metadata.state === RoomState.ACTIVE && room.metadata.peerCount === 1) {
				// Only host left, transition to idle
				room.metadata.state = RoomState.IDLE;
				console.log(`[RoomManager] Room ${roomId} transitioned to IDLE (single peer)`);
			}
		}, 5000);
	}

	/**
	 * Start periodic cleanup of expired rooms
	 */
	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, this.CLEANUP_CHECK_INTERVAL);

		console.log(`[RoomManager] Cleanup interval started (every ${this.CLEANUP_CHECK_INTERVAL}ms)`);
	}

	/**
	 * Cleanup expired rooms and idle rooms
	 */
	public cleanup(): void {
		const now = Date.now();
		const toDelete: string[] = [];

		for (const [roomId, roomData] of this.rooms) {
			// Check if room is inactive for too long
			if (now - roomData.metadata.lastActivity > this.ROOM_INACTIVITY_TIMEOUT) {
				console.log(`[RoomManager] Removing expired room: ${roomId} (inactive for 3+ hours)`);
				toDelete.push(roomId);
				continue;
			}

			// Check for peers with stale heartbeats
			const deadPeers: string[] = [];
			for (const [peerId, peer] of roomData.peers) {
				if (now - peer.lastHeartbeat > this.PEER_HEARTBEAT_TIMEOUT && !peer.isHost) {
					console.log(`[RoomManager] Removing dead peer ${peerId} from room ${roomId}`);
					deadPeers.push(peerId);
				}
			}

			// Remove dead peers
			for (const peerId of deadPeers) {
				roomData.peers.delete(peerId);
				roomData.metadata.peerCount = roomData.peers.size;
			}

			// If room is now empty, mark as closed
			if (roomData.peers.size === 0) {
				console.log(`[RoomManager] Removing empty room: ${roomId}`);
				toDelete.push(roomId);
			}
		}

		// Delete marked rooms
		for (const roomId of toDelete) {
			const roomData = this.rooms.get(roomId);
			if (roomData?.cleanupTimer) {
				clearTimeout(roomData.cleanupTimer);
			}
			this.rooms.delete(roomId);
			this._onRoomClosed.fire(roomId);
		}

		if (toDelete.length > 0) {
			console.log(`[RoomManager] Cleanup complete: removed ${toDelete.length} rooms`);
		}
	}

	/**
	 * Shutdown: cleanup resources
	 */
	public shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		for (const [, roomData] of this.rooms) {
			if (roomData.cleanupTimer) {
				clearTimeout(roomData.cleanupTimer);
			}
		}

		this.rooms.clear();
		console.log(`[RoomManager] Shutdown complete`);
	}
}

// Export singleton instance
export const roomManager = new RoomManager();
