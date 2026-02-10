/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Core interfaces and data models for real-time collaborative code editing
 */

export interface IOperation {
	readonly type: 'insert' | 'delete';
	readonly position: number;
	readonly content?: string; // For insert operations
	readonly length?: number;  // For delete operations
	readonly userId: string;
	readonly timestamp: number;
	readonly version: number;
}

export interface IPresenceUpdate {
	readonly userId: string;
	readonly userName: string;
	readonly cursorPosition: number;
	readonly selectionStart?: number;
	readonly selectionEnd?: number;
	readonly isActive: boolean;
	readonly color: string;
}

export interface IRemoteUser {
	readonly userId: string;
	readonly userName: string;
	readonly color: string;
	cursorPosition: number;
	selectionStart?: number;
	selectionEnd?: number;
	isActive: boolean;
	lastSeen: number;
}

export interface ICollaborationSession {
	readonly sessionId: string;
	readonly fileId: string;
	readonly roomName: string;
	readonly host: string;
	readonly createdAt: number;
	readonly owner: string;
	readonly peerId: string;  // P2P peer identifier (required)
	version: number;
	isActive: boolean;
}

export interface ICollaborationUser {
	readonly userId: string;
	readonly userName: string;
	readonly sessionId: string;
	readonly joinedAt: number;
	isActive: boolean;
}

export enum ConnectionStatus {
	Disconnected = 'disconnected',
	Connecting = 'connecting',
	Connected = 'connected',
	Syncing = 'syncing',
	Offline = 'offline'
}

export interface ICollaborationEvent {
	type: string;
	data?: any;
	error?: Error;
}

/**
 * Generate a deterministic color from a user ID
 */
export function generateColor(userId: string): string {
	const colors = [
		'#FF6B6B', // Red
		'#4ECDC4', // Teal
		'#45B7D1', // Blue
		'#FFA07A', // Light Salmon
		'#98D8C8', // Mint
		'#F7DC6F', // Yellow
		'#BB8FCE', // Purple
		'#85C1E2'  // Light Blue
	];

	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		const char = userId.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	return colors[Math.abs(hash) % colors.length];
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
	return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
	return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
