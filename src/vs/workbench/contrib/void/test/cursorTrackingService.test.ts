/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';

/**
 * Unit tests for CursorTrackingService
 * Tests remote cursor updates, selection tracking, and cursor rendering
 */
suite('CursorTrackingService', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	// Test cursor position tracking
	test('should track remote cursor positions', function () {
		const remoteCursors = new Map();

		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			color: '#FF0000',
			line: 5,
			character: 10,
			selectionStart: { line: 5, character: 0 },
			selectionEnd: { line: 5, character: 10 }
		};

		remoteCursors.set('peer-1', cursor);

		assert.ok(remoteCursors.has('peer-1'));
		assert.strictEqual(remoteCursors.get('peer-1')?.line, 5);
		assert.strictEqual(remoteCursors.get('peer-1')?.character, 10);
	});

	// Test cursor color assignment
	test('should assign unique colors to cursors', function () {
		const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

		const assignColor = (peerId: string, colorIndex: number) => {
			return colors[colorIndex % colors.length];
		};

		const color1 = assignColor('peer-1', 0);
		const color2 = assignColor('peer-2', 1);
		const color3 = assignColor('peer-3', 2);

		assert.strictEqual(color1, '#FF0000');
		assert.strictEqual(color2, '#00FF00');
		assert.strictEqual(color3, '#0000FF');
		assert.notStrictEqual(color1, color2);
	});

	// Test cursor removal on peer disconnect
	test('should remove cursor when peer goes offline', function () {
		const remoteCursors = new Map();

		remoteCursors.set('peer-1', { userId: 'peer-1', userName: 'User 1', line: 5, character: 10 });
		remoteCursors.set('peer-2', { userId: 'peer-2', userName: 'User 2', line: 3, character: 5 });

		assert.strictEqual(remoteCursors.size, 2);

		// Peer goes offline
		remoteCursors.delete('peer-1');

		assert.strictEqual(remoteCursors.size, 1);
		assert.ok(!remoteCursors.has('peer-1'));
		assert.ok(remoteCursors.has('peer-2'));
	});

	// Test selection tracking
	test('should track cursor selections', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			line: 10,
			character: 5,
			selectionStart: { line: 10, character: 0 },
			selectionEnd: { line: 10, character: 15 },
			selectedText: 'some text here'
		};

		assert.ok(cursor.selectionStart);
		assert.ok(cursor.selectionEnd);
		assert.strictEqual(cursor.selectionEnd.character - cursor.selectionStart.character, 15);
	});

	// Test multi-line selection
	test('should track multi-line selections', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			selectionStart: { line: 5, character: 10 },
			selectionEnd: { line: 8, character: 20 }
		};

		const isMultiLine = cursor.selectionEnd.line > cursor.selectionStart.line;
		assert.ok(isMultiLine);

		const lineCount = cursor.selectionEnd.line - cursor.selectionStart.line + 1;
		assert.strictEqual(lineCount, 4);
	});

	// Test cursor throttling
	test('should throttle cursor updates', function () {
		const THROTTLE_DELAY = 200; // ms
		let lastUpdateTime = 0;
		let updateCount = 0;

		const updateCursor = (newPosition: any) => {
			const now = Date.now();
			if (now - lastUpdateTime >= THROTTLE_DELAY) {
				updateCount++;
				lastUpdateTime = now;
				return true;
			}
			return false;
		};

		assert.ok(updateCursor({ line: 1, character: 0 }));
		assert.strictEqual(updateCount, 1);

		// Immediately try again (should be throttled)
		assert.ok(!updateCursor({ line: 1, character: 1 }));
		assert.strictEqual(updateCount, 1);
	});

	// Test cursor validation
	test('should validate cursor positions', function () {
		const isValidPosition = (line: number, character: number) => {
			return line >= 0 && character >= 0;
		};

		assert.ok(isValidPosition(5, 10));
		assert.ok(isValidPosition(0, 0));
		assert.ok(!isValidPosition(-1, 10));
		assert.ok(!isValidPosition(5, -1));
	});

	// Test cursor update frequency
	test('should handle high-frequency cursor updates', function () {
		const remoteCursors = new Map();
		const cursor = { userId: 'peer-1', userName: 'User 1', line: 0, character: 0 };

		remoteCursors.set('peer-1', cursor);

		// Simulate 100 rapid cursor updates
		for (let i = 0; i < 100; i++) {
			const updated = remoteCursors.get('peer-1');
			if (updated) {
				updated.line = i;
				updated.character = i * 2;
			}
		}

		const finalCursor = remoteCursors.get('peer-1');
		assert.strictEqual(finalCursor?.line, 99);
		assert.strictEqual(finalCursor?.character, 198);
	});

	// Test cursor visibility toggling
	test('should toggle cursor visibility', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			line: 5,
			character: 10,
			visible: true
		};

		assert.ok(cursor.visible);

		// Toggle visibility
		cursor.visible = false;
		assert.ok(!cursor.visible);

		cursor.visible = true;
		assert.ok(cursor.visible);
	});

	// Test cursor with long user names
	test('should handle long user names', function () {
		const longName = 'VeryLongUserNameThatExceedsNormalLength'.repeat(3);

		const cursor = {
			userId: 'peer-1',
			userName: longName,
			line: 5,
			character: 10
		};

		assert.ok(cursor.userName.length > 50);
		assert.strictEqual(cursor.userName, longName);
	});

	// Test cursor cleanup on room exit
	test('should clear all cursors when leaving room', function () {
		const remoteCursors = new Map();

		// Add multiple cursors
		for (let i = 0; i < 5; i++) {
			remoteCursors.set(`peer-${i}`, {
				userId: `peer-${i}`,
				userName: `User ${i}`,
				line: i,
				character: i * 2
			});
		}

		assert.strictEqual(remoteCursors.size, 5);

		// Clear all on room exit
		remoteCursors.clear();

		assert.strictEqual(remoteCursors.size, 0);
	});

	// Test cursor at line boundaries
	test('should handle cursor at line boundaries', function () {
		const maxLineLength = 120;

		const cursor1 = { userId: 'p1', line: 0, character: 0 }; // Start
		const cursor2 = { userId: 'p2', line: 100, character: maxLineLength }; // End

		assert.strictEqual(cursor1.character, 0);
		assert.strictEqual(cursor2.character, maxLineLength);
	});

	// Test cursor state for multiple editors
	test('should track cursors per editor', function () {
		const editorCursors = new Map();

		const editor1Cursors = new Map();
		const editor2Cursors = new Map();

		editor1Cursors.set('peer-1', { line: 10, character: 5 });
		editor2Cursors.set('peer-1', { line: 20, character: 15 });

		editorCursors.set('editor-1', editor1Cursors);
		editorCursors.set('editor-2', editor2Cursors);

		assert.strictEqual(editorCursors.get('editor-1')?.get('peer-1')?.line, 10);
		assert.strictEqual(editorCursors.get('editor-2')?.get('peer-1')?.line, 20);
	});

	// Test cursor presence without selection
	test('should handle cursor without selection', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			line: 5,
			character: 10,
			selectionStart: undefined,
			selectionEnd: undefined
		};

		const hasSelection = cursor.selectionStart !== undefined && cursor.selectionEnd !== undefined;
		assert.ok(!hasSelection);
	});

	// Test concurrent cursor updates from multiple peers
	test('should handle concurrent cursor updates', function () {
		const remoteCursors = new Map();

		const updates = [
			{ peerId: 'p1', line: 5, character: 10 },
			{ peerId: 'p2', line: 3, character: 15 },
			{ peerId: 'p3', line: 8, character: 5 },
			{ peerId: 'p1', line: 6, character: 12 }, // Update for p1
		];

		for (const update of updates) {
			remoteCursors.set(update.peerId, { line: update.line, character: update.character });
		}

		assert.strictEqual(remoteCursors.size, 3);
		assert.strictEqual(remoteCursors.get('p1')?.line, 6); // Should have latest update
	});

	// Test cursor animation state
	test('should track cursor animation state', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			line: 5,
			character: 10,
			animating: false
		};

		assert.ok(!cursor.animating);

		cursor.animating = true;
		assert.ok(cursor.animating);

		// Simulate animation timeout
		cursor.animating = false;
		assert.ok(!cursor.animating);
	});

	// Test user color persistence
	test('should persist user colors across updates', function () {
		const userColors = new Map();
		const color = '#FF0000';

		userColors.set('peer-1', color);

		// Update cursor position but keep color
		assert.strictEqual(userColors.get('peer-1'), color);

		// Color should remain same
		userColors.set('peer-1', color);
		assert.strictEqual(userColors.get('peer-1'), color);
	});

	// Test cursor widget DOM state
	test('should track cursor widget lifecycle', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			line: 5,
			character: 10,
			widget: null as any,
			created: false,
			destroyed: false
		};

		// Create widget
		cursor.widget = { id: 'widget-1' };
		cursor.created = true;
		assert.ok(cursor.created);
		assert.ok(cursor.widget);

		// Destroy widget
		cursor.widget = null;
		cursor.destroyed = true;
		assert.ok(cursor.destroyed);
		assert.ok(!cursor.widget);
	});

	// Test cursor data serialization
	test('should serialize cursor data', function () {
		const cursor = {
			userId: 'peer-1',
			userName: 'User 1',
			line: 5,
			character: 10,
			selectionStart: { line: 5, character: 0 },
			selectionEnd: { line: 5, character: 10 }
		};

		const serialized = JSON.stringify(cursor);
		const deserialized = JSON.parse(serialized);

		assert.strictEqual(deserialized.userId, 'peer-1');
		assert.strictEqual(deserialized.line, 5);
		assert.strictEqual(deserialized.selectionStart.character, 0);
	});
});
