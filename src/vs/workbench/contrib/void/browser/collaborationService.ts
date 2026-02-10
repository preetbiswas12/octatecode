/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import {
	ICollaborationService as ICollaborationServiceType,
	CollaborationStatus,
	RoomInfo,
	PeerPresence,
	CollaborativeEdit,
	CursorUpdate,
	SharedChatMessage,
	FileSnapshot,
	SyncMessage,
} from '../common/collaborationServiceTypes.js';
import { getRoomDataCleanupManager } from './roomDataCleanupManager.js';

export const ICollaborationService = createDecorator<ICollaborationService>('collaborationService');

export interface ICollaborationService extends ICollaborationServiceType {
	_serviceBrand: undefined;
}

class CollaborationService extends Disposable implements ICollaborationService {
	readonly _serviceBrand: undefined;

	private currentRoom: RoomInfo | null = null;
	private status: CollaborationStatus = CollaborationStatus.IDLE;
	private peers: Map<string, PeerPresence> = new Map();
	private userId: string;
	private userName: string = 'Anonymous';

	// WebRTC
	private peerConnections: Map<string, RTCPeerConnection> = new Map();
	private dataChannels: Map<string, RTCDataChannel> = new Map();

	// Backend channel proxy
	private backendChannel: any;

	// Emitters
	private readonly roomEmitter = new Emitter<RoomInfo | null>();
	private readonly statusEmitter = new Emitter<CollaborationStatus>();
	private readonly peerEmitter = new Emitter<PeerPresence>();
	private readonly editEmitter = new Emitter<CollaborativeEdit>();
	private readonly cursorEmitter = new Emitter<CursorUpdate>();
	private readonly chatEmitter = new Emitter<SharedChatMessage>();

	// WebSocket for signaling
	private signalingWs: WebSocket | null = null;
	private signalingServer: string = 'ws://localhost:3001';

	// Heartbeat & Timeout detection
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private heartbeatTimeoutMap: Map<string, NodeJS.Timeout> = new Map();
	private readonly HEARTBEAT_TIMEOUT = 15000; // 15 seconds

	// Reconnection with exponential backoff
	private reconnectAttempts = 0;
	private readonly MAX_RECONNECT_ATTEMPTS = 10;
	private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
	private reconnectTimer: NodeJS.Timeout | null = null;
	private reconnectDelay = this.INITIAL_RECONNECT_DELAY;

