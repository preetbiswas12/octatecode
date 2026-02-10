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
			const fileService = accessor.get(IFileService);
			const environmentService = accessor.get(IEnvironmentService);
			const storageService = accessor.get(IStorageService);
			const configurationService = accessor.get(IConfigurationService);
			const voidSettingsService = accessor.get(IVoidSettingsService);

			let previousLogsExist = false;
			try {
				const stat = await fileService.resolve(environmentService.logsHome);
				if (stat && Array.isArray((stat as any).children) && (stat as any).children.length > 0) {
					previousLogsExist = true;
				}
			} catch (e) {
				// ignore errors resolving logs folder - treat as no previous logs
			}

			const isOnboardingComplete = !!voidSettingsService.state.globalSettings.isOnboardingComplete;
			// Check if user explicitly requested to show onboarding again
			const forceShowOnboarding = storageService.get('void-force-show-onboarding', StorageScope.APPLICATION) === 'true';

			console.log('[Void Onboarding] Debug:', { isOnboardingComplete, previousLogsExist, forceShowOnboarding, logsPath: environmentService.logsHome.fsPath });

			if ((!isOnboardingComplete && !previousLogsExist) || forceShowOnboarding) {
				// Fresh install / first run, OR user explicitly reset onboarding: mount onboarding overlay
				console.log('[Void Onboarding] Mounting onboarding...');
				// Clear the force flag after showing onboarding once
				if (forceShowOnboarding) {
					storageService.remove('void-force-show-onboarding', StorageScope.APPLICATION);
				}
				const onboardingContainer = h('div.void-onboarding-container').root;
				workbench.appendChild(onboardingContainer);
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
				// Not a fresh install or onboarding already complete. Ensure windows restore behavior
				// so users return to where they left off.
				try {
					// Set a sensible default to restore previous windows/folders
					await configurationService.updateValue('window.restoreWindows', 'all');
					// Record that we've seen an existing installation so we don't prompt again
					storageService.store('void-seen-previous-install', 'true', StorageScope.APPLICATION, StorageTarget.MACHINE);
				} catch (e) {
					// ignore failures to update configuration
				}
			}
		});
	}
}

// Register the contribution to be initialized during the AfterRestored phase
registerWorkbenchContribution2(OnboardingContribution.ID, OnboardingContribution, WorkbenchPhase.AfterRestored);
