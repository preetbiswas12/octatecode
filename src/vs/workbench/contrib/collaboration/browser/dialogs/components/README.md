/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * # Collaboration Dialog Component Library
 *
 * This directory contains a reusable component library for creating dialogs in the
 * collaboration feature. All components extend the `BaseDialog` class and inherit
 * consistent styling, behavior, and accessibility features.
 *
 * ## Components
 *
 * ### BaseDialog
 * Abstract base class for all dialog components. Provides:
 * - Consistent styling aligned with VS Code themes
 * - Overlay management
 * - DOM lifecycle handling
 * - Helper methods for common UI elements
 *
 * **Usage:**
 * ```typescript
 * class MyDialog extends BaseDialog<MyResult> {
 *   protected buildContent(): void { ... }
 *   protected getButtons(onConfirm, onCancel): DialogButton[] { ... }
 *   protected getValue(): MyResult { ... }
 * }
 * ```
 *
 * ### CreateRoomDialog
 * Dialog for creating a new collaboration room.
 *
 * **Usage:**
 * ```typescript
 * import { showCreateRoomDialog } from './components/index.js';
 *
 * const result = await showCreateRoomDialog();
 * if (result) {
 *   console.log(result.roomName, result.userName);
 * }
 * ```
 *
 * ### JoinRoomDialog
 * Dialog for joining an existing collaboration room.
 *
 * **Usage:**
 * ```typescript
 * import { showJoinRoomDialog } from './components/index.js';
 *
 * const result = await showJoinRoomDialog();
 * if (result) {
 *   console.log(result.sessionId, result.userName);
 * }
 * ```
 *
 * ### ConfirmDialog
 * Generic confirmation dialog with customizable title and message.
 *
 * **Usage:**
 * ```typescript
 * import { showConfirmDialog } from './components/index.js';
 *
 * const confirmed = await showConfirmDialog('Delete Room', 'Are you sure?');
 * ```
 *
 * ### InputDialog
 * Generic input dialog for collecting user text input.
 *
 * **Usage:**
 * ```typescript
 * import { showInputDialog } from './components/index.js';
 *
 * const value = await showInputDialog('Room Topic', 'Enter topic:', 'Default value');
 * ```
 *
 * ### SelectDialog
 * Generic selection dialog for choosing from multiple options.
 *
 * **Usage:**
 * ```typescript
 * import { showSelectDialog, SelectOption } from './components/index.js';
 *
 * const options: SelectOption<string>[] = [
 *   { label: 'Option 1', value: 'opt1', description: 'First option' },
 *   { label: 'Option 2', value: 'opt2', description: 'Second option' },
 * ];
 * const selected = await showSelectDialog('Choose', options);
 * ```
 *
 * ## Styling
 *
 * All components use VS Code theme variables for styling:
 * - `--vscode-editor-background`
 * - `--vscode-editor-foreground`
 * - `--vscode-input-background`
 * - `--vscode-button-background`
 * - etc.
 *
 * Fallback colors are provided for when variables are not available.
 *
 * ## Adding New Dialog Components
 *
 * 1. Create a new class extending `BaseDialog<T>`
 * 2. Implement required abstract methods:
 *    - `buildContent()`: Build the dialog UI
 *    - `getButtons()`: Define action buttons
 *    - `getValue()`: Extract and return form values
 * 3. Export a convenience function for easy usage
 * 4. Add to the barrel export in `index.ts`
 * 5. Update this README
 *
 * ## Features
 *
 * - **Reusable**: All dialog logic is in the base class
 * - **Themeable**: Uses VS Code theme variables
 * - **Accessible**: Keyboard navigation and focus management
 * - **Type-safe**: Full TypeScript support
 * - **Extensible**: Easy to add custom dialogs
 * - **Validation**: Built-in validation support
 *
 * ## Best Practices
 *
 * 1. Always validate user input before closing
 * 2. Use semantic HTML and proper labeling
 * 3. Provide meaningful error messages
 * 4. Handle cancellation gracefully (return null)
 * 5. Focus appropriate elements on open
 * 6. Use the barrel export (`index.ts`) for imports
 */

export {};
