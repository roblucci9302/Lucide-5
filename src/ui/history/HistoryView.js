import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class HistoryView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 320px;
            height: 100%;
            color: white;
        }

        .history-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: var(--color-gray-800);
            border-radius: var(--radius-lg);
            outline: 0.5px var(--color-white-20) solid;
            outline-offset: -1px;
            box-sizing: border-box;
            overflow: hidden;
        }

        .history-container::before {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: var(--shadow-lg);
            border-radius: var(--radius-lg);
            filter: blur(10px);
            z-index: -1;
        }

        .header {
            padding: 16px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .header h2 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
            color: white;
        }

        .stats {
            font-size: 11px;
            color: var(--color-white-60);
        }

        .search-box {
            padding: 12px 16px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .search-input {
            width: 100%;
            padding: 8px 12px;
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 8px;
            color: white;
            font-size: 12px;
            outline: none;
        }

        .search-input::placeholder {
            color: var(--color-white-40);
        }

        .search-input:focus {
            background: var(--color-white-15);
            border-color: rgba(100, 150, 255, 0.5);
        }

        .filters {
            padding: 12px 16px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--color-white-10);
        }

        .filter-btn {
            padding: 4px 10px;
            background: var(--color-white-5);
            border: 1px solid var(--color-white-20);
            border-radius: var(--radius-lg);
            font-size: 10px;
            color: var(--color-white-70);
            cursor: pointer;
            transition: all 0.2s;
        }

        .filter-btn.active {
            background: rgba(100, 150, 255, 0.3);
            border-color: rgba(100, 150, 255, 0.5);
            color: white;
        }

        .filter-btn:hover {
            background: var(--color-white-10);
        }

        .sessions-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .sessions-list::-webkit-scrollbar {
            width: 6px;
        }

        .sessions-list::-webkit-scrollbar-track {
            background: var(--color-white-5);
            border-radius: 4px;
        }

        .sessions-list::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 4px;
        }

        .session-item {
            padding: 12px;
            margin-bottom: 6px;
            background: var(--color-white-5);
            border: 1px solid var(--color-white-10);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .session-item:hover {
            background: var(--color-white-10);
            border-color: var(--color-white-20);
        }

        .session-item.active {
            background: rgba(100, 150, 255, 0.2);
            border-color: rgba(100, 150, 255, 0.4);
        }

        .session-title {
            font-size: 12px;
            font-weight: 500;
            color: white;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .session-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 10px;
            color: var(--color-white-50);
            margin-bottom: 4px;
        }

        .session-profile {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 2px 6px;
            background: var(--color-white-10);
            border-radius: 8px;
            font-size: 9px;
        }

        .session-tags {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 6px;
        }

        .tag {
            padding: 2px 6px;
            background: rgba(100, 200, 100, 0.2);
            border: 1px solid rgba(100, 200, 100, 0.3);
            border-radius: 8px;
            font-size: 9px;
            color: rgba(150, 255, 150, 0.9);
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--color-white-50);
            font-size: 12px;
            text-align: center;
            padding: 32px;
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.3;
        }

        .loading {
            text-align: center;
            padding: 32px;
            color: var(--color-white-50);
            font-size: 12px;
        }

        .session-actions {
            display: flex;
            gap: 4px;
            margin-top: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .session-item:hover .session-actions {
            opacity: 1;
        }

        .export-btn {
            flex: 1;
            padding: 4px 8px;
            background: rgba(100, 150, 255, 0.2);
            border: 1px solid rgba(100, 150, 255, 0.3);
            border-radius: 4px;
            color: rgba(150, 200, 255, 0.9);
            font-size: 9px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }

        .export-btn:hover {
            background: rgba(100, 150, 255, 0.3);
            border-color: rgba(100, 150, 255, 0.5);
            transform: translateY(-1px);
        }

        .export-btn:active {
            transform: translateY(0);
        }

        .export-btn.json { border-color: rgba(100, 200, 100, 0.3); background: rgba(100, 200, 100, 0.2); color: rgba(150, 255, 150, 0.9); }
        .export-btn.md { border-color: rgba(255, 200, 100, 0.3); background: rgba(255, 200, 100, 0.2); color: rgba(255, 220, 150, 0.9); }
        .export-btn.pdf { border-color: rgba(255, 100, 100, 0.3); background: rgba(255, 100, 100, 0.2); color: rgba(255, 150, 150, 0.9); }
        .export-btn.docx { border-color: rgba(100, 150, 255, 0.3); background: rgba(100, 150, 255, 0.2); color: rgba(150, 200, 255, 0.9); }

        .export-btn.json:hover { background: rgba(100, 200, 100, 0.3); border-color: rgba(100, 200, 100, 0.5); }
        .export-btn.md:hover { background: rgba(255, 200, 100, 0.3); border-color: rgba(255, 200, 100, 0.5); }
        .export-btn.pdf:hover { background: rgba(255, 100, 100, 0.3); border-color: rgba(255, 100, 100, 0.5); }
        .export-btn.docx:hover { background: rgba(100, 150, 255, 0.3); border-color: rgba(100, 150, 255, 0.5); }

        .exporting {
            opacity: 0.5;
            pointer-events: none;
        }
    `;

    static properties = {
        sessions: { type: Array, state: true },
        stats: { type: Object, state: true },
        searchQuery: { type: String, state: true },
        activeFilters: { type: Array, state: true },
        selectedSession: { type: String, state: true },
        isLoading: { type: Boolean, state: true },
        exportingSession: { type: String, state: true }
    };

    constructor() {
        super();
        this.sessions = [];
        this.stats = { total_sessions: 0, total_messages: 0 };
        this.searchQuery = '';
        this.activeFilters = [];
        this.selectedSession = null;
        this.isLoading = true;
        this.exportingSession = null;

        this.loadHistory();
    }

    async loadHistory() {
        if (!window.api) return;

        this.isLoading = true;

        try {
            const [sessions, stats] = await Promise.all([
                window.api.history.getAllSessions(),
                window.api.history.getStats()
            ]);

            this.sessions = sessions || [];
            this.stats = stats || { total_sessions: 0, total_messages: 0 };
        } catch (error) {
            console.error('Error loading history:', error);
        }

        this.isLoading = false;
    }

    async handleSearch(e) {
        this.searchQuery = e.target.value;

        if (this.searchQuery.length === 0) {
            await this.loadHistory();
            return;
        }

        if (this.searchQuery.length < 2) return;

        try {
            const results = await window.api.history.searchSessions(
                this.searchQuery,
                { tags: this.activeFilters }
            );
            this.sessions = results || [];
        } catch (error) {
            console.error('Error searching:', error);
        }
    }

    toggleFilter(profileId) {
        if (this.activeFilters.includes(profileId)) {
            this.activeFilters = this.activeFilters.filter(f => f !== profileId);
        } else {
            this.activeFilters = [...this.activeFilters, profileId];
        }

        // Re-run search with new filters
        if (this.searchQuery.length > 0) {
            this.handleSearch({ target: { value: this.searchQuery } });
        }
    }

    selectSession(sessionId) {
        this.selectedSession = sessionId;

        // Notify parent or emit event
        this.dispatchEvent(new CustomEvent('session-selected', {
            detail: { sessionId },
            bubbles: true,
            composed: true
        }));
    }

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Aujourd\'hui';
        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays} jours`;

        return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    }

    getProfileIcon(profileId) {
        const icons = {
            'lucide_assistant': '🤖',
            'hr_specialist': '👩‍💼',
            'it_expert': '💻',
            'marketing_expert': '📱'
        };
        return icons[profileId] || '🤖';
    }

    getProfileName(profileId) {
        const names = {
            'lucide_assistant': 'Général',
            'hr_specialist': 'RH',
            'it_expert': 'IT',
            'marketing_expert': 'Marketing'
        };
        return names[profileId] || 'Général';
    }

    async handleExport(sessionId, format, event) {
        // Prevent session selection when clicking export buttons
        if (event) {
            event.stopPropagation();
        }

        if (!window.api || !window.api.export) {
            console.error('[HistoryView] Export API not available');
            alert('La fonctionnalité d\'export n\'est pas disponible');
            return;
        }

        this.exportingSession = sessionId;

        try {
            let result;

            switch (format) {
                case 'json':
                    result = await window.api.export.toJSON(sessionId);
                    break;
                case 'markdown':
                    result = await window.api.export.toMarkdown(sessionId);
                    break;
                case 'pdf':
                    result = await window.api.export.toPDF(sessionId);
                    break;
                case 'docx':
                    result = await window.api.export.toDOCX(sessionId);
                    break;
                default:
                    throw new Error(`Format d'export non supporté: ${format}`);
            }

            if (result && result.success) {
                console.log(`[HistoryView] Export ${format} successful:`, result.filePath);
                // Could show a success notification here
            } else if (result && result.cancelled) {
                console.log('[HistoryView] Export cancelled by user');
            } else {
                throw new Error(result.error || 'Export failed');
            }
        } catch (error) {
            console.error(`[HistoryView] Error exporting to ${format}:`, error);
            alert(`Erreur lors de l'export: ${error.message}`);
        } finally {
            this.exportingSession = null;
        }
    }

    render() {
        if (this.isLoading) {
            return html`
                <div class="history-container">
                    <div class="loading">
                        Chargement de l'historique...
                    </div>
                </div>
            `;
        }

        return html`
            <div class="history-container">
                <div class="header">
                    <h2>📚 Historique</h2>
                    <div class="stats">
                        ${this.stats.total_sessions} conversations • ${this.stats.total_messages} messages
                    </div>
                </div>

                <div class="search-box">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Rechercher dans les conversations..."
                        .value=${this.searchQuery}
                        @input=${this.handleSearch}
                    />
                </div>

                <div class="filters">
                    ${['hr_specialist', 'it_expert', 'marketing_expert'].map(profileId => html`
                        <button
                            class="filter-btn ${this.activeFilters.includes(profileId) ? 'active' : ''}"
                            @click=${() => this.toggleFilter(profileId)}
                        >
                            ${this.getProfileIcon(profileId)} ${this.getProfileName(profileId)}
                        </button>
                    `)}
                </div>

                <div class="sessions-list">
                    ${this.sessions.length === 0 ? html`
                        <div class="empty-state">
                            <div class="empty-icon">💬</div>
                            <div>Aucune conversation${this.searchQuery ? ' trouvée' : ''}</div>
                            ${this.searchQuery ? html`
                                <div style="margin-top: 8px; font-size: 10px;">
                                    Essayez une autre recherche
                                </div>
                            ` : ''}
                        </div>
                    ` : this.sessions.map(session => html`
                        <div
                            class="session-item ${this.selectedSession === session.id ? 'active' : ''} ${this.exportingSession === session.id ? 'exporting' : ''}"
                            @click=${() => this.selectSession(session.id)}
                        >
                            <div class="session-title">${session.title || 'Sans titre'}</div>
                            <div class="session-meta">
                                <span>${this.formatDate(session.updated_at)}</span>
                                •
                                <span>${session.actual_message_count || session.message_count || 0} messages</span>
                                ${session.agent_profile ? html`
                                    <span class="session-profile">
                                        ${this.getProfileIcon(session.agent_profile)}
                                        ${this.getProfileName(session.agent_profile)}
                                    </span>
                                ` : ''}
                            </div>
                            ${session.tags && session.tags.length > 0 ? html`
                                <div class="session-tags">
                                    ${session.tags.map(tag => html`
                                        <span class="tag">${tag}</span>
                                    `)}
                                </div>
                            ` : ''}
                            <div class="session-actions">
                                <button
                                    class="export-btn json"
                                    @click=${(e) => this.handleExport(session.id, 'json', e)}
                                    title="Export JSON"
                                >
                                    📋 JSON
                                </button>
                                <button
                                    class="export-btn md"
                                    @click=${(e) => this.handleExport(session.id, 'markdown', e)}
                                    title="Export Markdown"
                                >
                                    📝 MD
                                </button>
                                <button
                                    class="export-btn pdf"
                                    @click=${(e) => this.handleExport(session.id, 'pdf', e)}
                                    title="Export PDF"
                                >
                                    📄 PDF
                                </button>
                                <button
                                    class="export-btn docx"
                                    @click=${(e) => this.handleExport(session.id, 'docx', e)}
                                    title="Export DOCX"
                                >
                                    📘 DOCX
                                </button>
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }
}

customElements.define('history-view', HistoryView);
