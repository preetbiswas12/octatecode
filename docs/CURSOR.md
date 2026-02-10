# Remote Cursor Tracking

OctateCode shows remote cursors during collaboration so you can see where others are editing.

## Overview

When collaborating with others in a room, you see:
- Remote cursor positions (colored labels with user names)
- Current line being edited
- Real-time cursor movement
- User identification with colors

## How It Works

### Architecture

```
Browser Process:
  CursorTrackingService (receives cursor updates from peers)
    ↓
  CursorWidgetRenderer (renders to editor overlay)
    ↓
  OverlayWidget (VS Code API for positioning)
    ↓
  Editor DOM (visual cursors displayed)

Peers:
  Track local cursor → Send via P2P message
```

### Data Flow

1. **Local cursor movement** → Tracked by cursor service
2. **Throttled updates** → Sent to peers every 200ms
3. **Peer receives** → Remote cursor service processes
4. **Widget rendered** → Overlay displays at editor position
5. **User sees** → Remote cursor with label and color

## Implementation Details

### CursorTrackingService

**Location:** `src/vs/workbench/contrib/void/browser/cursorTrackingService.ts`

**Responsibilities:**
- Track local cursor position
- Listen for remote cursor updates
- Render and update cursor widgets
- Clean up when peers leave

**Key Methods:**

```typescript
// Track local cursor
onCursorChange(editor: ICodeEditor): void
  → Detects cursor movement
  → Throttles updates (200ms)
  → Broadcasts to peers

// Handle remote cursor update
onRemoteCursorUpdate(peerId: string, position: CursorPosition): void
  → Updates widget position
  → Renders label with user name
  → Applies color based on peer ID

// Clean up when peer leaves
onPeerLeft(peerId: string): void
  → Removes cursor widget
  → Frees resources
```

### CursorWidgetRenderer

**Location:** `src/vs/workbench/contrib/void/browser/cursorWidgetRenderer.ts`

**Responsibilities:**
- Render cursor visuals as overlay widget
- Position cursor at correct line/column
- Display user label with color
- Animated transitions

**Implementation:**

```typescript
class CursorWidgetRenderer {
  private widget: OverlayWidget; // VS Code overlay API

  render(cursor: RemoteCursor): void {
    // Create overlay widget
    // Position at cursor line/column
    // Add label with user name and color
    // Register with editor for positioning
  }

  update(position: CursorPosition): void {
    // Update widget position
    // Smooth animation transition
  }

  dispose(): void {
    // Clean up widget
    // Remove from editor
  }
}
```

## Visual Design

### Cursor Display

Each remote cursor shows:
1. **Thin vertical line** - Cursor position
2. **Color bar** - User identification
3. **Label** - User name

```
Example:
┌─────────────────────────────────────┐
│ function processData(input) {        │
│ │ Alice (blue)    ← Cursor position  │
│   return input.map(x => x * 2);     │
│ }                                   │
└─────────────────────────────────────┘
```

### Colors

Cursors are colored by peer ID:
- Blue, Green, Red, Yellow, Purple, Orange, Cyan, Pink
- Consistent per session

### Hover Interaction

Hover over a cursor to see:
- Full user name
- User ID
- Connection status

## Configuration

### Cursor Update Frequency

**Default:** 200ms throttle

```
Settings → Collaboration → Cursor Update Interval
- Fast (100ms): More responsive, more network traffic
- Default (200ms): Balanced
- Slow (500ms): Less traffic, visible lag
- Very Slow (1000ms): Minimal traffic, obvious lag
```

### Visual Settings

```
Settings → Collaboration → Remote Cursor Display
- Show cursor positions: ON/OFF
- Show user labels: ON/OFF
- Animate cursor movement: ON/OFF
- Cursor opacity: 0-100%
```

## Debugging

### Check Cursor Updates

Enable in Command Palette:
```
Void: Toggle Collaboration Debug
```

Shows in console:
```
[Cursor] Update from alice: line 5, col 12
[Cursor] Rendered widget for peer-123
[Cursor] Removed cursor for peer-456 (left room)
```

### Common Issues

**Issue:** Cursors not showing
- [ ] Check if collaboration is enabled
- [ ] Verify peers are connected
- [ ] Check visibility settings
- [ ] Reload window (Ctrl+Shift+P → Reload)

**Issue:** Cursor positions incorrect
- [ ] Cursor data might be for different file
- [ ] File changes not yet synchronized
- [ ] Editor not fully initialized

**Issue:** Performance lag with many cursors
- [ ] Increase update interval
- [ ] Reduce number of collaborators
- [ ] Close other editor views

## Performance Considerations

### Memory Usage

Per active cursor:
- Widget DOM: ~1 KB
- Position tracking: ~0.5 KB
- Label rendering: ~1 KB
- **Total:** ~2.5 KB per cursor

With 10 cursors: ~25 KB additional memory

### CPU Impact

Cursor updates use ~2-5% CPU when:
- Multiple users typing
- Frequent mouse movements
- Animation enabled

### Network Usage

Per cursor per minute:
- Throttled at 200ms = 5 updates/second
- Average position = 20 bytes
- **Per minute:** 6 KB

## Advanced: Custom Cursor Colors

To assign specific colors to users:

```typescript
// In CursorTrackingService
private assignCursorColor(peerId: string): string {
  const colorMap: Record<string, string> = {
    'alice-peer-id': '#0066FF',   // Blue
    'bob-peer-id': '#00AA00',     // Green
  };
  return colorMap[peerId] || this.generateRandomColor();
}
```

## Testing Cursor Functionality

### Manual Test: Two Users

1. User A: Open OctateCode, create collaboration room
2. User B: Join same room
3. User A: Move cursor around file
4. User B: Should see User A's cursor in real-time
5. Repeat with User B moving cursor

### Manual Test: Multiple Files

1. User A: Open file1.ts
2. User B: Open file2.ts (different file)
3. Both move cursors
4. User A: Switch to file2.ts
   - Should see User B's cursor
   - User A's cursor should appear to User B
5. Repeat with different files

### Automated Tests

```bash
# Run cursor tests
npm run test-node -- test/unit/node/contrib/void/cursorTracking.test.ts

# Test coverage
npm run test-coverage
```

## Summary

Remote cursor tracking provides real-time awareness of what others are editing:

✅ See cursor positions of all collaborators
✅ Identify users by color-coded labels
✅ Configurable update frequency
✅ Minimal performance impact
✅ Works across multiple open files

Use cursor tracking to:
- Coordinate editing (avoid editing same area)
- Follow along with discussions
- Understand who's working on what
