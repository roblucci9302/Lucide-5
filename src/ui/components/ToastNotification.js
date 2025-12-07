import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * ToastNotification - A modern toast notification system
 *
 * Usage:
 *   // Get or create the toast manager
 *   const toast = document.querySelector('toast-notification') || document.createElement('toast-notification');
 *   if (!toast.parentElement) document.body.appendChild(toast);
 *
 *   // Show notifications
 *   toast.show('Document uploadé avec succès', 'success');
 *   toast.show('Erreur lors de la suppression', 'error');
 *   toast.show('Chargement en cours...', 'info');
 *   toast.show('Attention: fichier volumineux', 'warning');
 *
 *   // For confirmations (returns Promise<boolean>)
 *   const confirmed = await toast.confirm('Supprimer ce document ?', 'Cette action est irréversible');
 */
export class ToastNotification extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary, -apple-system, BlinkMacSystemFont, sans-serif);
            box-sizing: border-box;
        }

        :host {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }

        .toast {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 18px;
            border-radius: 10px;
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            min-width: 280px;
            max-width: 420px;
            pointer-events: auto;
            animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            transition: all 0.3s ease;
        }

        .toast.exiting {
            animation: slideOut 0.25s ease forwards;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(100px) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }

        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(100px) scale(0.8);
            }
        }

        .toast-icon {
            font-size: 18px;
            flex-shrink: 0;
            margin-top: 1px;
        }

        .toast-content {
            flex: 1;
            min-width: 0;
        }

        .toast-message {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.95);
            line-height: 1.4;
            word-wrap: break-word;
        }

        .toast-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            margin: -4px -4px -4px 8px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.15s ease;
            flex-shrink: 0;
        }

        .toast-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
        }

        /* Toast types */
        .toast.success {
            border-color: rgba(52, 199, 89, 0.4);
        }
        .toast.success .toast-icon {
            color: rgb(52, 199, 89);
        }

        .toast.error {
            border-color: rgba(255, 69, 58, 0.4);
        }
        .toast.error .toast-icon {
            color: rgb(255, 69, 58);
        }

        .toast.warning {
            border-color: rgba(255, 159, 10, 0.4);
        }
        .toast.warning .toast-icon {
            color: rgb(255, 159, 10);
        }

        .toast.info {
            border-color: rgba(0, 122, 255, 0.4);
        }
        .toast.info .toast-icon {
            color: rgb(0, 122, 255);
        }

        /* Confirmation dialog */
        .confirm-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            pointer-events: auto;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .confirm-dialog {
            background: rgb(30, 30, 30);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 14px;
            padding: 24px;
            min-width: 320px;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes scaleIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .confirm-icon {
            font-size: 40px;
            text-align: center;
            margin-bottom: 16px;
        }

        .confirm-title {
            font-size: 17px;
            font-weight: 600;
            color: white;
            text-align: center;
            margin: 0 0 8px 0;
        }

        .confirm-message {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
            margin: 0 0 24px 0;
            line-height: 1.5;
        }

        .confirm-actions {
            display: flex;
            gap: 12px;
        }

        .confirm-btn {
            flex: 1;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
        }

        .confirm-btn.cancel {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .confirm-btn.cancel:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .confirm-btn.danger {
            background: rgba(255, 69, 58, 0.2);
            border-color: rgba(255, 69, 58, 0.4);
            color: rgb(255, 69, 58);
        }

        .confirm-btn.danger:hover {
            background: rgba(255, 69, 58, 0.3);
        }

        .confirm-btn.primary {
            background: rgba(0, 122, 255, 0.2);
            border-color: rgba(0, 122, 255, 0.4);
            color: rgb(0, 122, 255);
        }

        .confirm-btn.primary:hover {
            background: rgba(0, 122, 255, 0.3);
        }

        /* Progress toast */
        .toast.progress {
            border-color: rgba(0, 122, 255, 0.4);
        }

        .progress-bar-container {
            margin-top: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            height: 6px;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, rgb(0, 122, 255), rgb(88, 166, 255));
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .progress-text {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 6px;
            text-align: right;
        }

        /* Input dialog */
        .input-field {
            width: 100%;
            padding: 12px 14px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            margin-bottom: 20px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.15s ease;
        }

        .input-field:focus {
            border-color: rgba(0, 122, 255, 0.6);
        }

        .input-field::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }
    `;

    static properties = {
        toasts: { type: Array, state: true },
        confirmData: { type: Object, state: true },
        inputData: { type: Object, state: true }
    };

    constructor() {
        super();
        this.toasts = [];
        this.confirmData = null;
        this.inputData = null;
        this._confirmResolve = null;
        this._inputResolve = null;
        this._toastId = 0;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Duration in ms (0 for persistent)
     * @returns {number} Toast ID for manual dismissal
     */
    show(message, type = 'info', duration = 4000) {
        const id = ++this._toastId;
        const toast = { id, message, type, exiting: false };

        this.toasts = [...this.toasts, toast];

        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Show a progress toast
     * @param {string} message - The message to display
     * @param {number} progress - Progress 0-100
     * @returns {number} Toast ID to update progress
     */
    showProgress(message, progress = 0) {
        const id = ++this._toastId;
        const toast = { id, message, type: 'progress', progress, exiting: false };

        this.toasts = [...this.toasts, toast];
        return id;
    }

    /**
     * Update progress of a toast
     * @param {number} id - Toast ID
     * @param {number} progress - New progress 0-100
     * @param {string} message - Optional new message
     */
    updateProgress(id, progress, message = null) {
        this.toasts = this.toasts.map(t => {
            if (t.id === id) {
                return { ...t, progress, message: message || t.message };
            }
            return t;
        });
    }

    /**
     * Dismiss a toast by ID
     * @param {number} id - Toast ID
     */
    dismiss(id) {
        // First, mark as exiting for animation
        this.toasts = this.toasts.map(t =>
            t.id === id ? { ...t, exiting: true } : t
        );

        // Then remove after animation
        setTimeout(() => {
            this.toasts = this.toasts.filter(t => t.id !== id);
        }, 250);
    }

    /**
     * Show a confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {object} options - { confirmText, cancelText, type: 'danger' | 'primary' }
     * @returns {Promise<boolean>} - Resolves to true if confirmed
     */
    confirm(title, message = '', options = {}) {
        return new Promise(resolve => {
            this._confirmResolve = resolve;
            this.confirmData = {
                title,
                message,
                confirmText: options.confirmText || 'Confirmer',
                cancelText: options.cancelText || 'Annuler',
                type: options.type || 'danger'
            };
        });
    }

    _handleConfirm(confirmed) {
        if (this._confirmResolve) {
            this._confirmResolve(confirmed);
            this._confirmResolve = null;
        }
        this.confirmData = null;
    }

    /**
     * Show an input dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {object} options - { placeholder, confirmText, cancelText, type: 'text' | 'password', defaultValue }
     * @returns {Promise<string | null>} - Resolves to input value or null if cancelled
     */
    input(title, message = '', options = {}) {
        return new Promise(resolve => {
            this._inputResolve = resolve;
            this.inputData = {
                title,
                message,
                placeholder: options.placeholder || '',
                confirmText: options.confirmText || 'Confirmer',
                cancelText: options.cancelText || 'Annuler',
                type: options.type || 'text',
                value: options.defaultValue || ''
            };
            // Focus the input after render
            this.updateComplete.then(() => {
                const input = this.shadowRoot?.querySelector('.input-field');
                if (input) input.focus();
            });
        });
    }

    _handleInput(confirmed) {
        if (this._inputResolve) {
            if (confirmed) {
                const input = this.shadowRoot?.querySelector('.input-field');
                this._inputResolve(input?.value || '');
            } else {
                this._inputResolve(null);
            }
            this._inputResolve = null;
        }
        this.inputData = null;
    }

    _handleInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this._handleInput(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this._handleInput(false);
        }
    }

    _getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
            progress: '↻'
        };
        return icons[type] || icons.info;
    }

    render() {
        return html`
            ${this.toasts.map(toast => html`
                <div class="toast ${toast.type} ${toast.exiting ? 'exiting' : ''}">
                    <span class="toast-icon">${this._getIcon(toast.type)}</span>
                    <div class="toast-content">
                        <div class="toast-message">${toast.message}</div>
                        ${toast.type === 'progress' ? html`
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${toast.progress}%"></div>
                            </div>
                            <div class="progress-text">${Math.round(toast.progress)}%</div>
                        ` : ''}
                    </div>
                    ${toast.type !== 'progress' ? html`
                        <button class="toast-close" @click=${() => this.dismiss(toast.id)}>×</button>
                    ` : ''}
                </div>
            `)}

            ${this.confirmData ? html`
                <div class="confirm-overlay" @click=${(e) => e.target === e.currentTarget && this._handleConfirm(false)}>
                    <div class="confirm-dialog">
                        <div class="confirm-icon">⚠️</div>
                        <h3 class="confirm-title">${this.confirmData.title}</h3>
                        ${this.confirmData.message ? html`
                            <p class="confirm-message">${this.confirmData.message}</p>
                        ` : ''}
                        <div class="confirm-actions">
                            <button
                                class="confirm-btn cancel"
                                @click=${() => this._handleConfirm(false)}
                            >
                                ${this.confirmData.cancelText}
                            </button>
                            <button
                                class="confirm-btn ${this.confirmData.type}"
                                @click=${() => this._handleConfirm(true)}
                            >
                                ${this.confirmData.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            ${this.inputData ? html`
                <div class="confirm-overlay" @click=${(e) => e.target === e.currentTarget && this._handleInput(false)}>
                    <div class="confirm-dialog">
                        <div class="confirm-icon">📝</div>
                        <h3 class="confirm-title">${this.inputData.title}</h3>
                        ${this.inputData.message ? html`
                            <p class="confirm-message">${this.inputData.message}</p>
                        ` : ''}
                        <input
                            class="input-field"
                            type="${this.inputData.type}"
                            placeholder="${this.inputData.placeholder}"
                            .value="${this.inputData.value}"
                            @keydown=${(e) => this._handleInputKeydown(e)}
                        />
                        <div class="confirm-actions">
                            <button
                                class="confirm-btn cancel"
                                @click=${() => this._handleInput(false)}
                            >
                                ${this.inputData.cancelText}
                            </button>
                            <button
                                class="confirm-btn primary"
                                @click=${() => this._handleInput(true)}
                            >
                                ${this.inputData.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('toast-notification', ToastNotification);

// Global helper function
window.showToast = (message, type = 'info', duration = 4000) => {
    let toast = document.querySelector('toast-notification');
    if (!toast) {
        toast = document.createElement('toast-notification');
        document.body.appendChild(toast);
    }
    return toast.show(message, type, duration);
};

window.showConfirm = async (title, message = '', options = {}) => {
    let toast = document.querySelector('toast-notification');
    if (!toast) {
        toast = document.createElement('toast-notification');
        document.body.appendChild(toast);
    }
    return toast.confirm(title, message, options);
};

window.showProgress = (message, progress = 0) => {
    let toast = document.querySelector('toast-notification');
    if (!toast) {
        toast = document.createElement('toast-notification');
        document.body.appendChild(toast);
    }
    return toast.showProgress(message, progress);
};

window.updateProgress = (id, progress, message = null) => {
    const toast = document.querySelector('toast-notification');
    if (toast) {
        toast.updateProgress(id, progress, message);
    }
};

window.dismissToast = (id) => {
    const toast = document.querySelector('toast-notification');
    if (toast) {
        toast.dismiss(id);
    }
};

window.showInput = async (title, message = '', options = {}) => {
    let toast = document.querySelector('toast-notification');
    if (!toast) {
        toast = document.createElement('toast-notification');
        document.body.appendChild(toast);
    }
    return toast.input(title, message, options);
};
