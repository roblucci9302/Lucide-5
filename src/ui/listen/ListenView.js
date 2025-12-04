import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import './stt/SttView.js';
import './summary/SummaryView.js';
import './response/ResponseView.js';
import './LiveInsightsPanel.js'; // Phase 3
import './NotificationCenter.js'; // Phase 3.3

export class ListenView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 400px;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: transform var(--transition-base) var(--easing-smooth-out),
                        opacity var(--transition-base) var(--easing-ease-out);
            will-change: transform, opacity;
        }

        :host(.hiding) {
            animation: slideUp var(--animation-base) var(--easing-smooth-in) forwards;
        }

        :host(.showing) {
            animation: slideDown 350ms var(--easing-elastic) forwards;
        }

        :host(.hidden) {
            opacity: 0;
            transform: translateY(-150%) scale(0.85);
            pointer-events: none;
        }


        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

/* Allow text selection in insights responses */
.insights-container, .insights-container *, .markdown-content {
    user-select: text !important;
    cursor: text !important;
}

/* Styles highlight.js ajoutés */
.insights-container pre {
    background: var(--color-black-40) !important;
    border-radius: var(--radius-md) !important;
    padding: var(--padding-sm) !important;
    margin: var(--margin-xs) 0 !important;
    overflow-x: auto !important;
    border: 1px solid var(--color-white-10) !important;
    white-space: pre !important;
    word-wrap: normal !important;
    word-break: normal !important;
}

.insights-container code {
    font-family: var(--font-family-mono) !important;
    font-size: 11px !important;
    background: transparent !important;
    white-space: pre !important;
    word-wrap: normal !important;
    word-break: normal !important;
}

.insights-container pre code {
    white-space: pre !important;
    word-wrap: normal !important;
    word-break: normal !important;
    display: block !important;
}

.insights-container p code {
    background: var(--color-white-10) !important;
    padding: var(--space-0-5) var(--space-1) !important;
    border-radius: 4px !important;
    color: #ffd700 !important;
}

.hljs-keyword {
    color: #ff79c6 !important;
}

.hljs-string {
    color: #f1fa8c !important;
}

.hljs-comment {
    color: #6272a4 !important;
}

.hljs-number {
    color: #bd93f9 !important;
}

.hljs-function {
    color: #50fa7b !important;
}

.hljs-title {
    color: #50fa7b !important;
}

.hljs-variable {
    color: #8be9fd !important;
}

.hljs-built_in {
    color: #ffb86c !important;
}

.hljs-attr {
    color: #50fa7b !important;
}

