/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseDialog, DialogButton, DialogOptions } from './BaseDialog.js';
import { mainWindow } from '../../../../../../base/browser/window.js';

export interface InputDialogResult {
	value: string;
}

export interface InputDialogOptions extends DialogOptions {
	prompt: string;
	placeholder?: string;
	value?: string;
}

/**
 * Simple input dialog
 */
export class InputDialog extends BaseDialog<InputDialogResult> {
	private input: HTMLInputElement | null = null;

	constructor(private inputOptions: InputDialogOptions) {
		super(inputOptions);
	}

	protected buildContent(): void {
		if (this.contentArea) {
			const doc = mainWindow.document;

			// Prompt label
			const label = doc.createElement('label');
			label.textContent = this.inputOptions.prompt;
			label.style.display = 'block';
			label.style.marginBottom = '8px';
			label.style.fontSize = '14px';
			label.style.fontWeight = '500';
			this.contentArea.appendChild(label);

			// Input field
			this.input = doc.createElement('input');
			this.input.type = 'text';
			this.input.placeholder = this.inputOptions.placeholder || '';
			this.input.value = this.inputOptions.value || '';
			this.input.style.width = '100%';
			this.input.style.padding = '8px';
			this.input.style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
			this.input.style.color = 'var(--vscode-input-foreground, #d4d4d4)';
			this.input.style.border = '1px solid var(--vscode-input-border, #555)';
			this.input.style.borderRadius = '4px';
			this.input.style.boxSizing = 'border-box';
			this.input.style.fontSize = '14px';
			this.contentArea.appendChild(this.input);

			// Handle Enter key
			this.input.onkeydown = (e) => {
				if (e.key === 'Enter') {
					// Trigger confirm button
					const buttons = doc.querySelectorAll('button');
					for (const btn of buttons) {
						if (btn.textContent === 'OK') {
							btn.click();
							break;
						}
					}
				}
			};
		}
	}

	protected getButtons(onConfirm: () => void, onCancel: () => void): DialogButton[] {
		return [
			{
				label: 'OK',
				onClick: () => {
					if (this.input && this.input.value.trim()) {
						onConfirm();
					} else {
						alert('Please enter a value');
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

	protected getValue(): InputDialogResult | null {
		if (this.input) {
			const value = this.input.value.trim();
			if (value) {
				return { value };
			}
		}
		return null;
	}

	protected focusFirstInput(): void {
		if (this.input) {
			this.input.focus();
		}
	}
}

/**
 * Show an input dialog
 */
export async function showInputDialog(options: InputDialogOptions): Promise<string | null> {
	const dialog = new InputDialog(options);
	const result = await dialog.show();
	return result ? result.value : null;
}
