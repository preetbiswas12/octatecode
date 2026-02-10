/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';
import React from 'react';
import { CollaborationPanel } from './CollaborationPanel.js';

/**
 * Mount function for React CollaborationPanel
 * Used by collaborationViewPane.ts to render the panel in the left sidebar
 */
export const mountCollaborationPanel = (parent: HTMLElement, accessor: ServicesAccessor) => {
	// Use the pre-bundled React runtime that's already available in the window
	if (!(window as any).React || !(window as any).ReactDOM) {
		console.error('React or ReactDOM not available in window');
		parent.textContent = 'Error: React runtime not available';
		return toDisposable(() => { });
	}

	const root = document.createElement('div');
	root.style.width = '100%';
	root.style.height = '100%';
	parent.appendChild(root);

	try {
		const ReactDOM = (window as any).ReactDOM;
		const reactRoot = ReactDOM.createRoot ? ReactDOM.createRoot(root) : null;

		if (!reactRoot) {
			// Fallback for older React versions
			ReactDOM.render(React.createElement(CollaborationPanel), root);
		} else {
			reactRoot.render(React.createElement(CollaborationPanel));
		}
	} catch (error) {
		console.error('Failed to mount CollaborationPanel:', error);
		root.textContent = 'Failed to load collaboration panel: ' + (error as Error).message;
	}

	return toDisposable(() => {
		root.remove();
	});
};

export { CollaborationPanel } from './CollaborationPanel.js';
