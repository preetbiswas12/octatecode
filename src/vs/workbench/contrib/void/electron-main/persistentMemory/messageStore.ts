/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatMessage } from '../../common/chatThreadServiceTypes.js';
import { getThreadDir, getPlanningFilesDir, getGlobalIndexPath, getFolderThreadId } from './folderUtils.js';

/**
 * Message stored in persistence layer.
 * Composed from ChatMessage with metadata for tracking updates.
 * Includes all properties from ChatMessage union variants.
 */
export type PersistedChatMessage = (ChatMessage & {
	_id: string;                // Unique message ID
	_timestamp: number;         // When created
	_isComplete: boolean;       // Whether AI response finished generating
	_lastUpdated?: number;      // When last updated (for regenerations)
	// Ensure these properties are accessible for union narrowing
	role?: 'user' | 'assistant';
	displayContent?: string;
	content?: string;
})

/**
 * Thread metadata for tracking.
 */
export interface ThreadMetadata {
	threadId: string;
	folderPath: string;         // Original absolute path (for validation)
	createdAt: number;
	lastAccessedAt: number;
	lastSyncedAt: number;
	messageCount: number;
}

/**
 * Planning files content.
 */
export interface PlanningFilesContent {
	taskPlan: string;
	findings: string;
	progress: string;
	lastUpdated: number;
}

/**
 * Message store manager.
 * Handles all persistence operations.
 */
