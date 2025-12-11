/**
 * Deep Link Protocol Verification Test Suite
 *
 * Tests the lucide:// protocol handling for:
 * 1. URL parsing accuracy
 * 2. Route matching
 * 3. Parameter extraction
 * 4. Handler invocation
 *
 * Run with: node tests/deepLinkVerification.test.js
 */

// Simple assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected "${expected}", got "${actual}"`);
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}: expected ${expectedStr}, got ${actualStr}`);
    }
}

// Test runner
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

async function runTest(name, testFn) {
    try {
        await testFn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`  ✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
    }
}

function describe(name, fn) {
    console.log(`\n${name}`);
    console.log('─'.repeat(60));
    fn();
}

// Mock BrowserWindow for testing
class MockBrowserWindow {
    constructor() {
        this.destroyed = false;
        this.minimized = false;
        this.focused = false;
        this.sentEvents = [];
        this.webContents = {
            send: (channel, data) => {
                this.sentEvents.push({ channel, data });
            }
        };
    }
    isDestroyed() { return this.destroyed; }
    isMinimized() { return this.minimized; }
    restore() { this.minimized = false; }
    focus() { this.focused = true; }
    show() {}
    static getAllWindows() { return [new MockBrowserWindow()]; }
}

// Mock the electron module
const mockElectron = {
    BrowserWindow: MockBrowserWindow
};

// Override require for electron
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    if (id === 'electron') {
        return mockElectron;
    }
    // Skip listenService and agentProfileService to avoid initialization issues
    if (id.includes('listenService') || id.includes('agentProfileService')) {
        return {
            startListening: async () => ({ success: true }),
            stopListening: async () => ({ success: true }),
            setActiveProfile: async () => ({ success: true })
        };
    }
    return originalRequire.apply(this, arguments);
};

// Now require the deep link service
const deepLinkService = require('../src/features/common/services/deepLinkService');

// Test Results Summary
const testResults = {
    parsing: [],
    routing: [],
    handlers: [],
    integration: []
};

