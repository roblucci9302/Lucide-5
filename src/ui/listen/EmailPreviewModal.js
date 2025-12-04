import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Email Preview Modal
 * Displays generated follow-up emails with preview and copy functionality
 */
export class EmailPreviewModal extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
        }

        .modal-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            background: var(--color-gray-800);
            border-radius: var(--radius-lg);
            outline: 0.5px var(--color-white-20) solid;
            outline-offset: -1px;
            box-shadow: var(--shadow-lg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Header */
        .modal-header {
            padding: 16px;
            border-bottom: 1px solid var(--color-white-10);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-title {
            font-size: 14px;
            font-weight: 500;
            color: white;
            margin: 0;
        }

        .modal-subtitle {
            font-size: 11px;
            color: var(--color-white-60);
            margin: 4px 0 0 0;
        }

        .close-button {
            background: transparent;
            border: none;
            color: var(--color-white-70);
            cursor: pointer;
            padding: 4px;
            font-size: 18px;
            line-height: 1;
            transition: color 0.15s ease;
        }

        .close-button:hover {
            color: white;
        }

        /* Toolbar */
        .toolbar {
            padding: 12px 16px;
            border-bottom: 1px solid var(--color-white-10);
            display: flex;
            gap: 8px;
            align-items: center;
            background: var(--color-black-10);
        }

        .toolbar-group {
            display: flex;
            gap: 4px;
        }

        .toolbar-button {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            color: white;
            padding: 6px 12px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .toolbar-button:hover {
            background: var(--color-white-15);
            border-color: var(--color-white-30);
        }

        .toolbar-button.active {
            background: var(--color-primary-500);
            border-color: var(--color-primary-600);
        }

        .toolbar-spacer {
            flex: 1;
        }

        /* Content */
        .modal-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        .modal-content::-webkit-scrollbar {
            width: var(--scrollbar-width);
        }

        .modal-content::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        /* Email Fields */
        .email-field {
            margin-bottom: 12px;
        }

        .email-label {
            display: block;
            font-size: 10px;
            font-weight: 500;
            color: var(--color-white-70);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .email-input {
            width: 100%;
            background: var(--color-black-30);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 11px;
            color: white;
            transition: all 0.15s ease;
            box-sizing: border-box;
        }

        .email-input:focus {
            outline: none;
            border-color: var(--color-primary-500);
            background: var(--color-black-40);
        }

        .email-input::placeholder {
            color: var(--color-white-40);
        }

        /* Email Preview */
        .email-preview {
            background: white;
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            padding: 16px;
            min-height: 300px;
            color: #333;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            user-select: text;
        }

        .email-preview.text-mode {
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
        }

        .email-preview h1, .email-preview h2, .email-preview h3 {
            margin-top: 16px;
            margin-bottom: 8px;
            color: #222;
        }

        .email-preview ul, .email-preview ol {
            margin-left: 20px;
            margin-bottom: 12px;
        }

        .email-preview p {
            margin-bottom: 12px;
        }

        /* Recipients */
        .recipients-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 8px;
            background: var(--color-black-30);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            min-height: 36px;
        }

        .recipient-tag {
            background: var(--color-primary-500);
            border: 1px solid var(--color-primary-600);
            border-radius: 12px;
            padding: 4px 10px;
            font-size: 10px;
            color: white;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .recipient-remove {
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.15s ease;
        }

        .recipient-remove:hover {
            opacity: 1;
        }

        /* Footer */
        .modal-footer {
            padding: 12px 16px;
            border-top: 1px solid var(--color-white-10);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }

        .button {
            padding: 8px 16px;
            font-size: 11px;
            font-weight: 500;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
        }

        .button:active {
            transform: translateY(1px);
        }

        .button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .button-secondary {
            background: transparent;
            border-color: var(--color-white-20);
            color: var(--color-white-80);
        }

        .button-secondary:hover:not(:disabled) {
            background: var(--color-white-10);
            color: white;
        }

        .button-primary {
            background: var(--color-primary-500);
            border-color: var(--color-primary-600);
            color: white;
        }

        .button-primary:hover:not(:disabled) {
            background: var(--color-primary-600);
        }

        .button-success {
            background: var(--color-success-500);
            border-color: var(--color-success-600);
            color: white;
        }

        .button-success:hover:not(:disabled) {
            background: var(--color-success-600);
        }

        /* Loading State */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: var(--color-white-50);
            font-size: 11px;
        }

        .spinner {
            border: 2px solid var(--color-white-20);
            border-top-color: var(--color-primary-500);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 0.8s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Success Message */
        .success-message {
            background: color-mix(in srgb, var(--color-success-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-success-500) 30%, transparent);
            color: var(--color-success-400);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            margin-bottom: 12px;
        }
    `;

    static properties = {
        sessionId: { type: String },
        emailData: { type: Object },
        isLoading: { type: Boolean },
        viewMode: { type: String }, // 'text' or 'html'
        copiedMessage: { type: String }
    };

    constructor() {
        super();
        this.sessionId = null;
        this.emailData = null;
        this.isLoading = false;
        this.viewMode = 'html';
        this.copiedMessage = '';
    }

    handleViewModeToggle(mode) {
        this.viewMode = mode;
    }

    async handleCopyToClipboard() {
        try {
            const content = this.viewMode === 'html' ? this.emailData.bodyHtml : this.emailData.body;
            await window.api.email.copyToClipboard(content, this.viewMode);

            this.copiedMessage = '✅ Email copié dans le presse-papier';
            setTimeout(() => { this.copiedMessage = ''; }, 3000);
        } catch (error) {
            console.error('[EmailPreviewModal] Error copying to clipboard:', error);
            this.copiedMessage = '❌ Erreur lors de la copie';
            setTimeout(() => { this.copiedMessage = ''; }, 3000);
        }
    }

    async handleOpenInMailClient() {
        try {
            await window.api.email.openInMailClient(this.emailData);

            this.copiedMessage = '✅ Email ouvert dans le client par défaut';
            setTimeout(() => { this.copiedMessage = ''; }, 3000);
        } catch (error) {
            console.error('[EmailPreviewModal] Error opening mail client:', error);
            this.copiedMessage = '❌ Erreur lors de l\'ouverture';
            setTimeout(() => { this.copiedMessage = ''; }, 3000);
        }
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    handleSubjectChange(e) {
        this.emailData = {
            ...this.emailData,
            subject: e.target.value
        };
    }

    renderRecipients() {
        if (!this.emailData || !this.emailData.to) return '';

        return html`
            <div class="email-field">
                <label class="email-label">Destinataires</label>
                <div class="recipients-list">
                    ${this.emailData.to.map(recipient => html`
                        <div class="recipient-tag">
                            <span>${recipient.name || recipient.email || recipient}</span>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    /**
     * FIX CRITICAL: Sanitize HTML content to prevent XSS attacks
     * @param {string} htmlContent - Raw HTML content
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(htmlContent) {
        if (!htmlContent) return '';

        // Use DOMPurify if available
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(htmlContent, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'span', 'div'],
                ALLOWED_ATTR: ['href', 'title', 'class', 'style'],
                ALLOW_DATA_ATTR: false
            });
        }

        // Fallback: basic HTML entity escaping
        console.warn('[EmailPreviewModal] DOMPurify not available, using basic escaping');
        const div = document.createElement('div');
        div.textContent = htmlContent;
        return div.innerHTML;
    }

    renderPreview() {
        if (!this.emailData) return '';

        const content = this.viewMode === 'html' ? this.emailData.bodyHtml : this.emailData.body;

        if (this.viewMode === 'html') {
            // FIX CRITICAL: Sanitize HTML before rendering to prevent XSS
            const sanitizedContent = this.sanitizeHtml(content);
            return html`
                <div class="email-preview" .innerHTML=${sanitizedContent}></div>
            `;
        } else {
            return html`
                <div class="email-preview text-mode">${content}</div>
            `;
        }
    }

    render() {
        return html`
            <div class="modal-container" @click=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <div>
                        <h2 class="modal-title">📧 Prévisualisation de l'email</h2>
                        <p class="modal-subtitle">
                            ${this.emailData?.metadata?.template || 'Email de suivi'}
                        </p>
                    </div>
                    <button class="close-button" @click=${this.handleClose}>✕</button>
                </div>

                <div class="toolbar">
                    <div class="toolbar-group">
                        <button
                            class="toolbar-button ${this.viewMode === 'html' ? 'active' : ''}"
                            @click=${() => this.handleViewModeToggle('html')}
                        >
                            🎨 HTML
                        </button>
                        <button
                            class="toolbar-button ${this.viewMode === 'text' ? 'active' : ''}"
                            @click=${() => this.handleViewModeToggle('text')}
                        >
                            📝 Texte brut
                        </button>
                    </div>

                    <div class="toolbar-spacer"></div>

                    <button class="toolbar-button" @click=${this.handleCopyToClipboard}>
                        📋 Copier
                    </button>
                    <button class="toolbar-button" @click=${this.handleOpenInMailClient}>
                        📬 Ouvrir client email
                    </button>
                </div>

                <div class="modal-content">
                    ${this.copiedMessage ? html`
                        <div class="success-message">${this.copiedMessage}</div>
                    ` : ''}

                    ${this.isLoading ? html`
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Génération de l'email en cours...</p>
                        </div>
                    ` : html`
                        <div class="email-field">
                            <label class="email-label">Sujet</label>
                            <input
                                type="text"
                                class="email-input"
                                .value=${this.emailData?.subject || ''}
                                @input=${this.handleSubjectChange}
                                placeholder="Objet de l'email"
                            />
                        </div>

                        ${this.renderRecipients()}

                        <div class="email-field">
                            <label class="email-label">Aperçu du message</label>
                            ${this.renderPreview()}
                        </div>
                    `}
                </div>

                <div class="modal-footer">
                    <button
                        class="button button-secondary"
                        @click=${this.handleClose}
                    >
                        Fermer
                    </button>

                    <button
                        class="button button-success"
                        @click=${this.handleCopyToClipboard}
                        ?disabled=${this.isLoading || !this.emailData}
                    >
                        📋 Copier et fermer
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('email-preview-modal', EmailPreviewModal);
