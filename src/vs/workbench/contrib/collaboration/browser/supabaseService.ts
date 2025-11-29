/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Service for interacting with Supabase backend for collaboration
 * Handles room creation, joining, and session management
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
	// Backend API endpoint - should be running on localhost:3000 or production URL
	private backendUrl: string;
	// Supabase credentials from environment or .env file
	private supabaseUrl: string;
	private supabaseKey: string;
	private baseUrl: string;
	private headers: Record<string, string>;
	private configFetched: boolean = false;

	constructor() {
		// Get backend URL from environment variable or use default
		this.backendUrl = this.getEnvVariable('COLLABORATION_BACKEND_URL') || 'https://octate.qzz.io';

		// Get Supabase credentials from environment variables (or defaults)
		// These will be overridden by backend config when initialize() is called
		this.supabaseUrl = this.getEnvVariable('SUPABASE_URL') || 'https://fcsmfkwsmlinzxvqlvml.supabase.co';
		this.supabaseKey = this.getEnvVariable('SUPABASE_ANON_KEY') || 'sb_publishable_f5Aubji22o_P4OAhyLUWjQ_8JwAza51';

		// Construct base URL
		this.baseUrl = `${this.supabaseUrl}/rest/v1`;

		// Setup headers with Supabase anon key (for public access)
		this.headers = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.supabaseKey}`,
			'apikey': this.supabaseKey,
			'Prefer': 'return=representation'
		};
	}

	/**
	 * Get environment variable safely
	 * In browser context, this won't have access to process.env
	 * Instead, we cache config from backend /api/config endpoint
	 */
	private configCache: Record<string, string> = {};

	private getEnvVariable(name: string): string {
		// First check if config has been fetched and cached
		if (this.configCache[name]) {
			return this.configCache[name];
		}
		// In browser context, we can't access process.env directly
		// Config will be populated when initialize() is called
		return '';
	}

	/**
	 * Cache config from backend
	 */
	private setCachedConfig(key: string, value: string): void {
		this.configCache[key] = value;
	}

	/**
	 * Initialize service with config from backend
	 * This should be called on startup to get real credentials
	 */
	async initialize(): Promise<void> {
		if (this.configFetched) {
			console.log('✓ Collaboration service already initialized');
			return;
		}

		try {
			// Fetch configuration from backend API
			const response = await fetch(`${this.backendUrl}/api/config`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				const config = await response.json();
				console.log('✓ Backend config received:', {
					hasSupabaseUrl: !!config.supabaseUrl,
					hasSupabaseAnonKey: !!config.supabaseAnonKey,
					hasWsEndpoint: !!config.wsEndpoint
				});

				// Cache the config values
				if (config.supabaseUrl) {
					this.setCachedConfig('SUPABASE_URL', config.supabaseUrl);
					this.supabaseUrl = config.supabaseUrl;
					this.baseUrl = `${this.supabaseUrl}/rest/v1`;
				}
				if (config.supabaseAnonKey) {
					this.setCachedConfig('SUPABASE_ANON_KEY', config.supabaseAnonKey);
					this.supabaseKey = config.supabaseAnonKey;
					// Update headers with new credentials
					this.headers['Authorization'] = `Bearer ${this.supabaseKey}`;
					this.headers['apikey'] = this.supabaseKey;
				}

				this.configFetched = true;
				console.log('✓ Collaboration service initialized with backend config');
				console.log('  - Supabase URL:', this.supabaseUrl);
				console.log('  - Backend:', this.backendUrl);
				console.log('  - Credentials cached: ✓');
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
				const backendResponse = await fetch(`${this.backendUrl}/api/rooms`, {
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
			const getResponse = await fetch(`${this.backendUrl}/api/rooms/${roomId}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!getResponse.ok) {
				throw new Error(`Room not found: ${roomId}`);
			}

			const roomData = await getResponse.json();
			console.log('✓ Room found:', roomData);

			// Add participant to room using POST
			const joinResponse = await fetch(`${this.backendUrl}/api/rooms/${roomId}/join`, {
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
				? `${this.backendUrl}/api/rooms/${roomId}/leave`
				: `${this.backendUrl}/api/rooms/${roomId}/leave`;

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
	 */
	async getRoom(roomId: string): Promise<CollaborationRoom | null> {
		try {
			// Try backend API first using correct endpoint: GET /api/rooms/:roomId
			try {
				const backendResponse = await fetch(`${this.backendUrl}/api/rooms/${roomId}`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				});
				if (backendResponse.ok) {
					const result = await backendResponse.json();
					return this.parseRoom(result.data || result);
				} else if (backendResponse.status === 404) {
					console.warn('Room not found on backend');
				} else {
					console.warn('Backend API returned error:', backendResponse.status);
				}
			} catch (backendError) {
				console.warn('Backend unavailable, will try direct Supabase:', backendError);
			}

			// Fallback to direct Supabase
			if (!this.supabaseKey) {
				return null;
			}

			const response = await fetch(
				`${this.baseUrl}/collaboration_rooms?room_id=eq.${roomId}`,
				{
					method: 'GET',
					headers: this.headers
				}
			);

			if (!response.ok) {
				return null;
			}

			const rooms = await response.json();
			if (!rooms || rooms.length === 0) {
				return null;
			}

			return this.parseRoom(rooms[0]);
		} catch (error) {
			console.error('Error getting room:', error);
			return null;
		}
	}

	/**
	 * Get all active participants in a room
	 */
	async getActiveSessions(roomId: string): Promise<CollaborationSession[]> {
		try {
			const response = await fetch(
				`${this.baseUrl}/room_participants?room_id=eq.${roomId}&active=eq.true`,
				{
					method: 'GET',
					headers: this.headers
				}
			);

			if (!response.ok) {
				return [];
			}

			const participants = await response.json();
			return participants.map((p: any) => ({
				id: p.id,
				roomId: p.room_id,
				userId: p.user_id,
				userName: p.user_name,
				joinedAt: p.joined_at,
				active: p.active
			}));
		} catch (error) {
			console.error('Error getting sessions:', error);
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

			const response = await fetch(`${this.backendUrl}/api/rooms/${roomId}/operations`, {
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
	 */
	async getDocumentHistory(roomId: string): Promise<any[]> {
		try {
			const response = await fetch(
				`${this.baseUrl}/operations?room_id=eq.${roomId}&order=version.asc,created_at.asc`,
				{
					method: 'GET',
					headers: this.headers
				}
			);

			if (!response.ok) {
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
