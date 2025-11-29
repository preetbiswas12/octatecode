# Frontend Collaboration API Documentation

## Overview

The frontend collaboration system uses a **pure WebSocket event-driven architecture** rather than traditional HTTP REST endpoints. All communication is bidirectional real-time messaging.

---

## WebSocket Service - Public API

File: `src/vs/workbench/contrib/collaboration/browser/websocketService.ts` (335 lines)

### Connection Methods

#### 1. `connect(wsUrl, roomId, userId, userName): Promise<void>`

**Purpose:** Establish WebSocket connection to backend

**Parameters:**
- `wsUrl` (string) - WebSocket server URL (e.g., `wss://octate.qzz.io/collaborate`)
- `roomId` (string) - Room ID to join
- `userId` (string) - User identifier
- `userName` (string) - User display name

**Returns:** Promise that resolves when connected

**Example:**
```typescript
const wsService = new WebSocketService();
await wsService.connect(
  'wss://octate.qzz.io/collaborate',
  'room-123',
  'user-456',
  'Alice'
);
```

**What Happens:**
1. Initiates WebSocket connection
2. Sends `join` message to backend
3. Starts heartbeat (30s ping/pong)
4. Emits `onConnected` event
5. Resolves promise

---

#### 2. `disconnect(): void`

**Purpose:** Close WebSocket connection

**Example:**
```typescript
wsService.disconnect();
```

**What Happens:**
1. Closes WebSocket
2. Stops heartbeat
3. Cleans up resources
4. Emits `onDisconnected` event

---

### Data Sending Methods

#### 3. `sendOperation(operationId, data, version): void`

**Purpose:** Send document change to other users

**Parameters:**
- `operationId` (string) - Unique operation ID
- `data` (string) - JSON operation data
- `version` (number) - Operation version number

**Example:**
```typescript
wsService.sendOperation(
  'op_12345',
  '{"type":"insert","position":10,"content":"hello"}',
  5
);
```

**Message Sent to Backend:**
```json
{
  "type": "operation",
  "roomId": "room-123",
  "operationId": "op_12345",
  "userId": "user-456",
  "userName": "Alice",
  "data": "...",
  "version": 5,
  "timestamp": 1700000000
}
```

**Throttling:** 100ms (prevents flooding network)

---

#### 4. `sendCursorUpdate(line, column): void`

**Purpose:** Send cursor position to other users

**Parameters:**
- `line` (number) - Line number (0-indexed)
- `column` (number) - Column number (0-indexed)

**Example:**
```typescript
wsService.sendCursorUpdate(10, 25);
```

**Message Sent to Backend:**
```json
{
  "type": "cursor",
  "roomId": "room-123",
  "userId": "user-456",
  "userName": "Alice",
  "line": 10,
  "column": 25,
  "timestamp": 1700000000
}
```

**Throttling:** 200ms (prevents excessive updates)

---

#### 5. `requestSync(): void`

**Purpose:** Request full document synchronization

**Example:**
```typescript
wsService.requestSync();
```

**Message Sent to Backend:**
```json
{
  "type": "sync_request",
  "roomId": "room-123",
  "userId": "user-456",
  "timestamp": 1700000000
}
```

**When to Use:**
- On first join to get full document
- After reconnection
- Manual sync if needed

**Backend Response:**
```json
{
  "type": "sync",
  "roomId": "room-123",
  "operations": [...]
}
```

---

### Event Listeners (Subscriptions)

#### 6. `onConnected: Event<void>`

**Fires When:** WebSocket connection established

**Example:**
```typescript
wsService.onConnected(() => {
  console.log('Connected to collaboration server');
});
```

---

#### 7. `onDisconnected: Event<void>`

**Fires When:** WebSocket connection closed

**Example:**
```typescript
wsService.onDisconnected(() => {
  console.log('Disconnected from server');
});
```

---

#### 8. `onOperationReceived: Event<RemoteOperation>`

**Fires When:** Remote user makes document change

**Data:**
```typescript
{
  operationId: string,
  userId: string,
  userName: string,
  data: string,
  version: number,
  timestamp: number
}
```

**Example:**
```typescript
wsService.onOperationReceived((operation) => {
  console.log(`Received from ${operation.userName}: ${operation.data}`);
});
```

---

#### 9. `onCursorUpdate: Event<CursorUpdate>`

**Fires When:** Remote user moves cursor

**Data:**
```typescript
{
  userId: string,
  userName: string,
  line: number,
  column: number,
  timestamp: number
}
```

**Example:**
```typescript
wsService.onCursorUpdate((cursor) => {
  console.log(`${cursor.userName} cursor at ${cursor.line}:${cursor.column}`);
});
```

---

#### 10. `onUserPresenceChanged: Event<UserPresence>`

**Fires When:** User online/offline status changes

**Data:**
```typescript
{
  userId: string,
  userName: string,
  isActive: boolean,
  lastSeen: number
}
```

**Example:**
```typescript
wsService.onUserPresenceChanged((presence) => {
  console.log(`${presence.userName} is ${presence.isActive ? 'online' : 'offline'}`);
});
```

