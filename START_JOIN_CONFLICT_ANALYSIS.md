# START vs JOIN: Architectural Conflict Analysis

## Executive Summary

**CONFLICT FOUND:** ⚠️ There is a **critical asymmetry** between how `startAsHost` and `joinAsGuest` handle room data communication with the WebSocket backend. This causes the backend to receive incomplete room information during `startAsHost`, leading to "Room not found" errors.

---

## The Two Code Paths

### Path 1: Web UI Commands (collaboration.contribution.ts)
Used by user interactions through VS Code command palette/context menu:

**startAsHost:**
```typescript
1. HTTP: supabaseService.createRoom()                    // Save to database
2. WS:   websocketService.connect()                      // Open connection
3. Auth: (automatic in connect())                        // Send auth
4. Sync: websocketService.sendRoomCreationData()         // Send room data
```

**joinAsGuest:**
```typescript
1. HTTP: supabaseService.joinRoom()                      // Update database
2. WS:   websocketService.connect()                      // Open connection
3. Auth: (automatic in connect())                        // Send auth
4. Sync: (NOTHING - should send join-room)              // ❌ MISSING!
```

### Path 2: CollaborationManager (collaborationManager.ts)
Programmatic API for managing collaboration sessions (currently unused by UI):

**startAsHost:**
```typescript
1. Create session locally
2. this._syncService.connect()
3. this._syncService.createSession(roomName, fileId, userName)  // Sends 'create-room'
```

**joinAsGuest:**
```typescript
1. Fetch room data from API
2. this._syncService.connect()
3. this._syncService.joinSession(sessionId, userName, roomData) // Sends 'join-room' + metadata
```

---

## The Root Conflict

### Problem 1: startAsHost Sends Incomplete Data

**In websocketService.sendRoomCreationData():**
```typescript
public sendRoomCreationData(roomName: string, fileId: string, content: string = '', version: number = 0): void {
    if (!this.isConnected()) {
        console.warn('WebSocket not connected, cannot send room creation data');
        return;
    }

    this.send({
        type: 'join-room',
        data: {
            roomId: this.roomId,              // ✅ Has it
            userId: this.userId,              // ✅ Has it
            userName: this.userName,          // ✅ Has it
            roomName,                         // ✅ Has it
            fileId,                           // ✅ Has it
            host: this.userId,                // ✅ Has it
            content,                          // ✅ Has it
            version                           // ✅ Has it
        }
    });
}
```

**Expected backend to use:** `roomId` to uniquely identify the room
**Actually backend receives:** All data including `roomId` ✅

So this part is actually CORRECT!

### Problem 2: joinAsGuest in collaboration.contribution.ts Never Sends join-room

**In collaboration.contribution.ts joinAsGuest handler (lines ~165-208):**
```typescript
// Join room in Supabase
const userId = Math.random().toString(36).substring(2, 11);
const room = await supabaseService.joinRoom(result.sessionId, userId, result.userName);

// Update global state
collaborationState.startSession({...});

// Connect WebSocket for real-time sync
try {
    const wsUrl = 'wss://octate.qzz.io/collaborate';
    await websocketService.connect(wsUrl, room.roomId, userId, result.userName);
    notificationService.info(...)  // ❌ NEVER sends join-room message!
}
```

**Contrast with startAsHost handler (lines ~130-145):**
```typescript
// Connect WebSocket for real-time sync
try {
    const wsUrl = 'wss://octate.qzz.io/collaborate';
    await websocketService.connect(wsUrl, room.roomId, hostId, result.userName);

    // Send room creation data to WebSocket server
    websocketService.sendRoomCreationData(result.roomName, workspaceId, '', 0);  // ✅ SENDS!
    notificationService.info(...)
}
```

### Problem 3: Asymmetry in Message Types

**What startAsHost sends:**
```json
{
    "type": "join-room",
    "data": {
        "roomId": "LF80O3U",
        "userId": "abc123",
        "userName": "Host User",
        "roomName": "My Project",
        "fileId": "/path/to/workspace",
        "host": "abc123",
        "content": "",
        "version": 0
    }
}
```

