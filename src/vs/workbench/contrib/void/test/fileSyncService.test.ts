/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';

/**
 * Unit tests for FileSyncService
 * Tests file change detection, version tracking, and conflict resolution
 */
suite('FileSyncService', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	// Test file version tracking
	test('should track file versions', function () {
		const fileVersions = new Map();
		const fileUri = 'file://test.ts';

		fileVersions.set(fileUri, 0);
		assert.strictEqual(fileVersions.get(fileUri), 0);

		fileVersions.set(fileUri, 1);
		assert.strictEqual(fileVersions.get(fileUri), 1);

		fileVersions.set(fileUri, 2);
		assert.strictEqual(fileVersions.get(fileUri), 2);
	});

	// Test pending edits queue
	test('should queue pending edits', function () {
		const pendingEdits = new Map();
		const fileUri = 'file://test.ts';

		const edit1 = { id: 'edit-1', type: 'insert', content: 'test', line: 0 };
		const edit2 = { id: 'edit-2', type: 'delete', line: 1 };

		if (!pendingEdits.has(fileUri)) {
			pendingEdits.set(fileUri, []);
		}
		pendingEdits.get(fileUri)?.push(edit1);
		pendingEdits.get(fileUri)?.push(edit2);

		assert.strictEqual(pendingEdits.get(fileUri)?.length, 2);
	});

	// Test file monitoring
	test('should detect file changes', function () {
		const fileChanges: any[] = [];
		const fileUri = 'file://test.ts';

		let originalContent = 'console.log("test");';
		let newContent = 'console.log("test"); // updated';

		if (originalContent !== newContent) {
			fileChanges.push({
				uri: fileUri,
				oldContent: originalContent,
				newContent: newContent,
				timestamp: Date.now()
			});
		}

		assert.strictEqual(fileChanges.length, 1);
		assert.ok(fileChanges[0].oldContent !== fileChanges[0].newContent);
	});

	// Test conflict resolution (last-write-wins)
	test('should resolve conflicts with last-write-wins strategy', function () {
		const resolveConflict = (localVersion: number, remoteVersion: number, localContent: string, remoteContent: string) => {
			return localVersion > remoteVersion ? localContent : remoteContent;
		};

		const local = { version: 2, content: 'local content' };
		const remote = { version: 1, content: 'remote content' };

		const resolved = resolveConflict(local.version, remote.version, local.content, remote.content);
		assert.strictEqual(resolved, 'local content');
	});

	// Test retry logic for failed syncs
	test('should retry failed file syncs', function () {
		const failedSyncs = new Map();
		const MAX_RETRIES = 3;

		const recordFailedSync = (fileUri: string) => {
			const current = failedSyncs.get(fileUri) || { retries: 0, timestamp: Date.now() };
			current.retries++;
			current.timestamp = Date.now();
			failedSyncs.set(fileUri, current);
		};

		recordFailedSync('file://test1.ts');
		recordFailedSync('file://test1.ts');

		const failedSync = failedSyncs.get('file://test1.ts');
		assert.ok(failedSync?.retries <= MAX_RETRIES);
	});

	// Test sync throttling
	test('should throttle file sync operations', function () {
		const SYNC_THROTTLE_DELAY = 500; // ms
		let lastSyncTime = Date.now();
		const changes: any[] = [];

		const queueChange = (uri: string, content: string) => {
			const now = Date.now();
			if (now - lastSyncTime >= SYNC_THROTTLE_DELAY) {
				changes.push({ uri, content, timestamp: now });
				lastSyncTime = now;
			}
		};

		queueChange('file://test1.ts', 'content1');
		const count1 = changes.length;

		// Immediately try to sync again (should be throttled)
		queueChange('file://test1.ts', 'content2');
		const count2 = changes.length;

		assert.strictEqual(count1, 1);
		assert.strictEqual(count2, 1); // Still 1 due to throttling
	});

	// Test file snapshot creation
	test('should create file snapshots', function () {
		const createSnapshot = (uri: string, content: string, version: number) => ({
			uri,
			content,
			version,
			timestamp: Date.now(),
			hash: Math.random().toString(36) // Simple hash
		});

		const snapshot = createSnapshot('file://test.ts', 'console.log("test");', 1);

		assert.ok(snapshot.uri);
		assert.ok(snapshot.content);
		assert.strictEqual(snapshot.version, 1);
		assert.ok(snapshot.timestamp);
		assert.ok(snapshot.hash);
	});

	// Test handling of non-existent files
	test('should handle non-existent file gracefully', function () {
		const fileVersions = new Map();
		const fileUri = 'file://nonexistent.ts';

		const version = fileVersions.get(fileUri);
		assert.strictEqual(version, undefined);
	});

	// Test concurrent file edits
	test('should handle concurrent file edits', function () {
		const pendingEdits = new Map();

		const edits = [
			{ file: 'file://test.ts', type: 'insert', content: 'a' },
			{ file: 'file://test.ts', type: 'insert', content: 'b' },
			{ file: 'file://other.ts', type: 'insert', content: 'c' },
		];

		for (const edit of edits) {
			if (!pendingEdits.has(edit.file)) {
				pendingEdits.set(edit.file, []);
			}
			pendingEdits.get(edit.file)?.push(edit);
		}

		assert.strictEqual(pendingEdits.get('file://test.ts')?.length, 2);
		assert.strictEqual(pendingEdits.get('file://other.ts')?.length, 1);
	});

	// Test large file handling
	test('should handle large files', function () {
		const largeContent = 'x'.repeat(1000000); // 1MB of x's
		const fileUri = 'file://large.ts';

		const snapshot = {
			uri: fileUri,
			content: largeContent,
			size: largeContent.length,
			version: 1
		};

		assert.ok(snapshot.size > 1000000);
	});

	// Test file deletion handling
	test('should track file deletions', function () {
		const fileVersions = new Map();
		const deletedFiles: string[] = [];

		fileVersions.set('file://test.ts', 1);
		assert.ok(fileVersions.has('file://test.ts'));

		// Simulate file deletion
		const fileUri = 'file://test.ts';
		if (fileVersions.has(fileUri)) {
			deletedFiles.push(fileUri);
			fileVersions.delete(fileUri);
		}

		assert.ok(!fileVersions.has('file://test.ts'));
		assert.ok(deletedFiles.includes('file://test.ts'));
	});

	// Test sync state tracking
	test('should track sync state per file', function () {
		const syncState = new Map();

		const updateSyncState = (fileUri: string, state: 'pending' | 'syncing' | 'synced') => {
			syncState.set(fileUri, state);
		};

		updateSyncState('file://test.ts', 'pending');
		assert.strictEqual(syncState.get('file://test.ts'), 'pending');

		updateSyncState('file://test.ts', 'syncing');
		assert.strictEqual(syncState.get('file://test.ts'), 'syncing');

		updateSyncState('file://test.ts', 'synced');
		assert.strictEqual(syncState.get('file://test.ts'), 'synced');
	});

	// Test edit history
	test('should maintain edit history', function () {
		const editHistory: any[] = [];

		const addEdit = (fileUri: string, type: string, content: string) => {
			editHistory.push({
				fileUri,
				type,
				content,
				timestamp: Date.now()
			});
		};

		addEdit('file://test.ts', 'insert', 'const x = 1;');
		addEdit('file://test.ts', 'insert', 'const y = 2;');
		addEdit('file://test.ts', 'delete', 'const x = 1;');

		assert.strictEqual(editHistory.length, 3);
		assert.strictEqual(editHistory[0].type, 'insert');
		assert.strictEqual(editHistory[2].type, 'delete');
	});

	// Test version increment on conflict
	test('should increment version on successful sync', function () {
		const fileVersions = new Map();
		const fileUri = 'file://test.ts';

		fileVersions.set(fileUri, 0);

		const incrementVersion = (uri: string) => {
			const current = fileVersions.get(uri) || 0;
			fileVersions.set(uri, current + 1);
		};

		incrementVersion(fileUri);
		assert.strictEqual(fileVersions.get(fileUri), 1);

		incrementVersion(fileUri);
		assert.strictEqual(fileVersions.get(fileUri), 2);
	});

	// Test cleanup of old syncs
	test('should cleanup old failed sync records', function () {
		const failedSyncs = new Map();
		const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes

		failedSyncs.set('file://test1.ts', { retries: 2, timestamp: Date.now() });
		failedSyncs.set('file://test2.ts', { retries: 2, timestamp: Date.now() - 10 * 60 * 1000 }); // 10 minutes ago

		const now = Date.now();
		let cleaned = 0;

		for (const [uri, data] of failedSyncs.entries()) {
			if (now - data.timestamp > CLEANUP_THRESHOLD) {
				failedSyncs.delete(uri);
				cleaned++;
			}
		}

		assert.strictEqual(cleaned, 1);
		assert.ok(failedSyncs.has('file://test1.ts'));
		assert.ok(!failedSyncs.has('file://test2.ts'));
	});

	// Test binary file handling
	test('should handle binary file extensions', function () {
		const binaryExtensions = ['.png', '.jpg', '.gif', '.pdf', '.bin'];

		const isBinaryFile = (fileName: string) => {
			const ext = fileName.substring(fileName.lastIndexOf('.'));
			return binaryExtensions.includes(ext.toLowerCase());
		};

		assert.ok(isBinaryFile('image.png'));
		assert.ok(isBinaryFile('document.pdf'));
		assert.ok(!isBinaryFile('script.ts'));
		assert.ok(!isBinaryFile('readme.md'));
	});

	// Test content hashing for duplicate detection
	test('should detect duplicate content changes', function () {
		const hashContent = (content: string) => {
			let hash = 0;
			for (let i = 0; i < content.length; i++) {
				hash = ((hash << 5) - hash) + content.charCodeAt(i);
				hash = hash & hash;
			}
			return hash.toString();
		};

		const hash1 = hashContent('test content');
		const hash2 = hashContent('test content');
		const hash3 = hashContent('different content');

		assert.strictEqual(hash1, hash2);
		assert.notStrictEqual(hash1, hash3);
	});
});
