import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Analytics Dashboard - Phase 4
 * Comprehensive dashboard for meeting analytics and insights
 */
export class AnalyticsDashboard extends LitElement {
    static properties = {
        overviewStats: { type: Object },
        trendingTopics: { type: Array },
        productivityTrends: { type: Array },
        selectedPeriod: { type: String }, // 'week', 'month', 'all'
        isLoading: { type: Boolean },
        activeTab: { type: String } // 'overview', 'trends', 'topics'
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            background: var(--color-black-60);
            overflow-y: auto;
        }

        .dashboard-container {
            padding: var(--padding-lg);
            max-width: 1200px;
            margin: 0 auto;
        }

        .dashboard-header {
            margin-bottom: var(--margin-lg);
        }

        .dashboard-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--color-white-90);
            margin-bottom: var(--margin-sm);
        }

        .dashboard-subtitle {
            font-size: 14px;
            color: var(--color-white-60);
        }

        .period-selector {
            display: flex;
            gap: var(--space-2);
            margin-bottom: var(--margin-md);
        }

        .period-btn {
            padding: 8px 16px;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-white-20);
            background: transparent;
            color: var(--color-white-70);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .period-btn:hover {
            background: var(--color-white-10);
            color: var(--color-white-90);
        }

        .period-btn.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
        }

        .tabs {
            display: flex;
            gap: var(--space-2);
            border-bottom: 2px solid var(--color-white-10);
            margin-bottom: var(--margin-lg);
        }

        .tab {
            padding: 12px 20px;
            background: transparent;
            border: none;
            color: var(--color-white-60);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s ease;
        }

        .tab:hover {
            color: var(--color-white-90);
        }

        .tab.active {
            color: var(--color-primary);
            border-bottom-color: var(--color-primary);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-4);
            margin-bottom: var(--margin-lg);
        }

        .stat-card {
            background: var(--color-black-70);
            border: 1px solid var(--color-white-10);
            border-radius: var(--radius-lg);
            padding: var(--padding-md);
            transition: all 0.2s ease;
        }

        .stat-card:hover {
            border-color: var(--color-primary);
            transform: translateY(-2px);
        }

        .stat-icon {
            font-size: 32px;
            margin-bottom: var(--margin-sm);
        }

        .stat-label {
            font-size: 12px;
            color: var(--color-white-60);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--color-white-90);
            margin-bottom: 4px;
        }

        .stat-subtitle {
            font-size: 11px;
            color: var(--color-white-50);
        }

        .section {
            background: var(--color-black-70);
            border: 1px solid var(--color-white-10);
            border-radius: var(--radius-lg);
            padding: var(--padding-lg);
            margin-bottom: var(--margin-lg);
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--margin-md);
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-white-90);
        }

        .chart-container {
            width: 100%;
            height: 300px;
            background: var(--color-black-60);
            border-radius: var(--radius-md);
            padding: var(--padding-md);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-white-50);
        }

        .topics-list {
            display: grid;
            gap: var(--space-2);
        }

        .topic-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--padding-sm);
            background: var(--color-black-60);
            border-radius: var(--radius-md);
            transition: all 0.2s ease;
        }

        .topic-item:hover {
            background: var(--color-black-50);
        }

        .topic-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-white-90);
        }

        .topic-count {
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .topic-badge {
            background: var(--color-primary);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .topic-bar {
            width: 100px;
            height: 6px;
            background: var(--color-black-50);
            border-radius: 3px;
            overflow: hidden;
        }

        .topic-bar-fill {
            height: 100%;
            background: var(--color-primary);
            transition: width 0.3s ease;
        }

        .insights-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-3);
            margin-top: var(--margin-md);
        }

        .insight-type-card {
            background: var(--color-black-60);
            border-radius: var(--radius-md);
            padding: var(--padding-sm);
            text-align: center;
        }

        .insight-type-icon {
            font-size: 24px;
            margin-bottom: 4px;
        }

        .insight-type-count {
            font-size: 24px;
            font-weight: 700;
            color: var(--color-white-90);
        }

        .insight-type-label {
            font-size: 11px;
            color: var(--color-white-60);
            text-transform: capitalize;
        }

        .trends-timeline {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
        }

        .trend-item {
            display: flex;
            align-items: center;
            padding: var(--padding-sm);
            background: var(--color-black-60);
            border-radius: var(--radius-md);
        }

        .trend-period {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-white-70);
            min-width: 120px;
        }

        .trend-bars {
            flex: 1;
            display: flex;
            gap: var(--space-1);
        }

        .trend-bar {
            height: 24px;
            background: var(--color-primary);
            border-radius: 4px;
            min-width: 4px;
            position: relative;
            transition: all 0.3s ease;
        }

        .trend-bar:hover {
            opacity: 0.8;
        }

        .trend-value {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-white-80);
            min-width: 60px;
            text-align: right;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--padding-xl);
            color: var(--color-white-60);
        }

        .empty-state {
            text-align: center;
            padding: var(--padding-xl);
            color: var(--color-white-50);
        }

        .empty-icon {
            font-size: 64px;
            opacity: 0.3;
            margin-bottom: var(--margin-md);
        }

        .empty-text {
            font-size: 14px;
        }

        /* Scrollbar */
        :host::-webkit-scrollbar {
            width: 8px;
        }

        :host::-webkit-scrollbar-track {
            background: var(--color-black-80);
        }

        :host::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 4px;
        }
    `;

    constructor() {
        super();
        this.overviewStats = null;
        this.trendingTopics = [];
        this.productivityTrends = [];
        this.selectedPeriod = 'all';
        this.isLoading = true;
        this.activeTab = 'overview';
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadData();
    }

    async loadData() {
        this.isLoading = true;

        try {
            const options = this._getPeriodOptions();

            // Load overview stats
            this.overviewStats = await window.api.analytics.getOverview(options);

            // Load trending topics
            this.trendingTopics = await window.api.analytics.getTrendingTopics({ ...options, limit: 10 });

            // Load productivity trends
            this.productivityTrends = await window.api.analytics.getProductivityTrends({
                granularity: this.selectedPeriod === 'week' ? 'day' : 'week',
                limit: 12
            });

            console.log('[AnalyticsDashboard] Data loaded:', {
                overview: this.overviewStats,
                topics: this.trendingTopics,
                trends: this.productivityTrends
            });
        } catch (error) {
            console.error('[AnalyticsDashboard] Error loading data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    _getPeriodOptions() {
        const now = Date.now();
        if (this.selectedPeriod === 'week') {
            return { startDate: now - 7 * 24 * 60 * 60 * 1000 };
        } else if (this.selectedPeriod === 'month') {
            return { startDate: now - 30 * 24 * 60 * 60 * 1000 };
        }
        return {};
    }

    setPeriod(period) {
        this.selectedPeriod = period;
        this.loadData();
    }

    setActiveTab(tab) {
        this.activeTab = tab;
    }

    formatDuration(ms) {
        if (!ms) return '0m';
        const minutes = Math.floor(ms / (60 * 1000));
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }

    formatNumber(num) {
        if (!num) return '0';
        return Math.round(num).toLocaleString();
    }

    getInsightIcon(type) {
        const icons = {
            decision: '✅',
            action: '📋',
            deadline: '⏰',
            question: '❓',
            key_point: '💡',
            blocker: '⛔',
            topic_change: '🔄',
            recurring: '🔁'
        };
        return icons[type] || '📌';
    }

    render() {
        if (this.isLoading) {
            return html`
                <div class="dashboard-container">
                    <div class="loading">Loading analytics...</div>
                </div>
            `;
        }

        if (!this.overviewStats || this.overviewStats.totalSessions === 0) {
            return this.renderEmptyState();
        }

        return html`
            <div class="dashboard-container">
                ${this.renderHeader()}
                ${this.renderPeriodSelector()}
                ${this.renderTabs()}
                ${this.activeTab === 'overview' ? this.renderOverview() : ''}
                ${this.activeTab === 'trends' ? this.renderTrends() : ''}
                ${this.activeTab === 'topics' ? this.renderTopics() : ''}
            </div>
        `;
    }

    renderHeader() {
        return html`
            <div class="dashboard-header">
                <div class="dashboard-title">📊 Meeting Analytics</div>
                <div class="dashboard-subtitle">Insights and statistics from your meetings</div>
            </div>
        `;
    }

    renderPeriodSelector() {
        return html`
            <div class="period-selector">
                <button
                    class="period-btn ${this.selectedPeriod === 'week' ? 'active' : ''}"
                    @click="${() => this.setPeriod('week')}">
                    Last 7 Days
                </button>
                <button
                    class="period-btn ${this.selectedPeriod === 'month' ? 'active' : ''}"
                    @click="${() => this.setPeriod('month')}">
                    Last 30 Days
                </button>
                <button
                    class="period-btn ${this.selectedPeriod === 'all' ? 'active' : ''}"
                    @click="${() => this.setPeriod('all')}">
                    All Time
                </button>
            </div>
        `;
    }

    renderTabs() {
        return html`
            <div class="tabs">
                <button
                    class="tab ${this.activeTab === 'overview' ? 'active' : ''}"
                    @click="${() => this.setActiveTab('overview')}">
                    Overview
                </button>
                <button
                    class="tab ${this.activeTab === 'trends' ? 'active' : ''}"
                    @click="${() => this.setActiveTab('trends')}">
                    Trends
                </button>
                <button
                    class="tab ${this.activeTab === 'topics' ? 'active' : ''}"
                    @click="${() => this.setActiveTab('topics')}">
                    Topics
                </button>
            </div>
        `;
    }

    renderOverview() {
        const stats = this.overviewStats;

        return html`
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📅</div>
                    <div class="stat-label">Total Meetings</div>
                    <div class="stat-value">${this.formatNumber(stats.totalSessions)}</div>
                    <div class="stat-subtitle">${this.formatNumber(stats.avgSessionsPerWeek)} per week</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-label">Total Time</div>
                    <div class="stat-value">${this.formatDuration(stats.totalDuration)}</div>
                    <div class="stat-subtitle">Avg: ${this.formatDuration(stats.avgDuration)}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">💡</div>
                    <div class="stat-label">Total Insights</div>
                    <div class="stat-value">${this.formatNumber(stats.totalInsights)}</div>
                    <div class="stat-subtitle">${stats.avgInsightsPerSession.toFixed(1)} per meeting</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-label">Transcriptions</div>
                    <div class="stat-value">${this.formatNumber(stats.totalTranscriptions)}</div>
                    <div class="stat-subtitle">${stats.avgTranscriptionsPerSession.toFixed(1)} per meeting</div>
                </div>
            </div>

            ${this.renderInsightsBreakdown(stats)}
            ${this.renderProductiveDay(stats)}
        `;
    }

    renderInsightsBreakdown(stats) {
        const types = stats.insightsByType || {};

        return html`
            <div class="section">
                <div class="section-header">
                    <div class="section-title">Insights Breakdown</div>
                </div>
                <div class="insights-breakdown">
                    ${Object.entries(types).map(([type, count]) => html`
                        <div class="insight-type-card">
                            <div class="insight-type-icon">${this.getInsightIcon(type)}</div>
                            <div class="insight-type-count">${count}</div>
                            <div class="insight-type-label">${type.replace('_', ' ')}</div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    renderProductiveDay(stats) {
        if (!stats.mostProductiveDay || !stats.mostProductiveDay.day) {
            return '';
        }

        return html`
            <div class="section">
                <div class="section-header">
                    <div class="section-title">Most Productive Day</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📆</div>
                    <div class="stat-value">${stats.mostProductiveDay.day}</div>
                    <div class="stat-subtitle">${stats.mostProductiveDay.count} meetings</div>
                </div>
            </div>
        `;
    }

    renderTrends() {
        if (!this.productivityTrends || this.productivityTrends.length === 0) {
            return html`<div class="empty-state">No trend data available</div>`;
        }

        const maxInsights = Math.max(...this.productivityTrends.map(t => t.totalInsights));

        return html`
            <div class="section">
                <div class="section-header">
                    <div class="section-title">Productivity Trends</div>
                </div>
                <div class="trends-timeline">
                    ${this.productivityTrends.map(trend => html`
                        <div class="trend-item">
                            <div class="trend-period">${trend.period}</div>
                            <div class="trend-bars">
                                <div
                                    class="trend-bar"
                                    style="width: ${(trend.totalInsights / maxInsights) * 100}%"
                                    title="${trend.totalInsights} insights">
                                </div>
                            </div>
                            <div class="trend-value">${trend.totalInsights} insights</div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    renderTopics() {
        if (!this.trendingTopics || this.trendingTopics.length === 0) {
            return html`<div class="empty-state">No trending topics yet</div>`;
        }

        const maxCount = Math.max(...this.trendingTopics.map(t => t.count));

        return html`
            <div class="section">
                <div class="section-header">
                    <div class="section-title">Trending Topics</div>
                </div>
                <div class="topics-list">
                    ${this.trendingTopics.map(topic => html`
                        <div class="topic-item">
                            <div class="topic-name">${topic.topic}</div>
                            <div class="topic-count">
                                <div class="topic-bar">
                                    <div class="topic-bar-fill" style="width: ${(topic.count / maxCount) * 100}%"></div>
                                </div>
                                <div class="topic-badge">${topic.count}</div>
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return html`
            <div class="dashboard-container">
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <div class="empty-text">
                        No analytics data available yet.<br>
                        Start having meetings to see your statistics!
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('analytics-dashboard', AnalyticsDashboard);
