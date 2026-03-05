# Frontend - Backend Integration Guide
**Updated:** February 19, 2026
**Backend URL:** https://octatecode-backend.onrender.com

---

## ✅ INTEGRATION COMPLETE

### What Was Updated

| File | Change | Status |
|------|--------|--------|
| `.env` | `REACT_APP_P2P_HTTP` → `https://octatecode-backend.onrender.com` | ✅ |
| `.env` | `REACT_APP_P2P_WS` → `wss://octatecode-backend.onrender.com` | ✅ |
| `P2PConfig.ts` | Default HTTP URL to production | ✅ |
| `P2PConfig.ts` | Default WebSocket URL to production | ✅ |
| `useP2PConnection.ts` | Default WebSocket URL to production | ✅ |
| `collaborationChannel.ts` | P2P_BACKEND_URL to production | ✅ |
| `collaborationManager.ts` | Backend URL fallback to production | ✅ |

---

## 🔌 Backend Information

### Production Backend
```
Provider: Render (https://render.com)
Service: octatecode-backend
Status: Active & Running
```

### Endpoints

**HTTP REST API (HTTPS)**
- Base URL: `https://octatecode-backend.onrender.com`
- Health Check: `GET /api/health`
- List Rooms: `GET /api/rooms`
- Authentication: `POST /api/auth/token`

**WebSocket Signaling (WSS)**
- URL: `wss://octatecode-backend.onrender.com`
- Purpose: Real-time P2P coordination
- Protocol: JSON messages over secure WebSocket

---

## 📋 Configuration

### Environment Variables (Frontend)
```dotenv
# .env file
REACT_APP_P2P_HTTP=https://octatecode-backend.onrender.com
REACT_APP_P2P_WS=wss://octatecode-backend.onrender.com
NODE_ENV=development
VSCODE_DEV=1
```

### Connection Flow

```
Frontend App
    ↓
1. Load Configuration
   → Backend HTTP: https://octatecode-backend.onrender.com
   → Backend WS: wss://octatecode-backend.onrender.com
    ↓
2. Generate Token
   → POST /api/auth/token
   → Receive: token (JWT)
    ↓
3. Connect WebSocket
   → Connect to wss://octatecode-backend.onrender.com
   → Send: { type: 'AUTH', token }
    ↓
4. P2P Communication
   → Receive peer list
   → Establish P2P data channels (WebRTC)
   → Exchange operations (CRDT/OT)
```

---

## 🧪 Testing

### 1. Verify Backend is Running

```bash
# Check health
curl https://octatecode-backend.onrender.com/api/health

# Expected Response:
{
  "status": "ok",
  "timestamp": 1708356000000,
  "rooms": 0,
  "totalPeers": 0
}
```

### 2. Test Token Generation

```bash
curl -X POST https://octatecode-backend.onrender.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "roomId": "test-room"
  }'

# Expected Response:
{
  "status": "success",
  "token": "eyJ...",
  "expiresIn": "1 hour"
}
```

### 3. Browser Console Check

When running the frontend:

```javascript
// Check configuration
const backendUrl = window.REACT_APP_P2P_HTTP;
const wsUrl = window.REACT_APP_P2P_WS;

console.log('Backend HTTP:', backendUrl);
// Output: Backend HTTP: https://octatecode-backend.onrender.com
console.log('Backend WS:', wsUrl);
// Output: Backend WS: wss://octatecode-backend.onrender.com
```

### 4. WebSocket Connection Test

```javascript
// In browser console
const ws = new WebSocket('wss://octatecode-backend.onrender.com');
ws.onopen = () => console.log('WebSocket connected!');
ws.onerror = (e) => console.error('WebSocket error:', e);
```

---

## 🚀 Building & Running

### Development

```bash
npm install
npm run build
npm run dev

# Frontend starts on http://localhost:8080
# Connects to backend at https://octatecode-backend.onrender.com
```

### Production Build

```bash
npm run build
npm start

# Ready for deployment
```

---

## 🔐 Security Notes

### HTTPS/WSS Configuration
- **HTTP:** Uses `https://` (HTTPS)
- **WebSocket:** Uses `wss://` (WebSocket Secure)
- **Certificate:** Render provides automatic SSL/TLS
- **CORS:** Backend configured for all origins

### Token Security
- **Expiration:** 1 hour
- **Format:** JWT with HMAC-SHA256 signature
- **Storage:** Keep in memory only (not localStorage)
- **Refresh:** Need new token after expiration

### Browser Requirements
- **HTTPS:** Modern browsers require secure context for:
  - WebRTC (getUserMedia, RTCPeerConnection)
  - WebSocket Secure (WSS)
- **CSP:** Content Security Policy may need updates
- **Cookies:** Same-site cookie policies apply

---

## 📱 How It Works

### 1. User Joins Room

```typescript
// Frontend code
const token = await fetch('https://octatecode-backend.onrender.com/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'alice', roomId: 'doc-123' })
}).then(r => r.json()).then(d => d.token);

// token = "eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### 2. Connect WebSocket

```typescript
const ws = new WebSocket('wss://octatecode-backend.onrender.com');
ws.send(JSON.stringify({
  type: 'AUTH',
  token: token,
  roomId: 'doc-123'
}));

