/**
 * Phase 2 Structure Validation
 * Validates that all Phase 2 files are created and properly structured
 * Does not execute the code, only checks file existence and structure
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('PHASE 2 STRUCTURE VALIDATION');
console.log('Validating file existence and code structure');
console.log('='.repeat(70) + '\n');

const results = {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

function checkFile(filePath, description) {
    results.totalChecks++;
    const fullPath = path.join(__dirname, '../..', filePath);

    if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✅ ${description}`);
        console.log(`   Path: ${filePath}`);
        console.log(`   Size: ${stats.size} bytes`);
        results.passed++;
        return true;
    } else {
        console.log(`❌ ${description}`);
        console.log(`   Missing: ${filePath}`);
        results.failed++;
        return false;
    }
}

function checkFileContent(filePath, searchStrings, description) {
    results.totalChecks++;
    const fullPath = path.join(__dirname, '../..', filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`❌ ${description} - File not found`);
        results.failed++;
        return false;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const missing = searchStrings.filter(str => !content.includes(str));

    if (missing.length === 0) {
        console.log(`✅ ${description}`);
        results.passed++;
        return true;
    } else {
        console.log(`⚠️  ${description} - Missing some expected content`);
        missing.forEach(str => console.log(`   - "${str}"`));
        results.warnings++;
        return false;
    }
}

console.log('=== PHASE 2.1: PARTICIPANT ATTRIBUTION ===\n');

checkFile(
    'src/features/listen/postCall/repositories/sessionParticipants.sqlite.repository.js',
    'Session Participants Repository'
);

checkFile(
    'src/features/listen/postCall/participantService.js',
    'Participant Service'
);

checkFileContent(
    'src/features/listen/postCall/participantService.js',
    ['detectSpeakers', 'saveParticipants', 'replaceSpeakerLabels', 'getFrequentParticipants'],
    'Participant Service - Key Methods'
);

checkFile(
    'src/bridge/modules/participantBridge.js',
    'Participant IPC Bridge'
);

checkFileContent(
    'src/bridge/modules/participantBridge.js',
    [
        'participants:detect-speakers',
        'participants:save-participants',
        'participants:get-participants',
        'participants:update-notes'
    ],
    'Participant Bridge - IPC Handlers'
);

checkFile(
    'src/ui/listen/ParticipantModal.js',
    'Participant Modal UI Component'
);

console.log('\n=== PHASE 2.2: EMAIL GENERATION ===\n');

checkFile(
    'src/features/listen/postCall/emailGenerationService.js',
    'Email Generation Service'
);

checkFileContent(
    'src/features/listen/postCall/emailGenerationService.js',
    [
        'generateFollowUpEmail',
        'generateQuickTemplate',
        'copyToClipboard',
        'openInMailClient'
    ],
    'Email Service - Key Methods'
);

checkFile(
    'src/bridge/modules/emailBridge.js',
    'Email IPC Bridge'
);

checkFileContent(
    'src/bridge/modules/emailBridge.js',
    [
        'email:generate-followup',
        'email:generate-template',
        'email:copy-to-clipboard',
        'email:open-in-mail-client'
    ],
    'Email Bridge - IPC Handlers'
);

checkFile(
    'src/ui/listen/EmailPreviewModal.js',
    'Email Preview Modal UI Component'
);

console.log('\n=== PHASE 2.3: TASK MANAGEMENT ===\n');

checkFile(
    'src/features/listen/postCall/taskManagementService.js',
    'Task Management Service'
);

checkFileContent(
    'src/features/listen/postCall/taskManagementService.js',
    [
        'autoAssignEmails',
        'updateTask',
        'changeStatus',
        'getTasksByStatus',
        'getOverdueTasks',
        'setReminder',
        'addTags',
        'exportToCSV'
    ],
    'Task Management Service - Key Methods'
);

checkFile(
    'src/bridge/modules/taskBridge.js',
    'Task IPC Bridge'
);

checkFileContent(
    'src/bridge/modules/taskBridge.js',
    [
        'tasks:auto-assign-emails',
        'tasks:update',
        'tasks:change-status',
        'tasks:get-by-status',
        'tasks:export-csv',
        'tasks:set-reminder',
        'tasks:add-tags'
    ],
    'Task Bridge - IPC Handlers'
);

console.log('\n=== PHASE 2.4: FOLLOW-UP SUGGESTIONS ===\n');

checkFile(
    'src/features/listen/postCall/followUpSuggestionsService.js',
    'Follow-up Suggestions Service'
);

checkFileContent(
    'src/features/listen/postCall/followUpSuggestionsService.js',
    [
        'generateSuggestions',
        'acceptSuggestion',
        'dismissSuggestion',
        '_analyzeHistoricalPatterns',
        '_generateAISuggestions',
        '_rankSuggestions'
    ],
    'Suggestions Service - Key Methods'
);

checkFileContent(
    'src/bridge/modules/taskBridge.js',
    [
        'tasks:generate-suggestions',
        'tasks:accept-suggestion',
        'tasks:dismiss-suggestion'
    ],
    'Task Bridge - Suggestion Handlers'
);

console.log('\n=== INTEGRATION CHECKS ===\n');

checkFileContent(
    'src/bridge/featureBridge.js',
    [
        'participantBridge.initialize()',
        'emailBridge.initialize()',
        'taskBridge.initialize()'
    ],
    'Feature Bridge - Phase 2 Bridges Registered'
);

checkFileContent(
    'src/preload.js',
    [
        'window.api.participants',
        'window.api.email',
        'window.api.tasks'
    ],
    'Preload - Phase 2 APIs Exposed'
);

checkFileContent(
    'src/ui/listen/PostMeetingPanel.js',
    [
        'showParticipantModal',
        'showEmailPreviewModal',
        'handleAutoAssignEmails',
        'handleExportTasksCSV',
        'loadSuggestions'
    ],
    'Post Meeting Panel - Phase 2 Integration'
);

console.log('\n=== DATABASE SCHEMA ===\n');

checkFileContent(
    'src/features/common/config/schema.js',
    [
        'session_participants',
        'assigned_to_email',
        'notes',
        'blocked_reason',
        'reminder_date',
        'tags'
    ],
    'Database Schema - Phase 2 Tables and Fields'
);

console.log('\n=== LINE COUNT ANALYSIS ===\n');

function countLines(filePath) {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (!fs.existsSync(fullPath)) return 0;

    const content = fs.readFileSync(fullPath, 'utf-8');
    return content.split('\n').length;
}

const lineCount = {
    'Phase 2.1': {
        'sessionParticipants.repository': countLines('src/features/listen/postCall/repositories/sessionParticipants.sqlite.repository.js'),
        'participantService': countLines('src/features/listen/postCall/participantService.js'),
        'participantBridge': countLines('src/bridge/modules/participantBridge.js'),
        'ParticipantModal': countLines('src/ui/listen/ParticipantModal.js')
    },
    'Phase 2.2': {
        'emailGenerationService': countLines('src/features/listen/postCall/emailGenerationService.js'),
        'emailBridge': countLines('src/bridge/modules/emailBridge.js'),
        'EmailPreviewModal': countLines('src/ui/listen/EmailPreviewModal.js')
    },
    'Phase 2.3': {
        'taskManagementService': countLines('src/features/listen/postCall/taskManagementService.js'),
        'taskBridge (additions)': countLines('src/bridge/modules/taskBridge.js') - 200
    },
    'Phase 2.4': {
        'followUpSuggestionsService': countLines('src/features/listen/postCall/followUpSuggestionsService.js')
    }
};

Object.keys(lineCount).forEach(phase => {
    console.log(`\n${phase}:`);
    let phaseTotal = 0;
    Object.keys(lineCount[phase]).forEach(file => {
        const lines = lineCount[phase][file];
        phaseTotal += lines;
        console.log(`  ${file}: ${lines} lines`);
    });
    console.log(`  Subtotal: ${phaseTotal} lines`);
});

const grandTotal = Object.values(lineCount).reduce((sum, phase) => {
    return sum + Object.values(phase).reduce((s, lines) => s + lines, 0);
}, 0);

console.log(`\n📊 Total new code: ${grandTotal} lines`);

// Final results
console.log('\n' + '='.repeat(70));
console.log('VALIDATION RESULTS');
console.log('='.repeat(70));
console.log(`Total Checks: ${results.totalChecks}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);
console.log(`❌ Failed: ${results.failed}`);
console.log('='.repeat(70));

if (results.failed === 0 && results.warnings === 0) {
    console.log('\n🎉 PHASE 2 STRUCTURE VALIDATION PASSED! 🎉\n');
    console.log('All required files are present and contain expected code.');
    console.log('\nNext steps:');
    console.log('  1. Review MANUAL_TEST_GUIDE.md for testing instructions');
    console.log('  2. Run the application in Electron environment');
    console.log('  3. Manually test all Phase 2 features');
    console.log('  4. Create a Pull Request when testing is complete\n');
    process.exit(0);
} else if (results.failed > 0) {
    console.log('\n❌ VALIDATION FAILED\n');
    console.log('Some required files are missing or incomplete.');
    console.log('Please review the errors above.\n');
    process.exit(1);
} else {
    console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS\n');
    console.log('All files are present but some expected content may be missing.');
    console.log('Please review the warnings above.\n');
    process.exit(0);
}
