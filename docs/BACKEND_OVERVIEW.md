# OctateCode Backend - Complete Overview

## 🎯 Core Architecture

### What This Backend Does

```
┌─────────────────────────────────────────────────────────────┐
│         OctateCode P2P Collaboration Backend                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ Light-weight P2P Signaling Server                        │
│  ✅ WebRTC Peer Introduction & Management                    │
│  ✅ User Authentication & Authorization                      │
│  ✅ Room Lifecycle Management                                │
│  ✅ Heartbeat Monitoring & Health Checks                     │
│  ✅ Memory Management & Cleanup                              │
│  ✅ API Endpoints for Monitoring                             │
│                                                               │
│  ❌ Does NOT store real-time collaboration data              │
│  ❌ Does NOT handle document/code content                    │
│  ❌ Does NOT persist data across restarts                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Models

### 1. **Room (RoomMetadata)**
Represents a collaboration session in memory:

```typescript
interface RoomMetadata {
  roomId: string;              // Unique identifier
  roomName: string;            // Display name
  hostId: string;              // User who created room
  hostName: string;
  fileId?: string;             // Associated file (optional)
  content?: string;            // Initial content (temp)
  version?: number;            // Version number

  // Lifecycle
  createdAt: number;           // Timestamp
  lastActivity: number;        // Last action timestamp
  state: RoomState;            // ACTIVE | IDLE | CLOSED

  // Peers
  peers: PeerInfo[];           // List of connected users
  peerCount: number;           // Count of peers
}
```

**Lifespan:** Created when host starts → Lives in memory → Deleted when last peer leaves

---

### 2. **Peer (PeerInfo)**
Represents a user in a room:

```typescript
interface PeerInfo {
  userId: string;              // User identifier
  userName: string;            // Display name
  isHost: boolean;             // Is room creator?

  // Connection tracking
  connectedAt: number;         // When joined
  lastHeartbeat: number;       // Last ping received
}
```

**Lifespan:** Created when user joins → Lives in room.peers → Removed when leaves/disconnects

---

### 3. **Auth Token**
Represents authorization to join a room:

```typescript
interface AuthToken {
  userId: string;              // User ID
  roomId: string;              // Authorized room
  issuedAt: number;            // Creation time
  expiresAt: number;           // Expiration (1 hour)
  signature: string;           // Validation signature
}
```

**Lifespan:** Generated on demand → Valid for 1 hour → Cleared automatically or on server restart

---

### 4. **Remote Operation (for P2P)**
Collaboration data transmitted peer-to-peer:

```typescript
interface RemoteOperation {
  id: string;                  // Unique operation ID
  peerId: string;              // Who made the change
  timestamp: number;           // When it happened

  // Change details
  type: 'insert' | 'delete' | 'replace';
  position: number;            // Where in document
  content?: string;            // New content (for insert)
  version: number;             // Operation version
}
```

**Lifespan:** Created by peer → Sent via WebRTC data channel → NOT stored on server

---

## 🔄 Session Lifecycle

### Phase 1: User Requests Access (HTTP)

```
Frontend                          Backend
   │                                │
   ├─ POST /api/auth/token ────────►│
   │  { userId, roomId }            │
   │                                ├─ authManager.generateToken()
   │                                │  (creates in-memory token)
   │◄──────────── token string ─────┤
   │  (valid 1 hour)                │
```

**Data Created:**
- AuthToken added to `authManager.validTokens` Map
- Nothing persisted to disk

---

### Phase 2: Create Room or Join (WebSocket)

```
Frontend                          Backend
   │                                │
   ├─ WS: { type: 'auth', ────────►│
   │        token, userId,          |
   │        roomId }                │
   │                                ├─ authManager.validateCredentials()
   │                                ├─ roomManager.createRoom() OR joinRoom()
   │                                ├─ roomManager.peers.push(peerInfo)
   │◄───── { type: 'auth-ok' } ────┤
   │                                │
```

**Data Created:**
1. **RoomMetadata** (if creating):
   - roomId, roomName, hostId
   - Empty peers array
   - state = ACTIVE
   - createdAt = now

2. **PeerInfo** (if joining):
   - userId, userName
   - connectedAt = now
   - lastHeartbeat = now

**Storage:** All in memory (`roomManager.rooms` Map)

---

### Phase 3: Exchange WebRTC Offers/Answers (WebSocket Signaling)

```
Peer A                Server                     Peer B
  │                     │                         │
  ├─ SDP Offer ────────►│                         │
  │                     ├─ Route to Peer B ──────►│
  │                     │                         │
  │◄───────────────── SDP Answer ───────────────┤
  │      (via server)                            │
  │                                              │
  ├─ ICE Candidate 1 ─►│                         │
  │                    ├─ Route to Peer B ──────►│
  │                                              │
  │◄─ ICE Candidate 2 ────────────────────────┤
  │      (via server)                            │
