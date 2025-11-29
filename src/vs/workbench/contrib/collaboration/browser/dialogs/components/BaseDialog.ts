/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mainWindow } from '../../../../../../base/browser/window.js';

export interface DialogOptions {
	title: string;
	minWidth?: string;
	minHeight?: string;
}

export interface DialogButton {
	label: string;
	onClick: () => void;
	isPrimary?: boolean;
	isSecondary?: boolean;
}

/**
 * Base class for all dialog implementations
 */
export abstract class BaseDialog<T> {
	protected contentArea: HTMLElement | null = null;
	private overlay: HTMLElement | null = null;
	private dialog: HTMLElement | null = null;
	private result: T | null = null;

	constructor(protected options: DialogOptions) { }

	/**
	 * Build the dialog content
	 */
	protected abstract buildContent(): void;

	/**
	 * Get the dialog buttons
	 */
	protected abstract getButtons(onConfirm: () => void, onCancel: () => void): DialogButton[];

	/**
	 * Get the dialog result value
	 */
	protected abstract getValue(): T | null;

	/**
	 * Focus the first input field
	 */
	protected abstract focusFirstInput(): void;

	/**
	 * Show the dialog
	 */
	public show(): Promise<T | null> {
		return new Promise((resolve) => {
			try {
				const doc = mainWindow.document;

				// Create overlay
				this.overlay = doc.createElement('div');
				this.overlay.style.position = 'fixed';
				this.overlay.style.top = '0';
				this.overlay.style.left = '0';
				this.overlay.style.right = '0';
				this.overlay.style.bottom = '0';
				this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
				this.overlay.style.display = 'flex';
				this.overlay.style.alignItems = 'center';
				this.overlay.style.justifyContent = 'center';
				this.overlay.style.zIndex = '10000';

				// Create dialog
				this.dialog = doc.createElement('div');
				this.dialog.style.backgroundColor = 'var(--vscode-editor-background, #090e1a)';
				this.dialog.style.color = 'var(--vscode-editor-foreground, #d4d4d4)';
				this.dialog.style.borderRadius = '4px';
				this.dialog.style.padding = '20px';
				this.dialog.style.minWidth = this.options.minWidth || '400px';
				this.dialog.style.minHeight = this.options.minHeight || 'auto';
				this.dialog.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
				this.dialog.style.maxWidth = '90vw';
				this.dialog.style.maxHeight = '90vh';
				this.dialog.style.overflowY = 'auto';

				// Title
				const title = doc.createElement('h2');
				title.textContent = this.options.title;
				title.style.marginTop = '0';
				title.style.marginBottom = '15px';
				this.dialog.appendChild(title);

				// Content area
				this.contentArea = doc.createElement('div');
				this.contentArea.style.marginBottom = '20px';
				this.dialog.appendChild(this.contentArea);

				// Build custom content
				this.buildContent();

				// Buttons
				const buttonContainer = doc.createElement('div');
				buttonContainer.style.display = 'flex';
				buttonContainer.style.gap = '10px';
				buttonContainer.style.justifyContent = 'flex-end';

				const onConfirm = () => {
					this.result = this.getValue();
					this.close();
					resolve(this.result);
				};

				const onCancel = () => {
					this.result = null;
					this.close();
					resolve(null);
				};

				const buttons = this.getButtons(onConfirm, onCancel);
				for (const button of buttons) {
					const btn = doc.createElement('button');
					btn.textContent = button.label;
					btn.style.padding = '8px 16px';
					btn.style.cursor = 'pointer';
					btn.style.borderRadius = '4px';
					btn.style.border = 'none';
					btn.style.fontSize = '14px';

					if (button.isPrimary) {
						btn.style.backgroundColor = 'var(--vscode-button-background, #1b5bfa)';
						btn.style.color = 'var(--vscode-button-foreground, #fff)';
					} else if (button.isSecondary) {
						btn.style.backgroundColor = 'var(--vscode-button-secondaryBackground, #0f0f0f)';
						btn.style.color = 'var(--vscode-button-secondaryForeground, #cccccc)';
					}

					btn.onclick = button.onClick;
					buttonContainer.appendChild(btn);
				}

				this.dialog.appendChild(buttonContainer);
				this.overlay.appendChild(this.dialog);
				doc.body.appendChild(this.overlay);

				// Focus first input
				this.focusFirstInput();

				// Close on overlay click
				this.overlay.onclick = (e) => {
					if (e.target === this.overlay) {
						onCancel();
					}
				};

				// Close on Escape key
				const handleKeyDown = (e: KeyboardEvent) => {
					if (e.key === 'Escape') {
						doc.removeEventListener('keydown', handleKeyDown);
						onCancel();
					}
				};
				doc.addEventListener('keydown', handleKeyDown);
			} catch (error) {
				console.error('Error showing dialog:', error);
				resolve(null);
			}
		});
	}

	/**
	 * Close the dialog
	 */
	protected close(): void {
		try {
			if (this.overlay && this.overlay.parentElement) {
				this.overlay.parentElement.removeChild(this.overlay);
			}
		} catch (error) {
			console.error('Error closing dialog:', error);
		}
	}
}
