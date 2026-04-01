/**
 * OctateCode Backend API Client
 * Handles all communication with the P2P collaboration backend
 */

export interface Room {
	id: string;
	name: string;
	peersCount: number;
	createdAt: string;
	lastActivity: string;
}

export interface ChatMessage {
	id: string;
	roomId: string;
	peerId: string;
	text: string;
	timestamp: string;
	type: 'user' | 'system' | 'error';
}

export interface CodeChange {
	id: string;
	roomId: string;
	peerId: string;
	filePath: string;
	startLine: number;
	endLine: number;
	oldCode: string;
	newCode: string;
	timestamp: string;
	applied: boolean;
}

export interface HealthResponse {
	status: string;
	timestamp: string;
	uptime?: number;
}

export interface JoinRoomResponse {
	peerId: string;
	roomId: string;
	token: string;
	peers: string[];
	signalingUrl: string;
}

export interface P2POperation {
	[key: string]: any;
}

interface P2PHandlers {
	onOperation?: (operation: P2POperation, peerId: string) => void;
	onPeerConnectionState?: (peerId: string, state: 'connected' | 'disconnected' | 'failed') => void;
}

interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: any;
	headers?: Record<string, string>;
	token?: string | null;
}

class BackendAPIClient {
	private baseUrl: string;
	private wsUrl: string;
	private token: string | null = null;
	private peerId: string | null = null;
	private ws: WebSocket | null = null;
	private messageHandlers: Map<string, (data: any) => void> = new Map();
	private connectedRoomId: string | null = null;
	private peerConnections: Map<string, RTCPeerConnection> = new Map();
	private dataChannels: Map<string, RTCDataChannel> = new Map();
	private p2pHandlers: P2PHandlers | null = null;
	private p2pSubscriptions: Array<() => void> = [];

	constructor(baseUrl?: string, wsUrl?: string) {
		const defaultHttp = 'http://localhost:3000/api';
		const defaultWs = 'ws://localhost:3001';
		const win = typeof window !== 'undefined' ? (window as any) : undefined;

		// Force P2P signaling defaults unless explicitly overridden
		this.baseUrl = baseUrl
			|| win?.VOID_P2P_API_BASE_URL
			|| win?.VITE_P2P_API_BASE_URL
			|| defaultHttp;

		this.wsUrl = wsUrl
			|| win?.VOID_P2P_WS_URL
			|| win?.VITE_P2P_WS_URL
			|| defaultWs;
	}

	private ensurePeerId(): string {
		if (!this.peerId) {
			const randomPart = Math.random().toString(36).slice(2, 10);
			this.peerId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? `peer-${(crypto as any).randomUUID()}`
				: `peer-${Date.now().toString(36)}-${randomPart}`;
		}

		return this.peerId;
	}

	/**
	 * Make HTTP request to backend
	 */
	private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
		const {
			method = 'GET',
			body = null,
			headers = {},
			token = this.token,
		} = options;

		const url = `${this.baseUrl}${endpoint}`;
		const config: RequestInit = {
			method,
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
		};

		if (token) {
			config.headers = {
				...config.headers,
				'Authorization': `Bearer ${token}`,
			};
		}

		if (body) {
			config.body = JSON.stringify(body);
		}

