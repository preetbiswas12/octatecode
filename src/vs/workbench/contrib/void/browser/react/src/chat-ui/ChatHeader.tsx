/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Settings, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import './chat-ui.css';

export interface ChatHeaderProps {
	sessions: Array<{
		id: string;
		name: string;
		lastMessageAt: number;
	}>;
	activeSessionId: string;
	onNewSession: () => void;
	onSelectSession: (sessionId: string) => void;
	onCloseSession: (sessionId: string) => void;
	onOpenSettings: () => void;
	onOpenPreviousChats?: () => Promise<void>;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
	sessions,
	activeSessionId,
	onNewSession,
	onSelectSession,
	onCloseSession,
	onOpenSettings,
	onOpenPreviousChats,
}) => {
	const [scrollPosition, setScrollPosition] = useState(0);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const tabsRef = React.useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setDropdownOpen(false);
			}
		};

		if (dropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
		return undefined;
	}, [dropdownOpen]);

	const handleScroll = (direction: 'left' | 'right') => {
		if (!tabsRef.current) return;
		const scrollAmount = 200;
		const newPosition = direction === 'left' ? scrollPosition - scrollAmount : scrollPosition + scrollAmount;
		setScrollPosition(Math.max(0, newPosition));
		tabsRef.current.scrollLeft = newPosition;
	};

	const canScrollLeft = scrollPosition > 0;
	const canScrollRight = tabsRef.current ? tabsRef.current.scrollLeft < tabsRef.current.scrollWidth - tabsRef.current.clientWidth : false;

	return (
		<div className="copilot-chat-header">
			{/* Session Tabs Bar */}
			<div className="chat-tabs-container">
				{/* New Chat + Dropdown */}
				<div className="chat-new-chat-group">
					{/* New Chat Button */}
					<button
						className="chat-new-button"
						onClick={onNewSession}
						title="New chat (Ctrl+L)"
						aria-label="New chat"
					>
						<Plus size={16} />
					</button>

					{/* Previous Chats Dropdown */}
					<div className="chat-dropdown-container" ref={dropdownRef}>
						<button
							className="chat-dropdown-toggle"
							onClick={() => setDropdownOpen(!dropdownOpen)}
							title="Previous chats"
							aria-label="Toggle previous chats"
							aria-expanded={dropdownOpen}
						>
							<ChevronDown size={16} />
						</button>

						{dropdownOpen && (
							<div className="chat-dropdown-menu">
								<div className="chat-dropdown-item" onClick={async () => {
									setDropdownOpen(false);
									if (onOpenPreviousChats) {
										try {
											await onOpenPreviousChats();
										} catch (error) {
											console.error('Error opening previous chats:', error);
										}
									}
								}}>
									<span>📂 Go to previous chats</span>
								</div>
								<div className="chat-dropdown-divider" />
								<div className="chat-dropdown-section-title">Recent in folder</div>
								{sessions.slice(0, 5).map((session) => (
									<div
										key={session.id}
										className="chat-dropdown-item"
										onClick={() => {
											onSelectSession(session.id);
											setDropdownOpen(false);
										}}
									>
										<span className="chat-dropdown-item-name">{session.name}</span>
										<span className="chat-dropdown-item-time">
											{new Date(session.lastMessageAt).toLocaleDateString()}
										</span>
									</div>
								))}
								{sessions.length === 0 && (
									<div className="chat-dropdown-empty">No previous chats</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Scroll Left */}
				{canScrollLeft && (
					<button
						className="chat-scroll-button"
						onClick={() => handleScroll('left')}
						aria-label="Scroll tabs left"
					>
						<ChevronLeft size={14} />
					</button>
				)}

				{/* Session Tabs */}
				<div
					className="chat-tabs-scroll"
					ref={tabsRef}
				>
					{sessions.map((session) => (
						<div
							key={session.id}
							className={`chat-tab ${activeSessionId === session.id ? 'active' : ''}`}
							onClick={() => onSelectSession(session.id)}
							title={session.name}
						>
							<span className="chat-tab-name">{session.name}</span>
							<button
								className="chat-tab-close"
								onClick={(e) => {
									e.stopPropagation();
									onCloseSession(session.id);
								}}
								aria-label={`Close ${session.name}`}
							>
								×
							</button>
						</div>
					))}
				</div>

				{/* Scroll Right */}
				{canScrollRight && (
					<button
						className="chat-scroll-button"
						onClick={() => handleScroll('right')}
						aria-label="Scroll tabs right"
					>
						<ChevronRight size={14} />
					</button>
				)}

				{/* Settings Button */}
				<button
					className="chat-settings-button"
					onClick={onOpenSettings}
					title="Settings"
					aria-label="Open settings"
				>
					<Settings size={16} />
				</button>
			</div>
	</div>
);
};

export default ChatHeader;
