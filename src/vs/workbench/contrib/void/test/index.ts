/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Test Suite Index for Collaboration Services
 * This file aggregates all collaboration service tests for easy discovery and execution
 *
 * Run tests with: npm run test-node
 * or run specific tests with: npm run test-node -- --grep "CollaborationService"
 */

// Import all test suites
import './collaborationService.test.js';
import './fileSyncService.test.js';
import './cursorTrackingService.test.js';
import './collaborationChannel.test.js';
import './operationalTransform.test.js';
import './integration.test.js';

console.log('[Test] All collaboration service unit tests loaded');
console.log('[Test] All collaboration integration tests loaded');