.hljs-tag {
    color: #ff79c6 !important;
}
        .assistant-container {
            display: flex;
            flex-direction: column;
            color: #ffffff;
            box-sizing: border-box;
            position: relative;
            background: rgba(0, 0, 0, 0.6);
            overflow: hidden;
            border-radius: 12px;
            width: 100%;
            height: 100%;
        }

        .assistant-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 12px;
            padding: var(--space-0-5);
            background: linear-gradient(169deg, rgba(255, 255, 255, 0.17) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.17) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: destination-out;
            mask-composite: exclude;
            pointer-events: none;
        }

        .assistant-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            z-index: -1;
        }

        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-1-5) var(--padding-md);
            min-height: 32px;
            position: relative;
            z-index: 1;
            width: 100%;
            box-sizing: border-box;
            flex-shrink: 0;
            border-bottom: 1px solid var(--color-white-10);
        }

        .bar-left-text {
            color: white;
            font-size: 13px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            position: relative;
            overflow: hidden;
            white-space: nowrap;
            flex: 1;
            min-width: 0;
            max-width: 200px;
        }

        .bar-left-text-content {
            display: inline-block;
            transition: transform 0.3s ease;
        }

        .bar-left-text-content.slide-in {
            animation: slideIn 0.3s ease forwards;
        }

        .bar-controls {
            display: flex;
            gap: var(--gap-xs);
            align-items: center;
            flex-shrink: 0;
            width: 120px;
            justify-content: flex-end;
            box-sizing: border-box;
            padding: var(--space-1);
        }

        .toggle-button {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: none;
            outline: none;
            box-shadow: none;
            padding: var(--space-1) var(--padding-xs);
            border-radius: 5px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            height: 24px;
            white-space: nowrap;
            transition: background-color 0.15s ease;
            justify-content: center;
        }

        .toggle-button:hover {
            background: var(--color-white-10);
        }

        .toggle-button svg {
            flex-shrink: 0;
            width: 12px;
            height: 12px;
        }

        .copy-button {
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: none;
            outline: none;
            box-shadow: none;
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            flex-shrink: 0;
            transition: background-color 0.15s ease;
            position: relative;
            overflow: hidden;
        }

        .copy-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .copy-button svg {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        }

        .copy-button .check-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .copy-icon {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }

        .copy-button.copied .check-icon {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        .timer {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
        }

        .close-button {
            background: rgba(255, 255, 255, 0.07);
            color: rgba(255, 255, 255, 0.9);
            border: none;
            padding: 4px;
            border-radius: 50%;
            outline: 1px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(0.5px);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
            transition: all 0.15s ease;
        }

        .close-button:hover {
            background: rgba(255, 80, 80, 0.2);
            outline-color: rgba(255, 80, 80, 0.4);
            color: white;
        }

        .close-button svg {
            width: 12px;
            height: 12px;
        }

        /* FIX: Bouton "Voir le compte-rendu" qui apparaît après l'enregistrement */
        .done-button {
            display: flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, var(--color-primary-500, #6366f1) 0%, var(--color-primary-600, #4f46e5) 100%);
            color: white;
            border: none;
            outline: 1px solid rgba(255, 255, 255, 0.2);
            outline-offset: -1px;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .done-button:hover {
            background: linear-gradient(135deg, var(--color-primary-600, #4f46e5) 0%, var(--color-primary-700, #4338ca) 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .done-button:active {
            transform: translateY(0);
        }

        .done-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .done-button svg {
            width: 14px;
            height: 14px;
        }

        /* Barre de contrôle étendue pour le bouton done */
        .bar-controls.with-done {
            width: auto;
            gap: 8px;
        }

        /* Animation pour faire ressortir le bouton */
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }

        .done-button.highlight {
            animation: pulseGlow 2s ease-in-out infinite;
        }

        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) .assistant-container,
        :host-context(body.has-glass) .top-bar,
        :host-context(body.has-glass) .toggle-button,
        :host-context(body.has-glass) .copy-button,
        :host-context(body.has-glass) .close-button,
        :host-context(body.has-glass) .transcription-container,
        :host-context(body.has-glass) .insights-container,
        :host-context(body.has-glass) .stt-message,
        :host-context(body.has-glass) .outline-item,
        :host-context(body.has-glass) .request-item,
        :host-context(body.has-glass) .markdown-content,
        :host-context(body.has-glass) .insights-container pre,
        :host-context(body.has-glass) .insights-container p code,
        :host-context(body.has-glass) .insights-container pre code {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-glass) .assistant-container::before,
        :host-context(body.has-glass) .assistant-container::after {
            display: none !important;
        }

        :host-context(body.has-glass) .toggle-button:hover,
        :host-context(body.has-glass) .copy-button:hover,
        :host-context(body.has-glass) .close-button:hover,
        :host-context(body.has-glass) .outline-item:hover,
        :host-context(body.has-glass) .request-item.clickable:hover,
        :host-context(body.has-glass) .markdown-content:hover {
            background: transparent !important;
            transform: none !important;
        }

        :host-context(body.has-glass) .transcription-container::-webkit-scrollbar-track,
        :host-context(body.has-glass) .transcription-container::-webkit-scrollbar-thumb,
        :host-context(body.has-glass) .insights-container::-webkit-scrollbar-track,
        :host-context(body.has-glass) .insights-container::-webkit-scrollbar-thumb {
            background: transparent !important;
        }
        :host-context(body.has-glass) * {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
        }

        :host-context(body.has-glass) .assistant-container,
        :host-context(body.has-glass) .stt-message,
        :host-context(body.has-glass) .toggle-button,
        :host-context(body.has-glass) .copy-button,
        :host-context(body.has-glass) .close-button {
            border-radius: 0 !important;
        }

        :host-context(body.has-glass) ::-webkit-scrollbar,
        :host-context(body.has-glass) ::-webkit-scrollbar-track,
        :host-context(body.has-glass) ::-webkit-scrollbar-thumb {
            background: transparent !important;
            width: 0 !important;      /* Masquer la scrollbar elle-même */
        }
        :host-context(body.has-glass) .assistant-container,
        :host-context(body.has-glass) .top-bar,
        :host-context(body.has-glass) .toggle-button,
        :host-context(body.has-glass) .copy-button,
        :host-context(body.has-glass) .close-button,
        :host-context(body.has-glass) .transcription-container,
        :host-context(body.has-glass) .insights-container,
        :host-context(body.has-glass) .stt-message,
        :host-context(body.has-glass) .outline-item,
        :host-context(body.has-glass) .request-item,
        :host-context(body.has-glass) .markdown-content,
        :host-context(body.has-glass) .insights-container pre,
        :host-context(body.has-glass) .insights-container p code,
        :host-context(body.has-glass) .insights-container pre code {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-glass) .assistant-container::before,
        :host-context(body.has-glass) .assistant-container::after {
            display: none !important;
        }

        :host-context(body.has-glass) .toggle-button:hover,
        :host-context(body.has-glass) .copy-button:hover,
        :host-context(body.has-glass) .close-button:hover,
        :host-context(body.has-glass) .outline-item:hover,
        :host-context(body.has-glass) .request-item.clickable:hover,
        :host-context(body.has-glass) .markdown-content:hover {
            background: transparent !important;
            transform: none !important;
        }

        :host-context(body.has-glass) .transcription-container::-webkit-scrollbar-track,
        :host-context(body.has-glass) .transcription-container::-webkit-scrollbar-thumb,
        :host-context(body.has-glass) .insights-container::-webkit-scrollbar-track,
        :host-context(body.has-glass) .insights-container::-webkit-scrollbar-thumb {
            background: transparent !important;
        }
        :host-context(body.has-glass) * {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
        }

        :host-context(body.has-glass) .assistant-container,
        :host-context(body.has-glass) .stt-message,
        :host-context(body.has-glass) .toggle-button,
        :host-context(body.has-glass) .copy-button {
            border-radius: 0 !important;
        }

        :host-context(body.has-glass) ::-webkit-scrollbar,
        :host-context(body.has-glass) ::-webkit-scrollbar-track,
        :host-context(body.has-glass) ::-webkit-scrollbar-thumb {
            background: transparent !important;
            width: 0 !important;
        }
    `;

    static properties = {
        viewMode: { type: String },
        isHovering: { type: Boolean },
        isAnimating: { type: Boolean },
        copyState: { type: String },
        elapsedTime: { type: String },
        captureStartTime: { type: Number },
        isSessionActive: { type: Boolean },
        hasCompletedRecording: { type: Boolean },
        isOpeningPostMeeting: { type: Boolean },
    };

    constructor() {
        super();
        this.isSessionActive = false;
        this.hasCompletedRecording = false;
        this.isOpeningPostMeeting = false;
        this.viewMode = 'insights';
        this.isHovering = false;
        this.isAnimating = false;
        this.elapsedTime = '00:00';
        this.captureStartTime = null;
        this.timerInterval = null;
        this.adjustHeightThrottle = null;
        this.isThrottled = false;
        this.copyState = 'idle';
        this.copyTimeout = null;

        this.adjustWindowHeight = this.adjustWindowHeight.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        // Only start timer if session is active
        if (this.isSessionActive) {
            this.startTimer();
        }
        if (window.api) {
            window.api.listenView.onSessionStateChanged((event, { isActive }) => {
                const wasActive = this.isSessionActive;
                this.isSessionActive = isActive;

                if (!wasActive && isActive) {
                    this.hasCompletedRecording = false;
                    this.startTimer();
                    // Reset child components
                    this.updateComplete.then(() => {
                        const sttView = this.shadowRoot.querySelector('stt-view');
                        const summaryView = this.shadowRoot.querySelector('summary-view');
                        if (sttView) sttView.resetTranscript();
                        if (summaryView) summaryView.resetAnalysis();
                    });
                    this.requestUpdate();
                }
                if (wasActive && !isActive) {
                    this.hasCompletedRecording = true;
                    this.stopTimer();
                    this.requestUpdate();
                }
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopTimer();

        if (this.adjustHeightThrottle) {
            clearTimeout(this.adjustHeightThrottle);
            this.adjustHeightThrottle = null;
        }
        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }
    }

    startTimer() {
        this.captureStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.captureStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60)
                .toString()
                .padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.elapsedTime = `${minutes}:${seconds}`;
            this.requestUpdate();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    adjustWindowHeight() {
        if (!window.api) return;

        this.updateComplete
            .then(() => {
                const topBar = this.shadowRoot.querySelector('.top-bar');
                let activeContent;
                if (this.viewMode === 'transcript') {
                    activeContent = this.shadowRoot.querySelector('stt-view');
                } else if (this.viewMode === 'suggestions') {
                    activeContent = this.shadowRoot.querySelector('response-view');
                } else {
                    activeContent = this.shadowRoot.querySelector('summary-view');
                }

                if (!topBar || !activeContent) return;

                const topBarHeight = topBar.offsetHeight;

                const contentHeight = activeContent.scrollHeight;

                const idealHeight = topBarHeight + contentHeight;

                const targetHeight = Math.min(700, idealHeight);

                console.log(
                    `[Height Adjusted] Mode: ${this.viewMode}, TopBar: ${topBarHeight}px, Content: ${contentHeight}px, Ideal: ${idealHeight}px, Target: ${targetHeight}px`
                );

                window.api.listenView.adjustWindowHeight('listen', targetHeight);
            })
            .catch(error => {
                console.error('Error in adjustWindowHeight:', error);
            });
    }

    toggleViewMode() {
        // Cycle through 3 modes: insights → transcript → suggestions → insights
        if (this.viewMode === 'insights') {
            this.viewMode = 'transcript';
        } else if (this.viewMode === 'transcript') {
            this.viewMode = 'suggestions';
        } else {
            this.viewMode = 'insights';
        }
        this.requestUpdate();
    }

    handleCopyHover(isHovering) {
        this.isHovering = isHovering;
        if (isHovering) {
            this.isAnimating = true;
        } else {
            this.isAnimating = false;
        }
        this.requestUpdate();
    }

    handleCloseWindow() {
        // Masquer la fenêtre Listen
        console.log('[ListenView] Closing Listen window');
        if (window.api && window.api.listenView) {
            window.api.listenView.hideListenWindow();
        }
    }

    /**
     * FIX: Ouvre la fenêtre post-meeting pour générer le compte-rendu
     * Cette méthode était manquante - cause du bug où le compte-rendu ne se génère pas
     */
    async handleOpenPostMeeting() {
        if (this.isOpeningPostMeeting) return;

        this.isOpeningPostMeeting = true;
        console.log('[ListenView] Opening post-meeting window...');

        try {
            // Récupérer l'ID de la session récente
            const result = await window.api.listenView.getRecentListenSession();

            if (result && result.success && result.sessionId) {
                console.log('[ListenView] Session found:', result.sessionId);

                // Ouvrir la fenêtre post-meeting avec le sessionId
                await window.api.listenView.openPostMeetingWindow(result.sessionId);

                // Masquer la fenêtre Listen
                window.api.listenView.hideListenWindow();
            } else {
                console.error('[ListenView] No session found:', result?.error);
                // Afficher un message d'erreur à l'utilisateur (pourrait être amélioré avec un toast)
                alert('Aucune session d\'écoute trouvée. Assurez-vous d\'avoir enregistré une conversation.');
            }
        } catch (error) {
            console.error('[ListenView] Error opening post-meeting:', error);
        } finally {
            this.isOpeningPostMeeting = false;
        }
    }

    async handleCopy() {
        if (this.copyState === 'copied') return;

        let textToCopy = '';

        if (this.viewMode === 'transcript') {
            const sttView = this.shadowRoot.querySelector('stt-view');
            textToCopy = sttView ? sttView.getTranscriptText() : '';
        } else {
            const summaryView = this.shadowRoot.querySelector('summary-view');
            textToCopy = summaryView ? summaryView.getSummaryText() : '';
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            console.log('Content copied to clipboard');

            this.copyState = 'copied';
            this.requestUpdate();

            if (this.copyTimeout) {
                clearTimeout(this.copyTimeout);
            }

            this.copyTimeout = setTimeout(() => {
                this.copyState = 'idle';
                this.requestUpdate();
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    adjustWindowHeightThrottled() {
        if (this.isThrottled) {
            return;
        }

        this.adjustWindowHeight();

        this.isThrottled = true;

        this.adjustHeightThrottle = setTimeout(() => {
            this.isThrottled = false;
        }, 16);
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('viewMode')) {
            this.adjustWindowHeight();
        }
    }

    handleSttMessagesUpdated(event) {
        // Handle messages update from SttView if needed
        this.adjustWindowHeightThrottled();
    }

    firstUpdated() {
        super.firstUpdated();
        setTimeout(() => this.adjustWindowHeight(), 200);
    }

    render() {
        // FIX: Afficher un message différent quand l'enregistrement est terminé
        const displayText = this.hasCompletedRecording
            ? 'Enregistrement terminé'
            : this.isHovering
            ? this.viewMode === 'transcript'
                ? 'Copier la transcription'
                : this.viewMode === 'suggestions'
                ? 'Suggestions IA'
                : 'Copier l\'analyse Lucide'
            : this.viewMode === 'insights'
            ? `Analyses en direct`
            : this.viewMode === 'suggestions'
            ? `Suggestions IA`
            : `Lucide écoute ${this.elapsedTime}`;

        return html`
            <div class="assistant-container">
                <div class="top-bar">
                    <div class="bar-left-text">
                        <span class="bar-left-text-content ${this.isAnimating ? 'slide-in' : ''}">${displayText}</span>
                    </div>
                    <div class="bar-controls ${this.hasCompletedRecording ? 'with-done' : ''}">
                        <notification-center></notification-center>

                        <!-- FIX: Bouton "Voir le compte-rendu" affiché après l'enregistrement -->
                        ${this.hasCompletedRecording ? html`
                            <button
                                class="done-button highlight"
                                @click=${this.handleOpenPostMeeting}
                                ?disabled=${this.isOpeningPostMeeting}
                                title="Générer le compte-rendu de réunion"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                ${this.isOpeningPostMeeting ? 'Ouverture...' : 'Compte-rendu'}
                            </button>
                        ` : ''}

                        <button class="close-button" @click=${this.handleCloseWindow} title="Fermer">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <button class="toggle-button" @click=${this.toggleViewMode}>
                            ${this.viewMode === 'insights'
                                ? html`
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                                          <circle cx="12" cy="12" r="3" />
                                      </svg>
                                      <span>Afficher la transcription</span>
                                  `
                                : html`
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M9 11l3 3L22 4" />
                                          <path d="M22 12v7a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                                      </svg>
                                      <span>Afficher les analyses</span>
                                  `}
                        </button>
                        <button
                            class="copy-button ${this.copyState === 'copied' ? 'copied' : ''}"
                            @click=${this.handleCopy}
                            @mouseenter=${() => this.handleCopyHover(true)}
                            @mouseleave=${() => this.handleCopyHover(false)}
                        >
                            <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </button>
                    </div>
                </div>

                <stt-view
                    .isVisible=${this.viewMode === 'transcript'}
                    @stt-messages-updated=${this.handleSttMessagesUpdated}
                ></stt-view>

                <summary-view
                    .isVisible=${this.viewMode === 'insights'}
                    .hasCompletedRecording=${this.hasCompletedRecording}
                ></summary-view>

                <response-view
                    .visible=${this.viewMode === 'suggestions'}
                ></response-view>

                <!-- Phase 3: Live Insights Panel -->
                <live-insights-panel
                    style="display: ${this.viewMode === 'insights' ? 'block' : 'none'}"
                ></live-insights-panel>
            </div>
        `;
    }
}

customElements.define('listen-view', ListenView);
