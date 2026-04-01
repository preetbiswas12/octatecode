/**
 * Model & Provider Selector Component
 * Allows users to select AI provider and model
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, Globe, Cpu, Lock, Battery } from 'lucide-react';

export interface ProviderConfig {
	name: string;
	displayName: string;
	icon: string;
	requiresKey: boolean;
	isLocal: boolean;
	defaultEndpoint?: string;
	models: ModelConfig[];
}

export interface ModelConfig {
	name: string;
	displayName: string;
	contextWindow: number;
	costPerMToken?: number;
	supportsStreaming: boolean;
	supportsTools: boolean;
}

interface ModelSelectorProps {
	selectedProvider: string;
	selectedModel: string;
	onProviderChange: (provider: string) => void;
	onModelChange: (model: string) => void;
	isDark?: boolean;
}

const PROVIDERS: Record<string, ProviderConfig> = {
	openAI: {
		name: 'openAI',
		displayName: 'OpenAI',
		icon: '🤖',
		requiresKey: true,
		isLocal: false,
		models: [
			{
				name: 'gpt-4o',
				displayName: 'GPT-4o',
				contextWindow: 128000,
				costPerMToken: 15,
				supportsStreaming: true,
				supportsTools: true,
			},
			{
				name: 'gpt-4-turbo',
				displayName: 'GPT-4 Turbo',
				contextWindow: 128000,
				costPerMToken: 10,
				supportsStreaming: true,
				supportsTools: true,
			},
			{
				name: 'gpt-3.5-turbo',
				displayName: 'GPT-3.5 Turbo',
				contextWindow: 16000,
				costPerMToken: 0.5,
				supportsStreaming: true,
				supportsTools: true,
			},
		],
	},
	anthropic: {
		name: 'anthropic',
		displayName: 'Anthropic',
		icon: '🧠',
		requiresKey: true,
		isLocal: false,
		models: [
			{
				name: 'claude-opus-4',
				displayName: 'Claude Opus 4',
				contextWindow: 200000,
				costPerMToken: 15,
				supportsStreaming: true,
				supportsTools: true,
			},
			{
				name: 'claude-sonnet-3.5',
				displayName: 'Claude Sonnet 3.5',
				contextWindow: 200000,
				costPerMToken: 3,
				supportsStreaming: true,
				supportsTools: true,
			},
			{
				name: 'claude-haiku-3',
				displayName: 'Claude Haiku 3',
				contextWindow: 200000,
				costPerMToken: 0.8,
				supportsStreaming: true,
				supportsTools: false,
			},
		],
	},
	ollama: {
		name: 'ollama',
		displayName: 'Ollama (Local)',
		icon: '🦙',
		requiresKey: false,
		isLocal: true,
		defaultEndpoint: 'http://localhost:11434',
		models: [
			{
				name: 'mistral',
				displayName: 'Mistral',
				contextWindow: 8000,
				supportsStreaming: true,
				supportsTools: false,
			},
			{
				name: 'neural-chat',
				displayName: 'Neural Chat',
				contextWindow: 4096,
				supportsStreaming: true,
				supportsTools: false,
			},
			{
				name: 'codeup',
				displayName: 'CodeUp',
				contextWindow: 8000,
				supportsStreaming: true,
				supportsTools: false,
			},
		],
	},
	deepseek: {
		name: 'deepseek',
		displayName: 'DeepSeek',
		icon: '🔍',
		requiresKey: true,
		isLocal: false,
		models: [
			{
				name: 'deepseek-coder',
				displayName: 'DeepSeek Coder',
				contextWindow: 128000,
				costPerMToken: 0.14,
				supportsStreaming: true,
				supportsTools: true,
			},
			{
				name: 'deepseek-chat',
				displayName: 'DeepSeek Chat',
				contextWindow: 4000,
				costPerMToken: 0.02,
				supportsStreaming: true,
				supportsTools: false,
			},
		],
	},
	groq: {
		name: 'groq',
		displayName: 'Groq',
		icon: '⚡',
		requiresKey: true,
		isLocal: false,
		models: [
			{
				name: 'mixtral-8x7b-32768',
				displayName: 'Mixtral 8x7B',
				contextWindow: 32768,
				supportsStreaming: true,
				supportsTools: false,
			},
			{
				name: 'llama2-70b-4096',
				displayName: 'Llama 2 70B',
				contextWindow: 4096,
				supportsStreaming: true,
				supportsTools: false,
			},
		],
	},
};

const getProviderIcon = (provider: string): React.ReactNode => {
	const config = PROVIDERS[provider];
	if (!config) return '❓';

	switch (provider) {
		case 'openAI':
			return '🤖';
		case 'anthropic':
			return '🧠';
		case 'ollama':
			return '🦙';
		case 'deepseek':
			return '🔍';
		case 'groq':
			return '⚡';
		default:
			return '💬';
	}
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
	selectedProvider,
	selectedModel,
	onProviderChange,
	onModelChange,
	isDark = false,
}) => {
	const [isProviderOpen, setIsProviderOpen] = useState(false);
	const [isModelOpen, setIsModelOpen] = useState(false);
	const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);

	// Update model config when model changes
	useEffect(() => {
		const provider = PROVIDERS[selectedProvider];
		if (provider) {
			const model = provider.models.find(m => m.name === selectedModel);
			setSelectedModelConfig(model || null);
		}
	}, [selectedProvider, selectedModel]);

	const currentProvider = PROVIDERS[selectedProvider];
	const currentModels = currentProvider?.models || [];

	const bgClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300';
	const textClass = isDark ? 'text-white' : 'text-gray-900';
	const hoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

	return (
		<div className={`@@void-scope space-y-4 p-4 rounded-lg ${bgClass} border`}>
			{/* Provider Selection */}
			<div>
				<label className="block text-sm font-medium mb-2">AI Provider</label>
				<div className="relative">
					<button
						onClick={() => setIsProviderOpen(!isProviderOpen)}
						className={`w-full px-4 py-2 rounded border flex items-center justify-between ${
							isDark
								? 'bg-gray-700 border-gray-600 text-white'
								: 'bg-gray-50 border-gray-300 text-gray-900'
						} hover:opacity-80 transition-opacity`}
					>
						<div className="flex items-center gap-2">
							<span>{getProviderIcon(selectedProvider)}</span>
							<span>{currentProvider?.displayName || 'Select provider'}</span>
						</div>
						<ChevronDown size={18} className={`transition-transform ${isProviderOpen ? 'rotate-180' : ''}`} />
					</button>

					{isProviderOpen && (
						<div
							className={`absolute top-full left-0 right-0 mt-1 border rounded shadow-lg z-10 ${bgClass}`}
						>
							{Object.values(PROVIDERS).map(provider => (
								<button
									key={provider.name}
									onClick={() => {
										onProviderChange(provider.name);
										setIsProviderOpen(false);
										// Auto-select first model of new provider
										if (provider.models.length > 0) {
											onModelChange(provider.models[0].name);
										}
									}}
									className={`w-full text-left px-4 py-2 flex items-center gap-2 ${hoverClass} border-b last:border-b-0 ${textClass}`}
								>
									<span>{getProviderIcon(provider.name)}</span>
									<div>
										<div className="font-medium">{provider.displayName}</div>
										<div className="text-xs opacity-75">
											{provider.isLocal ? (
												<span className="flex items-center gap-1">
													<Battery size={12} /> Local
												</span>
											) : (
												<span className="flex items-center gap-1">
													<Globe size={12} /> Cloud
												</span>
											)}
										</div>
									</div>
									{provider.requiresKey && !provider.isLocal && (
										<Lock size={14} className="ml-auto opacity-50" />
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Model Selection */}
			<div>
				<label className="block text-sm font-medium mb-2">Model</label>
				<div className="relative">
					<button
						onClick={() => setIsModelOpen(!isModelOpen)}
						className={`w-full px-4 py-2 rounded border flex items-center justify-between ${
							isDark
								? 'bg-gray-700 border-gray-600 text-white'
								: 'bg-gray-50 border-gray-300 text-gray-900'
						} hover:opacity-80 transition-opacity`}
					>
						<div className="flex items-center gap-2">
							<Cpu size={18} />
							<span>{selectedModelConfig?.displayName || 'Select model'}</span>
						</div>
						<ChevronDown size={18} className={`transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
					</button>

					{isModelOpen && (
						<div
							className={`absolute top-full left-0 right-0 mt-1 border rounded shadow-lg z-10 max-h-64 overflow-y-auto ${bgClass}`}
						>
							{currentModels.map(model => (
								<button
									key={model.name}
									onClick={() => {
										onModelChange(model.name);
										setIsModelOpen(false);
									}}
									className={`w-full text-left px-4 py-3 ${hoverClass} border-b last:border-b-0 ${textClass}`}
								>
									<div className="font-medium">{model.displayName}</div>
									<div className="text-xs opacity-75 mt-1 space-y-1">
										<div>Context: {model.contextWindow.toLocaleString()} tokens</div>
										{model.costPerMToken && (
											<div>Cost: ${model.costPerMToken}/M tokens</div>
										)}
										<div className="flex gap-2 mt-2">
											{model.supportsStreaming && (
												<span className="px-2 py-1 bg-green-900 bg-opacity-50 rounded text-xs">
													Streaming
												</span>
											)}
											{model.supportsTools && (
												<span className="px-2 py-1 bg-blue-900 bg-opacity-50 rounded text-xs">
													Tools
												</span>
											)}
										</div>
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Model Details Card */}
			{selectedModelConfig && (
				<div
					className={`px-4 py-3 rounded border ${
						isDark ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
					}`}
				>
					<h4 className="font-medium mb-2">Model Details</h4>
					<div className="text-sm space-y-1 opacity-75">
						<p>
							<span className="font-medium">Context Window:</span>{' '}
							{selectedModelConfig.contextWindow.toLocaleString()} tokens
						</p>
						{selectedModelConfig.costPerMToken && (
							<p>
								<span className="font-medium">Cost:</span> ${selectedModelConfig.costPerMToken}
								/M tokens
							</p>
						)}
						<p>
							<span className="font-medium">Streaming:</span>{' '}
							{selectedModelConfig.supportsStreaming ? '✅ Yes' : '❌ No'}
						</p>
						<p>
							<span className="font-medium">Tool Use:</span>{' '}
							{selectedModelConfig.supportsTools ? '✅ Yes' : '❌ No'}
						</p>
					</div>
				</div>
			)}

			{/* Provider Info */}
			{currentProvider?.isLocal && (
				<div
					className={`px-4 py-3 rounded border ${
						isDark ? 'bg-yellow-900 bg-opacity-30' : 'bg-yellow-50'
					}`}
				>
					<p className="text-sm">
						<span className="font-medium">Local Model:</span> Make sure{' '}
						<code className={`px-1 rounded ${isDark ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
							{currentProvider.defaultEndpoint}
						</code>{' '}
						is running.
					</p>
				</div>
			)}
		</div>
	);
};

export default ModelSelector;
