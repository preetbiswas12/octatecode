/*
 * WebRTC Handler
 * Manages peer connections, data channels, and signal handling
 */

import { P2PMessage } from './useP2PConnection.js';

export interface PeerConnection {
	pc: RTCPeerConnection;
	channel: RTCDataChannel | null;
	connectedAt: number;
}

export class WebRTCHandler {
	private peers = new Map<string, PeerConnection>();
	private iceServers: RTCIceServer[] = [];
	private dataChannelCallbacks: Map<
		string,
		(message: any) => void
	> = new Map();

	constructor(iceServers?: RTCIceServer[]) {
		this.iceServers = iceServers || [
			{ urls: ['stun:stun.l.google.com:19302'] },
			{ urls: ['stun:stun1.l.google.com:19302'] }
		];
	}

	/**
	 * Create a new peer connection
	 */
	createPeerConnection(peerId: string): PeerConnection {
		if (this.peers.has(peerId)) {
			console.warn(`[WebRTC] Peer ${peerId} already exists`);
			return this.peers.get(peerId)!;
		}

		const pc = new RTCPeerConnection({
			iceServers: this.iceServers
		});

		const connection: PeerConnection = {
			pc,
			channel: null,
			connectedAt: Date.now()
		};

		// Handle ICE candidates
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				console.log(`[WebRTC] ICE candidate for ${peerId}`);
				this.onIceCandidate?.(peerId, event.candidate);
			}
		};

		// Handle connection state changes
		pc.onconnectionstatechange = () => {
			console.log(
				`[WebRTC] Connection state ${peerId}: ${pc.connectionState}`
			);
			if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
				this.closePeerConnection(peerId);
			}
		};

		// Handle incoming data channels (responder side)
		pc.ondatachannel = (event) => {
			console.log(`[WebRTC] Data channel received from ${peerId}`);
			this.setupDataChannel(peerId, event.channel);
		};

		this.peers.set(peerId, connection);
		console.log(`[WebRTC] Created peer connection: ${peerId}`);

		return connection;
	}

	/**
	 * Create data channel (initiator side)
	 */
	createDataChannel(peerId: string, label: string = 'collaboration'): RTCDataChannel {
		const connection = this.peers.get(peerId);
		if (!connection) {
			throw new Error(`Peer ${peerId} not found`);
		}

		const channel = connection.pc.createDataChannel(label);
		this.setupDataChannel(peerId, channel);
		return channel;
	}

	/**
	 * Setup data channel handlers
	 */
	private setupDataChannel(peerId: string, channel: RTCDataChannel) {
		const connection = this.peers.get(peerId);
		if (!connection) return;

		connection.channel = channel;

		channel.onopen = () => {
			console.log(`[WebRTC] Data channel open: ${peerId}`);
			this.onChannelOpen?.(peerId);
		};

		channel.onclose = () => {
			console.log(`[WebRTC] Data channel closed: ${peerId}`);
			this.onChannelClosed?.(peerId);
		};

		channel.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				const callback = this.dataChannelCallbacks.get(peerId);
				callback?.(message);
				this.onChannelMessage?.(peerId, message);
			} catch (error) {
				console.error(`[WebRTC] Data channel parse error:`, error);
			}
		};

		channel.onerror = (error) => {
			console.error(`[WebRTC] Data channel error for ${peerId}:`, error);
		};
	}

	/**
	 * Handle incoming signal from peer
	 */
	async handleSignal(peerId: string, msg: P2PMessage) {
		const connection = this.peers.get(peerId) || this.createPeerConnection(peerId);

		try {
			if (msg.type === 'offer') {
				console.log(`[WebRTC] Received offer from ${peerId}`);
				await connection.pc.setRemoteDescription(
					new RTCSessionDescription(msg.data)
				);

				const answer = await connection.pc.createAnswer();
				await connection.pc.setLocalDescription(answer);

				this.onAnswer?.(peerId, answer as any as RTCSessionDescription);
			}

			if (msg.type === 'answer') {
				console.log(`[WebRTC] Received answer from ${peerId}`);
				await connection.pc.setRemoteDescription(
					new RTCSessionDescription(msg.data)
				);
			}

			if (msg.type === 'ice') {
				console.log(`[WebRTC] Received ICE candidate from ${peerId}`);
				if (msg.data?.candidate) {
					await connection.pc.addIceCandidate(
						new RTCIceCandidate(msg.data.candidate)
					);
				}
			}
		} catch (error) {
			console.error(`[WebRTC] Signal handling error for ${peerId}:`, error);
		}
	}

	/**
	 * Create offer to peer
	 */
	async createOffer(peerId: string): Promise<RTCSessionDescription | null> {
		const connection = this.peers.get(peerId) || this.createPeerConnection(peerId);

		try {
			const offer = await connection.pc.createOffer({
				offerToReceiveAudio: false,
				offerToReceiveVideo: false
			});
			await connection.pc.setLocalDescription(offer);
			return offer as any as RTCSessionDescription;
		} catch (error) {
			console.error(`[WebRTC] Offer creation error for ${peerId}:`, error);
			return null;
		}
	}

	/**
	 * Send message via data channel
	 */
	sendMessage(peerId: string, message: any): boolean {
		const connection = this.peers.get(peerId);
		if (!connection?.channel || connection.channel.readyState !== 'open') {
			console.warn(`[WebRTC] Data channel not open for ${peerId}`);
			return false;
		}

		try {
			connection.channel.send(JSON.stringify(message));
			return true;
		} catch (error) {
			console.error(`[WebRTC] Send error for ${peerId}:`, error);
			return false;
		}
	}

	/**
	 * Close peer connection
	 */
	closePeerConnection(peerId: string) {
		const connection = this.peers.get(peerId);
		if (!connection) return;

		try {
			if (connection.channel) {
				connection.channel.close();
			}
			connection.pc.close();
		} catch (error) {
			console.error(`[WebRTC] Close error for ${peerId}:`, error);
		}

		this.peers.delete(peerId);
		this.dataChannelCallbacks.delete(peerId);
		console.log(`[WebRTC] Closed peer connection: ${peerId}`);
	}

	/**
	 * Set callback for data channel messages
	 */
	setDataChannelCallback(peerId: string, callback: (message: any) => void) {
		this.dataChannelCallbacks.set(peerId, callback);
	}

	/**
	 * Get all connected peers
	 */
	getConnectedPeers(): string[] {
		return Array.from(this.peers.keys());
	}

	/**
	 * Close all connections
	 */
	closeAll() {
		this.peers.forEach((_, peerId) => {
			this.closePeerConnection(peerId);
		});
	}

	// Event callbacks
	onIceCandidate?: (peerId: string, candidate: RTCIceCandidate) => void;
	onAnswer?: (peerId: string, answer: RTCSessionDescription) => void;
	onChannelOpen?: (peerId: string) => void;
	onChannelClosed?: (peerId: string) => void;
	onChannelMessage?: (peerId: string, message: any) => void;
}
