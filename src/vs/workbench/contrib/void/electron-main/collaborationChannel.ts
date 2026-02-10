/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { IServerChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Event } from '../../../../base/common/event.js';

const P2P_BACKEND_URL = process.env.P2P_BACKEND_URL || 'http://localhost:3000/api';

export interface RoomResponse {
	roomId: string;
	roomName: string;
	hostId: string;
	hostName: string;
	peerCount: number;
	createdAt: number;
	peers: Array<{
		userId: string;
		userName: string;
		isHost: boolean;
		connectedAt: number;
	}>;
}

export class CollaborationChannel implements IServerChannel {
	private readonly MAX_RETRIES = 3;
	private readonly RETRY_DELAY = 1000; // 1 second

	constructor() { }

	listen(_: unknown, event: string): Event<any> {
		throw new Error(`Event not found: ${event}`);
	}

	async call(_: unknown, command: string, params: any): Promise<any> {
		try {
			if (command === 'createRoom') {
				return await this.createRoom(params);
			} else if (command === 'joinRoom') {
				return await this.joinRoom(params);
			} else if (command === 'leaveRoom') {
				return await this.leaveRoom(params);
			} else if (command === 'listRooms') {
				return await this.listRooms();
			} else if (command === 'getRoomInfo') {
				return await this.getRoomInfo(params);
			} else {
				throw new Error(`Command not found: ${command}`);
			}
		} catch (error) {
			console.error('[CollaborationChannel] Error:', error);
			throw error;
		}
	}

	private async fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
		try {
			const response = await fetch(url, options);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return response;
		} catch (error) {
			if (retries < this.MAX_RETRIES) {
				const delay = this.RETRY_DELAY * Math.pow(2, retries); // Exponential backoff
				console.log(`[CollaborationChannel] Retry attempt ${retries + 1}/${this.MAX_RETRIES} after ${delay}ms`);

				await new Promise(resolve => setTimeout(resolve, delay));
				return this.fetchWithRetry(url, options, retries + 1);
			}

			console.error(`[CollaborationChannel] All retry attempts failed for ${url}`, error);
			throw error;
		}
	}

	private async createRoom(params: {
		roomName: string;
		hostId: string;
		hostName: string;
	}): Promise<RoomResponse> {
		try {
			const response = await this.fetchWithRetry(`${P2P_BACKEND_URL}/rooms/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(params),
			});

			const data = await response.json();
			console.log('[CollaborationChannel] Room created:', data.roomId);
			return data;
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to create room: ${msg}`);
		}
	}

	private async joinRoom(params: {
		roomId: string;
		userId: string;
		userName: string;
	}): Promise<RoomResponse> {
		try {
			const response = await this.fetchWithRetry(
				`${P2P_BACKEND_URL}/rooms/${params.roomId}/join`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						userId: params.userId,
						userName: params.userName,
					}),
				}
			);

			const data = await response.json();
			console.log('[CollaborationChannel] Joined room:', params.roomId);
			return data;
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to join room: ${msg}`);
		}
	}

	private async leaveRoom(params: {
		roomId: string;
		userId: string;
	}): Promise<void> {
		try {
			await this.fetchWithRetry(`${P2P_BACKEND_URL}/rooms/${params.roomId}/leave`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: params.userId }),
			});
			console.log('[CollaborationChannel] Left room:', params.roomId);
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to leave room: ${msg}`);
		}
	}

	private async listRooms(): Promise<RoomResponse[]> {
		try {
			const response = await this.fetchWithRetry(`${P2P_BACKEND_URL}/rooms`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});

			const data = await response.json();
			return data.rooms || [];
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to list rooms: ${msg}`);
		}
	}

	private async getRoomInfo(params: { roomId: string }): Promise<RoomResponse> {
		try {
			const response = await this.fetchWithRetry(
				`${P2P_BACKEND_URL}/rooms/${params.roomId}`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				}
			);

			const data = await response.json();
			return data.metadata || data;
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to get room info: ${msg}`);
		}
	}
}
