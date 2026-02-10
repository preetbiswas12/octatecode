/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IChannelClient, IChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IPersistentMemoryService, PersistedChatMessage, ThreadInfo } from '../common/persistentMemoryServiceTypes.js';
import { Disposable } from '../../../../base/common/lifecycle.js';

/**
 * Browser-side proxy for persistent memory IPC channel.
 * Forwards calls to main process.
 */
export class PersistentMemoryService extends Disposable implements IPersistentMemoryService {
	private readonly channel: IChannel;
	private readonly llmChannel: IChannel;

	constructor(
		channelClient: IChannelClient,
	) {
		super();
		this.channel = channelClient.getChannel<IChannel>('persistentMemory');
		this.llmChannel = channelClient.getChannel<IChannel>('sendLLMMessage');
	}

	async getOrCreateThread(folderPath: string): Promise<ThreadInfo> {
		const result = (await this.channel.call('getOrCreateThread', { folderPath })) as ThreadInfo;

		// Also notify the LLM channel of the current thread
		await this.llmChannel.call('setCurrentThread', {
			threadId: result.threadId,
			folderPath,
		});

		return result;
	}

	async saveMessage(
		threadId: string,
		message: PersistedChatMessage,
		folderPath: string,
		updatePlanningFiles?: boolean,
	): Promise<{ success: boolean; messageId: string }> {
		return this.channel.call('saveMessage', {
			threadId,
			message,
			folderPath,
			updatePlanningFiles: updatePlanningFiles ?? true,
		});
	}

	async loadMessages(threadId: string): Promise<PersistedChatMessage[]> {
		return this.channel.call('loadMessages', { threadId });
	}

	async getPlanningFiles(folderPath: string): Promise<{
		taskPlan: string;
		findings: string;
		progress: string;
		lastUpdated: number;
	}> {
		return this.channel.call('getPlanningFiles', { folderPath });
	}

	async updatePlanningFiles(
		folderPath: string,
		content: {
			taskPlan: string;
			findings: string;
			progress: string;
		},
	): Promise<{ success: boolean }> {
		return this.channel.call('updatePlanningFiles', { folderPath, content });
	}
}
