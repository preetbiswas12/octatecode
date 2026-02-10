/*
 * P2P Integration Test Component
 * Minimal component to test P2P backend connectivity
 * Remove this after verification
 */

import React, { useEffect, useState } from 'react';
import { useCollaborationManager } from './useCollaborationManager.js';
import { getP2PConfig, verifyBackendConnection } from './P2PConfig.js';

export const P2PIntegrationTest = () => {
	const [backendOk, setBackendOk] = useState<boolean | null>(null);
	const [testMessage, setTestMessage] = useState('');

	const { status, connected, peers, broadcastChat } =
		useCollaborationManager({
			onStatusChange: (newStatus) => {
				console.log('[Test] Status:', newStatus);
			},
			onPeerMessage: (peerId, message) => {
				console.log('[Test] Message from peer:', peerId, message);
				setTestMessage(message);
			},
			onChatMessage: (peerId, text) => {
				console.log('[Test] Chat from peer:', peerId, text);
				setTestMessage(text);
			}
		});

	// Verify backend on mount
	useEffect(() => {
		const config = getP2PConfig();
		verifyBackendConnection(config).then(setBackendOk);
	}, []);

	return (
		<div style={{ padding: '20px', fontFamily: 'monospace' }}>
			<h2>🧪 P2P Integration Test</h2>

			<div style={{ marginBottom: '20px' }}>
				<h3>Backend Status:</h3>
				<p>
					Backend:{' '}
					<strong
						style={{
							color: backendOk ? 'green' : 'red'
						}}
					>
						{backendOk === null
							? 'checking...'
							: backendOk
								? '✅ Connected'
								: '❌ Failed'}
					</strong>
				</p>
			</div>

			<div style={{ marginBottom: '20px' }}>
				<h3>P2P Connection Status:</h3>
				<p>
					WebSocket:{' '}
					<strong
						style={{
							color: connected ? 'green' : 'orange'
						}}
					>
						{connected ? '🟢 Connected' : '🟡 Connecting...'}
					</strong>
				</p>
				<p>Peers in room: {status.totalPeers}</p>
				<p>Data channels open: {status.peersConnected}</p>
				<p>Last activity: {new Date(status.lastActivity).toLocaleTimeString()}</p>
			</div>

			<div style={{ marginBottom: '20px' }}>
				<h3>Connected Peers:</h3>
				{peers && peers.length > 0 ? (
					<ul>
						{peers.map((p) => (
							<li key={p.id}>
								{p.name} ({p.id})
							</li>
						))}
					</ul>
				) : (
					<p>No other peers yet. Open this page in another tab/window.</p>
				)}
			</div>

			<div style={{ marginBottom: '20px' }}>
				<h3>Test Chat:</h3>
				<input
					type="text"
					placeholder="Send test message..."
					onKeyPress={(e) => {
						if (e.key === 'Enter') {
							broadcastChat(e.currentTarget.value);
							e.currentTarget.value = '';
						}
					}}
					style={{
						padding: '8px',
						width: '300px',
						marginBottom: '10px'
					}}
				/>
				<div
					style={{
						border: '1px solid #ccc',
						padding: '10px',
						height: '100px',
						overflowY: 'auto',
						backgroundColor: '#f5f5f5'
					}}
				>
					{testMessage || 'No messages yet...'}
				</div>
			</div>

			{status.errors.length > 0 && (
				<div style={{ marginBottom: '20px' }}>
					<h3>Errors:</h3>
					<ul style={{ color: 'red' }}>
						{status.errors.map((err, i) => (
							<li key={i}>{err}</li>
						))}
					</ul>
				</div>
			)}

			<div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
				<p>Open this page in multiple browser windows/tabs to test P2P connectivity.</p>
				<p>Changes to room or user ID require page reload.</p>
			</div>
		</div>
	);
};
