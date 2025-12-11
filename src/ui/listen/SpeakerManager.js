import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Speaker Manager Component
 * Permet de visualiser et renommer les speakers détectés dans une session
 */
export class SpeakerManager extends LitElement {
    static properties = {
        sessionId: { type: String },
        speakers: { type: Array },
        isEditing: { type: Boolean }
    };

    // Fix MOYEN #12: Réagir aux changements de sessionId
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('sessionId') && this.sessionId) {
            // Recharger les speakers quand sessionId change
            this.loadSpeakers();
        }
    }

    static styles = css`
        :host {
            display: block;
            background: #f5f7fa;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
        }

        .edit-button {
            padding: 8px 16px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .edit-button:hover {
            background: #5568d3;
            transform: translateY(-1px);
        }

        .speaker-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .speaker-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.2s;
        }

        .speaker-item:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .speaker-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: white;
            font-size: 18px;
            flex-shrink: 0;
        }

        .speaker-avatar.speaker-0 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .speaker-avatar.speaker-1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .speaker-avatar.speaker-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .speaker-avatar.speaker-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        .speaker-avatar.speaker-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
        .speaker-avatar.speaker-5 { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
        .speaker-avatar.speaker-6 { background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%); }
        .speaker-avatar.speaker-7 { background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%); }
        .speaker-avatar.speaker-8 { background: linear-gradient(135deg, #cd9cf2 0%, #f6f3ff 100%); }
        .speaker-avatar.speaker-9 { background: linear-gradient(135deg, #fddb92 0%, #d1fdff 100%); }
        /* Fallback pour les speakers 10+ - couleur générée dynamiquement via style inline */
        .speaker-avatar.speaker-default { background: linear-gradient(135deg, #718096 0%, #4a5568 100%); }

        .speaker-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .speaker-name {
            font-size: 16px;
            font-weight: 600;
            color: #2d3748;
        }

        .speaker-stats {
            font-size: 13px;
            color: #718096;
        }

        .speaker-name-input {
            padding: 8px 12px;
            border: 2px solid #667eea;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            outline: none;
            transition: border-color 0.2s;
            width: 100%;
        }

        .speaker-name-input:focus {
            border-color: #5568d3;
        }

        .save-button {
            padding: 6px 12px;
            background: #48bb78;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            flex-shrink: 0;
        }

        .save-button:hover {
            background: #38a169;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #718096;
        }

        .empty-state svg {
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
    `;

    constructor() {
        super();
        this.sessionId = '';
        this.speakers = [];
        this.isEditing = false;
        this.editedNames = {};
        this._refreshDebounceTimer = null;
        this._boundHandleSttRecognized = this._handleSttRecognized.bind(this);
    }

    /**
     * Génère une couleur dynamique pour les speakers avec ID >= 10
     * Utilise une fonction de hachage simple pour des couleurs cohérentes
     */
    _getDynamicColor(speakerId) {
        const hue = (speakerId * 137.508) % 360; // Golden angle pour distribution uniforme
        return `background: linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${(hue + 30) % 360}, 60%, 50%) 100%)`;
    }

    /**
     * Handler pour les événements stt-recognized (nouveaux segments)
     * Utilise un debounce pour éviter trop de rafraîchissements
     */
    _handleSttRecognized(event, data) {
        // Debounce: attendre 2 secondes avant de rafraîchir
        if (this._refreshDebounceTimer) {
            clearTimeout(this._refreshDebounceTimer);
        }
        this._refreshDebounceTimer = setTimeout(() => {
            this.loadSpeakers();
        }, 2000);
    }

    async loadSpeakers() {
        if (!this.sessionId) return;
        
        try {
            const result = await window.api.speakers.getSessionSpeakers(this.sessionId);
            this.speakers = result || [];
            this.requestUpdate();
        } catch (error) {
            console.error('[SpeakerManager] Failed to load speakers:', error);
        }
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
        if (!this.isEditing) {
            this.editedNames = {};
        }
    }

    handleNameInput(speakerId, event) {
        this.editedNames[speakerId] = event.target.value;
    }

    async saveSpeakerName(speakerId) {
        const newName = this.editedNames[speakerId];
        if (!newName || !newName.trim()) return;

        try {
            await window.api.speakers.renameSpeaker({
                sessionId: this.sessionId,
                speakerId,
                newName: newName.trim()
            });

            // Rafraîchir la liste
            await this.loadSpeakers();
            
            // Notifier le parent
            this.dispatchEvent(new CustomEvent('speaker-renamed', {
                detail: { speakerId, newName: newName.trim() },
                bubbles: true,
                composed: true
            }));

            delete this.editedNames[speakerId];
            this.requestUpdate();
        } catch (error) {
            console.error('[SpeakerManager] Failed to rename speaker:', error);
        }
    }

    render() {
        return html`
            <div class="speaker-manager">
                <div class="header">
                    <h3>PARTICIPANTS (${this.speakers.length})</h3>
                    ${this.speakers.length > 0 ? html`
                        <button class="edit-button" @click=${this.toggleEdit}>
                            ${this.isEditing ? 'Terminer' : 'Renommer'}
                        </button>
                    ` : ''}
                </div>

                ${this.speakers.length === 0 ? html`
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <div>Aucun participant détecté pour le moment</div>
                        <div style="font-size: 12px; margin-top: 8px;">
                            Les participants apparaîtront automatiquement lors de l'enregistrement
                        </div>
                    </div>
                ` : html`
                    <div class="speaker-list">
                        ${this.speakers.map(speaker => html`
                            <div class="speaker-item">
                                <div class="speaker-avatar ${speaker.speaker_id <= 9 ? `speaker-${speaker.speaker_id}` : 'speaker-default'}"
                                     style="${speaker.speaker_id > 9 ? this._getDynamicColor(speaker.speaker_id) : ''}">
                                    ${speaker.speaker_name.charAt(0).toUpperCase()}
                                </div>
                                
                                <div class="speaker-info">
                                    ${this.isEditing ? html`
                                        <input
                                            type="text"
                                            class="speaker-name-input"
                                            .value=${this.editedNames[speaker.speaker_id] ?? speaker.speaker_name}
                                            @input=${(e) => this.handleNameInput(speaker.speaker_id, e)}
                                            placeholder="Nom du participant"
                                        />
                                    ` : html`
                                        <div class="speaker-name">${speaker.speaker_name}</div>
                                    `}
                                    
                                    <div class="speaker-stats">
                                        ${speaker.segment_count} intervention${speaker.segment_count > 1 ? 's' : ''}
                                    </div>
                                </div>

                                ${this.isEditing && this.editedNames[speaker.speaker_id] ? html`
                                    <button 
                                        class="save-button"
                                        @click=${() => this.saveSpeakerName(speaker.speaker_id)}
                                    >
                                        Enregistrer
                                    </button>
                                ` : ''}
                            </div>
                        `)}
                    </div>
                `}
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadSpeakers();

        // S'abonner aux événements stt-recognized pour rafraîchir automatiquement
        if (window.api?.sttView?.onSttUpdate) {
            window.api.sttView.onSttUpdate(this._boundHandleSttRecognized);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Se désabonner des événements
        if (window.api?.sttView?.removeOnSttUpdate) {
            window.api.sttView.removeOnSttUpdate(this._boundHandleSttRecognized);
        }

        // Nettoyer le timer de debounce
        if (this._refreshDebounceTimer) {
            clearTimeout(this._refreshDebounceTimer);
            this._refreshDebounceTimer = null;
        }
    }
}

customElements.define('speaker-manager', SpeakerManager);