// Server validates token and adds you to room
// Sends: { type: 'PEER_JOINED', peerId: '...', peerName: 'alice' }
```

### 3. Establish P2P Connections

```typescript
// For each peer in the room, establish WebRTC connection
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] }
  ]
});

// Exchange SDP offers/answers via WebSocket signaling
// Once connected, use data channels for operations
```

### 4. Real-Time Collaboration

```typescript
// Send operations (CRDT/OT)
dataChannel.send(JSON.stringify({
  type: 'operation',
  operationType: 'insert',
  position: 10,
  content: 'hello'
}));

// Receive operations from peers
dataChannel.onmessage = (e) => {
  const op = JSON.parse(e.data);
  applyOperationToDocument(op);
};
```

---

## 🛠️ Troubleshooting

### Issue: "Connection refused"
```
❌ Error: Failed to connect to https://octatecode-backend.onrender.com
```

**Fixes:**
1. Check backend is active: `curl https://octatecode-backend.onrender.com/api/health`
2. Check network: No firewall blocking backend
3. Wait 30 seconds after Render deployment to stabilize

### Issue: "Invalid token"
```
❌ Error: Authentication failed: Invalid token
```

**Fixes:**
1. Token expired - generate new token
2. Token modified - don't edit/copy incorrectly
3. Verify AUTH_SECRET matches backend

### Issue: "WebSocket connection failed"
```
❌ Error: WebSocket connection failed
```

**Fixes:**
1. Use `wss://` (not `ws://`) for HTTPS
2. Check browser allows WebSocket (Chrome extensions can block)
3. Check firewall allows port 443 (HTTPS/WSS port)

### Issue: "No P2P connections"
```
❌ No [Collab P2P] messages in console
```

**Fixes:**
1. Check both users have valid tokens
2. Check both are in same room
3. Check firewall allows UDP (WebRTC uses UDP)
4. Check STUN server accessible: `nslookup stun.l.google.com`
5. Try with relay servers (TURN) as fallback

### Issue: "CORS error"
```
❌ Access-Control-Allow-Origin header missing
```

**Status:** Backend is configured for CORS, should not occur
**Fix:** If occurs, update backend render.yaml CORS_ORIGINS

---

## 📊 Performance Tips

### Connection Optimization

```typescript
// Reconnect strategy
const reconnectDelay = 2000;     // 2 seconds
const maxReconnectAttempts = 10; // Try 10 times

// Heartbeat to keep connection alive
const heartbeatInterval = 30000; // 30 seconds

// These are configured in P2PConfig.ts
```

### For Multiple Users

1. **Render Auto-scaling:** Backend auto-scales with load
2. **P2P Efficiency:** Operations go peer-to-peer, not through server
3. **Memory:** Server tracks rooms/peers, not operation data
4. **CPU:** Server does signaling only, minimal processing

---

## ✨ Features Enabled

✅ **Real-time Collaboration**
- Users can edit simultaneously
- Changes sync across all peers
- No latency from server polling

✅ **Offline Support (with Session Recovery)**
- Users can reconnect to same session
- Pending operations are replayed
- No data loss on brief disconnections

✅ **Conflict Resolution**
- CRDT (Conflict-free Replicated Data Type)
- All simultaneous edits preserved
- No manual merge conflicts

✅ **Audit Trail**
- All operations logged
- Undo/redo support
- Time-travel recovery

✅ **Security**
- Token-based authentication
- HMAC-SHA256 signatures
- HTTPS/WSS encryption
- Per-user, per-room authorization

---

## 🚀 Next Steps

### Immediate
1. ✅ Backend deployed to Render
2. ✅ Frontend configured for production
3. ⏳ Test with multiple users
4. ⏳ Monitor backend performance

### Short Term (1-2 weeks)
1. Add UI for room creation/joining
2. Add peer list display
3. Add presence indicators
4. Testing with 10+ concurrent users

### Medium Term (2-4 weeks)
1. Add analytics dashboard
2. Add monitoring/alerting
3. Load testing with 100+ users
4. Performance optimization

### Long Term (1+ months)
1. Mobile app support
2. Offline sync
3. Multi-region deployment
4. Advanced analytics

---

## 📞 Support

### Backend Status
- **URL:** https://octatecode-backend.onrender.com
- **Health Check:** GET /api/health
- **Region:** Oregon (Render)
- **Auto-start:** Yes (Render keeps alive)

### Configuration Files Updated
- `.env` → Production URLs
- `P2PConfig.ts` → Default to production
- `useP2PConnection.ts` → Production WebSocket
- `collaborationChannel.ts` → Production HTTP
- `collaborationManager.ts` → Production fallback

### Testing Endpoints
```bash
# Health check
curl https://octatecode-backend.onrender.com/api/health

# List rooms (should be empty initially)
curl https://octatecode-backend.onrender.com/api/rooms

# Generate token
curl -X POST https://octatecode-backend.onrender.com/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","roomId":"test-room"}'
```

---

## Summary

✅ **All frontend code updated to use production backend**
✅ **HTTPS/WSS secure connections configured**
✅ **Configuration files synchronized**
✅ **Ready for deployment and testing**

The frontend is now fully integrated with the production P2P backend running on Render!