```

**Data Flow:** Messages routed through server but NOT stored
**Storage:** None (server acts as pass-through)

---

### Phase 4: Direct P2P Collaboration (WebRTC Data Channel)

```
Peer A                                         Peer B
  │                                              │
  ├─ Open RTCDataChannel ─────────────────────►│
  │ (P2P connection established)                │
  │                                             │
  ├─ Operation: Insert "foo" ─────────────────►│
  │ (direct, NOT through server)               │
  │                                             │
  ├─ Apply operation locally ─────────────────┤
  │ (Peer B receives and applies)              │
  │                                             │
```

**Data Flow:** Entirely between peers
**Server Involvement:** ZERO - P2P signaling already done
**Storage:** No - each peer maintains local state

---

### Phase 5: Heartbeat & Connection Monitoring (Every 30 seconds)

```
Every 30 seconds:

┌─────────────────────────────────────────┐
│  SignalingServer.startHeartbeat()       │
├─────────────────────────────────────────┤
│  For each connected WebSocket:          │
│    ├─ Send: { type: 'heartbeat' }      │
│    └─ Expect: pong within timeout       │
│                                         │
│  For each Peer in each Room:            │
│    ├─ Check: now - lastHeartbeat       │
│    ├─ If > 5 minutes → TIMEOUT         │
│    └─ Auto-remove from room            │
└─────────────────────────────────────────┘
```

**Purpose:** Detect dead connections
**Data Updated:** peer.lastHeartbeat timestamp
**Cleanup:** Auto-remove unresponsive peers

---

### Phase 6: Room Cleanup (Every 60 seconds)

```
Every 60 seconds:

┌─────────────────────────────────────────┐
│  RoomManager.cleanup()                  │
├─────────────────────────────────────────┤
│  For each Room:                         │
│    ├─ If peerCount == 0:              │
│    │  └─ Mark for deletion             │
│    │                                    │
│    ├─ If lastActivity > 3 hours ago:  │
│    │  └─ Force close room              │
│    │                                    │
│    └─ Remove from rooms Map            │
└─────────────────────────────────────────┘
```

**Triggers:**
- All peers left (peerCount = 0)
- Room inactive for 3 hours
- Memory threshold exceeded

---

### Phase 7: User Disconnects (WebSocket Close)

```
Frontend                          Backend
   │                                │
   ├─ WebSocket close ─────────────►│
   │                                ├─ handleClientDisconnect()
   │                                ├─ roomManager.leaveRoom()
   │                                ├─ Remove from peers[]
   │                                │
   │                                ├─ If peers.length == 0:
   │                                │  └─ Mark room for cleanup
   │                                │
   │                                ├─ Notify other peers:
   │                                │  { type: 'peer-left' }
```

**Data Removed:**
- PeerInfo from room.peers
- WebSocket from clients Map
- Auth token from session

---

## 💾 What Persists vs What's Lost

### ✅ Persists (Until Server Restart)

| Data | Storage | Lifetime |
|------|---------|----------|
| Room metadata | Memory (Map) | Until last peer leaves |
| Peer info | Memory (Array in room) | Until peer disconnects |
| Auth tokens | Memory (Map) | 1 hour or until used |
| WebSocket connections | Memory (Map) | Until peer disconnects |
| Heartbeat timestamps | Memory | Updated every 30s |

### ❌ Lost on Server Restart

| Data | Why Lost | Impact |
|------|----------|--------|
| All rooms | Stored in RAM | Users disconnected, must rejoin |
| All peers | Stored in RAM | All connections dropped |
| Auth tokens | Stored in RAM | Users must request new tokens |
| Active operations | Never stored | Collaboration in-progress lost |

### ❌ Never Stored (By Design)

| Data | Why Not | Where It Lives |
|------|---------|-----------------|
| Code/document content | Server stateless | In peer browsers (local) |
| Collaboration history | P2P responsibility | CRDT/OT in client app |
| Edit operations | Real-time only | WebRTC data channels |
| User profiles | Not in scope | Should be external service |

---

## 🔐 Authentication Flow

### Current Implementation (In-Memory)

```
Step 1: Request Token
┌──────────────────────────────────────┐
│ POST /api/auth/token                 │
│ Body: { userId, roomId }             │
├──────────────────────────────────────┤
│ authManager.generateToken()           │
│ ├─ Create token object               │
│ ├─ Store in validTokens Map         │
│ └─ Return base64-encoded token       │
│                                      │
│ Response: { token: "..." }           │
└──────────────────────────────────────┘

