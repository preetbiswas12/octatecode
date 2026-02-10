/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * PRODUCTION IMPLEMENTATION: AI Memory Persistence Integration
 *
 * This module integrates the persistent memory system into the chat thread service.
 * It ensures every message is saved to disk locally in the .void-research/ folder.
 *
 * Key Features:
 * - Saves user messages and AI responses to messages.json
 * - Auto-creates and updates task_plan.md, findings.md, progress.md
 * - Maintains session recovery data
 * - Path-aware: Different folders = different chat histories
 */

import { IPersistentMemoryService, PersistedChatMessage } from '../common/persistentMemoryServiceTypes.js';
import { ChatMessage } from '../common/chatThreadServiceTypes.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';

/**
 * Integration helper for persistent memory
 * Used by ChatThreadService to persist messages to disk
 */
export class MessagePersistenceIntegration {
	constructor(
		private readonly persistentMemoryService: IPersistentMemoryService,
		private readonly workspaceContextService: IWorkspaceContextService,
	) { }

	/**
	 * Get the current folder path from workspace
	 */
	private getCurrentFolderPath(): string {
		const workspace = this.workspaceContextService.getWorkspace();
		const folder = workspace.folders[0];
		if (!folder) {
			throw new Error('No workspace folder is currently open');
		}
		return folder.uri.fsPath;
	}

	/**
	 * Convert a ChatMessage to PersistedChatMessage and save it
	 */
	async persistMessage(
		threadId: string,
		message: ChatMessage,
		messageId?: string,
	): Promise<void> {
		const folderPath = this.getCurrentFolderPath();

		// Convert ChatMessage to PersistedChatMessage
		const persistedMessage: PersistedChatMessage = {
			...message,
			_id: messageId || this.generateMessageId(),
			_timestamp: Date.now(),
			_isComplete: message.role === 'assistant', // Mark assistant messages as complete
		} as PersistedChatMessage;

		// Save to disk
		try {
			const result = await this.persistentMemoryService.saveMessage(
				threadId,
				persistedMessage,
				folderPath,
				message.role === 'assistant', // updatePlanningFiles: true for assistant messages
			);
			console.log(`✅ Message persisted: ${result.messageId}`);
		} catch (error) {
			console.error(`❌ Error persisting message:`, error);
			// Don't throw - persistence failure shouldn't block chat
		}
	}

	/**
	 * Generate a unique message ID (UUID)
	 */
	private generateMessageId(): string {
		// Simple UUID v4 generator
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	/**
	 * Load all persisted messages for this thread
	 */
	async loadPersistedMessages(threadId: string): Promise<PersistedChatMessage[]> {
		try {
			return await this.persistentMemoryService.loadMessages(threadId);
		} catch (error) {
			console.warn(`Warning: Could not load persisted messages:`, error);
			return [];
		}
	}

	/**
	 * Get planning files for the current workspace
	 */
	async getPlanningFiles(): Promise<{
		taskPlan: string;
		findings: string;
		progress: string;
		lastUpdated: number;
	}> {
		const folderPath = this.getCurrentFolderPath();
		return this.persistentMemoryService.getPlanningFiles(folderPath);
	}

	/**
	 * Update planning files manually
	 * Useful for logging progress, adding findings, etc.
	 */
	async updatePlanningFiles(content: {
		taskPlan?: string;
		findings?: string;
		progress?: string;
	}): Promise<void> {
		const folderPath = this.getCurrentFolderPath();

		// Load current content
		const current = await this.getPlanningFiles();

		// Merge with provided content
		const merged = {
			taskPlan: content.taskPlan ?? current.taskPlan,
			findings: content.findings ?? current.findings,
			progress: content.progress ?? current.progress,
		};

		await this.persistentMemoryService.updatePlanningFiles(folderPath, merged);
	}

	/**
	 * Add a finding (discovery) to findings.md
	 * Called when AI makes a discovery or generates code
	 */
	async addFinding(title: string, content: string): Promise<void> {
		const planning = await this.getPlanningFiles();
		const timestamp = new Date().toLocaleString();
		const newFinding = `\n## ${title} (${timestamp})\n${content}\n`;
		const updated = planning.findings + newFinding;

		await this.updatePlanningFiles({
			findings: updated,
		});
	}

	/**
	 * Log action to progress.md
	 */
	async logAction(action: string, result?: string, error?: string): Promise<void> {
		const planning = await this.getPlanningFiles();
		const timestamp = new Date().toLocaleTimeString();
		let entry = `- [${timestamp}] ${action}`;
		if (result) entry += ` → ${result}`;
		if (error) entry += ` ❌ ${error}`;
		entry += '\n';

		const updated = planning.progress + entry;

		await this.updatePlanningFiles({
			progress: updated,
		});
	}
}
