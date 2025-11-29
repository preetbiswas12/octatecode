# OctateCode IDE - Comprehensive Features Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Core Features](#core-features)
5. [AI/LLM Integration](#aiллm-integration)
6. [Real-time Collaboration](#real-time-collaboration)
7. [Onboarding & Settings](#onboarding--settings)
8. [UI Components & Widgets](#ui-components--widgets)

---

## 🎯 Project Overview

**OctateCode** is a modern IDE built on VS Code's architecture with:
- ✅ AI-powered code generation and editing capabilities
- ✅ Real-time WebSocket-based collaboration
- ✅ Multi-provider AI model support (OpenAI, Anthropic, Claude, local Ollama, etc.)
- ✅ React-based modern UI
- ✅ Settings persistence and user preferences
- ✅ Onboarding workflow for new users

### Tech Stack
- **Frontend**: TypeScript, React, VS Code Extension API
- **Backend**: Node.js, Express, WebSocket (ws library)
- **Database**: Supabase PostgreSQL
- **Build**: Gulp, npm, TypeScript compiler
- **Architecture**: Electron + Web versions

---

## 🔙 Backend Architecture

### Core Services & Components

#### 1. **OctateCode Settings Service**
**Location**: `src/vs/workbench/contrib/void/common/voidSettingsService.ts`
- Manages all user settings and preferences
- Persists data using VS Code's storage service
- Handles global and provider-specific settings
- Stores in `StorageScope.APPLICATION`

**Key Interfaces**:
```typescript
- IVoidSettingsService
- VoidGlobalSettings (onboarding complete, selected provider, etc.)
- ProviderSettings (API keys, model choices, features enabled)
- FeatureToggle (Chat, Ctrl+K, Autocomplete, Apply, SCM)
```

#### 2. **MCP (Model Context Protocol) Service**
**Location**: `src/vs/workbench/contrib/void/common/mcpService.ts`
- Manages external MCP server configurations
- Creates and maintains `mcp.json` configuration
- Handles tool/function provider registration
- Supports system tool registry

**Features**:
- Dynamic MCP server loading
- Tool approval workflow
- Security & permission management

#### 3. **Edit Code Service**
**Location**: `src/vs/workbench/contrib/void/common/editCodeService.ts`
- Handles code generation and modification requests
- Manages command bar state (Accept/Reject diffs)
- Integrates with multiple AI providers
- Tracks file changes and diffs

**Methods**:
- `generateCode()` - Generate code from prompts
- `applySuggestion()` - Apply generated code to file
- `rejectChange()` - Reject generated changes

#### 4. **Metrics Service**
**Location**: `src/vs/workbench/contrib/void/common/metricsService.ts`
- Tracks user engagement and feature usage
- Sends analytics to PostHog
- Captures:
  - Onboarding completion
  - AI model selections
  - Feature usage (Chat, Quick Edit, Autocomplete)
  - Error rates and performance metrics

#### 5. **Chat Service**
**Location**: `src/vs/workbench/contrib/chat/common/chatServiceImpl.ts`
- Manages chat sessions and conversations
- Handles request/response streaming
- Integrates with chat agents
- Stores chat history

**Key Features**:
- Multi-threaded conversations
- Agent-based routing (with @mention support)
- Slash command support
- Variable substitution

#### 6. **Model Management**
**Location**: `src/vs/workbench/contrib/void/common/modelCapabilities.ts`
- Tracks AI model capabilities
- Manages model overrides per feature
- Handles model availability checking

**Supported Models**:
- OpenAI (GPT-4, GPT-3.5-turbo, etc.)
- Anthropic (Claude 3, Opus, Sonnet)
- Google Gemini
- Local Ollama models
- Copilot-compatible models

#### 7. **WebSocket Backend** (Optional)
**Files**:
- `websocket.ts` - WebSocket connection handler
- `collaboration.ts` - Multi-user room management
- `collaborationServer.ts` - Server-side sync engine

**Capabilities**:
- Real-time code synchronization
- Room-based collaboration
- Change broadcasting
- User presence tracking
- Conflict resolution

---

## 🎨 Frontend Architecture

### React Component Hierarchy

#### 1. **Onboarding System**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/void-onboarding/VoidOnboarding.tsx`

**Three-Page Onboarding Flow**:

-**Page 1: Welcome to OctateCode**
- OctateCode logo/icon display
- "Get Started" button
- Animated introduction

**Page 2: Add a Provider** (API Setup)
- Tabbed interface: Free, Paid, Local, Cloud/Other
- Provider options per tab:
  - Free: Anthropic Claude, Google Gemini, etc.
  - Paid: OpenAI, Anthropic, etc.
  - Local: Ollama setup with instructions
  - Cloud: Custom API endpoints
- API key validation
- Model selection per feature:
  - Chat model
  - Quick Edit (Ctrl+K) model
  - Autocomplete model
  - Apply/Fast Apply model
  - Source Control (SCM) model
- Feature capability checklist

**Page 3: Settings & Themes** (Extensions Transfer)
- Transfer settings from:
  - ✅ VS Code
  - ✅ Cursor
  - ✅ Windsurf
- Theme selection
- Extension sync options
- Completion button

#### 2. **Settings Pane**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/void-settings-tsx/Settings.tsx`

**Sections**:
- **Models Tab**: Configure AI providers & models
- **Features Tab**: Enable/disable features per model
- **Tools Tab**: Manage tool approvals
- **About Tab**: Version info, telemetry settings

**Features**:
- Live model validation
- Real-time capability checking
- Provider configuration UI
- Advanced settings (temperature, max tokens, etc.)

#### 3. **Sidebar Chat**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/sidebar-tsx/SidebarChat.tsx`

**Components**:
- Chat input area with markdown support
- Real-time message streaming
- File references/context display
- Model selection dropdown
- Message history scrollable list
- Input stage management

**Features**:
- @mention agents
- Slash commands (/help, /clear, etc.)
- Code block rendering with syntax highlighting
- File tree preview
- Follow-up suggestions

#### 4. **Command Bar**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/void-editor-widgets-tsx/VoidCommandBar.tsx`

**Functionality**:
- Accept/Reject diff buttons for code changes
- Accept All / Reject All actions
- Navigate between diffs (prev/next)
- Navigate between files with changes
- Context menu actions
- Keyboard shortcuts (Ctrl+1, Ctrl+2, etc.)

**UI Elements**:
- Green accept button (#2d7a3e background)
- Red reject button (#7a2d2d background)
- Navigation arrows
- Context menu with additional options

#### 5. **Selection Helper**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/void-editor-widgets-tsx/VoidSelectionHelper.tsx`

**Features**:
- Shows selected code context
- Displays AI action options
- Positioned near editor selection
- Keyboard-accessible actions

#### 6. **Tooltip System**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/void-tooltip/`

- Global tooltip component using react-tooltip
- Consistent styling across UI
- Context-aware positioning

#### 7. **Input Components**
**Location**: `src/vs/workbench/contrib/void/browser/react/src/util/inputs.tsx`

**Custom Components**:
- `VoidInputBox2` - Styled text input
- `VoidCustomDropdownBox` - Dropdown selector
- `VoidSwitch` - Toggle switch
- `VoidButtonBgDarken` - Dimmed action button

---

## 🚀 Core Features

### 1. **Chat Feature**
- Real-time AI chat interface in sidebar
- Context-aware responses
- File references integration
- Agent routing with @mentions
- Streaming responses

### 2. **Ctrl+K (Quick Edit)**
- Inline code editing with AI
- Diff preview
- Accept/reject workflow
- Multi-file editing support

### 3. **Autocomplete**
- AI-powered code completion
- Context-aware suggestions
- Multiple model support
- Inline acceptance

### 4. **Apply (Fast Apply)**
- Apply generated changes to files
- Atomic transaction support
- Undo/redo integration

### 5. **Source Control Integration**
- Git-aware AI assistance
- Commit message generation
- Branch management
- Merge conflict resolution

### 6. **Settings & Preferences**
- Provider management
- Model selection per feature
- Feature toggles
- Theme customization
- Extension import/export

### 7. **Analytics & Telemetry**
- User engagement tracking
- Feature usage metrics
- Error reporting
- Performance monitoring
- PostHog integration

---

## 🤖 AI/LLM Integration

### Supported Providers

#### 1. **OpenAI**
```
- Models: GPT-4, GPT-4o, GPT-3.5-turbo
- Requires: API key from platform.openai.com
- Features: All (Chat, Autocomplete, etc.)
```

#### 2. **Anthropic Claude**
```
- Models: Claude 3 (Opus, Sonnet, Haiku)
- Requires: API key from console.anthropic.com
- Features: All
```

#### 3. **Google Gemini**
```
- Models: Gemini Pro, Gemini Pro Vision
- Requires: API key from ai.google.dev
- Features: All
```

#### 4. **Ollama (Local)**
```
- Models: Local LLMs (Llama 2, Mistral, etc.)
- Requires: Ollama installed locally (ollama.ai)
- Features: All (privacy-focused)
```

#### 5. **Azure OpenAI**
```
- Models: GPT-4, GPT-3.5 (via Azure)
- Requires: Azure endpoint + API key
- Features: All
```

### Provider Configuration

**Storage**: `~/.void-editor-dev/settings.json`

```typescript
interface ProviderSettings {
  apiKey: string;
  baseUrl?: string;
  models: {
    chat: string;
    'Ctrl+K': string;
    Autocomplete: string;
    Apply: string;
    SCM: string;
  };
  features: {
    Chat: boolean;
    'Ctrl+K': boolean;
    Autocomplete: boolean;
    Apply: boolean;
    SCM: boolean;
  };
}
```

---

## 🔄 Real-time Collaboration

### WebSocket Architecture

#### Room Management
- Create rooms with unique IDs
- Join existing rooms
- Host/Guest role differentiation
- Auto-cleanup on disconnect

#### Synchronization
- Three-layer sync model:
  1. Local file state
  2. Operational Transform (OT) buffer
  3. Server replica

#### Message Types
```typescript
- hostJoinRoom - Host creates & joins
- guestJoinRoom - Guest joins existing room
- fileUpdate - File content change
- cursorMove - User cursor position
- presence - User online status
- undo/redo - Operation reversal
```

#### Conflict Resolution
- Last-write-wins for concurrent edits
- Vector clocks for causality
- Automatic merge on conflict

---

## 📱 Onboarding & Settings

### Onboarding Flow

**Trigger**: First launch with `isOnboardingComplete = false`

**Steps**:
1. User sees Welcome page
2. Clicks "Get Started"
3. Selects AI provider & adds API key
4. Chooses models per feature
5. Transfers settings from existing editor
6. Completes onboarding

**Data Stored**:
```javascript
{
  isOnboardingComplete: true,
  selectedProviderName: "openai" | "anthropic" | "gemini" | "ollama",
  selectedModels: {
    chat: "gpt-4",
    'Ctrl+K': "gpt-4",
    Autocomplete: "gpt-3.5-turbo",
    Apply: "gpt-4",
    SCM: "gpt-4"
  },
  wantToUseOption: "smartest" | "private" | "cheap" | "don't know"
}
```

### Reset Onboarding
```bash
./scripts/reset-void.bat  # Clears all data & compiled output
npm run compile           # Recompile with fresh state
./scripts/code.bat        # Start fresh
```

---

## 🎨 UI Components & Widgets

### Component Library

#### Buttons
- `PrimaryActionButton` - Main call-to-action (blue)
- `SecondaryButton` - Secondary actions
- `VoidButtonBgDarken` - Subtle background button

#### Inputs
- `VoidInputBox2` - Styled text input with validation
- `VoidCustomDropdownBox` - Searchable dropdown
- `VoidSimpleInputBox` - Simple text input
- `VoidSwitch` - Toggle switch

#### Containers
- `OnboardingPageShell` - Onboarding page layout
- `VoidChatArea` - Chat interface container
- `VoidTooltip` - Global tooltip provider

#### Utilities
- `ErrorBoundary` - React error catching
- `FadeIn` - Animation component
- `ChatMarkdownRender` - Markdown renderer with code blocks

### Theme Integration

**Colors**:
- `--void-bg-1`: Input background
- `--void-bg-2`: Secondary background
- `--void-bg-3`: Primary background
- `--void-fg-1`: Primary text
- `--void-fg-2`: Secondary text
- `--void-fg-3`: Tertiary text

**Dark/Light Mode**:
- Automatic detection via `useIsDark()`
- CSS class toggling: `isDark ? 'dark' : ''`
- Tailwind dark: prefix support

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 OctateCode IDE Frontend                      │
├─────────────────────────────────────────────────────────────┤
│  React Components                                            │
│  ├─ Onboarding (3 pages)                                   │
│  ├─ Settings Pane (Models, Features, Tools)                │
│  ├─ Sidebar Chat                                           │
│  ├─ Command Bar (Accept/Reject)                            │
│  ├─ Selection Helper                                       │
│  └─ Tooltips & UI Widgets                                  │
└─────────────┬───────────────────────────────────────────────┘
              │ TypeScript Interface Layer
┌─────────────▼───────────────────────────────────────────────┐
│          VS Code Extension Services                         │
├─────────────────────────────────────────────────────────────┤
│  • IVoidSettingsService                                    │
│  • IEditCodeService                                        │
│  • IChatService                                            │
│  • ICommandBarService                                      │
│  • IMetricsService                                         │
│  • IMCPService                                             │
└─────────────┬───────────────────────────────────────────────┘
              │ JSON-RPC / WebSocket
┌─────────────▼───────────────────────────────────────────────┐
│              Backend Services                              │
├─────────────────────────────────────────────────────────────┤
│  • AI Provider Integration                                 │
│  │  ├─ OpenAI API                                         │
│  │  ├─ Anthropic Claude                                   │
│  │  ├─ Google Gemini                                      │
│  │  └─ Local Ollama                                       │
│  • Code Generation Engine                                 │
│  • Chat Session Manager                                   │
│  • Settings Persistence                                   │
│  • Collaboration Engine (WebSocket)                       │
│  • MCP Server Manager                                     │
│  • Analytics & Telemetry                                  │
└─────────────┬───────────────────────────────────────────────┘
              │ REST/WebSocket APIs
┌─────────────▼───────────────────────────────────────────────┐
│           External Services & Storage                       │
├─────────────────────────────────────────────────────────────┤
│  • AI Provider APIs (OpenAI, Anthropic, Google)            │
│  • Supabase PostgreSQL (optional collaboration)            │
│  • VS Code Settings Storage                                │
│  • Local File System                                       │
│  • PostHog Analytics                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Key File Locations

### Backend Services
```
src/vs/workbench/contrib/void/common/
├── voidSettingsService.ts
├── voidSettingsTypes.ts
├── editCodeService.ts
├── mcpService.ts
├── metricsService.ts
├── modelCapabilities.ts
└── helpers/
    ├── colors.ts
    └── systemInfo.ts
```

### Frontend React Components
```
src/vs/workbench/contrib/void/browser/react/src/
├── void-onboarding/
│   └── VoidOnboarding.tsx (3-page flow)
├── void-settings-tsx/
│   ├── Settings.tsx (main settings pane)
│   └── ModelDropdown.tsx
├── sidebar-tsx/
│   ├── SidebarChat.tsx (chat interface)
│   ├── Sidebar.tsx (container)
│   └── ErrorBoundary.tsx
├── void-editor-widgets-tsx/
│   ├── VoidCommandBar.tsx (Accept/Reject UI)
│   └── VoidSelectionHelper.tsx
├── util/
│   ├── services.ts (hooks)
│   └── inputs.tsx (UI components)
└── styles.css
```

### WebSocket Collaboration
```
src/vs/workbench/contrib/void/browser/
├── websocket.ts
├── collaboration.ts
└── collaborationServer.ts
```

---

## 🛠️ Development Commands

```bash
# Build/Compile
npm run compile              # Full TypeScript compilation
npm run watch-clientd       # Watch mode for client code

# Run
./scripts/code.bat          # Run Electron version
./scripts/code-web.bat      # Run web version

# Reset & Clean
./scripts/reset-void.bat    # Reset to fresh state

# Testing
npm run test                # Run test suite
npm run lint                # ESLint check
```

---

## 📈 Metrics & Telemetry

### PostHog Events
- `Completed Onboarding` - User finished setup
- `Selected Provider` - Provider choice tracking
- `Feature Used` - Feature usage tracking
- `Error Occurred` - Error reporting
- `Chat Message Sent` - Chat engagement
- `Code Generated` - Code gen metrics

### User Preferences Tracked
```typescript
{
  distinctId: UUID,
  vscodeVersion: string,
  voidVersion: string,
  os: "windows" | "darwin" | "linux",
  isDevMode: boolean,
  platform: string,
  arch: string
}
```

---

## 🎯 Future Roadmap

- [ ] Multi-user real-time collaboration UI
- [ ] Advanced MCP tool ecosystem
- [ ] Custom model fine-tuning support
- [ ] Browser extension version
- [ ] Native mobile companion app
- [ ] Enterprise deployment options
- [ ] Advanced analytics dashboard

---

## 📝 Contributing

To add new features:
1. Add backend service in `src/vs/workbench/contrib/void/common/`
2. Create React component in `src/vs/workbench/contrib/void/browser/react/src/`
3. Register service in contribution points
4. Add settings to `VoidSettingsTypes`
5. Test onboarding flow
6. Add metrics for new feature

---

## 📄 License

Copyright © 2025 Glass Devtools, Inc.
Licensed under Apache License 2.0

---

**Last Updated**: November 26, 2025
**Version**: 1.4.9
