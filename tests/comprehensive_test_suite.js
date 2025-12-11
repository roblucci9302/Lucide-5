/**
 * Comprehensive Test Suite - All Phases
 * Tests all implemented features from Phase 1 to Phase 4
 */

const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class ComprehensiveTestSuite {
    constructor() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.results = [];
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}  LUCIDE - Comprehensive Test Suite${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}  Testing All Phases (1-4)${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

        try {
            await this.testPhase1();
            await this.testPhase2();
            await this.testPhase3();
            await this.testPhase4();

            this.printSummary();
        } catch (error) {
            console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
        }
    }

    /**
     * Test Phase 1: Meeting Notes & Export
     */
    async testPhase1() {
        this.printPhaseHeader('Phase 1: Meeting Notes & Export');

        // Test 1.1: Meeting notes generation
        await this.test('Meeting notes generation', async () => {
            const sessionRepository = require('../src/features/common/repositories/session');
            const session = await sessionRepository.create({
                user_id: 'test-user',
                title: 'Test Meeting',
                notes: 'Test notes content'
            });
            return session && session.id;
        });

        // Test 1.2: Export functionality
        await this.test('Export service initialization', async () => {
            const ExportService = require('../src/features/listen/export/exportService');
            return ExportService && typeof ExportService.exportToMarkdown === 'function';
        });

        // Test 1.3: Summary generation
        await this.test('Summary service initialization', async () => {
            const SummaryService = require('../src/features/listen/summary/summaryService');
            return SummaryService && typeof SummaryService.generateSummary === 'function';
        });
    }

    /**
     * Test Phase 2: Participants, Emails, Tasks, Suggestions
     */
    async testPhase2() {
        this.printPhaseHeader('Phase 2: Attribution, Emails, Tasks, Suggestions');

        // Test 2.1: Participant service
        await this.test('Participant service initialization', async () => {
            const participantService = require('../src/features/listen/participants/participantService');
            return participantService && typeof participantService.getParticipants === 'function';
        });

        // Test 2.2: Email generation service
        await this.test('Email generation service', async () => {
            const emailService = require('../src/features/listen/email/emailGenerationService');
            return emailService && typeof emailService.generateFollowUpEmail === 'function';
        });

        // Test 2.3: Task management service
        await this.test('Task management service', async () => {
            const taskService = require('../src/features/listen/tasks/taskManagementService');
            return taskService && typeof taskService.createTask === 'function';
        });

        // Test 2.4: Follow-up suggestions
        await this.test('Follow-up suggestions service', async () => {
            const suggestionsService = require('../src/features/listen/followUp/followUpSuggestionsService');
            return suggestionsService && typeof suggestionsService.generateSuggestions === 'function';
        });

        // Test 2.5: Participant attribution
        await this.test('Participant attribution functionality', async () => {
            const participantService = require('../src/features/listen/participants/participantService');
            const result = await participantService.addParticipant('test-session', 'John Doe');
            return result && result.success;
        });
    }

    /**
     * Test Phase 3: Live Insights, AI Analysis, Notifications
     */
    async testPhase3() {
        this.printPhaseHeader('Phase 3: Live Insights, AI Analysis, Notifications');

        // Test 3.1: Live insights service
        await this.test('Live insights service initialization', async () => {
            const liveInsightsService = require('../src/features/listen/liveInsights/liveInsightsService');
            return liveInsightsService && typeof liveInsightsService.processConversationTurn === 'function';
        });

        // Test 3.2: Pattern detection
        await this.test('Insight pattern detection', async () => {
            const liveInsightsService = require('../src/features/listen/liveInsights/liveInsightsService');
            liveInsightsService.setSessionId('test-session-insights');

            // Simulate conversation turn with decision pattern
            liveInsightsService.processConversationTurn('Speaker1', 'We decided to go with option A for the project');

            const insights = liveInsightsService.getAllInsights();
            return insights.length > 0 && insights.some(i => i.type === 'decision');
        });

        // Test 3.3: Notification service
        await this.test('Notification service initialization', async () => {
            const notificationService = require('../src/features/listen/liveInsights/notificationService');
            return notificationService && typeof notificationService.notifyInsight === 'function';
        });

        // Test 3.4: Contextual analysis service
        await this.test('Contextual AI analysis service', async () => {
            const contextualAnalysisService = require('../src/features/listen/liveInsights/contextualAnalysisService');
            return contextualAnalysisService && typeof contextualAnalysisService.analyzeSentiment === 'function';
        });

        // Test 3.5: Notification preferences
        await this.test('Notification preferences management', async () => {
            const notificationService = require('../src/features/listen/liveInsights/notificationService');
            const prefs = notificationService.getPreferences();
            notificationService.updatePreferences({ enabled: true });
            return prefs && prefs.enabled !== undefined;
        });

        // Test 3.6: Insight types
        await this.test('All insight types available', async () => {
            const liveInsightsService = require('../src/features/listen/liveInsights/liveInsightsService');
            const types = liveInsightsService.InsightType;
            const expectedTypes = ['DECISION', 'ACTION', 'DEADLINE', 'QUESTION', 'KEY_POINT', 'BLOCKER', 'TOPIC_CHANGE', 'RECURRING_TOPIC'];
            return expectedTypes.every(type => types[type] !== undefined);
        });
    }

    /**
     * Test Phase 4: Analytics & Dashboard
     */
    async testPhase4() {
        this.printPhaseHeader('Phase 4: Analytics & Dashboard');

        // Test 4.1: Analytics service initialization
        await this.test('Analytics service initialization', async () => {
            const analyticsService = require('../src/features/analytics/analyticsService');
            return analyticsService && typeof analyticsService.getOverviewStats === 'function';
        });

        // Test 4.2: Overview statistics
        await this.test('Overview statistics calculation', async () => {
            const analyticsService = require('../src/features/analytics/analyticsService');
            const stats = await analyticsService.getOverviewStats({});
            return stats && stats.totalSessions !== undefined;
        });

        // Test 4.3: Trending topics
        await this.test('Trending topics extraction', async () => {
            const analyticsService = require('../src/features/analytics/analyticsService');
            const topics = await analyticsService.getTrendingTopics({ limit: 5 });
            return Array.isArray(topics);
        });

        // Test 4.4: Productivity trends
        await this.test('Productivity trends calculation', async () => {
            const analyticsService = require('../src/features/analytics/analyticsService');
            const trends = await analyticsService.getProductivityTrends({ granularity: 'week' });
            return Array.isArray(trends);
        });

        // Test 4.5: Session analytics methods
        await this.test('Session analytics methods available', async () => {
            const analyticsService = require('../src/features/analytics/analyticsService');
            return (
                typeof analyticsService.getOverviewStats === 'function' &&
                typeof analyticsService.getSessionAnalytics === 'function' &&
                typeof analyticsService.getTrendingTopics === 'function' &&
                typeof analyticsService.getProductivityTrends === 'function' &&
                typeof analyticsService.compareSessions === 'function'
            );
        });
    }

    /**
     * Run a single test
     */
    async test(testName, testFn) {
        this.totalTests++;
        process.stdout.write(`  ${colors.yellow}▶${colors.reset} ${testName}... `);

        try {
            const result = await testFn();
            if (result) {
                this.passedTests++;
                console.log(`${colors.green}✓ PASS${colors.reset}`);
                this.results.push({ name: testName, status: 'PASS' });
            } else {
                this.failedTests++;
                console.log(`${colors.red}✗ FAIL${colors.reset}`);
                this.results.push({ name: testName, status: 'FAIL', reason: 'Returned false' });
            }
        } catch (error) {
            this.failedTests++;
            console.log(`${colors.red}✗ FAIL${colors.reset}`);
            console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
            this.results.push({ name: testName, status: 'FAIL', reason: error.message });
        }
    }

    /**
     * Print phase header
     */
    printPhaseHeader(title) {
        console.log(`\n${colors.bright}${colors.blue}━━━ ${title} ━━━${colors.reset}`);
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}  Test Summary${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}\n`);

        console.log(`  Total Tests:  ${this.totalTests}`);
        console.log(`  ${colors.green}Passed:       ${this.passedTests}${colors.reset}`);
        console.log(`  ${colors.red}Failed:       ${this.failedTests}${colors.reset}`);
        console.log(`  Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%\n`);

        if (this.failedTests > 0) {
            console.log(`${colors.red}Failed Tests:${colors.reset}`);
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => {
                    console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
                    if (r.reason) {
                        console.log(`    Reason: ${r.reason}`);
                    }
                });
            console.log();
        }

        if (this.passedTests === this.totalTests) {
            console.log(`${colors.green}${colors.bright}🎉 All tests passed! 🎉${colors.reset}\n`);
        } else {
            console.log(`${colors.yellow}⚠️  Some tests failed. Please review the errors above.${colors.reset}\n`);
        }
    }
}

// Run tests if executed directly
if (require.main === module) {
    const suite = new ComprehensiveTestSuite();
    suite.runAll().then(() => {
        process.exit(suite.failedTests > 0 ? 1 : 0);
    });
}

module.exports = ComprehensiveTestSuite;
