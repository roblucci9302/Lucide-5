/**
 * Test Suite - Session Comparison Functionality
 * Vérifie la comparaison entre deux sessions
 */

// ============================================================================
// Mock Data Storage
// ============================================================================

const mockDb = {
    sessions: [],
    insights: [],
    transcripts: [],

    clear() {
        this.sessions = [];
        this.insights = [];
        this.transcripts = [];
    }
};

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];
const bugs = [];
const improvements = [];

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        testResults.push({ name, status: 'PASS' });
        console.log(`  ✓ ${name}`);
    } catch (error) {
        testsFailed++;
        testResults.push({ name, status: 'FAIL', error: error.message });
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${error.message}`);
        bugs.push({ test: name, error: error.message });
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: expected ~${expected} (±${tolerance}), got ${actual}`);
    }
}

// ============================================================================
// Analytics Functions (simulating analyticsService.js)
// ============================================================================

function groupBy(items, property) {
    const groups = {};
    items.forEach(item => {
        const key = item[property] || 'unknown';
        groups[key] = (groups[key] || 0) + 1;
    });
    return groups;
}

function createTimeline(insights) {
    return insights
        .map(insight => ({
            timestamp: insight.timestamp,
            type: insight.type,
            title: insight.title,
            priority: insight.priority
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
}

function analyzeSentiment(insights) {
    const distribution = {
        positive: 0,
        neutral: 0,
        negative: 0,
        urgent: 0,
        collaborative: 0,
        unknown: 0
    };

    insights.forEach(insight => {
        const sentiment = insight.sentiment || 'unknown';
        distribution[sentiment] = (distribution[sentiment] || 0) + 1;
    });

    return distribution;
}

function calculateSpeakerStats(transcriptions, insights) {
    const stats = {};

    transcriptions.forEach(t => {
        const speaker = t.speaker || 'Unknown';
        if (!stats[speaker]) {
            stats[speaker] = {
                transcriptionCount: 0,
                wordCount: 0,
                insightsGenerated: 0
            };
        }
        stats[speaker].transcriptionCount++;
        stats[speaker].wordCount += countWordsInText(t.text);
    });

    insights.forEach(insight => {
        const speaker = insight.speaker || 'Unknown';
        if (stats[speaker]) {
            stats[speaker].insightsGenerated++;
        }
    });

    return stats;
}

function extractKeywords(transcriptions) {
    const wordCounts = new Map();
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'we', 'our', 'are', 'be', 'have', 'has']);

    transcriptions.forEach(t => {
        if (!t.text) return;
        const words = t.text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
        words.forEach(word => {
            if (word.length > 3 && !stopWords.has(word)) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        });
    });

    return Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([word, count]) => ({ word, count }));
}

