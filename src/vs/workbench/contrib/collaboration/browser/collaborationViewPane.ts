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
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { localize } from '../../../../nls.js';
import { collaborationState } from './collaborationState.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { mountCollaborationPanel } from '../../void/browser/react/out/collaboration/index.js';

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

		container.style.padding = '0';
		container.style.overflow = 'auto';
		container.style.userSelect = 'text';

		// Mount React CollaborationPanel
		this.instantiationService.invokeFunction(accessor => {
			const disposeFn: (() => void) | undefined = mountCollaborationPanel(container, accessor)?.dispose;
			this._register(toDisposable(() => disposeFn?.()));
		});
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
