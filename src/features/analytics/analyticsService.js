/**
 * Analytics Service - Phase 4
 * Provides analytics and metrics for meeting sessions
 */

const sessionRepository = require('../common/repositories/session');
const { liveInsightsRepository } = require('../listen/liveInsights/repositories');
const sttRepository = require('../listen/stt/repositories');

class AnalyticsService {
    constructor() {
        console.log('[AnalyticsService] Initialized');
    }

    /**
     * Get overview statistics for all sessions
     * @param {Object} options - Filter options
     * @returns {Promise<Object>} Overview statistics
     */
    async getOverviewStats(options = {}) {
        try {
            const { startDate, endDate, userId } = options;

            // Fix BUG-ANALYTICS-1: Use getAllByUserId() instead of non-existent getAll()
            // This ensures we only get sessions for the current user
            const allSessions = await sessionRepository.getAllByUserId();

            // Filter sessions
            // Note: Database field is 'started_at' (Unix timestamp in seconds), not 'created_at'
            let sessions = allSessions;
            if (startDate) {
                // Convert startDate (milliseconds) to seconds for comparison with started_at
                const startDateSec = typeof startDate === 'number' && startDate > 1e12 ? startDate / 1000 : startDate;
                sessions = sessions.filter(s => s.started_at >= startDateSec);
            }
            if (endDate) {
                // Convert endDate (milliseconds) to seconds for comparison with started_at
                const endDateSec = typeof endDate === 'number' && endDate > 1e12 ? endDate / 1000 : endDate;
                sessions = sessions.filter(s => s.started_at <= endDateSec);
            }
            if (userId) {
                // Note: Field is 'uid' in database schema, not 'user_id'
                sessions = sessions.filter(s => s.uid === userId);
            }

            // Calculate statistics
            const totalSessions = sessions.length;
            const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

            // Get insights statistics
            const insightsStats = await this._getInsightsStats(sessions.map(s => s.id));

            // Get transcription statistics
            const transcriptionStats = await this._getTranscriptionStats(sessions.map(s => s.id));

            return {
                totalSessions,
                totalDuration,
                avgDuration,
                totalInsights: insightsStats.total,
                avgInsightsPerSession: totalSessions > 0 ? insightsStats.total / totalSessions : 0,
                insightsByType: insightsStats.byType,
                insightsByPriority: insightsStats.byPriority,
                totalTranscriptions: transcriptionStats.total,
                avgTranscriptionsPerSession: totalSessions > 0 ? transcriptionStats.total / totalSessions : 0,
                mostProductiveDay: this._getMostProductiveDay(sessions),
                avgSessionsPerWeek: this._getAvgSessionsPerWeek(sessions),
                timeDistribution: this._getTimeDistribution(sessions)
            };
        } catch (error) {
            console.error('[AnalyticsService] Error getting overview stats:', error);
            throw error;
        }
    }

