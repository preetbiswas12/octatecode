/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

// Some environments (e.g., non cross-origin isolated webviews) do not expose SharedArrayBuffer
// at all. A missing global causes ReferenceErrors when code checks `instanceof SharedArrayBuffer`.
// Provide a benign stub so feature checks degrade gracefully instead of crashing.
if (typeof (globalThis as any).SharedArrayBuffer === 'undefined') {
	(globalThis as any).SharedArrayBuffer = function SharedArrayBufferShim() { } as unknown as SharedArrayBuffer;
}
