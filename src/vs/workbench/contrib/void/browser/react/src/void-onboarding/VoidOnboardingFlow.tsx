/**
 * Complete Void Onboarding Flow Integration
 * Main component that orchestrates chat, model selection, and code diffs
 */

import React, { useState, useCallback } from 'react';
import { Settings, LogOut, RefreshCw } from 'lucide-react';
import ChatInterface from './ChatInterface.js';
import { ModelSelector } from './ModelSelector.js';
import {
	Alert, LoadingSpinner, Button, Badge, Card
} from '../components/SharedComponents.js';
import { backendAPI, JoinRoomResponse, Room } from '../api/backendAPI.js';

interface VoidOnboardingFlowProps {
	isDark?: boolean;
}

interface RoomSession {
	roomInfo: JoinRoomResponse | null;
	roomDetails: Room | null;
	isConnected: boolean;
	peerId: string | null;
}

export const VoidOnboardingFlow: React.FC<VoidOnboardingFlowProps> = ({ isDark = false }) => {
	// Model selection state
	const [selectedProvider, setSelectedProvider] = useState('openAI');
	const [selectedModel, setSelectedModel] = useState('gpt-4o');

	// UI state
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Room & Session state
	const [currentRoom, setCurrentRoom] = useState<RoomSession>({
		roomInfo: null,
		roomDetails: null,
		isConnected: false,
		peerId: null,
	});

	// Initialize room on mount
	const initializeRoom = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const roomId = 'main-collaboration-room';

			// Join room
			const joinResponse = await backendAPI.joinRoom(roomId);
			setCurrentRoom(prev => ({
				...prev,
				roomInfo: joinResponse,
				peerId: joinResponse.peerId,
				isConnected: true,
			}));

			// Get room details
			const roomDetails = await backendAPI.getRoom(roomId);
			setCurrentRoom(prev => ({
				...prev,
				roomDetails,
			}));

			setSuccessMessage('✅ Connected to collaboration room');
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to initialize room';
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Handle logout
	const handleLogout = useCallback(() => {
		backendAPI.disconnect();
		setCurrentRoom({
			roomInfo: null,
			roomDetails: null,
			isConnected: false,
			peerId: null,
		});
	}, []);

	// Render content
	return (
		<div
			className={`@@void-scope min-h-screen ${
				isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
			}`}
		>
			{/* Header */}
			<header
				className={`border-b sticky top-0 z-40 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
			>
				<div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">🚀 OctateCode</h1>
						<p className="text-sm opacity-75">AI-Powered Collaboration Hub</p>
					</div>

					{/* Status Info */}
					<div className="flex items-center gap-3">
						{currentRoom.isConnected && (
							<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900 bg-opacity-30">
								<span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
								<span className="text-sm">Connected</span>
							</div>
						)}

						<Button
							variant="ghost"
							size="sm"
							isDark={isDark}
							onClick={() => setIsSettingsOpen(!isSettingsOpen)}
						>
							<Settings size={18} />
						</Button>

						<Button variant="danger" size="sm" isDark={isDark} onClick={handleLogout}>
							<LogOut size={18} />
						</Button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 py-8">
				{/* Alerts */}
				<div className="space-y-3 mb-6">
					{error && (
						<Alert type="error" title="Error" message={error} isDark={isDark} onClose={() => setError(null)} />
					)}
					{successMessage && (
						<Alert type="success" title="Success" message={successMessage} isDark={isDark} autoClose={3000} />
					)}
				</div>

				{/* Loading State */}
				{isLoading && currentRoom.roomInfo === null && (
					<div className="flex justify-center items-center h-96">
						<LoadingSpinner isDark={isDark} message="Connecting to collaboration server..." />
					</div>
				)}

				{/* Connected State */}
				{currentRoom.isConnected && (
					<div className="space-y-6">
						{/* Top Bar with Settings Toggle */}
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">Collaboration Session</h2>
							{currentRoom.roomDetails && (
								<div className="flex gap-2">
									<Badge label={`${currentRoom.roomDetails.peersCount} Peers`} isDark={isDark} />
									<Badge
										label={`Room: ${currentRoom.roomDetails.id.slice(0, 8)}`}
										variant="info"
										isDark={isDark}
									/>
								</div>
							)}
						</div>

						{/* Settings Panel */}
						{isSettingsOpen && (
							<Card isDark={isDark} header={<h3 className="font-semibold">Settings</h3>}>
								<div className="space-y-4">
									<ModelSelector
										selectedProvider={selectedProvider}
										selectedModel={selectedModel}
										onProviderChange={setSelectedProvider}
										onModelChange={setSelectedModel}
										isDark={isDark}
									/>
								</div>
							</Card>
						)}

						{/* Main Content Grid */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Chat Column */}
							<div className="lg:col-span-2">
								<ChatInterface
									roomId={currentRoom.roomInfo?.roomId || 'default'}
									model={selectedModel}
									provider={selectedProvider}
									isDark={isDark}
									onCodeChange={code => {
										// Handle code preview here
										console.log('Code changed:', code);
									}}
								/>
							</div>

							{/* Sidebar */}
							<div className="space-y-4">
								{/* Quick Info */}
								<Card
									isDark={isDark}
									header={<h3 className="font-semibold">Session Info</h3>}
								>
									<div className="space-y-2 text-sm">
										<div>
											<span className="opacity-75">Peer ID:</span>
											<code className="block text-xs mt-1 p-2 bg-opacity-20 bg-gray-500 rounded">
												{currentRoom.peerId?.slice(0, 12)}...
											</code>
										</div>
										<div>
											<span className="opacity-75">Room:</span>
											<code className="block text-xs mt-1 p-2 bg-opacity-20 bg-gray-500 rounded">
												{currentRoom.roomInfo?.roomId.slice(0, 12)}...
											</code>
										</div>
										<Button
											variant="secondary"
											size="sm"
											isDark={isDark}
											onClick={initializeRoom}
											className="w-full"
										>
											<RefreshCw size={14} />
											Reconnect
										</Button>
									</div>
								</Card>

								{/* Model Info */}
								<Card
									isDark={isDark}
									header={<h3 className="font-semibold">Active Model</h3>}
								>
									<div className="space-y-2 text-sm">
										<div>
											<Badge label={selectedProvider} isDark={isDark} />
										</div>
										<div className="font-medium">{selectedModel}</div>
										<Button
											variant="primary"
											size="sm"
											isDark={isDark}
											onClick={() => setIsSettingsOpen(true)}
											className="w-full"
										>
											Change Model
										</Button>
									</div>
								</Card>
							</div>
						</div>

					</div>
				)}

				{/* Not Connected State */}
				{!currentRoom.isConnected && !isLoading && (
					<div className="text-center py-12">
						<h3 className="text-lg font-semibold mb-4">Welcome to OctateCode</h3>
						<p className="opacity-75 mb-6">Click the button below to connect to the collaboration server</p>
						<Button
							variant="primary"
							size="lg"
							isDark={isDark}
							onClick={initializeRoom}
							isLoading={isLoading}
						>
							🚀 Start Collaborating
						</Button>
					</div>
				)}
			</main>

			{/* Footer */}
			<footer
				className={`border-t mt-8 py-4 text-center text-sm opacity-50 ${
					isDark ? 'border-gray-700' : 'border-gray-200'
				}`}
			>
				<p>OctateCode © 2025 | P2P Collaboration · Open Source · AI-Powered</p>
			</footer>
		</div>
	);
};

export default VoidOnboardingFlow;
