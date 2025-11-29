/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../../base/common/event.js';
import { UserPresence } from '../websocketService.js';
import { mainWindow } from '../../../../../base/browser/window.js';

export interface UserActivityInfo {
	userId: string;
	userName: string;
	status: 'online' | 'idle' | 'offline';
	lastSeen: number;
	isEditing: boolean;
	currentFile?: string;
}

/**
 * Service for tracking user presence and activity in collaboration sessions
 */
export class PresenceTrackingService {
	private users: Map<string, UserActivityInfo> = new Map();
	private inactivityTimeout: number = 60000; // 1 minute
	private activityCheckInterval: NodeJS.Timeout | null = null;

	// Events
	private readonly _onUserOnline = new Emitter<UserActivityInfo>();
	public readonly onUserOnline: Event<UserActivityInfo> = this._onUserOnline.event;

	private readonly _onUserOffline = new Emitter<UserActivityInfo>();
	public readonly onUserOffline: Event<UserActivityInfo> = this._onUserOffline.event;

	private readonly _onUserStatusChanged = new Emitter<UserActivityInfo>();
	public readonly onUserStatusChanged: Event<UserActivityInfo> = this._onUserStatusChanged.event;

	private readonly _onUserActivityChanged = new Emitter<UserActivityInfo>();
	public readonly onUserActivityChanged: Event<UserActivityInfo> = this._onUserActivityChanged.event;

	constructor() {
		this.startActivityCheck();
	}

	/**
	 * Update user presence from server
	 */
	public updateUserPresence(presence: UserPresence): void {
		try {
			const userId = presence.userId;
			let user = this.users.get(userId);

			if (!user) {
				user = {
					userId,
					userName: presence.userName,
					status: presence.isActive ? 'online' : 'offline',
					lastSeen: presence.lastSeen,
					isEditing: false
				};
				this.users.set(userId, user);
				if (presence.isActive) {
					this._onUserOnline.fire(user);
				}
			} else {
				const oldStatus = user.status;
				user.lastSeen = presence.lastSeen;
				user.status = presence.isActive ? 'online' : 'idle';

				if (oldStatus !== user.status) {
					this._onUserStatusChanged.fire(user);
					if (presence.isActive) {
						this._onUserOnline.fire(user);
					}
				}
			}
		} catch (error) {
			console.error('Error updating user presence:', error);
		}
	}

	/**
	 * Mark user as editing
	 */
	public markUserEditing(userId: string, fileName?: string): void {
		try {
			let user = this.users.get(userId);
			if (!user) {
				return;
			}

			const wasEditing = user.isEditing;
			user.isEditing = true;
			user.lastSeen = Date.now();
			user.currentFile = fileName;

			if (!wasEditing) {
				this._onUserActivityChanged.fire(user);
			}
		} catch (error) {
			console.error('Error marking user as editing:', error);
		}
	}

	/**
	 * Mark user as idle
	 */
	public markUserIdle(userId: string): void {
		try {
			const user = this.users.get(userId);
			if (!user) {
				return;
			}

			if (user.isEditing) {
				user.isEditing = false;
				user.lastSeen = Date.now();
				this._onUserActivityChanged.fire(user);
			}
		} catch (error) {
			console.error('Error marking user as idle:', error);
		}
	}

	/**
	 * Remove user from tracking
	 */
	public removeUser(userId: string): void {
		try {
			const user = this.users.get(userId);
			if (user) {
				this.users.delete(userId);
				this._onUserOffline.fire(user);
			}
		} catch (error) {
			console.error('Error removing user:', error);
		}
	}

	/**
	 * Check inactivity and mark users as offline
	 */
	private startActivityCheck(): void {
		const checkFn = () => {
			const now = Date.now();
			const toRemove: string[] = [];

			for (const [userId, user] of this.users.entries()) {
				const timeSinceLastSeen = now - user.lastSeen;

				if (timeSinceLastSeen > this.inactivityTimeout) {
					if (user.status === 'online' || user.status === 'idle') {
						user.status = 'offline';
						this._onUserStatusChanged.fire(user);
						toRemove.push(userId);
					}
				} else if (user.status === 'offline') {
					user.status = 'idle';
					this._onUserStatusChanged.fire(user);
				}
			}

			// Remove offline users
			for (const userId of toRemove) {
				this.removeUser(userId);
			}
		};

		this.activityCheckInterval = mainWindow.setInterval(checkFn, 30000) as any;
	}

	/**
	 * Stop activity checking
	 */
	public stopActivityCheck(): void {
		if (this.activityCheckInterval) {
			mainWindow.clearInterval(this.activityCheckInterval);
			this.activityCheckInterval = null;
		}
	}

	/**
	 * Get all active users
	 */
	public getActiveUsers(): UserActivityInfo[] {
		return Array.from(this.users.values())
			.filter(u => u.status === 'online' || u.status === 'idle');
	}

	/**
	 * Get all online users
	 */
	public getOnlineUsers(): UserActivityInfo[] {
		return Array.from(this.users.values())
			.filter(u => u.status === 'online');
	}

	/**
	 * Get specific user info
	 */
	public getUser(userId: string): UserActivityInfo | undefined {
		return this.users.get(userId);
	}

	/**
	 * Get all users
	 */
	public getAllUsers(): UserActivityInfo[] {
		return Array.from(this.users.values());
	}

	/**
	 * Get user count by status
	 */
	public getUserStats(): { online: number; idle: number; offline: number } {
		let online = 0, idle = 0, offline = 0;

		for (const user of this.users.values()) {
			switch (user.status) {
				case 'online': online++; break;
				case 'idle': idle++; break;
				case 'offline': offline++; break;
			}
		}

		return { online, idle, offline };
	}

	/**
	 * Clear all users
	 */
	public clear(): void {
		for (const userId of this.users.keys()) {
			this.removeUser(userId);
		}
		this.users.clear();
	}

	/**
	 * Destroy service
	 */
	public dispose(): void {
		this.stopActivityCheck();
		this.clear();
		this._onUserOnline.dispose();
		this._onUserOffline.dispose();
		this._onUserStatusChanged.dispose();
		this._onUserActivityChanged.dispose();
	}
}

// Export singleton instance
export const presenceTrackingService = new PresenceTrackingService();
