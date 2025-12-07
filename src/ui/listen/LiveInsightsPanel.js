import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Live Insights Panel - Phase 3.2 + 3.4
 * Real-time display of meeting insights detected during conversation
 * Enhanced with AI-powered sentiment analysis and contextual suggestions
 */
export class LiveInsightsPanel extends LitElement {
    static properties = {
        insights: { type: Array },
        statistics: { type: Object },
        filterType: { type: String },
        filterPriority: { type: String },
        isExpanded: { type: Boolean },
        showStats: { type: Boolean }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            background: var(--color-black-60);
            border-radius: var(--radius-lg);
            overflow: hidden;
            margin-top: var(--margin-sm);
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--padding-sm) var(--padding-md);
            background: var(--color-black-80);
            cursor: pointer;
            user-select: none;
        }

        .panel-header:hover {
            background: var(--color-black-70);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .header-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--color-white-90);
        }

        .insights-count {
            background: var(--color-primary);
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }

        .expand-icon {
            transition: transform 0.3s ease;
        }

        .expand-icon.expanded {
            transform: rotate(180deg);
        }

        .panel-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }

        .panel-content.expanded {
            max-height: 500px;
            overflow-y: auto;
        }

        .filters {
            display: flex;
            gap: var(--space-2);
            padding: var(--padding-sm) var(--padding-md);
            background: var(--color-black-70);
            border-bottom: 1px solid var(--color-white-10);
        }

        .filter-group {
            display: flex;
            gap: var(--space-1);
        }

        .filter-btn {
            padding: 4px 10px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--color-white-20);
            background: transparent;
            color: var(--color-white-70);
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .filter-btn:hover {
            background: var(--color-white-10);
            color: var(--color-white-90);
        }

        .filter-btn.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
        }

        .insights-list {
            padding: var(--padding-sm);
            max-height: 350px;
            overflow-y: auto;
        }

        .insight-item {
            background: var(--color-black-50);
            border-left: 3px solid;
            border-radius: var(--radius-md);
            padding: var(--padding-sm);
            margin-bottom: var(--margin-xs);
            animation: slideIn 0.3s ease;
            position: relative;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .insight-item.new {
            animation: pulse 0.6s ease;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            }
            50% {
                box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
            }
        }

        .insight-item.priority-high {
            border-color: #ef4444;
        }

        .insight-item.priority-medium {
            border-color: #f59e0b;
        }

        .insight-item.priority-low {
            border-color: #10b981;
        }

        .insight-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: var(--margin-xs);
        }

        .insight-type {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);
        }

        .insight-icon {
            font-size: 16px;
        }

        .insight-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-white-90);
            line-height: 1.4;
        }

        .insight-actions {
            display: flex;
            gap: var(--space-1);
        }

        .dismiss-btn {
            background: transparent;
            border: none;
            color: var(--color-white-50);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .dismiss-btn:hover {
            background: var(--color-white-10);
            color: var(--color-white-90);
        }

        .insight-content {
            font-size: 12px;
            color: var(--color-white-70);
            line-height: 1.5;
            margin-top: var(--margin-xs);
        }

        .insight-meta {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            margin-top: var(--margin-xs);
            font-size: 11px;
            color: var(--color-white-50);
        }

        .insight-speaker {
            display: flex;
            align-items: center;
            gap: var(--space-1);
        }

        .insight-time {
            display: flex;
            align-items: center;
            gap: var(--space-1);
        }

        /* Phase 3.4: Sentiment & AI Suggestions */
        .sentiment-badge {
            font-size: 14px;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .ai-suggestions {
            margin-top: var(--margin-sm);
            padding: var(--padding-xs);
            background: var(--color-black-70);
            border-radius: var(--radius-sm);
            border-left: 3px solid var(--color-primary);
        }

        .suggestions-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--color-white-80);
            margin-bottom: var(--margin-xs);
        }

        .suggestions-list {
            margin: 0;
            padding-left: var(--padding-md);
            list-style: disc;
        }

        .suggestions-list li {
            font-size: 11px;
            color: var(--color-white-70);
            line-height: 1.4;
            margin-bottom: 4px;
        }

        .empty-state {
            text-align: center;
            padding: var(--padding-lg);
            color: var(--color-white-50);
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: var(--margin-sm);
            opacity: 0.3;
        }

        .empty-text {
            font-size: 13px;
        }

        .statistics {
            padding: var(--padding-sm) var(--padding-md);
            background: var(--color-black-70);
            border-top: 1px solid var(--color-white-10);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: var(--space-2);
        }

        .stat-item {
            text-align: center;
        }

        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: var(--color-white-90);
        }

        .stat-label {
            font-size: 10px;
            color: var(--color-white-60);
            margin-top: 2px;
        }

        /* Scrollbar styling */
        .insights-list::-webkit-scrollbar,
        .panel-content::-webkit-scrollbar {
            width: 6px;
        }

        .insights-list::-webkit-scrollbar-track,
        .panel-content::-webkit-scrollbar-track {
            background: var(--color-black-80);
        }

        .insights-list::-webkit-scrollbar-thumb,
        .panel-content::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 3px;
        }

        .insights-list::-webkit-scrollbar-thumb:hover,
        .panel-content::-webkit-scrollbar-thumb:hover {
            background: var(--color-white-30);
        }
    `;

    constructor() {
        super();
        this.insights = [];
        this.statistics = null;
        this.filterType = 'all';
        this.filterPriority = 'all';
        this.isExpanded = true;
        this.showStats = true;
        this.newInsightIds = new Set();
    }

    connectedCallback() {
        super.connectedCallback();
        this.setupInsightListeners();
        this.loadInsights();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeInsightListeners();
    }

    setupInsightListeners() {
        // Listen for real-time insights
        this.insightDetectedHandler = (data) => {
            const { insight } = data;
            this.addInsight(insight);
        };

        this.insightDismissedHandler = (data) => {
            const { insightId } = data;
            this.removeInsight(insightId);
        };

        window.api.insights.onInsightDetected(this.insightDetectedHandler);
        window.api.insights.onInsightDismissed(this.insightDismissedHandler);
    }

    removeInsightListeners() {
        window.api.insights.removeOnInsightDetected(this.insightDetectedHandler);
        window.api.insights.removeOnInsightDismissed(this.insightDismissedHandler);
    }

    async loadInsights() {
        try {
            const insights = await window.api.insights.getActive();
            const stats = await window.api.insights.getStatistics();

            this.insights = insights;
            this.statistics = stats;
        } catch (error) {
            console.error('[LiveInsightsPanel] Error loading insights:', error);
        }
    }

    addInsight(insight) {
        // Add to beginning of array for newest-first
        this.insights = [insight, ...this.insights];

        // Mark as new for animation
        this.newInsightIds.add(insight.id);

        // Remove new marker after animation
        setTimeout(() => {
            this.newInsightIds.delete(insight.id);
            this.requestUpdate();
        }, 3000);

        // Update statistics
        this.loadStatistics();
    }

    removeInsight(insightId) {
        this.insights = this.insights.filter(i => i.id !== insightId);
        this.loadStatistics();
    }

    async loadStatistics() {
        try {
            const stats = await window.api.insights.getStatistics();
            this.statistics = stats;
        } catch (error) {
            console.error('[LiveInsightsPanel] Error loading statistics:', error);
        }
    }

    async handleDismiss(insightId) {
        try {
            await window.api.insights.dismiss(insightId);
            this.removeInsight(insightId);
        } catch (error) {
            console.error('[LiveInsightsPanel] Error dismissing insight:', error);
        }
    }

    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
    }

    setFilterType(type) {
        this.filterType = type;
    }

    setFilterPriority(priority) {
        this.filterPriority = priority;
    }

    getFilteredInsights() {
        let filtered = this.insights;

        if (this.filterType !== 'all') {
            filtered = filtered.filter(i => i.type === this.filterType);
        }

        if (this.filterPriority !== 'all') {
            filtered = filtered.filter(i => i.priority === this.filterPriority);
        }

        return filtered;
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
            recurring: '🔁',
            suggestion: '🤖',
            fact: '📊' // Factual insights from AI/KB
        };
        return icons[type] || '📌';
    }

    getSentimentEmoji(sentiment) {
        const emojis = {
            positive: '😊',
            neutral: '😐',
            negative: '😟',
            urgent: '🚨',
            collaborative: '🤝'
        };
        return emojis[sentiment] || '';
    }

    getPriorityColor(priority) {
        const colors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };
        return colors[priority] || '#6b7280';
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    render() {
        const filteredInsights = this.getFilteredInsights();
        const activeCount = this.insights.length;

        return html`
            <div class="panel-header" @click="${this.toggleExpanded}">
                <div class="header-left">
                    <span class="header-title">💡 Live Insights</span>
                    ${activeCount > 0 ? html`
                        <span class="insights-count">${activeCount}</span>
                    ` : ''}
                </div>
                <div class="expand-icon ${this.isExpanded ? 'expanded' : ''}">▼</div>
            </div>

            <div class="panel-content ${this.isExpanded ? 'expanded' : ''}">
                <div class="filters">
                    <div class="filter-group">
                        <button
                            class="filter-btn ${this.filterType === 'all' ? 'active' : ''}"
                            @click="${() => this.setFilterType('all')}">
                            All
                        </button>
                        <button
                            class="filter-btn ${this.filterType === 'decision' ? 'active' : ''}"
                            @click="${() => this.setFilterType('decision')}">
                            Decisions
                        </button>
                        <button
                            class="filter-btn ${this.filterType === 'action' ? 'active' : ''}"
                            @click="${() => this.setFilterType('action')}">
                            Actions
                        </button>
                        <button
                            class="filter-btn ${this.filterType === 'deadline' ? 'active' : ''}"
                            @click="${() => this.setFilterType('deadline')}">
                            Deadlines
                        </button>
                        <button
                            class="filter-btn ${this.filterType === 'fact' ? 'active' : ''}"
                            @click="${() => this.setFilterType('fact')}">
                            📊 Facts
                        </button>
                    </div>

                    <div class="filter-group">
                        <button
                            class="filter-btn ${this.filterPriority === 'all' ? 'active' : ''}"
                            @click="${() => this.setFilterPriority('all')}">
                            All Priorities
                        </button>
                        <button
                            class="filter-btn ${this.filterPriority === 'high' ? 'active' : ''}"
                            @click="${() => this.setFilterPriority('high')}">
                            🔴 High
                        </button>
                        <button
                            class="filter-btn ${this.filterPriority === 'medium' ? 'active' : ''}"
                            @click="${() => this.setFilterPriority('medium')}">
                            🟡 Medium
                        </button>
                    </div>
                </div>

                <div class="insights-list">
                    ${filteredInsights.length > 0
                        ? filteredInsights.map(insight => this.renderInsight(insight))
                        : this.renderEmptyState()
                    }
                </div>

                ${this.showStats && this.statistics ? this.renderStatistics() : ''}
            </div>
        `;
    }

    renderInsight(insight) {
        const isNew = this.newInsightIds.has(insight.id);

        return html`
            <div class="insight-item priority-${insight.priority} ${isNew ? 'new' : ''}">
                <div class="insight-header">
                    <div class="insight-type">
                        <span class="insight-icon">${this.getInsightIcon(insight.type)}</span>
                        <div class="insight-title">${insight.title}</div>
                    </div>
                    <div class="insight-actions">
                        ${insight.sentiment ? html`
                            <span class="sentiment-badge" title="${insight.sentiment}">
                                ${this.getSentimentEmoji(insight.sentiment)}
                            </span>
                        ` : ''}
                        <button
                            class="dismiss-btn"
                            @click="${() => this.handleDismiss(insight.id)}"
                            title="Dismiss">
                            ✕
                        </button>
                    </div>
                </div>

                ${insight.content ? html`
                    <div class="insight-content">${insight.content}</div>
                ` : ''}

                ${insight.aiSuggestions && insight.aiSuggestions.length > 0 ? html`
                    <div class="ai-suggestions">
                        <div class="suggestions-label">💡 AI Suggestions:</div>
                        <ul class="suggestions-list">
                            ${insight.aiSuggestions.map(suggestion => html`
                                <li>${suggestion}</li>
                            `)}
                        </ul>
                    </div>
                ` : ''}

                <div class="insight-meta">
                    ${insight.speaker ? html`
                        <div class="insight-speaker">
                            <span>👤</span>
                            <span>${insight.speaker}</span>
                        </div>
                    ` : ''}
                    <div class="insight-time">
                        <span>🕐</span>
                        <span>${this.formatTimestamp(insight.timestamp)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return html`
            <div class="empty-state">
                <div class="empty-icon">💭</div>
                <div class="empty-text">
                    No insights detected yet.<br>
                    Start talking to see real-time insights!
                </div>
            </div>
        `;
    }

    renderStatistics() {
        const stats = this.statistics;

        return html`
            <div class="statistics">
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.total || 0}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.byPriority?.high || 0}</div>
                        <div class="stat-label">High Priority</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.byType?.decisions || 0}</div>
                        <div class="stat-label">Decisions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.byType?.actions || 0}</div>
                        <div class="stat-label">Actions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.byType?.facts || 0}</div>
                        <div class="stat-label">📊 Facts</div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('live-insights-panel', LiveInsightsPanel);