// ==========================================================
// MAIN TEST RUNNER
// ==========================================================
async function runAllTests() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      DEEP LINK PROTOCOL VERIFICATION TEST SUITE              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // ==========================================================
    // SECTION 1: URL PARSING
    // ==========================================================
    describe('📋 1. URL PARSING', () => {});

    console.log('\n  1.1 Basic URL Parsing');

    await runTest('Parse empty URL', () => {
        const result = deepLinkService.parseDeepLink('');
        assertEqual(result.valid, false, 'Should be invalid');
        testResults.parsing.push({ test: 'Empty URL', passed: true });
    });

    await runTest('Parse null URL', () => {
        const result = deepLinkService.parseDeepLink(null);
        assertEqual(result.valid, false, 'Should be invalid');
        testResults.parsing.push({ test: 'Null URL', passed: true });
    });

    await runTest('Parse root URL (lucide://)', () => {
        const result = deepLinkService.parseDeepLink('lucide://');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.path, '', 'Path should be empty');
        assertEqual(result.segments.length, 0, 'No segments');
        testResults.parsing.push({ test: 'Root URL', passed: true });
    });

    await runTest('Parse simple path (lucide://chat)', () => {
        const result = deepLinkService.parseDeepLink('lucide://chat');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.path, 'chat', 'Path should be "chat"');
        assertEqual(result.segments.length, 1, 'One segment');
        assertEqual(result.segments[0], 'chat', 'First segment is "chat"');
        testResults.parsing.push({ test: 'Simple path', passed: true });
    });

    await runTest('Parse nested path (lucide://chat/new)', () => {
        const result = deepLinkService.parseDeepLink('lucide://chat/new');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.path, 'chat/new', 'Path should be "chat/new"');
        assertEqual(result.segments.length, 2, 'Two segments');
        assertEqual(result.segments[0], 'chat', 'First segment');
        assertEqual(result.segments[1], 'new', 'Second segment');
        testResults.parsing.push({ test: 'Nested path', passed: true });
    });

    await runTest('Parse path with ID (lucide://chat/12345)', () => {
        const result = deepLinkService.parseDeepLink('lucide://chat/12345');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.path, 'chat/12345', 'Path should include ID');
        assertEqual(result.segments[1], '12345', 'ID segment');
        testResults.parsing.push({ test: 'Path with ID', passed: true });
    });

    console.log('\n  1.2 Query Parameter Parsing');

    await runTest('Parse URL with query params (lucide://search?q=test)', () => {
        const result = deepLinkService.parseDeepLink('lucide://search?q=test');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.path, 'search', 'Path should be "search"');
        assertEqual(result.query.q, 'test', 'Query param q should be "test"');
        testResults.parsing.push({ test: 'Query params', passed: true });
    });

    await runTest('Parse URL with multiple query params', () => {
        const result = deepLinkService.parseDeepLink('lucide://search?q=hello&limit=10&sort=date');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.query.q, 'hello', 'q param');
        assertEqual(result.query.limit, '10', 'limit param');
        assertEqual(result.query.sort, 'date', 'sort param');
        testResults.parsing.push({ test: 'Multiple query params', passed: true });
    });

    await runTest('Parse URL with encoded query params', () => {
        const result = deepLinkService.parseDeepLink('lucide://search?q=hello%20world');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.query.q, 'hello world', 'Decoded query param');
        testResults.parsing.push({ test: 'Encoded query params', passed: true });
    });

    console.log('\n  1.3 Edge Cases');

    await runTest('Parse URL with trailing slash', () => {
        const result = deepLinkService.parseDeepLink('lucide://chat/');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.path, 'chat', 'Trailing slash should be trimmed');
        testResults.parsing.push({ test: 'Trailing slash', passed: true });
    });

    await runTest('Parse URL without double slash (lucide:chat)', () => {
        const result = deepLinkService.parseDeepLink('lucide:chat');
        assertEqual(result.valid, true, 'Should be valid (normalized)');
        assertEqual(result.path, 'chat', 'Path should be "chat"');
        testResults.parsing.push({ test: 'Single colon format', passed: true });
    });

    await runTest('Parse invalid protocol (http://)', () => {
        const result = deepLinkService.parseDeepLink('http://example.com');
        assertEqual(result.valid, false, 'Should be invalid');
        testResults.parsing.push({ test: 'Invalid protocol', passed: true });
    });

    await runTest('Parse URL with hash fragment', () => {
        const result = deepLinkService.parseDeepLink('lucide://settings#api');
        assertEqual(result.valid, true, 'Should be valid');
        assertEqual(result.hash, 'api', 'Hash should be "api"');
        testResults.parsing.push({ test: 'Hash fragment', passed: true });
    });

    // ==========================================================
    // SECTION 2: ROUTE MATCHING
    // ==========================================================
    describe('🛤️  2. ROUTE MATCHING', () => {});

    console.log('\n  2.1 Exact Route Matching');

    await runTest('Match exact route: chat', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://chat');
        const match = deepLinkService._matchPattern('chat', parsed.segments);
        assert(match !== null, 'Should match "chat" route');
        testResults.routing.push({ test: 'Exact route match', passed: true });
    });

    await runTest('Match exact route: chat/new', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://chat/new');
        const match = deepLinkService._matchPattern('chat/new', parsed.segments);
        assert(match !== null, 'Should match "chat/new" route');
        testResults.routing.push({ test: 'Nested route match', passed: true });
    });

    await runTest('No match for different route', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://settings');
        const match = deepLinkService._matchPattern('chat', parsed.segments);
        assert(match === null, 'Should not match');
        testResults.routing.push({ test: 'No false match', passed: true });
    });

    console.log('\n  2.2 Parameter Pattern Matching');

    await runTest('Match pattern with parameter: chat/:sessionId', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://chat/abc123');
        const match = deepLinkService._matchPattern('chat/:sessionId', parsed.segments);
        assert(match !== null, 'Should match pattern');
        assertEqual(match.params.sessionId, 'abc123', 'Should extract sessionId');
        testResults.routing.push({ test: 'Parameter extraction', passed: true });
    });

    await runTest('Match pattern: settings/:section', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://settings/api');
        const match = deepLinkService._matchPattern('settings/:section', parsed.segments);
        assert(match !== null, 'Should match pattern');
        assertEqual(match.params.section, 'api', 'Should extract section');
        testResults.routing.push({ test: 'Settings section param', passed: true });
    });

    await runTest('Match pattern: profile/:profileId', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://profile/lucide_assistant');
        const match = deepLinkService._matchPattern('profile/:profileId', parsed.segments);
        assert(match !== null, 'Should match pattern');
        assertEqual(match.params.profileId, 'lucide_assistant', 'Should extract profileId');
        testResults.routing.push({ test: 'Profile ID param', passed: true });
    });

    await runTest('No match when segment count differs', () => {
        const parsed = deepLinkService.parseDeepLink('lucide://chat/abc/extra');
        const match = deepLinkService._matchPattern('chat/:sessionId', parsed.segments);
        assert(match === null, 'Should not match (too many segments)');
        testResults.routing.push({ test: 'Segment count mismatch', passed: true });
    });

    // ==========================================================
    // SECTION 3: HANDLER INVOCATION
    // ==========================================================
    describe('🔧 3. HANDLER INVOCATION', () => {});

    // Set up mock window manager
    const mockWindow = new MockBrowserWindow();
    deepLinkService.windowManager = {
        windowPool: {
            get: (name) => name === 'ask' ? mockWindow : null
        }
    };
    deepLinkService.initialized = true;

    console.log('\n  3.1 Navigation Handlers');

    await runTest('Handle lucide:// (focus app)', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://');
        assertEqual(result.success, true, 'Should succeed');
        assertEqual(result.action, 'focus', 'Should focus');
        testResults.handlers.push({ test: 'Focus app', passed: true });
    });

    await runTest('Handle lucide://chat', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://chat');
        assertEqual(result.success, true, 'Should succeed');
        assertEqual(result.route, 'chat', 'Route should be chat');
        assert(mockWindow.sentEvents.some(e => e.channel === 'deep-link:navigate'), 'Should send navigate event');
        testResults.handlers.push({ test: 'Navigate to chat', passed: true });
    });

    await runTest('Handle lucide://chat/new', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://chat/new');
        assertEqual(result.success, true, 'Should succeed');
        assert(mockWindow.sentEvents.some(e => e.channel === 'deep-link:action' && e.data.action === 'new-chat'), 'Should send new-chat action');
        testResults.handlers.push({ test: 'New chat', passed: true });
    });

    await runTest('Handle lucide://chat/{sessionId}', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://chat/session123');
        assertEqual(result.success, true, 'Should succeed');
        assertEqual(result.params.sessionId, 'session123', 'Should have sessionId param');
        testResults.handlers.push({ test: 'Open chat session', passed: true });
    });

    await runTest('Handle lucide://settings', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://settings');
        assertEqual(result.success, true, 'Should succeed');
        const navEvent = mockWindow.sentEvents.find(e => e.channel === 'deep-link:navigate');
        assert(navEvent, 'Should send navigate event');
        assertEqual(navEvent.data.view, 'settings', 'View should be settings');
        testResults.handlers.push({ test: 'Navigate to settings', passed: true });
    });

    await runTest('Handle lucide://settings/{section}', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://settings/api');
        assertEqual(result.success, true, 'Should succeed');
        const navEvent = mockWindow.sentEvents.find(e => e.channel === 'deep-link:navigate');
        assertEqual(navEvent.data.section, 'api', 'Section should be "api"');
        testResults.handlers.push({ test: 'Navigate to settings section', passed: true });
    });

    await runTest('Handle lucide://search?q={query}', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://search?q=hello');
        assertEqual(result.success, true, 'Should succeed');
        const actionEvent = mockWindow.sentEvents.find(e => e.channel === 'deep-link:action');
        assert(actionEvent, 'Should send action event');
        assertEqual(actionEvent.data.action, 'search', 'Action should be search');
        assertEqual(actionEvent.data.query, 'hello', 'Query should be "hello"');
        testResults.handlers.push({ test: 'Search action', passed: true });
    });

    await runTest('Handle lucide://knowledge', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://knowledge');
        assertEqual(result.success, true, 'Should succeed');
        const navEvent = mockWindow.sentEvents.find(e => e.channel === 'deep-link:navigate');
        assertEqual(navEvent.data.view, 'knowledge', 'View should be knowledge');
        testResults.handlers.push({ test: 'Navigate to knowledge', passed: true });
    });

    await runTest('Handle lucide://knowledge/upload', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://knowledge/upload');
        assertEqual(result.success, true, 'Should succeed');
        const actionEvent = mockWindow.sentEvents.find(e => e.channel === 'deep-link:action');
        assertEqual(actionEvent.data.action, 'knowledge-upload', 'Action should be knowledge-upload');
        testResults.handlers.push({ test: 'Knowledge upload action', passed: true });
    });

    await runTest('Handle lucide://profile', async () => {
        mockWindow.sentEvents = [];
        const result = await deepLinkService.handleDeepLink('lucide://profile');
        assertEqual(result.success, true, 'Should succeed');
        const navEvent = mockWindow.sentEvents.find(e => e.channel === 'deep-link:navigate');
        assertEqual(navEvent.data.view, 'profile', 'View should be profile');
        testResults.handlers.push({ test: 'Navigate to profile', passed: true });
    });

    console.log('\n  3.2 Error Handling');

    await runTest('Handle unknown route', async () => {
        const result = await deepLinkService.handleDeepLink('lucide://unknown/route');
        assertEqual(result.success, false, 'Should fail');
        assert(result.error.includes('Unknown route'), 'Should have error message');
        testResults.handlers.push({ test: 'Unknown route error', passed: true });
    });

    await runTest('Handle invalid URL', async () => {
        const result = await deepLinkService.handleDeepLink('not-a-valid-url');
        assertEqual(result.success, false, 'Should fail');
        testResults.handlers.push({ test: 'Invalid URL error', passed: true });
    });

    // ==========================================================
    // SECTION 4: INTEGRATION
    // ==========================================================
    describe('🔗 4. INTEGRATION', () => {});

    console.log('\n  4.1 Supported Deep Links List');

    await runTest('Get all supported deep links', () => {
        const links = deepLinkService.getSupportedDeepLinks();
        assert(Array.isArray(links), 'Should return array');
        assert(links.length >= 10, 'Should have at least 10 supported links');

        const routes = links.map(l => l.route);
        assert(routes.includes('lucide://'), 'Should include root');
        assert(routes.includes('lucide://chat'), 'Should include chat');
        assert(routes.includes('lucide://settings'), 'Should include settings');
        assert(routes.includes('lucide://search?q={query}'), 'Should include search');

        console.log('\n     Supported Deep Links:');
        links.forEach(link => {
            console.log(`     - ${link.route}`);
            console.log(`       ${link.description}`);
        });

        testResults.integration.push({ test: 'List supported links', passed: true });
    });

    await runTest('All routes have handlers', () => {
        const expectedRoutes = [
            '', 'chat', 'chat/new', 'chat/:sessionId',
            'listen', 'listen/start', 'listen/stop',
            'settings', 'settings/:section',
            'session/:sessionId', 'search',
            'knowledge', 'knowledge/upload',
            'profile', 'profile/:profileId'
        ];

        for (const route of expectedRoutes) {
            assert(deepLinkService.handlers.has(route), `Handler missing for route: ${route}`);
        }

        testResults.integration.push({ test: 'All routes have handlers', passed: true });
    });

    console.log('\n  4.2 Pending Deep Link Handling');

    await runTest('Queue deep link when not initialized', async () => {
        // Temporarily uninitialize
        const savedInit = deepLinkService.initialized;
        const savedWM = deepLinkService.windowManager;
        deepLinkService.initialized = false;
        deepLinkService.windowManager = null;

        const result = await deepLinkService.handleDeepLink('lucide://test');
        assertEqual(result.pending, true, 'Should be pending');
        assertEqual(deepLinkService.pendingDeepLink, 'lucide://test', 'Should store pending link');

        // Restore
        deepLinkService.initialized = savedInit;
        deepLinkService.windowManager = savedWM;
        deepLinkService.pendingDeepLink = null;

        testResults.integration.push({ test: 'Pending deep link', passed: true });
    });

    // ==========================================================
    // FINAL SUMMARY
    // ==========================================================
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║        DEEP LINK VERIFICATION SUMMARY                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    console.log('\n📋 1. URL PARSING');
    console.log('─'.repeat(60));
    const parsingPassed = testResults.parsing.filter(r => r.passed).length;
    console.log(`   Passed: ${parsingPassed}/${testResults.parsing.length} tests`);
    console.log(`   Status: ${parsingPassed === testResults.parsing.length ? '✅ ALL PASS' : '⚠️  SOME FAILURES'}`);

    console.log('\n🛤️  2. ROUTE MATCHING');
    console.log('─'.repeat(60));
    const routingPassed = testResults.routing.filter(r => r.passed).length;
    console.log(`   Passed: ${routingPassed}/${testResults.routing.length} tests`);
    console.log(`   Status: ${routingPassed === testResults.routing.length ? '✅ ALL PASS' : '⚠️  SOME FAILURES'}`);

    console.log('\n🔧 3. HANDLER INVOCATION');
    console.log('─'.repeat(60));
    const handlersPassed = testResults.handlers.filter(r => r.passed).length;
    console.log(`   Passed: ${handlersPassed}/${testResults.handlers.length} tests`);
    console.log(`   Status: ${handlersPassed === testResults.handlers.length ? '✅ ALL PASS' : '⚠️  SOME FAILURES'}`);

    console.log('\n🔗 4. INTEGRATION');
    console.log('─'.repeat(60));
    const integrationPassed = testResults.integration.filter(r => r.passed).length;
    console.log(`   Passed: ${integrationPassed}/${testResults.integration.length} tests`);
    console.log(`   Status: ${integrationPassed === testResults.integration.length ? '✅ ALL PASS' : '⚠️  SOME FAILURES'}`);

    const totalTests = results.passed + results.failed;
    const passRate = (results.passed / totalTests * 100).toFixed(1);

    console.log('\n' + '═'.repeat(60));
    console.log(`📋 OVERALL: ${results.passed}/${totalTests} tests passed (${passRate}%)`);
    console.log('═'.repeat(60));

    console.log('\n📝 SUPPORTED DEEP LINKS:');
    console.log('─'.repeat(60));
    console.log('   lucide://                    → Focus app');
    console.log('   lucide://chat                → Open chat view');
    console.log('   lucide://chat/new            → Start new chat');
    console.log('   lucide://chat/{sessionId}    → Open specific chat session');
    console.log('   lucide://listen              → Open listen view');
    console.log('   lucide://listen/start        → Start listening');
    console.log('   lucide://listen/stop         → Stop listening');
    console.log('   lucide://settings            → Open settings');
    console.log('   lucide://settings/{section}  → Open settings section');
    console.log('   lucide://search?q={query}    → Search conversations');
    console.log('   lucide://knowledge           → Open knowledge base');
    console.log('   lucide://knowledge/upload    → Upload document');
    console.log('   lucide://profile             → Open profile');
    console.log('   lucide://profile/{id}        → Switch profile');
    console.log('');

    if (results.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        console.log('─'.repeat(60));
        results.tests.filter(t => t.status === 'FAIL').forEach(t => {
            console.log(`   - ${t.name}: ${t.error}`);
        });
    }

    return results.failed === 0;
}

// Run tests
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});
