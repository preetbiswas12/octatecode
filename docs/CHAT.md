# Chat Features Guide

OctateCode provides AI-powered code chat with support for 15+ LLM providers.

## How Chat Works

### Basic Flow

1. **Open Chat Sidebar** - `Ctrl+L` (with file selection) or `Ctrl+Shift+L` (new chat)
2. **Type Message** - Ask questions about code or request changes
3. **Select Context** - Include files or code snippets in your message
4. **Send** - Chat streams response in real-time
5. **Apply Code** - Accept or reject code suggestions

### Chat Sidebar

The sidebar displays:
- **Chat Tabs** - Multiple conversation threads
- **Message History** - All messages in current thread
- **Input Box** - Type your message
- **Settings** - Configure model and provider

## Message Context

### Adding Context

You can include code in your messages:

- **Ctrl+L:** Add current selection or file to chat
- **Drag & Drop:** Drag files into chat area
- **@-mentions:** Type `@` to reference files

### File Context

When you add files, the LLM can:
- See file content
- Understand dependencies
- Make context-aware suggestions

## LLM Providers

### Supported Providers

| Provider | Models | Setup |
|----------|--------|-------|
| OpenAI | GPT-4o, GPT-4 Turbo, GPT-4 | API key |
| Anthropic | Claude 3.5 Opus/Sonnet | API key |
| Google Gemini | Gemini 2.0, 1.5 Pro | API key |
| DeepSeek | DeepSeek-V3, Chat | API key |
| Groq | LLaMA, Mixtral | API key |
| OpenRouter | 100+ models | API key |
| Ollama | Local models | Local server |
| vLLM | Custom models | Local server |
| LM Studio | Custom models | Local server |

### Local Models

Run your own models locally:

```bash
# Ollama
ollama pull llama2
ollama serve  # Runs on http://localhost:11434

# vLLM
python -m vllm.entrypoints.openai.api_server --model <model>

# LM Studio
# Open LM Studio and start a local server
```

### Provider Configuration

1. **Settings** → `Gear Icon`
2. **Select Provider** → Choose from dropdown
3. **Enter API Key** → Paste your credentials
4. **Select Model** → Choose specific model
5. **Save** → Settings persist

## Model Selection

### Per-Feature Models

Each feature can use a different model:

- **Chat** - Main conversational model
- **Quick Edit** - Fast code editing
- **Search** - Code search and analysis

### Model Capabilities

OctateCode automatically detects:
- Context window size
- Token limits
- System message support
- Reasoning capabilities
- Tool support

Models show capabilities in settings

## Advanced Features

### Tool Use

Chat can execute tools:
- **Read Files** - Access workspace files
- **Search Code** - Find references
- **Run Commands** - Execute shell commands

Tools require approval before execution

### System Messages

Customize AI behavior with system prompts:

1. **Settings** → Advanced
2. **System Message** → Enter custom instructions
3. Examples:
   - "You are a Python expert"
   - "Write concise, production-ready code"
   - "Always use TypeScript with strict mode"

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Add selection to chat |
| `Ctrl+Shift+L` | New chat |
| `Enter` | Send message |
| `Shift+Enter` | New line |

## Tips

### Effective Prompts

✅ "Write a function that reverses a list in-place using Python"
✅ "This function has a memory leak. Fix it."
✅ "Convert this JavaScript to TypeScript with strict mode"

### Code Context

- Share relevant files
- Include error messages
- Mention constraints (language, version)
- Show expected vs actual output

## Troubleshooting

**Chat not responding?**
- Check provider settings and API key
- Verify internet connection
- Check account has quota/credits

**Model too slow?**
- Try a faster model
- Check your internet speed

**API errors?**
- Verify API key is correct
- Check account has credits
- Confirm model name exists


---

## Architecture

### Components

```
┌──────────────────────────────────────────────────────┐
│              Browser Process                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │  CollaborationChatPanel (React)      │            │
│  │  ├─ Message display                  │            │
│  │  ├─ Input field                      │            │
│  │  └─ Send button                      │            │
│  └────────────┬─────────────────────────┘            │
│               │                                      │
│               ↓                                      │
│  ┌──────────────────────────────────────┐            │
│  │  useChatSync Hook                    │            │
│  │  ├─ Message state management         │            │
│  │  ├─ Error handling                   │            │
│  │  └─ Service integration              │            │
│  └────────────┬─────────────────────────┘            │
│               │                                      │
│               ↓                                      │
│  ┌──────────────────────────────────────┐            │
│  │  IChatSyncService (TypeScript)       │            │
│  │  ├─ sendMessage()                    │            │
│  │  ├─ getMessages()                    │            │
│  │  ├─ onMessageReceived                │            │
│  │  └─ onMessagesCleared                │            │
│  └────────────┬─────────────────────────┘            │
│               │                                      │
│               ↓                                      │
│  ┌──────────────────────────────────────┐            │
│  │  ICollaborationService               │            │
│  │  ├─ broadcastChat()                  │            │
│  │  └─ onChatMessage()                  │            │
│  └────────────┬─────────────────────────┘            │
│               │                                      │
└───────────────┼──────────────────────────────────────┘
                │
        RTCDataChannel
                │
┌───────────────┼──────────────────────────────────────┐
│  Remote Peers │                                      │
│               ↓                                      │
│  ┌──────────────────────────────────────┐            │
│  │  Peer's Chat UI                      │            │
│  │  Receives and displays messages      │            │
│  └──────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
```

