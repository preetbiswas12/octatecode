/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Pure P2P Service for managing collaboration rooms and operations
 * No database dependencies - only P2P backend for room metadata and signaling
 * Operations sync directly between peers via WebRTC
 */
export interface CollaborationRoom {
	id: number;
	roomId: string;
	name: string;
	fileId: string;
	host: string;
	content?: string;
	version: number;
	createdAt: string;
	updatedAt: string;
}

export interface CollaborationSession {
	id: number;
	roomId: string;
	userId: string;
	userName: string;
	joinedAt: string;
	active: boolean;
}

class SupabaseService {
	// P2P Backend API endpoint (REQUIRED - no fallback to database)
	private backendUrl_: string | null = null;

	constructor() {
		// Don't check the URL here - defer until first use
		// This allows preload injection time to complete
		console.log('[SupabaseService] Initializing (URL will be resolved on first use)');
	}

	/**
	 * Get backend URL lazily - resolves on first use, not in constructor
	 * This allows preload injection time to inject the URL
	 */
	private getBackendUrl(): string {
		if (this.backendUrl_) {
			return this.backendUrl_;
		}

		// Get P2P backend URL from window config (check now, after injection should have completed)
		const envBackendUrl = (window as any).__COLLABORATION_BACKEND_URL__;

		// Check if we're in a development/local environment
		const isDevelopment =
			window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1' ||
			window.location.hostname === '::1' ||
			window.location.href.includes('vscode-file://');

		if (!envBackendUrl && !isDevelopment) {
			console.warn('⚠️ P2P Backend URL not configured. Set window.__COLLABORATION_BACKEND_URL__');
		}

		if (envBackendUrl) {
			this.backendUrl_ = envBackendUrl;
			console.log('[SupabaseService] ✓ Using injected backend URL:', envBackendUrl);
		} else {
			// Fallback: construct from current location
			const protocol = window.location.protocol;
			const host = (window as any).__COLLABORATION_BACKEND_HOST__ || window.location.host;
			this.backendUrl_ = `${protocol}//${host}`;
			console.log('[SupabaseService] Using fallback backend URL:', this.backendUrl_);
		}

		return this.backendUrl_!;
	}

	/**
	 * Initialize P2P service
	 * Validates P2P backend connectivity
	 */
	async initialize(): Promise<void> {
		try {
			// Test P2P backend connectivity
			const response = await fetch(`${this.getBackendUrl()}/health`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				const health = await response.json();
				console.log('✓ P2P Backend connected');
				console.log('  - Backend URL:', this.getBackendUrl());
				console.log('  - Status:', health.status);
				console.log('  - Memory:', health.memory);
			} else {
				console.warn('Failed to fetch config from backend:', response.status);
			}
		} catch (error) {
			console.warn('Backend config fetch failed, using fallback credentials:', error);
		}
	}

	/**
	 * Generate a unique room ID
	 */
	private generateRoomId(): string {
		return Math.random().toString(36).substring(2, 9).toUpperCase();
	}

	/**
	 * Parse room data from API response
	 */
	private parseRoom(room: any): CollaborationRoom {
		return {
			id: room.id,
			roomId: room.room_id,
			name: room.name,
			fileId: room.file_id,
			host: room.host,
			content: room.content,
			version: room.version || 0,
			createdAt: room.created_at,
			updatedAt: room.updated_at
		};
	}

