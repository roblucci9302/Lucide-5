import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * AttachmentBubble - Displays uploaded files in conversation
 *
 * Shows attached documents with preview, size, type, and actions
 */
export class AttachmentBubble extends LitElement {
    static properties = {
        attachments: { type: Array },
        analyzing: { type: Boolean }
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
            margin-bottom: 8px;
        }

        .attachments-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .attachment-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            transition: all 0.2s ease;
        }

        .attachment-item.analyzing {
            background: rgba(255, 200, 0, 0.1);
            border-color: rgba(255, 200, 0, 0.3);
        }

        .attachment-item.error {
            background: rgba(255, 59, 48, 0.1);
            border-color: rgba(255, 59, 48, 0.3);
        }

        .attachment-icon {
            font-size: 24px;
            flex-shrink: 0;
        }

        .attachment-info {
            flex: 1;
            min-width: 0;
        }

        .attachment-name {
            font-size: 12px;
            font-weight: 500;
            color: var(--color-white-90);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .attachment-meta {
            font-size: 10px;
            color: var(--color-white-60);
            margin-top: 2px;
        }

        .attachment-status {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(52, 199, 89, 0.2);
            color: rgba(52, 199, 89, 1);
            white-space: nowrap;
        }

        .attachment-status.analyzing {
            background: rgba(255, 200, 0, 0.2);
            color: rgba(255, 200, 0, 1);
        }

        .attachment-status.error {
            background: rgba(255, 59, 48, 0.2);
            color: rgba(255, 59, 48, 1);
        }

        .remove-btn {
            background: transparent;
            border: none;
            color: var(--color-white-50);
            font-size: 16px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.15s ease;
            flex-shrink: 0;
        }

        .remove-btn:hover {
            background: rgba(255, 59, 48, 0.2);
            color: rgba(255, 59, 48, 1);
        }

        .spinner {
            display: inline-block;
            width: 10px;
            height: 10px;
            border: 2px solid rgba(255, 200, 0, 0.3);
            border-top-color: rgba(255, 200, 0, 1);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            margin-right: 4px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    constructor() {
        super();
        this.attachments = [];
        this.analyzing = false;
    }

    getFileIcon(type) {
        const iconMap = {
            'pdf': '📄',
            'docx': '📝',
            'doc': '📝',
            'txt': '📃',
            'md': '📋',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'default': '📎'
        };
        return iconMap[type?.toLowerCase()] || iconMap.default;
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    handleRemove(attachment) {
        this.dispatchEvent(new CustomEvent('remove-attachment', {
            detail: { attachment },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this.attachments || this.attachments.length === 0) {
            return html``;
        }

        return html`
            <div class="attachments-container">
                ${this.attachments.map(attachment => html`
                    <div class="attachment-item ${attachment.status === 'analyzing' ? 'analyzing' : ''} ${attachment.status === 'error' ? 'error' : ''}">
                        <div class="attachment-icon">
                            ${this.getFileIcon(attachment.type)}
                        </div>
                        <div class="attachment-info">
                            <div class="attachment-name">${attachment.name}</div>
                            <div class="attachment-meta">
                                ${this.formatFileSize(attachment.size)} • ${attachment.type?.toUpperCase() || 'Unknown'}
                            </div>
                        </div>
                        <div class="attachment-status ${attachment.status || ''}">
                            ${attachment.status === 'analyzing' ? html`
                                <span class="spinner"></span>Analyse...
                            ` : attachment.status === 'error' ? html`
                                ✗ Erreur
                            ` : html`
                                ✓ Analysé
                            `}
                        </div>
                        <button class="remove-btn" @click=${() => this.handleRemove(attachment)} title="Retirer">
                            ✕
                        </button>
                    </div>
                `)}
            </div>
        `;
    }
}

customElements.define('attachment-bubble', AttachmentBubble);