    /**
     * Get detailed session analytics
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Session analytics
     */
    async getSessionAnalytics(sessionId) {
        try {
            const session = await sessionRepository.getById(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            // Get insights for session
            const insights = await liveInsightsRepository.getBySessionId(sessionId);

            // Fix BUG-ANALYTICS-2: Use getTranscriptsBySessionId() instead of non-existent getBySessionId()
            const transcriptions = await sttRepository.getTranscriptsBySessionId(sessionId);

            // Calculate metrics
            const insightsByType = this._groupBy(insights, 'type');
            const insightsByPriority = this._groupBy(insights, 'priority');
            const insightsTimeline = this._createTimeline(insights);

            // Sentiment analysis
            const sentimentDistribution = this._analyzeSentiment(insights);

            // Speaker statistics
            const speakerStats = this._calculateSpeakerStats(transcriptions, insights);

            // Keyword extraction
            const keywords = this._extractKeywords(transcriptions);

            return {
                session,
                metrics: {
                    duration: session.duration,
                    totalInsights: insights.length,
                    totalTranscriptions: transcriptions.length,
                    wordsSpoken: this._countWords(transcriptions),
                    avgWordsPerMinute: this._calculateWPM(transcriptions, session.duration)
                },
                insights: {
                    byType: insightsByType,
                    byPriority: insightsByPriority,
                    timeline: insightsTimeline,
                    sentiment: sentimentDistribution
                },
                speakers: speakerStats,
                keywords: keywords.slice(0, 10), // Top 10 keywords
                engagement: this._calculateEngagement(insights, transcriptions, session.duration)
            };
        } catch (error) {
            console.error('[AnalyticsService] Error getting session analytics:', error);
            throw error;
        }
    }

    /**
     * Get trending topics across sessions
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Trending topics
     */
    async getTrendingTopics(options = {}) {
        try {
            const { limit = 10, startDate, endDate } = options;

            // Fix BUG-ANALYTICS-1: Use getAllByUserId() instead of non-existent getAll()
            const allSessions = await sessionRepository.getAllByUserId();
            let sessions = allSessions;

            if (startDate) {
                // Convert startDate (milliseconds) to seconds for comparison with started_at
                const startDateSec = typeof startDate === 'number' && startDate > 1e12 ? startDate / 1000 : startDate;
                sessions = sessions.filter(s => s.started_at >= startDateSec);
            }
            if (endDate) {
                // Convert endDate (milliseconds) to seconds for comparison with started_at
                const endDateSec = typeof endDate === 'number' && endDate > 1e12 ? endDate / 1000 : endDate;
                sessions = sessions.filter(s => s.started_at <= endDateSec);
            }

            const sessionIds = sessions.map(s => s.id);
            const allInsights = [];

            // Collect all insights
            for (const sessionId of sessionIds) {
                const insights = await liveInsightsRepository.getBySessionId(sessionId);
                allInsights.push(...insights);
            }

            // Extract topics from insights
            const topicCounts = new Map();

            allInsights.forEach(insight => {
                // Extract topics from recurring insights
                if (insight.type === 'recurring' && insight.metadata?.topic) {
                    const topic = insight.metadata.topic;
                    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
                }

                // Extract keywords from titles
                const words = this._extractWordsFromText(insight.title);
                words.forEach(word => {
                    if (word.length > 4) { // Filter short words
                        topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
                    }
                });
            });

            // Sort by frequency
            const trending = Array.from(topicCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([topic, count]) => ({ topic, count }));

            return trending;
        } catch (error) {
            console.error('[AnalyticsService] Error getting trending topics:', error);
            throw error;
        }
    }

    /**
     * Get insights statistics for sessions
     * @private
     */
    async _getInsightsStats(sessionIds) {
        const allInsights = [];

        for (const sessionId of sessionIds) {
            const insights = await liveInsightsRepository.getBySessionId(sessionId);
            allInsights.push(...insights);
        }

        const byType = this._groupBy(allInsights, 'type');
        const byPriority = this._groupBy(allInsights, 'priority');

        return {
            total: allInsights.length,
            byType,
            byPriority
        };
    }

    /**
     * Get transcription statistics for sessions
     * @private
     */
    async _getTranscriptionStats(sessionIds) {
        let total = 0;

        for (const sessionId of sessionIds) {
            // Fix BUG-ANALYTICS-2: Use getTranscriptsBySessionId() instead of non-existent getBySessionId()
            const transcriptions = await sttRepository.getTranscriptsBySessionId(sessionId);
            total += transcriptions.length;
        }

        return { total };
    }

    /**
     * Get most productive day of the week
     * @private
     */
    _getMostProductiveDay(sessions) {
        const dayCounts = {};

        sessions.forEach(session => {
            // Note: started_at is Unix timestamp in seconds, convert to milliseconds for Date
            const timestamp = session.started_at * 1000;
            const day = new Date(timestamp).getDay();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[day];
            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        });

        let maxDay = null;
        let maxCount = 0;

        for (const [day, count] of Object.entries(dayCounts)) {
            if (count > maxCount) {
                maxCount = count;
                maxDay = day;
            }
        }

        return { day: maxDay, count: maxCount };
    }

    /**
     * Get average sessions per week
     * @private
     */
    _getAvgSessionsPerWeek(sessions) {
        if (sessions.length === 0) return 0;

        // Note: started_at is Unix timestamp in seconds, convert to milliseconds for calculations
        const timestamps = sessions.map(s => s.started_at * 1000).sort((a, b) => a - b);
        const firstDate = timestamps[0];
        const lastDate = timestamps[timestamps.length - 1];

        const weeksDiff = (lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000);

        return weeksDiff > 0 ? sessions.length / weeksDiff : sessions.length;
    }

    /**
     * Get time distribution of sessions
     * @private
     */
    _getTimeDistribution(sessions) {
        const hourCounts = {};

        sessions.forEach(session => {
            // Note: started_at is Unix timestamp in seconds, convert to milliseconds for Date
            const timestamp = session.started_at * 1000;
            const hour = new Date(timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        return hourCounts;
    }

    /**
     * Group items by property
     * @private
     */
    _groupBy(items, property) {
        const groups = {};

        items.forEach(item => {
            const key = item[property] || 'unknown';
            groups[key] = (groups[key] || 0) + 1;
        });

        return groups;
    }

    /**
     * Create timeline from insights
     * @private
     */
    _createTimeline(insights) {
        return insights
            .map(insight => ({
                timestamp: insight.timestamp,
                type: insight.type,
                title: insight.title,
                priority: insight.priority
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Analyze sentiment distribution
     * @private
     */
    _analyzeSentiment(insights) {
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

    /**
     * Calculate speaker statistics
     * @private
     */
    _calculateSpeakerStats(transcriptions, insights) {
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
            stats[speaker].wordCount += this._countWordsInText(t.text);
        });

        insights.forEach(insight => {
            const speaker = insight.speaker || 'Unknown';
            if (stats[speaker]) {
                stats[speaker].insightsGenerated++;
            }
        });

        return stats;
    }

    /**
     * Extract keywords from transcriptions
     * @private
     */
    _extractKeywords(transcriptions) {
        const wordCounts = new Map();
        const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from']);

        transcriptions.forEach(t => {
            const words = this._extractWordsFromText(t.text);
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

    /**
     * Extract words from text
     * @private
     */
    _extractWordsFromText(text) {
        // Guard against null/undefined text
        if (!text) return [];
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    /**
     * Count words in transcriptions
     * @private
     */
    _countWords(transcriptions) {
        return transcriptions.reduce((sum, t) => sum + this._countWordsInText(t.text), 0);
    }

    /**
     * Count words in text
     * @private
     */
    _countWordsInText(text) {
        // Guard against null/undefined text
        if (!text) return 0;
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Calculate words per minute
     * @private
     */
    _calculateWPM(transcriptions, duration) {
        if (!duration) return 0;
        const totalWords = this._countWords(transcriptions);
        const minutes = duration / (60 * 1000);
        return minutes > 0 ? totalWords / minutes : 0;
    }

    /**
     * Calculate engagement score
     * @private
     */
    _calculateEngagement(insights, transcriptions, duration) {
        // Fix: Return proper object structure when duration is 0/null/undefined
        if (!duration) {
            return {
                score: 0,
                insightsPerMinute: 0,
                transcriptionsPerMinute: 0
            };
        }

        const minutes = duration / (60 * 1000);
        const insightsPerMinute = minutes > 0 ? insights.length / minutes : 0;
        const transcriptionsPerMinute = minutes > 0 ? transcriptions.length / minutes : 0;

        // Engagement score based on activity
        const score = Math.min(100, (insightsPerMinute * 10 + transcriptionsPerMinute * 2) * 10);

        return {
            score: Math.round(score),
            insightsPerMinute: Math.round(insightsPerMinute * 100) / 100,
            transcriptionsPerMinute: Math.round(transcriptionsPerMinute * 100) / 100
        };
    }

    /**
     * Get productivity trends over time
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Productivity trends
     */
    async getProductivityTrends(options = {}) {
        try {
            const { granularity = 'week', limit = 12 } = options;

            // Fix BUG-ANALYTICS-1: Use getAllByUserId() instead of non-existent getAll()
            const allSessions = await sessionRepository.getAllByUserId();
            const sessions = allSessions.slice(-limit * 7); // Rough estimate

            const trends = [];
            const groupedSessions = this._groupSessionsByTime(sessions, granularity);

            for (const [period, periodSessions] of Object.entries(groupedSessions)) {
                const sessionIds = periodSessions.map(s => s.id);
                const insightsStats = await this._getInsightsStats(sessionIds);

                trends.push({
                    period,
                    sessionCount: periodSessions.length,
                    totalDuration: periodSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
                    totalInsights: insightsStats.total,
                    avgInsightsPerSession: periodSessions.length > 0 ? insightsStats.total / periodSessions.length : 0
                });
            }

            return trends.sort((a, b) => a.period.localeCompare(b.period));
        } catch (error) {
            console.error('[AnalyticsService] Error getting productivity trends:', error);
            throw error;
        }
    }

    /**
     * Group sessions by time period
     * @private
     */
    _groupSessionsByTime(sessions, granularity) {
        const grouped = {};

        sessions.forEach(session => {
            // Note: started_at is Unix timestamp in seconds, convert to milliseconds for Date
            const timestamp = session.started_at * 1000;
            const date = new Date(timestamp);
            let key;

            if (granularity === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (granularity === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (granularity === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(session);
        });

        return grouped;
    }

    /**
     * Compare two sessions
     * @param {string} sessionId1 - First session ID
     * @param {string} sessionId2 - Second session ID
     * @returns {Promise<Object>} Comparison results
     */
    async compareSessions(sessionId1, sessionId2) {
        try {
            const analytics1 = await this.getSessionAnalytics(sessionId1);
            const analytics2 = await this.getSessionAnalytics(sessionId2);

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
                    winner,
                    recommendation: this._generateComparisonRecommendation(analytics1, analytics2, winner)
                }
            };
        } catch (error) {
            console.error('[AnalyticsService] Error comparing sessions:', error);
            throw error;
        }
    }

    /**
     * Generate a recommendation based on session comparison
     * @private
     */
    _generateComparisonRecommendation(analytics1, analytics2, winner) {
        const recommendations = [];

        // Duration analysis
        if (winner.duration === 'session1' && analytics1.metrics.duration > analytics2.metrics.duration * 1.5) {
            recommendations.push('Session 1 was significantly longer - consider if all time was productive');
        } else if (winner.duration === 'session2' && analytics2.metrics.duration > analytics1.metrics.duration * 1.5) {
            recommendations.push('Session 2 was significantly longer - consider if all time was productive');
        }

        // Engagement analysis
        if (winner.engagement === 'session1' && winner.duration === 'session2') {
            recommendations.push('Session 1 was more efficient despite shorter duration');
        } else if (winner.engagement === 'session2' && winner.duration === 'session1') {
            recommendations.push('Session 2 was more efficient despite shorter duration');
        }

        // Productivity analysis
        if (winner.productivity !== winner.insights) {
            recommendations.push('Higher insight count does not always mean higher productivity per minute');
        }

        return recommendations.length > 0 ? recommendations : ['Both sessions performed similarly'];
    }
}

// Export singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;
