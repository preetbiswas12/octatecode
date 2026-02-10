/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { IChannel, IChannelClient } from '../../../../base/parts/ipc/common/ipc.js';
import { IPersistentMemoryService } from './persistentMemoryServiceTypes.js';
import { PersistentMemoryService } from '../browser/persistentMemoryService.js';

/**
 * Wrapper to make IMainProcessService compatible with IChannelClient
 */
class MainProcessServiceChannelClient implements IChannelClient {
	constructor(private mainProcessService: IMainProcessService) { }

	getChannel<T extends IChannel>(channelName: string): T {
		return this.mainProcessService.getChannel(channelName) as T;
	}
}

/**
 * Implementation of PersistentMemoryService for main process
 */
class PersistentMemoryServiceImpl extends PersistentMemoryService {
	constructor(@IMainProcessService mainProcessService: IMainProcessService) {
		super(new MainProcessServiceChannelClient(mainProcessService));
	}
}

/**
 * Register PersistentMemoryService as a singleton in the workbench.
 * Handles all persistent memory operations (save, load, thread management).
 */
registerSingleton(IPersistentMemoryService, PersistentMemoryServiceImpl, InstantiationType.Eager);
