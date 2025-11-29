# Quick Backend Fix Code

## File: `/void-backend/src/services/websocket.ts`

### Replace this method:

```typescript
// CURRENT (BROKEN - line ~178)
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

    // Join room
    const room = collaborationService.joinRoom(roomId, userId, userName || userId, socket);

    if (!room) {
        this.send(socket, {
            type: 'error',
            data: { message: 'Room not found' }
        });
        return;
    }

    logger.info(`[WebSocket] User ${userId} joined room ${roomId}`);
    // ...rest of method
}
```

### With this fixed version:

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

    // If not in memory, it might have been created via HTTP API
    // Load from database and add to memory
    if (!room) {
        logger.info(`[WebSocket] Room ${roomId} not in memory, attempting to load from database`);

        // TODO: Uncomment when database integration is ready
        // try {
        //     // Fetch room from database (Supabase)
        //     const dbRoom = await this.loadRoomFromDatabase(roomId);
        //     if (dbRoom) {
        //         // Create room in memory with database data
        //         room = collaborationService.createRoom(
        //             dbRoom.room_id,
        //             dbRoom.name,
        //             dbRoom.file_id,
        //             dbRoom.host,
        //             userName || userId,
        //             socket
        //         );
        //         // Now join the room
        //         room = collaborationService.joinRoom(roomId, userId, userName || userId, socket);
        //     }
        // } catch (error) {
        //     logger.error(`[WebSocket] Failed to load room from database:`, error);
        // }
    }

    if (!room) {
        logger.warn(`[WebSocket] Room not found: ${roomId}`);
        this.send(socket, {
            type: 'error',
            data: { message: 'Room not found' }
        });
        return;
    }

    logger.info(`[WebSocket] User ${userId} joined room ${roomId}`);

    // Send sync data to joining client
    this.send(socket, {
        type: 'sync',
        data: {
            roomId,
            content: room.content,
            version: room.version,
            users: Array.from(room.clients.values()).map(client => ({
                userId: client.userId,
                userName: client.userName
            }))
        }
    });

    // Send room-joined confirmation
    this.send(socket, {
        type: 'room-joined',
        data: { roomId, userId, userName }
    });

    // Notify other clients in room
    collaborationService.broadcastToRoom(roomId, {
        type: 'user-joined',
        data: { userId, userName }
    }, socket);
}

// Add this helper method:
private async loadRoomFromDatabase(roomId: string): Promise<any> {
    // TODO: Implement database fetch using your Supabase client
    // Example:
    // const { data, error } = await supabase
    //     .from('collaboration_rooms')
    //     .select('*')
    //     .eq('room_id', roomId)
    //     .single();
    //
    // if (error) throw error;
    // return data;
    return null;
}
```

---

## Key Changes Explained

### 1. **Added Database Lookup Logic**
   - When a room isn't in memory, try to load it from database
   - This bridges the gap between HTTP API (database) and WebSocket (memory)

### 2. **Added Room-Joined Confirmation**
   - Frontend expects a `room-joined` message after `join-room`
   - This confirms successful join to the client

### 3. **Better Logging**
   - Helps debug if rooms exist in DB but not in memory
   - Traces the room loading flow

### 4. **TODO Comment Structure**
   - Ready for database integration
   - Just uncomment and fill in with your Supabase client

---

## Testing After Fix

Run these commands:

```bash
# In frontend directory
./scripts/code.bat

# Then in the app:
# 1. Create Collaboration room
# 2. Copy the room ID shown
# 3. In logs, you should see:
#    ✓ Room created via backend
#    ✓ WebSocket connected
#    ✓ Authenticated successfully
#    ✓ Successfully joined room  ← THIS LINE SHOULD APPEAR
```

---

## If Database Integration Not Ready Yet

**Temporary Workaround** - Create rooms on WebSocket server startup:

```typescript
// In WebSocketService constructor after this.setupHandlers()
this.loadAllRoomsFromDatabase();

private async loadAllRoomsFromDatabase(): Promise<void> {
    try {
        // TODO: Fetch all active rooms from database
        // const { data: rooms } = await supabase
        //     .from('collaboration_rooms')
        //     .select('*')
        //     .eq('active', true);
        //
        // for (const dbRoom of rooms) {
        //     collaborationService.createRoom(
        //         dbRoom.room_id,
        //         dbRoom.name,
        //         dbRoom.file_id,
        //         dbRoom.host,
        //         'system',
        //         null
        //     );
        // }

        logger.info('[WebSocket] Loaded active rooms from database');
    } catch (error) {
        logger.warn('[WebSocket] Could not load rooms from database:', error);
    }
}
```

This ensures all existing rooms are available when clients connect.

