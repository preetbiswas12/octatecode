/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRemoteUser, IPresenceUpdate, generateColor } from './collaborationTypes.js';
import { Emitter, Event } from '../../../../base/common/event.js';

/**
 * Service for tracking remote users' presence, cursors, and activity
 */
export class PresenceService {
	private _remoteUsers: Map<string, IRemoteUser> = new Map();
	private _userColors: Map<string, string> = new Map();
	private _presenceUpdateTimeout: NodeJS.Timeout | null = null;
	private _throttleDelay: number = 50; // milliseconds

	private readonly _onPresenceUpdated = new Emitter<IRemoteUser>();
	public readonly onPresenceUpdated: Event<IRemoteUser> = this._onPresenceUpdated.event;

	private readonly _onUserAdded = new Emitter<IRemoteUser>();
	public readonly onUserAdded: Event<IRemoteUser> = this._onUserAdded.event;

	private readonly _onUserRemoved = new Emitter<string>();
	public readonly onUserRemoved: Event<string> = this._onUserRemoved.event;

	/**
	 * Add or update a remote user
	 */
	public updateUser(userId: string, userName: string): void {
		if (!this._remoteUsers.has(userId)) {
			// New user
			const color = generateColor(userId);
			const user: IRemoteUser = {
				userId,
				userName,
				color,
				cursorPosition: 0,
				isActive: true,
				lastSeen: Date.now()
			};

			this._remoteUsers.set(userId, user);
			this._userColors.set(userId, color);
			this._onUserAdded.fire(user);
		} else {
			// Update existing user
			const user = this._remoteUsers.get(userId)!;
			user.isActive = true;
			user.lastSeen = Date.now();
		}
	}

	/**
	 * Update presence information for a remote user
	 */
	public updatePresence(update: IPresenceUpdate): void {
		const user = this._remoteUsers.get(update.userId);

		if (!user) {
			// Create user if doesn't exist
			this.updateUser(update.userId, update.userName);
		}

		const user_ = this._remoteUsers.get(update.userId)!;
		user_.cursorPosition = update.cursorPosition;
		user_.selectionStart = update.selectionStart;
		user_.selectionEnd = update.selectionEnd;
		user_.isActive = update.isActive;
		user_.lastSeen = Date.now();

		// Throttle presence updates to reduce UI thrashing
		if (this._presenceUpdateTimeout) {
			clearTimeout(this._presenceUpdateTimeout);
		}

		this._presenceUpdateTimeout = setTimeout(() => {
			this._onPresenceUpdated.fire(user_);
		}, this._throttleDelay);
	}

	/**
	 * Remove a remote user
	 */
	public removeUser(userId: string): void {
		if (this._remoteUsers.has(userId)) {
			this._remoteUsers.delete(userId);
			this._userColors.delete(userId);
			this._onUserRemoved.fire(userId);
		}
	}

	/**
	 * Get a specific remote user
	 */
	public getUser(userId: string): IRemoteUser | undefined {
		return this._remoteUsers.get(userId);
	}

	/**
	 * Get all remote users
	 */
	public getAllUsers(): IRemoteUser[] {
		return Array.from(this._remoteUsers.values());
	}

	/**
	 * Get color for a user
	 */
	public getColorForUser(userId: string): string {
		if (!this._userColors.has(userId)) {
			const color = generateColor(userId);
			this._userColors.set(userId, color);
			return color;
		}
		return this._userColors.get(userId)!;
	}

	/**
	 * Clear all remote users (on disconnect)
	 */
	public clearUsers(): void {
		const userIds = Array.from(this._remoteUsers.keys());
		for (const userId of userIds) {
			this.removeUser(userId);
		}
	}

	/**
	 * Get statistics
	 */
	public getStats(): { userCount: number; activeUsers: number } {
		const allUsers = Array.from(this._remoteUsers.values());
		return {
			userCount: allUsers.length,
			activeUsers: allUsers.filter(u => u.isActive).length
		};
	}

	/**
	 * Dispose resources
	 */
	public dispose(): void {
		if (this._presenceUpdateTimeout) {
			clearTimeout(this._presenceUpdateTimeout);
		}
		this._remoteUsers.clear();
		this._userColors.clear();
		this._onPresenceUpdated.dispose();
		this._onUserAdded.dispose();
		this._onUserRemoved.dispose();
	}
}
