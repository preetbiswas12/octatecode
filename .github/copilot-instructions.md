# OctateCode AI Agent Instructions

## Project Overview

OctateCode is an open-source AI-powered code editor (fork of VS Code) with real-time collaboration features, React-based UI, and multi-provider LLM support. The codebase is large but most AI-relevant code lives in `src/vs/workbench/contrib/void/`.

**Key Facts:**
- Built on Electron (main + browser processes)
- TypeScript with strict typing; compiled via Gulp to `out/vs/`
- Supports 15+ LLM providers (OpenAI, Anthropic, Ollama, vLLM, DeepSeek, Gemini, etc.)
- Features: Chat, code edits (Apply), Model Context Protocol (MCP), fast/slow diff-based code replacement

## Architecture: Process & Module Organization

### Process Model (Electron)
- **Main Process** (`electron-main/`): Node.js access, IPC channels, LLM API calls, file I/O
- **Browser Process** (`browser/`): UI, DOM, `window` global, React components
- **Common** (`common/`): Shared types, service interfaces, provider configuration

**Critical Rule:** Browser code cannot import `node_modules`. Two workarounds used:
1. Bundle raw modules (React bundled separately)
2. Implement in main process with IPC channel (used for LLM message sending)

### Core Directory Structure
```
src/vs/workbench/contrib/void/
├── browser/               # React UI, settings, onboarding
├── electron-main/         # LLM callers, IPC channels, MCP server
└── common/                # Types, settings, provider configs, service interfaces

Key modules:
├── voidSettingsTypes.ts       # Provider list, custom settings shape
├── modelCapabilities.ts        # Model lists per provider, defaults, capabilities
├── chatThreadServiceTypes.ts   # Chat message, tool, checkpoint types
├── editCodeServiceTypes.ts     # DiffZone, Apply operation internals
└── mcpServiceTypes.ts          # MCP tool, server definitions
```

## Build & Development Workflows

### Development Startup (3 Watchers)
Run these three commands in separate terminals (or use VS Code build task `VS Code - Build`):
```powershell
npm run watch-clientd      # Core TypeScript → out/vs/
npm run watchreactd        # React JSX → out/
npm run watch-extensionsd  # Extensions → out/extensions/
```

Then launch the dev window:
```powershell
.\scripts\code.bat
```

**Reload in dev window:** `Ctrl+R` (or Cmd+Shift+P → "Reload Window")

### Key npm Scripts
- `npm run compile` — full build (once, large memory footprint)
- `npm run buildreact` — build React UI without watching
- `npm run test-node` / `test-browser` — run unit tests
- `npm run clean` — clear `out/`, `.build/`, build caches

## Provider & Model Configuration

### Provider Registry
**File:** `src/vs/workbench/contrib/void/common/voidSettingsTypes.ts`

Provider names (always use these strings):
```typescript
type ProviderName =
  | 'anthropic' | 'openAI' | 'deepseek' | 'openRouter' | 'ollama' | 'vLLM'
  | 'lmStudio' | 'gemini' | 'groq' | 'xAI' | 'mistral' | 'liteLLM' | ...
```

**Local vs Non-Local:**
- Local: `ollama`, `vLLM`, `lmStudio` (run locally, autodiscovered)
- Non-Local: all others (require API keys)

**Default Endpoints:**
```typescript
ollama:   'http://127.0.0.1:11434'
vLLM:     'http://localhost:8000'
lmStudio: 'http://localhost:1234'
```

### Model Capabilities
**File:** `src/vs/workbench/contrib/void/common/modelCapabilities.ts`

When adding/updating models:
1. Add to `defaultModelsOfProvider['providerName']` array
2. Define capabilities in `getModelCapabilities(provider, model)` (contextWindow, reservedOutputTokens, supportsSystemMessage, etc.)
3. Example:
```typescript
// voidSettingsTypes.ts
export const defaultModelsOfProvider = {
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', ...],
  openAI: ['gpt-5.1-codex-mini', 'gpt-5.1-mini', ...],
  // ...
}

// modelCapabilities.ts
export const getModelCapabilities = (provider, model) => ({
  contextWindow: model.includes('opus') ? 200000 : 100000,
  supportsSystemMessage: true,
  // ...
})
```

## LLM Message Pipeline

