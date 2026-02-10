/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import { PersistedChatMessage, ThreadMetadata, messageStore } from './messageStore.js';
import { getFolderThreadId } from './folderUtils.js';

/**
 * Thread manager handles thread lifecycle:
 * - Creation/loading based on folder path
 * - Message operations (save, load, update)
 * - Planning files sync
 * - Session recovery
 */
export class ThreadManager {
	/**
	 * Get or create a thread for a folder path.
	 *
	 * Behavior:
	 * - If same folder opened before: loads previous thread
	 * - If different folder: creates new thread
	 * - Auto-creates Research and Planning folder in workspace
	 */
	async getOrCreateThread(folderPath: string): Promise<{
		threadId: string;
		messages: PersistedChatMessage[];
		isNewThread: boolean;
		hasUnsynced: boolean;
	}> {
		const threadId = getFolderThreadId(folderPath);

		// Check if thread exists for this folder
		const existing = await messageStore.getThreadIfFolderMatches(folderPath);

		if (existing) {
			// Load existing thread
			const messages = await messageStore.loadMessages(threadId);
			return {
				threadId,
				messages,
				isNewThread: false,
				hasUnsynced: false, // TODO: implement unsynced detection
			};
		}

		// Create new thread
		const metadata: ThreadMetadata = {
			threadId,
			folderPath,
			createdAt: Date.now(),
			lastAccessedAt: Date.now(),
			lastSyncedAt: Date.now(),
			messageCount: 0,
		};

		await messageStore.saveThreadMetadata(threadId, metadata);
		await messageStore.updateGlobalIndex(threadId, folderPath);

		// Auto-create planning files directory
		try {
			const fs = await import('fs/promises');
			const path = await import('path');
			const planningDir = path.join(folderPath, 'Research and Planning');
			await fs.mkdir(planningDir, { recursive: true });

			// Create empty planning files
			await messageStore.savePlanningFiles(folderPath, {
				taskPlan: '# Task Plan\n\n## Steps\n- [ ] Step 1\n- [ ] Step 2\n- [ ] Step 3\n',
				findings: '# Findings\n\n## Research\n\n## Key Discoveries\n',
				progress: '# Progress Log\n\n## Session Start\n- Started at ' + new Date().toLocaleString() + '\n',
				lastUpdated: Date.now(),
			});
		} catch (error) {
			console.error('Failed to create planning files:', error);
		}

		return {
			threadId,
			messages: [],
			isNewThread: true,
			hasUnsynced: false,
		};
	}

	/**
	 * Save a message to the thread.
	 * If message.role === 'assistant' and isComplete, also updates planning files.
	 */
	async saveMessage(
		threadId: string,
		message: PersistedChatMessage,
		folderPath: string,
		updatePlanningFiles: boolean = true,
	): Promise<void> {
		// Save message
		await messageStore.saveMessage(threadId, message);

		// Update metadata
		const metadata = await messageStore.loadThreadMetadata(threadId);
		if (metadata) {
			metadata.lastAccessedAt = Date.now();
			if (message.role === 'assistant' && message._isComplete) {
				metadata.lastSyncedAt = Date.now();
			}
			metadata.messageCount = (metadata.messageCount || 0) + 1;
			await messageStore.saveThreadMetadata(threadId, metadata);
		}

		// Update planning files if AI response complete
		if (updatePlanningFiles && message.role === 'assistant' && message._isComplete) {
			await messageStore.updatePlanningFilesFromMessages(folderPath, [message]);
		}
	}

	/**
	 * Load all messages for a thread.
	 */
	async loadMessages(threadId: string): Promise<PersistedChatMessage[]> {
		return messageStore.loadMessages(threadId);
	}

	/**
	 * Generate a unique message ID.
	 */
	generateMessageId(): string {
		return crypto.randomUUID();
	}
}

// Export singleton
export const threadManager = new ThreadManager();
