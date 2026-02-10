# Developer Setup Guide

Set up your local development environment for OctateCode development.

## Prerequisites

- **Node.js** 18+ - `node --version`
- **npm** 9+ - `npm --version`
- **git** - `git --version`
- **RAM** 4+ GB recommended
- **Disk Space** 2+ GB for dependencies

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/preetbiswas12/octatecode.git
cd octatecode
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- TypeScript, VS Code base libraries
- React, React DOM
- Electron
- Build tools (Gulp, tsup)
- Testing frameworks

### 3. Download Electron

```bash
npm run electron
```

This downloads the Electron binary (~150 MB).

## Development Workflow

### Start the 3 Build Watchers

In three separate terminals, run:

**Terminal 1 - Core TypeScript Build:**
```bash
npm run watch-clientd
```

**Terminal 2 - React Components:**
```bash
npm run watchreactd
```

**Terminal 3 - Extensions:**
```bash
npm run watch-extensionsd
```

Or use the combined task:
```bash
npm run VS\ Code\ -\ Build
```

### Launch Development Window

```bash
./scripts/code.bat
```

Or on macOS/Linux:
```bash
./scripts/code.sh
```

### Reload in Dev Window

Press **`Ctrl+R`** (or Cmd+R on macOS) to reload the window and see changes.

## Project Structure

```
src/vs/workbench/contrib/void/
├── browser/                      # UI layer
│   ├── react/src2/               # React components
│   │   ├── chat-ui/              # Chat interface
│   │   ├── collaboration/        # Collaboration UI
│   │   ├── void-settings-tsx/    # Settings panel
│   │   └── void-onboarding/      # Onboarding flow
│   ├── sidebarActions.ts         # Command definitions
│   ├── sidebarPane.ts            # Sidebar container
│   ├── voidSettingsPane.ts       # Settings pane
│   └── *Service.ts               # Browser-side services
│
├── common/                       # Shared code
│   ├── voidSettingsTypes.ts      # Provider/model types
│   ├── modelCapabilities.ts      # Model capabilities
│   ├── chatThreadServiceTypes.ts # Chat message types
│   └── *Service.ts               # Service interfaces
│
├── electron-main/                # Main process
│   ├── llmMessage/               # LLM API calls
│   └── mcpService/               # MCP implementation
│
└── test/                         # Unit tests
```

## Key npm Scripts

### Development
- `npm run watch-clientd` - Watch TypeScript files
- `npm run watchreactd` - Watch React components
- `npm run watch-extensionsd` - Watch extensions

### Building
- `npm run compile` - Full build (once)
- `npm run buildreact` - Build React only
- `npm run clean` - Clear build artifacts

### Testing
- `npm run test-node` - Run Node tests
- `npm run test-browser` - Run browser tests
- `npm run eslint` - Lint code

### Other
- `./scripts/code.bat` - Launch dev window
- `npm run kill-watch-*` - Stop watchers

## Common Tasks

### Adding a New Service

1. Create interface in `common/myService.ts`:
```typescript
export const IMyService = createDecorator<IMyService>('myService');
export interface IMyService {
  doSomething(): void;
}
```

2. Implement in `browser/myService.ts` or `electron-main/myService.ts`:
```typescript
class MyService implements IMyService {
  doSomething() { }
}
registerSingleton(IMyService, MyService);
```

3. Use via dependency injection:
```typescript
constructor(@IMyService private myService: IMyService) { }
```

### Adding a React Component

1. Create file in `browser/react/src2/my-component/`:
```typescript
export const MyComponent: React.FC = () => {
  return <div>My Component</div>;
};
```

2. Build runs automatically (watchreactd)
3. Output goes to `browser/react/out/my-component/`
4. Import with `.js` extension:
```typescript
import { MyComponent } from './react/out/my-component/index.js';
```

## Debugging

### VS Code Debugging

VS Code has built-in debugging. Press `F5` or select "Debug" from the menu.

### Browser DevTools

In the dev window, press `Ctrl+Shift+I` to open DevTools.

### Console Logs

Check the "Output" panel in VS Code for logs from the extension host.

## Troubleshooting

**Issue: "Cannot find module" error**
- Run `npm install` again
- Check `.js` extensions in imports (required for ES modules)
- Rebuild: `npm run compile`

**Issue: Changes not appearing**
- Check if watchers are running
- Press `Ctrl+R` in dev window to reload
- Check "Output" panel for build errors

