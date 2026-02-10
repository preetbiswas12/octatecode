/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { useAccessor } from '../util/services.js';
// import { ICollaborationService } from '../../../collaborationService.js';
import { Users, LogOut, Copy, Check } from 'lucide-react';
import './CollaborationPanel.css';

export const CollaborationPanel: React.FC = () => {
	const accessor = useAccessor();
	const collaborationService = (accessor.get('ICollaborationService' as any) as any) || {};
	const [isOpen, setIsOpen] = useState(false);
	const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
	const [roomName, setRoomName] = useState('');
	const [roomId, setRoomId] = useState('');
	const [userName, setUserName] = useState('');
	const [currentRoom, setCurrentRoom] = useState<any>(null);
	const [peers, setPeers] = useState<any[]>([]);
	const [roomIdCopied, setRoomIdCopied] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		// Subscribe to room changes
		const unsubRoom = collaborationService.onRoomChanged((room: any) => {
			setCurrentRoom(room);
		});

		// Subscribe to peer changes
		const unsubPeer = collaborationService.onPeerPresence((peer: any) => {
			setPeers((prev) => {
				const existing = prev.findIndex((p) => p.userId === peer.userId);
				if (existing !== -1) {
					const updated = [...prev];
					updated[existing] = peer;
					return updated;
				}
				return [...prev, peer];
			});
		});

		return () => {
			unsubRoom();
			unsubPeer();
		};
	}, [collaborationService]);

	const handleCreateRoom = async () => {
		if (!roomName.trim() || !userName.trim()) {
			setError('Please enter room name and your name');
			return;
		}

		setLoading(true);
		setError('');

		try {
			await collaborationService.createRoom(roomName.trim(), userName.trim());
			setMode('idle');
			setRoomName('');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			setError(`Failed to create room: ${msg}`);
		} finally {
			setLoading(false);
		}
	};

	const handleJoinRoom = async () => {
		if (!roomId.trim() || !userName.trim()) {
			setError('Please enter room ID and your name');
			return;
		}

		setLoading(true);
		setError('');

		try {
			await collaborationService.joinRoom(roomId.trim(), userName.trim());
			setMode('idle');
			setRoomId('');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			setError(`Failed to join room: ${msg}`);
		} finally {
			setLoading(false);
		}
	};

	const handleLeaveRoom = async () => {
		setLoading(true);
		try {
			await collaborationService.leaveRoom();
			setCurrentRoom(null);
			setPeers([]);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			setError(`Failed to leave room: ${msg}`);
		} finally {
			setLoading(false);
		}
	};

	const copyRoomId = () => {
		if (currentRoom) {
			navigator.clipboard.writeText(currentRoom.roomId);
			setRoomIdCopied(true);
			setTimeout(() => setRoomIdCopied(false), 2000);
		}
	};

	return (
		<div className="collaboration-panel">
			<button
				className="collaboration-toggle"
				onClick={() => setIsOpen(!isOpen)}
				title="Toggle Collaboration Panel"
			>
				<Users size={18} />
				<span className="collaboration-indicator">
					{currentRoom ? peers.length + 1 : 0}
				</span>
			</button>

			{isOpen && (
				<div className="collaboration-dropdown">
					{!currentRoom ? (
						<div className="collaboration-modes">
							<div className="mode-header">Start Collaborating</div>

							{mode === 'idle' && (
								<div className="mode-buttons">
									<button
										className="mode-button create"
										onClick={() => {
											setMode('create');
											setError('');
										}}
									>
										Create Room
									</button>
									<button
										className="mode-button join"
										onClick={() => {
											setMode('join');
											setError('');
										}}
									>
										Join Room
									</button>
								</div>
							)}

							{mode === 'create' && (
								<div className="mode-form">
									<input
										type="text"
										placeholder="Room name"
										value={roomName}
										onChange={(e) => setRoomName(e.target.value)}
										disabled={loading}
									/>
									<input
										type="text"
										placeholder="Your name"
										value={userName}
										onChange={(e) => setUserName(e.target.value)}
										disabled={loading}
									/>
									<div className="form-buttons">
										<button
											onClick={handleCreateRoom}
											disabled={loading}
											className="btn-primary"
										>
											{loading ? 'Creating...' : 'Create'}
										</button>
										<button
											onClick={() => setMode('idle')}
											disabled={loading}
											className="btn-secondary"
										>
											Cancel
										</button>
									</div>
								</div>
							)}

							{mode === 'join' && (
								<div className="mode-form">
									<input
										type="text"
										placeholder="Room ID"
										value={roomId}
										onChange={(e) => setRoomId(e.target.value)}
										disabled={loading}
									/>
									<input
										type="text"
										placeholder="Your name"
										value={userName}
										onChange={(e) => setUserName(e.target.value)}
										disabled={loading}
									/>
									<div className="form-buttons">
										<button
											onClick={handleJoinRoom}
											disabled={loading}
											className="btn-primary"
										>
											{loading ? 'Joining...' : 'Join'}
										</button>
										<button
											onClick={() => setMode('idle')}
											disabled={loading}
											className="btn-secondary"
										>
											Cancel
										</button>
									</div>
								</div>
							)}

							{error && <div className="error-message">{error}</div>}
						</div>
					) : (
						<div className="room-info">
							<div className="room-header">
								<div className="room-name">{currentRoom.roomName}</div>
								<button
									className="btn-leave"
									onClick={handleLeaveRoom}
									disabled={loading}
									title="Leave room"
								>
									<LogOut size={16} />
								</button>
							</div>

							<div className="room-id-section">
								<label>Room ID:</label>
								<div className="room-id-display">
									<code>{currentRoom.roomId}</code>
									<button
										className="copy-btn"
										onClick={copyRoomId}
										title="Copy room ID"
									>
										{roomIdCopied ? <Check size={14} /> : <Copy size={14} />}
									</button>
								</div>
							</div>

							<div className="peers-section">
								<label>Connected Peers ({peers.length + 1}):</label>
								<div className="peers-list">
									{/* Host */}
									<div className="peer-item host">
										<div className="peer-indicator" style={{ background: '#FF6B6B' }} />
										<div className="peer-name">{currentRoom.hostName}</div>
										<span className="peer-badge">Host</span>
									</div>

									{/* Other peers */}
									{peers.map((peer) => (
										<div key={peer.userId} className="peer-item">
											<div
												className="peer-indicator"
												style={{ background: peer.color || '#888' }}
											/>
											<div className="peer-name">{peer.userName}</div>
											{peer.isOnline && <span className="peer-badge online">●</span>}
										</div>
									))}
								</div>
							</div>

							{error && <div className="error-message">{error}</div>}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default CollaborationPanel;
