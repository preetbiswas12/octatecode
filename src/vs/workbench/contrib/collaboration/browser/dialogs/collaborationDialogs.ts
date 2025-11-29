/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mainWindow } from '../../../../../base/browser/window.js';

/**
 * Dialog for creating a new collaboration room
 */
export function showCreateRoomDialog(): Promise<{ roomName: string; userName: string } | null> {
	return new Promise((resolve) => {
		// Create overlay
		const overlay = document.createElement('div');
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.right = '0';
		overlay.style.bottom = '0';
		overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
		overlay.style.display = 'flex';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';
		overlay.style.zIndex = '10000';

		// Create dialog
		const dialog = document.createElement('div');
		dialog.style.backgroundColor = 'var(--vscode-editor-background, #090e1a)';
		dialog.style.color = 'var(--vscode-editor-foreground, #d4d4d4)';
		dialog.style.borderRadius = '4px';
		dialog.style.padding = '20px';
		dialog.style.minWidth = '400px';
		dialog.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';

		// Title
		const title = document.createElement('h2');
		title.textContent = 'Create Collaboration Room';
		title.style.marginTop = '0';
		title.style.marginBottom = '15px';
		dialog.appendChild(title);

		// Room name input
		const roomNameLabel = document.createElement('label');
		roomNameLabel.textContent = 'Room Name:';
		roomNameLabel.style.display = 'block';
		roomNameLabel.style.marginBottom = '5px';
		roomNameLabel.style.fontSize = '14px';
		dialog.appendChild(roomNameLabel);

		const roomNameInput = document.createElement('input');
		roomNameInput.type = 'text';
		roomNameInput.placeholder = 'Enter room name';
		roomNameInput.style.width = '100%';
		roomNameInput.style.padding = '8px';
		roomNameInput.style.marginBottom = '15px';
		roomNameInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
		roomNameInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
		roomNameInput.style.border = '1px solid var(--vscode-input-border, #555)';
		roomNameInput.style.borderRadius = '4px';
		roomNameInput.style.boxSizing = 'border-box';
		dialog.appendChild(roomNameInput);

		// User name input
		const userNameLabel = document.createElement('label');
		userNameLabel.textContent = 'Your Name:';
		userNameLabel.style.display = 'block';
		userNameLabel.style.marginBottom = '5px';
		userNameLabel.style.fontSize = '14px';
		dialog.appendChild(userNameLabel);

		const userNameInput = document.createElement('input');
		userNameInput.type = 'text';
		userNameInput.placeholder = 'Enter your name';
		userNameInput.style.width = '100%';
		userNameInput.style.padding = '8px';
		userNameInput.style.marginBottom = '20px';
		userNameInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
		userNameInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
		userNameInput.style.border = '1px solid var(--vscode-input-border, #555)';
		userNameInput.style.borderRadius = '4px';
		userNameInput.style.boxSizing = 'border-box';
		dialog.appendChild(userNameInput);

		// Buttons
		const buttonContainer = document.createElement('div');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.justifyContent = 'flex-end';

		const createBtn = document.createElement('button');
		createBtn.textContent = 'Create';
		createBtn.style.padding = '8px 16px';
		createBtn.style.backgroundColor = 'var(--vscode-button-background, #1b5bfa)';
		createBtn.style.color = 'var(--vscode-button-foreground, #fff)';
		createBtn.style.border = 'none';
		createBtn.style.borderRadius = '4px';
		createBtn.style.cursor = 'pointer';
		createBtn.onclick = () => {
			const roomName = roomNameInput.value.trim();
			const userName = userNameInput.value.trim();

			if (roomName && userName) {
				mainWindow.document.body.removeChild(overlay);
				resolve({ roomName, userName });
			}
		};
		buttonContainer.appendChild(createBtn);

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.style.padding = '8px 16px';
		cancelBtn.style.backgroundColor = 'var(--vscode-button-secondaryBackground, #0f0f0f)';
		cancelBtn.style.color = 'var(--vscode-button-secondaryForeground, #d4d4d4)';
		cancelBtn.style.border = 'none';
		cancelBtn.style.borderRadius = '4px';
		cancelBtn.style.cursor = 'pointer';
		cancelBtn.onclick = () => {
			mainWindow.document.body.removeChild(overlay);
			resolve(null);
		};
		buttonContainer.appendChild(cancelBtn);

		dialog.appendChild(buttonContainer);
		overlay.appendChild(dialog);
		mainWindow.document.body.appendChild(overlay);

		// Focus on room name input
		roomNameInput.focus();
	});
}

