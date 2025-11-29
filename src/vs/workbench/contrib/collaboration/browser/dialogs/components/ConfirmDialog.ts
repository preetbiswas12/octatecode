/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseDialog, DialogButton, DialogOptions } from './BaseDialog.js';
import { mainWindow } from '../../../../../../base/browser/window.js';

export interface ConfirmDialogResult {
	confirmed: boolean;
}

export interface ConfirmDialogOptions extends DialogOptions {
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
}

/**
 * Simple confirmation dialog
 */
export class ConfirmDialog extends BaseDialog<ConfirmDialogResult> {
	private confirmed = false;

	constructor(private confirmOptions: ConfirmDialogOptions) {
		super(confirmOptions);
	}

	protected buildContent(): void {
		if (this.contentArea) {
			const doc = mainWindow.document;

			const message = doc.createElement('p');
			message.textContent = this.confirmOptions.message;
			message.style.margin = '0';
			message.style.fontSize = '14px';
			message.style.lineHeight = '1.5';
			this.contentArea.appendChild(message);
		}
	}

	protected getButtons(onConfirm: () => void, onCancel: () => void): DialogButton[] {
		return [
			{
				label: this.confirmOptions.confirmLabel || 'OK',
				onClick: () => {
					this.confirmed = true;
					onConfirm();
				},
				isPrimary: true,
			},
			{
				label: this.confirmOptions.cancelLabel || 'Cancel',
				onClick: onCancel,
				isSecondary: true,
			},
		];
	}

	protected getValue(): ConfirmDialogResult | null {
		return { confirmed: this.confirmed };
	}

	protected focusFirstInput(): void {
		// No input fields
	}
}

/**
 * Show a confirmation dialog
 */
export async function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
	const dialog = new ConfirmDialog(options);
	const result = await dialog.show();
	return result ? result.confirmed : false;
}