export class MessageStore {
	/**
	 * Save or update a message in the thread.
	 * If message._id exists and matches an existing message, updates it.
	 * Otherwise creates a new message.
	 */
	async saveMessage(threadId: string, message: PersistedChatMessage): Promise<void> {
		const threadDir = getThreadDir(threadId);
		const messagesPath = path.join(threadDir, 'messages.json');

		// Ensure directory exists
		await fs.mkdir(threadDir, { recursive: true });

		// Read existing messages or initialize empty array
		let messages: PersistedChatMessage[] = [];
		try {
			const content = await fs.readFile(messagesPath, 'utf-8');
			messages = JSON.parse(content);
		} catch {
			// File doesn't exist yet, start with empty array
		}

		// Check if message with same ID exists
		const existingIndex = messages.findIndex((m) => m._id === message._id);

		if (existingIndex !== -1) {
			// Update existing message
			messages[existingIndex] = {
				...messages[existingIndex],
				...message,
				_lastUpdated: Date.now(),
			};
		} else {
			// Add new message
			messages.push({
				...message,
				_timestamp: Date.now(),
			});
		}

		// Write back
		await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2), 'utf-8');
	}

	/**
	 * Load all messages for a thread.
	 */
	async loadMessages(threadId: string): Promise<PersistedChatMessage[]> {
		const messagesPath = path.join(getThreadDir(threadId), 'messages.json');

		try {
			const content = await fs.readFile(messagesPath, 'utf-8');
			return JSON.parse(content);
		} catch {
			// No messages yet
			return [];
		}
	}

	/**
	 * Save thread metadata.
	 */
	async saveThreadMetadata(threadId: string, metadata: ThreadMetadata): Promise<void> {
		const threadDir = getThreadDir(threadId);
		const metadataPath = path.join(threadDir, 'metadata.json');

		await fs.mkdir(threadDir, { recursive: true });
		await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
	}

	/**
	 * Load thread metadata.
	 */
	async loadThreadMetadata(threadId: string): Promise<ThreadMetadata | null> {
		const metadataPath = path.join(getThreadDir(threadId), 'metadata.json');

		try {
			const content = await fs.readFile(metadataPath, 'utf-8');
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	/**
	 * Save planning files.
	 */
	async savePlanningFiles(folderPath: string, content: PlanningFilesContent): Promise<void> {
		const planningDir = getPlanningFilesDir(folderPath);

		// Ensure directory exists
		await fs.mkdir(planningDir, { recursive: true });

		// Write individual files
		await Promise.all([
			fs.writeFile(path.join(planningDir, 'task_plan.md'), content.taskPlan, 'utf-8'),
			fs.writeFile(path.join(planningDir, 'findings.md'), content.findings, 'utf-8'),
			fs.writeFile(path.join(planningDir, 'progress.md'), content.progress, 'utf-8'),
		]);
	}

	/**
	 * Load planning files.
	 */
	async loadPlanningFiles(folderPath: string): Promise<PlanningFilesContent> {
		const planningDir = getPlanningFilesDir(folderPath);

		const [taskPlan, findings, progress] = await Promise.all([
			fs.readFile(path.join(planningDir, 'task_plan.md'), 'utf-8').catch(() => '# Task Plan\n'),
			fs.readFile(path.join(planningDir, 'findings.md'), 'utf-8').catch(() => '# Findings\n'),
			fs.readFile(path.join(planningDir, 'progress.md'), 'utf-8').catch(() => '# Progress Log\n'),
		]);

		return {
			taskPlan,
			findings,
			progress,
			lastUpdated: Date.now(),
		};
	}

	/**
	 * Update planning files from new messages.
	 * Auto-extracts findings and updates progress.
	 * Intelligently parses assistant messages for actionable insights.
	 */
	async updatePlanningFilesFromMessages(
		folderPath: string,
		newMessages: PersistedChatMessage[],
	): Promise<void> {
		const current = await this.loadPlanningFiles(folderPath);
		let findings = current.findings;
		let progress = current.progress;
		let taskPlan = current.taskPlan;

		for (const msg of newMessages) {
			if (msg.role !== 'assistant') continue;

			const timestamp = new Date().toLocaleString();
			const timeOnly = new Date().toLocaleTimeString();

			// Extract findings: code snippets, discoveries, API responses
			const content = msg.displayContent || '';

			// Look for code blocks (```language...```)
			const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
			let match;
			let codeBlocksFound = 0;

			while ((match = codeBlockRegex.exec(content)) !== null) {
				const language = match[1] || 'code';
				const code = match[2].trim();
				findings += `\n### Code Snippet (${language}) - ${timestamp}\n\`\`\`${language}\n${code}\n\`\`\`\n`;
				codeBlocksFound++;
			}

			// Log message to progress
			const preview = content.substring(0, 100).replace(/\n/g, ' ');
			progress += `- [${timeOnly}] AI Response (${codeBlocksFound} code blocks): ${preview}...\n`;

			// Update task plan progress if this looks like a completed action
			if (content.toLowerCase().includes('complete') ||
				content.toLowerCase().includes('done') ||
				content.toLowerCase().includes('finished')) {
				// Auto-increment progress in task plan
				const progressMatch = taskPlan.match(/\*\*Progress\*\*: (\d+)%/);
				if (progressMatch) {
					const currentProgress = parseInt(progressMatch[1]);
					const newProgress = Math.min(currentProgress + 25, 100);
					taskPlan = taskPlan.replace(
						/\*\*Progress\*\*: \d+%/,
						`**Progress**: ${newProgress}%`
					);
				}
			}
		}

		const updated: PlanningFilesContent = {
			taskPlan,
			findings,
			progress,
			lastUpdated: Date.now(),
		};

		await this.savePlanningFiles(folderPath, updated);
	}

	/**
	 * Update global index with new thread.
	 */
	async updateGlobalIndex(threadId: string, folderPath: string): Promise<void> {
		const indexPath = getGlobalIndexPath();

		// Ensure directory exists
		await fs.mkdir(path.dirname(indexPath), { recursive: true });

		let index: Record<string, { threadId: string; folderPath: string; lastAccessed: number }> = {};

		try {
			const content = await fs.readFile(indexPath, 'utf-8');
			index = JSON.parse(content);
		} catch {
			// First time, initialize empty
		}

		// Add or update entry
		index[threadId] = {
			threadId,
			folderPath,
			lastAccessed: Date.now(),
		};

		await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
	}

	/**
	 * Get thread ID from folder path and verify folder match.
	 * Returns null if folder path doesn't match stored path.
	 */
	async getThreadIfFolderMatches(currentFolderPath: string): Promise<{ threadId: string; metadata: ThreadMetadata } | null> {
		const threadId = getFolderThreadId(currentFolderPath);
		const metadata = await this.loadThreadMetadata(threadId);

		if (!metadata) {
			// No previous thread
			return null;
		}

		// Verify folder path matches
		const normalized1 = path.normalize(currentFolderPath).toLowerCase();
		const normalized2 = path.normalize(metadata.folderPath).toLowerCase();

		if (normalized1 !== normalized2) {
			// Different folder path, don't load this thread
			return null;
		}

		return { threadId, metadata };
	}
}

// Export singleton instance
export const messageStore = new MessageStore();
