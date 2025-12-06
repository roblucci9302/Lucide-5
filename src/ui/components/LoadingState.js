import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * LoadingState - A modern loading indicator component
 *
 * Usage:
 *   <loading-state></loading-state>
 *   <loading-state message="Chargement des données..."></loading-state>
 *   <loading-state message="Veuillez patienter" size="large"></loading-state>
 *   <loading-state variant="inline" message="Traitement..."></loading-state>
 */
export class LoadingState extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary, -apple-system, BlinkMacSystemFont, sans-serif);
            box-sizing: border-box;
        }

        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }

        :host([variant="inline"]) {
            display: inline-flex;
            width: auto;
            height: auto;
        }

        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 24px;
        }

        :host([variant="inline"]) .loading-container {
            flex-direction: row;
            gap: 10px;
            padding: 8px 12px;
        }

        /* Spinner */
        .spinner {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: var(--color-primary, #6366f1);
            animation: spin 0.8s linear infinite;
        }

        :host([size="small"]) .spinner {
            width: 20px;
            height: 20px;
            border-width: 2px;
        }

        :host([size="large"]) .spinner {
            width: 56px;
            height: 56px;
            border-width: 4px;
        }

        :host([variant="inline"]) .spinner {
            width: 16px;
            height: 16px;
            border-width: 2px;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        /* Pulsing dots variant */
        .dots {
            display: flex;
            gap: 6px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--color-primary, #6366f1);
            animation: pulse 1.4s ease-in-out infinite;
        }

        .dot:nth-child(2) {
            animation-delay: 0.16s;
        }

        .dot:nth-child(3) {
            animation-delay: 0.32s;
        }

        @keyframes pulse {
            0%, 80%, 100% {
                transform: scale(0.6);
                opacity: 0.4;
            }
            40% {
                transform: scale(1);
                opacity: 1;
            }
        }

        /* Message */
        .message {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            max-width: 280px;
            line-height: 1.4;
        }

        :host([variant="inline"]) .message {
            font-size: 13px;
            max-width: none;
        }

        /* Overlay variant */
        :host([overlay]) {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 9999;
        }

        :host([overlay]) .loading-container {
            background: rgba(30, 30, 30, 0.95);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 32px 48px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        /* Progress bar (optional) */
        .progress-container {
            width: 200px;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 8px;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--color-primary, #6366f1), var(--color-secondary, #8b5cf6));
            border-radius: 2px;
            transition: width 0.3s ease;
        }

        .progress-indeterminate {
            width: 30%;
            animation: indeterminate 1.5s ease-in-out infinite;
        }

        @keyframes indeterminate {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(400%);
            }
        }
    `;

    static properties = {
        message: { type: String },
        variant: { type: String, reflect: true }, // 'spinner' | 'dots' | 'inline'
        size: { type: String, reflect: true },    // 'small' | 'medium' | 'large'
        overlay: { type: Boolean, reflect: true },
        progress: { type: Number },               // 0-100, or -1 for indeterminate
        showProgress: { type: Boolean, attribute: 'show-progress' }
    };

    constructor() {
        super();
        this.message = '';
        this.variant = 'spinner';
        this.size = 'medium';
        this.overlay = false;
        this.progress = -1;
        this.showProgress = false;
    }

    render() {
        return html`
            <div class="loading-container">
                ${this.variant === 'dots' ? html`
                    <div class="dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                ` : html`
                    <div class="spinner"></div>
                `}

                ${this.message ? html`
                    <div class="message">${this.message}</div>
                ` : ''}

                ${this.showProgress ? html`
                    <div class="progress-container">
                        <div class="progress-bar ${this.progress < 0 ? 'progress-indeterminate' : ''}"
                             style="${this.progress >= 0 ? `width: ${this.progress}%` : ''}">
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('loading-state', LoadingState);
