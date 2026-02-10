/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ICollaborationService } from './collaborationService.js';
import { SharedChatMessage } from '../common/collaborationServiceTypes.js';
import { generateUuid } from '../../../../base/common/uuid.js';

export interface IChatSyncService {
	readonly _serviceBrand: undefined;
	initialize(): void;
	sendMessage(content: string): Promise<void>;
	getMessages(): SharedChatMessage[];
	onMessageReceived: (callback: (message: SharedChatMessage) => void) => any;
	onMessagesCleared: (callback: () => void) => any;
}

export const IChatSyncService = createDecorator<IChatSyncService>('chatSyncService');

class ChatSyncService extends Disposable implements IChatSyncService {
	readonly _serviceBrand: undefined;

	private messages: SharedChatMessage[] = [];
	private userId: string = '';
	private userName: string = 'Anonymous';
	private isInRoom: boolean = false;

	// Emitters
	private readonly messageReceivedEmitter = new Emitter<SharedChatMessage>();
	private readonly messagesClearedEmitter = new Emitter<void>();

	constructor(@ICollaborationService private collaborationService: ICollaborationService) {
		super();
	}

	initialize(): void {
		// Get initial user info from room
		const room = this.collaborationService.getCurrentRoom();
		if (room) {
			this.isInRoom = true;
		}

		// Listen for room changes
		const roomUnsub = this.collaborationService.onRoomChanged((room) => {
			try {
				if (room) {
					this.isInRoom = true;
					console.log('[ChatSync] Joined room, chat ready');
				} else {
					this.isInRoom = false;
					this.messages = [];
					this.messagesClearedEmitter.fire();
					console.log('[ChatSync] Left room, cleared chat history');
				}
			} catch (error) {
				console.error('[ChatSync] Error handling room change:', error);
			}
		});
		this._register(toDisposable(() => roomUnsub()));

		// Listen for incoming chat messages
		const messageUnsub = this.collaborationService.onChatMessage((message) => {
			try {
				this.handleIncomingMessage(message);
			} catch (error) {
				console.error('[ChatSync] Error handling incoming message:', error);
			}
		});
		this._register(toDisposable(() => messageUnsub()));

		// Get peer info to set user details
		const peers = this.collaborationService.getPeers();
		if (peers.length > 0) {
			const selfPeer = peers.find(p => {
				// The current user's peer info would be identified differently
				// For now, use the first peer or fallback
				return true;
			});
			if (selfPeer) {
				this.userId = selfPeer.userId;
				this.userName = selfPeer.userName;
			}
		}
	}

	async sendMessage(content: string): Promise<void> {
		if (!this.isInRoom) {
			throw new Error('Not in a collaboration room');
		}

		if (!content.trim()) {
			throw new Error('Message cannot be empty');
		}

		try {
			const message: SharedChatMessage = {
				id: generateUuid(),
				userId: this.userId,
				userName: this.userName,
				content: content.trim(),
				timestamp: Date.now(),
				role: 'user',
			};

			// Broadcast to peers
			await this.collaborationService.broadcastChat(message);

			// Add to local history
			this.messages.push(message);
			this.messageReceivedEmitter.fire(message);

			console.log('[ChatSync] Message sent:', message.id);
		} catch (error) {
			console.error('[ChatSync] Error sending message:', error);
			throw error;
		}
	}

	private handleIncomingMessage(message: SharedChatMessage): void {
		// Avoid duplicates (message we sent)
		if (this.messages.some(m => m.id === message.id)) {
			return;
		}

		this.messages.push(message);
		this.messageReceivedEmitter.fire(message);

		console.log('[ChatSync] Message received from', message.userName, ':', message.id);
	}

	getMessages(): SharedChatMessage[] {
		return [...this.messages];
	}

	onMessageReceived(callback: (message: SharedChatMessage) => void) {
		return this.messageReceivedEmitter.event(callback);
	}

	onMessagesCleared(callback: () => void) {
		return this.messagesClearedEmitter.event(callback);
	}

	override dispose(): void {
		this.messages = [];
		super.dispose();
	}
}

registerSingleton(IChatSyncService, ChatSyncService, InstantiationType.Eager);
