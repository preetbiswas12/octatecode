/**
 * VoidOnboarding Chat Interface Component
 * Main chat UI for interacting with selected AI models
 */

import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader, AlertCircle, Copy, Check } from 'lucide-react';
import { backendAPI, ChatMessage, JoinRoomResponse } from '../api/backendAPI.js';

interface ChatInterfaceProps {
	roomId?: string;
	model: string;
	provider: string;
	onCodeChange?: (code: string) => void;
	isDark?: boolean;
}

interface ChatThreadMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
	codeBlock?: {
		language: string;
		code: string;
	};
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
	roomId = 'default-chat-room',
	model,
	provider,
	onCodeChange,
	isDark = false,
}) => {
	const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [roomInfo, setRoomInfo] = useState<JoinRoomResponse | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	// Initialize room connection
	useEffect(() => {
		let unsubscribeChat: (() => void) | null = null;
		let unsubscribeCodeChange: (() => void) | null = null;

		const initializeRoom = async () => {
			try {
				setError(null);

				// Join room and connect signaling WebSocket + P2P data channels
				const joinResponse = await backendAPI.joinRoom(roomId);
				setRoomInfo(joinResponse);
				await backendAPI.enableP2PDataChannels(roomId, {
					onOperation: (op) => {
						if (op && typeof op === 'object' && 'newCode' in op && op.newCode) {
							onCodeChange?.(op.newCode as string);
						}
					},
				});
				setIsConnected(true);

				// Listen for P2P chat messages
				unsubscribeChat = backendAPI.onMessage('chat', (data: any) => {
					const payload = data.data || {};
					const newMessage: ChatThreadMessage = {
						id: (payload.messageId as string) || data.id || `chat-${Date.now().toString(36)}`,
						role: data.userId === backendAPI.getPeerId() ? 'user' : 'assistant',
						content: (payload.text as string) || '',
						timestamp: new Date((payload.timestamp as number) || data.timestamp || Date.now()),
					};
					setMessages(prev => [...prev, newMessage]);
				});

				// Listen for code change broadcasts
				unsubscribeCodeChange = backendAPI.onMessage('code-change', (data: any) => {
					const payload = data.data || {};
					if (payload.newCode) {
						onCodeChange?.(payload.newCode as string);
					}
				});

			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room';
				setError(errorMessage);
				console.error('Room initialization error:', err);
			}
		};

		initializeRoom();

		return () => {
			unsubscribeChat?.();
			unsubscribeCodeChange?.();
			backendAPI.disableP2PDataChannels();
			backendAPI.disconnectWebSocket();
		};
	}, [roomId, onCodeChange]);

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Handle sending message
	const handleSendMessage = async () => {
		if (!inputValue.trim() || isLoading) return;

		const userMessage: ChatThreadMessage = {
			id: `msg-${Date.now()}`,
			role: 'user',
			content: inputValue,
			timestamp: new Date(),
		};

		setMessages(prev => [...prev, userMessage]);
		setInputValue('');
		setIsLoading(true);
		setError(null);

		try {
			// Send message to backend
			await backendAPI.sendMessage(roomId, inputValue);

			// Simulate AI response (in production, this would come from LLM provider)
			// For now, we'll show a placeholder
			const assistantMessage: ChatThreadMessage = {
				id: `msg-${Date.now()}-response`,
				role: 'assistant',
				content: `Processing with ${model} (${provider})...`,
				timestamp: new Date(),
				isStreaming: true,
			};
			setMessages(prev => [...prev, assistantMessage]);

			// In production, call your LLM provider here
			// const response = await callLLMProvider(provider, model, userMessage.content);
			// Update the assistant message with actual response

		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
			setError(errorMessage);

			// Remove the last user message on error
			setMessages(prev => prev.slice(0, -1));
		} finally {
			setIsLoading(false);
		}
	};

	// Copy code block to clipboard
	const handleCopyCode = (code: string, id: string) => {
		navigator.clipboard.writeText(code);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	// Handle Enter key
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<div
			className={`@@void-scope flex flex-col h-[600px] rounded-lg border ${
				isDark
					? 'bg-gray-900 border-gray-700 text-white'
					: 'bg-white border-gray-200 text-gray-900'
			}`}
		>
			{/* Header */}
			<div
				className={`px-4 py-3 border-b ${
					isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
				} flex items-center justify-between`}
			>
				<div>
					<h3 className="font-semibold">Chat with {model}</h3>
					<p className="text-xs opacity-75">{provider}</p>
				</div>
				<div className="text-xs">
					{isConnected ? (
						<span className="text-green-500">● Connected</span>
					) : (
						<span className="text-yellow-500">● Connecting...</span>
					)}
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className={`px-4 py-2 ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'}`}>
					<div className="flex items-center gap-2">
						<AlertCircle size={16} />
						<span className="text-sm">{error}</span>
					</div>
				</div>
			)}

			{/* Messages Container */}
			<div
				className={`flex-1 overflow-y-auto p-4 space-y-4 ${
					isDark ? 'bg-gray-900' : 'bg-white'
				}`}
			>
				{messages.length === 0 ? (
					<div className="h-full flex items-center justify-center text-center opacity-50">
						<div>
							<p className="mb-2">No messages yet</p>
							<p className="text-sm">Start a conversation to begin</p>
						</div>
					</div>
				) : (
					messages.map(message => (
						<div
							key={message.id}
							className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							<div
								className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
									message.role === 'user'
										? isDark
											? 'bg-blue-600 text-white'
											: 'bg-blue-500 text-white'
										: isDark
										? 'bg-gray-700 text-gray-100'
										: 'bg-gray-100 text-gray-900'
								}`}
							>
								{/* Text content */}
								<p className="text-sm whitespace-pre-wrap break-words">
									{message.content}
								</p>

								{/* Code block if present */}
								{message.codeBlock && (
									<div
										className={`mt-2 p-2 rounded ${
											isDark ? 'bg-gray-900' : 'bg-gray-900'
										}`}
									>
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs opacity-75">
												{message.codeBlock.language}
											</span>
											<button
												onClick={() =>
													handleCopyCode(
														message.codeBlock!.code,
														message.id
													)
												}
												className="p-1 hover:opacity-75"
											>
												{copiedId === message.id ? (
													<Check size={14} className="text-green-400" />
												) : (
													<Copy size={14} />
												)}
											</button>
										</div>
										<pre className="text-xs overflow-x-auto text-gray-200">
											<code>{message.codeBlock.code}</code>
										</pre>
									</div>
								)}

								{/* Timestamp */}
								<p className="text-xs opacity-50 mt-1">
									{message.timestamp.toLocaleTimeString()}
								</p>

								{/* Streaming indicator */}
								{message.isStreaming && (
									<div className="flex items-center gap-1 mt-2">
										<Loader size={14} className="animate-spin" />
										<span className="text-xs">Streaming...</span>
									</div>
								)}
							</div>
						</div>
					))
				)}

				{isLoading && (
					<div className="flex justify-start">
						<div
							className={`px-4 py-2 rounded-lg ${
								isDark
									? 'bg-gray-700 text-gray-100'
									: 'bg-gray-100 text-gray-900'
							}`}
						>
							<Loader size={16} className="animate-spin" />
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className={`px-4 py-3 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
				<div className="flex gap-2">
					<textarea
						value={inputValue}
						onChange={e => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your message... (Shift+Enter for newline)"
						disabled={isLoading || !isConnected}
						className={`flex-1 px-3 py-2 rounded border resize-none ${
							isDark
								? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
								: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
						} disabled:opacity-50`}
						rows={2}
					/>
					<button
						onClick={handleSendMessage}
						disabled={isLoading || !isConnected || !inputValue.trim()}
						className={`p-2 rounded transition-colors ${
							isLoading || !isConnected || !inputValue.trim()
								? 'opacity-50 cursor-not-allowed'
								: isDark
								? 'bg-blue-600 hover:bg-blue-700 text-white'
								: 'bg-blue-500 hover:bg-blue-600 text-white'
						}`}
						title={!isConnected ? 'Not connected to room' : 'Send message'}
					>
						<Send size={18} />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ChatInterface;
