# OctateCode Architecture

OctateCode is built on VS Code with an Electron app structure and React-based UI.

## Process Model

### Electron Architecture

```
┌─────────────────────────────────────────────────┐
│           Main Process (Node.js)                 │
│  - File I/O, LLM API calls, IPC channels       │
│  - MCP server, LLM message handler              │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────────┐   ┌─────▼────────────┐
│ Browser Process  │   │ Extension Host   │
│ (Renderer)       │   │ (Node.js)        │
│ - React UI       │   │ - Services       │
│ - DOM            │   │ - File watchers  │
└──────────────────┘   └──────────────────┘
```

**Key Rule:** Browser code cannot import `node_modules` directly.

## Module Organization

### Directory Structure

```
src/vs/workbench/contrib/void/
├── browser/                              # Browser process code
│   ├── react/
│   │   ├── src2/                        # React source components
│   │   │   ├── chat-ui/                # Chat sidebar UI
│   │   │   ├── collaboration/          # Collaboration panel
│   │   │   ├── void-settings-tsx/      # Settings UI
│   │   │   ├── void-onboarding/        # Onboarding screen
│   │   │   └── ...
│   │   ├── tsup.config.js              # React build config
│   │   └── out/                        # Compiled React output
│   ├── sidebarActions.ts                # Command & keybinding registration
│   ├── sidebarPane.ts                   # Sidebar container
│   ├── voidSettingsPane.ts              # Settings panel container
│   ├── voidOnboardingService.ts         # Onboarding lifecycle
│   ├── chatThreadService.ts             # Chat state management
│   ├── editCodeService.ts               # Code editing & Apply logic
│   ├── collaborationService.ts          # Collaboration state
│   ├── *Service.ts                      # Other browser services
│   └── ...
│
├── common/                               # Shared code
│   ├── voidSettingsTypes.ts             # Provider/model definitions
│   ├── modelCapabilities.ts             # Model feature detection
│   ├── chatThreadServiceTypes.ts        # Chat message types
│   ├── editCodeServiceTypes.ts          # Code editing types
│   ├── mcpServiceTypes.ts               # MCP tool definitions
│   ├── toolsServiceTypes.ts             # Tool system types
│   └── *Service.ts                      # Service interfaces
│
├── electron-main/                        # Main process code
│   ├── llmMessage/
│   │   ├── llmMessageHandler.ts         # Routes messages to providers
│   │   └── llmProviderCallers.ts        # Provider API wrappers
│   ├── mcpService.ts                    # MCP server implementation
│   └── ...
│
└── test/
    └── *test.ts                         # Unit tests
```

## Service Architecture

OctateCode uses **singleton services** with dependency injection.

### Service Registration

Every service follows this pattern:

```typescript
// 1. Define interface in common/
export const IMyService = createDecorator<IMyService>('myService');
export interface IMyService {
  method(): void;
}

// 2. Implement in browser/ or electron-main/
class MyService implements IMyService {
  method() { }
}
registerSingleton(IMyService, MyService, InstantiationType.Eager);

// 3. Inject via constructor
class Consumer {
  constructor(@IMyService private myService: IMyService) { }
}
```

### Core Services

| Service | Layer | Purpose |
|---------|-------|---------|
| `IVoidSettingsService` | Browser | User settings, provider config |
| `IChatThreadService` | Browser | Chat messages, thread state |
| `ICollaborationService` | Browser | P2P collaboration state |
| `IEditCodeService` | Browser | Code editing, Apply operations |
| `IMCPService` | Main | MCP server, tool execution |
| `ILLMMessageService` | Main | LLM API calls, streaming |

## Data Flow

### Chat Message Flow

```
User sends message
        ↓
VoidOnboarding component
        ↓
Browser: sendLLMMessage() → IPC channel
        ↓
Main process: llmMessageHandler.ts
        ↓
Load provider credentials
        ↓
Call provider API (OpenAI, Anthropic, etc.)
        ↓
Stream response back to browser
        ↓
React component renders chat
```

### Code Apply Flow

```
LLM returns code with diffs
        ↓
Parse search/replace blocks
        ↓
Create DiffZone objects
        ↓
Browser renders diff UI (red/green)
        ↓
User approves/rejects
        ↓
editCodeService applies changes
        ↓
File updated on disk
```

## Provider Configuration

### Provider Registry

File: `common/voidSettingsTypes.ts`

```typescript
type ProviderName =
  | 'anthropic' | 'openAI' | 'deepseek' | 'ollama'
  | 'vLLM' | 'lmStudio' | 'gemini' | 'groq' | ...;

const defaultModelsOfProvider = {
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', ...],
  openAI: ['gpt-4-turbo', 'gpt-4o', ...],
  ollama: ['llama2', 'neural-chat', ...],
  // ...
};
```

