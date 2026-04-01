# OctateCode Frontend-Backend Integration Guide

## Overview

This guide covers integrating the newly built React components with the deployed OctateCode backend. The system consists of:

- **Backend**: P2P collaboration server deployed to Render.com
- **Frontend**: React components for chat, model selection, and code diff visualization
- **API Client**: TypeScript client for backend communication

---

## Architecture

```
┌─────────────────────┐
│   React Frontend    │  (ChatInterface, ModelSelector, CodeDiffPreview)
│   (Browser/Electron)│
└──────────┬──────────┘
           │
           │ HTTP + WebSocket
           ↓
┌──────────────────────┐
│   Backend Server     │  (Express + WS on Render.com)
│   (P2P Signaling)    │
└────────────────────┘
```

---

## Component Architecture

### **Core Components Created**

| Component | Path | Purpose |
|-----------|------|---------|
| **ChatInterface** | `void-onboarding/ChatInterface.tsx` | Chat messages, LLM interaction, streaming |
| **ModelSelector** | `void-onboarding/ModelSelector.tsx` | Provider/model selection dropdowns |
| **CodeDiffPreview** | `void-onboarding/CodeDiffPreview.tsx` | Visual diff display with apply button |
| **VoidOnboardingFlow** | `void-onboarding/VoidOnboardingFlow.tsx` | Main orchestration component |
| **SharedComponents** | `components/SharedComponents.tsx` | Alert, Button, Badge, Card, Modal, Tabs |
| **BackendAPI Client** | `api/backendAPI.ts` | API communication & WebSocket |

### **Component Hierarchy**

```
VoidOnboardingFlow (Main Container)
├── Header (Status, Settings, Logout)
├── ChatInterface (Chat Room)
│   └── Messages Display
│   └── Message Input
├── ModelSelector (Settings Panel)
│   └── Provider Dropdown
│   └── Model Dropdown
│   └── Model Details Card
├── CodeDiffPreview (Code Changes)
│   └── Diff Display
│   └── Apply/Copy Actions
└── SharedComponents (Reusable)
    ├── Alert
    ├── LoadingSpinner
    ├── Button
    ├── Badge
    ├── Card
    ├── Modal
    ├── Tabs
    └── Collapsible
```

---

## Backend API Endpoints Used

### **Chat Messages**
```
POST   /api/rooms/{roomId}/messages
GET    /api/rooms/{roomId}/messages?limit=50
```

### **Code Changes**
```
POST   /api/rooms/{roomId}/changes
GET    /api/rooms/{roomId}/changes?limit=10
POST   /api/rooms/{roomId}/changes/{changeId}/apply
```

### **Room Management**
```
GET    /api/rooms
POST   /api/rooms
POST   /api/rooms/{roomId}/join
POST   /api/rooms/{roomId}/leave
GET    /api/rooms/{roomId}/peers
```

### **Authentication**
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/validate
```

### **Health & Monitoring**
```
GET    /api/health
GET    /api/metrics
```

---

## Configuration

### **Backend URL Configuration**

Set in environment or `backendAPI.ts`:

```typescript
// Option 1: Environment variables (recommended)
window.VITE_API_BASE_URL = 'https://octatecode-p2p-backend-xxxxx.onrender.com/api'
window.VITE_WS_URL = 'wss://octatecode-p2p-backend-xxxxx.onrender.com'