**Issue: Port already in use**
- Kill existing process: `lsof -i :8080` (macOS/Linux)
- Or use a different port in config

**Issue: TypeScript errors**
- Run `npm run eslint` to find issues
- Check tsconfig.json for strict settings

## Next Steps

- Read [Architecture Guide](./ARCHITECTURE.md)
- Explore [Chat Features](./CHAT.md)
- Set up [Collaboration](./COLLABORATION_QUICKSTART.md)


---

## Development Workflow

### Start Three Watchers (Separate Terminals)

**Terminal 1: Core TypeScript Compilation**
```bash
npm run watch-clientd
```
Watches: `src/` → Compiles to `out/vs/`
Triggered by: Any `.ts` file change

**Terminal 2: React UI Compilation**
```bash
npm run watchreactd
```
Watches: `src/vs/workbench/contrib/void/browser/react/` → Compiles to `out/`
Triggered by: Any JSX/JS change in React code

**Terminal 3: Extensions Compilation**
```bash
npm run watch-extensionsd
```
Watches: `extensions/` → Compiles to `out/extensions/`
Triggered by: Any extension `.ts` change

### Launch Development Environment

**Terminal 4: Run OctateCode**
```bash
./scripts/code.bat
```

Or use VS Code task:
- Press **Cmd+Shift+B** → Select "VS Code - Build"
- Automatically starts all 3 watchers + launches the app

---

## File Structure for Development

```
octatecode/
├── src/
│   └── vs/workbench/contrib/void/           ← MAIN DEVELOPMENT AREA
│       ├── browser/                         ← Browser-side code
│       │   ├── collaborationService.ts      ← P2P service
│       │   ├── fileSyncService.ts           ← Edit sync (OT)
│       │   ├── chatService.ts               ← Chat service
│       │   ├── cursorTrackingService.ts     ← Cursor widget
│       │   ├── react/                       ← React UI
│       │   │   └── src/void-onboarding/     ← Chat sidebar
│       │   └── edits/                       ← Diff visualization
│       ├── electron-main/                   ← Main process code
│       │   ├── collaborationHandler.ts      ← WebRTC signaling
│       │   ├── securityHandler.ts           ← Encryption
│       │   ├── llmMessage/                  ← LLM API calls
│       │   └── analytics/                   ← Metrics/monitoring
│       ├── common/                          ← Shared types
│       │   ├── collaborationServiceTypes.ts
│       │   ├── fileSyncServiceTypes.ts
│       │   ├── chatThreadServiceTypes.ts
│       │   └── ...ServiceTypes.ts
│       └── test/                            ← Unit tests
├── test/                                    ← Integration tests
├── out/                                     ← COMPILED OUTPUT (don't edit)
├── extensions/                              ← Language extensions
├── build/                                   ← Build scripts
├── gulpfile.js                              ← Build configuration
└── package.json
```

---

## Key Development Areas

### Adding a New Service

**Step 1: Define Types** (`common/`)
```typescript
// common/myServiceTypes.ts
import { createDecorator } from '../../../../base/common/instantiation.js';

export const IMyService = createDecorator<IMyService>('myService');

export interface IMyService {
  doSomething(): void;
  getStatus(): string;
}
```

**Step 2: Implement Browser Service** (`browser/`)
```typescript
// browser/myService.ts
import { IMyService } from '../common/myServiceTypes.js';
import { registerServiceProvider } from '../../../../base/browser/service.js';

class MyService implements IMyService {
  constructor() {}

  doSomething() {
    console.log('Doing something...');
  }

  getStatus() {
    return 'active';
  }
}

registerServiceProvider(IMyService, MyService);
```

**Step 3: Register in Main Process** (if needed)
```typescript
// electron-main/myService.ts
import { IMyService } from '../common/myServiceTypes.js';
import { registerSingleton, InstantiationType } from '../../../../base/common/instantiation.js';

class MyMainService implements IMyService {
  // ... implementation
}

registerSingleton(IMyService, MyMainService, InstantiationType.Eager);
```

**Step 4: Use in Components**
```typescript
class MyComponent {
  constructor(@IMyService private myService: IMyService) {}

  ngOnInit() {
    this.myService.doSomething();
  }
}
```

---

### Adding a New File Type Service

OctateCode supports real-time collaboration on any file type. To add support:

