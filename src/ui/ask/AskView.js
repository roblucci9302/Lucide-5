import { html, css, LitElement } from '../../ui/assets/lit-core-2.7.4.min.js';
import { parser, parser_write, parser_end, default_renderer } from '../../ui/assets/smd.js';
import { parseDocuments as parseDocumentsES } from '../../ui/assets/documentParserES.js'; // Phase 3: Shared parsing
import './QuickActionsPanel.js';
import './CitationView.js';
import './AttachmentBubble.js';
import './DocumentPreview.js';
import './WorkflowFormDialog.js'; // Phase 1: Workflow Forms

export class AskView extends LitElement {
    static properties = {
        currentResponse: { type: String },
        currentQuestion: { type: String },
        isLoading: { type: Boolean },
        copyState: { type: String },
        isHovering: { type: Boolean },
        hoveredLineIndex: { type: Number },
        lineCopyState: { type: Object },
        showTextInput: { type: Boolean },
        headerText: { type: String },
        headerAnimating: { type: Boolean },
        isStreaming: { type: Boolean },
        sessionId: { type: String }, // Phase 4: RAG - Session ID for citations
        attachments: { type: Array, state: true }, // Document upload attachments
        generatedDocuments: { type: Array, state: true }, // Phase 4: Generated documents from AI
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: transform var(--transition-base) var(--easing-smooth-out),
                        opacity var(--transition-base) var(--easing-ease-out);
            will-change: transform, opacity;
        }

        :host(.hiding) {
            animation: slideUpEnhanced var(--animation-base) var(--easing-smooth-in) forwards;
        }

        :host(.showing) {
            animation: slideDownEnhanced 350ms var(--easing-elastic) forwards;
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

        /* Allow text selection in assistant responses */
        .response-container, .response-container * {
            user-select: text !important;
            cursor: text !important;
        }

        .response-container pre {
            background: var(--color-black-40) !important;
            border-radius: var(--radius-md) !important;
            padding: 12px !important;
            margin: 8px 0 !important;
            overflow-x: auto !important;
            border: 1px solid var(--color-white-10) !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .response-container code {
            font-family: var(--font-family-mono) !important;
            font-size: 11px !important;
            background: transparent !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
        }

        .response-container pre code {
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
            display: block !important;
        }

        .response-container p code {
            background: var(--color-white-10) !important;
            padding: 2px 4px !important;
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
        .hljs-variable {
            color: #8be9fd !important;
        }
        .hljs-built_in {
            color: #ffb86c !important;
        }
        .hljs-title {
            color: #50fa7b !important;
        }
        .hljs-attr {
            color: #50fa7b !important;
        }
        .hljs-tag {
            color: #ff79c6 !important;
        }

        .ask-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            outline: 0.5px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(1px);
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
        }

        .ask-container::before {
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
            filter: blur(10px);
            z-index: -1;
        }

        .response-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: transparent;
            border-bottom: 1px solid var(--color-white-10);
            flex-shrink: 0;
        }

        .response-header.hidden {
            display: none;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .response-icon {
            width: 20px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .response-icon svg {
            width: 12px;
            height: 12px;
            stroke: rgba(255, 255, 255, 0.9);
        }

        .response-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            position: relative;
            overflow: hidden;
        }

        .response-label.animating {
            animation: fadeInOut var(--animation-base) var(--easing-ease-in-out);
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
        }

        .question-text {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
            margin-right: 8px;
        }

        .header-controls {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
        }

        .copy-button {
            background: transparent;
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
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

        .close-button {
            background: rgba(255, 255, 255, 0.07);
            color: white;
            border: none;
            padding: 4px;
            border-radius: 20px;
            outline: 1px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(0.5px);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .close-button:hover {
            background: var(--color-white-10);
            color: rgba(255, 255, 255, 1);
        }

        .response-container {
            flex: 1;
            padding: 16px;
            padding-left: 48px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.6;
            background: transparent;
            min-height: 0;
            max-height: 400px;
            position: relative;
        }

        .response-container.hidden {
            display: none;
        }

        .response-container::-webkit-scrollbar {
            width: 6px;
        }

        .response-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .loading-dots {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 40px;
        }

        .loading-dot {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }

        .loading-dot:nth-child(1) {
            animation-delay: 0s;
        }

        .loading-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .loading-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        .response-line {
            position: relative;
            padding: 2px 0;
            margin: 0;
            transition: background-color 0.15s ease;
        }

        .response-line:hover {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .line-copy-button {
            position: absolute;
            left: -32px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--color-white-10);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 2px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.15s ease, background-color 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .response-line:hover .line-copy-button {
            opacity: 1;
        }

        .line-copy-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .line-copy-button.copied {
            background: rgba(40, 167, 69, 0.3);
        }

        .line-copy-button svg {
            width: 12px;
            height: 12px;
            stroke: rgba(255, 255, 255, 0.9);
        }

        .text-input-container {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.1);
            border-top: 1px solid var(--color-white-10);
            flex-shrink: 0;
            transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
            transform-origin: bottom;
        }

        .text-input-container.hidden {
            opacity: 0;
            transform: scaleY(0);
            padding: 0;
            height: 0;
            overflow: hidden;
            border-top: none;
        }

        .text-input-container.no-response {
            border-top: none;
        }

        #textInput {
            flex: 1;
            padding: 10px 14px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 20px;
            outline: none;
            border: none;
            color: white;
            font-size: 14px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 400;
        }

        #textInput::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        #textInput:focus {
            outline: none;
        }

        .response-line h1,
        .response-line h2,
        .response-line h3,
        .response-line h4,
        .response-line h5,
        .response-line h6 {
            color: rgba(255, 255, 255, 0.95);
            margin: 16px 0 8px 0;
            font-weight: 600;
        }

        .response-line p {
            margin: 8px 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .response-line ul,
        .response-line ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .response-line li {
            margin: 4px 0;
            color: rgba(255, 255, 255, 0.9);
        }

        .response-line code {
            background: var(--color-white-10);
            color: rgba(255, 255, 255, 0.95);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 13px;
        }

        .response-line pre {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.95);
            padding: 12px;
            border-radius: var(--radius-md);
            overflow-x: auto;
            margin: 12px 0;
            border: 1px solid var(--color-white-10);
        }

        .response-line pre code {
            background: none;
            padding: 0;
        }

        .response-line blockquote {
            border-left: 3px solid rgba(255, 255, 255, 0.3);
            margin: 12px 0;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.8);
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
        }

        .btn-gap {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 4px;
        }

        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) .ask-container,
        :host-context(body.has-glass) .response-header,
        :host-context(body.has-glass) .response-icon,
        :host-context(body.has-glass) .copy-button,
        :host-context(body.has-glass) .close-button,
        :host-context(body.has-glass) .line-copy-button,
        :host-context(body.has-glass) .text-input-container,
        :host-context(body.has-glass) .response-container pre,
        :host-context(body.has-glass) .response-container p code,
        :host-context(body.has-glass) .response-container pre code {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-glass) .ask-container::before {
            display: none !important;
        }

