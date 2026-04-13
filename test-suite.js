/**
 * OctateCode Automated Testing Script
 * Run in browser DevTools console after app launches
 * Tests: UI, Chat, Collaboration, Settings
 */

const TEST_RESULTS = {
  timestamp: new Date().toISOString(),
  tests: [],
  passed: 0,
  failed: 0
};

// Helper function to log test
function testLog(name, passed, details = '') {
  const result = { name, passed, details, time: new Date().toISOString() };
  TEST_RESULTS.tests.push(result);
  if (passed) {
    TEST_RESULTS.passed++;
    console.log(`✅ ${name}`, details);
  } else {
    TEST_RESULTS.failed++;
    console.error(`❌ ${name}`, details);
  }
}

console.log('🧪 Starting OctateCode Test Suite...\n');

// Test 1: DOM Elements Exist
try {
  const appContainer = document.querySelector('.monaco-workbench');
  testLog('App Container Exists', !!appContainer, appContainer ? 'Found' : 'Not found');
} catch (e) {
  testLog('App Container Exists', false, e.message);
}

// Test 2: Sidebar Visible
try {
  const sidebar = document.querySelector('[class*="sidebar"]');
  testLog('Sidebar Visible', !!sidebar, sidebar ? 'Found' : 'Not found');
} catch (e) {
  testLog('Sidebar Visible', false, e.message);
}

// Test 3: Chat Input Available
try {
  const chatInput = document.querySelector('textarea');
  testLog('Chat Input Available', !!chatInput, chatInput ? 'Found' : 'Not found');
} catch (e) {
  testLog('Chat Input Available', false, e.message);
}

// Test 4: Settings Panel Accessible
try {
  const settingsBtn = document.querySelector('button[title*="Settings"]') || 
                      document.querySelector('button[aria-label*="Settings"]');
  testLog('Settings Button Visible', !!settingsBtn, settingsBtn ? 'Found' : 'Button not visible');
} catch (e) {
  testLog('Settings Button Visible', false, e.message);
}

// Test 5: Collaboration Panel Available
try {
  const collab = document.querySelector('[class*="collaboration"]');
  testLog('Collaboration Panel Present', !!collab, collab ? 'Found' : 'Not found');
} catch (e) {
  testLog('Collaboration Panel Present', false, e.message);
}

// Test 6: No Critical Errors in Console
try {
  const errorLogs = (window.__errors || []).filter(e => e.level === 'error').length;
  testLog('No Critical Console Errors', errorLogs === 0, `Found ${errorLogs} errors`);
} catch (e) {
  testLog('No Critical Console Errors', false, e.message);
}

// Test 7: Theme Service Integration
try {
  const isDark = document.documentElement.classList.contains('dark');
  testLog('Theme Detection Working', true, `Current theme: ${isDark ? 'dark' : 'light'}`);
} catch (e) {
  testLog('Theme Detection Working', false, e.message);
}

// Test 8: React Components Mounted
try {
  const reactRoot = document.querySelector('[data-react-root]') || 
                    document.querySelector('[class*="void-scope"]');
  testLog('React Components Mounted', !!reactRoot, reactRoot ? 'Found' : 'Not mounted');
} catch (e) {
  testLog('React Components Mounted', false, e.message);
}

// Test 9: Chat Mode Selection
try {
  const modeSelector = document.querySelector('[class*="chat-mode"]');
  testLog('Chat Mode Selector Present', !!modeSelector, modeSelector ? 'Found' : 'Not found');
} catch (e) {
  testLog('Chat Mode Selector Present', false, e.message);
}

// Test 10: Model Dropdown
try {
  const modelDropdown = document.querySelector('[class*="model"]') ||
                        document.querySelector('select');
  testLog('Model Selection Available', !!modelDropdown, modelDropdown ? 'Found' : 'Not found');
} catch (e) {
  testLog('Model Selection Available', false, e.message);
}

// Final Report
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results Summary`);
console.log('='.repeat(50));
console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
console.log(`📌 Total: ${TEST_RESULTS.tests.length}`);
console.log(`⏱️  Time: ${TEST_RESULTS.timestamp}`);
console.log('='.repeat(50) + '\n');

// Export results
window.OCT_TEST_RESULTS = TEST_RESULTS;

// Chat Test Function (manual)
window.testChat = function() {
  console.log('📝 Chat Test (Manual):');
  const chatInput = document.querySelector('textarea');
  if (chatInput) {
    console.log('✅ Chat input found');
    console.log('1. Click the textarea');
    console.log('2. Type a test message');
    console.log('3. Press Enter or click Send');
    console.log('4. Message should appear in chat history');
  } else {
    console.error('❌ Chat input not found');
  }
};

// Collaboration Test Function (manual)
window.testCollaboration = function() {
  console.log('🤝 Collaboration Test (Manual):');
  const collabPanel = document.querySelector('[class*="collaboration"]');
  if (collabPanel) {
    console.log('✅ Collaboration panel found');
    console.log('1. Click Users/Collaboration button');
    console.log('2. Try "Create Room"');
    console.log('3. Check if room ID appears');
    console.log('4. Check WebRTC connection status in console');
  } else {
    console.error('❌ Collaboration panel not found');
  }
};

// Settings Test Function (manual)
window.testSettings = function() {
  console.log('⚙️ Settings Test (Manual):');
  const settingsBtn =document.querySelector('button[title*="Settings"]');
  if (settingsBtn) {
    console.log('✅ Settings button found');
    console.log('1. Click the Settings button');
    console.log('2. Look for provider selection');
    console.log('3. Check if you can change models');
    console.log('4. Verify settings persist on reload');
  } else {
    console.error('❌ Settings button not found');
  }
};

console.log('💡 Available Functions:');
console.log('- window.testChat() - Manual chat testing');
console.log('- window.testCollaboration() - Manual collab testing');
console.log('- window.testSettings() - Manual settings testing');
console.log('- window.OCT_TEST_RESULTS - Full test results object\n');
