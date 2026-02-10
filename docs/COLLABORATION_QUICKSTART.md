# Collaboration Quickstart

Set up real-time code collaboration with peers in OctateCode in 5 minutes.

## Quick Start

### 1. Open Collaboration Panel

Click the **Users icon** in the left sidebar.

### 2. Create a Room

1. Click **Create Room**
2. Enter:
   - **Room name** - Name your collaboration session
   - **Your name** - Your display name
3. Click **Create**
4. Copy the **Room ID** to share with teammates

### 3. Invite Teammates

Send them the **Room ID** via email or chat.

### 4. They Join

Teammates:
1. Click **Users icon** → **Join Room**
2. Paste the **Room ID**
3. Enter their name
4. Click **Join**

They'll appear in your peer list when connected.

## Features

### Real-Time Sync

- **Files** - Changes sync instantly
- **Cursors** - See where teammates are editing
- **Terminal** - Shared terminal sessions
- **Chat** - Integrated chat within OctateCode

### Peer List

Shows:
- All connected peers
- Online/offline status
- Host indicator (who created the room)
- Color-coded cursors

## Common Tasks

### Copy Room ID

Click the copy icon next to the Room ID in the Collaboration Panel.

### Leave Room

Click **Leave Room** and confirm.

## Troubleshooting

**Peer not appearing?**
- Verify Room ID was entered correctly
- Ask them to refresh (`Ctrl+R`)
- Check both have internet connection

**Files not syncing?**
- Verify peer is still in the room
- Check you're editing the same file
- Refresh if needed (`Ctrl+R`)

**Can't create room?**
- Check internet connection
- Verify firewall allows P2P connections

## Next Steps

- See [Chat Features](./CHAT.md)
- Read [Architecture](./ARCHITECTURE.md)

```bash
npm install
npm run watch-clientd &
npm run watchreactd &
npm run watch-extensionsd &
./scripts/code.bat
```

## Step 2: Create a Collaboration Room (1 minute)

1. Open any folder: **File → Open Folder**
2. Create or open any file
3. Press **Cmd+Shift+P** → Type "Create Collaboration Room"
4. Choose a name (or keep auto-generated)
5. Copy the **Room Code** shown

## Step 3: Invite a Teammate (1 minute)

Share the room code:
```
Room Code: XXXX-XXXX-XXXX-XXXX
```

They join by:
1. Pressing **Cmd+Shift+P** → "Join Collaboration Room"
2. Pasting the room code
3. Clicking **Join**

## Step 4: Start Collaborating (2 minutes)

### Edit Together
- Both users can edit the same file
- Changes sync instantly (<100ms)
- No conflicts - automatic merging

### See Each Other
- **Users Panel** (right sidebar): See active users
- **Colored Cursors**: Each user has unique color
- **Follow Mode**: Click user → auto-scroll to their edits

### Chat
- Press **Cmd+Shift+C** to open chat
- Type message and send
- All users see it instantly

## That's It! 🎉

You're now collaborating in real-time. Try:
- Editing the same file from both users
- Opening different files
- Sending messages in chat
- Using cursor tracking

---

## Common Tasks

### Change Room Settings
**Cmd+Shift+P** → "Room Settings"
- Change room name
- Change access level (public/private)
- Kick users
- View activity log

### Leave Room
**Cmd+Shift+P** → "Leave Collaboration"

### Copy Room Link
**Cmd+Shift+L** → Link copied to clipboard
(Share this instead of room code)

### View Active Users
**Cmd+Shift+U** → List of all users in room

### See Activity Log
**Cmd+Shift+A** → Timeline of all changes

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+Shift+C | Open chat |
| Cmd+Shift+U | List users |
| Cmd+Shift+L | Share link |
| Cmd+Shift+A | Activity log |
| Cmd+D | Multi-cursor (edit multiple) |
| Ctrl+/ | Comment/uncomment |

## Troubleshooting

**"Connection Lost"**
- Check internet connection
- Press F5 to reload
- Rejoin the room

**"Sync Failed"**
- Check file permissions
- Reload collaboration (Cmd+Shift+P → "Reload Collaboration")

**"Can't see other user"**
- Check Users panel (right sidebar)
- Verify they're connected (green dot)
- Ask them to send chat message

**"Chat not working"**
- Open chat again (Cmd+Shift+C twice)
- Check connection quality
- Try refreshing (F5)

---

## Next Steps

- Read [User Guide](./USER_GUIDE.md) for complete documentation
- Check [Security Guide](./SECURITY_QUICK_REFERENCE.md) to understand encryption
- Explore [Keyboard Shortcuts](./USER_GUIDE.md#keyboard-shortcuts)

**Happy coding! 🚀**