Step 2: Connect with Token
┌──────────────────────────────────────┐
│ WebSocket: auth message              │
│ { type: 'auth',                      │
│   userId, roomId,                    │
│   data: { token } }                  │
├──────────────────────────────────────┤
│ authManager.validateCredentials()    │
│ ├─ Look up token in Map             │
│ ├─ Check expiration (1 hour)        │
│ ├─ Verify userId & roomId match     │
│ └─ If valid → allow connection      │
│                                      │
│ Response: { status: 'authenticated' }│
└──────────────────────────────────────┘
```

**Limitations:**
- Tokens stored only in RAM
- No database persistence
- Lost on server restart
- No permission enforcement beyond token validation

---

## 🧠 Memory Management

### Active Monitoring

```typescript
// Every 30 seconds
MemoryManager.monitor() {
  heapUsed = process.memoryUsage().heapUsed / 1024 / 1024; // MB

  if (heapUsed > 300 MB) {
    // CRITICAL: Force aggressive cleanup
    ├─ Close all idle rooms
    ├─ Run garbage collection
    └─ Disconnect idle peers

  } else if (heapUsed > 200 MB) {
    // WARNING: Normal cleanup
    ├─ Remove dead peers
    └─ Close inactive rooms
  }
}
```

### Cleanup Triggers

| Condition | Action | Data Freed |
|-----------|--------|-----------|
| Memory > 300 MB | Aggressive cleanup | All idle rooms |
| Memory > 200 MB | Normal cleanup | Empty rooms, dead peers |
| Peer timeout > 5 min | Remove peer | PeerInfo object |
| Room inactive > 3 hours | Close room | RoomMetadata + all peers |
| All peers left room | Delete room | Entire room object |

---

## 📡 API Endpoints (HTTP)

### Health & Monitoring

```
GET /health
Response: {
  status: 'ok',
  timestamp: 1234567890,
  memory: { heapUsed: 150, heapTotal: 512 }
}

GET /stats
Response: {
  server: { uptime: 3600, activeRooms: 5, totalConnections: 12 },
  memory: { heapUsed: 150, heapPercent: 29 },
  operations: { orderedBy: 'roomId', ...stats }
}

GET /info
Response: {
  name: 'OctateCode P2P Backend',
  version: '1.0.0'
}
```

### Authentication

```
POST /api/auth/token
Body: { userId: 'user123', roomId: 'room456' }
Response: { token: 'base64EncodedToken' }

POST /api/auth/validate
Body: { userId, roomId, token }
Response: { valid: true, error?: 'string' }
```

### Room Management (HTTP)

```
POST /api/rooms
Body: { roomId, roomName, hostId, hostName }
Response: RoomMetadata

GET /api/rooms/:roomId
Response: RoomMetadata (full details)

GET /api/rooms/:roomId/peers
Response: PeerInfo[]

DELETE /api/rooms/:roomId
Response: { success: true }
```

---

## 🔗 WebSocket Message Types

### Room Operations

```typescript
// Create room
{ type: 'create-room', userId, roomId, data: { roomName, ... } }

// Join existing room
{ type: 'join-room', userId, roomId, data: { userName } }

// Leave room
{ type: 'leave-room', userId, roomId }

// Peer events (server sent)
{ type: 'peer-joined', data: { peer: PeerInfo } }
{ type: 'peer-left', data: { peer: PeerInfo } }
```

### WebRTC Signaling

```typescript
// Send offer to specific peer
{ type: 'sdp-offer', userId, roomId,
  data: { peer, offer } }

// Send answer
{ type: 'sdp-answer', userId, roomId,
  data: { peer, answer } }

// Send ICE candidate
{ type: 'ice-candidate', userId, roomId,
  data: { peer, candidate } }
```

### Presence & Heartbeat

```typescript
// Heartbeat from server
{ type: 'heartbeat' }

// User presence
{ type: 'presence', userId, roomId,
  data: { status: 'active' | 'idle' } }

// Cursor position (optional)
{ type: 'cursor-update', userId, roomId,
  data: { line, column } }
```

---

## 🚀 Startup Sequence

```
1. Load Environment Variables (.env)
   ├─ PORT=3000 (HTTP)
   ├─ SIGNALING_PORT=3001 (WebSocket)
   ├─ NODE_ENV=development
   └─ CORS_ORIGINS=http://localhost:3000,...

2. Initialize Services
   ├─ P2PServer (Express + WebSocket)
   ├─ RoomManager (empty rooms map)
   ├─ SignalingServer (WebSocket server)
   ├─ AuthManager (empty tokens map)
   └─ MemoryManager (monitoring)

3. Start Servers
   ├─ HTTP server on port 3000
   ├─ WebSocket server on port 3001
   ├─ Heartbeat monitor (every 30s)
   ├─ Cleanup interval (every 60s)
   └─ Memory monitor (every 30s)

