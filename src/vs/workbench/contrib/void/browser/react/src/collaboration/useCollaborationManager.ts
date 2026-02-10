/*
 * Collaboration Manager Component
 * Orchestrates P2P connection + WebRTC setup
 * Integrates with OctateCode chat/sync systems
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useP2PConnection, P2PCallbacks } from './useP2PConnection.js';
import { WebRTCHandler } from './WebRTCHandler.js';
import {
	getP2PConfig,
	verifyBackendConnection,
	logP2PConfig,
	P2PConfig
} from './P2PConfig.js';

export interface CollaborationStatus {
	connected: boolean;
	peersConnected: number;
	totalPeers: number;
	lastActivity: number;
	errors: string[];
}

export interface CollaborationCallbacks {
	onStatusChange?: (status: CollaborationStatus) => void;
	onPeerMessage?: (peerId: string, message: any) => void;
	onChatMessage?: (peerId: string, text: string) => void;
	onCodeSync?: (peerId: string, code: string) => void;
}

export const useCollaborationManager = (callbacks?: CollaborationCallbacks) => {
	const configRef = useRef<P2PConfig | null>(null);
	const webrtcRef = useRef<WebRTCHandler | null>(null);
	const [status, setStatus] = useState<CollaborationStatus>({
		connected: false,
		peersConnected: 0,
		totalPeers: 0,
		lastActivity: Date.now(),
		errors: []
	});

	// Initialize configuration
	useEffect(() => {
		const config = getP2PConfig();
		configRef.current = config;

		if (config.enableP2P) {
			logP2PConfig(config);

			// Verify backend connection
			verifyBackendConnection(config).then((ok) => {
				if (!ok) {
					setStatus((prev) => ({
						...prev,
						errors: [...prev.errors, 'Backend not accessible']
					}));
					console.warn('[Collaboration] Backend not accessible');
				}
			});
		}
	}, []);

	// Initialize WebRTC handler
	useEffect(() => {
		if (configRef.current?.enableWebRTC) {
			webrtcRef.current = new WebRTCHandler(configRef.current.iceServers);

			// Setup WebRTC event handlers
			webrtcRef.current.onChannelOpen = (peerId) => {
				console.log(`[Collaboration] Data channel open: ${peerId}`);
				setStatus((prev) => ({
					...prev,
					peersConnected: prev.peersConnected + 1,
					lastActivity: Date.now()
				}));
			};

			webrtcRef.current.onChannelClosed = (peerId) => {
				console.log(`[Collaboration] Data channel closed: ${peerId}`);
				setStatus((prev) => ({
					...prev,
					peersConnected: Math.max(0, prev.peersConnected - 1),
					lastActivity: Date.now()
				}));
			};

			webrtcRef.current.onChannelMessage = (peerId, message) => {
				callbacks?.onPeerMessage?.(peerId, message);

				if (message.type === 'chat') {
					callbacks?.onChatMessage?.(peerId, message.text);
				} else if (message.type === 'sync') {
					callbacks?.onCodeSync?.(peerId, message.code);
				}
			};

			webrtcRef.current.onIceCandidate = (peerId, candidate) => {
				// Send ICE candidate through signaling server
				p2pConnection?.sendSignal(peerId, 'ice', { candidate });
			};

			webrtcRef.current.onAnswer = (peerId, answer) => {
				// Send answer through signaling server
				p2pConnection?.sendSignal(peerId, 'answer', answer);
			};
		}
	}, [callbacks]);

	// Setup P2P connection
	const p2pCallbacks: P2PCallbacks = {
		onPeerJoined: (peerId, peerName) => {
			console.log(`[Collaboration] Peer joined: ${peerName}`);

			if (webrtcRef.current && configRef.current?.enableWebRTC) {
				// Create offer to new peer
				webrtcRef.current.createOffer(peerId).then((offer) => {
					if (offer) {
						p2pConnection?.sendSignal(peerId, 'offer', offer);
					}
				});
			}

			setStatus((prev) => ({
				...prev,
				totalPeers: prev.totalPeers + 1,
				lastActivity: Date.now()
			}));
		},

		onPeerLeft: (peerId) => {
			console.log(`[Collaboration] Peer left: ${peerId}`);

			if (webrtcRef.current) {
				webrtcRef.current.closePeerConnection(peerId);
			}

			setStatus((prev) => ({
				...prev,
				totalPeers: Math.max(0, prev.totalPeers - 1),
				peersConnected: Math.max(
					0,
					prev.peersConnected -
					(webrtcRef.current?.getConnectedPeers().includes(peerId)
						? 1
						: 0)
				),
				lastActivity: Date.now()
			}));
		},

		onSignal: (msg) => {
			if (webrtcRef.current) {
				webrtcRef.current.handleSignal(msg.from || '', msg);
			}
		},

		onChat: (msg) => {
			callbacks?.onChatMessage?.(msg.from || '', msg.data?.text || '');
		},

		onSync: (msg) => {
			callbacks?.onCodeSync?.(msg.from || '', msg.data?.code || '');
		},

		onError: (error) => {
			console.error('[Collaboration] Error:', error);
			setStatus((prev) => ({
				...prev,
				errors: [...prev.errors.slice(-9), error]
			}));
		}
	};

	const p2pConnection = useP2PConnection(
		configRef.current?.roomId || 'default-room',
		configRef.current?.userId || 'unknown',
		configRef.current?.userName || 'Anonymous',
		p2pCallbacks
	);

	// Update connected status
	useEffect(() => {
		setStatus((prev) => ({
			...prev,
			connected: p2pConnection.connected,
			lastActivity: Date.now()
		}));
	}, [p2pConnection.connected]);

	// Send message via data channel to peer
	const sendPeerMessage = useCallback(
		(peerId: string, message: any): boolean => {
			if (!webrtcRef.current) {
				console.warn('[Collaboration] WebRTC not enabled');
				return false;
			}

			return webrtcRef.current.sendMessage(peerId, message);
		},
		[]
	);

	// Send chat to all peers
	const broadcastChat = useCallback((text: string) => {
		p2pConnection?.sendChat(text);
	}, [p2pConnection]);

	// Send code sync to all peers
	const broadcastCodeSync = useCallback((code: string) => {
		p2pConnection?.sendSync(code);
	}, [p2pConnection]);

	// Cleanup
	useEffect(() => {
		return () => {
			if (webrtcRef.current) {
				webrtcRef.current.closeAll();
			}
		};
	}, []);

	// Report status changes
	useEffect(() => {
		callbacks?.onStatusChange?.(status);
	}, [status, callbacks]);

	return {
		status,
		connected: p2pConnection.connected,
		peers: p2pConnection.peers,
		config: configRef.current,
		sendPeerMessage,
		broadcastChat,
		broadcastCodeSync
	};
};
