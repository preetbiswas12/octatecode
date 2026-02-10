/*
 * P2P Connection Hook
 * Manages WebSocket connection to lean P2P backend
 * Handles authentication, peer discovery, and message routing
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface P2PMessage {
	type: string;
	roomId: string;
	from?: string;
	to?: string;
	peerId?: string;
	peerName?: string;
	data?: any;
	peers?: Array<{ id: string; name: string }>;
	timestamp?: number;
}

export interface P2PCallbacks {
	onPeerJoined?: (peerId: string, peerName: string) => void;
	onPeerLeft?: (peerId: string) => void;
	onSignal?: (msg: P2PMessage) => void;
	onChat?: (msg: P2PMessage) => void;
	onSync?: (msg: P2PMessage) => void;
	onError?: (error: string) => void;
}

export const useP2PConnection = (
	roomId: string,
	userId: string,
	userName: string,
	callbacks?: P2PCallbacks
) => {
	const wsRef = useRef<WebSocket | null>(null);
	const [connected, setConnected] = useState(false);
	const [peers, setPeers] = useState<Array<{ id: string; name: string }>>([]);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Determine WebSocket URL
	const getWSUrl = useCallback(() => {
		const wsUrl = (window as any)['REACT_APP_P2P_WS'] || 'ws://localhost:3001';
		return wsUrl;
	}, []);

	// Connect to WebSocket server
	useEffect(() => {
		if (!roomId || !userId || !userName) {
			console.warn('[P2P] Missing roomId, userId, or userName');
			return;
		}

		const connect = () => {
			const wsUrl = getWSUrl();
			console.log(`[P2P] Connecting to ${wsUrl} as ${userId} in room ${roomId}`);

			try {
				const ws = new WebSocket(wsUrl);

				ws.onopen = () => {
					console.log('[P2P] WebSocket connected');
					setConnected(true);

					// Send authentication message
					ws.send(
						JSON.stringify({
							type: 'auth',
							roomId,
							from: userId,
							data: {
								name: userName,
								roomName: roomId
							}
						})
					);
				};

				ws.onmessage = (event) => {
					try {
						const msg: P2PMessage = JSON.parse(event.data);
						console.log(`[P2P] Received: ${msg.type}`);

						switch (msg.type) {
							case 'peerList':
								// List of existing peers in room
								setPeers(msg.peers || []);
								console.log(
									`[P2P] Room has ${msg.peers?.length || 0} other peers`
								);
								break;

							case 'peerJoined':
								console.log(
									`[P2P] Peer joined: ${msg.peerId} (${msg.peerName})`
								);
								setPeers((prev) => [
									...prev.filter((p) => p.id !== msg.peerId),
									{ id: msg.peerId!, name: msg.peerName! }
								]);
								callbacks?.onPeerJoined?.(msg.peerId!, msg.peerName!);
								break;

							case 'peerLeft':
								console.log(`[P2P] Peer left: ${msg.peerId}`);
								setPeers((prev) => prev.filter((p) => p.id !== msg.peerId));
								callbacks?.onPeerLeft?.(msg.peerId!);
								break;

							case 'offer':
							case 'answer':
							case 'ice':
								callbacks?.onSignal?.(msg);
								break;

							case 'chat':
								callbacks?.onChat?.(msg);
								break;

							case 'sync':
								callbacks?.onSync?.(msg);
								break;

							case 'error':
								console.error('[P2P] Server error:', msg.data);
								callbacks?.onError?.(msg.data?.error || 'Unknown error');
								break;

							default:
								console.log('[P2P] Unknown message type:', msg.type);
						}
					} catch (error) {
						console.error('[P2P] Message parse error:', error);
						callbacks?.onError?.('Message parse error');
					}
				};

				ws.onclose = () => {
					console.log('[P2P] Disconnected');
					setConnected(false);

					// Attempt reconnect after 2 seconds
					reconnectTimeoutRef.current = setTimeout(() => {
						console.log('[P2P] Attempting reconnect...');
						connect();
					}, 2000);
				};

				ws.onerror = (error) => {
					console.error('[P2P] WebSocket error:', error);
					callbacks?.onError?.('WebSocket error');
				};

				wsRef.current = ws;
			} catch (error) {
				console.error('[P2P] Connection error:', error);
				callbacks?.onError?.('Connection failed');
			}
		};

		connect();

		// Cleanup
		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [roomId, userId, userName, callbacks, getWSUrl]);

	// Send WebRTC signal to peer
	const sendSignal = useCallback(
		(toPeerId: string, signalType: 'offer' | 'answer' | 'ice', signal: any) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				console.warn('[P2P] WebSocket not connected');
				return;
			}

			wsRef.current.send(
				JSON.stringify({
					type: signalType,
					roomId,
					from: userId,
					to: toPeerId,
					data: signal
				})
			);
		},
		[roomId, userId]
	);

	// Send chat message
	const sendChat = useCallback(
		(text: string) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				console.warn('[P2P] WebSocket not connected');
				return;
			}

			wsRef.current.send(
				JSON.stringify({
					type: 'chat',
					roomId,
					from: userId,
					data: {
						text,
						timestamp: Date.now()
					}
				})
			);
		},
		[roomId, userId]
	);

	// Send code/document sync
	const sendSync = useCallback(
		(code: string, metadata?: any) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				console.warn('[P2P] WebSocket not connected');
				return;
			}

			wsRef.current.send(
				JSON.stringify({
					type: 'sync',
					roomId,
					from: userId,
					data: {
						code,
						...metadata,
						timestamp: Date.now()
					}
				})
			);
		},
		[roomId, userId]
	);

	return {
		connected,
		peers,
		sendSignal,
		sendChat,
		sendSync,
		ws: wsRef.current
	};
};
