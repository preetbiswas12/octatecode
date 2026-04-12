/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { mountVoidOnboarding } from './react/out/void-onboarding/index.js'
import { h, getActiveWindow } from '../../../../base/browser/dom.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';

// Onboarding contribution that mounts the component at startup
export class OnboardingContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.voidOnboarding';

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();
		this.initialize();
	}

	private initialize(): void {
		// Determine whether we should mount the onboarding UI.
		// Mount onboarding only when the user has not completed onboarding and
		// there are no previous logs found on the machine (fresh install).
		const targetWindow = getActiveWindow();
		const workbench = targetWindow.document.querySelector('.monaco-workbench');

		if (!workbench) {
			return;
		}

		this.instantiationService.invokeFunction(async (accessor: ServicesAccessor) => {
			try {
				const fileService = accessor.get(IFileService);
				const environmentService = accessor.get(IEnvironmentService);
				const storageService = accessor.get(IStorageService);
				const configurationService = accessor.get(IConfigurationService);
				const voidSettingsService = accessor.get(IVoidSettingsService);

				// Check if this is a fresh install (no previous logs)
				let previousLogsExist = false;
				try {
					const stat = await fileService.resolve(environmentService.logsHome);
					if (stat && Array.isArray((stat as any).children) && (stat as any).children.length > 0) {
						previousLogsExist = true;
					}
				} catch (e) {
					// ignore errors resolving logs folder - treat as no previous logs
				}

				// Check if onboarding is already complete
				let isOnboardingComplete = false;
				try {
					const globalSettings = voidSettingsService?.state?.globalSettings;
					isOnboardingComplete = !!globalSettings?.isOnboardingComplete;
				} catch (e) {
					isOnboardingComplete = false;
				}

				// Show onboarding only for fresh installs (no previous logs) where onboarding hasn't been completed
				if (!isOnboardingComplete && !previousLogsExist) {
					const onboardingContainer = h('div.void-onboarding-container').root;
					workbench.appendChild(onboardingContainer);

					// Pass accessor directly - it's valid within this invokeFunction context
					// and will be used synchronously by the React component
					const result = mountVoidOnboarding(onboardingContainer, accessor);
					if (result && typeof result.dispose === 'function') {
						this._register(toDisposable(result.dispose));
					}
					// cleanup DOM on dispose
					this._register(toDisposable(() => {
						if (onboardingContainer.parentElement) {
							onboardingContainer.parentElement.removeChild(onboardingContainer);
						}
					}));
				} else {
					// Not a fresh install - ensure windows restore behavior
					try {
						await configurationService.updateValue('window.restoreWindows', 'all');
						storageService.store('void-seen-previous-install', 'true', StorageScope.APPLICATION, StorageTarget.MACHINE);
					} catch (e) {
						// ignore failures
					}
				}
			} catch (error) {
				// Don't crash - allow workbench to continue
			}
		});
	}
}

// Register the contribution to be initialized during the Eventually phase
// This ensures all services are registered before we try to use them
registerWorkbenchContribution2(OnboardingContribution.ID, OnboardingContribution, WorkbenchPhase.Eventually);
