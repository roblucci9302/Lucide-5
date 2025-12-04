import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

/**
 * ResponseView - Displays real-time AI response suggestions
 *
 * Shows 2-3 suggested responses the user could say next in the conversation.
 * Updates automatically when the user finishes speaking.
 */
export class ResponseView extends LitElement {
    static properties = {
        suggestions: { type: Array },
        loading: { type: Boolean },
        error: { type: String },
        visible: { type: Boolean }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            background: color-mix(in srgb, var(--color-gray-900) 95%, transparent);
            backdrop-filter: blur(20px);
        }

        .response-container {
            padding: 16px;
            height: 100%;
            box-sizing: border-box;
        }

        .response-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .response-icon {
            font-size: 18px;
        }

        .response-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--color-white-90);
        }

        .response-subtitle {
            font-size: 11px;
            color: var(--color-white-50);
            margin-top: 2px;
        }

        .suggestions-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .suggestion-card {
            padding: 12px 14px;
            background: color-mix(in srgb, var(--color-primary-500) 8%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-primary-500) 20%, transparent);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all var(--transition-base) var(--easing-ease);
            position: relative;
            overflow: hidden;
        }

        .suggestion-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary-500) 10%, transparent) 0%, color-mix(in srgb, var(--profile-accent) 5%, transparent) 100%);
            opacity: 0;
            transition: opacity var(--transition-base) var(--easing-ease);
        }

        .suggestion-card:hover {
            background: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
            border-color: color-mix(in srgb, var(--color-primary-500) 40%, transparent);
            transform: translateY(-2px);
        }

        .suggestion-card:hover::before {
            opacity: 1;
        }

        .suggestion-card:active {
            transform: translateY(0);
        }

        .suggestion-number {
            display: inline-block;
            width: 20px;
            height: 20px;
            background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
            color: color-mix(in srgb, var(--profile-accent-light) 90%, transparent);
            border-radius: var(--radius-full);
            font-size: 11px;
            font-weight: 600;
            line-height: 20px;
            text-align: center;
            margin-right: 10px;
            flex-shrink: 0;
        }

        .suggestion-text {
            font-size: 13px;
            line-height: 1.5;
            color: var(--color-white-85);
            position: relative;
            user-select: text;
        }

        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 16px;
            text-align: center;
        }

        .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid color-mix(in srgb, var(--color-primary-500) 20%, transparent);
            border-top-color: color-mix(in srgb, var(--color-primary-500) 80%, transparent);
            border-radius: var(--radius-full);
            animation: spin var(--animation-slower) linear infinite;
        }

        .loading-text {
            margin-top: 12px;
            font-size: 12px;
            color: var(--color-white-60);
        }

        .error-state {
            padding: 16px;
            background: color-mix(in srgb, var(--color-error-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-error-500) 30%, transparent);
            border-radius: var(--radius-md);
            color: color-mix(in srgb, var(--color-error-400) 90%, transparent);
            font-size: 12px;
            line-height: 1.5;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 16px;
            text-align: center;
            height: 200px;
        }

        .empty-icon {
            font-size: 48px;
            opacity: 0.3;
            margin-bottom: 12px;
        }

        .empty-text {
            font-size: 13px;
            color: var(--color-white-50);
            line-height: 1.5;
        }

        .copy-feedback {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: color-mix(in srgb, var(--color-success-500) 95%, transparent);
            color: white;
            padding: 12px 20px;
            border-radius: var(--radius-md);
            font-size: 13px;
            font-weight: 500;
            opacity: 0;
            pointer-events: none;
            animation: copyFeedback 1.5s var(--easing-ease);
            z-index: 1000;
        }
    `;

    constructor() {
        super();
        this.suggestions = [];
        this.loading = false;
        this.error = null;
        this.visible = true;
        this.setupIpcListeners();
    }

    setupIpcListeners() {
        // Listen for when AI suggestion generation starts
        window.api?.responseView?.onAiResponseGenerating?.((event, data) => {
            console.log('[ResponseView] AI suggestion generation started:', data);
            this.loading = true;
            this.error = null;
            this.requestUpdate();
        });

        // Listen for AI response suggestions
        window.api?.responseView?.onAiResponseReady?.((event, data) => {
            console.log('[ResponseView] Received AI suggestions:', data);
            this.loading = false;
            this.suggestions = data.suggestions || [];
            this.error = null;
            this.requestUpdate();
        });

        window.api?.responseView?.onAiResponseError?.((event, data) => {
            console.error('[ResponseView] AI response error:', data);
            this.loading = false;
            this.error = data.error || 'Failed to generate suggestions';
            this.requestUpdate();
        });

        // Listen for session state changes
        window.api?.responseView?.onSessionStateChanged?.((event, state) => {
            console.log('[ResponseView] Session state changed:', state);
            if (!state.isActive) {
                // Clear suggestions when session ends
                this.suggestions = [];
                this.loading = false;
                this.error = null;
                this.requestUpdate();
            }
        });
    }

    handleSuggestionClick(suggestion, index) {
        console.log(`[ResponseView] Suggestion ${index + 1} clicked:`, suggestion);

        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(suggestion).then(() => {
                this.showCopyFeedback();
            }).catch(err => {
                console.error('[ResponseView] Failed to copy:', err);
            });
        }

        // Could also trigger TTS or other actions here
    }

    showCopyFeedback() {
        const feedback = this.shadowRoot.querySelector('.copy-feedback');
        if (feedback) {
            feedback.style.animation = 'none';
            // Trigger reflow
            feedback.offsetHeight;
            feedback.style.animation = 'copyFeedback 1.5s ease';
        }
    }

    render() {
        return html`
            <div class="response-container">
                <div class="response-header">
                    <span class="response-icon">💬</span>
                    <div>
                        <div class="response-title">Suggestions de réponse IA</div>
                        <div class="response-subtitle">Cliquez pour copier</div>
                    </div>
                </div>

                ${this.renderContent()}
            </div>

            <div class="copy-feedback">✓ Copié dans le presse-papiers</div>
        `;
    }

    renderContent() {
        if (this.loading) {
            return html`
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Génération des suggestions en cours...</div>
                </div>
            `;
        }

        if (this.error) {
            return html`
                <div class="error-state">
                    <strong>⚠️ Erreur:</strong><br>
                    ${this.error}
                </div>
            `;
        }

        if (this.suggestions.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">💭</div>
                    <div class="empty-text">
                        Parlez pour obtenir des<br>suggestions de réponse IA
                    </div>
                </div>
            `;
        }

        return html`
            <div class="suggestions-list">
                ${this.suggestions.map((suggestion, index) => html`
                    <div
                        class="suggestion-card"
                        @click="${() => this.handleSuggestionClick(suggestion, index)}"
                    >
                        <span class="suggestion-number">${index + 1}</span>
                        <span class="suggestion-text">${suggestion}</span>
                    </div>
                `)}
            </div>
        `;
    }
}

customElements.define('response-view', ResponseView);
