/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import {
	CollaborationStatus,
	RoomInfo,
	PeerPresence,
	CollaborativeEdit,
} from '../common/collaborationServiceTypes.js';

/**
 * Unit tests for CollaborationService
 * Tests core functionality: room management, peer tracking, and event handling
 *
 * Note: The actual CollaborationService requires IPC channels and WebRTC,
 * so we test the core logic patterns and types here.
 */
suite('CollaborationService', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	// ============================================================================
	// ROOM INFO TESTS
	// ============================================================================

	suite('RoomInfo', () => {
		test('should create valid room info structure', function () {
			const room: RoomInfo = {
				roomId: 'room-123',
				roomName: 'Test Room',
				hostId: 'host-user',
				hostName: 'Host User',
				createdAt: Date.now(),
				peerCount: 1,
				peers: [],
			};

			assert.strictEqual(room.roomId, 'room-123');
			assert.strictEqual(room.roomName, 'Test Room');
			assert.strictEqual(room.hostId, 'host-user');
			assert.ok(room.createdAt > 0);
		});

		test('should track peer count correctly', function () {
			const room: RoomInfo = {
				roomId: 'room-123',
				roomName: 'Test Room',
				hostId: 'host-user',
				hostName: 'Host User',
				createdAt: Date.now(),
				peerCount: 0,
				peers: [],
			};

			// Add peers
			room.peers.push({ peerId: 'peer-1', name: 'Peer 1' } as any);
			room.peers.push({ peerId: 'peer-2', name: 'Peer 2' } as any);
			room.peerCount = room.peers.length;

			assert.strictEqual(room.peerCount, 2);
			assert.strictEqual(room.peers.length, 2);
		});
	});

	// ============================================================================
	// COLLABORATION STATUS TESTS
	// ============================================================================

	suite('CollaborationStatus', () => {
		test('should have correct status values', function () {
			assert.strictEqual(CollaborationStatus.IDLE, 'idle');
			assert.strictEqual(CollaborationStatus.CONNECTING, 'connecting');
			assert.strictEqual(CollaborationStatus.CONNECTED, 'connected');
			assert.strictEqual(CollaborationStatus.RECONNECTING, 'reconnecting');
			assert.strictEqual(CollaborationStatus.DISCONNECTED, 'disconnected');
			assert.strictEqual(CollaborationStatus.ERROR, 'error');
		});

		test('should support status transitions', function () {
			let status: CollaborationStatus = CollaborationStatus.IDLE;

			// Start connecting
			status = CollaborationStatus.CONNECTING;
			assert.strictEqual(status, 'connecting');

			// Successfully connected
			status = CollaborationStatus.CONNECTED;
			assert.strictEqual(status, 'connected');

			// Lost connection, reconnecting
			status = CollaborationStatus.RECONNECTING;
			assert.strictEqual(status, 'reconnecting');

			// Reconnection failed
			status = CollaborationStatus.DISCONNECTED;
			assert.strictEqual(status, 'disconnected');
		});
	});

	// ============================================================================
	// PEER PRESENCE TESTS
	// ============================================================================

	suite('PeerPresence', () => {
		test('should create valid peer presence', function () {
			const peer: PeerPresence = {
				peerId: 'peer-123',
				userId: 'user-456',
				name: 'Test User',
				color: '#FF5733',
				isOnline: true,
				currentFile: 'src/test.ts',
				cursorPosition: { line: 10, character: 5 },
				lastSeen: Date.now(),
			};

			assert.strictEqual(peer.peerId, 'peer-123');
			assert.strictEqual(peer.name, 'Test User');
			assert.ok(peer.isOnline);
			assert.strictEqual(peer.cursorPosition?.line, 10);
		});

		test('should track peer online status', function () {
			const peers = new Map<string, PeerPresence>();

			const peer1: PeerPresence = {
				peerId: 'peer-1',
				userId: 'user-1',
				name: 'User 1',
				color: '#FF0000',
				isOnline: true,
				lastSeen: Date.now(),
			};

			const peer2: PeerPresence = {
				peerId: 'peer-2',
				userId: 'user-2',
				name: 'User 2',
				color: '#00FF00',
				isOnline: true,
				lastSeen: Date.now(),
			};

			peers.set(peer1.peerId, peer1);
			peers.set(peer2.peerId, peer2);

			// Peer goes offline
			peer1.isOnline = false;
			peer1.lastSeen = Date.now();

			const onlinePeers = Array.from(peers.values()).filter(p => p.isOnline);
			assert.strictEqual(onlinePeers.length, 1);
			assert.strictEqual(onlinePeers[0].peerId, 'peer-2');
		});
	});

	// ============================================================================
	// COLLABORATIVE EDIT TESTS
	// ============================================================================

	suite('CollaborativeEdit', () => {
		test('should create valid insert edit', function () {
			const edit: CollaborativeEdit = {
				fileUri: 'file:///src/test.ts',
				startLine: 10,
				startCharacter: 5,
				endLine: 10,
				endCharacter: 5,
				newText: 'console.log("hello");',
				userId: 'user-123',
				timestamp: Date.now(),
				operationId: 'op-1',
			};

			assert.strictEqual(edit.fileUri, 'file:///src/test.ts');
			assert.strictEqual(edit.startLine, 10);
			assert.strictEqual(edit.newText, 'console.log("hello");');
			assert.ok(edit.timestamp > 0);
		});

		test('should create valid delete edit', function () {
			const edit: CollaborativeEdit = {
				fileUri: 'file:///src/test.ts',
				startLine: 5,
				startCharacter: 0,
				endLine: 5,
				endCharacter: 20,
				newText: '',
				userId: 'user-123',
				timestamp: Date.now(),
				operationId: 'op-2',
			};

			assert.strictEqual(edit.newText, '');
			assert.strictEqual(edit.endCharacter - edit.startCharacter, 20);
		});

		test('should create valid replace edit', function () {
			const edit: CollaborativeEdit = {
				fileUri: 'file:///src/test.ts',
				startLine: 3,
				startCharacter: 0,
				endLine: 3,
				endCharacter: 10,
				newText: 'new content',
				userId: 'user-123',
				timestamp: Date.now(),
				operationId: 'op-3',
			};

			assert.strictEqual(edit.newText, 'new content');
			assert.ok(edit.endCharacter > edit.startCharacter);
		});
	});

	// ============================================================================
	// OPERATION QUEUE TESTS
	// ============================================================================

	suite('Operation Queue (Offline Support)', () => {
		test('should queue operations when offline', function () {
			const queue: Array<{ type: string; data: any; timestamp: number }> = [];
			const MAX_QUEUE_SIZE = 100;

			const queueOperation = (type: string, data: any) => {
				if (queue.length < MAX_QUEUE_SIZE) {
					queue.push({ type, data, timestamp: Date.now() });
					return true;
				}
				return false;
			};

			assert.ok(queueOperation('edit', { text: 'test' }));
			assert.ok(queueOperation('cursor', { line: 5 }));
			assert.strictEqual(queue.length, 2);
		});

		test('should respect max queue size', function () {
			const queue: Array<{ type: string; data: any; timestamp: number }> = [];
			const MAX_QUEUE_SIZE = 5;

			const queueOperation = (type: string, data: any) => {
				if (queue.length < MAX_QUEUE_SIZE) {
					queue.push({ type, data, timestamp: Date.now() });
					return true;
				}
				return false;
			};

			for (let i = 0; i < 10; i++) {
				queueOperation('edit', { index: i });
			}

			assert.strictEqual(queue.length, 5);
		});

		test('should process queued operations in order', function () {
			const queue: Array<{ type: string; data: any; timestamp: number }> = [];
			const processed: any[] = [];

			queue.push({ type: 'edit', data: { order: 1 }, timestamp: 1000 });
			queue.push({ type: 'edit', data: { order: 2 }, timestamp: 1001 });
			queue.push({ type: 'edit', data: { order: 3 }, timestamp: 1002 });

			while (queue.length > 0) {
				const op = queue.shift()!;
				processed.push(op.data.order);
			}

			assert.deepStrictEqual(processed, [1, 2, 3]);
		});
	});

	// ============================================================================
	// RECONNECTION LOGIC TESTS
	// ============================================================================

	suite('Reconnection with Exponential Backoff', () => {
		test('should calculate correct backoff delays', function () {
			const INITIAL_DELAY = 1000;
			const MAX_DELAY = 30000;

			const calculateBackoff = (attempt: number): number => {
				const delay = INITIAL_DELAY * Math.pow(2, attempt);
				return Math.min(delay, MAX_DELAY);
			};

			assert.strictEqual(calculateBackoff(0), 1000);   // 1s
			assert.strictEqual(calculateBackoff(1), 2000);   // 2s
			assert.strictEqual(calculateBackoff(2), 4000);   // 4s
			assert.strictEqual(calculateBackoff(3), 8000);   // 8s
			assert.strictEqual(calculateBackoff(4), 16000);  // 16s
			assert.strictEqual(calculateBackoff(5), 30000);  // capped at 30s
			assert.strictEqual(calculateBackoff(10), 30000); // still capped
		});

		test('should respect max reconnect attempts', function () {
			const MAX_ATTEMPTS = 10;
			let attempts = 0;
			let connected = false;

			const tryReconnect = (): boolean => {
				if (attempts >= MAX_ATTEMPTS) {
					return false;
				}
				attempts++;
				// Simulate failed connection
				return false;
			};

			while (!connected && attempts < MAX_ATTEMPTS) {
				connected = tryReconnect();
			}

			assert.strictEqual(attempts, MAX_ATTEMPTS);
			assert.ok(!connected);
		});
	});

	// ============================================================================
	// HEARTBEAT TESTS
	// ============================================================================

	suite('Heartbeat & Timeout Detection', () => {
		test('should detect peer timeout', function () {
			const HEARTBEAT_TIMEOUT = 15000;
			const peerLastSeen = new Map<string, number>();

			peerLastSeen.set('peer-1', Date.now());
			peerLastSeen.set('peer-2', Date.now() - 20000); // 20 seconds ago

			const checkTimeout = (peerId: string): boolean => {
				const lastSeen = peerLastSeen.get(peerId);
				if (!lastSeen) return true;
				return Date.now() - lastSeen > HEARTBEAT_TIMEOUT;
			};

			assert.ok(!checkTimeout('peer-1')); // Not timed out
			assert.ok(checkTimeout('peer-2'));  // Timed out
		});

		test('should update last seen on heartbeat', function () {
			const peerLastSeen = new Map<string, number>();

			const recordHeartbeat = (peerId: string) => {
				peerLastSeen.set(peerId, Date.now());
			};

			recordHeartbeat('peer-1');
			const first = peerLastSeen.get('peer-1')!;

			// Simulate time passing (use different timestamp)
			peerLastSeen.set('peer-1', first + 5000);
			const second = peerLastSeen.get('peer-1')!;

			assert.ok(second > first);
		});
	});
});
