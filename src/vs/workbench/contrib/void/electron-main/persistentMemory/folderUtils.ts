/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Generate a stable thread ID from an absolute folder path.
 * Uses SHA256 hash for consistency across sessions.
 * Case-normalized for Windows compatibility.
 */
export function getFolderThreadId(folderPath: string): string {
	// Normalize: convert to lowercase (Windows), resolve . and .., use forward slashes
	const normalized = path.normalize(folderPath).toLowerCase();
	const hash = crypto.createHash('sha256').update(normalized).digest('hex');
	return hash;
}

/**
 * Verify that a given folder path matches the thread's original folder.
 * Returns true if paths are equivalent (case-insensitive normalization).
 */
export function verifyFolderMatch(folderPath: string, originalPath: string): boolean {
	const normalized1 = path.normalize(folderPath).toLowerCase();
	const normalized2 = path.normalize(originalPath).toLowerCase();
	return normalized1 === normalized2;
}

/**
 * Get the user's local app data directory.
 * Windows: C:\Users\<user>\AppData\Local
 * macOS: ~/Library/Application Support
 * Linux: ~/.local/share
 */
export function getMemoryDir(): string {
	const homeDir = require('os').homedir();
	const platform = require('os').platform();

	if (platform === 'win32') {
		return path.join(process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), 'octatecode');
	} else if (platform === 'darwin') {
		return path.join(homeDir, 'Library', 'Application Support', 'octatecode');
	} else {
		return path.join(homeDir, '.local', 'share', 'octatecode');
	}
}

/**
 * Get the planning files directory for a specific folder.
 * Location: <folderPath>/Research and Planning/
 */
export function getPlanningFilesDir(folderPath: string): string {
	return path.join(folderPath, 'Research and Planning');
}

/**
 * Get the conversations directory in user's memory store.
 * Location: ~/.octatecode/memory/conversations/
 */
export function getConversationsDir(): string {
	return path.join(getMemoryDir(), 'memory', 'conversations');
}

/**
 * Get the thread data directory for a specific threadId.
 * Location: ~/.octatecode/memory/conversations/<threadId>/
 */
export function getThreadDir(threadId: string): string {
	return path.join(getConversationsDir(), threadId);
}

/**
 * Get the projects index directory.
 * Location: ~/.octatecode/memory/projects/
 */
export function getProjectsDir(): string {
	return path.join(getMemoryDir(), 'memory', 'projects');
}

/**
 * Get the global index file path.
 * Location: ~/.octatecode/memory/global_index.json
 */
export function getGlobalIndexPath(): string {
	return path.join(getMemoryDir(), 'memory', 'global_index.json');
}
