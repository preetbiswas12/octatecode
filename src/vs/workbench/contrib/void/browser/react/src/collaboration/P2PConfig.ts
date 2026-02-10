/*
 * P2P Configuration
 * Centralized settings for P2P backend connection
 */

export interface P2PConfig {
	// Server URLs
	backendHttpUrl: string;
	backendWsUrl: string;

	// Room and user info
	roomId: string;
	userId: string;
	userName: string;

	// Feature flags
	enableP2P: boolean;
	enableWebRTC: boolean;
	enablePersistence: boolean;

	// Performance
	reconnectDelay: number;
	heartbeatInterval: number;
	maxReconnectAttempts: number;

	// Ice servers
	iceServers: RTCIceServer[];
}

/**
 * Get P2P configuration from environment
 */
export const getP2PConfig = (): P2PConfig => {
	const backendHttpUrl =
		(window as any)['REACT_APP_P2P_HTTP'] || 'http://localhost:3000';
	const backendWsUrl =
		(window as any)['REACT_APP_P2P_WS'] || 'ws://localhost:3001';

	const roomId = (window as any)['REACT_APP_P2P_ROOM_ID'] || 'default-room';
	const userId = (window as any)['REACT_APP_P2P_USER_ID'] || generateUserId();
	const userName = (window as any)['REACT_APP_P2P_USER_NAME'] || 'Anonymous';

	const enableP2P = ((window as any)['REACT_APP_P2P_ENABLED'] as string) !== 'false';
	const enableWebRTC = ((window as any)['REACT_APP_WEBRTC_ENABLED'] as string) !== 'false';
	const enablePersistence =
		((window as any)['REACT_APP_PERSISTENCE_ENABLED'] as string) !== 'false';

	const iceServers: RTCIceServer[] = [
		{ urls: ['stun:stun.l.google.com:19302'] },
		{ urls: ['stun:stun1.l.google.com:19302'] },
		{ urls: ['stun:stun2.l.google.com:19302'] },
		{ urls: ['stun:stun3.l.google.com:19302'] },
		{ urls: ['stun:stun4.l.google.com:19302'] }
	];

	return {
		backendHttpUrl,
		backendWsUrl,
		roomId,
		userId,
		userName,
		enableP2P,
		enableWebRTC,
		enablePersistence,
		reconnectDelay: 2000,
		heartbeatInterval: 30000,
		maxReconnectAttempts: 10,
		iceServers
	};
};

/**
 * Generate unique user ID
 */
function generateUserId(): string {
	return `user-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Verify P2P backend is accessible
 */
export const verifyBackendConnection = async (config: P2PConfig): Promise<boolean> => {
	try {
		const response = await fetch(`${config.backendHttpUrl}/api/health`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (response.ok) {
			const data = await response.json();
			console.log('[P2P Config] Backend verified:', data);
			return true;
		}
	} catch (error) {
		console.error('[P2P Config] Backend verification failed:', error);
	}

	return false;
};

/**
 * Get list of active rooms from backend
 */
export const getRoomsList = async (config: P2PConfig): Promise<any[]> => {
	try {
		const response = await fetch(`${config.backendHttpUrl}/api/rooms`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (response.ok) {
			const rooms = await response.json();
			return Array.isArray(rooms) ? rooms : [];
		}
	} catch (error) {
		console.error('[P2P Config] Failed to fetch rooms:', error);
	}

	return [];
};

/**
 * Log configuration for debugging
 */
export const logP2PConfig = (config: P2PConfig) => {
	console.log('╔════════════════════════════════════════════════════════╗');
	console.log('║          P2P Backend Configuration                      ║');
	console.log('╠════════════════════════════════════════════════════════╣');
	console.log(`║ HTTP Backend: ${config.backendHttpUrl.padEnd(40)} ║`);
	console.log(`║ WebSocket: ${config.backendWsUrl.padEnd(45)} ║`);
	console.log(`║ Room ID: ${config.roomId.padEnd(48)} ║`);
	console.log(`║ User ID: ${config.userId.padEnd(48)} ║`);
	console.log(`║ User Name: ${config.userName.padEnd(47)} ║`);
	console.log(`║ P2P Enabled: ${(config.enableP2P ? 'YES' : 'NO').padEnd(42)} ║`);
	console.log(`║ WebRTC Enabled: ${(config.enableWebRTC ? 'YES' : 'NO').padEnd(38)} ║`);
	console.log(`║ Persistence: ${(config.enablePersistence ? 'YES' : 'NO').padEnd(42)} ║`);
	console.log('╚════════════════════════════════════════════════════════╝');
};
