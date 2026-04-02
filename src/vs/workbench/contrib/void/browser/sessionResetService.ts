/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { generateUuid } from '../../../../base/common/uuid.js';

export const ISessionResetService = createDecorator<ISessionResetService>('sessionResetService');

export interface ISessionResetService {
	readonly _serviceBrand: undefined;

	/**
	 * Reset the entire session, clearing all user data, IDs, and storage
	 * Generates new device ID and user ID
	 */
	resetSession(): Promise<void>;

	/**
	 * Get the current device ID
	 */
	getDeviceId(): string;

	/**
	 * Get the current user ID
	 */
	getUserId(): string;

	/**
	 * Clear all stored data except device/user IDs
	 */
	clearData(): Promise<void>;

	/**
	 * Reset to fresh state (onboarding = incomplete)
	 */
	resetToFreshState(): Promise<void>;
}

/**
 * Service for managing session resets, user IDs, device IDs, and data clearance
 */
export class SessionResetService extends Disposable implements ISessionResetService {
	readonly _serviceBrand: undefined;

	private _deviceId: string;
	private _userId: string;

	private readonly DEVICE_ID_KEY = 'void-device-id';
	private readonly USER_ID_KEY = 'void-user-id';
	private readonly SESSION_CREATED_KEY = 'void-session-created';

	constructor(
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();

		// Initialize or load device and user IDs
		this._deviceId = this._getOrCreateDeviceId();
		this._userId = this._getOrCreateUserId();
	}

	/**
	 * Generate new UUIDs for device and user
	 */
	private _generateNewIds(): { deviceId: string, userId: string } {
		const deviceId = generateUuid();
		const userId = generateUuid();
		return { deviceId, userId };
	}

	/**
	 * Get or create device ID
	 */
	private _getOrCreateDeviceId(): string {
		let deviceId = this.storageService.get(this.DEVICE_ID_KEY, StorageScope.APPLICATION);

		if (!deviceId) {
			deviceId = generateUuid();
			this.storageService.store(this.DEVICE_ID_KEY, deviceId, StorageScope.APPLICATION, StorageTarget.MACHINE);
			console.log('[SessionReset] Created new device ID:', deviceId);
		}

		return deviceId || generateUuid();
	}

	/**
	 * Get or create user ID
	 */
	private _getOrCreateUserId(): string {
		let userId = this.storageService.get(this.USER_ID_KEY, StorageScope.APPLICATION);

		if (!userId) {
			userId = generateUuid();
			this._setUserId(userId);
			console.log('[SessionReset] Created new user ID:', userId);
		}

		return userId || generateUuid();
	}

	/**
	 * Store the user ID
	 */
	private _setUserId(userId: string): void {
		this.storageService.store(this.USER_ID_KEY, userId, StorageScope.APPLICATION, StorageTarget.MACHINE);
		this._userId = userId;
	}

	/**
	 * Store the device ID
	 */
	private _setDeviceId(deviceId: string): void {
		this.storageService.store(this.DEVICE_ID_KEY, deviceId, StorageScope.APPLICATION, StorageTarget.MACHINE);
		this._deviceId = deviceId;
	}

	/**
	 * Get current device ID
	 */
	getDeviceId(): string {
		return this._deviceId;
	}

	/**
	 * Get current user ID
	 */
	getUserId(): string {
		return this._userId;
	}

	/**
	 * Clear all stored data (workspace, chat, collaboration data)
	 */
	async clearData(): Promise<void> {
		console.log('[SessionReset] Clearing all stored data...');

		// Get all keys from storage
		const allKeys = this.storageService.keys(StorageScope.APPLICATION, StorageTarget.MACHINE);

		for (const key of allKeys) {
			// Don't clear device and user IDs during data clear
			if (key === this.DEVICE_ID_KEY || key === this.USER_ID_KEY) {
				continue;
			}

			// Clear application-scoped data
			this.storageService.remove(key, StorageScope.APPLICATION);
		}

		// Also clear workspace-scoped data
		const workspaceKeys = this.storageService.keys(StorageScope.WORKSPACE, StorageTarget.MACHINE);
		for (const key of workspaceKeys) {
			this.storageService.remove(key, StorageScope.WORKSPACE);
		}

		console.log('[SessionReset] All data cleared successfully');
	}

	/**
	 * Reset entire session:
	 * 1. Generate new device ID
	 * 2. Generate new user ID
	 * 3. Clear all stored data
	 * 4. Mark session as fresh
	 */
	async resetSession(): Promise<void> {
		console.log('[SessionReset] Resetting session...');

		try {
			// Generate new IDs
			const { deviceId, userId } = this._generateNewIds();
			this._setDeviceId(deviceId);
			this._setUserId(userId);

			console.log('[SessionReset] New device ID:', deviceId);
			console.log('[SessionReset] New user ID:', userId);

			// Clear all data
			await this.clearData();

			// Mark session as just created
			this.storageService.store(
				this.SESSION_CREATED_KEY,
				new Date().toISOString(),
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			// Update window globals with new IDs (for PostHog metrics)
			(window as any).void = (window as any).void || {};
			(window as any).void.deviceId = deviceId;
			(window as any).void.userId = userId;

			console.log('[SessionReset] ✓ Session reset complete - New IDs generated and data cleared');
		} catch (error) {
			console.error('[SessionReset] ✗ Failed to reset session:', error);
			throw error;
		}
	}

	/**
	 * Reset to fresh state for onboarding:
	 * 1. Keep device and user IDs
	 * 2. Clear data but mark onboarding as incomplete
	 * 3. Force onboarding to show again
	 */
	async resetToFreshState(): Promise<void> {
		console.log('[SessionReset] Resetting to fresh state for onboarding...');

		try {
			// Clear all data except IDs
			await this.clearData();

			// Force onboarding to show
			this.storageService.store(
				'void-force-show-onboarding',
				'true',
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			// Mark onboarding as not complete
			this.storageService.store(
				'isOnboardingComplete',
				'false',
				StorageScope.APPLICATION,
				StorageTarget.MACHINE
			);

			console.log('[SessionReset] ✓ Fresh state reset complete - Onboarding ready to show');
		} catch (error) {
			console.error('[SessionReset] ✗ Failed to reset to fresh state:', error);
			throw error;
		}
	}
}
