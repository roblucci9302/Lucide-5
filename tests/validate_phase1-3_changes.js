/**
 * Phase 1-3 Static Validation Tests
 * Validates the code structure and implementation of Phase 1, 2, and 3 changes
 * without requiring Electron or Firebase
 */

const fs = require('fs');
const path = require('path');

// Test results
let passed = 0;
let failed = 0;
const results = [];

function test(description, fn) {
    try {
        fn();
        passed++;
        results.push({ status: '✅', description });
    } catch (error) {
        failed++;
        results.push({ status: '❌', description, error: error.message });
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function fileContains(filePath, patterns) {
    const absolutePath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    for (const pattern of patterns) {
        if (!content.includes(pattern)) {
            throw new Error(`Pattern not found: "${pattern}"`);
        }
    }
    return content;
}

function fileExists(filePath) {
    const absolutePath = path.join(__dirname, '..', filePath);
    return fs.existsSync(absolutePath);
}

console.log('\n' + '='.repeat(70));
console.log('  PHASE 1-3 STATIC VALIDATION TESTS');
console.log('  Validating code structure without Electron/Firebase');
console.log('='.repeat(70) + '\n');

// ===========================================
// PHASE 1: Post-Meeting Window Fix
// ===========================================
console.log('\n━━━ PHASE 1: Post-Meeting Window Fix ━━━\n');

test('Phase 1.1: ListenView has handleOpenPostMeeting method', () => {
    fileContains('src/ui/listen/ListenView.js', [
        'handleOpenPostMeeting',
        'getRecentListenSession',
        'openPostMeetingWindow'
    ]);
});

test('Phase 1.1: ListenView has Compte-rendu button', () => {
    fileContains('src/ui/listen/ListenView.js', [
        'Compte-rendu',
        'hasCompletedRecording'
    ]);
});

test('Phase 1.2: WindowManager creates post-meeting window at startup', () => {
    fileContains('src/window/windowManager.js', [
        "'post-meeting'",
        "createFeatureWindows(header, ['listen', 'ask', 'settings', 'shortcut-settings', 'post-meeting'])"
    ]);
});

// ===========================================
// PHASE 2: UX Improvements
// ===========================================
console.log('\n━━━ PHASE 2: UX Improvements ━━━\n');

test('Phase 2.1: PostMeetingPanel has allSessions property', () => {
    fileContains('src/ui/listen/PostMeetingPanel.js', [
        'allSessions: { type: Array }',
        'loadAllSessions',
        'handleSessionChange'
    ]);
});

test('Phase 2.1: PostMeetingPanel has session selector UI', () => {
    fileContains('src/ui/listen/PostMeetingPanel.js', [
        'session-selector',
        'session-dropdown',
        '_formatSessionDate'
    ]);
});

test('Phase 2.2: PostMeetingPanel has progress indicator', () => {
    fileContains('src/ui/listen/PostMeetingPanel.js', [
        'generationProgress',
        '_updateProgress',
        'progress-container',
        'progress-steps'
    ]);
});

test('Phase 2.3: PostMeetingPanel has error handling with retry', () => {
    fileContains('src/ui/listen/PostMeetingPanel.js', [
        'lastError',
        'handleRetry',
        '_getErrorMessage',
        '_canRetryError',
        'retry-button'
    ]);
});

test('Phase 2.4: PostMeetingPanel has edit mode', () => {
    fileContains('src/ui/listen/PostMeetingPanel.js', [
        'isEditing',
        'editedFields',
        'handleToggleEdit',
        'handleSaveEdits',
        'edit-toolbar',
        'edit-textarea'
    ]);
});

test('Phase 2.4: PostMeetingBridge has update-notes handler', () => {
    fileContains('src/bridge/modules/postMeetingBridge.js', [
        'post-meeting:update-notes',
        'meetingNotesRepository.update'
    ]);
});

test('Phase 2.4: Preload exposes updateNotes API', () => {
    fileContains('src/preload.js', [
        'updateNotes:',
        'post-meeting:update-notes'
    ]);
});

// ===========================================
// PHASE 3: Robustness Improvements
// ===========================================
console.log('\n━━━ PHASE 3: Robustness Improvements ━━━\n');

test('Phase 3.1: ListenService has transcript counter', () => {
    fileContains('src/features/listen/listenService.js', [
        '_transcriptCount',
        '_totalCharacters',
        '_sendTranscriptStats',
        'getTranscriptStats'
    ]);
});

test('Phase 3.1: ListenView displays transcript count', () => {
    fileContains('src/ui/listen/ListenView.js', [
        'transcriptCount',
        'transcriptChars',
        'onTranscriptStats'
    ]);
});

test('Phase 3.2: ListenService has pre-recording validation', () => {
    fileContains('src/features/listen/listenService.js', [
        'validatePreRecording',
        'STT_NOT_CONFIGURED',
        'STT_NO_API_KEY',
        'LLM_NOT_CONFIGURED'
    ]);
});

test('Phase 3.2: ConversationBridge exposes validation API', () => {
    fileContains('src/bridge/modules/conversationBridge.js', [
        'listen:validatePreRecording',
        'validatePreRecording'
    ]);
});

test('Phase 3.3: ListenService has transcript buffer', () => {
    fileContains('src/features/listen/listenService.js', [
        '_transcriptBuffer',
        '_flushTranscriptBuffer',
        'TRANSCRIPT_BUFFER_MAX_SIZE',
        '_isFlushingBuffer'
    ]);
});

test('Phase 3.4: ListenService has increased close delay', () => {
    fileContains('src/features/listen/listenService.js', [
        'SESSION_CLOSE_DELAY_MS',
        '500'
    ]);
});

test('Phase 3: Preload exposes Phase 3 APIs', () => {
    fileContains('src/preload.js', [
        'getTranscriptStats',
        'validatePreRecording',
        'onTranscriptStats'
    ]);
});

// ===========================================
// CSS VALIDATION
// ===========================================
console.log('\n━━━ CSS VALIDATION ━━━\n');

test('Phase 2: PostMeetingPanel has Phase 2 CSS styles', () => {
    fileContains('src/ui/listen/PostMeetingPanel.js', [
        '.session-selector',
        '.progress-container',
        '.progress-spinner',
        '.error-container',
        '.retry-button',
        '.edit-toolbar',
        '.edit-button',
        '.edit-textarea'
    ]);
});

// ===========================================
// FILE EXISTENCE VALIDATION
// ===========================================
console.log('\n━━━ FILE EXISTENCE VALIDATION ━━━\n');

test('Core files exist', () => {
    assert(fileExists('src/ui/listen/ListenView.js'), 'ListenView.js missing');
    assert(fileExists('src/ui/listen/PostMeetingPanel.js'), 'PostMeetingPanel.js missing');
    assert(fileExists('src/features/listen/listenService.js'), 'listenService.js missing');
    assert(fileExists('src/bridge/modules/postMeetingBridge.js'), 'postMeetingBridge.js missing');
    assert(fileExists('src/bridge/modules/conversationBridge.js'), 'conversationBridge.js missing');
    assert(fileExists('src/window/windowManager.js'), 'windowManager.js missing');
    assert(fileExists('src/preload.js'), 'preload.js missing');
});

test('Phase 4 anti-hallucination files exist', () => {
    assert(fileExists('src/features/listen/postCall/actionItemValidator.js'), 'actionItemValidator.js missing');
    assert(fileExists('src/features/listen/postCall/meetingTemplates.js'), 'meetingTemplates.js missing');
});

// ===========================================
// RESULTS SUMMARY
// ===========================================
console.log('\n' + '='.repeat(70));
console.log('  TEST RESULTS SUMMARY');
console.log('='.repeat(70) + '\n');

results.forEach(r => {
    console.log(`${r.status} ${r.description}`);
    if (r.error) {
        console.log(`   └─ ${r.error}`);
    }
});

console.log('\n' + '─'.repeat(70));
console.log(`Total: ${passed + failed} tests`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('─'.repeat(70) + '\n');

if (failed === 0) {
    console.log('🎉 ALL PHASE 1-3 VALIDATIONS PASSED!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some validations failed. Please review.\n');
    process.exit(1);
}
