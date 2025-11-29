/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseDialog, DialogButton, DialogOptions } from './BaseDialog.js';
import { mainWindow } from '../../../../../../base/browser/window.js';

export interface JoinRoomDialogResult {
	roomId: string;
	userName: string;
}

/**
 * Dialog for joining an existing collaboration room
 */
export class JoinRoomDialog extends BaseDialog<JoinRoomDialogResult> {
	private roomIdInput: HTMLInputElement | null = null;
	private userNameInput: HTMLInputElement | null = null;

	constructor() {
		const dialogOptions: DialogOptions = {
			title: 'Join Collaboration Room',
			minWidth: '400px',
		};
		super(dialogOptions);
	}

	protected buildContent(): void {
		if (this.contentArea) {
			const doc = mainWindow.document;

			// Room ID input
			const roomIdLabel = doc.createElement('label');
			roomIdLabel.textContent = 'Room ID:';
			roomIdLabel.style.display = 'block';
			roomIdLabel.style.marginBottom = '5px';
			roomIdLabel.style.fontSize = '14px';
			roomIdLabel.style.fontWeight = '500';
			this.contentArea.appendChild(roomIdLabel);

			this.roomIdInput = doc.createElement('input');
			this.roomIdInput.type = 'text';
			this.roomIdInput.placeholder = 'Enter room ID to join';
			this.roomIdInput.style.width = '100%';
			this.roomIdInput.style.padding = '8px';
			this.roomIdInput.style.marginBottom = '15px';
			this.roomIdInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
			this.roomIdInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
			this.roomIdInput.style.border = '1px solid var(--vscode-input-border, #555)';
			this.roomIdInput.style.borderRadius = '4px';
			this.roomIdInput.style.boxSizing = 'border-box';
			this.roomIdInput.style.fontSize = '14px';
			this.contentArea.appendChild(this.roomIdInput);

			// User name input
			const userNameLabel = doc.createElement('label');
			userNameLabel.textContent = 'Your Name:';
			userNameLabel.style.display = 'block';
			userNameLabel.style.marginBottom = '5px';
			userNameLabel.style.fontSize = '14px';
			userNameLabel.style.fontWeight = '500';
			this.contentArea.appendChild(userNameLabel);

			this.userNameInput = doc.createElement('input');
			this.userNameInput.type = 'text';
			this.userNameInput.placeholder = 'Enter your name';
			this.userNameInput.style.width = '100%';
			this.userNameInput.style.padding = '8px';
			this.userNameInput.style.marginBottom = '0';
			this.userNameInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
			this.userNameInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
			this.userNameInput.style.border = '1px solid var(--vscode-input-border, #555)';
			this.userNameInput.style.borderRadius = '4px';
			this.userNameInput.style.boxSizing = 'border-box';
			this.userNameInput.style.fontSize = '14px';
			this.contentArea.appendChild(this.userNameInput);
		}
	}

	protected getButtons(onConfirm: () => void, onCancel: () => void): DialogButton[] {
		return [
			{
				label: 'Join',
				onClick: () => {
					if (this.roomIdInput && this.roomIdInput.value.trim()) {
						onConfirm();
					} else {
						alert('Please enter a room ID');
					}
				},
				isPrimary: true,
			},
			{
				label: 'Cancel',
				onClick: onCancel,
				isSecondary: true,
			},
		];
	}

	protected getValue(): JoinRoomDialogResult | null {
		if (this.roomIdInput && this.userNameInput) {
			const roomId = this.roomIdInput.value.trim();
			const userName = this.userNameInput.value.trim();
			if (roomId && userName) {
				return { roomId, userName };
			}
		}
		return null;
	}

	protected focusFirstInput(): void {
		if (this.roomIdInput) {
			this.roomIdInput.focus();
		}
	}
}

/**
 * Show a join room dialog
 */
export async function showJoinRoomDialog(): Promise<JoinRoomDialogResult | null> {
	const dialog = new JoinRoomDialog();
	return dialog.show();
}
