/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState } from 'react';
import { X, Eye, EyeOff,  Trash2 } from 'lucide-react';
import { ChatModeType, chatModeDescriptions, modeSystemPrompts } from './ChatMode.js';
import './chat-ui.css';

export interface ChatSettingsPanelProps {
	isOpen: boolean;
	currentMode: ChatModeType;
	customPrompt: string;
	sessions: Array<{
		id: string;
		name: string;
		lastMessageAt: number;
		messageCount: number;
	}>;
	activeSessionId: string;
	onClose: () => void;
	onCustomPromptChange: (prompt: string) => void;
	onCustomPromptReset: () => void;
	onSelectSession: (sessionId: string) => void;
	onDeleteSession: (sessionId: string) => void;
	onOpenInNewWindow?: () => void;
}

const SessionManagerSection: React.FC<{
	sessions: Array<{
		id: string;
		name: string;
		lastMessageAt: number;
		messageCount: number;
	}>;
	activeSessionId: string;
	onSelectSession: (sessionId: string) => void;
	onDeleteSession: (sessionId: string) => void;
}> = ({ sessions, activeSessionId, onSelectSession, onDeleteSession }) => {
	return (
		<div className="settings-section">
			<h3 className="settings-section-title">Sessions in This Folder</h3>
			<div className="sessions-list">
				{sessions.length === 0 ? (
					<p className="settings-empty-state">No sessions yet. Start a new chat to create one.</p>
				) : (
					sessions.map((session) => (
						<div
							key={session.id}
							className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
							onClick={() => onSelectSession(session.id)}
						>
							<div className="session-info">
								<div className="session-name">{session.name}</div>
								<div className="session-meta">
									{session.messageCount} messages • {new Date(session.lastMessageAt).toLocaleDateString()}
								</div>
							</div>
							<button
								className="session-delete-btn"
								onClick={(e) => {
									e.stopPropagation();
									if (confirm(`Delete session "${session.name}"?`)) {
										onDeleteSession(session.id);
									}
								}}
								title="Delete session"
								aria-label={`Delete ${session.name}`}
							>
								<Trash2 size={14} />
							</button>
						</div>
					))
				)}
			</div>
		</div>
	);
};

const CustomPromptSection: React.FC<{
	currentMode: ChatModeType;
	customPrompt: string;
	onCustomPromptChange: (prompt: string) => void;
	onCustomPromptReset: () => void;
}> = ({ currentMode, customPrompt, onCustomPromptChange, onCustomPromptReset }) => {
	const [showPreview, setShowPreview] = useState(false);
	const defaultPrompt = modeSystemPrompts[currentMode];

	return (
		<div className="settings-section">
			<h3 className="settings-section-title">Custom System Prompt</h3>
			<p className="settings-section-description">
				Customize the system prompt for {chatModeDescriptions[currentMode].label} mode. Leave empty to use default.
			</p>

			<div className="prompt-editor-wrapper">
				<textarea
					className="prompt-editor"
					value={customPrompt}
					onChange={(e) => onCustomPromptChange(e.target.value)}
					placeholder={defaultPrompt}
					rows={6}
					aria-label="Custom system prompt"
				/>
				<div className="prompt-editor-buttons">
					<button
						className="settings-button secondary"
						onClick={() => setShowPreview(!showPreview)}
						title={showPreview ? 'Hide preview' : 'Show preview'}
					>
						{showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
						{showPreview ? 'Hide' : 'Show'} Preview
					</button>
					{customPrompt && (
						<button
							className="settings-button secondary"
							onClick={onCustomPromptReset}
							title="Reset to default prompt"
						>
							Reset to Default
						</button>
					)}
				</div>
			</div>

			{showPreview && (
				<div className="prompt-preview">
					<h4>Prompt Preview</h4>
					<p className="preview-text">{customPrompt || defaultPrompt}</p>
				</div>
			)}
		</div>
	);
};

const ModeHelpSection: React.FC<{ currentMode: ChatModeType }> = ({ currentMode }) => {
	const modeInfo = chatModeDescriptions[currentMode];
	const toolsInfo: Record<ChatModeType, string[]> = {
		agent: ['File Creation', 'File Editing', 'Command Execution', 'Project Building'],
		plan: ['Analysis', 'Architecture Planning', 'Step-by-step Guidance'],
		ask: ['Code Search', 'Documentation', 'Question Answering'],
		edit: ['File Editing', 'Code Refactoring', 'Bug Fixing'],
	};

	return (
		<div className="settings-section">
			<h3 className="settings-section-title">About {modeInfo.label} Mode</h3>
			<p className="settings-section-description">{modeInfo.description}</p>

			<div className="mode-tools">
				<h4>Available Capabilities:</h4>
				<ul className="tools-list">
					{toolsInfo[currentMode].map((tool) => (
						<li key={tool}>✓ {tool}</li>
					))}
				</ul>
			</div>

			<div className="mode-tips">
				<h4>Tips:</h4>
				<ul className="tips-list">
					{currentMode === 'agent' && (
						<>
							<li>Perfect for creating new projects from scratch</li>
							<li>AI will ask for confirmation before major changes</li>
							<li>Best for complete project builds</li>
						</>
					)}
					{currentMode === 'plan' && (
						<>
							<li>Use to understand approach before execution</li>
							<li>Great for architecture decisions</li>
							<li>No code will be modified</li>
						</>
					)}
					{currentMode === 'ask' && (
						<>
							<li>Perfect for learning and debugging</li>
							<li>Get code examples and explanations</li>
							<li>No file operations performed</li>
						</>
					)}
					{currentMode === 'edit' && (
						<>
							<li>Modify existing files safely</li>
							<li>Great for refactoring and improvements</li>
							<li>Cannot create new files</li>
						</>
					)}
				</ul>
			</div>
		</div>
	);
};

export const ChatSettingsPanel: React.FC<ChatSettingsPanelProps> = ({
	isOpen,
	currentMode,
	customPrompt,
	sessions,
	activeSessionId,
	onClose,
	onCustomPromptChange,
	onCustomPromptReset,
	onSelectSession,
	onDeleteSession,
	onOpenInNewWindow,
}) => {
	return (
		<div className={`chat-settings-panel ${isOpen ? 'open' : 'closed'}`}>
			{/* Panel Header */}
			<div className="settings-panel-header">
				<h2 className="settings-panel-title">Settings</h2>
				<button
					className="settings-close-btn"
					onClick={onClose}
					title="Close settings"
					aria-label="Close settings"
				>
					<X size={20} />
				</button>
			</div>

			{/* Panel Content */}
			<div className="settings-panel-content">
				<CustomPromptSection
					currentMode={currentMode}
					customPrompt={customPrompt}
					onCustomPromptChange={onCustomPromptChange}
					onCustomPromptReset={onCustomPromptReset}
				/>

				<SessionManagerSection
					sessions={sessions}
					activeSessionId={activeSessionId}
					onSelectSession={onSelectSession}
					onDeleteSession={onDeleteSession}
				/>

				<div className="settings-section">
					<h3 className="settings-section-title">Window Options</h3>
					{onOpenInNewWindow && (
						<button
							className="settings-button primary"
							onClick={onOpenInNewWindow}
							title="Open chat in a new window"
						>
							Open in New Window
						</button>
					)}
					<p className="settings-hint">Open this chat session in a dedicated window for focused work.</p>
				</div>

				<ModeHelpSection currentMode={currentMode} />
			</div>
		</div>
	);
};

export default ChatSettingsPanel;
