# Quick Start Guide - Real-Time Collaboration for OctateCode Editor

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd /path/to/void
npm install
```

### Step 2: Start Backend Server

```bash
# Terminal 1: Start WebSocket server
node server/collaborationServer.ts
```

Expected output:
```
[Server] WebSocket server listening on port 3001
[Server] Collaboration server started on port 3001
```

### Step 3: Launch OctateCode Editor

```bash
# Terminal 2: Build and start OctateCode editor
npm run watch
./scripts/code.bat
```

### Step 4: Create a Collaboration Room

1. Open a file in the editor
2. Right-click anywhere in the editor
3. Select **"Start Collaboration (Create Room)"**
4. Enter:
   - **Room Name**: e.g., "MyProject"
   - **Your Name**: e.g., "Alice"
5. Click **Create**

You'll see a notification with the **Room ID** (e.g., `room-1234567890-abc123def`).

### Step 5: Join from Another Editor

```bash
# Terminal 3: Start another OctateCode editor (or open new window)
./scripts/code.bat
```

1. Open the **same file** you shared
2. Right-click in editor
3. Select **"Join Collaboration (Join Room)"**
4. Enter:
   - **Room ID**: Copy the ID from step 4
   - **Your Name**: e.g., "Bob"
5. Click **Join**

### Step 6: Test Real-Time Sync

1. **User A** (Alice) types something → appears in **User B** (Bob)'s editor
2. **User B** types something → appears in **User A**'s editor
3. Move cursor around → see other user's cursor as colored label with their name
4. Both users' cursors and selections visible in real-time

## What's Happening Behind the Scenes

```
Alice's Editor          Bob's Editor
      │                    │
      │                    │
      └────────┬───────────┘
               │
         [WebSocket]
               │
               ▼
      CollaborationServer
      (port 3001)

Server receives Alice's edits → applies Operational Transform → broadcasts to Bob
Server receives Bob's edits → applies Operational Transform → broadcasts to Alice
```

## Common Commands

### Create a Room (You become Host)
```
Right-click → "Start Collaboration (Create Room)"
```

### Join a Room (You become Guest)
```
Right-click → "Join Collaboration (Join Room)"
```

### End Collaboration
```
Right-click → "End Collaboration"
```

## File Structure

```
void/
├── server/
│   └── collaborationServer.ts          ← WebSocket server
│
└── src/vs/workbench/contrib/collaboration/
    └── browser/
        ├── collaborationTypes.ts        ← Data models
        ├── operationalTransform.ts      ← OT algorithm
        ├── collaborativeDocumentService.ts
        ├── collaborationSyncService.ts  ← WebSocket client
        ├── presenceService.ts           ← User tracking
        ├── collaborationUIController.ts ← Cursor rendering
        ├── collaborationManager.ts      ← Orchestrator
        ├── collaborationEditor.ts       ← Menu actions
        ├── dialogs/
        │   └── collaborationDialogs.ts  ← UI dialogs
        └── COLLABORATION_README.md      ← Full docs
```

## Key Features

✅ **Real-Time Sync** - Changes appear instantly
✅ **Conflict Resolution** - Uses Operational Transform
✅ **Cursor Tracking** - See where others are editing
✅ **Automatic Reconnection** - Handles network interruptions
✅ **Multiple Users** - Works with 2+ people
✅ **Same File Editing** - Edit the same file together

## Troubleshooting

### "Connection refused"
- Is server running? Check Terminal 1
- Is port 3001 available? Try: `netstat -ano | findstr :3001`

### "Room not found"
- Did you copy the Room ID correctly?
- Is the host still connected?

### Content looks different
- Did both users join the **same** room?
- Try refreshing the page

### Cursor not showing
- It only shows remote cursors, not your own
- The cursor label shows the other user's name

## Environment Variables

```bash
# Custom server port
set COLLAB_PORT=3002
node server/collaborationServer.ts

# On Mac/Linux
export COLLAB_PORT=3002
node server/collaborationServer.ts
```

## Performance Tips

1. **Smaller files** = faster sync
2. **Local network** = lower latency
3. **Modern browsers** = better WebSocket support
4. **Close other tabs** = more browser resources

## Advanced Usage

### Connect to Remote Server

Edit `collaborationManager.ts`:
```typescript
// Change this:
const manager = new CollaborationManager(editor, 'localhost:3001');

// To this:
const manager = new CollaborationManager(editor, 'your.server.com:3001');
```

Then rebuild:
```bash
npm run compile
```

### View Server Logs

Check the terminal where you started the server:
```
[Server] New client connected
[Server] Room created: room-xxx by user-yyy
[Server] Operation applied: insert at position 100
[Server] Client disconnected from room room-xxx
```

### Inspect Session Info

In browser console:
```javascript
// Get stats from collaboration manager
window.collaborationStats = manager.getStats();
console.log(window.collaborationStats);
```

Output:
```javascript
{
  session: { sessionId, fileId, roomName, host, ... },
  userId: "user-xxx",
  userName: "Alice",
  isHost: true,
  document: { contentLength, operationCount, pendingCount, version },
  presence: { userCount, activeUsers },
  connectionStatus: "connected"
}
```

## Testing Scenarios

### Test 1: Basic Sync
1. Create room as Alice
2. Join as Bob
3. Alice adds text
4. Verify Bob sees it immediately ✓

### Test 2: Concurrent Edits
1. Create room as Alice
2. Join as Bob
3. Alice inserts "AAA" at position 0
4. Bob inserts "BBB" at position 0 (simultaneously)
5. Final text should be: "AAABBB" or "BBBAAA" (deterministic) ✓

### Test 3: Reconnection
1. Create room as Alice
2. Join as Bob
3. Disconnect Bob's network (close DevTools, kill server)
4. Alice edits text
5. Reconnect Bob (restart server)
6. Bob should get all of Alice's edits ✓

### Test 4: Multiple Users
1. Create room as Alice
2. Join as Bob
3. Join as Charlie (different editor)
4. All three see each other's cursors with names ✓

## Next Steps

- 📖 Read full docs: `COLLABORATION_README.md`
- 🧪 Run test scenarios above
- 🔧 Configure for your server
- 📊 Monitor performance
- 🐛 Report issues on GitHub

## Need Help?

- Check `COLLABORATION_README.md` for full documentation
- Review server logs for errors
- Check browser console (F12) for client-side errors
- Verify both users opened the same file
- Confirm Room IDs are correct

Enjoy collaborative coding! 🎉