---

## Data Flow

### Sending a Message

```
User types message in input
         ↓
User clicks Send or presses Ctrl+Enter
         ↓
CollaborationChatPanel calls sendMessage()
         ↓
useChatSync validates and sends
         ↓
IChatSyncService.sendMessage()
         ↓
Creates SharedChatMessage object
         ↓
Calls collaborationService.broadcastChat()
         ↓
Message sent via RTCDataChannel
         ↓
Message added to local history
         ↓
messageReceivedEmitter fires
         ↓
UI updates with new message
```

### Receiving a Message

```
RTCDataChannel receives message
         ↓
collaborationService.onChatMessage fires
         ↓
IChatSyncService.handleIncomingMessage()
         ↓
Message added to local history
         ↓
messageReceivedEmitter fires
         ↓
UI updates with new message
         ↓
Auto-scrolls to bottom
```

---

## File Structure

### Backend Service
- **Location**: `src/vs/workbench/contrib/void/browser/chatSyncService.ts`
- **Exports**: `IChatSyncService`, `ChatSyncService`
- **Responsibilities**:
  - Manage chat message history
  - Send messages via collaboration service
  - Receive and process incoming messages
  - Emit events for UI updates
  - Handle room enter/exit

### React Hook
- **Location**: `src/vs/workbench/contrib/void/browser/react/src/collaboration-chat/useChatSync.ts`
- **Exports**: `useChatSync`
- **Provides**:
  - Message state
  - Send message function
  - Error handling
  - Initialization status

### React Component
- **Location**: `src/vs/workbench/contrib/void/browser/react/src/collaboration-chat/CollaborationChatPanel.tsx`
- **Exports**: `CollaborationChatPanel`
- **Features**:
  - Message display with timestamps
  - Auto-scrolling
  - Input field with auto-resize
  - Keyboard shortcuts (Ctrl+Enter)
  - Loading and error states
  - Empty state message

### Styles
- **Location**: `src/vs/workbench/contrib/void/browser/react/src/collaboration-chat/CollaborationChat.css`
- **Features**:
  - VS Code theme integration
  - Responsive design
  - Smooth animations
  - Dark/light mode support

---

## API Reference

### IChatSyncService

```typescript
interface IChatSyncService {
  initialize(): void;
  sendMessage(content: string): Promise<void>;
  getMessages(): SharedChatMessage[];
  onMessageReceived: (callback: (message: SharedChatMessage) => void) => () => void;
  onMessagesCleared: (callback: () => void) => () => void;
}
```

#### Methods

**initialize()**
- Initializes the chat service
- Sets up event listeners
- Must be called before sending messages
- Called automatically by React component

**sendMessage(content: string)**
- Sends a message to all peers
- Validates message is not empty
- Returns Promise that resolves when message is broadcast
- Throws error if not in a collaboration room
- Automatically adds message to local history

**getMessages()**
- Returns array of all messages received
- Messages are in chronological order
- Cleared when leaving room

#### Events

**onMessageReceived**
- Fired when a new message is received
- Callback receives `SharedChatMessage` object
- Fired for both sent and received messages

**onMessagesCleared**
- Fired when all messages are cleared
- Happens when user leaves collaboration room
- No arguments passed to callback

---

## Usage Examples

### Basic Integration

```typescript
// In your React component
import { useChatSync } from './useChatSync';

export const MyChatComponent = () => {
  const { messages, sendMessage, error } = useChatSync();

  const handleSend = async () => {
    try {
      await sendMessage('Hello team!');
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.userName}:</strong> {msg.content}
        </div>
      ))}
      <button onClick={handleSend}>Send</button>
      {error && <p>{error}</p>}
    </div>
  );
};
```

### Using the Service Directly

```typescript
// In non-React code
import { IChatSyncService } from './chatSyncService';

// Get service from DI container
const chatService = accessor.get('IChatSyncService');

// Initialize
chatService.initialize();

// Send message
await chatService.sendMessage('Hello!');

// Listen for messages
chatService.onMessageReceived((message) => {
  console.log(`${message.userName}: ${message.content}`);
});

// Get all messages
const allMessages = chatService.getMessages();
```

---

## Data Types

### SharedChatMessage

```typescript
interface SharedChatMessage {
  id: string;                    // Unique message ID (UUID)
  userId: string;                // ID of message author
  userName: string;              // Display name of author
  content: string;               // Message text
  timestamp: number;             // Unix timestamp (ms)
  role: 'user' | 'assistant';   // Message role (user for now)
}
```

---

## Features

### ✅ Real-Time Messaging
- Messages synced across all peers via RTCDataChannel
- Instant delivery (depends on network)
- No server required (P2P)

