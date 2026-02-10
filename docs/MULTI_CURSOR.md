# Multi-Cursor Support

OctateCode fully supports VS Code's native multi-cursor editing, both locally and during collaboration.

## Overview

Multi-cursor allows you to:
- Edit multiple locations simultaneously
- Select multiple ranges at once
- Apply the same change to multiple places
- Works seamlessly during collaboration

## Local Multi-Cursor Usage

### Creating Multi-Cursor Selections

**Add cursor below:**
```
Ctrl+Alt+Down (Windows/Linux)
Cmd+Alt+Down (macOS)
```

**Add cursor above:**
```
Ctrl+Alt+Up (Windows/Linux)
Cmd+Alt+Up (macOS)
```

**Select word and add next occurrence:**
```
Ctrl+D (Windows/Linux)
Cmd+D (macOS)
```

**Select all occurrences:**
```
Ctrl+Shift+L (Windows/Linux)
Cmd+Shift+L (macOS)
```

**Add cursor at end of line:**
```
Ctrl+Shift+End
```

### Multi-Cursor Editing Examples

**Example 1: Rename variable in multiple places**

```typescript
// Before:
let count = 0;
count += 1;
console.log(count);

// Steps:
1. Select 'count' on line 1
2. Press Ctrl+D twice more to select all occurrences
3. Type 'total' to replace all
4. Result:
```

```typescript
// After:
let total = 0;
total += 1;
console.log(total);
```

**Example 2: Add indentation to multiple lines**

```typescript
// Before:
function test() {
if (true) {
console.log('hello');
}
}

// Steps:
1. Select lines 3-4
2. Alt+Click at line 3, column 1
3. Alt+Click at line 4, column 1
4. Press Tab to add indentation
5. Result:
```

```typescript
// After:
function test() {
  if (true) {
    console.log('hello');
  }
}
```

## Multi-Cursor During Collaboration

### How It Works

Multi-cursor selections are **local only**:
- Your multiple cursors don't transmit to peers
- Only your primary cursor is visible to others
- Peers see only your main editing cursor

### Example Scenario

```
User A (Alice):
- Selects 3 occurrences with multi-cursor
- Makes change simultaneously at all 3 locations
- Peers see: 3 separate edits arriving almost instantly
- Appears as 3 fast local changes

User B (Bob):
- Sees 3 file changes appearing in quick succession
- Doesn't know Alice used multi-cursor
- Files merge correctly (all changes applied)
```

### Why Local-Only?

Implementing shared multi-cursor would require:
1. Transmitting all cursor positions (high bandwidth)
2. Synchronizing complex selection states
3. Handling cursor conflicts between users
4. Complex merge resolution

Instead:
- Local multi-cursor → multiple file changes
- File changes sync normally (diff-based)
- End result is identical
- Simpler and more reliable

## Implementation Details

### In the Codebase

Multi-cursor support comes from VS Code's native editor:

```typescript
// File: src/vs/editor/contrib/multicursor/multicursor.ts
// (Part of VS Code core, inherited by OctateCode)

export class AddCursorAboveAction extends EditorAction { ... }
export class AddCursorBelowAction extends EditorAction { ... }
export class SelectHighlightsAction extends EditorAction { ... }
```

OctateCode doesn't modify multi-cursor behavior:
- Full VS Code multi-cursor support
- All keybindings work as expected
- Integrates with collaboration automatically

### Cursor Synchronization

When you use multi-cursor:

```
Local Editor:
  - Track primary cursor position
  - All other cursors are visual only
  - Send only primary cursor to peers

Diff Computation:
  - All changes from multi-cursor edit → single diff
  - Diff sent to peers
  - Peers apply changes to their files
  - Result: Files are identical
```

### No Conflict During Multi-Cursor

Multi-cursor edits can't cause conflicts because:

```typescript
// User A types at positions [10, 20, 30] simultaneously:
// - Creates 3 diffs in local file
// - Sends 3 diffs to peers
// - Peers apply all 3 in order
// - No conflict (same user, sequential)
```

## Performance

### Multi-Cursor Overhead

Single cursor operations:
- Update frequency: 200ms
- Network per update: 20 bytes
- **Total:** Minimal

Multi-cursor in local session:
- No network overhead
- No synchronization needed
- Local-only visual feature
- **Performance:** Excellent

Multi-cursor during collaboration:
- Transmits as multiple diffs
- Same as doing edits sequentially
- **No additional overhead**

## Advanced: Scripting Multi-Cursor

Use VS Code's API to programmatically add cursors:

```typescript
// Add 5 cursors in a loop
const positions: vscode.Position[] = [
  new vscode.Position(0, 0),
  new vscode.Position(1, 5),
  new vscode.Position(2, 10),
  new vscode.Position(3, 15),
  new vscode.Position(4, 20),
];

const selections = positions.map(pos => new vscode.Selection(pos, pos));
editor.selections = selections;
```

## Limitations & Notes

### Multi-Cursor is Local

```
✅ Your selections and edits at multiple places
✅ All changes sync to peers as multiple diffs
✅ Peers see the end result perfectly

❌ Peers don't see your multiple cursors
❌ Only your primary cursor is visible
❌ No shared multi-cursor selection
```

### Collaborative Implications

**Scenario:** Two users edit same area with multi-cursor

```
Alice:
- Selects lines 5 and 7 with multi-cursor
- Adds 'const' keyword to both

Bob:
- At same time edits line 5
- Changes variable name

Result:
- Diffs merge correctly
- File is consistent
- No data loss
```

### Undo/Redo

Undo works correctly with multi-cursor:
```
- Multiple changes → Single "undo step"
- Press Ctrl+Z → All multi-cursor changes reverted
- Press Ctrl+Y → All changes reapplied
```

## Common Workflows

### Find and Replace Multiple Occurrences

```
1. Ctrl+H (Find and Replace)
2. Search: "old_name"
3. Replace: "new_name"
4. Replace All
→ All occurrences updated (uses multi-cursor internally)
```

### Indent Multiple Blocks

```
1. Select first block
2. Hold Shift, Alt+Click on other blocks
3. Press Tab to indent all selected
```

### Add Same Text to Multiple Lines

```
1. Ctrl+Shift+L to select all occurrences of word
2. Type replacement
3. All replaced simultaneously
```

### Align Assignments

```
// Before:
const x = 1;
const verylongname = 2;
const y = 3;

// Steps:
1. Alt+Click after each =
2. Add cursors at column 20
3. Type spaces to align
→ All assignments aligned
```

## Debugging Multi-Cursor Issues

### Check if selections are correct

Command Palette → `Developer: Inspect Editor Tokens`

Shows:
- Current selection ranges
- Multi-cursor positions
- Active editor state

### Verify multi-cursor in collaboration

Enable debug logging:
```
Command Palette → Void: Toggle Collaboration Debug
```

Watch for:
```
[Diff] Computing changes from multi-cursor edit
[Diff] Generated 3 diffs for user action
[Sync] Sending 3 file changes to peers
```

## Summary

Multi-cursor in OctateCode:

✅ Full VS Code multi-cursor support
✅ Works during collaboration
✅ Local-only cursors (don't sync to peers)
✅ Changes propagate as multiple diffs
✅ No performance overhead
✅ Seamless undo/redo

Use multi-cursor for fast, simultaneous edits at multiple locations. During collaboration, all changes are correctly synchronized to peers as separate diffs.
