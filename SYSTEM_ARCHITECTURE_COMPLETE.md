# Complete System Architecture: Frontend ↔ Backend

## Three-Layer Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: HTTP API (Persistent Storage)                        │
│  Handles room creation/joining with database persistence        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START HOST:                          JOIN GUEST:               │
│  POST /api/rooms                      POST /api/rooms/{id}/join │
│  ├─ roomName                          ├─ userId                │
│  ├─ userName                          ├─ userName              │
│  ├─ hostId                            └─ sessionId             │
│  └─ fileId                                                      │
│       ↓                                   ↓                      │
│    Saved to DB                        Updated in DB             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         ↓                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: WebSocket Connection (Real-time Sync)               │
│  Manages in-memory rooms and real-time message broadcasting    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONNECT                    1. CONNECT                       │
│  websocketService.connect()    websocketService.connect()      │
│       ↓                             ↓                           │
│  2. AUTH (auto)                2. AUTH (auto)                  │
│  type: 'auth'                  type: 'auth'                    │
│  data: {roomId, userId, ...}   data: {roomId, userId, ...}    │
│       ↓                             ↓                           │
│  3. SEND ROOM DATA ⭐          3. SEND ROOM DATA ⭐            │
│  websocketService.               websocketService.             │
│  sendRoomCreationData()           sendRoomCreationData()       │
│       ↓                             ↓                           │
│  type: 'join-room'              type: 'join-room'              │
│  data: {                        data: {                        │
│    roomId: 'LF80O3U',           roomId: 'LF80O3U',            │
│    userId: 'hostId',            userId: 'guestId',           │
│    userName: 'Host',            userName: 'Guest',           │
│    roomName: 'Project',         roomName: 'Project',         │
│    fileId: '/path',             fileId: '/path',             │
│    host: 'hostId',              host: 'hostId',              │
│    content: '',                 content: '',                 │
│    version: 0                   version: 0                   │
│  }                              }                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         ↓                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Backend Processing (In-Memory State)                │
│  Creates/maintains rooms and handles real-time operations      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  _handleJoinRoom({                                             │
│    roomId: 'LF80O3U',                                          │
│    userId,         ✅ Extracted                               │
│    userName,       ✅ Extracted                               │
│    fileId,         ✅ Extracted                               │
│    roomName,       ✅ Extracted                               │
│    host,           ✅ Extracted (NEW)                         │
│    content,        ✅ Extracted (NEW)                         │
│    version         ✅ Extracted (NEW)                         │
│  })                                                             │
│                                                                 │
│  Check room exists:                                            │
│  ├─ If YES: Add client to room                                │
│  └─ If NO: Create room with metadata                          │
│                                                                 │
│  Room object:                                                  │
│  {                                                              │
│    id: 'LF80O3U',                                              │
│    name: 'Project',                                            │
│    fileId: '/path',                                            │
│    host: 'hostId',                                             │
│    content: '',           ✅ Initialized from message         │
│    version: 0,            ✅ Initialized from message         │
│    operations: [],                                             │
│    clients: Map,                                               │
│    createdAt: timestamp                                        │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Field Traceability Matrix

| Field | HTTP API | WS Send | Backend Extract | Backend Use | Notes |
|-------|----------|---------|-----------------|-------------|-------|
| **roomId** | ✅ From DB | ✅ Send | ✅ Extract | ✅ Room ID | Key identifier |
| **userId** | ✅ Parameter | ✅ Send | ✅ Extract | ✅ Client ID | User identifier |
| **userName** | ✅ Parameter | ✅ Send | ✅ Extract | ✅ Display | User display name |
| **roomName** | ✅ From API | ✅ Send | ✅ Extract | ✅ Room name | Room display name |
| **fileId** | ✅ From API | ✅ Send | ✅ Extract | ✅ Room fileId | Workspace identifier |
| **host** | ✅ From API | ✅ Send | ✅ Extract | ✅ Room host | Room owner (NEW) |
| **content** | ✅ From API | ✅ Send | ✅ Extract | ✅ Initial content | Code content (NEW) |
| **version** | ✅ From API | ✅ Send | ✅ Extract | ✅ Room version | Operation version (NEW) |

---

## Conflict Resolution Timeline

### Phase 1: Initial State (BROKEN ❌)
```
Host sends: join-room with all metadata ✅
Guest sends: join-room WITHOUT metadata ❌
Backend: Can't handle incomplete data
Result: "Room not found" error
```

### Phase 2: joinAsGuest Fixed (PARTIALLY WORKING ⚠️)
```
Host sends: join-room with all metadata ✅
Guest sends: join-room WITH all metadata ✅
Backend: Still extracts old way (message.data?.field)
Result: Works but verbose code
```

### Phase 3: Backend Enhanced (COMPLETE ✅)
```
Host sends: join-room with all metadata ✅
Guest sends: join-room WITH all metadata ✅
Backend: Explicitly extracts all fields ✅
Result: Clean, working system
```

---

## Data Consistency Guarantees

### Before (BROKEN)
```
HTTP DB: Room exists with content and version
WS Memory: Room missing or with empty content
Result: ❌ Sync fails, users see different state
```

### After (WORKING)
```
HTTP DB: Room with content and version
    ↓
WS Message: Frontend sends same content and version
    ↓
WS Memory: Backend creates room with matching data
Result: ✅ Both systems aligned
```

---

## Real-World Scenario

### Scenario: Host starts with code, guest joins

**Step 1: Host starts collaboration**
```
Frontend (HTTP): POST /api/rooms
  ├─ roomName: "React App"
  ├─ fileId: "/workspace/src"
  └─ content: "function App() { ... }"
Database: Room stored with content ✅

Frontend (WS): sendRoomCreationData()
  ├─ content: "function App() { ... }"
  └─ version: 0
WebSocket: Room created in memory ✅
```

**Step 2: Guest joins 5 seconds later**
```
Frontend (HTTP): POST /api/rooms/{id}/join
  ├─ userId: "guest123"
  └─ userName: "Guest"
Database: Guest added ✅

Frontend (WS): sendRoomCreationData()
  ├─ content: "function App() { ... }"
  └─ version: 0
  (Fetched from API in joinAsGuest)

Backend: Room exists in memory (host already sent it)
  ├─ Add guest to room.clients
  └─ Send sync to guest with latest content ✅
```

**Result:**
- ✅ Host and guest see same content
- ✅ Guest can immediately start editing
- ✅ All operations sync in real-time

---

## Code Quality Improvements

### Readability
- **Before:** `message.data?.content || ''`
- **After:** Explicit destructuring at top of function

### Maintainability
- **Before:** Fields extracted in multiple places
- **After:** Single extraction point with clear field list

### Debuggability
- **Before:** Generic "Room not found" errors
- **After:** Specific console logs with content details

### Robustness
- **Before:** Optional chaining scattered throughout
- **After:** Clear default values in one place
