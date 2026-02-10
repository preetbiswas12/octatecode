/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useCallback, useEffect } from 'react';
import { ChatHeader } from './ChatHeader.js';
import ChatSettingsPanel from './ChatSettingsPanel.js';
import { ChatModeType,  modeStatusMessages } from './ChatMode.js';
import './chat-ui.css';

export interface Session {
	id: string;
	name: string;
	mode: ChatModeType;
	customPrompt: string;
	createdAt: number;
	lastMessageAt: number;
	messageCount: number;
}

export interface ChatContainerProps {
	threadId: string;
	folderPath: string;

	// Session Management
	sessions: Session[];
	activeSessionId: string;
	onSessionChange: (sessionId: string) => void;
	onNewSession: () => void;
	onDeleteSession: (sessionId: string) => void;

	// Mode Management
	currentMode: ChatModeType;
	onModeChange: (mode: ChatModeType) => void;

	// Custom Prompt
	customPrompt: string;
	onCustomPromptChange: (prompt: string) => void;
	onCustomPromptReset: () => void;

	// Content Area
	children: React.ReactNode; // Chat messages area

	// Optional Callbacks
	onOpenInNewWindow?: () => void;
	onLoadSession?: (sessionId: string) => Promise<void>;
	onOpenPreviousChats?: () => Promise<void>;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
	threadId,
	folderPath,
	sessions,
	activeSessionId,
	onSessionChange,
	onNewSession,
	onDeleteSession,
	currentMode,
	onModeChange,
	customPrompt,
	onCustomPromptChange,
	onCustomPromptReset,
	children,
	onOpenInNewWindow,
	onLoadSession,
}) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Handle session changes with loading state
	const handleSelectSession = useCallback(
		async (sessionId: string) => {
			if (sessionId === activeSessionId) return;

			setIsLoading(true);
			try {
				if (onLoadSession) {
					await onLoadSession(sessionId);
				}
				onSessionChange(sessionId);
			} finally {
				setIsLoading(false);
			}
		},
		[activeSessionId, onSessionChange, onLoadSession]
	);

	// Get active session info
	const activeSession = sessions.find((s) => s.id === activeSessionId);
	const activeSessions = sessions.slice(0, 10); // Show max 10 tabs

	// Store current mode prompt mode when it changes
	useEffect(() => {
		// This could trigger a save to persistent storage if needed
		// e.g., saveSessionMetadata({ mode: currentMode, customPrompt })
	}, [currentMode, customPrompt]);

	return (
		<div className="copilot-chat-container">
			{/* Header with tabs */}
			<ChatHeader
				sessions={activeSessions.map((s) => ({
					id: s.id,
					name: s.name,
					lastMessageAt: s.lastMessageAt,
				}))}
				activeSessionId={activeSessionId}
				onNewSession={onNewSession}
				onSelectSession={handleSelectSession}
				onCloseSession={(sessionId: string) => {
					onDeleteSession(sessionId);
					// If we deleted the active session, switch to first available
					if (sessionId === activeSessionId && sessions.length > 1) {
						const nextSession = sessions.find((s) => s.id !== sessionId);
						if (nextSession) {
							handleSelectSession(nextSession.id);
						}
					}
				}}
				onOpenSettings={() => setSettingsOpen(true)}
			/>

			{/* Main Layout: Chat Content + Settings Sidebar */}
			<div className="chat-main-layout">
				{/* Chat Content Area */}
				<div className="chat-content-area">
					{isLoading ? (
						<div className="chat-loading-state">
							<div className="loading-spinner">
								<div className="spinner-dot" />
								<div className="spinner-dot" />
								<div className="spinner-dot" />
							</div>
							<p>Loading session...</p>
						</div>
					) : (
						children
					)}
				</div>

				{/* Settings Panel - Collapsible Sidebar */}
				<ChatSettingsPanel
					isOpen={settingsOpen}
					currentMode={currentMode}
					customPrompt={customPrompt}
					sessions={sessions.map((s) => ({
						id: s.id,
						name: s.name,
						lastMessageAt: s.lastMessageAt,
						messageCount: s.messageCount,
					}))}
					activeSessionId={activeSessionId}
					onClose={() => setSettingsOpen(false)}
					onCustomPromptChange={onCustomPromptChange}
					onCustomPromptReset={onCustomPromptReset}
					onSelectSession={handleSelectSession}
					onDeleteSession={onDeleteSession}
					onOpenInNewWindow={onOpenInNewWindow}
				/>
			</div>

			{/* Optional: Status bar showing current mode */}
			{activeSession && (
				<div className="chat-status-bar">
					<div className="status-content">
						<span className="status-mode">
							Mode: <strong>{currentMode.toUpperCase()}</strong>
						</span>
						{currentMode === 'agent' && (
							<span className="status-info">🤖 {modeStatusMessages[currentMode]}</span>
						)}
						{currentMode === 'plan' && (
							<span className="status-info">📋 {modeStatusMessages[currentMode]}</span>
						)}
						{currentMode === 'ask' && (
							<span className="status-info">❓ {modeStatusMessages[currentMode]}</span>
						)}
						{currentMode === 'edit' && (
							<span className="status-info">✏️ {modeStatusMessages[currentMode]}</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default ChatContainer;
