/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { defineConfig } from 'tsup'

export default defineConfig({
	entry: [
		'./src2/void-editor-widgets-tsx/index.tsx',
		'./src2/sidebar-tsx/index.tsx',
		'./src2/void-settings-tsx/index.tsx',
		'./src2/void-tooltip/index.tsx',
		'./src2/void-onboarding/index.tsx',
		'./src2/quick-edit-tsx/index.tsx',
		'./src2/diff/index.tsx',
		'./src2/collaboration/index.ts',
	],
	outDir: './out',
	format: ['esm'],
	splitting: false,
	bundle: true, // Enable bundling to properly inline all dependencies

	// dts: true,
	// sourcemap: true,

	clean: false,
	platform: 'browser', // 'node'
	target: 'esnext',
	injectStyle: true, // bundle css into the output file
	outExtension: () => ({ js: '.js' }),
	// External imports that should NOT be bundled (VSCode's own modules)
	external: [
		new RegExp('../../../*.js'
			.replaceAll('.', '\\.')
			.replaceAll('*', '.*'))
	],
	treeshake: true,
	esbuildOptions(options) {
		options.outbase = 'src2'  // tries copying the folder hierarchy starting at src2
	}
})