### Chat Message Flow
1. **User sends message** → React sidebar (`void-onboarding/`)
2. **Browser → Main process** via `sendLLMMessage` IPC channel
3. **Main process** (`electron-main/llmMessage/`):
   - Loads provider API credentials
   - Formats message with tools, system prompt
   - Calls provider API
   - Streams response back to browser
4. **Browser** renders chat, renders code diffs, applies changes

### File Structure
- `browser/react/src/void-onboarding/VoidOnboarding.tsx` — chat UI component
- `browser/react/src/void-settings/Settings.tsx` — model/provider picker
- `electron-main/llmMessage/llmMessageHandler.ts` — message routing
- `electron-main/llmMessage/llmProviderCallers.ts` — per-provider API wrappers

## Code Application (Apply) System

### Apply Workflow
1. LLM returns code changes
2. If **Fast Apply enabled** (default): parse search/replace blocks (special format)
3. If **Slow Apply**: rewrite entire file

### Data Structures (Know These)
- **DiffZone** (`editCodeServiceTypes.ts`): `{startLine, endLine, llmCancelToken?, ...}` — tracks streamed code region
- **DiffArea**: Union of DiffZone, CtrlKZone, TrackingZone — regions where diffs are shown
- **Diff**: `{startLine, endLine, type: 'delete'|'insert'|'replace'}`
- **ComputedDiff**: combines Diff with actual text changes

### Key Entry Points
- `editCodeService.ts` (common) — Apply logic, DiffZone management
- `browser/edits/` — React components for diff rendering (red/green highlights)
- `sendApplyRequest` — initiates Apply via IPC

## Common Patterns & Gotchas

### Service Registration (Singletons)
Every major feature is a registered service. Always use dependency injection:

```typescript
// common/myService.ts
export const IMyService = createDecorator<IMyService>('myService');
export interface IMyService { /* interface */ }

// electron-main/myService.ts
class MyService implements IMyService { /* ... */ }
registerSingleton(IMyService, MyService, InstantiationType.Eager);

// Usage in any constructor:
class Consumer {
  constructor(@IMyService private myService: IMyService) {}
}
```

### File URIs
Use `URI` class (not raw strings). URIs represent resources across main/browser:
```typescript
import { URI } from '../../../../base/common/uri.js';
const uri = URI.file('/path/to/file.ts');
```

### TypeScript Import Paths
- Always add `.js` extension to imports (ES modules required)
- Relative imports only; no bare module names in browser code
- Example: ✅ `from './myFile.js'`, ❌ `from 'myFile'`

### IPC Channels
For main ↔ browser communication:
```typescript
// Main: register channel
channel.listen('myEvent', (msg) => { /* handle */ });

// Browser: call via proxy
await mainProcessService.call('myEvent', data);
```

## Testing

- **Unit tests:** `test/unit/node/` (Mocha, Node.js)
- **Browser tests:** `test/unit/browser/` (Playwright)
- Run: `npm run test-node` or `npm run test-browser`
- ESLint: `npm run eslint`

## Key Files to Know

| File | Purpose |
|------|---------|
| `voidSettingsTypes.ts` | Provider/model names, user settings shape |
| `modelCapabilities.ts` | Model capabilities (context, tokens, features) |
| `chatThreadServiceTypes.ts` | Chat message, tool call, checkpoint types |
| `editCodeServiceTypes.ts` | DiffZone, Apply, diff computation types |
| `llmMessageHandler.ts` | Routes messages from browser to providers |
| `VoidOnboarding.tsx` | Chat sidebar UI (React) |
| `Settings.tsx` | Model/provider settings UI (React) |
| `code.bat` | Dev launcher script |

## Before You Code

1. **Understand the process model**: Is your code main-side or browser-side?
2. **Check existing patterns**: Search `src/vs/workbench/contrib/void/` for similar features
3. **Use services**: Register as singleton, inject via constructor
4. **Add `.js` extensions**: ES module imports require explicit extensions
5. **Reference types from `common/`**: Share types between processes via common folder
6. **Test locally**: Use `npm run watch-*` watchers + `.\scripts\code.bat` to iterate quickly
7. **Check model capabilities**: Before assuming a model feature, verify in `modelCapabilities.ts`

---

*For deeper architecture details, see `VOID_CODEBASE_GUIDE.md`. For contribution guidelines, see `HOW_TO_CONTRIBUTE.md`.*
