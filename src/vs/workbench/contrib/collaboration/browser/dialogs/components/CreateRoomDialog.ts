/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseDialog, DialogButton, DialogOptions } from './BaseDialog.js';
import { mainWindow } from '../../../../../../base/browser/window.js';

export interface CreateRoomDialogResult {
	roomName: string;
	userName: string;
}

/**
 * Dialog for creating a new collaboration room
 */
export class CreateRoomDialog extends BaseDialog<CreateRoomDialogResult> {
	private roomNameInput: HTMLInputElement | null = null;
	private userNameInput: HTMLInputElement | null = null;

	constructor() {
		const dialogOptions: DialogOptions = {
			title: 'Create Collaboration Room',
			minWidth: '400px',
		};
		super(dialogOptions);
	}

	protected buildContent(): void {
		if (this.contentArea) {
			const doc = mainWindow.document;

			// Room name input
			const roomNameLabel = doc.createElement('label');
			roomNameLabel.textContent = 'Room Name:';
			roomNameLabel.style.display = 'block';
			roomNameLabel.style.marginBottom = '5px';
			roomNameLabel.style.fontSize = '14px';
			roomNameLabel.style.fontWeight = '500';
			this.contentArea.appendChild(roomNameLabel);

			this.roomNameInput = doc.createElement('input');
			this.roomNameInput.type = 'text';
			this.roomNameInput.placeholder = 'Enter room name';
			this.roomNameInput.style.width = '100%';
			this.roomNameInput.style.padding = '8px';
			this.roomNameInput.style.marginBottom = '15px';
			this.roomNameInput.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
			this.roomNameInput.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
			this.roomNameInput.style.border = '1px solid var(--vscode-input-border, #555)';
			this.roomNameInput.style.borderRadius = '4px';
			this.roomNameInput.style.boxSizing = 'border-box';
			this.roomNameInput.style.fontSize = '14px';
			this.contentArea.appendChild(this.roomNameInput);

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
				label: 'Create',
				onClick: () => {
					if (this.roomNameInput && this.roomNameInput.value.trim()) {
						onConfirm();
					} else {
						alert('Please enter a room name');
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

	protected getValue(): CreateRoomDialogResult | null {
		if (this.roomNameInput && this.userNameInput) {
			const roomName = this.roomNameInput.value.trim();
			const userName = this.userNameInput.value.trim();
			if (roomName && userName) {
				return { roomName, userName };
			}
		}
		return null;
	}

	protected focusFirstInput(): void {
		if (this.roomNameInput) {
			this.roomNameInput.focus();
		}
	}
}

/**
 * Show a create room dialog
 */
export async function showCreateRoomDialog(): Promise<CreateRoomDialogResult | null> {
	const dialog = new CreateRoomDialog();
	return dialog.show();
}