// Option 2: Direct import in backendAPI.ts
const baseUrl = 'https://octatecode-p2p-backend-xxxxx.onrender.com/api'
const wsUrl = 'wss://octatecode-p2p-backend-xxxxx.onrender.com'
```

### **Provider Configuration**

Models are defined in `ModelSelector.tsx` PROVIDERS object:

```typescript
const PROVIDERS = {
  openAI: {
    name: 'openAI',
    models: [
      { name: 'gpt-4o', contextWindow: 128000, ... },
      // ...
    ]
  },
  anthropic: { /* ... */ },
  ollama: { /* ... */ },
  // More providers...
}
```

To add new model:
1. Add to provider's models array
2. Include: name, displayName, contextWindow, costPerMToken
3. Set: supportsStreaming, supportsTools flags

---

## Build & Development

### **Development Workflow**

#### **Terminal 1: Backend**
```bash
cd octatecode-backend
npm run dev
# Starts on http://localhost:3000 + ws://localhost:3001
```

#### **Terminal 2: Frontend React Build**
```bash
cd octatecode
npm run watchreactd
# Watches src/vs/workbench/contrib/void/browser/react/src/
# Builds to out/
```

#### **Terminal 3: Frontend Core Build**
```bash
npm run watch-clientd
# Watches TypeScript compilation
```

#### **Terminal 4: VS Code Dev**
```bash
.\scripts\code.bat
# Launches Electron with extension host
```

### **Local Testing Checklist**

- [ ] Backend running: `curl http://localhost:3000/api/health` → 200 OK
- [ ] React watcher active: `npm run watchreactd` compiling
- [ ] VS Code dev instance launched: `.\scripts\code.bat`
- [ ] Open devtools: Ctrl+Shift+I
- [ ] Test chat interaction
- [ ] Test model switching
- [ ] Verify WebSocket connection: Check browser DevTools → Network
- [ ] Test code diff visualization

---

## Usage Flow

### **1. User Starts VS Code**
```
VoidOnboardingFlow component mounts
  → Automatically connects to backend room
  → Loads room details & recent messages
  → Displays: Chat, Model Selector, Code Diffs
```

### **2. User Selects Model**
```
ModelSelector dropdown → Choose provider & model
  → Updates: selectedProvider, selectedModel state
  → ChatInterface re-renders with new model info
```

### **3. User Sends Chat Message**
```
ChatInterface input → Type message → Press Enter/Send
  → backendAPI.sendMessage() called
  → Message sent to backend room
  → WebSocket listener receives peer messages
  → Messages displayed in real-time
```

### **4. Code Changes Arrive**
```
Backend broadcasts code change via WebSocket
  → VoidOnboardingFlow receives via onMessage('codeChange')
  → New CodeDiffPreview rendered
  → User clicks "Apply Change"
  → backendAPI.applyCodeChange() called
  → Diff marked as applied
```

---

## Error Handling

### **Network Errors**

```typescript
try {
  await backendAPI.sendMessage(roomId, text);
} catch (error) {
  // Displayed in Alert component
  setError(error instanceof Error ? error.message : 'Network error');
}
```

### **Connection Recovery**

```typescript
// Auto-retry on WebSocket disconnect
WebSocket.onclose → setTimeout → reconnect after 3s

// Manual reconnect button
<Button onClick={initializeRoom}>Reconnect</Button>
```

### **Validation**

- Backend validates all requests (auth, rate limiting)
- Frontend validates inputs before sending
- Type-safe API client prevents type errors

---

## Deployment

### **Frontend Deployment Options**

#### **Option 1: Build & Deploy to Vercel**
```bash
npm run compile       # Full build
git add -A
git commit -m "Production build"
git push origin main
# Link GitHub repo to Vercel at vercel.com
```

#### **Option 2: Build & Deploy to Render Web Service**
```bash
# Create render.yaml frontend service
# Set environment: NODE_ENV=production, VITE_API_BASE_URL=...
# Deploy via Git push
```

### **Environment Variables for Deployment**

```env
# Frontend .env.production
VITE_API_BASE_URL=https://octatecode-p2p-backend-xxxxx.onrender.com/api
VITE_WS_URL=wss://octatecode-p2p-backend-xxxxx.onrender.com
NODE_ENV=production
```

---

## Performance Optimization

### **Frontend Optimizations**

1. **Lazy load components**
   ```typescript
   const ChatInterface = lazy(() => import('./ChatInterface'));
   ```

2. **Memoize callbacks**
   ```typescript
   const handleSendMessage = useCallback(() => { /* ... */ }, [roomId]);
   ```

3. **Virtual scrolling for large message lists**
   ```typescript
   // Use react-window for 1000+ messages
   import { FixedSizeList } from 'react-window';
   ```

4. **Debounce input**
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((val: string) => handleSearch(val), 300),
     []
   );
   ```

### **Backend Considerations**

- Messages paginated (50 per request)
- Diffs loaded on demand
- Rate limiting active (100 req/15min)
- WebSocket connection pooling

---

## Testing

### **Unit Tests** (Example)

```typescript
// __tests__/ChatInterface.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';

