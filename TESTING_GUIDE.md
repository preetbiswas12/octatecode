# OctateCode Testing Guide & Checklist

## Quick Start After App Launches

### Step 1: Verify App Initialization
1. **Window Opens**: Check if main Electron window appears
2. **No Crash**: Status bar should show build info (bottom-right)
3. **Console Check**: DevTools should open (F12)

### Step 2: Run Automated Tests
```javascript
// Paste in DevTools Console (F12 → Console tab):
fetch('./test-suite.js').then(r => r.text()).then(eval)
```

This will run 10 automated tests and report results.

---

## Manual Feature Testing

### 🗨️ **Chat Feature Test**

**Real-time Data to Check**:
- Messages appear instantly
- No duplicate messages
- User/Assistant labels correct
- Timestamps accurate

**Stagnant Data to Check**:
- History persists after reload (Ctrl+R)
- Old messages still visible
- Thread IDs consistent

**Test Steps**:
1. Click in chat input box
2. Type: `Hello, test message`
3. Press Enter
4. Verify message appears
5. Try different chat modes: Agent, Plan, Ask, Edit
6. Reload (Ctrl+Shift+R) → Check history persists

**Expected Result**: ✅ Messages appear, modes switch, history remains

---

### 🤖 **Collaboration Test (P2P)**

**Real-time Data**:
- Room ID displayed
- Peer count updates
- Connection status shown

**Stagnant Data**:
- Room info persists
- User names saved

**Test Steps**:
1. Click Users icon (top-right of sidebar)
2. Click "Create Room"
3. Enter room name: `OctateCode-Test`
4. Enter your name: `TestUser`
5. Click "Create"
6. Verify room ID appears
7. Copy room ID (should work)
8. Open second window (in same instance or different)
9. Join with same room ID
10. Verify peer count increases

**Expected Result**: ✅ Room created, ID visible, can join from another window

**What to Expect if Backend Offline**:
- Room creation might fail with "WebSocket error"
- fallback message should appear
- This is NORMAL for local testing

---

### ✏️ **Code Editing Test (Ctrl+K)**

**Real-time Data**:
- Diff highlighting active
- Accept/Reject buttons functional

**Test Steps**:
1. Open any file (File → Open File)
2. Press `Ctrl+K` (Windows) or `Cmd+K` (Mac)
3. Type editrequest: `add console log at the start of this file`
4. Check if diff area appears
5. Try to accept (green checkmark)
6. Verify file changed

**Expected Result**: ✅ Ctrl+K launches editor, diffs show, accept/reject buttons work

**Without LLM Key**: Will show error, but UI should still render

---

### ⚙️ **Settings & Configuration Test**

**Real-time Data**:
- Provider list populated
- Model dropdown changes on provider switch

**Stagnant Data**:
- Provider selection persists
- API keys stored securely

**Test Steps**:
1. Click Settings (gear icon in sidebar)
2. Look for "Models" tab
3. Select a provider (e.g., "Ollama" if running locally)
4. Verify model list populates
5. Try switching to different provider
6. Reload (Ctrl+Shift+R)
7. Verify provider selection persists

**Expected Result**: ✅ Settings load, provider switching works, persistence confirmed

---

### 🎨 **UI/UX Polish Test**

**Check For**:
- [ ] Dark mode works smoothly
- [ ] Light mode works smoothly
- [ ] Buttons have hover effects
- [ ] Text is readable (good contrast)
- [ ] Icons render (Lucide icons)
- [ ] No placeholder boxes or broken images
- [ ] Animations smooth (no jank)
- [ ] Input fields have focus styling
- [ ] Loading spinners animate

**Screenshot Checklist**:
1. Sidebar should look polished (like GitHub Copilot)
2. Chat area should be clean
3. Buttons should have smooth hover states
4. Collaboration panel should open smoothly

---

## Data Validation

### Real-time vs Stagnant Data Examples

**Real-time Data** (changes per session):
```
- Chat messages you type
- Peer list in collaboration room
- Active file being edited
- Currently selected model
- Streaming LLM responses
```

**Stagnant Data** (persists across sessions):
```
- Chat history (stored in database)
- User settings (provider, API keys)
- Model selection preferences
- Collaboration room history
- Application settings
```

**How to Distinguish**:
1. Make a change (e.g., send chat message)
2. Reload the app (Ctrl+Shift+R)
3. If it's still there → Stagnant (persistent)
4. If it's gone → Real-time (session-only)

---

## Bug Reporting Template

When you find an issue:

```
**Bug**: [Short description]
**Severity**: Critical / High / Medium / Low
**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected**:
[What should happen]

**Actual**:
[What actually happened]

**Console Errors**:
[Copy-paste from DevTools console]

**Screenshots**:
[Include if visual issue]
```

---

## Performance Baseline

After launching, check:
- **App Launch Time**: < 2 minutes from `.\scripts\code.bat`
- **Chat Input Lag**: Type quickly, should be instant
- **Settings Load**: < 1 second
- **File Open**: < 2 seconds for large files
- **Collaboration Connect**: < 5 seconds

---

## Known Issues to Ignore

- ⚠️ Unused import warnings in React build (non-critical)
- ⚠️ LaTeX shows as red text (feature disabled)
- ⚠️ WebSocket errors if P2P backend offline (expected)

---

## Success Criteria

### MVP (Minimum Viable Product)
- ✅ App launches without crash
- ✅ Chat input works
- ✅ Settings accessible
- ✅ Collaboration panel visible
- ✅ No critical errors in console

### Production Ready
- ✅ All MVP items
- ✅ Code editing works (Ctrl+K)
- ✅ Settings persist
- ✅ Polished UI (no rough edges)
- ✅ All tests passing

---

## Next Steps After Testing

1. Document all bugs found
2. Create GitHub issues
3. Fix critical bugs first
4. Re-test fixed features
5. Push fixes to GitHub
6. Celebrate! 🎉

---

**Generated**: April 13, 2026
**App Version**: 1.99.3
**Status**: Ready for Testing