        :host-context(body.has-glass) .copy-button:hover,
        :host-context(body.has-glass) .close-button:hover,
        :host-context(body.has-glass) .line-copy-button,
        :host-context(body.has-glass) .line-copy-button:hover,
        :host-context(body.has-glass) .response-line:hover {
            background: transparent !important;
        }

        :host-context(body.has-glass) .response-container::-webkit-scrollbar-track,
        :host-context(body.has-glass) .response-container::-webkit-scrollbar-thumb {
            background: transparent !important;
        }

        .submit-btn, .clear-btn {
            display: flex;
            align-items: center;
            background: transparent;
            color: white;
            border: none;
            border-radius: var(--radius-md);
            margin-left: 8px;
            font-size: 13px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            overflow: hidden;
            cursor: pointer;
            transition: background 0.15s;
            height: 32px;
            padding: 0 10px;
            box-shadow: none;
        }
        .submit-btn:hover, .clear-btn:hover {
            background: rgba(255,255,255,0.1);
        }
        .btn-label {
            margin-right: 8px;
            display: flex;
            align-items: center;
            height: 100%;
        }
        .btn-icon {
            background: rgba(255,255,255,0.1);
            border-radius: 13%;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
        }
        .btn-icon img, .btn-icon svg {
            width: 13px;
            height: 13px;
            display: block;
        }