### Model Capabilities

File: `common/modelCapabilities.ts`

```typescript
export const getModelCapabilities = (provider, model) => ({
  contextWindow: 200000,
  reservedOutputTokens: 4000,
  supportsSystemMessage: true,
  supportsReasoning: model.includes('pro'),
  // ...
});
```

## React Component Architecture

### File Structure

Components are organized by feature:

```
src2/
├── chat-ui/
│   ├── ChatHeader.tsx        # Tab management, dropdown
│   ├── ChatSidebar.tsx       # Main chat container
│   ├── ChatMessage.tsx       # Message rendering
│   ├── ChatInput.tsx         # User input
│   └── chat-ui.css           # Styles
│
├── void-settings-tsx/
│   ├── Settings.tsx          # Main settings UI
│   ├── ModelSelector.tsx     # Model picker
│   ├── ProviderConfig.tsx    # Provider settings
│   └── settings.css
│
└── void-onboarding/
    ├── VoidOnboarding.tsx    # Onboarding flow
    ├── onboarding.css
```

### Service Access in React

```typescript
import { useAccessor } from '../util/services.js';

export const MyComponent: React.FC = () => {
  const accessor = useAccessor();
  const chatService = accessor.get('IChatThreadService' as any);

  // Use service
  chatService.addMessage(...);
};
```

## Build System

### TypeScript Compilation

**Tool:** Gulp

```bash
npm run watch-clientd
```

Compiles `src/vs/**/*.ts` → `out/vs/**/*.js`

### React Build

**Tool:** tsup

```bash
npm run watchreactd
```

Compiles `src2/**/*.tsx` → `out/src2/**/*.js`

**Config:** `browser/react/tsup.config.js`

### Extension Build

**Tool:** Gulp

```bash
npm run watch-extensionsd
```

Compiles extensions → `out/extensions/`

## IPC Communication

Browser ↔ Main process communication:

```typescript
// Main: Register channel
channel.listen('myEvent', (msg) => {
  // Handle message
  return result;
});

// Browser: Call via proxy
const result = await mainProcessService.call('myEvent', data);
```

## TypeScript & ES Modules

### Import Rules

- **Always add `.js` extension** to relative imports (ES modules required)
- Use absolute imports from VS Code base

```typescript
// ✅ Correct
import { foo } from './myFile.js';
import { IRange } from '../../../../editor/common/core/range.js';

// ❌ Wrong
import { foo } from './myFile';
import { IRange } from 'editor/common/core/range.js';
```

## URI Handling

Use the `URI` class for resource references:

```typescript
import { URI } from '../../../../base/common/uri.js';

const uri = URI.file('/path/to/file.ts');
const fsPath = uri.fsPath;  // Platform-specific path
```

## Testing

### Unit Tests

**Location:** `test/unit/node/` or `test/unit/browser/`

**Framework:** Mocha (Node), Playwright (Browser)

**Run:**
```bash
npm run test-node
npm run test-browser
```

## Performance Considerations

1. **Avoid Heavy Computations in React** - Use Web Workers or main process
2. **Batch IPC Messages** - Reduce process boundary crossings
3. **Lazy Load Features** - Don't initialize until needed
4. **Cache Model Capabilities** - Don't refetch on every operation

## Security

- Sanitize user input before sending to LLMs
- Validate file paths before operations
- Use proper permission checks for collaboration
- Encrypt sensitive data (API keys)

## Next Steps

- See [Chat Features](./CHAT.md) for messaging system
- See [Collaboration](./COLLABORATION_QUICKSTART.md) for P2P
- See [Developer Setup](./DEVELOPER_SETUP.md) for building

## System Components

OctateCode is a distributed real-time collaborative code editor built on three core systems.

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
│  (React - Sidebar, Editor, Chat, Cursors, Settings)         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              COLLABORATION ENGINE (Browser)                  │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ Chat Service  │  │ Edit Service │  │ Cursor Tracker │    │
│  └───────────────┘  └──────────────┘  └────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  File Sync Service (Operational Transform + OT)     │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│         P2P NETWORK (WebRTC Data Channels)                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│  │ Signaling│   │ File Sync│   │  Chat    │               │
│  │  Channel │   │ Channels │   │ Channels │               │
│  └──────────┘   └──────────┘   └──────────┘               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│           SERVICES LAYER (Main Process)                      │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │ LLM Service │  │ Auth Srv │  │ Analytics/Monitor  │    │
│  └─────────────┘  └──────────┘  └────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Security: AES-256-GCM Encryption + ECDH Key Exchange│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              PERSISTENT STORAGE (Electron)                   │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐       │
│  │ Local Folder │  │ File System│  │ Session Data │       │
│  └──────────────┘  └────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. Collaboration Service
Manages P2P connections, room membership, and user presence.

