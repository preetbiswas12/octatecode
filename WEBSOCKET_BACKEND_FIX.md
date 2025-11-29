# WebSocket Backend Fix Required

## Issue Identified
The backend WebSocket service has a critical issue that causes "Room not found" errors:

### Root Cause
When the frontend creates a room via HTTP API (`POST /api/rooms`), the room is saved to the database. However, when the WebSocket service tries to join a room, it **only checks its in-memory `rooms` Map**, not the database.

### The Problem Flow
1. ✅ Frontend calls `POST /api/rooms` - room created in **database**
2. ✅ Frontend connects via WebSocket and authenticates
3. ❌ Frontend sends `join-room` message with roomId
4. ❌ Backend WebSocket calls `collaborationService.joinRoom(roomId, ...)`
5. ❌ `joinRoom()` checks `this.rooms.get(roomId)` - **NOT FOUND** (only in database!)
6. ❌ Returns null → "Room not found" error sent to client

### Solution
Modify `websocket.ts` - `handleJoinRoom()` method to:

```typescript
private handleJoinRoom(socket: WebSocket, message: IServerMessage): void {
    const userId = (socket as any).userId;
    const { roomId, userName } = message.data || {};

    if (!roomId) {
        this.send(socket, {
            type: 'error',
            data: { message: 'Missing roomId' }
        });
        return;
    }

    // First try to join existing room in memory
    let room = collaborationService.joinRoom(roomId, userId, userName || userId, socket);

    // If room not in memory, load from database and add to memory
    if (!room) {
        try {
            // TODO: Fetch room from database
            // const dbRoom = await supabaseService.getRoom(roomId);
            // if (dbRoom) {
            //     room = collaborationService.createOrLoadRoom(dbRoom, socket);
            // }
        } catch (error) {
            logger.error(`[WebSocket] Failed to load room from database:`, error);
        }
    }

    if (!room) {
        this.send(socket, {
            type: 'error',
            data: { message: 'Room not found' }
        });
        return;
    }

    logger.info(`[WebSocket] User ${userId} joined room ${roomId}`);

    // ... rest of handleJoinRoom
}
```

### Alternative: Sync Rooms on Startup
Or synchronize all active rooms from the database when the WebSocket service starts:

```typescript
private async loadRoomsFromDatabase(): Promise<void> {
    try {
        // const rooms = await supabaseService.getActiveRooms();
        // for (const dbRoom of rooms) {
        //     collaborationService.createRoom(...);
        // }
        logger.info('[WebSocket] Loaded rooms from database');
    } catch (error) {
        logger.error('[WebSocket] Failed to load rooms from database:', error);
    }
}
```

## Files to Fix
- **Backend File**: `/void-backend/src/services/websocket.ts`
  - Method: `handleJoinRoom()` (around line 178)
  - Add database lookup before returning "Room not found"

- **Backend File**: `/void-backend/src/services/collaboration.ts`
  - Add method: `createOrLoadRoom(dbRoom: any, socket: any)` to handle loaded rooms

## Current Status
✅ Frontend WebSocket service: **FIXED** (sends correct roomId, userId, userName)
✅ Frontend/Backend protocol: **ALIGNED** (both use roomId not sessionId)
⚠️ Backend WebSocket service: **NEEDS FIX** (must load rooms from database)

## Testing After Fix
Run frontend with command:
```bash
./scripts/code.bat
```

Expected logs after fix:
```
✓ WebSocket connected
✓ Connected to collaboration server
✓ Authenticated successfully
  Joining room: W8IJTL8 as user: k148x5z2h
✓ Successfully joined room  ← This should appear (not "Room not found")
```