        /* Upload button styles */
        .upload-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.08);
            border: 1.5px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            flex-shrink: 0;
            font-size: 22px;
            font-weight: 400;
            line-height: 1;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .upload-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 1);
            transform: scale(1.08);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .upload-btn:active {
            transform: scale(0.96);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .upload-btn input[type="file"] {
            display: none;
        }

        /* Attachments wrapper */
        .attachments-wrapper {
            padding: 0 16px;
            padding-top: 8px;
        }

        /* Generated Documents wrapper (Phase 4) */
        .generated-documents-wrapper {
            padding: 0 16px;
            padding-top: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .header-clear-btn {
            background: transparent;
            border: none;
            display: flex;
            align-items: center;
            gap: 2px;
            cursor: pointer;
            padding: 0 2px;
        }
        .header-clear-btn .icon-box {
            color: white;
            font-size: 12px;
            font-family: 'Helvetica Neue', sans-serif;
            font-weight: 500;
            background-color: var(--color-white-10);
            border-radius: 13%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .header-clear-btn:hover .icon-box {
            background-color: rgba(255,255,255,0.18);
        }
    `;

    constructor() {
        super();
        this.currentResponse = '';
        this.currentQuestion = '';
        this.isLoading = false;
        this.copyState = 'idle';
        this.showTextInput = true;
        this.headerText = 'AI Response';
        this.headerAnimating = false;
        this.isStreaming = false;
        this.attachments = []; // Document upload attachments
        this.generatedDocuments = []; // Generated documents from AI

        this.marked = null;
        this.hljs = null;
        this.DOMPurify = null;
        this.isLibrariesLoaded = false;

        // SMD.js streaming markdown parser
        this.smdParser = null;
        this.smdContainer = null;
        this.lastProcessedLength = 0;

        this.handleSendText = this.handleSendText.bind(this);
        this.handleTextKeydown = this.handleTextKeydown.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
        this.clearResponseContent = this.clearResponseContent.bind(this);
        this.handleEscKey = this.handleEscKey.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleCloseAskWindow = this.handleCloseAskWindow.bind(this);
        this.handleCloseIfNoContent = this.handleCloseIfNoContent.bind(this);

        this.loadLibraries();

        // --- Resize helpers ---
        this.isThrottled = false;
    }

    connectedCallback() {
        super.connectedCallback();

        console.log('📱 AskView connectedCallback - Configuration des écouteurs IPC');

        document.addEventListener('keydown', this.handleEscKey);

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const needed = entry.contentRect.height;
                const current = window.innerHeight;

                if (needed > current - 4) {
                    this.requestWindowResize(Math.ceil(needed));
                }
            }
        });

        const container = this.shadowRoot?.querySelector('.ask-container');
        if (container) this.resizeObserver.observe(container);

        this.handleQuestionFromAssistant = (event, question) => {
            console.log('AskView: Received question from ListenView:', question);
            this.handleSendText(null, question);
        };

        // Handle workflow selection from QuickActionsPanel
        this.handleWorkflowSelected = async (event) => {
            const { workflow } = event.detail;
            console.log('[AskView] Workflow selected:', workflow.id, 'hasForm:', workflow.hasForm);

            try {
                // Get active profile
                const profileData = await window.api.settingsView.agent.getActiveProfile();
                const activeProfile = profileData || 'lucide_assistant';

                // Phase 1: Check if workflow has a form
                if (workflow.hasForm) {
                    // Get form fields from backend
                    const formFields = await window.api.workflows.getFormFields(activeProfile, workflow.id);
                    console.log('[AskView] Opening form dialog with fields:', formFields?.length || 0);

                    // Open the form dialog
                    const formDialog = this.shadowRoot.querySelector('workflow-form-dialog');
                    if (formDialog && formFields && formFields.length > 0) {
                        formDialog.open(workflow, formFields);
                        return; // Wait for form submission
                    }
                }

                // No form or no fields - send prompt directly
                const prompt = await window.api.workflows.buildPrompt(activeProfile, workflow.id, {});
                if (prompt) {
                    this.handleSendText(null, prompt);
                }
            } catch (error) {
                console.error('[AskView] Error handling workflow selection:', error);
            }
        };

        // Phase 1: Handle form submission from WorkflowFormDialog
        this.handleFormSubmitted = async (event) => {
            const { workflow, formData } = event.detail;
            console.log('[AskView] Form submitted for workflow:', workflow.id, 'with data:', formData);

            try {
                const profileData = await window.api.settingsView.agent.getActiveProfile();
                const activeProfile = profileData || 'lucide_assistant';

                // Build prompt with form data
                const prompt = await window.api.workflows.buildPrompt(activeProfile, workflow.id, formData);
                if (prompt) {
                    this.handleSendText(null, prompt);
                }
            } catch (error) {
                console.error('[AskView] Error handling form submission:', error);
            }
        };

        document.addEventListener('workflow-selected', this.handleWorkflowSelected);
        document.addEventListener('form-submitted', this.handleFormSubmitted);

        if (window.api) {
            window.api.askView.onShowTextInput(() => {
                console.log('Show text input signal received');
                if (!this.showTextInput) {
                    this.showTextInput = true;
                    this.updateComplete.then(() => this.focusTextInput());
                  } else {
                    this.focusTextInput();
                  }
            });

            window.api.askView.onScrollResponseUp(() => this.handleScroll('up'));
            window.api.askView.onScrollResponseDown(() => this.handleScroll('down'));
            window.api.askView.onAskStateUpdate((event, newState) => {
                this.currentResponse = newState.currentResponse;
                this.currentQuestion = newState.currentQuestion;
                this.isLoading       = newState.isLoading;
                this.isStreaming     = newState.isStreaming;
                this.sessionId       = newState.sessionId; // Phase 4: RAG - Session ID for citations

                const wasHidden = !this.showTextInput;
                this.showTextInput = newState.showTextInput;

                if (newState.showTextInput) {
                  if (wasHidden) {
                    this.updateComplete.then(() => this.focusTextInput());
                  } else {
                    this.focusTextInput();
                  }
                }
              });
            console.log('AskView: Enregistrement des écouteurs IPC terminé');
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resizeObserver?.disconnect();

        console.log('📱 AskView disconnectedCallback - Suppression des écouteurs IPC');

        document.removeEventListener('keydown', this.handleEscKey);
        document.removeEventListener('workflow-selected', this.handleWorkflowSelected);
        document.removeEventListener('form-submitted', this.handleFormSubmitted);

        if (this.copyTimeout) {
            clearTimeout(this.copyTimeout);
        }

        if (this.headerAnimationTimeout) {
            clearTimeout(this.headerAnimationTimeout);
        }

        if (this.streamingTimeout) {
            clearTimeout(this.streamingTimeout);
        }

        Object.values(this.lineCopyTimeouts).forEach(timeout => clearTimeout(timeout));

        if (window.api) {
            window.api.askView.removeOnAskStateUpdate(this.handleAskStateUpdate);
            window.api.askView.removeOnShowTextInput(this.handleShowTextInput);
            window.api.askView.removeOnScrollResponseUp(this.handleScroll);
            window.api.askView.removeOnScrollResponseDown(this.handleScroll);
            console.log('✅ AskView: Suppression des écouteurs IPC nécessaire');
        }
    }


    async loadLibraries() {
        try {
            if (!window.marked) {
                await this.loadScript('../../assets/marked-4.3.0.min.js');
            }

            if (!window.hljs) {
                await this.loadScript('../../assets/highlight-11.9.0.min.js');
            }

            if (!window.DOMPurify) {
                await this.loadScript('../../assets/dompurify-3.0.7.min.js');
            }

            this.marked = window.marked;
            this.hljs = window.hljs;
            this.DOMPurify = window.DOMPurify;

            if (this.marked && this.hljs) {
                this.marked.setOptions({
                    highlight: (code, lang) => {
                        if (lang && this.hljs.getLanguage(lang)) {
                            try {
                                return this.hljs.highlight(code, { language: lang }).value;
                            } catch (err) {
                                console.warn('Highlight error:', err);
                            }
                        }
                        try {
                            return this.hljs.highlightAuto(code).value;
                        } catch (err) {
                            console.warn('Auto highlight error:', err);
                        }
                        return code;
                    },
                    breaks: true,
                    gfm: true,
                    pedantic: false,
                    smartypants: false,
                    xhtml: false,
                });

                this.isLibrariesLoaded = true;
                this.renderContent();
                console.log('Markdown libraries loaded successfully in AskView');
            }

            if (this.DOMPurify) {
                this.isDOMPurifyLoaded = true;
                console.log('DOMPurify loaded successfully in AskView');
            }
        } catch (error) {
            console.error('Failed to load libraries in AskView:', error);
        }
    }

    handleCloseAskWindow() {
        window.api.askView.closeAskWindow();
    }

    handleMinimizeAskWindow() {
        // Minimiser la fenêtre Ask sans effacer le contenu
        window.api.askView.minimizeAskWindow();
    }

    handleShowListenWindow() {
        // Afficher la fenêtre Listen (conversation)
        window.api.askView.showListenWindow();
    }

    handleCloseIfNoContent() {
        if (!this.currentResponse && !this.isLoading && !this.isStreaming) {
            this.handleCloseAskWindow();
        }
    }

    handleEscKey(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.handleCloseIfNoContent();
        }
    }

    clearResponseContent() {
        this.currentResponse = '';
        this.currentQuestion = '';
        this.isLoading = false;
        this.isStreaming = false;
        this.headerText = 'AI Response';
        this.showTextInput = true;
        this.lastProcessedLength = 0;
        this.smdParser = null;
        this.smdContainer = null;
    }

    handleInputFocus() {
        this.isInputFocused = true;
    }

    focusTextInput() {
        // AMÉLIORATION : Retry mechanism pour focus
        const attemptFocus = (retries = 3) => {
            requestAnimationFrame(() => {
                const textInput = this.shadowRoot?.getElementById('textInput');
                if (textInput) {
                    textInput.focus();
                    console.log('[AskView] Text input focused successfully');
                } else if (retries > 0) {
                    console.warn(`[AskView] Input not found, retrying... (${retries} attempts left)`);
                    setTimeout(() => attemptFocus(retries - 1), 50);
                } else {
                    console.error('[AskView] Failed to find text input after multiple attempts');
                    console.error('[AskView] showTextInput state:', this.showTextInput);
                    console.error('[AskView] shadowRoot exists:', !!this.shadowRoot);
                }
            });
        };

        attemptFocus();
    }


    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    parseMarkdown(text) {
        if (!text) return '';

        if (!this.isLibrariesLoaded || !this.marked) {
            return text;
        }

        try {
            return this.marked(text);
        } catch (error) {
            console.error('Markdown parsing error in AskView:', error);
            return text;
        }
    }

    fixIncompleteCodeBlocks(text) {
        if (!text) return text;

        const codeBlockMarkers = text.match(/```/g) || [];
        const markerCount = codeBlockMarkers.length;

        if (markerCount % 2 === 1) {
            return text + '\n```';
        }

        return text;
    }

    handleScroll(direction) {
        const scrollableElement = this.shadowRoot.querySelector('#responseContainer');
        if (scrollableElement) {
            const scrollAmount = 100; // Quantité de défilement par action (px)
            if (direction === 'up') {
                scrollableElement.scrollTop -= scrollAmount;
            } else {
                scrollableElement.scrollTop += scrollAmount;
            }
        }
    }


    /**
     * Phase 4: Parse AI response for generated documents
     * Detects document markers like <<DOCUMENT:type>> and extracts them
     * Phase 3: Now uses shared ES module documentParserES.js
     */
    parseDocuments(text) {
        return parseDocumentsES(text);
    }

    renderContent() {
        const responseContainer = this.shadowRoot.getElementById('responseContainer');
        if (!responseContainer) return;

        // Check loading state
        if (this.isLoading) {
            responseContainer.innerHTML = `
              <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
              </div>`;
            this.resetStreamingParser();
            this.generatedDocuments = []; // Clear documents on new loading
            return;
        }

        // If there is no response, show empty state
        if (!this.currentResponse) {
            responseContainer.innerHTML = `<div class="empty-state">...</div>`;
            this.resetStreamingParser();
            this.generatedDocuments = [];
            return;
        }

        // Phase 4: Parse response for generated documents
        const { documents, cleanText } = this.parseDocuments(this.currentResponse);

        // Store generated documents for display
        if (documents.length > 0 && !this.isStreaming) {
            console.log(`[AskView] Found ${documents.length} generated documents`);
            this.generatedDocuments = documents;
            this.requestUpdate(); // Trigger re-render to show DocumentPreview
        }

        // Render markdown (using cleanText if documents were found)
        const textToRender = documents.length > 0 ? cleanText : this.currentResponse;
        this.currentResponseClean = textToRender;
        this.renderStreamingMarkdown(responseContainer, textToRender);

        // After updating content, recalculate window height
        this.adjustWindowHeightThrottled();
    }

    resetStreamingParser() {
        this.smdParser = null;
        this.smdContainer = null;
        this.lastProcessedLength = 0;
    }

    setupLinkInterception(responseContainer) {
        // Éviter d'ajouter plusieurs listeners sur le même container
        if (responseContainer.hasAttribute('data-link-listener')) {
            return;
        }
        responseContainer.setAttribute('data-link-listener', 'true');

        // Event delegation : intercepter tous les clics sur les liens <a>
        // Links will open in default external browser
        responseContainer.addEventListener('click', (event) => {
            const link = event.target.closest('a');

            if (link && link.href) {
                // External links will open in the system default browser
                if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
                    console.log('[AskView] Link clicked:', link.href);
                    // Let the default behavior handle opening in external browser
                }
            }
        });
    }

    renderStreamingMarkdown(responseContainer, textToRender = null) {
        try {
            // Créer un nouveau parser si inexistant ou si le conteneur a changé
            if (!this.smdParser || this.smdContainer !== responseContainer) {
                this.smdContainer = responseContainer;
                this.smdContainer.innerHTML = '';

                // Utiliser le default_renderer de smd.js
                const renderer = default_renderer(this.smdContainer);
                this.smdParser = parser(renderer);
                this.lastProcessedLength = 0;

                // Ajouter l'interception des clics sur les liens
                this.setupLinkInterception(responseContainer);
            }

            // Use provided text or fall back to currentResponse
            const currentText = textToRender !== null ? textToRender : this.currentResponse;
            const newText = currentText.slice(this.lastProcessedLength);

            if (newText.length > 0) {
                // Transmettre le nouveau chunk de texte au parser
                parser_write(this.smdParser, newText);
                this.lastProcessedLength = currentText.length;
            }

            // Terminer le parser quand le streaming est fini
            if (!this.isStreaming && !this.isLoading) {
                parser_end(this.smdParser);
            }

            // Appliquer la coloration syntaxique
            if (this.hljs) {
                responseContainer.querySelectorAll('pre code').forEach(block => {
                    if (!block.hasAttribute('data-highlighted')) {
                        this.hljs.highlightElement(block);
                        block.setAttribute('data-highlighted', 'true');
                    }
                });
            }

            // Défiler jusqu'en bas
            responseContainer.scrollTop = responseContainer.scrollHeight;

        } catch (error) {
            console.error('Error rendering streaming markdown:', error);
            // En cas d'erreur, fallback vers le rendu texte basique
            this.renderFallbackContent(responseContainer);
        }
    }

    renderFallbackContent(responseContainer) {
        const textToRender = this.currentResponse || '';
        
        if (this.isLibrariesLoaded && this.marked && this.DOMPurify) {
            try {
                // Parser le markdown
                const parsedHtml = this.marked.parse(textToRender);

                // Purifier avec DOMPurify
                const cleanHtml = this.DOMPurify.sanitize(parsedHtml, {
                    ALLOWED_TAGS: [
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'b', 'em', 'i',
                        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead',
                        'tbody', 'tr', 'th', 'td', 'hr', 'sup', 'sub', 'del', 'ins',
                    ],
                    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
                });

                responseContainer.innerHTML = cleanHtml;

                // Ajouter l'interception des clics sur les liens
                this.setupLinkInterception(responseContainer);

                // Appliquer la coloration syntaxique
                if (this.hljs) {
                    responseContainer.querySelectorAll('pre code').forEach(block => {
                        this.hljs.highlightElement(block);
                    });
                }
            } catch (error) {
                console.error('Error in fallback rendering:', error);
                responseContainer.textContent = textToRender;
            }
        } else {
            // Rendu basique si les librairies ne sont pas chargées
            // Escape HTML first to prevent XSS, then apply safe formatting
            const escapedText = textToRender
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            // Apply safe markdown-like formatting (only on escaped content)
            const basicHtml = escapedText
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>');

            responseContainer.innerHTML = `<p>${basicHtml}</p>`;

            // Ajouter l'interception des clics sur les liens
            this.setupLinkInterception(responseContainer);
        }
    }


    requestWindowResize(targetHeight) {
        if (window.api) {
            window.api.askView.adjustWindowHeight(targetHeight);
        }
    }

    animateHeaderText(text) {
        this.headerAnimating = true;
        this.requestUpdate();

        setTimeout(() => {
            this.headerText = text;
            this.headerAnimating = false;
            this.requestUpdate();
        }, 150);
    }

    startHeaderAnimation() {
            this.animateHeaderText('analyse de l\'écran...');

        if (this.headerAnimationTimeout) {
            clearTimeout(this.headerAnimationTimeout);
        }

        this.headerAnimationTimeout = setTimeout(() => {
            this.animateHeaderText('réflexion...');
        }, 1500);
    }

    renderMarkdown(content) {
        if (!content) return '';

        if (this.isLibrariesLoaded && this.marked) {
            return this.parseMarkdown(content);
        }

        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    fixIncompleteMarkdown(text) {
        if (!text) return text;

        // Gestion du gras incomplet
        const boldCount = (text.match(/\*\*/g) || []).length;
        if (boldCount % 2 === 1) {
            text += '**';
        }

        // Gestion de l'italique incomplet
        const italicCount = (text.match(/(?<!\*)\*(?!\*)/g) || []).length;
        if (italicCount % 2 === 1) {
            text += '*';
        }

        // Gestion du code inline incomplet
        const inlineCodeCount = (text.match(/`/g) || []).length;
        if (inlineCodeCount % 2 === 1) {
            text += '`';
        }

        // Gestion des liens incomplets
        const openBrackets = (text.match(/\[/g) || []).length;
        const closeBrackets = (text.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
            text += ']';
        }

        const openParens = (text.match(/\]\(/g) || []).length;
        const closeParens = (text.match(/\)\s*$/g) || []).length;
        if (openParens > closeParens && text.endsWith('(')) {
            text += ')';
        }

        return text;
    }


    async handleCopy() {
        if (this.copyState === 'copied') return;

        let responseToCopy = this.currentResponse;

        if (this.isDOMPurifyLoaded && this.DOMPurify) {
            const testHtml = this.renderMarkdown(responseToCopy);
            const sanitized = this.DOMPurify.sanitize(testHtml);

            if (this.DOMPurify.removed && this.DOMPurify.removed.length > 0) {
                console.warn('Unsafe content detected, copy blocked');
                return;
            }
        }

        const textToCopy = `Question : ${this.currentQuestion}\n\nRéponse : ${responseToCopy}`;

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

    async handleLineCopy(lineIndex) {
        const originalLines = this.currentResponse.split('\n');
        const lineToCopy = originalLines[lineIndex];

        if (!lineToCopy) return;

        try {
            await navigator.clipboard.writeText(lineToCopy);
            console.log('Line copied to clipboard');

            // Mise à jour immédiate de l'UI avec l'état 'copié'
            this.lineCopyState = { ...this.lineCopyState, [lineIndex]: true };
            this.requestUpdate(); // Demander la mise à jour de l'UI à LitElement

            // Réinitialiser le timeout existant si présent
            if (this.lineCopyTimeouts && this.lineCopyTimeouts[lineIndex]) {
                clearTimeout(this.lineCopyTimeouts[lineIndex]);
            }

            // ✨ Timeout modifié : réinitialiser l'état 'copié' après 1.5s
            this.lineCopyTimeouts[lineIndex] = setTimeout(() => {
                const updatedState = { ...this.lineCopyState };
                delete updatedState[lineIndex];
                this.lineCopyState = updatedState;
                this.requestUpdate(); // Demander la mise à jour de l'UI
            }, 1500);
        } catch (err) {
            console.error('Failed to copy line:', err);
        }
    }

    async handleSendText(e, overridingText = '') {
        const textInput = this.shadowRoot?.getElementById('textInput');
        const text = (overridingText || textInput?.value || '').trim();

        textInput.value = '';

        // Phase WOW 1 - Jour 4: Analyze for profile suggestions
        if (window.api && window.api.profile && text && text.length >= 10) {
            try {
                // Get current profile
                const currentProfileResult = await window.api.profile.getCurrentProfile();
                const currentProfile = currentProfileResult?.profile?.active_profile || 'lucide_assistant';

                // Analyze for suggestion
                const suggestionResult = await window.api.profile.analyzeSuggestion(text, currentProfile);

                if (suggestionResult?.success && suggestionResult.suggestion) {
                    // Show suggestion banner
                    const banner = document.querySelector('profile-suggestion-banner');
                    if (banner) {
                        banner.show(suggestionResult.suggestion);
                    }
                }
            } catch (error) {
                console.error('[AskView] Error analyzing profile suggestion:', error);
                // Continue with message sending even if suggestion fails
            }
        }

        if (window.api) {
            // Build enriched message with attachments context
            let enrichedMessage = text;

            if (this.attachments && this.attachments.length > 0) {
                const analyzedAttachments = this.attachments.filter(att => att.status === 'analyzed');

                if (analyzedAttachments.length > 0) {
                    // Prepend attachment context
                    const contextParts = analyzedAttachments.map(att => {
                        const preview = att.extractedText?.substring(0, 2000) || '';
                        return `[Document: ${att.name}]\n${preview}${att.extractedText?.length > 2000 ? '...' : ''}`;
                    });

                    enrichedMessage = `Context from uploaded documents:\n\n${contextParts.join('\n\n---\n\n')}\n\n---\n\nUser Question: ${text}`;

                    console.log('[AskView] Sending message with', analyzedAttachments.length, 'document contexts');
                }

                // Clear attachments after sending
                this.attachments = [];
            }

            window.api.askView.sendMessage(enrichedMessage).catch(error => {
                console.error('Error sending text:', error);
            });
        }
    }

    handleTextKeydown(e) {
        // Fix for IME composition issue: Ignore Enter key presses while composing.
        if (e.isComposing) {
            return;
        }

        const isPlainEnter = e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey;
        const isModifierEnter = e.key === 'Enter' && (e.metaKey || e.ctrlKey);

        if (isPlainEnter || isModifierEnter) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    // Document Upload Handlers
    handleUploadClick() {
        const fileInput = this.shadowRoot?.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileSelect(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        console.log('[AskView] Files selected:', files.length);

        for (const file of files) {
            // Add to attachments with analyzing status
            const attachment = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.name.split('.').pop(),
                status: 'analyzing',
                file: file
            };

            this.attachments = [...this.attachments, attachment];

            // Upload and analyze
            try {
                const result = await this.uploadAndAnalyzeFile(file);

                // Update attachment status with KB info
                this.attachments = this.attachments.map(att =>
                    att.id === attachment.id
                        ? {
                            ...att,
                            status: 'analyzed',
                            extractedText: result.text,
                            documentId: result.documentId,
                            savedToKnowledgeBase: result.savedToKnowledgeBase,
                            indexed: result.indexed
                        }
                        : att
                );

                // Log with KB save status
                if (result.savedToKnowledgeBase) {
                    console.log(`[AskView] File analyzed and saved to KB: ${file.name} (indexed: ${result.indexed})`);
                } else {
                    console.log(`[AskView] File analyzed (not saved to KB): ${file.name}`);
                }
            } catch (error) {
                console.error('[AskView] Error analyzing file:', error);

                // Update to error status
                this.attachments = this.attachments.map(att =>
                    att.id === attachment.id
                        ? { ...att, status: 'error', error: error.message }
                        : att
                );
            }
        }

        // Reset file input
        e.target.value = '';
    }

    async uploadAndAnalyzeFile(file) {
        if (!window.api || !window.api.documents) {
            throw new Error('Upload API not available');
        }

        // Convert File to Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Call analyze-file handler
        const result = await window.api.documents.analyzeFile({
            filename: file.name,
            buffer: Array.from(buffer) // Convert Uint8Array to regular array for IPC
        });

        if (!result.success) {
            throw new Error(result.error || 'Failed to analyze file');
        }

        return {
            text: result.extractedText || '',
            filename: result.filename,
            fileType: result.fileType,
            success: true,
            documentId: result.documentId || null,
            savedToKnowledgeBase: result.savedToKnowledgeBase || false,
            indexed: result.indexed || false
        };
    }

    handleRemoveAttachment(e) {
        const { attachment } = e.detail;
        this.attachments = this.attachments.filter(att => att.id !== attachment.id);
        console.log('[AskView] Attachment removed:', attachment.name);
    }

    // Generated Documents Handlers (Phase 4)
    handleDocumentExportSuccess(e) {
        const { format, filePath } = e.detail;
        console.log(`[AskView] Document exported successfully to ${format}: ${filePath}`);
        // Success - document was exported
    }

    handleDocumentExportError(e) {
        const { format, error } = e.detail;
        console.error(`[AskView] Document export error (${format}):`, error);
        // Error - show to user if needed
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // ✨ Redessiner la vue à chaque changement de isLoading ou currentResponse
        if (changedProperties.has('isLoading') || changedProperties.has('currentResponse')) {
            this.renderContent();
        }

        if (changedProperties.has('showTextInput') || changedProperties.has('isLoading') || changedProperties.has('currentResponse')) {
            this.adjustWindowHeightThrottled();
        }

        if (changedProperties.has('showTextInput') && this.showTextInput) {
            this.focusTextInput();
        }
    }

    firstUpdated() {
        setTimeout(() => this.adjustWindowHeight(), 200);
    }


    getTruncatedQuestion(question, maxLength = 30) {
        if (!question) return '';
        if (question.length <= maxLength) return question;
        return question.substring(0, maxLength) + '...';
    }

    render() {
        const hasResponse = this.isLoading || this.currentResponse || this.isStreaming;
        const headerText = this.isLoading ? 'Réflexion...' : 'Réponse IA';

        return html`
            <div class="ask-container">
                <!-- Response Header -->
                <div class="response-header ${!hasResponse ? 'hidden' : ''}">
                    <div class="header-left">
                        <div class="response-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                                <path d="M8 12l2 2 4-4" />
                            </svg>
                        </div>
                        <span class="response-label">${headerText}</span>
                    </div>
                    <div class="header-right">
                        <span class="question-text">${this.getTruncatedQuestion(this.currentQuestion)}</span>
                        <div class="header-controls">
                            <button class="copy-button ${this.copyState === 'copied' ? 'copied' : ''}" @click=${this.handleCopy}>
                                <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                                <svg
                                    class="check-icon"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                >
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            </button>
                            <button class="close-button" @click=${this.handleShowListenWindow} title="Retour à la conversation">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <button class="close-button" @click=${this.handleMinimizeAskWindow} title="Masquer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                            <button class="close-button" @click=${this.handleCloseAskWindow} title="Fermer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Response Container -->
                <div class="response-container ${!hasResponse ? 'hidden' : ''}" id="responseContainer">
                    <!-- Content is dynamically generated in updateResponseContent() -->
                </div>

                <!-- Phase 4: RAG - Citations from Knowledge Base -->
                ${hasResponse && this.sessionId ? html`
                    <citation-view .sessionId=${this.sessionId}></citation-view>
                ` : ''}

                <!-- Phase 4: Generated Documents Display -->
                ${this.generatedDocuments && this.generatedDocuments.length > 0 ? html`
                    <div class="generated-documents-wrapper">
                        ${this.generatedDocuments.map(doc => html`
                            <document-preview
                                .document=${doc}
                                @export-success=${this.handleDocumentExportSuccess}
                                @export-error=${this.handleDocumentExportError}
                            ></document-preview>
                        `)}
                    </div>
                ` : ''}

                <!-- Quick Actions Panel (Phase 3: Workflows) - DÉSACTIVÉ -->
                <!-- ${!hasResponse ? html`<quick-actions-panel></quick-actions-panel>` : ''} -->

                <!-- Attachments Display -->
                ${this.attachments && this.attachments.length > 0 ? html`
                    <div class="attachments-wrapper">
                        <attachment-bubble
                            .attachments=${this.attachments}
                            @remove-attachment=${this.handleRemoveAttachment}
                        ></attachment-bubble>
                    </div>
                ` : ''}

                <!-- Phase 1: Workflow Form Dialog -->
                <workflow-form-dialog></workflow-form-dialog>

                <!-- Text Input Container -->
                <div class="text-input-container ${!hasResponse ? 'no-response' : ''} ${!this.showTextInput ? 'hidden' : ''}">
                    <!-- Upload Button -->
                    <button class="upload-btn" @click=${this.handleUploadClick} title="Ajouter des documents">
                        +
                    </button>

                    <!-- Hidden File Input -->
                    <input
                        type="file"
                        id="fileInput"
                        multiple
                        accept=".pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.gif"
                        @change=${this.handleFileSelect}
                        style="display: none;"
                    />

                    <input
                        type="text"
                        id="textInput"
                        placeholder="Posez une question sur votre écran ou audio"
                        @keydown=${this.handleTextKeydown}
                        @focus=${this.handleInputFocus}
                    />
                    <button
                        class="submit-btn"
                        @click=${this.handleSendText}
                    >
                        <span class="btn-label">Envoyer</span>
                        <span class="btn-icon">
                            ↵
                        </span>
                    </button>
                </div>
            </div>
        `;
    }

    // Dynamically resize the BrowserWindow to fit current content
    adjustWindowHeight() {
        if (!window.api) {
            return;
        }

        this.updateComplete.then(() => {
            const headerEl = this.shadowRoot.querySelector('.response-header');
            const responseEl = this.shadowRoot.querySelector('.response-container');
            const inputEl = this.shadowRoot.querySelector('.text-input-container');

            if (!headerEl || !responseEl) return;

            const headerHeight = headerEl.classList.contains('hidden') ? 0 : headerEl.offsetHeight;
            const responseHeight = responseEl.scrollHeight;
            const inputHeight = (inputEl && !inputEl.classList.contains('hidden')) ? inputEl.offsetHeight : 0;

            const idealHeight = headerHeight + responseHeight + inputHeight;

            const targetHeight = Math.min(700, idealHeight);

            window.api.askView.adjustWindowHeight("ask", targetHeight);

        }).catch(err => console.error('AskView adjustWindowHeight error:', err));
    }

    // Throttled wrapper to avoid excessive IPC spam (executes at most once per animation frame)
    adjustWindowHeightThrottled() {
        if (this.isThrottled) return;

        this.isThrottled = true;
        requestAnimationFrame(() => {
            this.adjustWindowHeight();
            this.isThrottled = false;
        });
    }
}

customElements.define('ask-view', AskView);
