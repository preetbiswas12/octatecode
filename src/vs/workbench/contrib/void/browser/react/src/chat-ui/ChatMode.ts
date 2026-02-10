/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

export type ChatModeType = 'agent' | 'plan' | 'ask' | 'edit';

export const chatModes: ChatModeType[] = ['agent', 'plan', 'ask', 'edit'];

export const chatModeDescriptions: Record<ChatModeType, { label: string; description: string; emoji: string }> = {
	agent: {
		label: 'Agent',
		description: 'Full autonomous AI that can create files, build projects, and execute commands',
		emoji: '🤖'
	},
	plan: {
		label: 'Plan',
		description: 'AI planning mode - explains what would be done without executing',
		emoji: '📋'
	},
	ask: {
		label: 'Ask',
		description: 'Standard AI assistant for questions, code snippets, and explanations',
		emoji: '❓'
	},
	edit: {
		label: 'Edit',
		description: 'Mini-agent for editing existing files - no file creation',
		emoji: '✏️'
	},
};

export const modeSystemPrompts: Record<ChatModeType, string> = {
	agent: `You are an autonomous AI agent with full capabilities. You can:
- Create new files and folders
- Modify existing files
- Execute commands and scripts
- Build and deploy projects
- Make independent decisions

Always provide clear explanations of what you're doing. Ask for confirmation before destructive operations.
Be proactive in suggesting improvements and optimizations.`,

	plan: `You are an expert planning AI. Your role is to:
- Analyze requirements and suggest approaches
- Break down complex tasks into steps
- Explain architectural decisions
- Provide detailed planning without execution
- Suggest best practices and optimizations

Always provide step-by-step breakdowns. Never execute commands or create files. Focus on clarity and comprehensive planning.`,

	ask: `You are a helpful AI assistant. You:
- Answer questions thoroughly
- Provide code examples
- Explain concepts clearly
- Suggest solutions
- Help with debugging

Keep responses concise but complete. Provide code in markdown blocks. Ask clarifying questions when needed.`,

	edit: `You are an expert code editor AI. You:
- Edit existing files for improvements
- Fix bugs in code
- Refactor for better quality
- Add features to existing code
- Cannot create new files

Only modify existing files. Suggest changes clearly with explanations. Ask before major refactoring.`
};

export const modeToolAvailability: Record<ChatModeType, string[]> = {
	agent: ['create_file', 'edit_file', 'delete_file', 'run_command', 'terminal', 'plan', 'analysis'],
	plan: ['analyze', 'suggest', 'documentation'],
	ask: ['code_search', 'documentation', 'analysis'],
	edit: ['edit_file', 'file_search', 'analysis'] // No create_file
};

export const modeIcons: Record<ChatModeType, string> = {
	agent: '🤖',
	plan: '📋',
	ask: '❓',
	edit: '✏️'
};

export const modeStatusMessages: Record<ChatModeType, string> = {
	agent: 'Building your project...',
	plan: 'Planning the approach...',
	ask: 'Thinking...',
	edit: 'Editing files...'
};
