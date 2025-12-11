/**
 * Test Suite - Detailed Session Analytics
 * Vérifie l'analyse détaillée d'une session individuelle
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

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}:\n  Expected: ${expectedStr}\n  Got: ${actualStr}`);
    }
}

function assertContains(array, value, message) {
    if (!array.includes(value)) {
        throw new Error(`${message}: array does not contain ${value}`);
    }
}

// ============================================================================
// Simulated Analytics Functions (matching analyticsService.js logic)
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
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'we', 'our', 'are', 'be', 'have', 'has', 'do', 'does', 'will', 'can', 'should', 'would', 'could', 'been', 'was', 'were', 'being']);

    transcriptions.forEach(t => {
        const words = extractWordsFromText(t.text);
        words.forEach(word => {
            if (word.length > 3 && !stopWords.has(word.toLowerCase())) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        });
    });

    return Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([word, count]) => ({ word, count }));
}

function extractWordsFromText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0);
}

function countWords(transcriptions) {
    return transcriptions.reduce((sum, t) => sum + countWordsInText(t.text), 0);
}

function countWordsInText(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

function calculateWPM(transcriptions, duration) {
    if (!duration) return 0;
    const totalWords = countWords(transcriptions);
    const minutes = duration / (60 * 1000);
    return minutes > 0 ? totalWords / minutes : 0;
}

function calculateEngagement(insights, transcriptions, duration) {
    if (!duration) return { score: 0, insightsPerMinute: 0, transcriptionsPerMinute: 0 };

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

    const insightsByType = groupBy(insights, 'type');
    const insightsByPriority = groupBy(insights, 'priority');
    const insightsTimeline = createTimeline(insights);
    const sentimentDistribution = analyzeSentiment(insights);
    const speakerStats = calculateSpeakerStats(transcriptions, insights);
    const keywords = extractKeywords(transcriptions);

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
            byType: insightsByType,
            byPriority: insightsByPriority,
            timeline: insightsTimeline,
            sentiment: sentimentDistribution
        },
        speakers: speakerStats,
        keywords: keywords.slice(0, 10),
        engagement: calculateEngagement(insights, transcriptions, session.duration)
    };
}

// ============================================================================
// Test Data Generation - Complete Session
// ============================================================================

function createCompleteTestSession() {
    mockDb.clear();

    const sessionId = 'test-session-detailed-001';
    const baseTime = Date.now() - 60 * 60 * 1000; // 1 hour ago
    const duration = 45 * 60 * 1000; // 45 minutes

    // Create session
    mockDb.sessions.push({
        id: sessionId,
        uid: 'test-user-001',
        title: 'Q4 Strategy Planning Meeting',
        session_type: 'listen',
        started_at: Math.floor(baseTime / 1000),
        ended_at: Math.floor((baseTime + duration) / 1000),
        duration: duration,
        updated_at: Math.floor(Date.now() / 1000)
    });

    // Create diverse insights (12 total)
    const insightTypes = [
        { type: 'question', title: 'What is our budget for Q4?', priority: 'high', speaker: 'Alice', sentiment: 'neutral', timestamp: baseTime + 5 * 60 * 1000 },
        { type: 'question', title: 'Timeline for product launch?', priority: 'high', speaker: 'Bob', sentiment: 'urgent', timestamp: baseTime + 8 * 60 * 1000 },
        { type: 'question', title: 'Can we get more resources?', priority: 'medium', speaker: 'Alice', sentiment: 'neutral', timestamp: baseTime + 15 * 60 * 1000 },
        { type: 'action_item', title: 'Prepare budget proposal', priority: 'high', speaker: 'Charlie', sentiment: 'collaborative', timestamp: baseTime + 10 * 60 * 1000 },
        { type: 'action_item', title: 'Schedule follow-up meeting', priority: 'medium', speaker: 'Alice', sentiment: 'positive', timestamp: baseTime + 20 * 60 * 1000 },
        { type: 'action_item', title: 'Review competitor analysis', priority: 'high', speaker: 'Bob', sentiment: 'neutral', timestamp: baseTime + 25 * 60 * 1000 },
        { type: 'action_item', title: 'Update project timeline', priority: 'low', speaker: 'Charlie', sentiment: 'neutral', timestamp: baseTime + 30 * 60 * 1000 },
        { type: 'decision', title: 'Approved Q4 budget increase', priority: 'high', speaker: 'Alice', sentiment: 'positive', timestamp: baseTime + 35 * 60 * 1000 },
        { type: 'decision', title: 'Delayed launch to January', priority: 'high', speaker: 'Bob', sentiment: 'negative', timestamp: baseTime + 38 * 60 * 1000 },
        { type: 'recurring', title: 'Budget concerns mentioned again', priority: 'medium', speaker: 'Charlie', sentiment: 'urgent', timestamp: baseTime + 40 * 60 * 1000, metadata: { topic: 'budget' } },
        { type: 'recurring', title: 'Timeline pressure recurring', priority: 'high', speaker: 'Alice', sentiment: 'urgent', timestamp: baseTime + 42 * 60 * 1000, metadata: { topic: 'timeline' } },
        { type: 'highlight', title: 'Key agreement on strategy', priority: 'high', speaker: 'Bob', sentiment: 'positive', timestamp: baseTime + 44 * 60 * 1000 }
    ];

    insightTypes.forEach((insight, index) => {
        mockDb.insights.push({
            id: `insight-${index + 1}`,
            session_id: sessionId,
            user_id: 'test-user-001',
            type: insight.type,
            title: insight.title,
            content: `Detailed content for: ${insight.title}`,
            speaker: insight.speaker,
            priority: insight.priority,
            timestamp: insight.timestamp,
            metadata: insight.metadata || null,
            dismissed: 0,
            created_at: Math.floor(Date.now() / 1000),
            sync_state: 'clean',
            sentiment: insight.sentiment
        });
    });

    // Create diverse transcriptions (20 total, various speakers)
    const transcriptData = [
        { speaker: 'Alice', text: 'Good morning everyone, let us start our Q4 strategy planning meeting.' },
        { speaker: 'Bob', text: 'Thanks Alice. I have prepared the budget analysis and competitor research.' },
        { speaker: 'Charlie', text: 'Great, let me share my screen with the project timeline and milestones.' },
        { speaker: 'Alice', text: 'What is our budget allocation for marketing in Q4? We need to increase visibility.' },
        { speaker: 'Bob', text: 'The current budget is limited but we can request additional resources from finance.' },
        { speaker: 'Charlie', text: 'I think we should prioritize the product launch over marketing spend initially.' },
        { speaker: 'Alice', text: 'That makes sense. When is the target launch date for the new product?' },
        { speaker: 'Bob', text: 'Originally we planned for December but there are some technical challenges.' },
        { speaker: 'Charlie', text: 'The development team needs at least two more weeks for testing and quality assurance.' },
        { speaker: 'Alice', text: 'Can we get more engineering resources to accelerate the timeline?' },
        { speaker: 'Bob', text: 'I will check with HR about contractor availability for the project.' },
        { speaker: 'Charlie', text: 'The competitor analysis shows they are launching similar products in January.' },
        { speaker: 'Alice', text: 'This is concerning. We need to decide whether to rush or delay strategically.' },
        { speaker: 'Bob', text: 'I recommend delaying to January to ensure quality and proper marketing preparation.' },
        { speaker: 'Charlie', text: 'I agree with Bob. A buggy launch would hurt our reputation more than delay.' },
        { speaker: 'Alice', text: 'Alright, let us approve the Q4 budget increase to prepare for January launch.' },
        { speaker: 'Bob', text: 'I will prepare the budget proposal document for executive approval this week.' },
        { speaker: 'Charlie', text: 'I will update the project timeline to reflect the new January target date.' },
        { speaker: 'Alice', text: 'Excellent teamwork everyone. Let us schedule a follow-up meeting next week.' },
        { speaker: 'Bob', text: 'Agreed. This was a productive strategy session with clear decisions and action items.' }
    ];

    transcriptData.forEach((t, index) => {
        mockDb.transcripts.push({
            id: `transcript-${index + 1}`,
            session_id: sessionId,
            uid: 'test-user-001',
            speaker: t.speaker,
            text: t.text,
            timestamp: baseTime + (index * 2 + 1) * 60 * 1000,
            created_at: Math.floor(Date.now() / 1000)
        });
    });

    return sessionId;
}

// ============================================================================
// Expected Values Calculation (Raw Data)
// ============================================================================

function calculateExpectedValues(sessionId) {
    const session = mockDb.sessions.find(s => s.id === sessionId);
    const insights = mockDb.insights.filter(i => i.session_id === sessionId);
    const transcripts = mockDb.transcripts.filter(t => t.session_id === sessionId);

    // Count words manually
    let totalWords = 0;
    transcripts.forEach(t => {
        totalWords += t.text.split(/\s+/).filter(w => w.length > 0).length;
    });

    // Count by type manually
    const byType = { question: 0, action_item: 0, decision: 0, recurring: 0, highlight: 0 };
    insights.forEach(i => {
        if (byType.hasOwnProperty(i.type)) {
            byType[i.type]++;
        }
    });

    // Count by priority manually
    const byPriority = { high: 0, medium: 0, low: 0 };
    insights.forEach(i => {
        if (byPriority.hasOwnProperty(i.priority)) {
            byPriority[i.priority]++;
        }
    });

    // Count by sentiment manually
    const bySentiment = { positive: 0, neutral: 0, negative: 0, urgent: 0, collaborative: 0, unknown: 0 };
    insights.forEach(i => {
        const sentiment = i.sentiment || 'unknown';
        if (bySentiment.hasOwnProperty(sentiment)) {
            bySentiment[sentiment]++;
        }
    });

    // Speaker stats manually
    const speakerStats = {};
    transcripts.forEach(t => {
        if (!speakerStats[t.speaker]) {
            speakerStats[t.speaker] = { transcriptions: 0, words: 0, insights: 0 };
        }
        speakerStats[t.speaker].transcriptions++;
        speakerStats[t.speaker].words += t.text.split(/\s+/).filter(w => w.length > 0).length;
    });
    insights.forEach(i => {
        if (speakerStats[i.speaker]) {
            speakerStats[i.speaker].insights++;
        }
    });

    return {
        session,
        totalInsights: insights.length,
        totalTranscriptions: transcripts.length,
        totalWords,
        durationMinutes: session.duration / (60 * 1000),
        byType,
        byPriority,
        bySentiment,
        speakerStats
    };
}

// ============================================================================
// Test Suites
// ============================================================================

function runTests() {
    console.log('\n====================================================');
    console.log('    TEST DETAILED SESSION ANALYTICS - Lucide-4');
    console.log('====================================================\n');

    const sessionId = createCompleteTestSession();
    const analytics = getSessionAnalytics(sessionId);
    const expected = calculateExpectedValues(sessionId);

    // -----------------------------------------------------------------------
    console.log('\n📊 Test Suite 1: Basic Metrics');
    console.log('-----------------------------------------------------------------------');

    test('Session duration is correct', () => {
        assertEqual(analytics.metrics.duration, expected.session.duration, 'Duration');
    });

    test('Total insights count matches raw data', () => {
        assertEqual(analytics.metrics.totalInsights, expected.totalInsights, 'Total insights');
    });

    test('Total transcriptions count matches raw data', () => {
        assertEqual(analytics.metrics.totalTranscriptions, expected.totalTranscriptions, 'Total transcriptions');
    });

    test('Words spoken count matches raw data', () => {
        assertEqual(analytics.metrics.wordsSpoken, expected.totalWords, 'Words spoken');
    });

    test('Words per minute calculation is correct', () => {
        const expectedWPM = expected.totalWords / expected.durationMinutes;
        assertClose(analytics.metrics.avgWordsPerMinute, expectedWPM, 0.1, 'WPM');
    });

    // -----------------------------------------------------------------------
    console.log('\n📈 Test Suite 2: Insights by Type Distribution');
    console.log('-----------------------------------------------------------------------');

    test('Question count matches', () => {
        assertEqual(analytics.insights.byType.question, expected.byType.question, 'Questions');
    });

    test('Action item count matches', () => {
        assertEqual(analytics.insights.byType.action_item, expected.byType.action_item, 'Action items');
    });

    test('Decision count matches', () => {
        assertEqual(analytics.insights.byType.decision, expected.byType.decision, 'Decisions');
    });

    test('Recurring count matches', () => {
        assertEqual(analytics.insights.byType.recurring, expected.byType.recurring, 'Recurring');
    });

    test('Highlight count matches', () => {
        assertEqual(analytics.insights.byType.highlight, expected.byType.highlight, 'Highlights');
    });

    test('Total by type equals total insights', () => {
        const typeTotal = Object.values(analytics.insights.byType).reduce((a, b) => a + b, 0);
        assertEqual(typeTotal, expected.totalInsights, 'Type total');
    });

    // -----------------------------------------------------------------------
    console.log('\n🎯 Test Suite 3: Priority Distribution');
    console.log('-----------------------------------------------------------------------');

    test('High priority count matches', () => {
        assertEqual(analytics.insights.byPriority.high, expected.byPriority.high, 'High priority');
    });

    test('Medium priority count matches', () => {
        assertEqual(analytics.insights.byPriority.medium, expected.byPriority.medium, 'Medium priority');
    });

    test('Low priority count matches', () => {
        assertEqual(analytics.insights.byPriority.low, expected.byPriority.low, 'Low priority');
    });

    test('Total by priority equals total insights', () => {
        const priorityTotal = Object.values(analytics.insights.byPriority).reduce((a, b) => a + b, 0);
        assertEqual(priorityTotal, expected.totalInsights, 'Priority total');
    });

    // -----------------------------------------------------------------------
    console.log('\n⏱️ Test Suite 4: Timeline Visualization');
    console.log('-----------------------------------------------------------------------');

    test('Timeline has correct number of entries', () => {
        assertEqual(analytics.insights.timeline.length, expected.totalInsights, 'Timeline entries');
    });

    test('Timeline is sorted by timestamp (ascending)', () => {
        const timestamps = analytics.insights.timeline.map(t => t.timestamp);
        const sorted = [...timestamps].sort((a, b) => a - b);
        assertDeepEqual(timestamps, sorted, 'Timeline sort order');
    });

    test('Timeline entries have required fields', () => {
        const firstEntry = analytics.insights.timeline[0];
        if (!firstEntry.timestamp || !firstEntry.type || !firstEntry.title || !firstEntry.priority) {
            throw new Error('Timeline entry missing required fields');
        }
    });

    test('First timeline entry is earliest insight', () => {
        const minTimestamp = Math.min(...mockDb.insights.filter(i => i.session_id === sessionId).map(i => i.timestamp));
        assertEqual(analytics.insights.timeline[0].timestamp, minTimestamp, 'First entry timestamp');
    });

    // -----------------------------------------------------------------------
    console.log('\n😊 Test Suite 5: Sentiment Analysis');
    console.log('-----------------------------------------------------------------------');

    test('Positive sentiment count matches', () => {
        assertEqual(analytics.insights.sentiment.positive, expected.bySentiment.positive, 'Positive');
    });

    test('Neutral sentiment count matches', () => {
        assertEqual(analytics.insights.sentiment.neutral, expected.bySentiment.neutral, 'Neutral');
    });

    test('Negative sentiment count matches', () => {
        assertEqual(analytics.insights.sentiment.negative, expected.bySentiment.negative, 'Negative');
    });

    test('Urgent sentiment count matches', () => {
        assertEqual(analytics.insights.sentiment.urgent, expected.bySentiment.urgent, 'Urgent');
    });

    test('Collaborative sentiment count matches', () => {
        assertEqual(analytics.insights.sentiment.collaborative, expected.bySentiment.collaborative, 'Collaborative');
    });

    test('Total sentiment equals total insights', () => {
        const sentimentTotal = Object.values(analytics.insights.sentiment).reduce((a, b) => a + b, 0);
        assertEqual(sentimentTotal, expected.totalInsights, 'Sentiment total');
    });

    // -----------------------------------------------------------------------
    console.log('\n👥 Test Suite 6: Speaker Statistics');
    console.log('-----------------------------------------------------------------------');

    test('All speakers are present', () => {
        const expectedSpeakers = Object.keys(expected.speakerStats);
        const actualSpeakers = Object.keys(analytics.speakers);
        assertEqual(actualSpeakers.length, expectedSpeakers.length, 'Speaker count');
    });

    test('Alice transcription count matches', () => {
        assertEqual(analytics.speakers.Alice.transcriptionCount, expected.speakerStats.Alice.transcriptions, 'Alice transcriptions');
    });

    test('Bob transcription count matches', () => {
        assertEqual(analytics.speakers.Bob.transcriptionCount, expected.speakerStats.Bob.transcriptions, 'Bob transcriptions');
    });

    test('Charlie transcription count matches', () => {
        assertEqual(analytics.speakers.Charlie.transcriptionCount, expected.speakerStats.Charlie.transcriptions, 'Charlie transcriptions');
    });

    test('Alice word count matches', () => {
        assertEqual(analytics.speakers.Alice.wordCount, expected.speakerStats.Alice.words, 'Alice words');
    });

    test('Alice insights generated matches', () => {
        assertEqual(analytics.speakers.Alice.insightsGenerated, expected.speakerStats.Alice.insights, 'Alice insights');
    });

    // -----------------------------------------------------------------------
    console.log('\n🔤 Test Suite 7: Keyword Extraction');
    console.log('-----------------------------------------------------------------------');

    test('Keywords array is not empty', () => {
        if (analytics.keywords.length === 0) {
            throw new Error('Keywords array is empty');
        }
    });

    test('Keywords are limited to top 10', () => {
        if (analytics.keywords.length > 10) {
            throw new Error(`Keywords should be max 10, got ${analytics.keywords.length}`);
        }
    });

    test('Keywords are sorted by frequency (descending)', () => {
        const counts = analytics.keywords.map(k => k.count);
        const sorted = [...counts].sort((a, b) => b - a);
        assertDeepEqual(counts, sorted, 'Keyword sort order');
    });

    test('Common words from transcripts appear in keywords', () => {
        // 'budget' should appear multiple times
        const keywordWords = analytics.keywords.map(k => k.word);
        if (!keywordWords.includes('budget')) {
            throw new Error('Expected "budget" to be a keyword');
        }
    });

    test('Stop words are excluded from keywords', () => {
        const keywordWords = analytics.keywords.map(k => k.word);
        const stopWords = ['the', 'and', 'for', 'with', 'this', 'that'];
        stopWords.forEach(sw => {
            if (keywordWords.includes(sw)) {
                throw new Error(`Stop word "${sw}" should not be in keywords`);
            }
        });
    });

    // -----------------------------------------------------------------------
    console.log('\n⚡ Test Suite 8: Engagement Score');
    console.log('-----------------------------------------------------------------------');

    test('Engagement score is calculated', () => {
        if (typeof analytics.engagement.score !== 'number') {
            throw new Error('Engagement score is not a number');
        }
    });

    test('Engagement score is between 0 and 100', () => {
        if (analytics.engagement.score < 0 || analytics.engagement.score > 100) {
            throw new Error(`Engagement score ${analytics.engagement.score} out of range [0, 100]`);
        }
    });

    test('Insights per minute is calculated correctly', () => {
        const expectedIPM = expected.totalInsights / expected.durationMinutes;
        assertClose(analytics.engagement.insightsPerMinute, Math.round(expectedIPM * 100) / 100, 0.01, 'Insights/min');
    });

    test('Transcriptions per minute is calculated correctly', () => {
        const expectedTPM = expected.totalTranscriptions / expected.durationMinutes;
        assertClose(analytics.engagement.transcriptionsPerMinute, Math.round(expectedTPM * 100) / 100, 0.01, 'Transcriptions/min');
    });

    // -----------------------------------------------------------------------
    console.log('\n🔍 Test Suite 9: Edge Cases');
    console.log('-----------------------------------------------------------------------');

    test('Non-existent session throws error', () => {
        try {
            getSessionAnalytics('non-existent-session');
            throw new Error('Should have thrown an error');
        } catch (e) {
            if (e.message !== 'Session not found') {
                throw new Error(`Wrong error message: ${e.message}`);
            }
        }
    });

    test('Session with no insights returns empty structures', () => {
        // Create a session with no insights
        mockDb.sessions.push({
            id: 'empty-session',
            uid: 'test-user',
            title: 'Empty Session',
            session_type: 'listen',
            started_at: Math.floor(Date.now() / 1000),
            ended_at: Math.floor(Date.now() / 1000) + 1800,
            duration: 30 * 60 * 1000,
            updated_at: Math.floor(Date.now() / 1000)
        });

        const emptyAnalytics = getSessionAnalytics('empty-session');
        assertEqual(emptyAnalytics.metrics.totalInsights, 0, 'Empty insights');
        assertEqual(emptyAnalytics.insights.timeline.length, 0, 'Empty timeline');
    });

    test('Session with no transcriptions handles keywords gracefully', () => {
        const emptyAnalytics = getSessionAnalytics('empty-session');
        assertEqual(emptyAnalytics.keywords.length, 0, 'Empty keywords');
        assertEqual(emptyAnalytics.metrics.wordsSpoken, 0, 'Zero words');
    });

    // -----------------------------------------------------------------------
    console.log('\n🐛 Test Suite 10: Potential Bugs Check');
    console.log('-----------------------------------------------------------------------');

    test('BUG CHECK: Insights with null speaker handled', () => {
        // Add insight with null speaker
        mockDb.insights.push({
            id: 'null-speaker-insight',
            session_id: sessionId,
            type: 'question',
            title: 'Test null speaker',
            speaker: null,
            priority: 'medium',
            timestamp: Date.now(),
            sentiment: null
        });

        const analyticsWithNull = getSessionAnalytics(sessionId);
        // Should not crash and should count the insight
        if (analyticsWithNull.metrics.totalInsights < expected.totalInsights) {
            throw new Error('Null speaker insight not counted');
        }
    });

    test('BUG CHECK: Insights with undefined sentiment handled', () => {
        // The insight added above has null sentiment
        const analyticsWithNull = getSessionAnalytics(sessionId);
        const sentimentTotal = Object.values(analyticsWithNull.insights.sentiment).reduce((a, b) => a + b, 0);
        // Should handle null/undefined sentiment as 'unknown'
        if (sentimentTotal !== analyticsWithNull.metrics.totalInsights) {
            throw new Error('Undefined sentiment not handled properly');
        }
    });

    // Print summary
    console.log('\n====================================================');
    console.log('    TEST SUMMARY');
    console.log('====================================================');
    console.log(`  Total tests: ${testsPassed + testsFailed}`);
    console.log(`  ✓ Passed: ${testsPassed}`);
    console.log(`  ✗ Failed: ${testsFailed}`);
    console.log('====================================================\n');

    // Print raw data comparison
    console.log('====================================================');
    console.log('    RAW DATA vs ANALYTICS COMPARISON');
    console.log('====================================================');
    console.log('\nExpected (from raw data):');
    console.log(`  - Total Insights: ${expected.totalInsights}`);
    console.log(`  - Total Transcriptions: ${expected.totalTranscriptions}`);
    console.log(`  - Total Words: ${expected.totalWords}`);
    console.log(`  - Duration: ${expected.durationMinutes} minutes`);
    console.log(`  - By Type: ${JSON.stringify(expected.byType)}`);
    console.log(`  - By Priority: ${JSON.stringify(expected.byPriority)}`);
    console.log(`  - By Sentiment: ${JSON.stringify(expected.bySentiment)}`);

    console.log('\nActual (from analytics):');
    console.log(`  - Total Insights: ${analytics.metrics.totalInsights}`);
    console.log(`  - Total Transcriptions: ${analytics.metrics.totalTranscriptions}`);
    console.log(`  - Total Words: ${analytics.metrics.wordsSpoken}`);
    console.log(`  - Duration: ${analytics.metrics.duration / (60 * 1000)} minutes`);
    console.log(`  - By Type: ${JSON.stringify(analytics.insights.byType)}`);
    console.log(`  - By Priority: ${JSON.stringify(analytics.insights.byPriority)}`);
    console.log(`  - By Sentiment: ${JSON.stringify(analytics.insights.sentiment)}`);
    console.log(`  - Top Keywords: ${analytics.keywords.slice(0, 5).map(k => k.word).join(', ')}`);
    console.log(`  - Engagement Score: ${analytics.engagement.score}/100`);
    console.log('====================================================\n');

    // Print bugs if any
    if (bugs.length > 0) {
        console.log('====================================================');
        console.log('    BUGS IDENTIFIED');
        console.log('====================================================');
        bugs.forEach((bug, i) => {
            console.log(`\n${i + 1}. ${bug.test}`);
            console.log(`   Error: ${bug.error}`);
        });
        console.log('\n====================================================\n');
    } else {
        console.log('====================================================');
        console.log('    NO BUGS FOUND - All analytics calculations correct!');
        console.log('====================================================\n');
    }

    return {
        passed: testsPassed,
        failed: testsFailed,
        bugs
    };
}

// Run tests
runTests();