**Step 1: Define File Operations**
```typescript
// browser/fileHandlers/myFileHandler.ts
export class MyFileHandler {
  supports(fileExtension: string): boolean {
    return fileExtension === '.myfile';
  }

  parse(content: string) {
    // Parse file into AST or data structure
  }

  serialize(data: any): string {
    // Convert back to file format
  }
}
```

**Step 2: Register Handler**
```typescript
// browser/fileRegistry.ts
import { MyFileHandler } from './fileHandlers/myFileHandler.js';

const registry = [
  new MyFileHandler(),
  // ... other handlers
];
```

---

### Debugging

**In Development Window:**
1. Press **F12** to open DevTools
2. **Console** tab: See logs
3. **Sources** tab: Set breakpoints, step through code
4. **Network** tab: See WebRTC messages

**Main Process:**
```bash
# Run with inspector
./scripts/code.bat --inspect
```

Then open `chrome://inspect` in Chrome.

**Hot Module Replacement:**
When you save a file:
1. Watchers recompile
2. Press **Cmd+R** in dev window to reload
3. Your changes appear instantly

---

## Testing

### Run All Tests

```bash
npm run test-node      # Node.js tests (unit tests)
npm run test-browser   # Browser tests (integration tests)
npm run test           # Both
```

### Run Specific Test File

```bash
npm run test-node -- test/unit/node/contrib/void/collaboration.test.ts
```

### Run Tests in Watch Mode

```bash
npm run test-node -- --watch
```

### Check Test Coverage

```bash
npm run test-node -- --coverage
```

### Add New Tests

**File:** `test/unit/node/contrib/void/myFeature.test.ts`

```typescript
import { describe, it, assert } from 'mocha';

describe('MyFeature', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    assert.strictEqual(result, 'expected');
  });
});
```

---

## Code Quality

### Linting

```bash
npm run eslint              # Check all files
npm run eslint -- --fix     # Auto-fix issues
```

### Type Checking

```bash
npm run tsc                 # TypeScript compiler
npm run tsc -- --noEmit     # Check only, don't emit
```

### Hygiene Check

```bash
npm run hygiene             # Check code style, imports, etc.
```

---

## Compilation Issues

### "Cannot find module 'X'"

**Solution:**
1. Check import path ends with `.js`:
   ```typescript
   ❌ import { X } from './file'
   ✅ import { X } from './file.js'
   ```

2. Clear build cache:
   ```bash
   npm run clean
   npm install
   npm run watch-clientd
   ```

### "Out of memory during compilation"

**Solution:**
```bash
# Increase Node memory limit
export NODE_OPTIONS=--max-old-space-size=8192
npm run compile
```

### "Port 8000 already in use"

**Solution:**
```bash
# Kill the process using port 8000
lsof -i :8000          # macOS/Linux
netstat -ano | find ":8000"  # Windows

# Or use different port
PORT=8001 npm run watch-clientd
```

---

## Making a Pull Request

1. **Create branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes**
   - Edit files in `src/vs/workbench/contrib/void/`
   - Add tests in `test/unit/node/contrib/void/`
   - Update documentation in `docs/`

3. **Commit**
   ```bash
   git add .
   git commit -m "Add my feature"
   ```

4. **Push**
   ```bash
   git push origin feature/my-feature
   ```

5. **Create PR on GitHub**
   - Link any related issues
   - Describe changes
   - Request reviewers

6. **Checks**
   - Tests pass ✅
   - Linting passes ✅
   - Documentation updated ✅
   - Code review approved ✅

---

## Common Commands Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run watch-clientd` | Watch core TypeScript |
| `npm run watchreactd` | Watch React UI |
| `npm run watch-extensionsd` | Watch extensions |
| `npm run test-node` | Run unit tests |
| `npm run eslint` | Check code style |
| `npm run compile` | Full compilation (one-time) |
| `npm run clean` | Clear build cache |
| `./scripts/code.bat` | Launch dev environment |

---

## Tips & Tricks

1. **Auto-reload on save**: Press Cmd+R after each watch completes
2. **Use console.log() for quick debugging**: Press F12 in dev window
3. **Test single file**: `npm run test-node -- src/file.ts`
4. **Check type errors before committing**: `npm run tsc -- --noEmit`
5. **Format code on save**: Enable ESLint auto-fix in VS Code

---

## Getting Help

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions and share ideas
- **Documentation:** Read [Architecture.md](./ARCHITECTURE.md)
- **Code Examples:** Check `test/` for patterns

---

**Happy coding! 🚀**