**Key Features:**
- WebRTC signaling via central server
- Peer-to-peer data channels
- Room membership tracking
- User presence detection
- Automatic reconnection on disconnect

**Process:** Browser
**Interfaces:**
- `ICollaborationService` (common)
- `ICollaborationProvider` (browser)

---

### 2. File Sync Service
Synchronizes file edits using Operational Transform (OT).

**Key Features:**
- Detects local edits
- Sends OT operations to peers
- Applies remote operations
- Prevents edit conflicts
- Handles network delays (<200ms merge)

**Algorithm:** Operational Transform (OT)
- **Commutativity**: OT1 ⊕ OT2 = OT2 ⊕ OT1
- **Idempotence**: Applying same operation twice is safe
- **Tombstone tracking**: Deleted characters marked, not removed

**Process:** Browser
**Interfaces:**
- `IFileSyncService` (common)
- `FileSyncProvider` (browser)

**Data Types:**
- `FileOperation`: {type, position, content, userId, timestamp}
- `DiffZone`: {startLine, endLine, content}
- `SyncCheckpoint`: {version, hash, timestamp}

---

### 3. Chat Service
Real-time messaging with automatic sync across peers.

**Key Features:**
- Message sending/receiving
- User typing indicators
- Chat history (in-memory or persistent)
- Read receipts
- Threading support

**Process:** Browser
**Interfaces:**
- `IChatService` (common)
- `ChatProvider` (browser)

**Data Types:**
- `ChatMessage`: {id, userId, content, timestamp, edited}
- `TypingIndicator`: {userId, status}

---

### 4. Cursor Tracking Service
Shows real-time cursor and selection positions.

**Key Features:**
- Real-time cursor position sync
- Selection range tracking
- Cursor color per user
- Animated cursor movements
- Focus detection

**Process:** Browser
**Interfaces:**
- `ICursorTrackingService` (common)
- `CursorTrackingProvider` (browser)

**Data Types:**
- `CursorPosition`: {line, column, userId, color}
- `SelectionRange`: {startLine, startCol, endLine, endCol}

---

### 5. Security Service
Encrypts all traffic and manages access control.

**Encryption:**
- Algorithm: AES-256-GCM
- Key Exchange: ECDH
- Authentication: HMAC-SHA256
- Perfect Forward Secrecy: Yes (new keys per session)

**Features:**
- File-level encryption (at rest)
- Transport encryption (in-flight)
- User authentication
- Access control (public/private/invite-only)
- Audit logging

**Process:** Main + Browser
**Interfaces:**
- `ISecurityService` (common)
- `SecurityHandler` (main)
- `CryptoProvider` (browser - uses SubtleCrypto)

---

### 6. Analytics Service
Tracks performance, errors, and usage.

**Sub-services:**
1. **Performance Metrics Service**
   - Latency, bandwidth, memory, CPU
   - Connection quality (0-100 score)
   - Statistics: mean, median, p95, p99, std dev

2. **Error Tracking Service**
   - Exception capture
   - Error severity levels
   - Breadcrumb trail
   - Error statistics

3. **Usage Analytics Service**
   - Event tracking
   - Room statistics
   - User activity summaries
   - Activity export (JSON/CSV)

4. **Monitoring Dashboard Service**
   - Aggregated metrics
   - System health status
   - Alert triggering
   - Event-driven updates

**Process:** Main + Browser
**Interfaces:**
- `IPerformanceMetricsService`
- `IErrorTrackingService`
- `IUsageAnalyticsService`
- `IMonitoringDashboardService`

---

## Communication Protocols

### Browser ↔ Peer Communication

**Media:** WebRTC Data Channels
**Topology:** Mesh (fully connected - each peer connects to all)
**Latency:** <100ms typical
**Reliability:** TCP-like (ordered delivery, retransmit)

**Message Types:**
1. **File Operations**
   ```json
   {
     "type": "fileOperation",
     "operation": {...},
     "version": 42,
     "clientId": "peer-123"
   }
   ```

2. **Chat Messages**
   ```json
   {
     "type": "chatMessage",
     "content": "Hello!",
     "userId": "user-abc",
     "timestamp": 1234567890
   }
   ```

3. **Cursor Updates**
   ```json
   {
     "type": "cursorUpdate",
     "line": 42,
     "column": 10,
     "userId": "user-abc"
   }
   ```

---

### Browser ↔ Main Process Communication

**Media:** IPC Channels (Electron)
**Use Cases:**
- LLM API calls
- File I/O operations
- Auth/security operations
- Analytics reporting

