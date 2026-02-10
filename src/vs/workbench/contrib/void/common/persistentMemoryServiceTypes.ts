/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ChatMessage } from './chatThreadServiceTypes.js';

export const IPersistentMemoryService = createDecorator<IPersistentMemoryService>('persistentMemoryService');

export type PersistedChatMessage = ChatMessage & {
	_id: string;
	_timestamp: number;
	_isComplete: boolean;
	_lastUpdated?: number;
	// Ensure these properties are accessible for union narrowing
	role?: 'user' | 'assistant';
	displayContent?: string;
	content?: string;
}

export interface ThreadInfo {
	threadId: string;
	messages: PersistedChatMessage[];
	isNewThread: boolean;
	hasUnsynced: boolean;
}

export interface IPersistentMemoryService {
	/**
	 * Get or create a thread for the current folder.
	 */
	getOrCreateThread(folderPath: string): Promise<ThreadInfo>;

	/**
	 * Save a message to the current thread.
	 */
	saveMessage(
		threadId: string,
		message: PersistedChatMessage,
		folderPath: string,
		updatePlanningFiles?: boolean,
	): Promise<{ success: boolean; messageId: string }>;

	/**
	 * Load all messages for a thread.
	 */
	loadMessages(threadId: string): Promise<PersistedChatMessage[]>;

	/**
	 * Get planning files content.
	 */
	getPlanningFiles(folderPath: string): Promise<{
		taskPlan: string;
		findings: string;
		progress: string;
		lastUpdated: number;
	}>;

	/**
	 * Update planning files.
	 */
	updatePlanningFiles(
		folderPath: string,
		content: {
			taskPlan: string;
			findings: string;
			progress: string;
		},
	): Promise<{ success: boolean }>;
}
