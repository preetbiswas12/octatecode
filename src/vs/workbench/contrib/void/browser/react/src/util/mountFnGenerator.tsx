/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom/client'
import { _registerServices } from './services.js';


import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';

export const mountFnGenerator = (Component: (params: any) => React.ReactNode) => (rootElement: HTMLElement, accessor: ServicesAccessor, props?: any) => {
	if (typeof document === 'undefined') {
		console.error('[Mount] Error: document was undefined')
		return
	}

	let disposables: ReturnType<typeof _registerServices> | null = null
	try {
		disposables = _registerServices(accessor)
	} catch (err) {
		console.error('[Mount] Error registering services:', err);
		// Continue anyway - services may partially work
		disposables = []
	}

	const root = ReactDOM.createRoot(rootElement)

	const rerender = (props?: any) => {
		try {
			root.render(<Component {...props} />);
		} catch (err) {
			console.error('[Mount] Error rendering component:', err);
		}
	}

	const dispose = () => {
		try {
			root.unmount();
		} catch (err) {
			console.warn('[Mount] Error unmounting root:', err);
		}
		if (disposables) {
			disposables.forEach(d => {
				try {
					d.dispose();
				} catch (err) {
					console.warn('[Mount] Error disposing resource:', err);
				}
			});
		}
	}

	rerender(props)

	const returnVal = {
		rerender,
		dispose,
	}
	return returnVal
}