		try {
			const response = await fetch(url, config);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			console.error(`API Error [${method} ${endpoint}]:`, error);
			throw error;
		}
	}

	// ============ Authentication ============

	/**
	 * Register a new user
	 */
	async register(email: string, password: string, displayName: string) {
		throw new Error('User registration is not handled by the P2P signaling server');
	}

	/**
	 * Login with email/password
	 */
	async login(email: string, password: string): Promise<{ token: string; peerId: string }> {
		throw new Error('Login is not handled by the P2P signaling server');
	}

	/**
	 * Login with token (resume session)
	 */
	async validateToken(token: string): Promise<{ valid: boolean; peerId: string }> {
		return { valid: !!token, peerId: this.peerId || '' };
	}

	// ============ Health & Status ============

	/**
	 * Check backend health
	 */
	async getHealth(): Promise<HealthResponse> {
		return this.request('/health');
	}

	/**
	 * Get server metrics (Prometheus format)
	 */
	async getMetrics(): Promise<string> {
		const response = await fetch(`${this.baseUrl}/metrics`);
		return response.text();
	}

	// ============ Rooms ============

	/**
	 * List all active rooms
	 */
	async getRooms(): Promise<{ rooms: Room[] }> {
		return this.request('/rooms');
	}

	/**
	 * Get details for a specific room
	 */
	async getRoom(roomId: string): Promise<Room> {
		return this.request(`/rooms/${roomId}`);
	}

	/**
	 * Create a new room
	 */
	async createRoom(name: string, config?: Record<string, any>): Promise<Room> {
		return this.request('/rooms', {
			method: 'POST',
			body: { name, config },
			token: this.token,
		});
	}

	/**
	 * Join a room
	 */
	async joinRoom(roomId: string): Promise<JoinRoomResponse> {
		const peerId = this.ensurePeerId();
		const tokenResponse = await this.request<{ token: string }>(`/auth/token`, {
			method: 'POST',
			body: { userId: peerId, roomId },
		});

		this.token = tokenResponse.token;
		this.connectedRoomId = roomId;

		return {
			peerId,
			roomId,
			token: tokenResponse.token,
			peers: [],
			signalingUrl: this.wsUrl,
		};
	}

	/**
	 * Leave a room
	 */
	async leaveRoom(roomId: string): Promise<{ success: boolean }> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.sendWebSocketMessage('leave-room', {}, roomId);
		}
		this.connectedRoomId = null;
		return { success: true };
	}

	/**
	 * Get peers in a room
	 */
	async getRoomPeers(roomId: string): Promise<{ peers: string[] }> {
		return this.request(`/rooms/${roomId}/peers`);
	}

	// ============ Chat/Messages ============

	/**
	 * Get message history for a room
	 */
	async getMessages(roomId: string, limit?: number): Promise<{ messages: ChatMessage[] }> {
		return { messages: [] };
	}

	/**
	 * Send a message to a room
	 */
	async sendMessage(roomId: string, text: string): Promise<ChatMessage> {
		const peerId = this.ensurePeerId();
		const message = {
			id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
			roomId,
			peerId,
			text,
			timestamp: new Date().toISOString(),
			type: 'user' as const,
		};

		this.sendWebSocketMessage('chat', {
			...message,
			messageId: message.id,
		}, roomId);

		return message;
	}

	// ============ Code Changes ============

	/**
	 * Submit a code change/diff
	 */
	async submitCodeChange(roomId: string, change: Omit<CodeChange, 'id' | 'timestamp'>): Promise<CodeChange> {
		// P2P mode: code changes are exchanged over WebRTC; the signaling server does not persist them.
		const peerId = this.ensurePeerId();
		return {
			id: `code-${Date.now().toString(36)}`,
			roomId,
			peerId,
			filePath: change.filePath,
			startLine: change.startLine,
			endLine: change.endLine,
			oldCode: change.oldCode,
			newCode: change.newCode,
			timestamp: new Date().toISOString(),
			applied: false,
		};
	}

	/**
	 * Get code changes for a room
	 */
	async getCodeChanges(_roomId: string, _limit?: number): Promise<{ changes: CodeChange[] }> {
		// P2P mode: history is not stored server-side.
		return { changes: [] };
	}

	/**
	 * Apply a code change
	 */
	async applyCodeChange(_roomId: string, _changeId: string): Promise<{ success: boolean }> {
		// Nothing to apply on the signaling server.
		return { success: true };
	}

	// ============ Operations (CRDT/OT) ============

	/**
	 * Broadcast an operation to room peers
	 */
	async broadcastOperation(_roomId: string, _operation: any): Promise<{ success: boolean }> {
		// Operations travel over WebRTC data channels, not via HTTP.
		return { success: true };
	}

	/**
	 * Get operation history
	 */
	async getOperations(_roomId: string): Promise<{ operations: any[] }> {
		return { operations: [] };
	}

	// ============ WebSocket (Real-time) ============

	/**
	 * Connect to WebSocket for real-time updates
	 */
	connectWebSocket(roomId: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				if (!this.token || this.connectedRoomId !== roomId) {
					await this.joinRoom(roomId);
				}

				this.ws = new WebSocket(this.wsUrl);

				this.ws.onopen = () => {
					console.log('✅ WebSocket connected to room:', roomId);
					// Authenticate and join via signaling messages
					this.sendWebSocketMessage('auth', { token: this.token }, roomId);
					this.sendWebSocketMessage('join-room', { userName: this.peerId }, roomId);
					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data);
						const { type } = message;

						if (this.messageHandlers.has(type)) {
							this.messageHandlers.get(type)?.(message);
						}

						console.log('📨 WebSocket message:', message);
					} catch (error) {
						console.error('❌ Error parsing WebSocket message:', error);
					}
				};

				this.ws.onerror = (error) => {
					console.error('❌ WebSocket error:', error);
					reject(error);
				};

				this.ws.onclose = () => {
					console.log('⚠️ WebSocket disconnected');
					this.ws = null;
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Register handler for WebSocket message type
	 */
	onMessage(messageType: string, handler: (data: any) => void): () => void {
		this.messageHandlers.set(messageType, handler);

		// Return unsubscribe function
		return () => {
			this.messageHandlers.delete(messageType);
		};
	}

	/**
	 * Send message via WebSocket
	 */
	sendWebSocketMessage(type: string, data: any, roomId?: string): boolean {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('⚠️ WebSocket not connected');
			return false;
		}

		const targetRoom = roomId || this.connectedRoomId || '';
		const payload = {
			type,
			roomId: targetRoom,
			userId: this.ensurePeerId(),
			data,
			timestamp: Date.now(),
		};

		this.ws.send(JSON.stringify(payload));
		return true;
	}

	/**
	 * Disconnect WebSocket
	 */
	disconnectWebSocket(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	// ============ P2P Data Channels (WebRTC) ============

	async enableP2PDataChannels(roomId: string, handlers?: P2PHandlers): Promise<void> {
		if (!this.isWebRTCAvailable()) {
			console.warn('⚠️ WebRTC not available in this environment');
			return;
		}

		this.p2pHandlers = handlers || null;
		await this.connectWebSocket(roomId);
		this.connectedRoomId = roomId;

		// Clean up any previous subscriptions
		this.disableP2PDataChannels(true);
		this.p2pSubscriptions = [
			this.onMessage('peer-joined', (msg) => this.handlePeerJoined(msg)),
			this.onMessage('peer-left', (msg) => this.handlePeerLeft(msg)),
			this.onMessage('sdp-offer', (msg) => this.handleRemoteOffer(msg)),
			this.onMessage('sdp-answer', (msg) => this.handleRemoteAnswer(msg)),
			this.onMessage('ice-candidate', (msg) => this.handleRemoteCandidate(msg)),
		];
	}

	disableP2PDataChannels(keepHandlers = false): void {
		this.p2pSubscriptions.forEach(unsub => unsub());
		this.p2pSubscriptions = [];

		for (const [, channel] of this.dataChannels) {
			channel.close();
		}
		this.dataChannels.clear();

		for (const [, pc] of this.peerConnections) {
			pc.close();
		}
		this.peerConnections.clear();

		if (!keepHandlers) {
			this.p2pHandlers = null;
		}
	}

	sendOperationP2P(operation: P2POperation): boolean {
		let sent = false;
		for (const [, channel] of this.dataChannels) {
			if (channel.readyState === 'open') {
				channel.send(JSON.stringify(operation));
				sent = true;
			}
		}
		if (!sent) {
			console.warn('⚠️ No open data channels to send operation');
		}
		return sent;
	}

	private isWebRTCAvailable(): boolean {
		return typeof RTCPeerConnection !== 'undefined' && typeof RTCSessionDescription !== 'undefined';
	}

	private getOrCreatePeerConnection(peerId: string, isInitiator: boolean, roomId: string): RTCPeerConnection {
		let pc = this.peerConnections.get(peerId);
		if (pc) {
			return pc;
		}

		pc = new RTCPeerConnection({
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		});

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				this.sendWebSocketMessage('ice-candidate', { candidate: event.candidate }, roomId);
			}
		};

		pc.onconnectionstatechange = () => {
			const state = pc?.connectionState;
			if (state === 'connected') {
				this.p2pHandlers?.onPeerConnectionState?.(peerId, 'connected');
			} else if (state === 'failed') {
				this.p2pHandlers?.onPeerConnectionState?.(peerId, 'failed');
			} else if (state === 'disconnected' || state === 'closed') {
				this.p2pHandlers?.onPeerConnectionState?.(peerId, 'disconnected');
			}
		};

		pc.ondatachannel = (event) => {
			this.setupDataChannel(event.channel, peerId);
		};

		if (isInitiator) {
			const channel = pc.createDataChannel('operations', { ordered: true, maxRetransmits: 3 });
			this.setupDataChannel(channel, peerId);
			this.createAndSendOffer(pc, roomId);
		}

		this.peerConnections.set(peerId, pc);
		return pc;
	}

	private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
		this.dataChannels.set(peerId, channel);

		channel.onopen = () => {
			this.p2pHandlers?.onPeerConnectionState?.(peerId, 'connected');
		};

		channel.onclose = () => {
			this.dataChannels.delete(peerId);
			this.p2pHandlers?.onPeerConnectionState?.(peerId, 'disconnected');
		};

		channel.onmessage = (event) => {
			try {
				const op = JSON.parse(event.data);
				this.p2pHandlers?.onOperation?.(op, peerId);
			} catch (err) {
				console.error('❌ Failed to parse P2P operation', err);
			}
		};
	}

	private async createAndSendOffer(pc: RTCPeerConnection, roomId: string): Promise<void> {
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		this.sendWebSocketMessage('sdp-offer', { offer }, roomId);
	}

	private async handlePeerJoined(message: any): Promise<void> {
		const roomId = message.roomId;
		const peerId = message.data?.peer?.userId;
		if (!roomId || !peerId || peerId === this.peerId) return;
		this.getOrCreatePeerConnection(peerId, true, roomId);
	}

	private handlePeerLeft(message: any): void {
		const peerId = message.userId || message.data?.peerId;
		if (!peerId) return;
		this.closePeer(peerId);
	}

	private async handleRemoteOffer(message: any): Promise<void> {
		const roomId = message.roomId;
		const peerId = message.userId;
		const offer = message.data?.offer;
		if (!roomId || !peerId || peerId === this.peerId || !offer) return;

		const pc = this.getOrCreatePeerConnection(peerId, false, roomId);
		await pc.setRemoteDescription(new RTCSessionDescription(offer));
		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);
		this.sendWebSocketMessage('sdp-answer', { answer }, roomId);
	}

	private async handleRemoteAnswer(message: any): Promise<void> {
		const roomId = message.roomId;
		const peerId = message.userId;
		const answer = message.data?.answer;
		if (!roomId || !peerId || peerId === this.peerId || !answer) return;

		const pc = this.peerConnections.get(peerId);
		if (!pc) return;
		await pc.setRemoteDescription(new RTCSessionDescription(answer));
	}

	private async handleRemoteCandidate(message: any): Promise<void> {
		const peerId = message.userId;
		const candidate = message.data?.candidate;
		if (!peerId || peerId === this.peerId || !candidate) return;
		const pc = this.peerConnections.get(peerId);
		if (!pc) return;
		try {
			await pc.addIceCandidate(new RTCIceCandidate(candidate));
		} catch (err) {
			console.error('❌ Failed to add ICE candidate', err);
		}
	}

	private closePeer(peerId: string): void {
		const channel = this.dataChannels.get(peerId);
		channel?.close();
		this.dataChannels.delete(peerId);

		const pc = this.peerConnections.get(peerId);
		pc?.close();
		this.peerConnections.delete(peerId);
	}

	// ============ Admin Endpoints ============

	/**
	 * List database stats (admin only)
	 */
	async getStats(adminKey: string): Promise<any> {
		return this.request('/admin/stats', {
			headers: { 'X-Admin-Key': adminKey },
		});
	}

	/**
	 * Clean up inactive rooms (admin only)
	 */
	async cleanupInactiveRooms(adminKey: string, maxInactivityMs: number): Promise<{ cleaned: number }> {
		return this.request('/admin/cleanup', {
			method: 'POST',
			headers: { 'X-Admin-Key': adminKey },
			body: { maxInactivityMs },
		});
	}

	// ============ Getters ============

	getToken(): string | null {
		return this.token;
	}

	getPeerId(): string | null {
		return this.peerId;
	}

	getBaseUrl(): string {
		return this.baseUrl;
	}

	getWsUrl(): string {
		return this.wsUrl;
	}

	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	// ============ Cleanup ============

	/**
	 * Disconnect and cleanup resources
	 */
	disconnect(): void {
		this.disableP2PDataChannels();
		this.disconnectWebSocket();
		this.messageHandlers.clear();
		this.token = null;
		this.peerId = null;
	}
}

// Export singleton instance
export const backendAPI = new BackendAPIClient();

// Export class for testing
export { BackendAPIClient };