function countWordsInText(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

function countWords(transcriptions) {
    return transcriptions.reduce((sum, t) => sum + countWordsInText(t.text), 0);
}

function calculateWPM(transcriptions, duration) {
    if (!duration) return 0;
    const totalWords = countWords(transcriptions);
    const minutes = duration / (60 * 1000);
    return minutes > 0 ? totalWords / minutes : 0;
}

function calculateEngagement(insights, transcriptions, duration) {
    if (!duration) {
        return { score: 0, insightsPerMinute: 0, transcriptionsPerMinute: 0 };
    }

    const minutes = duration / (60 * 1000);
    const insightsPerMinute = minutes > 0 ? insights.length / minutes : 0;
    const transcriptionsPerMinute = minutes > 0 ? transcriptions.length / minutes : 0;

    const score = Math.min(100, (insightsPerMinute * 10 + transcriptionsPerMinute * 2) * 10);

    return {
        score: Math.round(score),
        insightsPerMinute: Math.round(insightsPerMinute * 100) / 100,
        transcriptionsPerMinute: Math.round(transcriptionsPerMinute * 100) / 100
    };
}

function getSessionAnalytics(sessionId) {
    const session = mockDb.sessions.find(s => s.id === sessionId);
    if (!session) {
        throw new Error('Session not found');
    }

    const insights = mockDb.insights.filter(i => i.session_id === sessionId);
    const transcriptions = mockDb.transcripts.filter(t => t.session_id === sessionId);

    return {
        session,
        metrics: {
            duration: session.duration,
            totalInsights: insights.length,
            totalTranscriptions: transcriptions.length,
            wordsSpoken: countWords(transcriptions),
            avgWordsPerMinute: calculateWPM(transcriptions, session.duration)
        },
        insights: {
            byType: groupBy(insights, 'type'),
            byPriority: groupBy(insights, 'priority'),
            timeline: createTimeline(insights),
            sentiment: analyzeSentiment(insights)
        },
        speakers: calculateSpeakerStats(transcriptions, insights),
        keywords: extractKeywords(transcriptions).slice(0, 10),
        engagement: calculateEngagement(insights, transcriptions, session.duration)
    };
}

// Updated implementation (matching enhanced analyticsService.js)
function compareSessions(sessionId1, sessionId2) {
    const analytics1 = getSessionAnalytics(sessionId1);
    const analytics2 = getSessionAnalytics(sessionId2);

    // Calculate metric differences
    const metricsDiff = {
        duration: analytics1.metrics.duration - analytics2.metrics.duration,
        durationPercent: analytics2.metrics.duration > 0
            ? Math.round((analytics1.metrics.duration - analytics2.metrics.duration) / analytics2.metrics.duration * 1000) / 10
            : 0,
        totalInsights: analytics1.metrics.totalInsights - analytics2.metrics.totalInsights,
        totalTranscriptions: analytics1.metrics.totalTranscriptions - analytics2.metrics.totalTranscriptions,
        wordsSpoken: analytics1.metrics.wordsSpoken - analytics2.metrics.wordsSpoken,
        avgWordsPerMinute: Math.round((analytics1.metrics.avgWordsPerMinute - analytics2.metrics.avgWordsPerMinute) * 100) / 100
    };

    // Calculate engagement differences
    const engagementDiff = {
        score: analytics1.engagement.score - analytics2.engagement.score,
        insightsPerMinute: Math.round((analytics1.engagement.insightsPerMinute - analytics2.engagement.insightsPerMinute) * 100) / 100,
        transcriptionsPerMinute: Math.round((analytics1.engagement.transcriptionsPerMinute - analytics2.engagement.transcriptionsPerMinute) * 100) / 100
    };

    // Compare by type
    const allTypes = new Set([
        ...Object.keys(analytics1.insights.byType),
        ...Object.keys(analytics2.insights.byType)
    ]);
    const byType = {};
    allTypes.forEach(type => {
        byType[type] = {
            session1: analytics1.insights.byType[type] || 0,
            session2: analytics2.insights.byType[type] || 0,
            diff: (analytics1.insights.byType[type] || 0) - (analytics2.insights.byType[type] || 0)
        };
    });

    // Compare by priority
    const allPriorities = new Set([
        ...Object.keys(analytics1.insights.byPriority),
        ...Object.keys(analytics2.insights.byPriority)
    ]);
    const byPriority = {};
    allPriorities.forEach(priority => {
        byPriority[priority] = {
            session1: analytics1.insights.byPriority[priority] || 0,
            session2: analytics2.insights.byPriority[priority] || 0,
            diff: (analytics1.insights.byPriority[priority] || 0) - (analytics2.insights.byPriority[priority] || 0)
        };
    });

    // Determine winners for summary
    const winner = {
        duration: metricsDiff.duration > 0 ? 'session1' : metricsDiff.duration < 0 ? 'session2' : 'tie',
        insights: metricsDiff.totalInsights > 0 ? 'session1' : metricsDiff.totalInsights < 0 ? 'session2' : 'tie',
        engagement: engagementDiff.score > 0 ? 'session1' : engagementDiff.score < 0 ? 'session2' : 'tie',
        productivity: engagementDiff.insightsPerMinute > 0 ? 'session1' : engagementDiff.insightsPerMinute < 0 ? 'session2' : 'tie'
    };

    return {
        session1: analytics1,
        session2: analytics2,
        comparison: {
            // Legacy fields for backwards compatibility
            durationDiff: metricsDiff.duration,
            insightsDiff: metricsDiff.totalInsights,
            engagementDiff: engagementDiff.score,
            // Enhanced comparison data
            metrics: metricsDiff,
            engagement: engagementDiff,
            byType,
            byPriority
        },
        summary: {
            winner
        }
    };
}

// Enhanced comparison (what it should be)
function compareSessionsEnhanced(sessionId1, sessionId2) {
    const analytics1 = getSessionAnalytics(sessionId1);
    const analytics2 = getSessionAnalytics(sessionId2);

    // Calculate all differences
    const metricsDiff = {
        duration: analytics1.metrics.duration - analytics2.metrics.duration,
        durationPercent: analytics2.metrics.duration > 0
            ? ((analytics1.metrics.duration - analytics2.metrics.duration) / analytics2.metrics.duration * 100).toFixed(1)
            : 0,
        totalInsights: analytics1.metrics.totalInsights - analytics2.metrics.totalInsights,
        totalTranscriptions: analytics1.metrics.totalTranscriptions - analytics2.metrics.totalTranscriptions,
        wordsSpoken: analytics1.metrics.wordsSpoken - analytics2.metrics.wordsSpoken,
        avgWordsPerMinute: analytics1.metrics.avgWordsPerMinute - analytics2.metrics.avgWordsPerMinute
    };

    const engagementDiff = {
        score: analytics1.engagement.score - analytics2.engagement.score,
        insightsPerMinute: analytics1.engagement.insightsPerMinute - analytics2.engagement.insightsPerMinute,
        transcriptionsPerMinute: analytics1.engagement.transcriptionsPerMinute - analytics2.engagement.transcriptionsPerMinute
    };

    // Type comparison
    const allTypes = new Set([
        ...Object.keys(analytics1.insights.byType),
        ...Object.keys(analytics2.insights.byType)
    ]);
    const typeComparison = {};
    allTypes.forEach(type => {
        typeComparison[type] = {
            session1: analytics1.insights.byType[type] || 0,
            session2: analytics2.insights.byType[type] || 0,
            diff: (analytics1.insights.byType[type] || 0) - (analytics2.insights.byType[type] || 0)
        };
    });

    // Priority comparison
    const allPriorities = new Set([
        ...Object.keys(analytics1.insights.byPriority),
        ...Object.keys(analytics2.insights.byPriority)
    ]);
    const priorityComparison = {};
    allPriorities.forEach(priority => {
        priorityComparison[priority] = {
            session1: analytics1.insights.byPriority[priority] || 0,
            session2: analytics2.insights.byPriority[priority] || 0,
            diff: (analytics1.insights.byPriority[priority] || 0) - (analytics2.insights.byPriority[priority] || 0)
        };
    });

    // Sentiment comparison
    const sentimentComparison = {};
    Object.keys(analytics1.insights.sentiment).forEach(sentiment => {
        sentimentComparison[sentiment] = {
            session1: analytics1.insights.sentiment[sentiment] || 0,
            session2: analytics2.insights.sentiment[sentiment] || 0,
            diff: (analytics1.insights.sentiment[sentiment] || 0) - (analytics2.insights.sentiment[sentiment] || 0)
        };
    });

    return {
        session1: analytics1,
        session2: analytics2,
        comparison: {
            metrics: metricsDiff,
            engagement: engagementDiff,
            byType: typeComparison,
            byPriority: priorityComparison,
            bySentiment: sentimentComparison
        },
        summary: {
            winner: {
                duration: metricsDiff.duration > 0 ? 'session1' : metricsDiff.duration < 0 ? 'session2' : 'tie',
                insights: metricsDiff.totalInsights > 0 ? 'session1' : metricsDiff.totalInsights < 0 ? 'session2' : 'tie',
                engagement: engagementDiff.score > 0 ? 'session1' : engagementDiff.score < 0 ? 'session2' : 'tie'
            }
        }
    };
}

// ============================================================================
// Test Data Generation
// ============================================================================

function createTestSessions() {
    mockDb.clear();

    const baseTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago

    // Session 1: Short, focused meeting (15 min, high engagement)
    const session1Id = 'session-short-focused';
    mockDb.sessions.push({
        id: session1Id,
        uid: 'test-user',
        title: 'Quick Standup',
        session_type: 'listen',
        started_at: Math.floor(baseTime / 1000),
        ended_at: Math.floor((baseTime + 15 * 60 * 1000) / 1000),
        duration: 15 * 60 * 1000, // 15 minutes
        updated_at: Math.floor(Date.now() / 1000)
    });

    // Session 1 insights (6 insights in 15 min = high density)
    [
        { type: 'action_item', title: 'Update docs', priority: 'high', sentiment: 'positive' },
        { type: 'action_item', title: 'Fix bug', priority: 'high', sentiment: 'urgent' },
        { type: 'decision', title: 'Deploy Friday', priority: 'high', sentiment: 'positive' },
        { type: 'question', title: 'Status check', priority: 'medium', sentiment: 'neutral' },
        { type: 'action_item', title: 'Review PR', priority: 'medium', sentiment: 'collaborative' },
        { type: 'decision', title: 'Approve design', priority: 'high', sentiment: 'positive' }
    ].forEach((insight, i) => {
        mockDb.insights.push({
            id: `insight-s1-${i}`,
            session_id: session1Id,
            type: insight.type,
            title: insight.title,
            priority: insight.priority,
            speaker: 'Dev',
            sentiment: insight.sentiment,
            timestamp: baseTime + (i * 2 + 1) * 60 * 1000
        });
    });

    // Session 1 transcripts (10 transcripts, fast-paced)
    const s1Texts = [
        'Good morning team quick standup today',
        'I finished the authentication module yesterday',
        'Working on the database optimization now',
        'Need help with the deployment script',
        'Can someone review my pull request',
        'The bug fix is ready for testing',
        'Documentation update is complete',
        'Friday deployment looks good to go',
        'Design approved by stakeholders',
        'Great progress everyone see you tomorrow'
    ];
    s1Texts.forEach((text, i) => {
        mockDb.transcripts.push({
            id: `transcript-s1-${i}`,
            session_id: session1Id,
            speaker: 'Dev',
            text: text,
            timestamp: baseTime + (i * 1.5) * 60 * 1000
        });
    });

    // Session 2: Long, detailed meeting (90 min, lower engagement)
    const session2Id = 'session-long-detailed';
    mockDb.sessions.push({
        id: session2Id,
        uid: 'test-user',
        title: 'Q4 Planning Workshop',
        session_type: 'listen',
        started_at: Math.floor((baseTime + 60 * 60 * 1000) / 1000),
        ended_at: Math.floor((baseTime + 150 * 60 * 1000) / 1000),
        duration: 90 * 60 * 1000, // 90 minutes
        updated_at: Math.floor(Date.now() / 1000)
    });

    // Session 2 insights (8 insights in 90 min = lower density)
    [
        { type: 'question', title: 'What is Q4 budget?', priority: 'high', sentiment: 'neutral' },
        { type: 'question', title: 'Timeline constraints?', priority: 'medium', sentiment: 'neutral' },
        { type: 'recurring', title: 'Budget mentioned again', priority: 'low', sentiment: 'neutral' },
        { type: 'action_item', title: 'Prepare proposal', priority: 'high', sentiment: 'neutral' },
        { type: 'decision', title: 'Delay launch to Jan', priority: 'high', sentiment: 'negative' },
        { type: 'question', title: 'Resource allocation?', priority: 'medium', sentiment: 'neutral' },
        { type: 'recurring', title: 'Timeline pressure', priority: 'medium', sentiment: 'urgent' },
        { type: 'action_item', title: 'Update roadmap', priority: 'low', sentiment: 'neutral' }
    ].forEach((insight, i) => {
        mockDb.insights.push({
            id: `insight-s2-${i}`,
            session_id: session2Id,
            type: insight.type,
            title: insight.title,
            priority: insight.priority,
            speaker: ['Alice', 'Bob', 'Charlie'][i % 3],
            sentiment: insight.sentiment,
            timestamp: baseTime + 60 * 60 * 1000 + (i * 10 + 5) * 60 * 1000
        });
    });

    // Session 2 transcripts (25 transcripts, slower-paced)
    const s2Texts = [
        'Welcome everyone to our Q4 planning workshop',
        'Today we will discuss budget allocation and timeline',
        'Let me start with the financial overview',
        'Our current budget is constrained this quarter',
        'We need to prioritize our spending carefully',
        'The marketing team needs additional resources',
        'Engineering has requested more headcount',
        'What is the total budget available for Q4?',
        'We have approximately two million allocated',
        'That is less than what was projected earlier',
        'We may need to adjust our expectations',
        'The product launch timeline is aggressive',
        'Can we realistically meet the December deadline?',
        'There are several technical challenges remaining',
        'The QA team needs more time for testing',
        'I recommend we consider a January launch instead',
        'That would give us more time for quality assurance',
        'The competitors are also targeting January',
        'Delaying might not hurt us competitively then',
        'Let us take a vote on the launch date decision',
        'Majority agrees to delay launch to January',
        'Now let us discuss resource allocation',
        'How many contractors can we bring on board?',
        'I will check with HR about availability',
        'Great discussion today thanks everyone for participating'
    ];
    s2Texts.forEach((text, i) => {
        mockDb.transcripts.push({
            id: `transcript-s2-${i}`,
            session_id: session2Id,
            speaker: ['Alice', 'Bob', 'Charlie'][i % 3],
            text: text,
            timestamp: baseTime + 60 * 60 * 1000 + (i * 3.5) * 60 * 1000
        });
    });

    return { session1Id, session2Id };
}

// ============================================================================
// Test Suites
// ============================================================================

function runTests() {
    console.log('\n====================================================');
    console.log('    TEST SESSION COMPARISON - Lucide-4');
    console.log('====================================================\n');

    const { session1Id, session2Id } = createTestSessions();

    // -----------------------------------------------------------------------
    console.log('\n📊 Test Suite 1: Basic Comparison Functionality');
    console.log('-----------------------------------------------------------------------');

    test('compareSessions returns both session analytics', () => {
        const result = compareSessions(session1Id, session2Id);
        if (!result.session1 || !result.session2) {
            throw new Error('Missing session analytics');
        }
    });

    test('compareSessions returns comparison object', () => {
        const result = compareSessions(session1Id, session2Id);
        if (!result.comparison) {
            throw new Error('Missing comparison object');
        }
    });

    test('Duration difference is calculated correctly', () => {
        const result = compareSessions(session1Id, session2Id);
        const expectedDiff = 15 * 60 * 1000 - 90 * 60 * 1000; // -75 min in ms
        assertEqual(result.comparison.durationDiff, expectedDiff, 'Duration diff');
    });

    test('Insights difference is calculated correctly', () => {
        const result = compareSessions(session1Id, session2Id);
        const expectedDiff = 6 - 8; // Session 1 has 6, Session 2 has 8
        assertEqual(result.comparison.insightsDiff, expectedDiff, 'Insights diff');
    });

    test('Engagement difference is calculated correctly', () => {
        const result = compareSessions(session1Id, session2Id);
        const analytics1 = getSessionAnalytics(session1Id);
        const analytics2 = getSessionAnalytics(session2Id);
        const expectedDiff = analytics1.engagement.score - analytics2.engagement.score;
        assertEqual(result.comparison.engagementDiff, expectedDiff, 'Engagement diff');
    });

    // -----------------------------------------------------------------------
    console.log('\n🔄 Test Suite 2: Self-Comparison (Same Session)');
    console.log('-----------------------------------------------------------------------');

    test('Comparing session with itself returns zero differences', () => {
        const result = compareSessions(session1Id, session1Id);
        assertEqual(result.comparison.durationDiff, 0, 'Self duration diff');
        assertEqual(result.comparison.insightsDiff, 0, 'Self insights diff');
        assertEqual(result.comparison.engagementDiff, 0, 'Self engagement diff');
    });

    test('Self-comparison returns identical analytics objects', () => {
        const result = compareSessions(session1Id, session1Id);
        assertEqual(
            result.session1.metrics.totalInsights,
            result.session2.metrics.totalInsights,
            'Identical insights'
        );
        assertEqual(
            result.session1.metrics.duration,
            result.session2.metrics.duration,
            'Identical duration'
        );
    });

    // -----------------------------------------------------------------------
    console.log('\n📏 Test Suite 3: Very Different Sessions');
    console.log('-----------------------------------------------------------------------');

    test('Handles large duration difference', () => {
        const result = compareSessions(session1Id, session2Id);
        // Session 1: 15 min, Session 2: 90 min = 75 min difference
        const diffMinutes = Math.abs(result.comparison.durationDiff) / (60 * 1000);
        assertEqual(diffMinutes, 75, 'Duration diff in minutes');
    });

    test('Engagement density is higher for shorter focused session', () => {
        const result = compareSessions(session1Id, session2Id);
        // Short session should have higher engagement score
        if (result.session1.engagement.score <= result.session2.engagement.score) {
            throw new Error('Short focused session should have higher engagement');
        }
    });

    test('Insights per minute comparison', () => {
        const result = compareSessions(session1Id, session2Id);
        // Session 1: 6 insights / 15 min = 0.4/min
        // Session 2: 8 insights / 90 min = 0.089/min
        const ipm1 = result.session1.engagement.insightsPerMinute;
        const ipm2 = result.session2.engagement.insightsPerMinute;
        if (ipm1 <= ipm2) {
            throw new Error(`Session 1 IPM (${ipm1}) should be > Session 2 IPM (${ipm2})`);
        }
    });

    // -----------------------------------------------------------------------
    console.log('\n✅ Test Suite 4: Enhanced Comparison Fields (Now Implemented)');
    console.log('-----------------------------------------------------------------------');

    test('Transcriptions difference is in comparison.metrics', () => {
        const result = compareSessions(session1Id, session2Id);
        if (result.comparison.metrics.totalTranscriptions === undefined) {
            throw new Error('totalTranscriptions is missing from comparison.metrics');
        }
        // Session 1 has 10 transcripts, Session 2 has 25
        assertEqual(result.comparison.metrics.totalTranscriptions, 10 - 25, 'Transcriptions diff');
    });

    test('Words spoken difference is in comparison.metrics', () => {
        const result = compareSessions(session1Id, session2Id);
        if (result.comparison.metrics.wordsSpoken === undefined) {
            throw new Error('wordsSpoken is missing from comparison.metrics');
        }
    });

    test('WPM difference is in comparison.metrics', () => {
        const result = compareSessions(session1Id, session2Id);
        if (result.comparison.metrics.avgWordsPerMinute === undefined) {
            throw new Error('avgWordsPerMinute is missing from comparison.metrics');
        }
    });

    test('Type-by-type comparison is included', () => {
        const result = compareSessions(session1Id, session2Id);
        if (result.comparison.byType === undefined) {
            throw new Error('byType comparison is missing');
        }
        // Verify action_item type is present
        if (result.comparison.byType.action_item === undefined) {
            throw new Error('action_item type is missing');
        }
    });

    test('Priority comparison is included', () => {
        const result = compareSessions(session1Id, session2Id);
        if (result.comparison.byPriority === undefined) {
            throw new Error('byPriority comparison is missing');
        }
        // Verify high priority is present
        if (result.comparison.byPriority.high === undefined) {
            throw new Error('high priority is missing');
        }
    });

    test('Percentage differences are calculated', () => {
        const result = compareSessions(session1Id, session2Id);
        if (result.comparison.metrics.durationPercent === undefined) {
            throw new Error('durationPercent is missing from metrics');
        }
        // Session 1 is 15 min, Session 2 is 90 min
        // Diff = (15-90)/90 * 100 = -83.3%
        assertClose(result.comparison.metrics.durationPercent, -83.3, 0.1, 'Duration percent');
    });

    // -----------------------------------------------------------------------
    console.log('\n✨ Test Suite 5: Enhanced Comparison Validation');
    console.log('-----------------------------------------------------------------------');

    test('Enhanced comparison includes all metrics', () => {
        const result = compareSessionsEnhanced(session1Id, session2Id);
        if (!result.comparison.metrics.duration === undefined) throw new Error('Missing duration');
        if (!result.comparison.metrics.totalInsights === undefined) throw new Error('Missing insights');
        if (!result.comparison.metrics.totalTranscriptions === undefined) throw new Error('Missing transcriptions');
        if (!result.comparison.metrics.wordsSpoken === undefined) throw new Error('Missing words');
    });

    test('Enhanced comparison includes type breakdown', () => {
        const result = compareSessionsEnhanced(session1Id, session2Id);
        if (!result.comparison.byType) throw new Error('Missing byType');
        // Check specific types
        if (result.comparison.byType.action_item === undefined) throw new Error('Missing action_item type');
        if (result.comparison.byType.decision === undefined) throw new Error('Missing decision type');
    });

    test('Enhanced comparison includes summary winners', () => {
        const result = compareSessionsEnhanced(session1Id, session2Id);
        if (!result.summary || !result.summary.winner) throw new Error('Missing summary');

        // Session 2 has longer duration
        assertEqual(result.summary.winner.duration, 'session2', 'Duration winner');
        // Session 2 has more insights
        assertEqual(result.summary.winner.insights, 'session2', 'Insights winner');
        // Session 1 has higher engagement
        assertEqual(result.summary.winner.engagement, 'session1', 'Engagement winner');
    });

    // -----------------------------------------------------------------------
    console.log('\n🔍 Test Suite 6: Edge Cases');
    console.log('-----------------------------------------------------------------------');

    test('Error thrown for non-existent session', () => {
        try {
            compareSessions('non-existent', session1Id);
            throw new Error('Should have thrown');
        } catch (e) {
            if (e.message !== 'Session not found') {
                throw new Error(`Wrong error: ${e.message}`);
            }
        }
    });

    test('Handles session with no insights', () => {
        // Create empty session
        mockDb.sessions.push({
            id: 'empty-session',
            uid: 'test-user',
            title: 'Empty',
            duration: 5 * 60 * 1000,
            started_at: Math.floor(Date.now() / 1000),
            ended_at: Math.floor(Date.now() / 1000) + 300
        });

        const result = compareSessions(session1Id, 'empty-session');
        // Session 1 has 6 insights, empty has 0
        assertEqual(result.comparison.insightsDiff, 6, 'Diff with empty');
    });

    // Print summary
    console.log('\n====================================================');
    console.log('    TEST SUMMARY');
    console.log('====================================================');
    console.log(`  Total tests: ${testsPassed + testsFailed}`);
    console.log(`  ✓ Passed: ${testsPassed}`);
    console.log(`  ✗ Failed: ${testsFailed}`);
    console.log('====================================================\n');

    // Print comparison details
    const { session1Id: s1, session2Id: s2 } = createTestSessions();
    const comparison = compareSessions(s1, s2);
    const enhancedComparison = compareSessionsEnhanced(s1, s2);

    console.log('====================================================');
    console.log('    CURRENT vs ENHANCED COMPARISON');
    console.log('====================================================');
    console.log('\nCurrent Implementation (compareSessions):');
    console.log(`  comparison: ${JSON.stringify(comparison.comparison, null, 2)}`);
    console.log('\nEnhanced Implementation (what it should return):');
    console.log(`  comparison.metrics: ${JSON.stringify(enhancedComparison.comparison.metrics, null, 2)}`);
    console.log(`  comparison.engagement: ${JSON.stringify(enhancedComparison.comparison.engagement, null, 2)}`);
    console.log(`  comparison.byType: ${JSON.stringify(enhancedComparison.comparison.byType, null, 2)}`);
    console.log(`  summary.winner: ${JSON.stringify(enhancedComparison.summary.winner, null, 2)}`);
    console.log('====================================================\n');

    // Print improvements needed
    if (improvements.length > 0) {
        console.log('====================================================');
        console.log('    RECOMMENDED IMPROVEMENTS');
        console.log('====================================================');
        improvements.forEach((imp, i) => {
            console.log(`\n${i + 1}. Add ${imp.field}`);
            console.log(`   ${imp.description}`);
        });
        console.log('\n====================================================\n');
    }

    return {
        passed: testsPassed,
        failed: testsFailed,
        improvements
    };
}

// Run tests
runTests();
