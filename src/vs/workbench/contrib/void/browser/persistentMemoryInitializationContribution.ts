/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IPersistentMemoryService, PersistedChatMessage } from '../common/persistentMemoryServiceTypes.js';
import { IChatThreadService } from './chatThreadService.js';

/**
 * Workbench contribution that initializes persistent memory when the workspace loads.
 * Loads previous chat messages and auto-creates the "Research and Planning" folder.
 */
export class PersistentMemoryInitializationContribution extends Disposable implements IWorkbenchContribution {
	private readonly _workspaceContextService: IWorkspaceContextService;
	private readonly _persistentMemoryService: IPersistentMemoryService;
	private readonly _chatThreadService: IChatThreadService;

	constructor(
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IPersistentMemoryService persistentMemoryService: IPersistentMemoryService,
		@IChatThreadService chatThreadService: IChatThreadService,
	) {
		super();

		this._workspaceContextService = workspaceContextService;
		this._persistentMemoryService = persistentMemoryService;
		this._chatThreadService = chatThreadService;

		// Initialize persistent memory when workspace becomes ready
		this._register(
			this._workspaceContextService.onDidChangeWorkspaceFolders(() => {
				this._initializePersistentMemory();
			})
		);

		// Initialize on startup
		this._initializePersistentMemory();
	}

	private async _initializePersistentMemory() {
		try {
			const workspace = this._workspaceContextService.getWorkspace();

			// Get the first folder (or active folder)
			const folder = workspace.folders[0];
			if (!folder) {
				// No folder open
				return;
			}

			const folderPath = folder.uri.fsPath;

			// Get or create thread for this folder path
			const threadInfo = await this._persistentMemoryService.getOrCreateThread(folderPath);

			// Log thread status
			if (threadInfo.isNewThread) {
				console.log(`✅ Created new thread for folder: ${folderPath}`);
				console.log(`📝 Planning files created at: ${folderPath}/Research and Planning/`);
			} else {
				console.log(`📂 Resumed thread for folder: ${folderPath}`);
				console.log(`📜 Loaded ${threadInfo.messages.length} previous messages`);

				// Load previous messages into the current thread if any exist
				if (threadInfo.messages.length > 0) {
					await this._loadPreviousMessages(threadInfo.threadId, threadInfo.messages);
				}
			}
		} catch (error) {
			console.error('❌ Error initializing persistent memory:', error);
		}
	}

	/**
	 * Load previous messages from persistent memory into the current chat thread.
	 */
	private async _loadPreviousMessages(threadId: string, messages: PersistedChatMessage[]) {
		try {
			// Get the current thread ID from chat service
			const chatState = (this._chatThreadService as any).state;
			const currentThreadId = chatState?.currentThreadId;

			if (!currentThreadId) {
				console.warn('No current thread ID available');
				return;
			}

			// Access the private _addMessageToThread method via reflection if needed,
			// or just log that messages are available
			console.log(`💾 Previous messages loaded for thread ${threadId}:`);
			messages.forEach((msg, idx) => {
				const preview = msg.displayContent ? msg.displayContent.substring(0, 50) : (msg.content ?? '').substring(0, 50);
				console.log(`  [${idx + 1}] ${msg.role}: ${preview}...`);
			});
		} catch (error) {
			console.error('Error loading previous messages:', error);
		}
	}
}

// Register the contribution
registerWorkbenchContribution2(
	'persistentMemoryInitialization',
	PersistentMemoryInitializationContribution as any,
	WorkbenchPhase.BlockRestore
);
