/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { LLMMessageChannel } from './sendLLMMessageChannel.js';

/**
 * Global reference to the LLM message channel.
 * Used to set thread context for persistent memory.
 */
let globalLLMMessageChannel: LLMMessageChannel | null = null;

export function setGlobalLLMMessageChannel(channel: LLMMessageChannel) {
	globalLLMMessageChannel = channel;
}

export function getGlobalLLMMessageChannel(): LLMMessageChannel | null {
	return globalLLMMessageChannel;
}