---

#### 11. `onError: Event<string>`

**Fires When:** Connection or message error occurs

**Example:**
```typescript
wsService.onError((error) => {
  console.error('WebSocket error:', error);
});
```

---

### Other Public Methods

#### 12. `isConnected(): boolean`

**Purpose:** Check if currently connected

**Returns:** `true` if WebSocket.OPEN, `false` otherwise

**Example:**
```typescript
if (wsService.isConnected()) {
  wsService.sendOperation(...);
}
```

---

## Service Layer APIs

### OperationService

File: `operationService.ts` (195 lines)

#### `applyRemoteOperation(operation: RemoteOperation): boolean`
- Applies remote document changes (insert/delete/replace)
- Validates operation format
- Returns true if successful

---

### CursorRenderingService

File: `cursorRenderingService.ts` (136 lines)

#### `updateRemoteCursor(update: CursorUpdate): void`
- Updates cursor position display for remote user
- Renders with persistent color (8-color pool)
- Shows username label

#### `getActiveCursors(): CursorUpdate[]`
- Returns list of all active remote cursors

---

### PresenceTrackingService

File: `presenceTrackingService.ts` (253 lines)

#### `updateUserPresence(presence: UserPresence): void`
- Updates user online/idle/offline status
- Triggers onUserStatusChanged event

#### `getActiveUsers(): User[]`
- Returns list of currently active users

---

## Message Types

### Frontend → Backend

All messages are JSON sent via `WebSocket.send()`:

| Type | Message Structure | Purpose |
|------|-------------------|---------|
| `join` | `{ type, roomId, userId, userName, timestamp }` | Connect to room |
| `operation` | `{ type, roomId, userId, userName, operationId, data, version, timestamp }` | Document change |
| `cursor` | `{ type, roomId, userId, userName, line, column, timestamp }` | Cursor position |
| `presence` | `{ type, roomId, userId, userName, isActive, timestamp }` | User status |
| `sync_request` | `{ type, roomId, userId, timestamp }` | Request full sync |
| `ping` | `{ type, timestamp }` | Heartbeat |

---

### Backend → Frontend

| Type | Purpose |
|------|---------|
| `operation` | Remote document change |
| `cursor` | Remote cursor position |
| `presence` | Remote user status |
| `pong` | Heartbeat response |
| `sync` | Full document sync (all operations) |
| `joined` | Join confirmation |
| `user_joined` | Broadcast new user joined |
| `user_left` | Broadcast user disconnected |
| `ack` | Message acknowledgement |
| `error` | Error message |

---

## Summary Table

| Endpoint | Method Type | Purpose |
|----------|-------------|---------|
| `websocketService.connect()` | ASYNC | Connect to WebSocket |
| `websocketService.disconnect()` | SYNC | Close connection |
| `websocketService.sendOperation()` | SYNC | Send text edit |
| `websocketService.sendCursorUpdate()` | SYNC | Send cursor position |
| `websocketService.requestSync()` | SYNC | Request full sync |
| `websocketService.isConnected()` | SYNC | Check connection state |
| `operationService.applyRemoteOperation()` | SYNC | Apply remote edits |
| `cursorService.updateRemoteCursor()` | SYNC | Update cursor display |
| `presenceService.updateUserPresence()` | SYNC | Update user status |

---

## Events (Subscriptions)

| Event | Data Type | Fires When |
|-------|-----------|-----------|
| `onConnected` | void | Connected to server |
| `onDisconnected` | void | Disconnected from server |
| `onOperationReceived` | RemoteOperation | Remote document change |
| `onCursorUpdate` | CursorUpdate | Remote cursor moved |
| `onUserPresenceChanged` | UserPresence | User status changed |
| `onError` | string | Error occurred |

---

## Architecture Notes

- **No REST/HTTP Endpoints** - Pure WebSocket architecture
- **Bidirectional Communication** - Real-time event-driven
- **Throttling:**
  - Operations: 100ms
  - Cursor updates: 200ms
- **Auto-Reconnection:** Exponential backoff (3s → 48s, max 5 attempts)
- **Heartbeat:** 30-second ping/pong keep-alive
- **Echo Prevention:** Backend excludes sender from broadcasts

---

## Integration Example

```typescript
// 1. Initialize service
const wsService = new WebSocketService();

// 2. Connect
await wsService.connect(
  'wss://octate.qzz.io/collaborate',
  'room-abc',
  'user-123',
  'John'
);

// 3. Subscribe to events
wsService.onOperationReceived((op) => {
  operationService.applyRemoteOperation(op);
});

wsService.onCursorUpdate((cursor) => {
  cursorRenderingService.updateRemoteCursor(cursor);
});

// 4. Send data
editor.onDidChangeTextDocument((event) => {
  wsService.sendOperation('op_xyz', JSON.stringify(operation), version);
});

editor.onDidChangeCursorPosition((event) => {
  wsService.sendCursorUpdate(line, column);
});

// 5. Cleanup
wsService.disconnect();
```

---

**Last Updated:** 2024
**Architecture:** WebSocket Event-Driven
**Status:** Production Ready ✅