**Example:**
```typescript
// Browser sends message to main
mainProcessService.call('sendLLMMessage', {
  provider: 'openai',
  messages: [{role: 'user', content: '...'}]
});

// Main calls LLM API and returns response
```

---

## Data Flow Example: User A Edits a File

1. **User A types character at line 42, column 10**
   - Browser detects keystroke
   - File Sync Service creates operation:
     ```
     {type: 'insert', line: 42, col: 10, char: 'x'}
     ```

2. **Broadcast to all peers (User B, C)**
   - Encrypted with session key
   - Sent via WebRTC data channel
   - <50ms latency

3. **User B & C receive operation**
   - Decrypt with session key
   - Apply operation to local file
   - Update editor view
   - Broadcast acknowledgment

4. **Analytics tracking**
   - Main process logs event: "file_edit"
   - Increment "edits_per_minute" metric
   - Check if latency exceeds threshold
   - Trigger alert if too high

5. **Collision resolution (if User B also edits simultaneously)**
   - Both operations arrive out-of-order
   - OT algorithm transforms operations:
     ```
     A: Insert 'x' at col 10
     B: Delete char at col 15

     Transformed: Still correct result
     ```

---

## File Structure

```
src/vs/workbench/contrib/void/
├── common/                                  # Shared types & interfaces
│   ├── collaborationServiceTypes.ts         # Collaboration interfaces
│   ├── fileSyncServiceTypes.ts              # File sync types (OT, Diff)
│   ├── chatThreadServiceTypes.ts            # Chat message types
│   ├── editCodeServiceTypes.ts              # Code edit types
│   ├── cursorTrackingServiceTypes.ts        # Cursor types
│   ├── securityServiceTypes.ts              # Security/encryption types
│   └── analyticsServiceTypes.ts             # Analytics/monitoring types
│
├── browser/                                 # Browser-side services
│   ├── collaborationService.ts              # P2P connections
│   ├── fileSyncService.ts                   # Edit synchronization
│   ├── chatService.ts                       # Chat
│   ├── cursorTrackingService.ts             # Cursor tracking
│   ├── react/src/void-onboarding/           # Chat UI
│   └── edits/                               # Diff visualization
│
└── electron-main/                           # Main process services
    ├── collaborationHandler.ts              # WebRTC signaling
    ├── securityHandler.ts                   # Encryption/auth
    ├── llmMessage/                          # LLM API calls
    ├── analytics/                           # Metrics/monitoring
    └── ipc/                                 # IPC channel handlers
```

---

## Performance Characteristics

| Metric | Target | Typical |
|--------|--------|---------|
| **Edit latency** | <100ms | 40-80ms |
| **Chat latency** | <500ms | 100-200ms |
| **Cursor update rate** | 60 FPS | 60 FPS |
| **Memory per peer** | <50MB | 20-40MB |
| **Network bandwidth** | <1 Mbps | 0.5-2 Mbps |
| **CPU usage** | <20% | 5-15% |
| **Edit merge success** | 99.9% | 100% |

---

## Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Eavesdropping** | AES-256-GCM encryption on all channels |
| **Man-in-the-Middle** | ECDH key exchange with signature verification |
| **Replay Attacks** | Timestamp + nonce validation |
| **Unauthorized Access** | Room membership validation + signatures |
| **Data Tampering** | HMAC-SHA256 on all messages |

### Key Exchange (ECDH)

```
User A                          User B
  ↓                              ↓
Generate ephemeral key-pair    Generate ephemeral key-pair
  ↓                              ↓
Send public-key ─────────────→ Receive public-key
  ↓                              ↓
Compute shared-secret          Compute shared-secret
  ↓                              ↓
Derived session-key            Derived session-key
  ↓                              ↓
├─ Encrypt-key                 ├─ Encrypt-key
├─ Auth-key                    ├─ Auth-key
└─ IV for AES                  └─ IV for AES
```

---

## Scalability

### Single User
- 1 device, 1 folder
- No collaboration overhead
- Works offline (if local only)

### Small Team (2-10 users)
- Mesh network: P2P between all
- 2-5 Mbps bandwidth per peer
- <100ms edit latency

### Medium Team (10-50 users)
- Mesh becomes suboptimal
- Consider hybrid P2P + relay servers
- Bandwidth: 10-50 Mbps

### Large Team (50+ users)
- Recommend central server architecture
- Operational Transform on server
- Broadcast to all clients
- Bandwidth: 100+ Mbps

---

## Next Steps

- Read [Developer Setup](./DEVELOPER_SETUP.md) to set up local environment
- Check [Security Guide](./SECURITY_QUICK_REFERENCE.md) for encryption details
- Review [API Reference](./API_REFERENCE.md) for service interfaces
- Explore [Deployment Guide](./DEPLOYMENT.md) for production setup
