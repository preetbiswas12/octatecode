/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-nocheck

import type { Express } from 'express';
import { roomManager } from './roomManager.js';
import { memoryManager } from './memoryManager.js';

/**
 * Setup P2P server routes for monitoring, health checks, and debugging
 */
export function setupP2PRoutes(app: Express): void {
	/**
	 * Health check endpoint (for Render)
	 * Used by platform to verify server is alive
	 */
	app.get('/health', (req, res) => {
		const memStats = memoryManager.getMemoryStats();

		res.json({
			status: 'ok',
			timestamp: Date.now(),
			uptime: process.uptime(),
			memory: {
				heapUsedMB: (memStats.heapUsed / 1024 / 1024).toFixed(2),
				heapTotalMB: (memStats.heapTotal / 1024 / 1024).toFixed(2),
				heapPercent: memStats.heapPercent.toFixed(1)
			}
		});
	});

	/**
	 * Server stats endpoint
	 * Returns comprehensive server and room statistics
	 */
	app.get('/stats', (req, res) => {
		const serverStats = roomManager.getStats();
		const memStats = memoryManager.getMemoryStats();

		res.json({
			server: {
				uptime: serverStats.uptime,
				activeRooms: serverStats.activeRooms,
				totalConnections: serverStats.totalConnections,
				timestamp: serverStats.timestamp
			},
			memory: {
				heapUsedMB: (memStats.heapUsed / 1024 / 1024).toFixed(2),
				heapTotalMB: (memStats.heapTotal / 1024 / 1024).toFixed(2),
				heapPercent: memStats.heapPercent.toFixed(1),
				externalMB: (memStats.external / 1024 / 1024).toFixed(2)
			},
			cpu: {
				user: (serverStats.cpuUsage.user / 1000).toFixed(2),
				system: (serverStats.cpuUsage.system / 1000).toFixed(2)
			},
			thresholds: memoryManager.getThresholds()
		});
	});

	/**
	 * List all rooms endpoint
	 * Returns metadata for all active rooms
	 */
	app.get('/rooms', (req, res) => {
		const rooms = roomManager.getAllRooms();

		res.json({
			count: rooms.length,
			rooms: rooms.map(room => ({
				roomId: room.roomId,
				roomName: room.roomName,
				hostId: room.hostId,
				peerCount: room.peerCount,
				state: room.state,
				createdAt: room.createdAt,
				lastActivity: room.lastActivity,
				inactiveDuration: Date.now() - room.lastActivity
			}))
		});
	});

	/**
	 * Get specific room details
	 */
	app.get('/rooms/:roomId', (req, res) => {
		const { roomId } = req.params;
		const metadata = roomManager.getRoomMetadata(roomId);

		if (!metadata) {
			return res.status(404).json({ error: 'Room not found' });
		}

		const stats = roomManager.getRoomStats(roomId);
		const peers = roomManager.getPeerList(roomId);

		res.json({
			metadata,
			stats,
			peers: peers.map(p => ({
				userId: p.userId,
				userName: p.userName,
				isHost: p.isHost,
				connectedAt: p.connectedAt,
				lastHeartbeat: p.lastHeartbeat
			}))
		});
	});

	/**
	 * Get room stats only
	 */
	app.get('/rooms/:roomId/stats', (req, res) => {
		const { roomId } = req.params;
		const stats = roomManager.getRoomStats(roomId);

		if (!stats) {
			return res.status(404).json({ error: 'Room not found' });
		}

		res.json({
			...stats,
			inactiveDuration: Date.now() - stats.lastActivity
		});
	});

	/**
	 * Get room peers
	 */
	app.get('/rooms/:roomId/peers', (req, res) => {
		const { roomId } = req.params;
		const metadata = roomManager.getRoomMetadata(roomId);

		if (!metadata) {
			return res.status(404).json({ error: 'Room not found' });
		}

		const peers = roomManager.getPeerList(roomId);

		res.json({
			roomId,
			peerCount: peers.length,
			peers: peers.map(p => ({
				userId: p.userId,
				userName: p.userName,
				isHost: p.isHost,
				connectedAt: p.connectedAt,
				lastHeartbeat: p.lastHeartbeat
			}))
		});
	});

	/**
	 * Cleanup endpoint (for manual maintenance)
	 * Triggers immediate cleanup of expired rooms
	 */
	app.post('/maintenance/cleanup', (req, res) => {
		console.log('[API] Manual cleanup triggered');
		roomManager.cleanup();

		const stats = roomManager.getStats();
		res.json({
			message: 'Cleanup completed',
			stats: {
				activeRooms: stats.activeRooms,
				totalConnections: stats.totalConnections
			}
		});
	});

	/**
	 * Force garbage collection endpoint (for testing)
	 * Only available if Node.js was started with --expose-gc
	 */
	app.post('/maintenance/gc', (req, res) => {
		if (!global.gc) {
			return res.status(503).json({
				error: 'Garbage collection not exposed. Start with --expose-gc flag.'
			});
		}

		console.log('[API] Manual garbage collection triggered');
		const before = process.memoryUsage().heapUsed / 1024 / 1024;
		global.gc();
		const after = process.memoryUsage().heapUsed / 1024 / 1024;

		res.json({
			message: 'Garbage collection completed',
			heapBefore: before.toFixed(2),
			heapAfter: after.toFixed(2),
			freed: (before - after).toFixed(2)
		});
	});

	/**
	 * Info endpoint
	 * Returns server information
	 */
	app.get('/info', (req, res) => {
		res.json({
			name: 'OctateCode P2P Signaling Server',
			version: '1.0.0',
			description: 'WebRTC signaling server for peer-to-peer code collaboration',
			features: ['WebRTC Signaling', 'Room Management', 'Peer Discovery', 'Active/Idle States'],
			endpoints: {
				health: 'GET /health',
				stats: 'GET /stats',
				rooms: 'GET /rooms',
				roomDetail: 'GET /rooms/:roomId',
				roomStats: 'GET /rooms/:roomId/stats',
				roomPeers: 'GET /rooms/:roomId/peers',
				cleanup: 'POST /maintenance/cleanup',
				gc: 'POST /maintenance/gc',
				info: 'GET /info'
			}
		});
	});

	console.log('[P2P Routes] Setup complete');
}
