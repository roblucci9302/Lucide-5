import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Participant Attribution Modal
 * Permet d'assigner des noms réels aux speakers détectés dans les transcriptions
 * Remplace "Me" et "Them" par des noms, emails, rôles et entreprises
 */
export class ParticipantModal extends LitElement {
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
            max-width: 600px;
            max-height: 85vh;
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

        /* Speaker Sections */
        .speaker-section {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .speaker-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--color-primary-400);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Form Fields */
        .form-group {
            margin-bottom: 12px;
        }

        .form-group:last-child {
            margin-bottom: 0;
        }

        .form-label {
            display: block;
            font-size: 10px;
            font-weight: 500;
            color: var(--color-white-70);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .required {
            color: var(--color-error-400);
        }

        .form-input {
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

        .form-input:focus {
            outline: none;
            border-color: var(--color-primary-500);
            background: var(--color-black-40);
        }

        .form-input::placeholder {
            color: var(--color-white-40);
        }

        .form-input:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* Autocomplete */
        .autocomplete-container {
            position: relative;
        }

        .autocomplete-list {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--color-gray-900);
            border: 1px solid var(--color-white-30);
            border-radius: 4px;
            margin-top: 2px;
            max-height: 150px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: var(--shadow-lg);
        }

        .autocomplete-list::-webkit-scrollbar {
            width: 6px;
        }

        .autocomplete-list::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 3px;
        }

        .autocomplete-item {
            padding: 8px 10px;
            font-size: 11px;
            color: white;
            cursor: pointer;
            border-bottom: 1px solid var(--color-white-10);
            transition: background 0.1s ease;
        }

        .autocomplete-item:last-child {
            border-bottom: none;
        }

        .autocomplete-item:hover {
            background: var(--color-white-10);
        }

        .autocomplete-item-name {
            font-weight: 500;
            margin-bottom: 2px;
        }

        .autocomplete-item-meta {
            font-size: 9px;
            color: var(--color-white-60);
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

        .button-cancel {
            background: transparent;
            border-color: var(--color-white-20);
            color: var(--color-white-80);
        }

        .button-cancel:hover:not(:disabled) {
            background: var(--color-white-10);
            color: white;
        }

        .button-save {
            background: var(--color-primary-500);
            border-color: var(--color-primary-600);
            color: white;
        }

        .button-save:hover:not(:disabled) {
            background: var(--color-primary-600);
        }

        /* Loading State */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
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

        /* Empty State */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            color: var(--color-white-50);
            font-size: 11px;
            text-align: center;
        }

