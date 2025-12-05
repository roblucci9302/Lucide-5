import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import './ParticipantModal.js';
import './EmailPreviewModal.js';

/**
 * Post-Meeting Panel Component
 * Affiche les notes de réunion, les tâches et les options d'export
 * Visible uniquement après avoir cliqué "Terminé" dans le mode écoute
 */
export class PostMeetingPanel extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
        }

        .panel-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: var(--color-gray-800);
            border-radius: var(--radius-lg);
            outline: 0.5px var(--color-white-20) solid;
            outline-offset: -1px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            z-index: 1000;
        }

        .panel-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: var(--color-black-15);
            box-shadow: var(--shadow-lg);
            border-radius: var(--radius-lg);
            filter: blur(10px);
            z-index: -1;
        }

        /* Header */
        .panel-header {
            padding: 12px;
            border-bottom: 1px solid var(--color-white-10);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .panel-title {
            font-size: 13px;
            font-weight: 500;
            color: white;
            margin: 0;
        }

        .close-button {
            background: transparent;
            border: none;
            color: var(--color-white-70);
            cursor: pointer;
            padding: 4px;
            font-size: 16px;
            line-height: 1;
            transition: color 0.15s ease;
        }

        .close-button:hover {
            color: white;
        }

        /* Tabs */
        .tabs {
            display: flex;
            padding: 0 12px;
            gap: 4px;
            border-bottom: 1px solid var(--color-white-10);
            background: var(--color-black-10);
        }

        .tab {
            background: transparent;
            border: none;
            color: var(--color-white-60);
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            border-bottom: 2px solid transparent;
            position: relative;
        }

        .tab:hover {
            color: var(--color-white-80);
            background: var(--color-white-5);
        }

        .tab.active {
            color: white;
            border-bottom-color: var(--color-primary-500);
        }

        /* Content */
        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
        }

        .panel-content::-webkit-scrollbar {
            width: var(--scrollbar-width);
        }

        .panel-content::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .panel-content::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 4px;
        }

        .panel-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        /* Empty State */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--color-white-50);
            font-size: 11px;
            text-align: center;
            padding: 20px;
        }

        .empty-icon {
            font-size: 32px;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        /* Loading State */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--color-white-50);
            font-size: 11px;
        }

        .spinner {
            border: 2px solid var(--color-white-20);
            border-top-color: var(--color-primary-500);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 0.8s linear infinite;
            margin-bottom: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Summary Section */
        .summary-section {
            margin-bottom: 16px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 500;
            color: white;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .summary-text {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
            line-height: 1.5;
            color: var(--color-white-90);
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            font-size: 10px;
            color: var(--color-white-60);
        }

        .info-label {
            font-weight: 500;
        }

        /* List Styles */
        .item-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .list-item {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 6px;
            font-size: 11px;
        }

        .item-title {
            font-weight: 500;
            color: white;
            margin-bottom: 4px;
        }

        .item-meta {
            display: flex;
            gap: 12px;
            font-size: 10px;
            color: var(--color-white-60);
            margin-top: 4px;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Tasks */
        .task-item {
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }

        .task-checkbox {
            margin-top: 2px;
            cursor: pointer;
        }

        .task-content {
            flex: 1;
        }

        .task-description {
            font-weight: 400;
            color: white;
            margin-bottom: 4px;
        }

        .task-completed .task-description {
            text-decoration: line-through;
            opacity: 0.6;
        }

        .priority-high {
            color: var(--color-error-400);
        }

        .priority-medium {
            color: var(--color-warning-400);
        }

        .priority-low {
            color: var(--color-white-60);
        }

        /* Phase 4: Quality Score Badge */
        .quality-score {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .quality-score.excellent {
            background: color-mix(in srgb, var(--color-success-500) 20%, transparent);
            color: var(--color-success-400);
            border: 1px solid var(--color-success-500);
        }

        .quality-score.good {
            background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
            color: var(--color-primary-400);
            border: 1px solid var(--color-primary-500);
        }

        .quality-score.fair {
            background: color-mix(in srgb, var(--color-warning-500) 20%, transparent);
            color: var(--color-warning-400);
            border: 1px solid var(--color-warning-500);
        }

        .quality-score.poor {
            background: color-mix(in srgb, var(--color-error-500) 20%, transparent);
            color: var(--color-error-400);
            border: 1px solid var(--color-error-500);
        }

        /* Phase 4: Meeting Type Badge */
        .meeting-type-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            background: var(--color-white-10);
            color: var(--color-white-80);
            border: 1px solid var(--color-white-20);
        }

        /* Phase 4: Severity Badges for Risks */
        .severity-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .severity-badge.high {
            background: color-mix(in srgb, var(--color-error-500) 20%, transparent);
            color: var(--color-error-400);
        }

        .severity-badge.medium {
            background: color-mix(in srgb, var(--color-warning-500) 20%, transparent);
            color: var(--color-warning-400);
        }

        .severity-badge.low {
            background: color-mix(in srgb, var(--color-success-500) 20%, transparent);
            color: var(--color-success-400);
        }

        /* Phase 4: Enhanced Action Item Card */
        .action-item-card {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
        }

        .action-item-card.priority-high {
            border-left: 3px solid var(--color-error-400);
        }

        .action-item-card.priority-medium {
            border-left: 3px solid var(--color-warning-400);
        }

        .action-item-card.priority-low {
            border-left: 3px solid var(--color-success-400);
        }

        .action-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
        }

        .action-details {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            font-size: 10px;
            color: var(--color-white-60);
        }

        .action-detail {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Phase 4: Risk Card */
        .risk-card {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
        }

        .risk-card.severity-high {
            border-left: 3px solid var(--color-error-400);
            background: color-mix(in srgb, var(--color-error-500) 5%, var(--color-black-20));
        }

        .risk-card.severity-medium {
            border-left: 3px solid var(--color-warning-400);
        }

        .risk-card.severity-low {
            border-left: 3px solid var(--color-success-400);
        }

        /* Export Section */
        .export-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .export-button {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            color: white;
            padding: 12px 8px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .export-button:hover {
            background: var(--color-white-15);
            border-color: var(--scrollbar-thumb-hover);
            transform: translateY(-2px);
        }

        .export-button:active {
            transform: translateY(0);
        }

        .export-icon {
            font-size: 20px;
        }

        .export-label {
            font-size: 10px;
        }

        /* Success/Error Messages */
        .message {
            padding: 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-bottom: 12px;
        }

        .message.success {
            background: color-mix(in srgb, var(--color-success-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-success-500) 30%, transparent);
            color: var(--color-success-400);
        }

        .message.error {
            background: color-mix(in srgb, var(--color-error-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-error-500) 30%, transparent);
            color: var(--color-error-400);
        }

        /* Generate Button */
        .generate-button {
            background: var(--color-primary-500);
            border: 1px solid var(--color-primary-600);
            border-radius: 4px;
            color: white;
            padding: 8px 16px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            width: 100%;
        }

        .generate-button:hover {
            background: var(--color-primary-600);
        }

        .generate-button:active {
            transform: translateY(1px);
        }

        .generate-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* Phase 2.1: Session History Selector */
        .session-selector {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: var(--color-black-20);
            border-bottom: 1px solid var(--color-white-10);
        }

        .session-selector label {
            font-size: 10px;
            color: var(--color-white-60);
            white-space: nowrap;
        }

        .session-dropdown {
            flex: 1;
            background: var(--color-black-30);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            color: white;
            padding: 6px 8px;
            font-size: 11px;
            cursor: pointer;
        }

        .session-dropdown:hover {
            border-color: var(--color-white-30);
        }

        .session-dropdown:focus {
            outline: none;
            border-color: var(--color-primary-500);
        }

        /* Phase 2.2: Progress Indicator */
        .progress-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
        }

        .progress-steps {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .progress-step {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-white-20);
            transition: all 0.3s ease;
        }

        .progress-step.active {
            background: var(--color-primary-500);
            transform: scale(1.2);
        }

        .progress-step.completed {
            background: var(--color-success-500);
        }

        .progress-message {
            font-size: 12px;
            color: var(--color-white-80);
            text-align: center;
            margin-top: 8px;
        }

        .progress-spinner {
            border: 3px solid var(--color-white-20);
            border-top-color: var(--color-primary-500);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        /* Phase 2.3: Error State with Retry */
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
            text-align: center;
        }

        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .error-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-error-400);
            margin-bottom: 8px;
        }

        .error-message {
            font-size: 11px;
            color: var(--color-white-60);
            margin-bottom: 16px;
            max-width: 280px;
        }

        .retry-button {
            background: var(--color-primary-500);
            border: none;
            border-radius: 4px;
            color: white;
            padding: 8px 20px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .retry-button:hover {
            background: var(--color-primary-600);
        }

        /* Phase 2.4: Edit Mode */
        .edit-toolbar {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-bottom: 12px;
        }

        .edit-button {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            color: white;
            padding: 6px 12px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .edit-button:hover {
            background: var(--color-white-15);
        }

        .edit-button.primary {
            background: var(--color-primary-500);
            border-color: var(--color-primary-600);
        }

        .edit-button.primary:hover {
            background: var(--color-primary-600);
        }

        .editable-field {
            position: relative;
        }

        .editable-field.editing .summary-text {
            border-color: var(--color-primary-500);
            background: var(--color-black-30);
        }

        .edit-textarea {
            width: 100%;
            min-height: 80px;
            background: var(--color-black-30);
            border: 1px solid var(--color-primary-500);
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
            line-height: 1.5;
            color: var(--color-white-90);
            resize: vertical;
            font-family: inherit;
        }

        .edit-textarea:focus {
            outline: none;
            border-color: var(--color-primary-400);
        }

        .char-count {
            position: absolute;
            bottom: 4px;
            right: 8px;
            font-size: 9px;
            color: var(--color-white-40);
        }
    `;

    static properties = {
        sessionId: { type: String },
        activeTab: { type: String },
        meetingNotes: { type: Object },
        tasks: { type: Array },
        isLoading: { type: Boolean },
        isGenerating: { type: Boolean },
        message: { type: Object }, // { type: 'success' | 'error', text: string }
        showParticipantModal: { type: Boolean },
        showEmailModal: { type: Boolean },
        currentEmailData: { type: Object },
        isGeneratingEmail: { type: Boolean },
        suggestions: { type: Array },
        isLoadingSuggestions: { type: Boolean },
        // Phase 2 UX Improvements
        allSessions: { type: Array },        // Phase 2.1: Session history
        generationProgress: { type: Object }, // Phase 2.2: Progress indicator { step, total, message }
        lastError: { type: Object },          // Phase 2.3: Error with retry capability
        isEditing: { type: Boolean },         // Phase 2.4: Edit mode
        editedFields: { type: Object },       // Phase 2.4: Fields being edited
    };

    constructor() {
        super();
        this.sessionId = null;
        this.activeTab = 'summary';
        this.meetingNotes = null;
        this.tasks = [];
        this.isLoading = false;
        this.isGenerating = false;
        this.message = null;
        this.showParticipantModal = false;
        this.showEmailModal = false;
        this.currentEmailData = null;
        this.isGeneratingEmail = false;
        this.suggestions = [];
        this.isLoadingSuggestions = false;

        // Phase 2 UX Improvements
        this.allSessions = [];              // Phase 2.1: All sessions with notes
        this.generationProgress = null;     // Phase 2.2: { step: 1, total: 4, message: 'Étape...' }
        this.lastError = null;              // Phase 2.3: { message, canRetry, retryAction }
        this.isEditing = false;             // Phase 2.4: Edit mode toggle
        this.editedFields = {};             // Phase 2.4: Edited field values

        // FIX MEDIUM: Store callback references for cleanup
        this._ipcCallbacks = {
            onSetSession: null,
            onNotesGenerated: null,
            onExportComplete: null,
            onError: null,
            onProgress: null  // Phase 2.2: Progress updates
        };

        // Setup IPC listeners
        this._setupListeners();
    }

    connectedCallback() {
        super.connectedCallback();
        // Phase 2.1: Load all sessions with notes for history navigation
        this.loadAllSessions();

        // Load meeting notes if sessionId is provided
        if (this.sessionId) {
            this.loadMeetingNotes();
        }
    }

    /**
     * FIX MEDIUM: Clean up IPC listeners to prevent memory leaks
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        this._cleanupListeners();
    }

    _cleanupListeners() {
        // Remove all IPC listeners to prevent memory leaks
        if (window.api?.postMeeting) {
            if (this._ipcCallbacks.onSetSession) {
                window.api.postMeeting.removeOnSetSession?.(this._ipcCallbacks.onSetSession);
            }
            if (this._ipcCallbacks.onNotesGenerated) {
                window.api.postMeeting.removeOnNotesGenerated?.(this._ipcCallbacks.onNotesGenerated);
            }
            if (this._ipcCallbacks.onExportComplete) {
                window.api.postMeeting.removeOnExportComplete?.(this._ipcCallbacks.onExportComplete);
            }
            if (this._ipcCallbacks.onError) {
                window.api.postMeeting.removeOnError?.(this._ipcCallbacks.onError);
            }
        }
        console.log('[PostMeetingPanel] IPC listeners cleaned up');
    }

    _setupListeners() {
        // FIX MEDIUM: Store callback references for proper cleanup
        // Listen for session ID from main process (when window opens)
        this._ipcCallbacks.onSetSession = (sessionId) => {
            console.log('[PostMeetingPanel] Session ID received:', sessionId);
            this.sessionId = sessionId;
            // Automatically load meeting notes for this session
            this.loadMeetingNotes();
        };
        window.api?.postMeeting?.onSetSession?.(this._ipcCallbacks.onSetSession);

        // Listen for meeting notes updates from main process
        this._ipcCallbacks.onNotesGenerated = ({ notes, tasks }) => {
            console.log('[PostMeetingPanel] Notes generated:', notes);
            this.meetingNotes = notes;
            this.tasks = tasks || [];
            this.isGenerating = false;
            this.isLoading = false;
            this.message = { type: 'success', text: '✅ Notes générées avec succès' };
            setTimeout(() => { this.message = null; }, 3000);
        };
        window.api?.postMeeting?.onNotesGenerated?.(this._ipcCallbacks.onNotesGenerated);

        this._ipcCallbacks.onExportComplete = ({ format, filePath }) => {
            console.log(`[PostMeetingPanel] Export ${format} complete:`, filePath);
            this.message = { type: 'success', text: `✅ Export ${format.toUpperCase()} réussi: ${filePath}` };
            setTimeout(() => { this.message = null; }, 5000);
        };
        window.api?.postMeeting?.onExportComplete?.(this._ipcCallbacks.onExportComplete);

        this._ipcCallbacks.onError = ({ error }) => {
            console.error('[PostMeetingPanel] Error:', error);
            this.isGenerating = false;
            this.isLoading = false;
            this.message = { type: 'error', text: `❌ Erreur: ${error}` };
        };
        window.api?.postMeeting?.onError?.(this._ipcCallbacks.onError);
    }

    async loadMeetingNotes() {
        if (!this.sessionId) return;

        this.isLoading = true;
        try {
            const result = await window.api.postMeeting.getMeetingNotes(this.sessionId);
            if (result) {
                this.meetingNotes = result.notes;
                this.tasks = result.tasks || [];

                // Load suggestions if notes exist
                if (this.meetingNotes) {
                    this.loadSuggestions();
                }
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading notes:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadSuggestions() {
        if (!this.sessionId || !this.meetingNotes) return;

        this.isLoadingSuggestions = true;
        try {
            const suggestions = await window.api.tasks.generateSuggestions(this.sessionId, {
                useAI: true // Enable AI suggestions
            });
            this.suggestions = suggestions || [];
            console.log(`[PostMeetingPanel] Loaded ${this.suggestions.length} suggestions`);
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading suggestions:', error);
            this.suggestions = [];
        } finally {
            this.isLoadingSuggestions = false;
        }
    }

    // ==================== Phase 2 UX Methods ====================

    /**
     * Phase 2.1: Load all sessions with meeting notes for history navigation
     */
    async loadAllSessions() {
        try {
            const result = await window.api?.postMeeting?.getAllNotes?.();
            if (result?.success && result.notes) {
                // Sort by creation date descending (most recent first)
                this.allSessions = result.notes.sort((a, b) =>
                    (b.created_at || 0) - (a.created_at || 0)
                );
                console.log(`[PostMeetingPanel] Loaded ${this.allSessions.length} sessions with notes`);
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading all sessions:', error);
            this.allSessions = [];
        }
    }

    /**
     * Phase 2.1: Handle session change from dropdown
     */
    async handleSessionChange(event) {
        const newSessionId = event.target.value;
        if (newSessionId && newSessionId !== this.sessionId) {
            this.sessionId = newSessionId;
            this.meetingNotes = null;
            this.tasks = [];
            this.isEditing = false;
            this.editedFields = {};
            this.lastError = null;
            await this.loadMeetingNotes();
        }
    }

    /**
     * Phase 2.2: Update generation progress
     */
    _updateProgress(step, message) {
        const progressSteps = [
            'Récupération de la transcription...',
            'Analyse par l\'IA...',
            'Extraction des actions...',
            'Sauvegarde des notes...'
        ];
        this.generationProgress = {
            step,
            total: progressSteps.length,
            message: message || progressSteps[step - 1] || 'Traitement...'
        };
    }

    /**
     * Phase 2.3: Handle retry after error
     */
    async handleRetry() {
        this.lastError = null;
        this.message = null;
        await this.handleGenerateNotes();
    }

    /**
     * Phase 2.4: Toggle edit mode
     */
    handleToggleEdit() {
        if (this.isEditing) {
            // Cancel editing - reset edited fields
            this.editedFields = {};
        } else {
            // Start editing - initialize with current values
            const data = this._parseNoteData(this.meetingNotes);
            this.editedFields = {
                executiveSummary: data.executiveSummary || ''
            };
        }
        this.isEditing = !this.isEditing;
    }

    /**
     * Phase 2.4: Update edited field value
     */
    handleFieldEdit(field, value) {
        this.editedFields = {
            ...this.editedFields,
            [field]: value
        };
    }

    /**
     * Phase 2.4: Save edited notes
     */
    async handleSaveEdits() {
        if (!this.sessionId || !this.meetingNotes) return;

        this.isLoading = true;
        try {
            // Update the meeting notes with edited fields
            const updates = {};
            if (this.editedFields.executiveSummary !== undefined) {
                updates.executive_summary = this.editedFields.executiveSummary;
            }

            const result = await window.api?.postMeeting?.updateNotes?.(
                this.meetingNotes.id,
                updates
            );

            if (result?.success) {
                this.message = { type: 'success', text: '✅ Notes mises à jour' };
                this.isEditing = false;
                this.editedFields = {};
                await this.loadMeetingNotes();
            } else {
                throw new Error(result?.error || 'Échec de la mise à jour');
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error saving edits:', error);
            this.message = { type: 'error', text: `❌ Erreur: ${error.message}` };
        } finally {
            this.isLoading = false;
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    /**
     * Phase 2.2/2.3: Format session date for display
     */
    _formatSessionDate(timestamp) {
        if (!timestamp) return 'Date inconnue';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ==================== End Phase 2 UX Methods ====================

    async handleAcceptSuggestion(suggestion) {
        if (!this.sessionId) return;

        try {
            const result = await window.api.tasks.acceptSuggestion(this.sessionId, suggestion);

            if (result.success) {
                // Remove from suggestions list
                this.suggestions = this.suggestions.filter(s => s.type !== suggestion.type);

                // Handle specific actions
                if (result.action === 'open_task_assignment') {
                    // Could open task modal here
                    this.message = { type: 'success', text: '✅ Action appliquée' };
                } else if (result.action === 'filter_upcoming_tasks') {
                    this.activeTab = 'tasks';
                    this.message = { type: 'success', text: '✅ Affichage des tâches à échéance' };
                } else {
                    this.message = { type: 'success', text: `✅ ${result.message}` };
                }

                // Reload if auto-assign was done
                if (suggestion.action === 'auto_assign_emails') {
                    await this.loadMeetingNotes();
                }

                setTimeout(() => { this.message = null; }, 3000);
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error accepting suggestion:', error);
            this.message = { type: 'error', text: `❌ Erreur: ${error.message}` };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    async handleDismissSuggestion(suggestion) {
        if (!this.sessionId) return;

        try {
            await window.api.tasks.dismissSuggestion(this.sessionId, suggestion.type);

            // Remove from list
            this.suggestions = this.suggestions.filter(s => s.type !== suggestion.type);
        } catch (error) {
            console.error('[PostMeetingPanel] Error dismissing suggestion:', error);
        }
    }

    async handleGenerateNotes() {
        if (!this.sessionId || this.isGenerating) return;

        this.isGenerating = true;
        this.lastError = null;
        this.message = null;

        // Phase 2.2: Initialize progress
        this._updateProgress(1, 'Récupération de la transcription...');

        try {
            // Simulate progress updates (actual progress would come from IPC)
            const progressInterval = setInterval(() => {
                if (this.generationProgress && this.generationProgress.step < 4) {
                    this._updateProgress(this.generationProgress.step + 1);
                }
            }, 2000);

            await window.api.postMeeting.generateNotes(this.sessionId);

            clearInterval(progressInterval);
            this.generationProgress = null;

            // Reload all sessions to update the dropdown
            await this.loadAllSessions();

        } catch (error) {
            console.error('[PostMeetingPanel] Error generating notes:', error);
            this.isGenerating = false;
            this.generationProgress = null;

            // Phase 2.3: Set error with retry capability
            this.lastError = {
                message: this._getErrorMessage(error),
                canRetry: this._canRetryError(error),
                originalError: error.message
            };
        }
    }

    /**
     * Phase 2.3: Get user-friendly error message
     */
    _getErrorMessage(error) {
        const msg = error.message?.toLowerCase() || '';

        if (msg.includes('no transcripts') || msg.includes('aucune transcription')) {
            return 'Aucune transcription trouvée. Assurez-vous d\'avoir parlé pendant l\'enregistrement.';
        }
        if (msg.includes('api key') || msg.includes('not configured')) {
            return 'Clé API non configurée. Vérifiez vos paramètres de configuration.';
        }
        if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset')) {
            return 'Erreur réseau. Vérifiez votre connexion internet et réessayez.';
        }
        if (msg.includes('rate limit')) {
            return 'Limite de requêtes atteinte. Veuillez patienter quelques minutes.';
        }
        if (msg.includes('session') && msg.includes('not found')) {
            return 'Session introuvable. Essayez de relancer une nouvelle écoute.';
        }

        return error.message || 'Une erreur inattendue s\'est produite.';
    }

    /**
     * Phase 2.3: Determine if error is retryable
     */
    _canRetryError(error) {
        const msg = error.message?.toLowerCase() || '';

        // Non-retryable errors
        if (msg.includes('no transcripts') || msg.includes('aucune transcription')) return false;
        if (msg.includes('api key') || msg.includes('not configured')) return false;
        if (msg.includes('session') && msg.includes('not found')) return false;

        // Retryable errors
        return true;
    }

    async handleExport(format) {
        if (!this.meetingNotes) {
            this.message = { type: 'error', text: '❌ Aucune note à exporter' };
            return;
        }

        this.message = { type: 'success', text: `⏳ Export ${format.toUpperCase()} en cours...` };

        try {
            await window.api.postMeeting.exportNotes(this.sessionId, format);
        } catch (error) {
            console.error('[PostMeetingPanel] Export error:', error);
            this.message = { type: 'error', text: `❌ Erreur d'export: ${error.message}` };
        }
    }

    async handleTaskToggle(taskId, completed) {
        try {
            await window.api.postMeeting.updateTask(taskId, {
                status: completed ? 'completed' : 'pending',
                completed_at: completed ? Math.floor(Date.now() / 1000) : null
            });

            // Update local state
            this.tasks = this.tasks.map(t =>
                t.id === taskId ? { ...t, status: completed ? 'completed' : 'pending' } : t
            );
        } catch (error) {
            console.error('[PostMeetingPanel] Error updating task:', error);
        }
    }

    handleClose() {
        // FIX: Close the window directly via IPC instead of dispatching unused event
        if (window.api?.postMeeting?.closeWindow) {
            window.api.postMeeting.closeWindow();
        } else if (window.api?.window?.close) {
            window.api.window.close();
        } else {
            // Fallback: try to close via standard web API
            window.close();
        }
    }

    handleOpenParticipantModal() {
        this.showParticipantModal = true;
    }

    handleCloseParticipantModal() {
        this.showParticipantModal = false;
    }

    async handleParticipantsSaved(event) {
        const { sessionId } = event.detail;

        this.message = { type: 'success', text: '✅ Participants enregistrés avec succès' };
        setTimeout(() => { this.message = null; }, 3000);

        // Reload meeting notes if they exist to update with participant names
        if (this.meetingNotes) {
            try {
                await window.api.participants.updateNotesWithParticipants(sessionId, this.meetingNotes.id);
                await this.loadMeetingNotes();
                this.message = { type: 'success', text: '✅ Notes mises à jour avec les participants' };
                setTimeout(() => { this.message = null; }, 3000);
            } catch (error) {
                console.error('[PostMeetingPanel] Error updating notes with participants:', error);
            }
        }

        this.showParticipantModal = false;
    }

    async handleGenerateEmail(templateType = 'brief') {
        if (!this.sessionId || this.isGeneratingEmail) return;

        this.isGeneratingEmail = true;
        this.message = { type: 'success', text: '⏳ Génération de l\'email en cours...' };

        try {
            let emailData;

            if (templateType === 'ai') {
                // Use AI to generate email
                emailData = await window.api.email.generateFollowUp(this.sessionId, {
                    template: 'standard',
                    tone: 'professional',
                    includeActionItems: true,
                    includeDecisions: true
                });
            } else {
                // Use quick template
                emailData = await window.api.email.generateTemplate(this.sessionId, templateType);
            }

            this.currentEmailData = emailData;
            this.showEmailModal = true;
            this.message = null;
        } catch (error) {
            console.error('[PostMeetingPanel] Error generating email:', error);
            this.message = { type: 'error', text: `❌ Erreur: ${error.message}` };
            setTimeout(() => { this.message = null; }, 5000);
        } finally {
            this.isGeneratingEmail = false;
        }
    }

    handleCloseEmailModal() {
        this.showEmailModal = false;
        this.currentEmailData = null;
    }

    renderSummaryTab() {
        if (!this.meetingNotes) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>Aucune note de réunion disponible</p>
                    <button class="generate-button" @click=${this.handleGenerateNotes} ?disabled=${this.isGenerating}>
                        ${this.isGenerating ? '⏳ Génération...' : '📝 Générer le compte-rendu'}
                    </button>
                </div>
            `;
        }

        const data = this._parseNoteData(this.meetingNotes);

        return html`
            <!-- Phase 2.4: Edit Toolbar -->
            <div class="edit-toolbar">
                ${this.isEditing ? html`
                    <button class="edit-button" @click=${this.handleToggleEdit}>
                        ✕ Annuler
                    </button>
                    <button class="edit-button primary" @click=${this.handleSaveEdits}>
                        💾 Enregistrer
                    </button>
                ` : html`
                    <button class="edit-button" @click=${this.handleToggleEdit}>
                        ✏️ Modifier
                    </button>
                `}
            </div>

            <div class="summary-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 class="section-title" style="margin: 0;">👥 Attribution des participants</h3>
                    <button
                        class="export-button"
                        style="padding: 6px 12px; font-size: 10px;"
                        @click=${this.handleOpenParticipantModal}
                    >
                        ✏️ Assigner
                    </button>
                </div>
                ${data.participants && data.participants.length > 0 ? html`
                    <div class="summary-text">${data.participants.join(', ')}</div>
                ` : html`
                    <div class="summary-text" style="color: var(--color-white-60); font-style: italic;">
                        Aucun participant assigné. Cliquez sur "Assigner" pour attribuer les speakers.
                    </div>
                `}
            </div>

            ${this.suggestions.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">💡 Suggestions de suivi</h3>
                    <ul class="item-list">
                        ${this.suggestions.slice(0, 5).map(suggestion => html`
                            <li class="list-item">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                                    <div style="flex: 1;">
                                        <div class="item-title" style="display: flex; align-items: center; gap: 6px;">
                                            ${suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'low' ? '🟢' : '🟡'}
                                            ${suggestion.title}
                                        </div>
                                        <div style="color: var(--color-white-70); font-size: 10px; margin-top: 4px;">
                                            ${suggestion.description}
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 4px; flex-shrink: 0;">
                                        <button
                                            class="export-button"
                                            style="padding: 4px 8px; font-size: 9px;"
                                            @click=${() => this.handleAcceptSuggestion(suggestion)}
                                        >
                                            ✓ Appliquer
                                        </button>
                                        <button
                                            class="export-button"
                                            style="padding: 4px 8px; font-size: 9px; background: var(--color-white-5);"
                                            @click=${() => this.handleDismissSuggestion(suggestion)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </li>
                        `)}
                    </ul>
                </div>
            ` : this.isLoadingSuggestions ? html`
                <div class="summary-section">
                    <h3 class="section-title">💡 Suggestions de suivi</h3>
                    <div style="color: var(--color-white-60); font-size: 11px; font-style: italic; text-align: center; padding: 12px;">
                        ⏳ Analyse en cours...
                    </div>
                </div>
            ` : ''}

            ${data.metadata?.qualityScore !== null || data.meetingType !== 'general' ? html`
                <div class="summary-section" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    ${data.meetingType && data.meetingType !== 'general' ? html`
                        <span class="meeting-type-badge">
                            ${this._getMeetingTypeIcon(data.meetingType)} ${this._getMeetingTypeLabel(data.meetingType)}
                        </span>
                    ` : ''}
                    ${data.metadata?.qualityScore !== null ? html`
                        <span class="quality-score ${this._getQualityScoreClass(data.metadata.qualityScore)}">
                            ${this._getQualityScoreIcon(data.metadata.qualityScore)} Qualité: ${data.metadata.qualityScore}/100
                        </span>
                    ` : ''}
                </div>
            ` : ''}

            <div class="summary-section">
                <h3 class="section-title">📝 Résumé exécutif</h3>
                <!-- Phase 2.4: Editable executive summary -->
                ${this.isEditing ? html`
                    <div class="editable-field editing">
                        <textarea
                            class="edit-textarea"
                            .value=${this.editedFields.executiveSummary || ''}
                            @input=${(e) => this.handleFieldEdit('executiveSummary', e.target.value)}
                            placeholder="Résumé exécutif de la réunion..."
                            rows="4"
                        ></textarea>
                        <span class="char-count">${(this.editedFields.executiveSummary || '').length} caractères</span>
                    </div>
                ` : html`
                    <div class="summary-text">${data.executiveSummary || 'Aucun résumé disponible'}</div>
                `}
            </div>

            ${data.objectives && data.objectives.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">🎯 Objectifs de la réunion</h3>
                    <ul class="item-list">
                        ${data.objectives.map(obj => html`
                            <li class="list-item">
                                ${typeof obj === 'string' ? obj : obj.objective || obj.description || JSON.stringify(obj)}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.keyPoints && data.keyPoints.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">🎯 Points clés</h3>
                    <ul class="item-list">
                        ${data.keyPoints.map(point => html`
                            <li class="list-item">${point}</li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.decisions && data.decisions.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">🔍 Décisions prises (${data.decisions.length})</h3>
                    <ul class="item-list">
                        ${data.decisions.map(decision => html`
                            <li class="list-item">
                                <div class="item-title">${decision.decision || decision.title || decision}</div>
                                ${decision.rationale ? html`
                                    <div style="color: var(--color-white-70); margin-top: 4px; font-size: 10px;">
                                        <strong>Justification:</strong> ${decision.rationale}
                                    </div>
                                ` : ''}
                                ${decision.impact ? html`
                                    <div style="color: var(--color-primary-400); margin-top: 2px; font-size: 10px;">
                                        <strong>Impact:</strong> ${decision.impact}
                                    </div>
                                ` : ''}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.actionItems && data.actionItems.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">✅ Actions à suivre (${data.actionItems.length})</h3>
                    ${data.actionItems.map(action => html`
                        <div class="action-item-card priority-${action.priority || 'medium'}">
                            <div class="action-header">
                                <div class="item-title" style="flex: 1;">${action.task || action.action || action}</div>
                                <span class="severity-badge ${action.priority || 'medium'}">
                                    ${action.priority === 'high' ? '🔴' : action.priority === 'low' ? '🟢' : '🟡'} ${action.priority || 'medium'}
                                </span>
                            </div>
                            <div class="action-details">
                                ${action.assignee && action.assignee !== 'Non assigné' ? html`
                                    <span class="action-detail">👤 ${action.assignee}</span>
                                ` : ''}
                                ${action.deadline && action.deadline !== 'Non défini' ? html`
                                    <span class="action-detail">📅 ${action.deadline}</span>
                                ` : ''}
                                ${action.status ? html`
                                    <span class="action-detail">📋 ${action.status}</span>
                                ` : ''}
                            </div>
                            ${action.successCriteria ? html`
                                <div style="color: var(--color-success-400); margin-top: 6px; font-size: 10px;">
                                    ✓ Critère de succès: ${action.successCriteria}
                                </div>
                            ` : ''}
                            ${action.dependencies && action.dependencies.length > 0 ? html`
                                <div style="color: var(--color-white-50); margin-top: 4px; font-size: 10px;">
                                    🔗 Dépendances: ${action.dependencies.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    `)}
                </div>
            ` : ''}

            ${data.risks && data.risks.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">⚠️ Risques identifiés (${data.risks.length})</h3>
                    ${data.risks.map(risk => html`
                        <div class="risk-card severity-${risk.severity || 'medium'}">
                            <div class="action-header">
                                <div class="item-title" style="flex: 1;">${risk.risk || risk.description || risk}</div>
                                <span class="severity-badge ${risk.severity || 'medium'}">
                                    ${risk.severity || 'medium'}
                                </span>
                            </div>
                            ${risk.mitigation ? html`
                                <div style="color: var(--color-success-400); margin-top: 6px; font-size: 10px;">
                                    💡 Mitigation: ${risk.mitigation}
                                </div>
                            ` : ''}
                        </div>
                    `)}
                </div>
            ` : ''}

            ${data.timeline && data.timeline.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">📅 Chronologie de la réunion</h3>
                    <ul class="item-list">
                        ${data.timeline.map(item => html`
                            <li class="list-item">
                                <div style="display: flex; gap: 12px; align-items: flex-start;">
                                    <span style="color: var(--color-primary); font-weight: 500; min-width: 80px;">${item.time || item.timestamp || 'N/A'}</span>
                                    <div style="flex: 1;">
                                        <div class="item-title">${item.topic || item.subject || 'N/A'}</div>
                                        ${item.duration ? html`<div style="color: var(--color-white-60); font-size: 10px;">⏱️ ${item.duration}</div>` : ''}
                                    </div>
                                </div>
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.unresolvedItems && data.unresolvedItems.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">⚠️ Points non résolus</h3>
                    <ul class="item-list">
                        ${data.unresolvedItems.map(item => html`
                            <li class="list-item" style="border-left: 3px solid var(--color-warning); padding-left: 12px;">
                                ${typeof item === 'string' ? item : item.issue || item.description || JSON.stringify(item)}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.nextSteps && data.nextSteps.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">➡️ Prochaines étapes</h3>
                    <ul class="item-list">
                        ${data.nextSteps.map((step, index) => html`
                            <li class="list-item">
                                <span style="color: var(--color-primary); margin-right: 8px;">${index + 1}.</span>
                                ${typeof step === 'string' ? step : step.action || step.description || JSON.stringify(step)}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.importantQuotes && data.importantQuotes.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title">💬 Citations importantes</h3>
                    <ul class="item-list">
                        ${data.importantQuotes.map(quote => html`
                            <li class="list-item" style="border-left: 3px solid var(--color-primary); padding-left: 12px; font-style: italic;">
                                <div>"${quote.quote || quote.text || quote}"</div>
                                ${quote.speaker ? html`<div style="color: var(--color-white-60); font-size: 10px; margin-top: 4px;">— ${quote.speaker}</div>` : ''}
                                ${quote.context ? html`<div style="color: var(--color-white-50); font-size: 10px; margin-top: 2px;">${quote.context}</div>` : ''}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.metadata ? html`
                <div class="summary-section" style="background: var(--color-black-10); border-radius: 6px; padding: 12px; margin-top: 16px;">
                    <h3 class="section-title" style="font-size: 11px; color: var(--color-white-60); margin-bottom: 8px;">📊 Informations techniques</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                        <div class="info-row">
                            <span class="info-label">Modèle:</span>
                            <span>${data.metadata.model || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Tokens:</span>
                            <span>${data.metadata.tokensUsed || 0}</span>
                        </div>
                        ${data.metadata.transcriptCount ? html`
                            <div class="info-row">
                                <span class="info-label">Entrées:</span>
                                <span>${data.metadata.preprocessedCount || data.metadata.transcriptCount} / ${data.metadata.transcriptCount}</span>
                            </div>
                        ` : ''}
                        ${data.metadata.generatedAt ? html`
                            <div class="info-row">
                                <span class="info-label">Généré:</span>
                                <span>${new Date(data.metadata.generatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    }

    async handleAutoAssignEmails() {
        if (!this.sessionId) return;

        try {
            this.message = { type: 'success', text: '⏳ Attribution des emails en cours...' };
            const result = await window.api.tasks.autoAssignEmails(this.sessionId);

            if (result.success) {
                this.message = { type: 'success', text: `✅ ${result.assigned} emails attribués sur ${result.total} tâches` };
                await this.loadMeetingNotes(); // Reload to get updated tasks
            } else {
                this.message = { type: 'error', text: `❌ ${result.message}` };
            }

            setTimeout(() => { this.message = null; }, 3000);
        } catch (error) {
            console.error('[PostMeetingPanel] Error auto-assigning emails:', error);
            this.message = { type: 'error', text: `❌ Erreur: ${error.message}` };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    async handleExportTasksCSV() {
        if (!this.sessionId) return;

        try {
            this.message = { type: 'success', text: '⏳ Export des tâches en cours...' };
            const result = await window.api.tasks.exportToCSV(this.sessionId);

            this.message = { type: 'success', text: `✅ Export réussi: ${result.fileName}` };
            setTimeout(() => { this.message = null; }, 5000);
        } catch (error) {
            console.error('[PostMeetingPanel] Error exporting tasks:', error);
            this.message = { type: 'error', text: `❌ Erreur: ${error.message}` };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    renderTasksTab() {
        if (this.tasks.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <p>Aucune tâche extraite de cette réunion</p>
                </div>
            `;
        }

        return html`
            <div class="summary-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 class="section-title" style="margin: 0;">✅ Actions à suivre (${this.tasks.length})</h3>
                    <div style="display: flex; gap: 8px;">
                        <button
                            class="export-button"
                            style="padding: 6px 12px; font-size: 10px;"
                            @click=${this.handleAutoAssignEmails}
                        >
                            📧 Attribuer emails
                        </button>
                        <button
                            class="export-button"
                            style="padding: 6px 12px; font-size: 10px;"
                            @click=${this.handleExportTasksCSV}
                        >
                            📊 Export CSV
                        </button>
                    </div>
                </div>
                <ul class="item-list">
                    ${this.tasks.map(task => html`
                        <li class="list-item task-item ${task.status === 'completed' ? 'task-completed' : ''}">
                            <input
                                type="checkbox"
                                class="task-checkbox"
                                ?checked=${task.status === 'completed'}
                                @change=${(e) => this.handleTaskToggle(task.id, e.target.checked)}
                            />
                            <div class="task-content">
                                <div class="task-description">${task.task_description}</div>
                                <div class="item-meta">
                                    <span class="meta-item">👤 ${task.assigned_to}</span>
                                    <span class="meta-item">📅 ${task.deadline}</span>
                                    <span class="meta-item priority-${task.priority}">
                                        ${task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                                        ${task.priority}
                                    </span>
                                </div>
                                ${task.context ? html`
                                    <div style="color: var(--color-white-60); font-size: 10px; margin-top: 4px;">
                                        💡 ${task.context}
                                    </div>
                                ` : ''}
                            </div>
                        </li>
                    `)}
                </ul>
            </div>
        `;
    }

    renderExportTab() {
        if (!this.meetingNotes) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">💾</div>
                    <p>Générez d'abord les notes pour pouvoir les exporter</p>
                </div>
            `;
        }

        return html`
            <div class="summary-section">
                <h3 class="section-title">📧 Générer email de suivi</h3>
                <div class="export-grid">
                    <button class="export-button" @click=${() => this.handleGenerateEmail('brief')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">📝</div>
                        <div class="export-label">Email bref</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleGenerateEmail('detailed')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">📋</div>
                        <div class="export-label">Email détaillé</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleGenerateEmail('action-only')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">✅</div>
                        <div class="export-label">Actions seulement</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleGenerateEmail('ai')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">🤖</div>
                        <div class="export-label">Email IA (Claude)</div>
                    </button>
                </div>
            </div>

            <div class="summary-section">
                <h3 class="section-title">💾 Exporter le compte-rendu</h3>
                <div class="export-grid">
                    <button class="export-button" @click=${() => this.handleExport('markdown')}>
                        <div class="export-icon">📝</div>
                        <div class="export-label">Markdown</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('pdf')}>
                        <div class="export-icon">📄</div>
                        <div class="export-label">PDF</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('word')}>
                        <div class="export-icon">📘</div>
                        <div class="export-label">Word</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('excel')}>
                        <div class="export-icon">📊</div>
                        <div class="export-label">Excel</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('html')}>
                        <div class="export-icon">📧</div>
                        <div class="export-label">Email (HTML)</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('srt')}>
                        <div class="export-icon">🎬</div>
                        <div class="export-label">Sous-titres (SRT)</div>
                    </button>
                </div>
            </div>
        `;
    }

    _parseNoteData(meetingNotes) {
        // Phase 4: Enhanced data parsing with all Phase 2/3 fields
        const data = {
            executiveSummary: '',
            meetingType: 'general',
            objectives: [],
            participants: [],
            keyPoints: [],
            decisions: [],
            actionItems: [],
            risks: [],
            timeline: [],
            unresolvedItems: [],
            nextSteps: [],
            importantQuotes: [],
            metadata: null
        };

        try {
            data.executiveSummary = meetingNotes.executive_summary || '';
            data.meetingType = meetingNotes.meeting_type || 'general';

            // Parse JSON fields safely
            const safeJsonParse = (field, fallback = []) => {
                if (!field) return fallback;
                if (Array.isArray(field)) return field;
                try {
                    return JSON.parse(field);
                } catch {
                    return fallback;
                }
            };

            data.objectives = safeJsonParse(meetingNotes.objectives);
            data.participants = safeJsonParse(meetingNotes.participants);
            data.keyPoints = safeJsonParse(meetingNotes.key_points);
            data.decisions = safeJsonParse(meetingNotes.decisions);
            data.actionItems = safeJsonParse(meetingNotes.action_items);
            data.risks = safeJsonParse(meetingNotes.risks);
            data.timeline = safeJsonParse(meetingNotes.timeline);
            data.unresolvedItems = safeJsonParse(meetingNotes.unresolved_items);
            data.nextSteps = safeJsonParse(meetingNotes.next_steps);
            data.importantQuotes = safeJsonParse(meetingNotes.important_quotes);

            // Phase 4: Enhanced metadata with quality score
            data.metadata = {
                model: meetingNotes.model_used,
                tokensUsed: meetingNotes.tokens_used,
                qualityScore: meetingNotes.quality_score || null,
                generatedAt: meetingNotes.generated_at || meetingNotes.created_at,
                preprocessedCount: meetingNotes.preprocessed_count,
                transcriptCount: meetingNotes.transcript_count
            };
        } catch (error) {
            console.error('[PostMeetingPanel] Error parsing note data:', error);
        }

        return data;
    }

    /**
     * Phase 4: Get quality score CSS class
     */
    _getQualityScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    /**
     * Phase 4: Get quality score icon
     */
    _getQualityScoreIcon(score) {
        if (score >= 80) return '⭐';
        if (score >= 60) return '✓';
        if (score >= 40) return '○';
        return '△';
    }

    /**
     * Phase 4: Get meeting type icon
     */
    _getMeetingTypeIcon(type) {
        const icons = {
            'standup': '🧍',
            'brainstorming': '💡',
            'planning': '📋',
            'review': '🔍',
            'retrospective': '🔄',
            'one-on-one': '👥',
            'interview': '🎤',
            'presentation': '📊',
            'workshop': '🛠️',
            'training': '📚',
            'general': '📝'
        };
        return icons[type] || icons['general'];
    }

    /**
     * Phase 4: Get meeting type label in French
     */
    _getMeetingTypeLabel(type) {
        const labels = {
            'standup': 'Daily/Standup',
            'brainstorming': 'Brainstorming',
            'planning': 'Planification',
            'review': 'Revue',
            'retrospective': 'Rétrospective',
            'one-on-one': 'One-on-One',
            'interview': 'Entretien',
            'presentation': 'Présentation',
            'workshop': 'Atelier',
            'training': 'Formation',
            'general': 'Général'
        };
        return labels[type] || type;
    }

    render() {
        return html`
            <div class="panel-container">
                <div class="panel-header">
                    <h2 class="panel-title">📋 Compte-rendu de réunion</h2>
                    <button class="close-button" @click=${this.handleClose}>✕</button>
                </div>

                <!-- Phase 2.1: Session History Selector -->
                ${this.allSessions.length > 1 ? html`
                    <div class="session-selector">
                        <label>📂 Session:</label>
                        <select class="session-dropdown" @change=${this.handleSessionChange}>
                            ${this.allSessions.map(session => html`
                                <option
                                    value=${session.session_id}
                                    ?selected=${session.session_id === this.sessionId}
                                >
                                    ${this._formatSessionDate(session.created_at)}
                                    ${session.meeting_type && session.meeting_type !== 'general'
                                        ? ` - ${this._getMeetingTypeLabel(session.meeting_type)}`
                                        : ''}
                                </option>
                            `)}
                        </select>
                    </div>
                ` : ''}

                <div class="tabs">
                    <button
                        class="tab ${this.activeTab === 'summary' ? 'active' : ''}"
                        @click=${() => this.activeTab = 'summary'}
                    >
                        📝 Résumé
                    </button>
                    <button
                        class="tab ${this.activeTab === 'tasks' ? 'active' : ''}"
                        @click=${() => this.activeTab = 'tasks'}
                    >
                        ✅ Tâches (${this.tasks.length})
                    </button>
                    <button
                        class="tab ${this.activeTab === 'export' ? 'active' : ''}"
                        @click=${() => this.activeTab = 'export'}
                    >
                        💾 Export
                    </button>
                </div>

                <div class="panel-content">
                    ${this.message ? html`
                        <div class="message ${this.message.type}">
                            ${this.message.text}
                        </div>
                    ` : ''}

                    <!-- Phase 2.2: Progress Indicator during generation -->
                    ${this.isGenerating && this.generationProgress ? html`
                        <div class="progress-container">
                            <div class="progress-spinner"></div>
                            <div class="progress-steps">
                                ${[1, 2, 3, 4].map(step => html`
                                    <div class="progress-step ${
                                        step < this.generationProgress.step ? 'completed' :
                                        step === this.generationProgress.step ? 'active' : ''
                                    }"></div>
                                `)}
                            </div>
                            <div class="progress-message">
                                ${this.generationProgress.message}
                            </div>
                            <div style="font-size: 10px; color: var(--color-white-40); margin-top: 8px;">
                                Étape ${this.generationProgress.step} / ${this.generationProgress.total}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Phase 2.3: Error State with Retry -->
                    ${this.lastError ? html`
                        <div class="error-container">
                            <div class="error-icon">❌</div>
                            <div class="error-title">Échec de la génération</div>
                            <div class="error-message">${this.lastError.message}</div>
                            ${this.lastError.canRetry ? html`
                                <button class="retry-button" @click=${this.handleRetry}>
                                    🔄 Réessayer
                                </button>
                            ` : html`
                                <button class="retry-button" @click=${this.handleClose} style="background: var(--color-white-20);">
                                    Fermer
                                </button>
                            `}
                        </div>
                    ` : ''}

                    ${this.isLoading && !this.isGenerating ? html`
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Chargement...</p>
                        </div>
                    ` : ''}

                    ${!this.isLoading && !this.isGenerating && !this.lastError ? html`
                        ${this.activeTab === 'summary' ? this.renderSummaryTab() : ''}
                        ${this.activeTab === 'tasks' ? this.renderTasksTab() : ''}
                        ${this.activeTab === 'export' ? this.renderExportTab() : ''}
                    ` : ''}
                </div>
            </div>

            ${this.showParticipantModal ? html`
                <participant-modal
                    .sessionId=${this.sessionId}
                    @close=${this.handleCloseParticipantModal}
                    @save=${this.handleParticipantsSaved}
                ></participant-modal>
            ` : ''}

            ${this.showEmailModal ? html`
                <email-preview-modal
                    .sessionId=${this.sessionId}
                    .emailData=${this.currentEmailData}
                    .isLoading=${this.isGeneratingEmail}
                    @close=${this.handleCloseEmailModal}
                ></email-preview-modal>
            ` : ''}
        `;
    }
}

customElements.define('post-meeting-panel', PostMeetingPanel);
