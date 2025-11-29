/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { localize } from '../../../../nls.js';
import { collaborationState } from './collaborationState.js';

export class CollaborationViewPane extends ViewPane {
	private statusText: HTMLElement | null = null;
	private detailsSection: HTMLElement | null = null;
	private endBtn: HTMLElement | null = null;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICommandService private readonly commandService: ICommandService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

		// Subscribe to collaboration state changes
		collaborationState.onSessionStarted(() => this._updateStatus());
		collaborationState.onSessionEnded(() => this._updateStatus());
		collaborationState.onSessionUpdated(() => this._updateStatus());
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const content = document.createElement('div');
		content.style.padding = '20px';
		content.style.color = 'var(--vscode-foreground, #d4d4d4)';

		// Title
		const title = document.createElement('h2');
		title.textContent = localize('collaborationFeature', 'Collaboration');
		title.style.marginTop = '0';
		title.style.marginBottom = '15px';
		title.style.color = 'var(--vscode-foreground, #d4d4d4)';
		content.appendChild(title);

		// Description
		const description = document.createElement('p');
		description.textContent = localize('collaborationDescription', 'Real-time collaborative editing with other team members. Create a room to share your code or join an existing room.');
		description.style.marginBottom = '20px';
		description.style.fontSize = '13px';
		description.style.color = 'var(--vscode-descriptionForeground, #999999)';
		content.appendChild(description);

		// Buttons container
		const buttonsContainer = document.createElement('div');
		buttonsContainer.style.display = 'flex';
		buttonsContainer.style.flexDirection = 'column';
		buttonsContainer.style.gap = '10px';

		// Start button
		const startBtn = document.createElement('button');
		startBtn.textContent = localize('startCollaborationBtn', 'Start Collaboration');
		startBtn.style.padding = '10px 15px';
		startBtn.style.backgroundColor = 'var(--vscode-button-background, #011929)';
		startBtn.style.color = 'var(--vscode-button-foreground, #ffffff)';
		startBtn.style.border = 'none';
		startBtn.style.borderRadius = '4px';
		startBtn.style.cursor = 'pointer';
		startBtn.style.fontSize = '14px';
		startBtn.style.fontWeight = '500';
		startBtn.onclick = () => {
			this.commandService.executeCommand('collaboration.startAsHost');
		};
		buttonsContainer.appendChild(startBtn);

		// Join button
		const joinBtn = document.createElement('button');
		joinBtn.textContent = localize('joinCollaborationBtn', 'Join Collaboration');
		joinBtn.style.padding = '10px 15px';
		joinBtn.style.backgroundColor = 'var(--vscode-button-background, #011929)';
		joinBtn.style.color = 'var(--vscode-button-foreground, #ffffff)';
		joinBtn.style.border = 'none';
		joinBtn.style.borderRadius = '4px';
		joinBtn.style.cursor = 'pointer';
		joinBtn.style.fontSize = '14px';
		joinBtn.style.fontWeight = '500';
		joinBtn.onclick = () => {
			this.commandService.executeCommand('collaboration.joinAsGuest');
		};
		buttonsContainer.appendChild(joinBtn);

		// Status section
		const statusSection = document.createElement('div');
		statusSection.style.marginTop = '30px';
		statusSection.style.padding = '15px';
		statusSection.style.backgroundColor = 'var(--vscode-editor-background, #0d0c0c)';
		statusSection.style.borderRadius = '4px';
		statusSection.style.borderLeft = '3px solid var(--vscode-focusBorder, #034aff)';

		const statusTitle = document.createElement('h3');
		statusTitle.textContent = localize('collaborationStatus', 'Status');
		statusTitle.style.margin = '0 0 10px 0';
		statusTitle.style.fontSize = '14px';
		statusTitle.style.fontWeight = 'bold';
		statusSection.appendChild(statusTitle);

		this.statusText = document.createElement('p');
		this.statusText.style.margin = '0';
		this.statusText.style.fontSize = '13px';
		this.statusText.style.color = 'var(--vscode-descriptionForeground, #999999)';
		statusSection.appendChild(this.statusText);

		// Details section (hidden by default)
		this.detailsSection = document.createElement('div');
		this.detailsSection.style.marginTop = '15px';
		this.detailsSection.style.padding = '10px';
		this.detailsSection.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
		this.detailsSection.style.borderRadius = '3px';
		this.detailsSection.style.fontSize = '12px';
		this.detailsSection.style.color = 'var(--vscode-descriptionForeground, #999999)';
		this.detailsSection.style.display = 'none';
		this.detailsSection.style.whiteSpace = 'pre-wrap';
		this.detailsSection.style.fontFamily = 'monospace';
		statusSection.appendChild(this.detailsSection);

		// End session button (hidden by default)
		this.endBtn = document.createElement('button');
		this.endBtn.textContent = localize('endCollaborationBtn', 'End Session');
		this.endBtn.style.marginTop = '15px';
		this.endBtn.style.padding = '8px 12px';
		this.endBtn.style.backgroundColor = 'var(--vscode-button-secondaryBackground, #464646)';
		this.endBtn.style.color = 'var(--vscode-button-foreground, #ffffff)';
		this.endBtn.style.border = 'none';
		this.endBtn.style.borderRadius = '4px';
		this.endBtn.style.cursor = 'pointer';
		this.endBtn.style.fontSize = '12px';
		this.endBtn.style.display = 'none';
		this.endBtn.onclick = () => {
			this.commandService.executeCommand('collaboration.end');
		};
		statusSection.appendChild(this.endBtn);

		content.appendChild(buttonsContainer);
		content.appendChild(statusSection);

		container.appendChild(content);

		// Initial status update
		this._updateStatus();
	}

	private _updateStatus(): void {
		if (!this.statusText) {
			return;
		}

		const session = collaborationState.getActiveSession();
		if (session) {
			this.statusText.textContent = collaborationState.getStatusText();
			if (this.detailsSection) {
				this.detailsSection.textContent = collaborationState.getSessionDetails();
				this.detailsSection.style.display = 'block';
			}
			if (this.endBtn) {
				this.endBtn.style.display = 'block';
			}
		} else {
			this.statusText.textContent = localize('collaborationNotActive', 'No active collaboration session');
			if (this.detailsSection) {
				this.detailsSection.style.display = 'none';
			}
			if (this.endBtn) {
				this.endBtn.style.display = 'none';
			}
		}
	}
}
