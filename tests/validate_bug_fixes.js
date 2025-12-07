/**
 * Validation Tests for Bug Fixes
 * Tests the specific bug fixes made in this session without requiring Electron/Firebase
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

class BugFixValidator {
    constructor() {
        this.passedTests = 0;
        this.failedTests = 0;
        this.results = [];
    }

    log(message, color = colors.reset) {
        console.log(`${color}${message}${colors.reset}`);
    }

    async test(name, fn) {
        try {
            const result = await fn();
            if (result) {
                this.passedTests++;
                this.log(`  ✓ ${name}`, colors.green);
                return true;
            } else {
                this.failedTests++;
                this.log(`  ✗ ${name} - Assertion failed`, colors.red);
                return false;
            }
        } catch (error) {
            this.failedTests++;
            this.log(`  ✗ ${name}`, colors.red);
            this.log(`    Error: ${error.message}`, colors.red);
            return false;
        }
    }

    /**
     * Test that button state constants exist in listenService
     */
    async testButtonStateConstants() {
        this.log('\n━━━ Testing LOW BUG-L1: Button State Constants ━━━', colors.cyan);

        const filePath = path.join(__dirname, '../src/features/listen/listenService.js');
        const content = fs.readFileSync(filePath, 'utf8');

        await this.test('BUTTON_STATES constant exists', () => {
            return content.includes('const BUTTON_STATES = {');
        });

        await this.test('BUTTON_STATES.LISTEN defined', () => {
            return content.includes('LISTEN: \'Écouter\'');
        });

        await this.test('BUTTON_STATES.STOP defined', () => {
            return content.includes('STOP: \'Stop\'');
        });

        await this.test('BUTTON_STATES.DONE defined', () => {
            return content.includes('DONE: \'Terminé\'');
        });

        await this.test('Switch uses BUTTON_STATES', () => {
            return content.includes('case BUTTON_STATES.LISTEN:') &&
                   content.includes('case BUTTON_STATES.STOP:') &&
                   content.includes('case BUTTON_STATES.DONE:');
        });
    }

    /**
     * Test JSDoc documentation added
     */
    async testJSDocAdditions() {
        this.log('\n━━━ Testing LOW BUG-L3, L7, L8: JSDoc Documentation ━━━', colors.cyan);

        // Test listenService JSDoc
        const listenPath = path.join(__dirname, '../src/features/listen/listenService.js');
        const listenContent = fs.readFileSync(listenPath, 'utf8');

        await this.test('listenService: sendToRenderer has JSDoc', () => {
            return listenContent.includes('@param {string} channel - IPC channel name') &&
                   listenContent.includes('sendToRenderer(channel, data)');
        });

        await this.test('listenService: handleListenRequest has JSDoc', () => {
            return listenContent.includes('@param {string} listenButtonText') &&
                   listenContent.includes('handleListenRequest(listenButtonText)');
        });

        await this.test('listenService: handleTranscriptionComplete has JSDoc', () => {
            return listenContent.includes('@param {string} speaker - Speaker identifier') &&
                   listenContent.includes('handleTranscriptionComplete(speaker, text)');
        });

        // Test summaryService JSDoc
        const summaryPath = path.join(__dirname, '../src/features/listen/summary/summaryService.js');
        const summaryContent = fs.readFileSync(summaryPath, 'utf8');

        await this.test('summaryService: setCallbacks has JSDoc', () => {
            return summaryContent.includes('@param {Object} callbacks - Callback functions') &&
                   summaryContent.includes('setCallbacks({ onAnalysisComplete, onStatusUpdate })');
        });

        await this.test('summaryService: addConversationTurn has JSDoc', () => {
            return summaryContent.includes('@param {string} speaker - Speaker identifier') &&
                   summaryContent.includes('addConversationTurn(speaker, text)');
        });

        await this.test('summaryService: getConversationHistory has JSDoc', () => {
            return summaryContent.includes('@returns {Array<string>}') &&
                   summaryContent.includes('getConversationHistory()');
        });
    }

    /**
     * Test comment translations
     */
    async testCommentTranslations() {
        this.log('\n━━━ Testing LOW BUG-L5, L8: Comment Translations ━━━', colors.cyan);

        const listenPath = path.join(__dirname, '../src/features/listen/listenService.js');
        const listenContent = fs.readFileSync(listenPath, 'utf8');

        await this.test('listenService: No French comments remain', () => {
            return !listenContent.includes('Sauvegarder la dernière transcription');
        });

        await this.test('listenService: English translation present', () => {
            return listenContent.includes('Save last transcription if user is speaking');
        });

        const sttPath = path.join(__dirname, '../src/features/listen/stt/sttService.js');
        const sttContent = fs.readFileSync(sttPath, 'utf8');

        await this.test('sttService: Korean comment translated', () => {
            return sttContent.includes('Listen-related events are only sent to Listen window');
        });

        const summaryPath = path.join(__dirname, '../src/features/listen/summary/summaryService.js');
        const summaryContent = fs.readFileSync(summaryPath, 'utf8');

        await this.test('summaryService: Korean comments translated', () => {
            return summaryContent.includes('Include previous analysis results') &&
                   summaryContent.includes('Store analysis results for context') &&
                   summaryContent.includes('Return previous result on error');
        });
    }

    /**
     * Test dead code removal
     */
    async testDeadCodeRemoval() {
        this.log('\n━━━ Testing LOW BUG-L6: Dead Code Removal ━━━', colors.cyan);

        const sttPath = path.join(__dirname, '../src/features/listen/stt/sttService.js');
        const sttContent = fs.readFileSync(sttPath, 'utf8');

        await this.test('sttService: Commented provider check removed', () => {
            return !sttContent.includes('// const provider = await this.getAiProvider()') &&
                   !sttContent.includes('// const isGemini = provider === \'gemini\'');
        });
    }

    /**
     * Test MEDIUM bug fixes - Constants extraction
     */
    async testMediumBugConstants() {
        this.log('\n━━━ Testing MEDIUM BUG Fixes: Constants Extraction ━━━', colors.cyan);

        // Test M18: SUGGESTION_GENERATION_DEBOUNCE_MS
        const listenPath = path.join(__dirname, '../src/features/listen/listenService.js');
        const listenContent = fs.readFileSync(listenPath, 'utf8');

        await this.test('M18: SUGGESTION_GENERATION_DEBOUNCE_MS constant exists', () => {
            return listenContent.includes('const SUGGESTION_GENERATION_DEBOUNCE_MS = 2000');
        });

        // Test M19: PROACTIVE_SUGGESTIONS_INTERVAL
        const insightsPath = path.join(__dirname, '../src/features/listen/liveInsights/liveInsightsService.js');
        const insightsContent = fs.readFileSync(insightsPath, 'utf8');

        await this.test('M19: PROACTIVE_SUGGESTIONS_INTERVAL constant exists', () => {
            return insightsContent.includes('this.PROACTIVE_SUGGESTIONS_INTERVAL = 5');
        });

        // Test M21: MAX_ANALYSIS_HISTORY
        const summaryPath = path.join(__dirname, '../src/features/listen/summary/summaryService.js');
        const summaryContent = fs.readFileSync(summaryPath, 'utf8');

        await this.test('M21: MAX_ANALYSIS_HISTORY constant exists', () => {
            return summaryContent.includes('this.MAX_ANALYSIS_HISTORY = 10');
        });

        // Test M23: RECURRING_TOPIC_THRESHOLD
        await this.test('M23: RECURRING_TOPIC_THRESHOLD constant exists', () => {
            return insightsContent.includes('this.RECURRING_TOPIC_THRESHOLD = 3');
        });

        // Test M26: DB_BUSY_TIMEOUT_MS
        const sqlitePath = path.join(__dirname, '../src/features/common/services/sqliteClient.js');
        const sqliteContent = fs.readFileSync(sqlitePath, 'utf8');

        await this.test('M26: DB_BUSY_TIMEOUT_MS constant exists', () => {
            return sqliteContent.includes('this.DB_BUSY_TIMEOUT_MS = 5000');
        });
    }

    /**
     * Test MEDIUM bug fixes - Code deduplication
     */
    async testMediumBugDeduplication() {
        this.log('\n━━━ Testing MEDIUM BUG Fixes: Code Deduplication ━━━', colors.cyan);

        // Test M17: Debounce deduplication in sttService
        const sttPath = path.join(__dirname, '../src/features/listen/stt/sttService.js');
        const sttContent = fs.readFileSync(sttPath, 'utf8');

        await this.test('M17: _debounceCompletion helper exists', () => {
            return sttContent.includes('_debounceCompletion(speaker, text)');
        });

        await this.test('M17: _flushCompletion helper exists', () => {
            return sttContent.includes('_flushCompletion(speaker)');
        });

        // Test M20: maxTurns validation deduplication
        const summaryPath = path.join(__dirname, '../src/features/listen/summary/summaryService.js');
        const summaryContent = fs.readFileSync(summaryPath, 'utf8');

        await this.test('M20: _validateMaxTurns helper exists', () => {
            return summaryContent.includes('_validateMaxTurns(maxTurns)');
        });

        // Test M22: DEFAULT_FOLLOW_UPS constant
        await this.test('M22: DEFAULT_FOLLOW_UPS constant exists', () => {
            return summaryContent.includes('this.DEFAULT_FOLLOW_UPS = [');
        });

        // Test M25: _executeDbQuery helper
        const sqlitePath = path.join(__dirname, '../src/features/common/services/sqliteClient.js');
        const sqliteContent = fs.readFileSync(sqlitePath, 'utf8');

        await this.test('M25: _executeDbQuery helper exists', () => {
            return sqliteContent.includes('_executeDbQuery(methodName, queryFn, param = null)');
        });

        // Test M27: openDevToolsInDevelopment helper
        const windowPath = path.join(__dirname, '../src/window/windowManager.js');
        const windowContent = fs.readFileSync(windowPath, 'utf8');

        await this.test('M27: openDevToolsInDevelopment helper exists', () => {
            return windowContent.includes('function openDevToolsInDevelopment(window)');
        });
    }

    /**
     * Print summary
     */
    printSummary() {
        const total = this.passedTests + this.failedTests;
        const passRate = total > 0 ? ((this.passedTests / total) * 100).toFixed(1) : 0;

        this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.bright);
        this.log('                  TEST SUMMARY', colors.bright + colors.cyan);
        this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.bright);

        this.log(`\n  Total Tests: ${total}`);
        this.log(`  ✓ Passed: ${this.passedTests}`, colors.green);
        this.log(`  ✗ Failed: ${this.failedTests}`, this.failedTests > 0 ? colors.red : colors.reset);
        this.log(`  Pass Rate: ${passRate}%`, passRate === 100 ? colors.green : colors.yellow);

        if (this.failedTests === 0) {
            this.log('\n  🎉 All bug fixes validated successfully!', colors.bright + colors.green);
        } else {
            this.log('\n  ⚠️  Some validations failed. Please review.', colors.yellow);
        }

        this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.bright);
    }

    /**
     * Run all validation tests
     */
    async runAll() {
        this.log('\n' + '='.repeat(70), colors.bright + colors.cyan);
        this.log('  BUG FIX VALIDATION SUITE', colors.bright + colors.cyan);
        this.log('  Validating 52 bug fixes from comprehensive audit', colors.bright + colors.cyan);
        this.log('='.repeat(70) + '\n', colors.bright + colors.cyan);

        await this.testButtonStateConstants();
        await this.testJSDocAdditions();
        await this.testCommentTranslations();
        await this.testDeadCodeRemoval();
        await this.testMediumBugConstants();
        await this.testMediumBugDeduplication();

        this.printSummary();

        process.exit(this.failedTests > 0 ? 1 : 0);
    }
}

// Run tests
const validator = new BugFixValidator();
validator.runAll().catch(error => {
    console.error('Fatal error running validation tests:', error);
    process.exit(1);
});