### ✅ Message History
- All messages stored in memory
- Persists for duration of room session
- Cleared when leaving room

### ✅ User Information
- Displays sender name and avatar color
- Timestamps for each message
- User ID for tracking

### ✅ Error Handling
- Network error recovery
- Validation for empty messages
- Error notifications to user

### ✅ UX Features
- Auto-scrolling to new messages
- Textarea auto-resize
- Ctrl+Enter keyboard shortcut
- Loading state during send
- Empty state when no messages
- Smooth animations

### ✅ Theme Support
- Automatically uses VS Code theme colors
- Works in light and dark modes
- Respects color accessibility settings

---

## Configuration

No configuration required. Service works with default settings:

- **Message persistence**: Session only (in-memory)
- **Max message length**: Unlimited (but reasonable for RTCDataChannel)
- **History limit**: No limit (stores all messages)
- **Auto-scroll**: Enabled by default

---

## Performance Considerations

### Message Size
- Average message: 200-500 bytes
- RTCDataChannel optimized for small messages
- No compression applied (not needed for text)

### Memory Usage
- Stores all messages in memory
- ~500 bytes per message average
- 100 messages ≈ 50 KB
- 1000 messages ≈ 500 KB

### Network Usage
- One RTCDataChannel used for all chat messages
- Multiplexed with other collaboration data
- Minimal overhead (headers only)

### Optimization Tips
- Clear old messages before long sessions (manual feature)
- Consider message archival for very long sessions
- Use message batching for bulk operations (not implemented)

---

## Error Handling

### Common Errors

**"Not in a collaboration room"**
- User tried to send message while not in room
- Solution: Wait for room join to complete

**"Message cannot be empty"**
- User sent message with only whitespace
- Solution: Validate input before sending

**"Failed to broadcast message"**
- Network error during send
- Solution: Check connection, retry

**RTCDataChannel errors**
- Handled automatically by collaborationService
- User sees "Failed to send" message
- Auto-retry on reconnection

### Error Recovery

```typescript
// Services automatically recover from errors:
1. Network disconnection → Auto-reconnect
2. Message send failure → Error notification + retry prompt
3. Room exit → Clear chat history, disable input
```

---

## Testing

### Unit Tests (To Be Created)
- Message validation
- Event emission
- Service initialization
- Room tracking

### Integration Tests
- Message delivery P2P
- Chat history persistence
- Room lifecycle
- Multiple peers chatting

### Manual Testing
1. Open two instances of OctateCode
2. Create/join same room
3. Send messages from each instance
4. Verify messages appear on both sides
5. Test disconnect/reconnect
6. Verify chat history cleared on room exit

---

## Future Enhancements

### Short Term
- [ ] Message persistence (IndexedDB)
- [ ] Message search/filter
- [ ] User typing indicators
- [ ] Reactions to messages
- [ ] Message editing

### Medium Term
- [ ] Message formatting (markdown)
- [ ] Code block highlighting
- [ ] @mentions for users
- [ ] Message threading/replies
- [ ] Audio/video transcription

### Long Term
- [ ] End-to-end encryption
- [ ] Message history archival
- [ ] Chat backup/export
- [ ] AI assistant integration
- [ ] Message translation

---

## Troubleshooting

### Messages not sending
1. Check if you're in a collaboration room
2. Check network connection
3. Check browser console for errors
4. Try reconnecting to room

### Messages not appearing
1. Verify other peer is in same room
2. Check RTCDataChannel status
3. Verify chat panel is visible
4. Check for JavaScript errors in console

### Chat history lost
1. This is expected when leaving room
2. Use future message persistence feature
3. Consider exporting chat before leaving

### Performance issues
1. Chat history stored in memory only
2. Clear history with room restart (future feature)
3. Reduce number of open messages panels
4. Close other browser tabs if needed

---

## Architecture Decisions

### Why RTCDataChannel?
- Already established for P2P communication
- Low latency
- No additional server needed
- Multiplexable with other messages

### Why In-Memory Storage?
- Simple implementation
- Sufficient for typical sessions
- Can add persistence later
- Avoids database overhead

### Why Service Layer?
- Separates business logic from UI
- Reusable across different components
- Easier to test
- Follows VS Code patterns

### Why React Hook?
- Idiomatic React pattern
- Easy state management
- Automatic subscription/cleanup
- Familiar to React developers

---

## Security Considerations

### Current Implementation
- No encryption (RTCDataChannel uses DTLS)
- No message validation beyond empty check
- No user authentication
- Anyone in room can see all messages

### Future Improvements
- E2E encryption option
- Message signing
- User authentication
- Role-based access control
- Message moderation

---

## Compliance

- **License**: Apache 2.0
- **Standards**: WebRTC (RFC 8826, 8827)
- **Accessibility**: WCAG 2.1 Level AA (target)
- **Browser Support**: All modern browsers with WebRTC

---

**Last Updated**: January 2026
**Version**: 1.0
**Status**: Implementation Complete
