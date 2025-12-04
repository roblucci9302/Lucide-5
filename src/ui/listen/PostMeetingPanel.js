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

        // FIX MEDIUM: Store callback references for cleanup
        this._ipcCallbacks = {
            onSetSession: null,
            onNotesGenerated: null,
            onExportComplete: null,
            onError: null
        };

        // Setup IPC listeners
        this._setupListeners();
    }

    connectedCallback() {
        super.connectedCallback();
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
        this.message = { type: 'success', text: '⏳ Génération des notes en cours...' };

        try {
            await window.api.postMeeting.generateNotes(this.sessionId);
        } catch (error) {
            console.error('[PostMeetingPanel] Error generating notes:', error);
            this.isGenerating = false;
            this.message = { type: 'error', text: `❌ Erreur: ${error.message}` };
        }
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

            <div class="summary-section">
                <h3 class="section-title">📝 Résumé exécutif</h3>
                <div class="summary-text">${data.executiveSummary || 'Aucun résumé disponible'}</div>
            </div>

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
                    <h3 class="section-title">🔍 Décisions prises</h3>
                    <ul class="item-list">
                        ${data.decisions.map(decision => html`
                            <li class="list-item">
                                <div class="item-title">${decision.decision || decision.title}</div>
                                ${decision.description || decision.rationale ? html`
                                    <div style="color: var(--color-white-70); margin-top: 4px;">
                                        ${decision.description || decision.rationale}
                                    </div>
                                ` : ''}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            ${data.metadata ? html`
                <div class="summary-section">
                    <div class="info-row">
                        <span class="info-label">Modèle utilisé:</span>
                        <span>${data.metadata.model || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tokens utilisés:</span>
                        <span>${data.metadata.tokensUsed || 0}</span>
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
        const data = {
            executiveSummary: '',
            participants: [],
            keyPoints: [],
            decisions: [],
            metadata: null
        };

        try {
            data.executiveSummary = meetingNotes.executive_summary || '';
            data.participants = JSON.parse(meetingNotes.participants || '[]');
            data.keyPoints = JSON.parse(meetingNotes.key_points || '[]');
            data.decisions = JSON.parse(meetingNotes.decisions || '[]');
            data.metadata = {
                model: meetingNotes.model_used,
                tokensUsed: meetingNotes.tokens_used
            };
        } catch (error) {
            console.error('[PostMeetingPanel] Error parsing note data:', error);
        }

        return data;
    }

    render() {
        return html`
            <div class="panel-container">
                <div class="panel-header">
                    <h2 class="panel-title">📋 Compte-rendu de réunion</h2>
                    <button class="close-button" @click=${this.handleClose}>✕</button>
                </div>

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

                    ${this.isLoading ? html`
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Chargement...</p>
                        </div>
                    ` : html`
                        ${this.activeTab === 'summary' ? this.renderSummaryTab() : ''}
                        ${this.activeTab === 'tasks' ? this.renderTasksTab() : ''}
                        ${this.activeTab === 'export' ? this.renderExportTab() : ''}
                    `}
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