	// Operation queue for offline mode
	private operationQueue: Array<{ type: string; data: any; timestamp: number }> = [];
	private readonly MAX_QUEUE_SIZE = 100;

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService,
		@INotificationService private notificationService: INotificationService,
	) {
		super();
		this.userId = generateUuid();
		this.backendChannel = ProxyChannel.toService<any>(
			mainProcessService.getChannel('void-collaboration-channel')
		);
	}

	async createRoom(roomName: string, userName: string): Promise<RoomInfo> {
		try {
			this.userName = userName;
			this.setStatus(CollaborationStatus.CONNECTING);

			const room = await this.backendChannel.call('createRoom', {
				roomName,
				hostId: this.userId,
				hostName: userName,
			});

			this.currentRoom = room;

			// Register room for automatic data cleanup
			const cleanupManager = getRoomDataCleanupManager();
			cleanupManager.registerRoom(room.roomId);
			console.log(`[Collaboration] Room ${room.roomId} registered for automatic data cleanup`);

			await this.initializeSignaling();
			this.setStatus(CollaborationStatus.CONNECTED);
			this.startHeartbeat();
			this.roomEmitter.fire(room);

			this.notificationService.notify({
				severity: Severity.Info,
				message: `Created collaboration room: ${roomName}`,
			});

			return room;
		} catch (error) {
			this.setStatus(CollaborationStatus.ERROR);
			const msg = error instanceof Error ? error.message : String(error);
			this.notificationService.notify({
				severity: Severity.Error,
				message: `Failed to create room: ${msg}`,
			});
			throw error;
		}
	}

	async joinRoom(roomId: string, userName: string): Promise<RoomInfo> {
		try {
			this.userName = userName;
			this.setStatus(CollaborationStatus.CONNECTING);

			const room = await this.backendChannel.call('joinRoom', {
				roomId,
				userId: this.userId,
				userName,
			});

			this.currentRoom = room;

			// Register room for automatic data cleanup (if not already registered)
			const cleanupManager = getRoomDataCleanupManager();
			const existingData = cleanupManager.getRoomData(roomId);
			if (!existingData) {
				cleanupManager.registerRoom(roomId);
				console.log(`[Collaboration] Room ${roomId} registered for automatic data cleanup`);
			}

			await this.initializeSignaling();
			this.setStatus(CollaborationStatus.CONNECTED);
			this.startHeartbeat();
			this.roomEmitter.fire(room);

			this.notificationService.notify({
				severity: Severity.Info,
				message: `Joined collaboration room: ${room.roomName}`,
			});

			return room;
		} catch (error) {
			this.setStatus(CollaborationStatus.ERROR);
			const msg = error instanceof Error ? error.message : String(error);
			this.notificationService.notify({
				severity: Severity.Error,
				message: `Failed to join room: ${msg}`,
			});
			throw error;
		}
	}

	async leaveRoom(): Promise<void> {
		try {
			if (this.currentRoom) {
				const roomId = this.currentRoom.roomId;
				const cleanupManager = getRoomDataCleanupManager();

				await this.backendChannel.call('leaveRoom', {
					roomId,
					userId: this.userId,
				});

				// Close room and schedule automatic data deletion
				console.log(`[Collaboration] Room ${roomId} closed, scheduling automatic data cleanup`);
				cleanupManager.closeRoom(roomId, 5000); // Delete data after 5 seconds (graceful shutdown)
			}

			this.cleanupSignaling();
			this.currentRoom = null;
			this.peers.clear();
			this.setStatus(CollaborationStatus.IDLE);
			this.roomEmitter.fire(null);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			this.notificationService.notify({
				severity: Severity.Warning,
				message: `Error leaving room: ${msg}`,
			});
		}
	}

	getCurrentRoom(): RoomInfo | null {
		return this.currentRoom;
	}

	getStatus(): CollaborationStatus {
		return this.status;
	}

	getPeers(): PeerPresence[] {
		return Array.from(this.peers.values());
	}

	// Event listeners
	onRoomChanged(callback: (room: RoomInfo | null) => void) {
		const disposable = this.roomEmitter.event(callback);
		return () => disposable.dispose();
	}

	onStatusChanged(callback: (status: CollaborationStatus) => void) {
		const disposable = this.statusEmitter.event(callback);
		return () => disposable.dispose();
	}

	onPeerPresence(callback: (peer: PeerPresence) => void) {
		const disposable = this.peerEmitter.event(callback);
		return () => disposable.dispose();
	}

	onEditReceived(callback: (edit: CollaborativeEdit) => void) {
		const disposable = this.editEmitter.event(callback);
		return () => disposable.dispose();
	}

	onCursorUpdate(callback: (cursor: CursorUpdate) => void) {
		const disposable = this.cursorEmitter.event(callback);
		return () => disposable.dispose();
	}

	onChatMessage(callback: (message: SharedChatMessage) => void) {
		const disposable = this.chatEmitter.event(callback);
		return () => disposable.dispose();
	}

	// Broadcast operations
	async broadcastEdit(edit: CollaborativeEdit): Promise<void> {
		if (!this.currentRoom) throw new Error('Not in a room');
		edit.userId = this.userId;
		edit.timestamp = Date.now();
		edit.operationId = generateUuid();

		const message: SyncMessage = {
			type: 'edit',
			data: edit,
			timestamp: Date.now(),
		};

		await this.broadcastViaDataChannels(message);
	}

	async broadcastCursor(cursor: CursorUpdate): Promise<void> {
		if (!this.currentRoom) throw new Error('Not in a room');
		cursor.userId = this.userId;
		cursor.timestamp = Date.now();

		const message: SyncMessage = {
			type: 'cursor',
			data: cursor,
			timestamp: Date.now(),
		};

		await this.broadcastViaDataChannels(message);
	}

	async broadcastChat(message: SharedChatMessage): Promise<void> {
		if (!this.currentRoom) throw new Error('Not in a room');
		message.userId = this.userId;
		message.timestamp = Date.now();

		const syncMsg: SyncMessage = {
			type: 'chat',
			data: message,
			timestamp: Date.now(),
		};

		await this.broadcastViaDataChannels(syncMsg);
	}

	async broadcastFileSync(snapshot: FileSnapshot): Promise<void> {
		if (!this.currentRoom) throw new Error('Not in a room');
		snapshot.userId = this.userId;
		snapshot.timestamp = Date.now();

		const message: SyncMessage = {
			type: 'file-sync',
			data: snapshot,
			timestamp: Date.now(),
		};

		await this.broadcastViaDataChannels(message);
	}

	async broadcastPresence(presence: PeerPresence): Promise<void> {
		if (!this.currentRoom) throw new Error('Not in a room');

		const message: SyncMessage = {
			type: 'presence',
			data: presence,
			timestamp: Date.now(),
		};

		await this.broadcastViaDataChannels(message);
	}

	async requestFileSynchronization(fileUri: string): Promise<FileSnapshot> {
		// For now, return empty snapshot - will be filled by peer response
		return {
			fileUri,
			version: 0,
			content: '',
			timestamp: Date.now(),
			userId: this.userId,
		};
	}

	// ==================== PRIVATE METHODS ====================

	private async initializeSignaling(): Promise<void> {
		if (!this.currentRoom) return;

		try {
			this.reconnectAttempts = 0;
			this.reconnectDelay = this.INITIAL_RECONNECT_DELAY;

			this.signalingWs = new WebSocket(this.signalingServer);

			this.signalingWs.onopen = () => {
				console.log('[Collaboration] Signaling connected');
				this.reconnectAttempts = 0;
				this.reconnectDelay = this.INITIAL_RECONNECT_DELAY;
				this.setStatus(CollaborationStatus.CONNECTED);

				this.sendSignalingMessage('join-room', {
					roomId: this.currentRoom!.roomId,
					userId: this.userId,
					userName: this.userName,
				});

				// Flush operation queue
				this.flushOperationQueue();
			};

			this.signalingWs.onmessage = (event) => {
				try {
					this.handleSignalingMessage(JSON.parse(event.data));
				} catch (error) {
					console.error('[Collaboration] Error handling signaling message:', error);
				}
			};

			this.signalingWs.onerror = (error) => {
				console.error('[Collaboration] Signaling error:', error);
				this.setStatus(CollaborationStatus.ERROR);
				this.notificationService.notify({
					severity: Severity.Warning,
					message: 'Collaboration connection error. Attempting to reconnect...',
				});
			};

			this.signalingWs.onclose = () => {
				console.log('[Collaboration] Signaling disconnected');
				if (this.status === CollaborationStatus.CONNECTED || this.status === CollaborationStatus.ERROR) {
					this.setStatus(CollaborationStatus.DISCONNECTED);
					this.scheduleReconnect();
				}
			};
		} catch (error) {
			console.error('[Collaboration] Failed to initialize signaling:', error);
			this.scheduleReconnect();
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
			console.error('[Collaboration] Max reconnection attempts reached');
			this.setStatus(CollaborationStatus.ERROR);
			this.notificationService.notify({
				severity: Severity.Error,
				message: 'Failed to reconnect to collaboration. Please leave and rejoin the room.',
			});
			return;
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectAttempts++;
		this.reconnectTimer = setTimeout(() => {
			console.log(`[Collaboration] Reconnecting (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
			this.initializeSignaling().catch((error) => {
				console.error('[Collaboration] Reconnect failed:', error);
			});
		}, this.reconnectDelay);

		// Exponential backoff: double delay each attempt, cap at 30 seconds
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
	}

	private flushOperationQueue(): void {
		if (this.operationQueue.length === 0) return;

		console.log(`[Collaboration] Flushing ${this.operationQueue.length} queued operations`);
		const queue = [...this.operationQueue];
		this.operationQueue = [];

		for (const op of queue) {
			try {
				this.sendSignalingMessage(op.type, op.data);
			} catch (error) {
				console.error('[Collaboration] Error flushing operation:', error);
				this.operationQueue.push(op);
			}
		}
	}

	private queueOperation(type: string, data: any): void {
		if (this.operationQueue.length >= this.MAX_QUEUE_SIZE) {
			console.warn('[Collaboration] Operation queue full, dropping oldest');
			this.operationQueue.shift();
		}

		this.operationQueue.push({
			type,
			data,
			timestamp: Date.now(),
		});
	}

	private cleanupSignaling(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.signalingWs) {
			this.signalingWs.close();
			this.signalingWs = null;
		}

		// Clear heartbeat timeouts
		for (const timeout of this.heartbeatTimeoutMap.values()) {
			clearTimeout(timeout);
		}
		this.heartbeatTimeoutMap.clear();

		// Close all WebRTC connections
		for (const [, pc] of this.peerConnections) {
			try {
				pc.close();
			} catch (error) {
				console.warn('[Collaboration] Error closing peer connection:', error);
			}
		}
		this.peerConnections.clear();
		this.dataChannels.clear();

		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	private sendSignalingMessage(type: string, data: any): void {
		if (this.signalingWs && this.signalingWs.readyState === WebSocket.OPEN) {
			try {
				this.signalingWs.send(JSON.stringify({
					type,
					roomId: this.currentRoom?.roomId,
					userId: this.userId,
					data,
					timestamp: Date.now(),
				}));
			} catch (error) {
				console.error('[Collaboration] Error sending signaling message:', error);
				this.queueOperation(type, data);
			}
		} else if (this.status === CollaborationStatus.DISCONNECTED) {
			// Queue message if disconnected (will flush on reconnect)
			this.queueOperation(type, data);
		} else {
			console.warn('[Collaboration] Signaling not connected, queuing message');
			this.queueOperation(type, data);
		}
	}

	private async handleSignalingMessage(message: any): Promise<void> {
		const { type, userId, data } = message;

		try {
			switch (type) {
				case 'peer-joined':
					await this.handlePeerJoined(userId, data);
					break;
				case 'peer-left':
					this.handlePeerLeft(userId);
					break;
				case 'sdp-offer':
					await this.handleSdpOffer(userId, data);
					break;
				case 'sdp-answer':
					await this.handleSdpAnswer(userId, data);
					break;
				case 'ice-candidate':
					await this.handleIceCandidate(userId, data);
					break;
				case 'heartbeat':
					this.handleHeartbeat(userId);
					break;
			}
		} catch (error) {
			console.error('[Collaboration] Error handling signaling message:', error);
		}
	}

	private handleHeartbeat(userId: string): void {
		// Clear existing timeout for this peer
		const existingTimeout = this.heartbeatTimeoutMap.get(userId);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Set new timeout - if no heartbeat in 15s, mark peer as offline
		const timeout = setTimeout(() => {
			console.warn(`[Collaboration] Peer ${userId} heartbeat timeout`);
			const peer = this.peers.get(userId);
			if (peer) {
				this.peers.set(userId, { ...peer, isOnline: false });
				this.peerEmitter.fire(this.peers.get(userId)!);
			}
			this.heartbeatTimeoutMap.delete(userId);
		}, this.HEARTBEAT_TIMEOUT);

		this.heartbeatTimeoutMap.set(userId, timeout);
	}

	private async handlePeerJoined(userId: string, data: any): Promise<void> {
		if (userId === this.userId) return; // Ignore self

		console.log('[Collaboration] Peer joined:', userId);

		// Create WebRTC connection
		const pc = new RTCPeerConnection({
			iceServers: [
				{ urls: ['stun:stun.l.google.com:19302'] },
				{ urls: ['stun:stun1.l.google.com:19302'] },
			],
		});

		this.peerConnections.set(userId, pc);

		// Create data channel for sending data
		const dc = pc.createDataChannel('collaboration', {
			ordered: true,
		});
		this.setupDataChannel(dc, userId);

		// Handle incoming data channels
		pc.ondatachannel = (event) => {
			this.setupDataChannel(event.channel, userId);
		};

		// Handle ICE candidates
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				this.sendSignalingMessage('ice-candidate', {
					candidate: event.candidate.candidate,
					sdpMLineIndex: event.candidate.sdpMLineIndex,
					sdpMid: event.candidate.sdpMid,
				});
			}
		};

		// Create and send offer
		try {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			this.sendSignalingMessage('sdp-offer', {
				sdp: offer.sdp,
			});
		} catch (error) {
			console.error('[Collaboration] Error creating offer:', error);
		}
	}

	private handlePeerLeft(userId: string): void {
		console.log('[Collaboration] Peer left:', userId);

		// Remove peer data from cleanup manager
		if (this.currentRoom) {
			const cleanupManager = getRoomDataCleanupManager();
			cleanupManager.removePeerData(this.currentRoom.roomId, userId);
		}

		const pc = this.peerConnections.get(userId);
		if (pc) {
			pc.close();
			this.peerConnections.delete(userId);
		}
		this.dataChannels.delete(userId);
		this.peers.delete(userId);
		this.peerEmitter.fire({ ...this.peers.get(userId), isOnline: false } as any);
	}

	private async handleSdpOffer(userId: string, data: any): Promise<void> {
		try {
			let pc = this.peerConnections.get(userId);
			if (!pc) {
				pc = new RTCPeerConnection({
					iceServers: [
						{ urls: ['stun:stun.l.google.com:19302'] },
						{ urls: ['stun:stun1.l.google.com:19302'] },
					],
				});
				this.peerConnections.set(userId, pc);

				pc.ondatachannel = (event) => {
					this.setupDataChannel(event.channel, userId);
				};

				pc.onicecandidate = (event) => {
					if (event.candidate) {
						this.sendSignalingMessage('ice-candidate', {
							candidate: event.candidate.candidate,
							sdpMLineIndex: event.candidate.sdpMLineIndex,
							sdpMid: event.candidate.sdpMid,
						});
					}
				};
			}

			await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			this.sendSignalingMessage('sdp-answer', { sdp: answer.sdp });
		} catch (error) {
			console.error('[Collaboration] Error handling SDP offer:', error);
		}
	}

	private async handleSdpAnswer(userId: string, data: any): Promise<void> {
		try {
			const pc = this.peerConnections.get(userId);
			if (pc) {
				await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
			}
		} catch (error) {
			console.error('[Collaboration] Error handling SDP answer:', error);
		}
	}

	private async handleIceCandidate(userId: string, data: any): Promise<void> {
		try {
			const pc = this.peerConnections.get(userId);
			if (pc && data.candidate) {
				await pc.addIceCandidate(
					new RTCIceCandidate({
						candidate: data.candidate,
						sdpMLineIndex: data.sdpMLineIndex,
						sdpMid: data.sdpMid,
					})
				);
			}
		} catch (error) {
			console.error('[Collaboration] Error adding ICE candidate:', error);
		}
	}

	private setupDataChannel(dc: RTCDataChannel, userId: string): void {
		dc.onopen = () => {
			console.log('[Collaboration] Data channel opened with', userId);
			this.dataChannels.set(userId, dc);
		};

		dc.onmessage = (event) => {
			this.handleDataChannelMessage(JSON.parse(event.data), userId);
		};

		dc.onclose = () => {
			console.log('[Collaboration] Data channel closed with', userId);
			this.dataChannels.delete(userId);
		};

		dc.onerror = (error) => {
			console.error('[Collaboration] Data channel error:', error);
		};
	}

	private handleDataChannelMessage(message: SyncMessage, fromUserId: string): void {
		switch (message.type) {
			case 'edit':
				this.editEmitter.fire(message.data as CollaborativeEdit);
				break;
			case 'cursor':
				this.cursorEmitter.fire(message.data as CursorUpdate);
				break;
			case 'chat':
				this.chatEmitter.fire(message.data as SharedChatMessage);
				break;
			case 'file-sync':
				// Handle file sync request/response
				break;
			case 'presence':
				const presence = message.data as PeerPresence;
				this.peers.set(presence.userId, presence);
				this.peerEmitter.fire(presence);
				break;
		}
	}

	private async broadcastViaDataChannels(message: SyncMessage): Promise<void> {
		const payload = JSON.stringify(message);
		const errors: string[] = [];

		for (const [userId, dc] of this.dataChannels) {
			try {
				if (dc.readyState === 'open') {
					dc.send(payload);
				}
			} catch (error) {
				errors.push(userId);
			}
		}

		if (errors.length > 0) {
			console.warn('[Collaboration] Failed to send to peers:', errors);
		}
	}

	private setStatus(newStatus: CollaborationStatus): void {
		if (this.status !== newStatus) {
			this.status = newStatus;
			console.log(`[Collaboration] Status changed: ${newStatus}`);
			this.statusEmitter.fire(newStatus);
		}
	}

	private startHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.heartbeatInterval = setInterval(() => {
			if (this.currentRoom && this.status === CollaborationStatus.CONNECTED) {
				this.broadcastPresence({
					userId: this.userId,
					userName: this.userName,
					isHost: this.userId === this.currentRoom.hostId,
					connectedAt: this.currentRoom.createdAt,
					color: this.generateUserColor(this.userId),
					isOnline: true,
					lastHeartbeat: Date.now(),
				}).catch((error) => {
					if (this.status === CollaborationStatus.CONNECTED) {
						console.warn('[Collaboration] Heartbeat failed:', error);
					}
				});
			}
		}, 5000) as any;
	}

	private generateUserColor(userId: string): string {
		const colors = [
			'#FF6B6B',
			'#4ECDC4',
			'#45B7D1',
			'#FFA07A',
			'#98D8C8',
			'#F7DC6F',
			'#BB8FCE',
			'#85C1E2',
		];
		const hash = userId.charCodeAt(0);
		return colors[hash % colors.length];
	}

	override dispose(): void {
		// Cleanup current room if still active
		if (this.currentRoom) {
			const cleanupManager = getRoomDataCleanupManager();
			console.log(
				`[Collaboration] Disposing service, cleaning up room data for ${this.currentRoom.roomId}`
			);
			cleanupManager.deleteRoomData(this.currentRoom.roomId);
		}

		this.cleanupSignaling();
		super.dispose();
	}
}

registerSingleton(ICollaborationService, CollaborationService, InstantiationType.Eager);