**What joinAsGuest sends:**
```json
{
    "type": "auth",
    "data": {
        "roomId": "LF80O3U",
        "userId": "def456",
        "userName": "Guest User",
        "token": null
    }
}
```
❌ Then nothing - joins are never sent!

---

## How Backend Gets Confused

**Backend collaborationServer.ts _handleJoinRoom():**
```typescript
private _handleJoinRoom(socket: any, message: any): void {
    const { roomId, userId, userName, fileId, roomName, host, content, version } = message.data;

    // Try to find existing room
    let room = this._rooms.get(roomId);

    if (!room) {
        // Auto-create room from join message data
        room = {
            roomId,
            roomName: roomName || 'Unnamed',
            host: host || userId,
            members: [],
            content: content || '',
            version: version || 0,
            fileId: fileId || 'unknown'
        };
        this._rooms.set(roomId, room);
    }

    // Add member to room
    room.members.push({ userId, userName, socketId: socket.id });
}
```

**Flow when startAsHost:**
1. Host creates room via HTTP API ✅
2. Host connects to WebSocket ✅
3. Host sends auth ✅
4. Host sends `join-room` with full room data ✅
5. Backend receives room data and creates in memory ✅
6. Both host and guests can join successfully ✅

**Flow when joinAsGuest:**
1. Guest joins room via HTTP API ✅
2. Guest connects to WebSocket ✅
3. Guest sends auth ✅
4. Guest NEVER sends `join-room` ❌
5. Backend never creates room in memory ❌
6. When guest tries operations, room is missing ❌

---

## The Fix Required

### Option A: Update joinAsGuest in collaboration.contribution.ts (RECOMMENDED)

Add the missing `join-room` message after connection:

```typescript
// In collaboration.contribution.ts JoinCollaborationAsGuestAction.run():
try {
    const wsUrl = 'wss://octate.qzz.io/collaborate';
    await websocketService.connect(wsUrl, room.roomId, userId, result.userName);

    // ✅ ADD THIS: Send join-room with room data like startAsHost does
    websocketService.sendRoomCreationData(
        room.name,                    // roomName
        room.file_id || 'default',    // fileId
        room.content || '',           // content
        room.version || 0             // version
    );

    notificationService.info(...)
}
```

**Status:** ✅ **ALREADY IMPLEMENTED** in startAsHost
**Missing:** ❌ **NOT IMPLEMENTED** in joinAsGuest

### Option B: Use CollaborationManager (Not used in UI)

Both startAsHost and joinAsGuest in UI handlers should call `collaborationManager` methods instead, but this would require structural changes.

---

## Current Status

| Component | Status | Issue |
|-----------|--------|-------|
| `websocketService.sendRoomCreationData()` | ✅ Correct | None |
| `collaboration.contribution.ts startAsHost` | ✅ Correct | Now sends room data |
| `collaboration.contribution.ts joinAsGuest` | ❌ Incomplete | Missing `sendRoomCreationData()` call |
| `collaborationManager.startAsHost()` | ⚠️ Unused | Uses `createSession()` instead of `joinSession()` |
| `collaborationManager.joinAsGuest()` | ✅ Correct | Uses `joinSession()` with roomData |

---

## Recommended Action

**Add this line to joinAsGuest handler in collaboration.contribution.ts (after websocketService.connect()):**

```typescript
websocketService.sendRoomCreationData(room.name, room.file_id || 'default', room.content || '', room.version || 0);
```

This will make joinAsGuest symmetric with startAsHost and ensure guests' join messages include room metadata for backend to create room in memory.

---

## Key Insight

The backend WebSocket server needs room information to create/maintain rooms in memory:
- **Host sends it** via `sendRoomCreationData()` after connection ✅
- **Guests never send it** - just auth then nothing ❌

This asymmetry causes guests to fail silently when trying to access a room that the backend doesn't know about.
