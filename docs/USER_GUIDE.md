# OctateCode User Guide

Complete guide to using OctateCode for AI-assisted development and collaboration.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Chat & AI Features](#chat--ai-features)
3. [Code Editing](#code-editing)
4. [Collaboration](#collaboration)
5. [Settings & Configuration](#settings--configuration)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### First Launch

When you open OctateCode for the first time:

1. **Onboarding screen** appears with welcome tour
2. **Select an LLM provider** (OpenAI, Anthropic, Ollama, etc.)
3. **Enter API key** if using cloud provider
4. **Explore the interface:**
   - Left sidebar: Files, Chat, Collaboration
   - Editor center: Code editing
   - Right sidebar: AI chat panel
   - Bottom: Terminal, Problems, etc.

### Setting Up Your First Provider

**Via Onboarding:**
1. Click "Configure Provider" button
2. Select provider from dropdown
3. Enter your API key
4. Click "Save"

**Via Settings:**
1. Press `Ctrl+Shift+P`
2. Type "Void: Settings"
3. Select provider
4. Paste API key
5. Close settings

### Choosing a Local vs Cloud Provider

**Use Cloud Providers for:**
- Advanced models (GPT-4, Claude Opus)
- Production code
- Complex reasoning tasks
- Access to latest model versions

**Use Local Models for:**
- Private code (medical, financial, etc.)
- Testing and learning
- No API costs
- Always-on availability

To use Ollama locally:
1. Install Ollama: `ollama.ai`
2. Run: `ollama serve`
3. Pull a model: `ollama pull mistral`
4. In settings: Provider → Ollama, Model → mistral

## Chat & AI Features

### Opening the Chat Sidebar

The chat panel appears on the right side by default. To open:
- Click the chat icon in the right sidebar
- Or press `Ctrl+Shift+K`
- Or Command Palette → "Void: Toggle Chat"

### Basic Chat Usage

1. **Type your question** in the input box at the bottom
2. **Press Enter** to send
3. **Response appears** in the chat area
4. **Follow-up questions** continue the conversation

### Adding Context with @ References

Reference files and folders using `@` syntax:

```
@filename.ts          → Include that specific file
@./folder/            → Include entire folder
@selection            → Include selected code
@current              → Include current open file
```

Example:
```
How do I optimize the function in @utils.ts?
```

The LLM receives the full content of `utils.ts` for context.

### Using Tools (when available)

Some models support tool calls. The chat will:
1. Identify when a tool is needed
2. Call the tool automatically
3. Use the result in response
4. Show tool calls in the chat

Example: "List all TypeScript files in src/"
- Chat identifies need for file listing
- Calls file system tool
- Returns results
- Generates answer based on results

### Copying & Using Code from Chat

1. Code appears in syntax-highlighted blocks
2. **Copy button** appears on hover (top-right of code block)
3. Click to copy to clipboard
4. Paste in editor as needed

### Managing Chat Sessions

**Start New Chat:**
- Click "+" icon next to "Chat Sessions"
- Or press `Ctrl+Alt+N`

**Switch Between Sessions:**
- Click on session name in left sidebar
- Previous chats load automatically

**Delete Session:**
- Right-click session → "Delete"
- Confirmation required

**Export Chat:**
- Right-click session → "Export"
- Saves as `.json` file with conversation

## Code Editing

### Basic Editing (Same as VS Code)

OctateCode uses VS Code's editor:
- Syntax highlighting for 100+ languages
- Code folding with Ctrl+K, Ctrl+0
- Minimap on right side (toggle: Ctrl+B)
- Autocomplete: Ctrl+Space
- Multi-cursor: Ctrl+Alt+Up/Down

See [MULTI_CURSOR.md](MULTI_CURSOR.md) for advanced multi-cursor usage.

### Asking AI About Code

**Select code in editor → Ask in chat:**

```
// Editor has this selected:
function processData(input) {
  return input.map(x => x * 2);
}

// In chat, ask:
"What does this function do and how can I improve it?"

// AI responds with explanation and suggestions
```

**Mention current file in chat:**
```
"Refactor the function in @current to use async/await"
```

**Reference specific file:**
```
"Add TypeScript types to all functions in @api.ts"
```

### Code Applied from AI

When AI generates code suggestions:

1. **Apply button** appears in chat message
2. Click **Apply** to insert code into current file
3. **Diff view** shows what will change (red = remove, green = add)
4. **Confirm or reject** the changes
5. Changes automatically sync to collaborators

### File Operations

**Create new file:**
- File → New File
- Or Ctrl+N

**Open file:**
- File → Open File
- Or Ctrl+O
- Or drag file from file explorer

**Save file:**
- Ctrl+S
- Or File → Save

**Delete file:**
- Right-click file → Delete
- Or select file, press Delete key

## Collaboration

### Starting a Collaboration Session

1. **Open Command Palette:** `Ctrl+Shift+P`
2. **Type:** "Void: Start Collaboration"
3. **Select provider:**
   - Local P2P (default, no setup needed)
   - Deploy custom backend (advanced)
4. **Click "Create Room"**
5. **Room ID appears** - Share this with others

### Joining a Room

1. **Open Command Palette:** `Ctrl+Shift+P`
2. **Type:** "Void: Join Collaboration"
3. **Paste room ID** from collaborator
4. **Click "Join"**
5. **Files sync** automatically
6. **See remote cursors** of collaborators

### Seeing Collaborators' Work

When collaborating:

**Real-time editing:**
- Changes appear instantly as others type
- Red highlights = deletions
- Green highlights = additions
- Conflicts resolve automatically (last-write-wins)

**Remote cursors:**
- Thin colored lines show where others are editing
- User name label on each cursor
- Position updates every 200ms
- Helps coordinate work

**Chat during collaboration:**
- Team chat appears in collaboration panel
- Discuss changes in real-time
- Chat history saved with session

### Managing the Room

**Room Status:**
- See all connected peers
- View peer names and status
- Shows connection quality

**Room Settings:**
- Right-click room name → Settings
- Lock room (no new joins)
- Change room privacy
- Manage access

**Leaving:**
- Click "Leave Room"
- Your changes stay (already synced)
- Peers continue collaborating without you

### Collaboration Best Practices

1. **Avoid editing same file** at same time if possible (use chat to coordinate)
2. **Clear communication** - chat about what you're doing
3. **Keep changes small** - easier to merge
4. **Test before changes** - reduce merge conflicts
5. **Use branches** - for large features (if using git)

## Settings & Configuration

### Opening Settings

**Via UI:**
- Command Palette → "Void: Settings"

**Via File:**
- `Ctrl+,` opens VS Code settings
- Search for "Void" to see all OctateCode options

### Available Settings

**LLM Provider:**
- Which provider to use (OpenAI, Ollama, etc.)
- API key (stored securely)
- Model selection
- Temperature (creativity, 0.0-2.0)
- Max tokens (response length)

**Collaboration:**
- Cursor update frequency (default 200ms)
- Show remote cursors (on/off)
- Room background auto-sync
- P2P relay server (if self-hosting)

**Editor:**
- Font size and family
- Tab size (spaces vs tabs)
- Line numbers (on/off)
- Word wrap (on/off)

**Advanced:**
- Debug mode (on/off)
- Performance monitoring
- Analytics (on/off)
- Cache settings

## Keyboard Shortcuts

### Global Shortcuts

| Action | Windows/Linux | macOS |
|--------|---|---|
| Command Palette | Ctrl+Shift+P | Cmd+Shift+P |
| Settings | Ctrl+Shift+P, then "Settings" | Same |
| Toggle Sidebar | Ctrl+B | Cmd+B |
| New Window | Ctrl+Shift+N | Cmd+Shift+N |

### Chat Shortcuts

| Action | Windows/Linux | macOS |
|--------|---|---|
| Toggle Chat | Ctrl+Shift+K | Cmd+Shift+K |
| New Chat | Ctrl+Alt+N | Cmd+Alt+N |
| Clear Chat | Ctrl+Alt+C | Cmd+Alt+C |
| Focus Chat Input | Ctrl+Shift+I | Cmd+Shift+I |

### Editor Shortcuts

| Action | Windows/Linux | macOS |
|--------|---|---|
| Add Cursor Below | Ctrl+Alt+Down | Cmd+Alt+Down |
| Add Cursor Above | Ctrl+Alt+Up | Cmd+Alt+Up |
| Select Next Occurrence | Ctrl+D | Cmd+D |
| Select All Occurrences | Ctrl+Shift+L | Cmd+Shift+L |

### Collaboration Shortcuts

| Action | Windows/Linux | macOS |
|--------|---|---|
| Start Collab | Ctrl+Shift+Alt+C | Cmd+Shift+Alt+C |
| Join Room | Ctrl+Shift+Alt+J | Cmd+Shift+Alt+J |
| Leave Room | Ctrl+Shift+Alt+L | Cmd+Shift+Alt+L |

## Troubleshooting

### Chat Not Working

**Symptom:** Chat sends message but no response

**Diagnose:**
1. Check API key is set: Settings → Verify provider and key
2. Check internet: Try `ping openai.com` or provider URL
3. Check rate limits: Did you exceed API quota?
4. Try different model: Maybe your model is overloaded

**Fix:**
```
1. Verify API key is correct (no extra spaces/quotes)
2. Try simpler question (to verify basic connectivity)
3. Wait a few minutes (if rate-limited)
4. Check provider's status page
5. Restart OctateCode (Ctrl+Shift+P → Reload)
```

### Collaboration Not Syncing

**Symptom:** Changes don't appear to other users

**Diagnose:**
1. Check connection: See peer list in collaboration panel
2. Check files: Are you editing same file?
3. Check conflicts: Did automatic merge fail?

**Fix:**
```
1. Leave room and rejoin
2. Manually copy changes to collaborator's file
3. If persistent, reload both editors
4. Check network connection
5. Try local P2P (not relay server)
```

### Onboarding Screen Not Showing

**Symptom:** After reset, onboarding doesn't appear

**Fix:**
```
1. Ctrl+Shift+P → "Void: Reset Onboarding"
2. Wait for window reload
3. Onboarding should appear
4. If not, check Console (F12) for errors
```

### High CPU Usage

**Symptom:** App is slow, fan running

**Cause:** Usually too many collaborators or large files

**Fix:**
```
1. Close unused files
2. Leave collaboration room temporarily
3. Reduce peer count (limit to 5-10)
4. Use local Ollama instead of cloud API
5. Clear chat history (too many messages)
```

### API Key Not Saving

**Symptom:** Key resets after restart

**Fix:**
```
1. Check VS Code can write to user data directory
2. Verify API key format (no line breaks)
3. Try copying from provider dashboard again
4. Check for special characters that need escaping
5. Restart OctateCode completely
```

## FAQ

**Q: Is my code sent to OctateCode servers?**
A: No. OctateCode runs locally. Only code you explicitly share goes to your LLM provider.

**Q: Can I use multiple providers?**
A: Yes. Settings → Provider lets you switch anytime. Can maintain keys for multiple providers.

**Q: Does OctateCode store my API keys?**
A: Keys are stored locally in VS Code's encrypted storage, never transmitted to OctateCode.

**Q: Can I use OctateCode offline?**
A: With local Ollama, yes. Cloud providers require internet.

**Q: How many people can collaborate in one room?**
A: Technically unlimited, but performance degrades with 20+ users. Recommended: 2-10 people per room.

**Q: Are chats saved?**
A: Yes, in local sessions. You can export as JSON.

**Q: How do I backup my chats?**
A: Right-click chat session → Export. Saved as JSON file.

**Q: Can I run multiple rooms simultaneously?**
A: No, one active room at a time. But you can join/leave freely.

## Support

### Getting Help

- **Documentation:** [README.md](README.md)
- **Chat Features:** [CHAT.md](CHAT.md)
- **Collaboration:** [COLLABORATION_QUICKSTART.md](COLLABORATION_QUICKSTART.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Development:** [DEVELOPER_SETUP.md](DEVELOPER_SETUP.md)

### Common Resources

- **VS Code Docs:** https://code.visualstudio.com/docs
- **LLM Providers:**
  - OpenAI: https://platform.openai.com
  - Anthropic: https://console.anthropic.com
  - Ollama: https://ollama.ai
  - DeepSeek: https://deepseek.com

### Reporting Issues

- Check [Troubleshooting](#troubleshooting) section
- Search existing issues on GitHub
- Open new issue with detailed reproduction steps
- Include: OS, OctateCode version, error message, steps to reproduce
   npm install
   ```

3. **Run the development version**:
   ```bash
   npm run watch-clientd      # Terminal 1: Core TypeScript
   npm run watchreactd        # Terminal 2: React UI
   npm run watch-extensionsd  # Terminal 3: Extensions
   ```

4. **Launch the application**:
   ```bash
   .\scripts\code.bat
   ```

### First Steps

1. **Open a folder**: File → Open Folder
2. **Enable collaboration**: Cmd+Shift+P → "Start Collaboration"
3. **Share your code**: Get the room code and share with teammates
4. **Start editing**: Begin coding with real-time sync

---

## Basic Features

### Editor Fundamentals

OctateCode extends VS Code with collaboration capabilities while maintaining all standard editor features:

- **Syntax highlighting**: Full language support (50+ languages)
- **IntelliSense**: Code completion and smart suggestions
- **Debugging**: Breakpoints, step through code, inspect variables
- **Extensions**: Install from VS Code marketplace
- **Themes**: 100+ built-in and community themes

### File Management

- **Open files**: Ctrl+O or drag-and-drop
- **Create new file**: Ctrl+N
- **Save file**: Ctrl+S (auto-saves in collaboration)
- **Quick open**: Ctrl+P to jump to any file
- **Search files**: Ctrl+Shift+F for full workspace search

### Code Editing

- **Multi-cursor editing**: Ctrl+Alt+Up/Down or Ctrl+D
- **Copy/Paste**: Ctrl+C / Ctrl+V (syncs with teammates)
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z
- **Format code**: Shift+Alt+F (Format Document)
- **Comment/Uncomment**: Ctrl+/ (Toggle Line Comment)
- **Auto-indent**: Tab/Shift+Tab
- **Word wrap**: Alt+Z

### Terminal

- **Open terminal**: Ctrl+` (backtick)
- **Split terminal**: Click + icon in terminal panel
- **Switch terminals**: Ctrl+PageDown / Ctrl+PageUp
- **Run scripts**: Any npm/bash commands

---

## Collaboration Features

### Starting Collaboration

**Step 1: Create a Room**
```
Cmd+Shift+P → "Create Collaboration Room"
```
- Choose room name (auto-generated by default)
- Select access level:
  - **Public**: Anyone can join with room code
  - **Private**: Requires approval from host
  - **Invite-Only**: Must have valid token

**Step 2: Share the Room**
```
Room Code: XXXX-XXXX-XXXX-XXXX
Share this code with teammates to join
```

**Step 3: Teammates Join**
```
Cmd+Shift+P → "Join Collaboration Room"
Enter the room code
```

### Real-Time Synchronization

When you're in a collaboration room:

- **File edits sync instantly**: Changes appear on all screens in <100ms
- **Cursor positions shown**: See where teammates are editing
- **Conflict resolution**: Automatic operational transform for concurrent edits
- **Multi-user awareness**: See active users in sidebar

### Presence & Awareness

**Remote Users Panel** (Right Sidebar):
- Green dot: User actively editing
- Yellow dot: User idle (no activity for 30s)
- Red dot: User offline
- Click on user to follow their cursor

**Cursor Tracking**:
- Each user has unique color-coded cursor
- See teammate's selection highlighting
- Follow mode: Auto-scroll to follow active teammate

### Chat & Communication

**Open Chat**: Cmd+Shift+C

- Send messages to all collaborators
- Messages sync instantly
- Search chat history
- Mention teammates with @username

### Permissions & Access Control

**Host Controls** (Right-click on username):
- **Grant edit permission**: Allow file editing
- **Revoke edit permission**: Read-only mode
- **Kick user**: Remove from room
- **Change user role**: Host, Collaborator, Viewer

**Room Settings** (Cmd+Shift+P → "Room Settings"):
- Change access level
- Manage invited users
- View activity log
- Delete room

### File Synchronization

**Automatic Sync**:
- All file changes sync automatically
- No manual save required during collaboration
- Changes saved locally and remotely

**Sync Status Indicator** (Status Bar):
- ✓ Synced: All changes saved
- ⟳ Syncing: In progress
- ! Conflict: Merge needed (rare, auto-resolved)

### Error Recovery

OctateCode automatically handles:
- **Network disconnections**: Auto-reconnect when online
- **Merge conflicts**: Uses Operational Transform algorithm
- **Version mismatches**: Automatic reconciliation
- **Concurrent edits**: No data loss

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| Cmd+Shift+P | Command Palette |
| Cmd+, | Settings |
| Cmd+K Cmd+S | Keyboard Shortcuts Reference |
| F11 | Toggle Fullscreen |
| Cmd+Shift+D | Toggle Debug View |

### Collaboration

| Shortcut | Action |
|----------|--------|
| Cmd+Shift+C | Open/Close Chat |
| Cmd+Shift+O | Open Room Code |
| Cmd+Shift+L | Share Room Link |
| Cmd+Shift+U | List Active Users |
| Cmd+Shift+A | Activity Log |

### Editing

| Shortcut | Action |
|----------|--------|
| Ctrl+/ | Toggle Line Comment |
| Shift+Alt+A | Toggle Block Comment |
| Alt+Up/Down | Move Line Up/Down |
| Shift+Alt+Up/Down | Copy Line Up/Down |
| Ctrl+X | Delete Line |
| Ctrl+Enter | Insert Line Below |
| Ctrl+Shift+Enter | Insert Line Above |
| Ctrl+K Ctrl+C | Add Line Comment |
| Ctrl+K Ctrl+U | Remove Line Comment |

### Selection & Cursor

| Shortcut | Action |
|----------|--------|
| Ctrl+D | Add Next Occurrence to Selection |
| Ctrl+Shift+L | Select All Occurrences |
| Ctrl+Alt+Up/Down | Add Cursor Above/Below |
| Ctrl+U | Undo Last Cursor Operation |
| Escape | Remove All Cursors |

### Search & Replace

| Shortcut | Action |
|----------|--------|
| Ctrl+F | Find |
| Ctrl+H | Find and Replace |
| Ctrl+Shift+F | Find in Files |
| Ctrl+Shift+H | Replace in Files |
| Enter | Find Next |
| Shift+Enter | Find Previous |
| Alt+Enter | Select All Occurrences |

### Navigation

| Shortcut | Action |
|----------|--------|
| Ctrl+P | Go to File |
| Ctrl+G | Go to Line |
| Ctrl+Shift+O | Go to Symbol |
| Ctrl+T | Go to Symbol in Workspace |
| Ctrl+\ | Split Editor |
| Ctrl+Tab | Open Previous |
| Ctrl+PageDown/PageUp | Next/Previous Editor |

### Debug

| Shortcut | Action |
|----------|--------|
| F5 | Start/Continue Debugging |
| F6 | Pause |
| F10 | Step Over |
| F11 | Step Into |
| Shift+F11 | Step Out |
| Shift+Ctrl+F5 | Restart |
| Shift+F5 | Stop Debugging |

---

## Troubleshooting

### Collaboration Issues

#### "Connection Lost" Error

**Problem**: Cannot connect to collaboration server

**Solutions**:
1. Check internet connection
2. Try refreshing (F5)
3. Rejoin room (Cmd+Shift+P → "Leave Room" then "Join Room")
4. Check firewall settings (allow port 443)

#### "Sync Failed" Message

**Problem**: File changes not syncing

**Solutions**:
1. Check conflict resolution (usually auto-fixes)
2. Reload room (Cmd+Shift+P → "Reload Collaboration")
3. Check file permissions (must have write access)
4. Ensure file isn't locked by another process

#### "Permission Denied"

**Problem**: Cannot edit file or join room

**Solutions**:
1. Ask room host to grant edit permission
2. Check file permissions (File → Properties)
3. Ensure you're not in read-only mode (check status bar)
4. Try different file in same room

#### "Room Not Found"

**Problem**: Cannot join room with code

**Solutions**:
1. Double-check room code (copy-paste to avoid typos)
2. Ensure room hasn't expired (rooms auto-expire after 24h of inactivity)
3. Ask host for new room code
4. Try joining again after 10 seconds

### Performance Issues

#### "High Latency" or "Slow Edits"

**Problem**: Edits appear slowly or lag

**Solutions**:
1. **Check connection**: Look at connection quality indicator
2. **Reduce file size**: Split large files
3. **Disable extensions**: Some extensions may slow sync
4. **Check bandwidth**: Ensure sufficient network speed (>1 Mbps)
5. **Restart app**: Cmd+Shift+P → "Reload Window"

#### "Memory Usage High"

**Problem**: Application using lots of RAM

**Solutions**:
1. Close unused tabs (Ctrl+W to close)
2. Close unused editor groups
3. Clear search history: Settings → Clear History
4. Restart application
5. Check for memory leaks in extensions

#### "File Won't Save"

**Problem**: Cannot save file locally or remotely

**Solutions**:
1. Check disk space available
2. Verify write permissions on file
3. Close file and reopen
4. Check if file is locked by another process
5. Save as different name

### Chat Issues

#### "Chat Messages Not Sending"

**Problem**: Messages appear stuck

**Solutions**:
1. Check connection status
2. Try sending again
3. Refresh chat (Cmd+Shift+C twice)
4. Check message length (max 2000 chars)
5. Rejoin room

#### "Can't See Previous Messages"

**Problem**: Chat history missing

**Solutions**:
1. Open chat again (Cmd+Shift+C)
2. Check if scrolled to top of chat
3. Search chat history (Ctrl+F in chat)
4. History limited to current session

### Cursor Issues

#### "Other Users' Cursors Not Showing"

**Problem**: Cannot see teammate cursors

**Solutions**:
1. Enable cursor tracking: Settings → Cursor Tracking
2. Check if user is still connected (see Users panel)
3. Refresh view (Cmd+R)
4. Check theme compatibility
5. Try different cursor theme in Settings

#### "Cursor Movement Jerky"

**Problem**: Cursor animation not smooth

**Solutions**:
1. Adjust animation speed: Settings → Cursor Animation Speed
2. Disable other animations (may help performance)
3. Update graphics drivers
4. Close resource-heavy applications

---

## FAQ

### General Questions

**Q: Is my code secure?**
A: Yes! OctateCode uses AES-256-GCM encryption for all communication. All code is encrypted end-to-end before leaving your machine.

**Q: Can I use OctateCode offline?**
A: Collaboration requires internet, but local editing works offline. Changes sync when reconnected.

**Q: Does OctateCode work on Mac/Linux?**
A: Yes! It's built on VS Code and works on Windows, Mac, and Linux.

**Q: Can I use it with my existing VS Code extensions?**
A: Yes, 99% of VS Code extensions work. Some extensions with collaboration features may need updates.

### Collaboration Questions

**Q: How many people can edit at once?**
A: Unlimited, but optimal performance is 3-10 concurrent editors. Test with larger groups.

**Q: What happens if we edit the same line?**
A: The Operational Transform algorithm automatically merges changes without data loss.

**Q: Can we have private collaboration?**
A: Yes! Set room to "Private" and only invite specific people.

**Q: How long do rooms persist?**
A: Rooms auto-delete 24 hours after last activity. Host can also manually delete.

**Q: Can I see who edited what?**
A: Yes, enable activity logging: Cmd+Shift+P → "Show Activity Log"

### Technical Questions

**Q: What's the latency?**
A: Typically <100ms for most operations. Depends on network and file size.

**Q: Can I use it with version control (Git)?**
A: Yes! Push to Git as usual. Collaboration works alongside version control.

**Q: Is there a server limit?**
A: We support 1000+ concurrent rooms. Contact support for enterprise limits.

**Q: Can I self-host?**
A: Yes, available for enterprise customers. Contact sales.

**Q: How's my data handled?**
A: We don't store code content. Only metadata (room, users, timestamps) is logged for monitoring.

### Troubleshooting Questions

**Q: Why am I getting authentication errors?**
A: Your session may have expired. Log out (Cmd+Shift+P → "Logout") and log back in.

**Q: Can I recover deleted files?**
A: No, but you can use Git history if you've committed. Delete within room is permanent.

**Q: How do I report a bug?**
A: Click Help → Report Issue or go to GitHub Issues page.

**Q: Where can I request features?**
A: GitHub Discussions or email support@octatecode.dev

---

## Support

### Getting Help

**In-App Help**:
- Cmd+Shift+P → "Help"
- Hover over UI elements for tooltips
- Check status bar for error messages

**Documentation**:
- [Collaboration Guide](./COLLABORATION_QUICKSTART.md)
- [Security Guide](./SECURITY_QUICK_REFERENCE.md)
- [API Documentation](./API_REFERENCE.md)

**Community**:
- GitHub Discussions: https://github.com/preetbiswas12/octatecode/discussions
- Discord Server: (Link in README)
- Twitter: @OctateCode

**Professional Support**:
- Email: support@octatecode.dev
- Response time: <4 hours
- Enterprise SLA available

### Bug Reports

Include:
1. OctateCode version (Help → About)
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots/videos if helpful
5. Error messages from console (Help → Developer Tools)

### Feature Requests

Include:
1. Clear description of feature
2. Use case / problem it solves
3. Proposed implementation (if applicable)
4. Alternatives considered

---

## Tips & Tricks

### Productivity

1. **Use Command Palette**: Cmd+Shift+P for almost anything
2. **Quick Open**: Ctrl+P to jump to files without browsing
3. **Multi-Cursor**: Ctrl+D to edit multiple occurrences at once
4. **Smart Selection**: Double-click word, Ctrl+L for line, Ctrl+A for all
5. **Split Editors**: Ctrl+\ to compare files side-by-side

### Collaboration

1. **Follow Mode**: Click user avatar to follow their edits
2. **Mentions**: Use @username to notify specific user in chat
3. **Color Your Cursor**: Settings → Cursor Color to personalize
4. **Activity Log**: Cmd+Shift+A to see what changed and when
5. **Room Bookmarks**: Save frequently used room codes

### Customization

1. **Theme**: Cmd+K Cmd+T to switch themes
2. **Font Size**: Ctrl++ / Ctrl+- to zoom
3. **Indent Size**: File → Preferences → Indentation
4. **Auto-Save**: Settings → Auto Save
5. **Word Wrap**: Alt+Z for line wrapping

### Performance

1. **Disable extensions** you don't use
2. **Close unused files** (Ctrl+W)
3. **Use file filters** in search (*.js instead of searching all)
4. **Enable performance monitoring** for metrics
5. **Monitor memory** in Activity Monitor (Mac) or Task Manager (Windows)

---

## Keyboard Shortcut Cheat Sheet

### Most Used

```
Cmd+Shift+P    Command Palette (do anything)
Cmd+F          Find
Cmd+H          Replace
Ctrl+P         Go to File
Ctrl+Shift+L   Select All Occurrences
Ctrl+D         Add Next Occurrence
Cmd+/          Comment Line
Cmd+Z          Undo
Cmd+Shift+Z    Redo
Cmd+S          Save (auto-saves in collab)
Cmd+Shift+C    Chat
Cmd+Shift+U    Active Users
```

### Full List

See: Cmd+K Cmd+S for complete keyboard shortcuts reference

---

## Version History

| Version | Date | Features |
|---------|------|----------|
| 1.0.0 | Jan 2025 | Real-time collaboration, encryption, monitoring |
| 0.9.0 | Dec 2024 | Web support, cursor tracking, OT algorithm |
| 0.8.0 | Nov 2024 | Chat sync, performance optimization |
| 0.7.0 | Oct 2024 | Initial P2P collaboration |

---

**Need Help?** Contact support@octatecode.dev or visit our website at https://octatecode.dev

**Version**: 1.0.0
**Last Updated**: January 20, 2025
**Status**: Production Ready ✅