        .empty-icon {
            font-size: 32px;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        /* Help Text */
        .help-text {
            font-size: 10px;
            color: var(--color-white-60);
            margin-top: 4px;
            font-style: italic;
        }

        /* Validation */
        .form-input.error {
            border-color: var(--color-error-400);
        }

        .error-message {
            font-size: 10px;
            color: var(--color-error-400);
            margin-top: 4px;
        }
    `;

    static properties = {
        sessionId: { type: String },
        speakers: { type: Array },
        participantsData: { type: Object },
        frequentParticipants: { type: Array },
        isLoading: { type: Boolean },
        isSaving: { type: Boolean },
        showAutocomplete: { type: Object }, // { speakerLabel: true/false }
        errors: { type: Object }
    };

    constructor() {
        super();
        this.sessionId = null;
        this.speakers = [];
        this.participantsData = {}; // { speakerLabel: { name, email, role, company } }
        this.frequentParticipants = [];
        this.isLoading = false;
        this.isSaving = false;
        this.showAutocomplete = {};
        this.errors = {};
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.sessionId) {
            this.loadData();
        }
    }

    async loadData() {
        this.isLoading = true;
        try {
            // Load detected speakers
            const speakers = await window.api.participants.detectSpeakers(this.sessionId);
            this.speakers = speakers || [];

            // Load existing participants if any
            const existing = await window.api.participants.getSessionParticipants(this.sessionId);
            if (existing && existing.length > 0) {
                existing.forEach(p => {
                    this.participantsData[p.speaker_label] = {
                        name: p.participant_name || '',
                        email: p.participant_email || '',
                        role: p.participant_role || '',
                        company: p.participant_company || ''
                    };
                });
            } else {
                // Initialize empty data for each speaker
                this.speakers.forEach(speaker => {
                    if (!this.participantsData[speaker]) {
                        this.participantsData[speaker] = {
                            name: '',
                            email: '',
                            role: '',
                            company: ''
                        };
                    }
                });
            }

            // Load frequent participants for autocomplete
            this.frequentParticipants = await window.api.participants.getFrequentParticipants(10);

            this.requestUpdate();
        } catch (error) {
            console.error('[ParticipantModal] Error loading data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    handleInputChange(speakerLabel, field, value) {
        if (!this.participantsData[speakerLabel]) {
            this.participantsData[speakerLabel] = { name: '', email: '', role: '', company: '' };
        }

        this.participantsData[speakerLabel][field] = value;

        // Show autocomplete for name field
        if (field === 'name' && value.length > 0) {
            this.showAutocomplete = { ...this.showAutocomplete, [speakerLabel]: true };
        } else if (field === 'name') {
            this.showAutocomplete = { ...this.showAutocomplete, [speakerLabel]: false };
        }

        // Clear error for this field
        if (this.errors[speakerLabel]) {
            delete this.errors[speakerLabel];
            this.requestUpdate();
        }

        this.requestUpdate();
    }

    handleAutocompleteSelect(speakerLabel, participant) {
        this.participantsData[speakerLabel] = {
            name: participant.participant_name || '',
            email: participant.participant_email || '',
            role: participant.participant_role || '',
            company: participant.participant_company || ''
        };

        this.showAutocomplete = { ...this.showAutocomplete, [speakerLabel]: false };
        this.requestUpdate();
    }

    handleInputBlur(speakerLabel) {
        // Delay to allow click on autocomplete item
        setTimeout(() => {
            this.showAutocomplete = { ...this.showAutocomplete, [speakerLabel]: false };
            this.requestUpdate();
        }, 200);
    }

    validateForm() {
        const errors = {};
        let hasErrors = false;

        this.speakers.forEach(speaker => {
            const data = this.participantsData[speaker];
            if (!data || !data.name || data.name.trim() === '') {
                errors[speaker] = 'Le nom est requis';
                hasErrors = true;
            }
        });

        this.errors = errors;
        return !hasErrors;
    }

    async handleSave() {
        if (this.isSaving) return;

        if (!this.validateForm()) {
            this.requestUpdate();
            return;
        }

        this.isSaving = true;

        try {
            // Transform data for save
            const participantsArray = this.speakers.map(speaker => ({
                speakerLabel: speaker,
                name: this.participantsData[speaker].name.trim(),
                email: this.participantsData[speaker].email.trim() || null,
                role: this.participantsData[speaker].role.trim() || null,
                company: this.participantsData[speaker].company.trim() || null
            }));

            await window.api.participants.saveParticipants(this.sessionId, participantsArray);

            // Emit success event
            this.dispatchEvent(new CustomEvent('save', {
                detail: { sessionId: this.sessionId, participants: participantsArray },
                bubbles: true,
                composed: true
            }));

            this.handleClose();
        } catch (error) {
            console.error('[ParticipantModal] Error saving participants:', error);
            alert(`Erreur lors de la sauvegarde: ${error.message}`);
        } finally {
            this.isSaving = false;
        }
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    getFilteredAutocomplete(speakerLabel) {
        const searchTerm = this.participantsData[speakerLabel]?.name?.toLowerCase() || '';
        if (!searchTerm) return this.frequentParticipants;

        return this.frequentParticipants.filter(p =>
            p.participant_name.toLowerCase().includes(searchTerm) ||
            (p.participant_email && p.participant_email.toLowerCase().includes(searchTerm))
        );
    }

    renderSpeakerForm(speaker) {
        const data = this.participantsData[speaker] || { name: '', email: '', role: '', company: '' };
        const hasError = this.errors[speaker];
        const showAuto = this.showAutocomplete[speaker] && this.getFilteredAutocomplete(speaker).length > 0;

        return html`
            <div class="speaker-section">
                <div class="speaker-label">
                    👤 Speaker: <strong>${speaker}</strong>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        Nom <span class="required">*</span>
                    </label>
                    <div class="autocomplete-container">
                        <input
                            type="text"
                            class="form-input ${hasError ? 'error' : ''}"
                            placeholder="Ex: Jean Dupont"
                            .value=${data.name}
                            @input=${(e) => this.handleInputChange(speaker, 'name', e.target.value)}
                            @blur=${() => this.handleInputBlur(speaker)}
                            ?disabled=${this.isSaving}
                        />
                        ${showAuto ? html`
                            <div class="autocomplete-list">
                                ${this.getFilteredAutocomplete(speaker).map(p => html`
                                    <div
                                        class="autocomplete-item"
                                        @mousedown=${() => this.handleAutocompleteSelect(speaker, p)}
                                    >
                                        <div class="autocomplete-item-name">${p.participant_name}</div>
                                        <div class="autocomplete-item-meta">
                                            ${p.participant_email ? `${p.participant_email}` : ''}
                                            ${p.participant_role ? ` • ${p.participant_role}` : ''}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        ` : ''}
                    </div>
                    ${hasError ? html`<div class="error-message">${hasError}</div>` : ''}
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input
                        type="email"
                        class="form-input"
                        placeholder="Ex: jean.dupont@entreprise.com"
                        .value=${data.email}
                        @input=${(e) => this.handleInputChange(speaker, 'email', e.target.value)}
                        ?disabled=${this.isSaving}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">Rôle</label>
                    <input
                        type="text"
                        class="form-input"
                        placeholder="Ex: CEO, CTO, Directeur Commercial"
                        .value=${data.role}
                        @input=${(e) => this.handleInputChange(speaker, 'role', e.target.value)}
                        ?disabled=${this.isSaving}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">Entreprise</label>
                    <input
                        type="text"
                        class="form-input"
                        placeholder="Ex: Acme Corp"
                        .value=${data.company}
                        @input=${(e) => this.handleInputChange(speaker, 'company', e.target.value)}
                        ?disabled=${this.isSaving}
                    />
                </div>
            </div>
        `;
    }

    render() {
        return html`
            <div class="modal-container" @click=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <div>
                        <h2 class="modal-title">👥 Attribution des participants</h2>
                        <p class="modal-subtitle">
                            Associez chaque speaker à une personne réelle
                        </p>
                    </div>
                    <button class="close-button" @click=${this.handleClose}>✕</button>
                </div>

                <div class="modal-content">
                    ${this.isLoading ? html`
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Chargement des speakers...</p>
                        </div>
                    ` : this.speakers.length === 0 ? html`
                        <div class="empty-state">
                            <div class="empty-icon">🎤</div>
                            <p>Aucun speaker détecté dans cette session</p>
                            <p class="help-text">
                                Assurez-vous que la transcription a été effectuée
                            </p>
                        </div>
                    ` : html`
                        ${this.speakers.map(speaker => this.renderSpeakerForm(speaker))}
                    `}
                </div>

                <div class="modal-footer">
                    <button
                        class="button button-cancel"
                        @click=${this.handleClose}
                        ?disabled=${this.isSaving}
                    >
                        Annuler
                    </button>
                    <button
                        class="button button-save"
                        @click=${this.handleSave}
                        ?disabled=${this.isLoading || this.speakers.length === 0 || this.isSaving}
                    >
                        ${this.isSaving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('participant-modal', ParticipantModal);