describe('ChatInterface', () => {
  it('sends message on Enter', async () => {
    const user = userEvent.setup();
    render(<ChatInterface roomId="test" model="gpt-4o" provider="openAI" />);

    const input = screen.getByPlaceholderText(/Type your message/i);
    await user.type(input, 'Hello{Enter}');

    // Assert message appears
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### **Integration Tests**

```typescript
// __tests__/VoidOnboardingFlow.integration.test.tsx
describe('VoidOnboardingFlow Integration', () => {
  it('complete flow: connect → select model → send message', async () => {
    // 1. Mount component
    // 2. Mock API calls
    // 3. Test full flow
  });
});
```

### **Running Tests**

```bash
npm run test                # Watch mode
npm run test:run          # Single run
npm run test:coverage     # Coverage report
```

---

## Troubleshooting

### **WebSocket Connection Fails**

**Error**: `Cannot establish WebSocket connection`

**Cause:** Backend not running or incorrect URL

**Fix:**
```bash
# Verify backend is running
curl https://octatecode-p2p-backend-xxxxx.onrender.com/api/health

# Check frontend config
console.log(backendAPI.getWsUrl());

# Update if needed
backendAPI.baseUrl = 'https://correct-url.onrender.com/api'
```

### **Chat Messages Not Appearing**

**Debug Steps:**
1. Check WebSocket connection: DevTools → Network → WS filter
2. Check API calls: DevTools → Network → Fetch/XHR
3. Check console for errors: DevTools → Console
4. Verify room joined: `backendAPI.getPeerId()` should return ID

### **Code Diffs Not Loading**

**Error**: `Failed to load code changes`

**Fix:**
```typescript
// Check if authenticated
console.log(backendAPI.getToken());

// Verify room access
curl -H "Authorization: Bearer TOKEN" \
  https://octatecode-p2p-backend-xxxxx.onrender.com/api/rooms/room-id/changes
```

### **Model Not Switching**

**Check:**
1. Provider/model actually exist in PROVIDERS config
2. State updating: Check React DevTools → Components
3. Component re-rendering: Add console.log in effect

---

## Production Checklist

- [ ] Backend deployed to Render.com
- [ ] Frontend build tested locally
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] WebSocket connection tested
- [ ] Error handling tested
- [ ] Rate limiting tested
- [ ] Authentication tested
- [ ] Code diffs properly formatted
- [ ] UI responsive on mobile
- [ ] Accessibility features (WCAG AA)
- [ ] Security headers configured (CORS, CSP)
- [ ] Monitoring/logging enabled
- [ ] Backup strategy
- [ ] Documentation complete

---

## Next Steps

1. **Test locally** → Verify all components work
2. **Deploy backend** → Follow RENDER_DEPLOYMENT_GUIDE.md
3. **Deploy frontend** → Build and push to production
4. **Run integration tests** → Verify end-to-end flow
5. **Monitor production** → Check logs and metrics
6. **Iterate** → Add features based on user feedback

---

## Useful Commands

```bash
# Development
npm run watchreactd              # Watch React builds
npm run watch-clientd           # Watch TypeScript
npm run dev                      # Backend dev server
.\scripts\code.bat              # Launch VS Code dev

# Testing
npm run test:run                # Run all tests
npm run test:coverage           # Coverage report
npm run test -- ChatInterface   # Test specific component

# Building
npm run compile                 # Full build
npm run buildreact              # Build React only
npm run build-extensions        # Build extensions

# Linting
npm run eslint                  # Run ESLint
npm run eslint -- --fix         # Auto-fix issues

# Production
npm run build                   # Build for production
git push origin main            # Deploy (with auto-deploy)
```

---

## Support & Resources

- **Backend API Docs**: See `PIPELINE_STATUS.md` (30+ endpoint details)
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Production Hardening**: See `PRODUCTION_HARDENING.md`
- **Docker Setup**: See `DOCKER_GUIDE.md`
- **Monitoring**: See `MONITORING_SETUP.md`

---

## Version Info

- React: 18.x
- TypeScript: 5.2
- Express: 4.18.2
- Node: >=18.0.0
- Browser: Chrome, Firefox, Safari, Edge (latest)