	/**
	 * Create a new collaboration room
	 */
	async createRoom(roomName: string, hostName: string, hostId: string, fileId?: string): Promise<CollaborationRoom> {
		const roomId = this.generateRoomId();
		const now = new Date().toISOString();

		// Match actual database schema
		const roomData: any = {
			room_id: roomId,
			name: roomName,
			file_id: fileId || 'default',
			host: hostName,
			content: '',
			version: 0,
			created_at: now,
			updated_at: now
		};

		try {
			// Try backend API first using correct endpoint: POST /api/rooms
			try {
				const backendResponse = await fetch(`${this.getBackendUrl()}/api/rooms`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(roomData)
				});
				if (backendResponse.ok) {
					const result = await backendResponse.json();
					console.log('✓ Room created via backend:', result);
					return this.parseRoom(result.data || result);
				} else {
					const errorData = await backendResponse.text();
					console.warn('Backend API returned error:', backendResponse.status, errorData);
					throw new Error(`Backend error: ${errorData}`);
				}
			} catch (backendError) {
				console.warn('Backend unavailable or error:', backendError);
				throw backendError;
			}
		} catch (error) {
			console.error('Error creating room:', error);
			throw error;
		}
	}

	/**
	 * Join an existing room
	 */
	async joinRoom(roomId: string, userId: string, userName: string): Promise<CollaborationRoom> {
		try {
			// First verify room exists using GET
			const getResponse = await fetch(`${this.getBackendUrl()}/api/rooms/${roomId}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!getResponse.ok) {
				throw new Error(`Room not found: ${roomId}`);
			}

			const roomData = await getResponse.json();
			console.log('✓ Room found:', roomData);

			// Add participant to room using POST
			const joinResponse = await fetch(`${this.getBackendUrl()}/api/rooms/${roomId}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userId,
					user_name: userName
				})
			});

			if (joinResponse.ok) {
				console.log('✓ Joined room successfully');
				return this.parseRoom(roomData.data || roomData);
			} else {
				const errorData = await joinResponse.text();
				throw new Error(`Failed to join room: ${errorData}`);
			}
		} catch (error) {
			console.error('Error joining room:', error);
			throw error;
		}
	}

	/**
	 * End collaboration session
	 * Uses POST /api/rooms/:roomId/leave endpoint
	 */
	async endSession(roomId: string, userId?: string): Promise<void> {
		try {
			const endpoint = userId
				? `${this.getBackendUrl()}/api/rooms/${roomId}/leave`
				: `${this.getBackendUrl()}/api/rooms/${roomId}/leave`;

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userId || 'system'
				})
			});

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(`Failed to end session: ${errorData}`);
			}

			console.log('✓ Collaboration session ended');
		} catch (error) {
			console.error('Error ending session:', error);
			throw error;
		}
	}

	/**
	 * Get room by ID
	 * Pure P2P: Uses backend API only, no database fallback
	 */
	async getRoom(roomId: string): Promise<CollaborationRoom | null> {
		try {
			// P2P backend API: GET /api/rooms/:roomId
			const response = await fetch(`${this.getBackendUrl()}/api/rooms/${roomId}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				if (response.status === 404) {
					console.warn('Room not found:', roomId);
				} else {
					console.warn('Backend error:', response.status);
				}
				return null;
			}

			const result = await response.json();
			return this.parseRoom(result.data || result);
		} catch (error) {
			console.error('Error getting room:', error);
			return null;
		}
	}

	/**
	 * Get all active participants in a room
	 * Pure P2P: Uses backend /peers endpoint
	 */
	async getActiveSessions(roomId: string): Promise<CollaborationSession[]> {
		try {
			// P2P backend API: GET /api/rooms/:roomId/peers
			const response = await fetch(
				`${this.getBackendUrl()}/api/rooms/${roomId}/peers`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			if (!response.ok) {
				console.warn('Failed to get peers:', response.status);
				return [];
			}

			const peers = await response.json();
			return (peers || []).map((p: any) => ({
				id: p.id || 0,
				roomId: roomId,
				userId: p.user_id || p.userId,
				userName: p.user_name || p.userName,
				joinedAt: p.joined_at || new Date().toISOString(),
				active: true
			}));
		} catch (error) {
			console.error('Error getting active sessions:', error);
			return [];
		}
	}

	/**
	 * Save document changes to operations table
	 * Uses POST /api/rooms/:roomId/operations endpoint
	 */
	async saveDocumentChanges(roomId: string, userId: string, changes: string, version: number): Promise<void> {
		try {
			const operationId = `op-${Date.now()}-${Math.random().toString(36).substring(7)}`;

			const response = await fetch(`${this.getBackendUrl()}/api/rooms/${roomId}/operations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					operation_id: operationId,
					user_id: userId,
					data: changes,
					version: version
				})
			});

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(`Failed to save operation: ${errorData}`);
			}

			console.log('✓ Operation saved');
		} catch (error) {
			console.error('Error saving document changes:', error);
			throw error;
		}
	}

	/**
	 * Get document history for a room
	 * Pure P2P: Uses backend /operations endpoint
	 */
	async getDocumentHistory(roomId: string): Promise<any[]> {
		try {
			// P2P backend API: GET /api/rooms/:roomId/operations
			const response = await fetch(
				`${this.getBackendUrl()}/api/rooms/${roomId}/operations`,
				{
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			if (!response.ok) {
				console.warn('Failed to fetch operation history:', response.status);
				return [];
			}

			return await response.json();
		} catch (error) {
			console.error('Error getting document history:', error);
			return [];
		}
	}
}

// Export singleton instance
export const supabaseService = new SupabaseService();
