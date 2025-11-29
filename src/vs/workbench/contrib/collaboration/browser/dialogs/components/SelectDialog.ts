/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BaseDialog, DialogButton, DialogOptions } from './BaseDialog.js';
import { mainWindow } from '../../../../../../base/browser/window.js';

export interface SelectDialogResult<T> {
	value: T;
}

export interface SelectOption<T> {
	label: string;
	value: T;
	description?: string;
}

/**
 * A generic selection dialog for choosing from multiple options
 */
export class SelectDialog<T> extends BaseDialog<SelectDialogResult<T>> {
	private selectedValue: T | null = null;
	private selectOptions: SelectOption<T>[];

	constructor(title: string, selectOptions: SelectOption<T>[]) {
		const dialogOptions: DialogOptions = {
			title: title,
			minWidth: '400px',
		};
		super(dialogOptions);
		this.selectOptions = selectOptions;
	}

	protected buildContent(): void {
		if (this.contentArea) {
			const doc = mainWindow.document;
			const selectContainer = doc.createElement('div');
			selectContainer.style.marginBottom = '15px';

			for (const option of this.selectOptions) {
				const optionEl = doc.createElement('div');
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.marginBottom = '10px';
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.padding = '10px';
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.borderRadius = '4px';
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.cursor = 'pointer';
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.border = '1px solid var(--vscode-input-border, #555)';
				(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.transition = 'all 0.2s ease';

				const label = doc.createElement('div');
				label.textContent = option.label;
				(label as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.fontWeight = '500';
				(label as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.marginBottom = option.description ? '5px' : '0';
				optionEl.appendChild(label);

				if (option.description) {
					const desc = doc.createElement('div');
					desc.textContent = option.description;
					(desc as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.fontSize = '12px';
					(desc as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.color = 'var(--vscode-descriptionForeground, #999)';
					optionEl.appendChild(desc);
				}

				optionEl.onmouseover = () => {
					(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.backgroundColor = 'var(--vscode-list-hoverBackground, #2d2d30)';
				};

				optionEl.onmouseout = () => {
					(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
				};

				optionEl.onclick = () => {
					this.selectedValue = option.value;
					// Highlight selected option
					doc.querySelectorAll('[data-option]').forEach((el) => {
						(el as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = 'var(--vscode-input-border, #555)';
						(el as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.backgroundColor = 'var(--vscode-input-background, #0f0f0f)';
					});
					(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = 'var(--vscode-button-background, #1b5bfa)';
					(optionEl as unknown as HTMLElement & { style: CSSStyleDeclaration }).style.backgroundColor = 'var(--vscode-list-activeSelectionBackground, #094771)';
				};

				optionEl.setAttribute('data-option', 'true');
				selectContainer.appendChild(optionEl);
			}

			this.contentArea.appendChild(selectContainer);
		}
	}

	protected getButtons(onConfirm: () => void, onCancel: () => void): DialogButton[] {
		return [
			{
				label: 'Select',
				onClick: () => {
					if (this.selectedValue !== null) {
						onConfirm();
					} else {
						alert('Please select an option');
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

	protected getValue(): SelectDialogResult<T> | null {
		if (this.selectedValue !== null) {
			return { value: this.selectedValue };
		}
		return null;
	}

	protected focusFirstInput(): void {
		// No input fields in select dialog
	}
}

/**
 * Show a selection dialog
 */
export async function showSelectDialog<T>(title: string, options: SelectOption<T>[]): Promise<T | null> {
	const dialog = new SelectDialog(title, options);
	const result = await dialog.show();
	return result ? result.value : null;
}
