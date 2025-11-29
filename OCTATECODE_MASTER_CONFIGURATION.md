**OctateCode Master Configuration**

This file summarizes the key configuration and AI model/provider information for the frontend in `void/` and provides instructions/placeholders for the backend in `void-backend/` (backend folder is not currently accessible from this workspace; see "Backend access" below).

**Repository Paths**
- **Frontend (this workspace):** `C:/Users/preet/Downloads/octate/octate/void`
- **Backend (not accessible):** `C:/Users/preet/Downloads/octate/octate/void-backend` (add to workspace or provide files to include full backend details)

---

**Frontend — package.json (high level)**
- File: `void/package.json`
- Name: `code-oss-dev`
- Version: `1.99.3`
- Main entry: `./out/main.js`
- Type: `module`
- Important scripts (use from `void/`):
  - `npm run compile` — runs gulp compile (heavy; increases memory limit)
  - `npm run buildreact` / `watchreact` — build the React bits under `src/vs/workbench/contrib/void/browser/react`
  - `npm run watch-client` / `watch-extensions` — watch tasks used during development
  - `npm run test-browser` / `test-node` — test targets (see `scripts/` for complete test flows)

- Important dependencies relevant to AI providers:
  - `@anthropic-ai/sdk`
  - `@google/genai`
  - `@mistralai/mistralai`
  - `ollama` (local model helper)
  - `openai` (OpenAI client)
  - `ws`, `react`, `react-dom`

Refer to `void/package.json` for the complete dependency list and devDependencies.

---

**Frontend — TypeScript / build**
- File: `void/src/tsconfig.json`
  - Extends: `tsconfig.base.json`
  - `outDir`: `../out/vs` (compiled JS output)
  - `allowJs`: true, `resolveJsonModule`: true
  - Types included (notable): `@webgpu/types`, `mocha`, `sinon`, `trusted-types`, `winreg`, `wicg-file-system-access`
  - Plugins: `tsec` (security checks)

---

**Providers & Models (frontend): canonical sources**
- Key files (frontend):
  - `void/src/vs/workbench/contrib/void/common/voidSettingsTypes.ts` — canonical provider names, display titles, helper text, local/nonlocal provider lists, and default settings shape (`defaultGlobalSettings`, `defaultSettingsOfProvider` entrypoints).
  - `void/src/vs/workbench/contrib/void/common/modelCapabilities.ts` — authoritative model lists (`defaultModelsOfProvider`), per-provider default settings (`defaultProviderSettings`), and model capability data and fallbacks (`getModelCapabilities`, `getProviderCapabilities`).

Summary of provider lists (read from `voidSettingsTypes.ts` and `modelCapabilities.ts`):
- Provider names (examples included): `anthropic`, `openAI`, `deepseek`, `openRouter`, `ollama`, `vLLM`, `openAICompatible`, `gemini`, `groq`, `xAI`, `mistral`, `lmStudio`, `liteLLM`, `googleVertex`, `microsoftAzure`, `awsBedrock`.
- Local provider names: `['ollama', 'vLLM', 'lmStudio']` (these are automatically autodetected when available).

Key per-provider defaults (from `defaultProviderSettings`):
- `ollama.endpoint`: `http://127.0.0.1:11434`
- `vLLM.endpoint`: `http://localhost:8000`
- `lmStudio.endpoint`: `http://localhost:1234`
- `googleVertex.region`: `us-west2`
- `awsBedrock.region`: `us-east-1`

Selected `defaultModelsOfProvider` (representative):
- `openAI`: `['gpt-5.1-codex-mini', 'gpt-5.1-codex-nano', 'gpt-5.1-mini', 'gpt-5.1-nano', 'gpt-5.1-codex']`
- `anthropic`: multiple Claude models (e.g., `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-3-7-sonnet-latest`, ...)
- `gemini`: `['gemini-2.5-flash', 'gemini-2.5-pro', ...]`
- `openRouter`: assorted aggregated model strings (e.g., `anthropic/claude-opus-4`, `qwen/qwen3-235b-a22b`, `deepseek/deepseek-r1`, ...)
- `xAI`/`grok`: `['grok-2', 'grok-3', 'grok-3-mini', ...]`
- `ollama` / `vLLM` / `lmStudio` — mostly autodetected; `ollamaRecommendedModels` includes `['qwen2.5-coder:1.5b', 'llama3.1', 'qwq', 'deepseek-r1', 'devstral:latest']`.

Model capability surface (what the frontend uses):
- `getModelCapabilities(providerName, modelName, overrides)` — returns static model info: `contextWindow`, `reservedOutputTokenSpace`, `supportsSystemMessage`, `specialToolFormat`, `supportsFIM`, `reasoningCapabilities`, `downloadable` info, cost placeholders, and whether the model was recognized.
- `getIsReasoningEnabledState(...)` and `getSendableReasoningInfo(...)` — helper functions to compute reasoning payloads for runtime messages.

Important UI hooks:
- Onboarding and settings UI import the above provider/model information and present the lists to users (see `void/src/vs/workbench/contrib/void/browser/react/src/void-onboarding/VoidOnboarding.tsx` and `.../void-settings-tsx/Settings.tsx`).

---

**Frontend — Important paths referenced by runtime**
- Onboarding UI and settings: `src/vs/workbench/contrib/void/browser/react/src/...`
- Model/provider logic: `src/vs/workbench/contrib/void/common/*` (includes `voidSettingsTypes.ts` and `modelCapabilities.ts`)
- Electron/main message handlers and provider callers: `src/vs/workbench/contrib/void/electron-main/llmMessage/*`
- Built output: `out/vs/` (generated JS when compiling)

---

**Backend — (not accessible from this workspace)**

I could not read `void-backend/` files from this workspace because that folder is outside the current workspace root. To include complete backend configuration here, do one of the following and I will regenerate the backend section into this file:

1) Add the `void-backend` folder to your VS Code workspace (File → Add Folder to Workspace), then ask me to re-run the summary; or
2) Paste the following backend files (or grant read access):
   - `void-backend/package.json`
   - `void-backend/src/index.ts` (or `src/server.ts` / entry file)
   - Any backend `.env` or config files (`.env`, `config/*.json`, `docker-compose.yml`) you want included.

Backend placeholder template (what I'll include after you provide access):
- `package.json`: name, version, scripts (`start`, `dev`, `compile`), dependencies (ollama, vllm, express, grpc, etc.)
- `src/index.ts`: HTTP endpoints, ports, CORS settings, LLM connectors (ollama / vLLM proxies), health-check endpoints and autodetection logic
- `config`: default ports, recommended environment variables, example `.env` file
- `deployment`: Dockerfile / docker-compose or systemd unit if present

Example backend env snippet to share (if you want me to fill it in):
```
# Example .env keys I would extract
PORT=3001
OLLAMA_ENDPOINT=http://127.0.0.1:11434
VLLM_ENDPOINT=http://localhost:8000
DATABASE_URL=sqlite:./db.sqlite
```

---

**Next steps (pick one)**
- I can re-run a final sweep to list any remaining user-visible occurrences of the word "Void" to convert to "OctateCode" (excluding CSS classes and filenames). Say: `sweep remaining`.
- If you want me to include backend details now, add `void-backend/` to the workspace and tell me to `refresh backend` (or paste the backend files here) and I will append the backend configuration into this file.
- When ready, say `compile now` and I will run `npm run compile` (or the specific build/watch scripts you prefer) and report any errors.

---

File created: `void/OCTATECODE_MASTER_CONFIGURATION.md`

Generated: automated summary from repository files under `void/src/*` ({providers, model lists, tsconfig, package.json}).
