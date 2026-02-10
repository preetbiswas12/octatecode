/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { roomManager } from './roomManager.js';

/**
 * MemoryManager handles resource cleanup and monitoring
 * Features:
 * - Periodic memory usage monitoring
 * - Room TTL enforcement
 * - Activity-based cleanup
 * - Graceful resource degradation
 */
export class MemoryManager {
	private monitorInterval: NodeJS.Timeout | null = null;
	private lastMemoryWarning: number = 0;

	// Configuration
	private readonly MONITOR_INTERVAL = 30 * 1000; // Check memory every 30 seconds
	private readonly MEMORY_WARNING_THRESHOLD = 200 * 1024 * 1024; // 200 MB
	private readonly MEMORY_CRITICAL_THRESHOLD = 300 * 1024 * 1024; // 300 MB
	private readonly WARNING_COOLDOWN = 60 * 1000; // 1 minute between warnings

	constructor() { }

	/**
	 * Start monitoring
	 */
	public start(): void {
		this.monitorInterval = setInterval(() => {
			this.monitor();
		}, this.MONITOR_INTERVAL);

		console.log(`[MemoryManager] Started (every ${this.MONITOR_INTERVAL}ms)`);
	}

	/**
	 * Monitor memory usage and cleanup if necessary
	 */
	private monitor(): void {
		const memUsage = process.memoryUsage();
		const heapUsed = memUsage.heapUsed;
		const heapTotal = memUsage.heapTotal;
		const heapPercent = (heapUsed / heapTotal) * 100;

		// Log memory stats periodically
		if (heapPercent > 50) {
			console.log(
				`[MemoryManager] Heap usage: ${(heapUsed / 1024 / 1024).toFixed(2)}MB / ${(heapTotal / 1024 / 1024).toFixed(2)}MB (${heapPercent.toFixed(1)}%)`
			);
		}

		// Warning threshold
		if (heapUsed > this.MEMORY_WARNING_THRESHOLD) {
			const now = Date.now();
			if (now - this.lastMemoryWarning > this.WARNING_COOLDOWN) {
				console.warn(
					`[MemoryManager] WARNING: High memory usage: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`
				);
				this.lastMemoryWarning = now;

				// Trigger cleanup
				this.cleanup();
			}
		}

		// Critical threshold
		if (heapUsed > this.MEMORY_CRITICAL_THRESHOLD) {
			console.error(
				`[MemoryManager] CRITICAL: Memory usage critically high: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`
			);

			// Force aggressive cleanup
			this.aggressiveCleanup();

			// Force garbage collection if available
			if (global.gc) {
				console.log(`[MemoryManager] Forcing garbage collection...`);
				global.gc();
			}
		}
	}

	/**
	 * Normal cleanup: remove idle/expired rooms
	 */
	private cleanup(): void {
		console.log(`[MemoryManager] Running cleanup...`);

		roomManager.cleanup();

		const stats = roomManager.getStats();
		console.log(
			`[MemoryManager] After cleanup: ${stats.activeRooms} active rooms, ${stats.totalConnections} connections`
		);
	}

	/**
	 * Aggressive cleanup: close all idle rooms
	 */
	private aggressiveCleanup(): void {
		console.log(`[MemoryManager] Running aggressive cleanup...`);

		const rooms = roomManager.getAllRooms();
		let closedCount = 0;

		for (const room of rooms) {
			// Close idle rooms
			if (room.state === 'idle') {
				console.log(`[MemoryManager] Force-closing idle room: ${room.roomId}`);
				// Leave all users
				const peers = roomManager.getPeerList(room.roomId);
				for (const peer of peers) {
					roomManager.leaveRoom(room.roomId, peer.userId);
				}
				closedCount++;
			}
		}

		console.log(`[MemoryManager] Closed ${closedCount} idle rooms`);
	}

	/**
	 * Get current memory stats
	 */
	public getMemoryStats(): { heapUsed: number; heapTotal: number; heapPercent: number; external: number } {
		const memUsage = process.memoryUsage();

		return {
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			heapPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
			external: memUsage.external
		};
	}

	/**
	 * Get thresholds for monitoring
	 */
	public getThresholds(): {
		warning: number;
		critical: number;
		cooldown: number;
	} {
		return {
			warning: this.MEMORY_WARNING_THRESHOLD,
			critical: this.MEMORY_CRITICAL_THRESHOLD,
			cooldown: this.WARNING_COOLDOWN
		};
	}

	/**
	 * Stop monitoring
	 */
	public stop(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
			this.monitorInterval = null;
		}

		console.log(`[MemoryManager] Stopped`);
	}
}

// Export singleton instance
export const memoryManager = new MemoryManager();