/**
 * Dialog for joining an existing collaboration room
 */
export function showJoinRoomDialog(): Promise<{ sessionId: string; userName: string } | null> {
	return new Promise((resolve) => {
		// Create overlay
		const overlay = document.createElement('div');
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.right = '0';
		overlay.style.bottom = '0';
		overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
		overlay.style.display = 'flex';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';
		overlay.style.zIndex = '10000';

		// Create dialog
		const dialog = document.createElement('div');
		dialog.style.backgroundColor = 'var(--vscode-editor-background, #090e1a)';
		dialog.style.color = 'var(--vscode-editor-foreground, #d4d4d4)';
		dialog.style.borderRadius = '4px';
		dialog.style.padding = '20px';
		dialog.style.minWidth = '400px';
		dialog.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';

		// Title
		const title = document.createElement('h2');
		title.textContent = 'Join Collaboration Room';
		title.style.marginTop = '0';
		title.style.marginBottom = '15px';
		dialog.appendChild(title);

		// Session ID input
		const sessionIdLabel = document.createElement('label');
		sessionIdLabel.textContent = 'Room ID:';
		sessionIdLabel.style.display = 'block';
		sessionIdLabel.style.marginBottom = '5px';
		sessionIdLabel.style.fontSize = '14px';
		dialog.appendChild(sessionIdLabel);

		const sessionIdInput = document.createElement('input');
		sessionIdInput.type = 'text';
		sessionIdInput.placeholder = 'Enter room ID';
		sessionIdInput.style.width = '100%';
		sessionIdInput.style.padding = '8px';
		sessionIdInput.style.marginBottom = '15px';
		sessionIdInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
		sessionIdInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
		sessionIdInput.style.border = '1px solid var(--vscode-input-border, #555)';
		sessionIdInput.style.borderRadius = '4px';
		sessionIdInput.style.boxSizing = 'border-box';
		dialog.appendChild(sessionIdInput);

		// User name input
		const userNameLabel = document.createElement('label');
		userNameLabel.textContent = 'Your Name:';
		userNameLabel.style.display = 'block';
		userNameLabel.style.marginBottom = '5px';
		userNameLabel.style.fontSize = '14px';
		dialog.appendChild(userNameLabel);

		const userNameInput = document.createElement('input');
		userNameInput.type = 'text';
		userNameInput.placeholder = 'Enter your name';
		userNameInput.style.width = '100%';
		userNameInput.style.padding = '8px';
		userNameInput.style.marginBottom = '20px';
		userNameInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
		userNameInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
		userNameInput.style.border = '1px solid var(--vscode-input-border, #555)';
		userNameInput.style.borderRadius = '4px';
		userNameInput.style.boxSizing = 'border-box';
		dialog.appendChild(userNameInput);

		// Buttons
		const buttonContainer = document.createElement('div');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.justifyContent = 'flex-end';

		const joinBtn = document.createElement('button');
		joinBtn.textContent = 'Join';
		joinBtn.style.padding = '8px 16px';
		joinBtn.style.backgroundColor = 'var(--vscode-button-background, #1b5bfa)';
		joinBtn.style.color = 'var(--vscode-button-foreground, #fff)';
		joinBtn.style.border = 'none';
		joinBtn.style.borderRadius = '4px';
		joinBtn.style.cursor = 'pointer';
		joinBtn.onclick = () => {
			const sessionId = sessionIdInput.value.trim();
			const userName = userNameInput.value.trim();

			if (sessionId && userName) {
				mainWindow.document.body.removeChild(overlay);
				resolve({ sessionId, userName });
			}
		};
		buttonContainer.appendChild(joinBtn);

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.style.padding = '8px 16px';
		cancelBtn.style.backgroundColor = 'var(--vscode-button-secondaryBackground, #0f0f0f)';
		cancelBtn.style.color = 'var(--vscode-button-secondaryForeground, #d4d4d4)';
		cancelBtn.style.border = 'none';
		cancelBtn.style.borderRadius = '4px';
		cancelBtn.style.cursor = 'pointer';
		cancelBtn.onclick = () => {
			mainWindow.document.body.removeChild(overlay);
			resolve(null);
		};
		buttonContainer.appendChild(cancelBtn);

		dialog.appendChild(buttonContainer);
		overlay.appendChild(dialog);
		mainWindow.document.body.appendChild(overlay);

		// Focus on session ID input
		sessionIdInput.focus();
	});
}