4. Ready for Connections
   ✓ Server listening
   ✓ Health endpoints available
   ✓ P2P signaling ready
```

---

## 🔄 Complete Session Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      START OF SESSION                               │
└─────────────────────────────────────────────────────────────────────┘

1. USER AUTHENTICATES (HTTP)
   ├─ Frontend: POST /api/auth/token { userId, roomId }
   ├─ Backend: Generate 1-hour token
   └─ Store: tokens Map

2. USER CONNECTS (WebSocket)
   ├─ Frontend: WS connect to signaling server
   ├─ Frontend: Send auth message with token
   ├─ Backend: Validate credentials
   ├─ Backend: Create or join room
   ├─ Store: RoomMetadata, PeerInfo
   └─ Response: auth-ok

3. DISCOVER OTHER PEERS
   ├─ Backend: Send list of room peers
   ├─ Frontend: Create RTCPeerConnection for each peer
   └─ Store: Nothing on server

4. ESTABLISH P2P (WebRTC)
   ├─ Peer A: Create SDP offer
   ├─ Via server: Route offer to Peer B
   ├─ Peer B: Create SDP answer
   ├─ Via server: Route answer to Peer A
   ├─ Both: Exchange ICE candidates via server
   ├─ Result: Direct P2P connection established
   └─ Store: Nothing on server

5. COLLABORATE (P2P Data Channels)
   ├─ Peer A: Edit code/document
   ├─ P2P: Send via WebRTC data channel
   ├─ Peer B: Receive operation directly
   ├─ Both: Apply using CRDT/OT algorithm
   └─ Store: Nothing on server (client-side state)

6. PERIODIC HEARTBEAT (Every 30s)
   ├─ Server: Ping all connected peers
   ├─ Peers: Respond with pong
   ├─ Update: peer.lastHeartbeat
   └─ Cleanup: Remove unresponsive peers

7. PERIODIC CLEANUP (Every 60s)
   ├─ Check: Empty rooms, inactive rooms
   ├─ Remove: Stale rooms and peers
   └─ Free: Memory resources

8. USER DISCONNECTS
   ├─ Frontend: Close WebSocket
   ├─ Backend: Remove peer from room
   ├─ Backend: If room empty → mark for deletion
   └─ Notify: Other peers (peer-left event)

9. SERVER RESTART
   ├─ Loses: All rooms, peers, tokens
   ├─ Users: Must re-authenticate and rejoin
   ├─ Data: Local peer state preserved (client-side)
   └─ Result: New rooms created, fresh connections

┌─────────────────────────────────────────────────────────────────────┐
│                      END OF SESSION                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Key Limitations & Considerations

### Current Limitations

| Limitation | Impact | Solution |
|-----------|--------|----------|
| No database | Tokens/rooms lost on restart | Add SQLite/PostgreSQL |
| In-memory only | Max ~500 users per server | Horizontal scaling needed |
| No token validation | Weak auth for production | Add cryptographic signatures |
| Not cluster-ready | Single server only | Add Redis for distributed rooms |
| No persistence | Can't recover sessions | Need transaction log |
| No audit trail | No compliance/debugging | Need activity logging |

### For Production Deployment

```typescript
// Recommended additions:

1. Database (PostgreSQL or SQLite)
   ├─ Persist auth tokens
   ├─ Store user accounts
   ├─ Log collaboration sessions
   └─ Enable recovery

2. Redis Cache
   ├─ Distributed room state
   ├─ Token blacklist for logout
   ├─ Session synchronization
   └─ Cross-server routing

3. Message Queue (RabbitMQ/Bull)
   ├─ Async operations
   ├─ Reliable delivery
   ├─ Rate limiting
   └─ Load balancing

4. Monitoring
   ├─ Prometheus metrics
   ├─ Sentry error tracking
   ├─ Distributed tracing
   └─ Real-time alerts

5. Security
   ├─ JWT instead of base64 tokens
   ├─ HTTPS/WSS only
   ├─ Rate limiting
   ├─ IP whitelisting
   └─ Request validation
```

---

## 🎓 Architecture Summary

| Layer | Component | Responsibility | Data Storage |
|-------|-----------|-----------------|--------------|
| **Transport** | Express/WebSocket | HTTP & signaling | None |
| **Auth** | AuthManager | Token validation | tokens Map (RAM) |
| **Rooms** | RoomManager | Room lifecycle | rooms Map (RAM) |
| **Signaling** | SignalingServer | P2P coordination | clients Map (RAM) |
| **Memory** | MemoryManager | Resource monitoring | Metrics only |
| **Collaboration** | Client-side | Document sync (CRDT/OT) | Local state (peer) |

**Bottom Line:** Server = stateless signaling hub. Real collaboration happens peer-to-peer.
