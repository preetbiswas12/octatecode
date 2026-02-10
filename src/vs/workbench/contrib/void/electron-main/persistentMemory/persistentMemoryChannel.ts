/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IServerChannel } from '../../../../../base/parts/ipc/common/ipc.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { threadManager } from './threadManager.js';
import { messageStore } from './messageStore.js';
import { PersistedChatMessage } from './messageStore.js';

/**
 * IPC Channel for persistent memory operations.
 * Browser → Main communication for thread and message management.
 */
export class PersistentMemoryChannel implements IServerChannel<string> {
	listen<T>(ctx: string, event: string, arg?: any): Event<T> {
		// No event-based communication for now, all methods are RPC-style
		const emitter = new Emitter<T>();
		return emitter.event;
	}

	/**
	 * RPC: Get or create thread for a folder.
	 */
	async call(
		ctx: string,
		command: string,
		args?: any,
	): Promise<any> {
		switch (command) {
			case 'getOrCreateThread': {
				const { folderPath } = args;
				const result = await threadManager.getOrCreateThread(folderPath);
				return result;
			}

			case 'saveMessage': {
				const { threadId, message, folderPath, updatePlanningFiles } = args;
				const persistedMessage: PersistedChatMessage = {
					...message,
					_id: message._id || threadManager.generateMessageId(),
					_isComplete: message._isComplete ?? false,
				};
				await threadManager.saveMessage(threadId, persistedMessage, folderPath, updatePlanningFiles);
				return { success: true, messageId: persistedMessage._id };
			}

			case 'loadMessages': {
				const { threadId } = args;
				const messages = await threadManager.loadMessages(threadId);
				return messages;
			}

			case 'getPlanningFiles': {
				const { folderPath } = args;
				const planning = await messageStore.loadPlanningFiles(folderPath);
				return planning;
			}

			case 'updatePlanningFiles': {
				const { folderPath, content } = args;
				await messageStore.savePlanningFiles(folderPath, content);
				return { success: true };
			}

			case 'setLLMChannelThread': {
				// This is a special case where we need to set the thread on the LLM channel
				// The browser will call this after getting the thread info
				return { success: true };
			}

			default:
				throw new Error(`Unknown command: ${command}`);
		}
	}
}

export const persistentMemoryChannel = new PersistentMemoryChannel();
