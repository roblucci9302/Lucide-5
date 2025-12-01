import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * CitationView - Displays sources cited in AI responses
 *
 * Shows documents from the knowledge base that were used to generate
 * the AI's response, with relevance scores and click-to-open functionality.
 */
export class CitationView extends LitElement {
    static properties = {
        citations: { type: Array },
        sessionId: { type: String },
        isLoading: { type: Boolean },
        collapsed: { type: Boolean, state: true }
    };

    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            margin-top: 12px;
        }

        .citations-container {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: var(--radius-md);
            overflow: hidden;
        }

        .citations-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--color-white-05);
            border-bottom: 1px solid var(--color-white-10);
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .citations-header:hover {
            background: var(--color-white-08);
        }

        .citations-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 500;
            color: var(--color-white-70);
        }

        .citations-icon {
            font-size: 13px;
        }

        .citations-count {
            background: rgba(0, 122, 255, 0.2);
            color: rgba(0, 122, 255, 0.9);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }

        .citations-toggle {
            font-size: 12px;
            color: var(--color-white-50);
            transition: transform 0.2s ease;
        }

        .citations-toggle.expanded {
            transform: rotate(180deg);
        }

        .citations-list {
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 300px;
            overflow-y: auto;
        }

        .citations-list.collapsed {
            display: none;
        }

        .citation-item {
            background: var(--color-white-05);
            border: 1px solid var(--color-white-10);
            border-radius: 6px;
            padding: 8px 10px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .citation-item:hover {
            background: var(--color-white-10);
            border-color: rgba(0, 122, 255, 0.4);
            transform: translateX(2px);
        }

        .citation-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .citation-title {
            font-size: 11px;
            font-weight: 500;
            color: var(--color-white-90);
            flex: 1;
            line-height: 1.3;
        }

        .citation-score {
            display: flex;
            align-items: center;
            gap: 3px;
            font-size: 10px;
            color: rgba(0, 255, 0, 0.8);
            white-space: nowrap;
            margin-left: 8px;
        }

        .citation-filename {
            font-size: 10px;
            color: var(--color-white-50);
            font-family: var(--font-family-mono);
            margin-top: 2px;
        }

        .citation-preview {
            font-size: 10px;
            color: var(--color-white-60);
            margin-top: 4px;
            line-height: 1.4;
            max-height: 40px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .loading-state {
            padding: 12px;
            text-align: center;
            font-size: 11px;
            color: var(--color-white-50);
        }

        .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid var(--color-white-20);
            border-top-color: rgba(0, 122, 255, 0.8);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .empty-state {
            padding: 12px;
            text-align: center;
            font-size: 11px;
            color: var(--color-white-40);
        }

        /* Scrollbar styling */
        .citations-list::-webkit-scrollbar {
            width: 6px;
        }

        .citations-list::-webkit-scrollbar-track {
            background: var(--color-black-20);
            border-radius: 3px;
        }

        .citations-list::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 3px;
        }

        .citations-list::-webkit-scrollbar-thumb:hover {
            background: var(--color-white-30);
        }
    `;

    constructor() {
        super();
        this.citations = [];
        this.sessionId = null;
        this.isLoading = false;
        this.collapsed = false;
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.sessionId) {
            this.loadCitations();
        }
    }

    async loadCitations() {
        if (!window.api || !this.sessionId) return;

        this.isLoading = true;
        this.requestUpdate();

        try {
            const citations = await window.api.rag.getSessionCitations(this.sessionId);
            this.citations = citations || [];
            console.log(`[CitationView] Loaded ${this.citations.length} citations for session ${this.sessionId}`);
        } catch (error) {
            console.error('[CitationView] Error loading citations:', error);
            this.citations = [];
        } finally {
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    toggleCollapse() {
        this.collapsed = !this.collapsed;
    }

    handleCitationClick(citation) {
        console.log('[CitationView] Citation clicked:', citation);

        // TODO: Open document in knowledge base manager
        // For now, just log the click
        alert(`Document: ${citation.document_title}\nFilename: ${citation.document_filename}\nRelevance: ${Math.round(citation.relevance_score * 100)}%`);
    }

    formatScore(score) {
        return `${Math.round(score * 100)}%`;
    }

    truncateText(text, maxLength = 150) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    render() {
        if (this.isLoading) {
            return html`
                <div class="citations-container">
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <div style="margin-top: 8px;">Chargement des sources...</div>
                    </div>
                </div>
            `;
        }

        if (!this.citations || this.citations.length === 0) {
            return html``;  // Don't show anything if no citations
        }

        return html`
            <div class="citations-container">
                <div class="citations-header" @click=${this.toggleCollapse}>
                    <div class="citations-title">
                        <span class="citations-icon">📚</span>
                        <span>Sources utilisées</span>
                        <span class="citations-count">${this.citations.length}</span>
                    </div>
                    <div class="citations-toggle ${this.collapsed ? '' : 'expanded'}">
                        ▼
                    </div>
                </div>

                <div class="citations-list ${this.collapsed ? 'collapsed' : ''}">
                    ${this.citations.map(citation => html`
                        <div class="citation-item" @click=${() => this.handleCitationClick(citation)}>
                            <div class="citation-header">
                                <div class="citation-title">
                                    ${citation.document_title || 'Untitled Document'}
                                </div>
                                <div class="citation-score">
                                    <span>✓</span>
                                    <span>${this.formatScore(citation.relevance_score)}</span>
                                </div>
                            </div>
                            <div class="citation-filename">
                                ${citation.document_filename || 'unknown.txt'}
                            </div>
                            ${citation.context_used ? html`
                                <div class="citation-preview">
                                    ${this.truncateText(citation.context_used)}
                                </div>
                            ` : ''}
                        </div>
                    `)}
                </div>
            </div>
        `;
    }
}

customElements.define('citation-view', CitationView);
