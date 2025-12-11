import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class SttView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        /* Inherit font styles from parent */

        .transcription-container {
            overflow-y: auto;
            padding: 12px 12px 16px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-height: 150px;
            max-height: 800px;
            position: relative;
            z-index: 1;
            flex: 1;
        }

        /* Visibility handled by parent component */

        .transcription-container::-webkit-scrollbar {
            width: var(--scrollbar-width);
        }
        .transcription-container::-webkit-scrollbar-track {
            background: var(--color-black-10);
            border-radius: var(--radius-sm);
        }
        .transcription-container::-webkit-scrollbar-thumb {
            background: var(--color-white-30);
            border-radius: var(--radius-sm);
        }
        .transcription-container::-webkit-scrollbar-thumb:hover {
            background: var(--color-white-50);
        }

        .stt-message {
            padding: 8px 12px;
            border-radius: var(--radius-lg);
            max-width: 80%;
            word-wrap: break-word;
            word-break: break-word;
            line-height: 1.5;
            font-size: 13px;
            margin-bottom: 4px;
            box-sizing: border-box;
        }

        .stt-message.them {
            background: var(--color-white-10);
            color: var(--color-white-90);
            align-self: flex-start;
            border-bottom-left-radius: var(--radius-sm);
            margin-right: auto;
        }

        .stt-message.me {
            background: color-mix(in srgb, var(--color-primary-500) 80%, transparent);
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: var(--radius-sm);
            margin-left: auto;
        }

        /* Styles pour la diarisation par speaker ID */
        .stt-message.speaker-0 {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
            border-left: 3px solid #667eea;
            align-self: flex-start;
            margin-right: auto;
        }
        .stt-message.speaker-1 {
            background: linear-gradient(135deg, rgba(240, 147, 251, 0.3) 0%, rgba(245, 87, 108, 0.3) 100%);
            border-left: 3px solid #f093fb;
            align-self: flex-end;
            margin-left: auto;
        }
        .stt-message.speaker-2 {
            background: linear-gradient(135deg, rgba(79, 172, 254, 0.3) 0%, rgba(0, 242, 254, 0.3) 100%);
            border-left: 3px solid #4facfe;
            align-self: flex-start;
            margin-right: auto;
        }
        .stt-message.speaker-3 {
            background: linear-gradient(135deg, rgba(67, 233, 123, 0.3) 0%, rgba(56, 249, 215, 0.3) 100%);
            border-left: 3px solid #43e97b;
            align-self: flex-end;
            margin-left: auto;
        }
        .stt-message.speaker-4 {
            background: linear-gradient(135deg, rgba(250, 112, 154, 0.3) 0%, rgba(254, 225, 64, 0.3) 100%);
            border-left: 3px solid #fa709a;
            align-self: flex-start;
            margin-right: auto;
        }
        .stt-message.speaker-5 {
            background: linear-gradient(135deg, rgba(168, 237, 234, 0.3) 0%, rgba(254, 214, 227, 0.3) 100%);
            border-left: 3px solid #a8edea;
            align-self: flex-end;
            margin-left: auto;
        }
        .stt-message.speaker-6 {
            background: linear-gradient(135deg, rgba(210, 153, 194, 0.3) 0%, rgba(254, 249, 215, 0.3) 100%);
            border-left: 3px solid #d299c2;
            align-self: flex-start;
            margin-right: auto;
        }
        .stt-message.speaker-7 {
            background: linear-gradient(135deg, rgba(137, 247, 254, 0.3) 0%, rgba(102, 166, 255, 0.3) 100%);
            border-left: 3px solid #89f7fe;
            align-self: flex-end;
            margin-left: auto;
        }
        .stt-message.speaker-8 {
            background: linear-gradient(135deg, rgba(205, 156, 242, 0.3) 0%, rgba(246, 243, 255, 0.3) 100%);
            border-left: 3px solid #cd9cf2;
            align-self: flex-start;
            margin-right: auto;
        }
        .stt-message.speaker-9 {
            background: linear-gradient(135deg, rgba(253, 219, 146, 0.3) 0%, rgba(209, 253, 255, 0.3) 100%);
            border-left: 3px solid #fddb92;
            align-self: flex-end;
            margin-left: auto;
        }
        .stt-message.speaker-default {
            background: linear-gradient(135deg, rgba(113, 128, 150, 0.3) 0%, rgba(74, 85, 104, 0.3) 100%);
            border-left: 3px solid #718096;
            align-self: flex-start;
            margin-right: auto;
        }

        .speaker-label {
            font-size: 10px;
            font-weight: 600;
            opacity: 0.7;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100px;
            color: var(--color-white-60);
            font-size: 12px;
            font-style: italic;
        }
    `;

    static properties = {
        sttMessages: { type: Array },
        isVisible: { type: Boolean },
    };

    constructor() {
        super();
        this.sttMessages = [];
        this.isVisible = true;
        this.messageIdCounter = 0;
        this._shouldScrollAfterUpdate = false;

        this.handleSttUpdate = this.handleSttUpdate.bind(this);
        this.handleSpeakerRenamed = this.handleSpeakerRenamed.bind(this);
        this._removeRenamedListener = null;
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.api) {
            window.api.sttView.onSttUpdate(this.handleSttUpdate);
            // Fix HAUT #5: Listen for speaker rename events to update message names
            if (window.api.speakers?.onSpeakerRenamed) {
                this._removeRenamedListener = window.api.speakers.onSpeakerRenamed(this.handleSpeakerRenamed);
            }
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api) {
            window.api.sttView.removeOnSttUpdate(this.handleSttUpdate);
        }
        // Fix HAUT #5: Cleanup speaker renamed listener
        if (this._removeRenamedListener) {
            this._removeRenamedListener();
            this._removeRenamedListener = null;
        }
    }

    // Handle session reset from parent
    resetTranscript() {
        this.sttMessages = [];
        this.messageIdCounter = 0; // Reset message ID counter for clean session start
        this.requestUpdate();
    }

    // Fix HAUT #5: Update speaker names when renamed
    handleSpeakerRenamed(event, { speakerId, newName }) {
        const updated = this.sttMessages.map(msg => {
            if (msg.speakerId === speakerId) {
                return { ...msg, speakerName: newName };
            }
            return msg;
        });
        this.sttMessages = updated;
        this.requestUpdate();

        // Notify parent component about message updates
        this.dispatchEvent(new CustomEvent('stt-messages-updated', {
            detail: { messages: this.sttMessages },
            bubbles: true
        }));
    }

    handleSttUpdate(event, { speaker, text, isFinal, isPartial, speakerId, speakerName }) {
        if (text === undefined) return;

        const container = this.shadowRoot.querySelector('.transcription-container');
        this._shouldScrollAfterUpdate = container ? container.scrollTop + container.clientHeight >= container.scrollHeight - 10 : false;

        // Utiliser speakerId pour la diarisation si disponible, sinon fallback sur speaker (Me/Them)
        const effectiveSpeakerId = speakerId !== undefined ? speakerId : (speaker === 'Me' ? 0 : 1);
        const effectiveSpeakerName = speakerName || speaker || `Speaker ${effectiveSpeakerId}`;

        // Trouver le dernier message partiel du même speaker (par speakerId)
        const findLastPartialIdx = spkId => {
            for (let i = this.sttMessages.length - 1; i >= 0; i--) {
                const m = this.sttMessages[i];
                if (m.speakerId === spkId && m.isPartial) return i;
            }
            return -1;
        };

        const newMessages = [...this.sttMessages];
        const targetIdx = findLastPartialIdx(effectiveSpeakerId);

        if (isPartial) {
            // Pour les messages partiels, METTRE À JOUR le dernier partial du même speaker
            if (targetIdx !== -1) {
                newMessages[targetIdx] = {
                    ...newMessages[targetIdx],
                    text,
                    speakerName: effectiveSpeakerName,
                    isPartial: true,
                    isFinal: false,
                };
            } else {
                newMessages.push({
                    id: this.messageIdCounter++,
                    speaker,
                    speakerId: effectiveSpeakerId,
                    speakerName: effectiveSpeakerName,
                    text,
                    isPartial: true,
                    isFinal: false,
                });
            }
        } else if (isFinal) {
            // Pour les messages finaux: TOUJOURS convertir le partial existant OU ajouter un nouveau
            // FIX: Ne JAMAIS remplacer un message final existant, toujours accumuler
            if (targetIdx !== -1) {
                // Convertir le partial en final
                newMessages[targetIdx] = {
                    ...newMessages[targetIdx],
                    text,
                    speakerName: effectiveSpeakerName,
                    isPartial: false,
                    isFinal: true,
                };
            } else {
                // Pas de partial trouvé, AJOUTER un nouveau message final
                // (cas de Deepgram qui envoie directement des finals)
                newMessages.push({
                    id: this.messageIdCounter++,
                    speaker,
                    speakerId: effectiveSpeakerId,
                    speakerName: effectiveSpeakerName,
                    text,
                    isPartial: false,
                    isFinal: true,
                });
            }
        }

        this.sttMessages = newMessages;

        // Notify parent component about message updates
        this.dispatchEvent(new CustomEvent('stt-messages-updated', {
            detail: { messages: this.sttMessages },
            bubbles: true
        }));
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.transcription-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    getSpeakerClass(msg) {
        // Si speakerId est disponible (diarisation Deepgram), utiliser les styles par speaker
        if (msg.speakerId !== undefined) {
            // Fix: Utiliser toutes les couleurs 0-9 (pas seulement 0-4)
            if (msg.speakerId <= 9) {
                return `speaker-${msg.speakerId}`;
            }
            return 'speaker-default';
        }
        // Fallback sur Me/Them pour les autres providers
        return msg.speaker?.toLowerCase() === 'me' ? 'me' : 'them';
    }

    getTranscriptText() {
        return this.sttMessages.map(msg => `${msg.speakerName || msg.speaker}: ${msg.text}`).join('\n');
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('sttMessages')) {
            if (this._shouldScrollAfterUpdate) {
                this.scrollToBottom();
                this._shouldScrollAfterUpdate = false;
            }
        }
    }

    render() {
        if (!this.isVisible) {
            return html`<div style="display: none;"></div>`;
        }

        return html`
            <div class="transcription-container">
                ${this.sttMessages.length === 0
                    ? html`<div class="empty-state">Waiting for speech...</div>`
                    : this.sttMessages.map(msg => html`
                        <div class="stt-message ${this.getSpeakerClass(msg)}">
                            ${msg.speakerId !== undefined ? html`
                                <div class="speaker-label">${msg.speakerName}</div>
                            ` : ''}
                            ${msg.text}
                        </div>
                    `)
                }
            </div>
        `;
    }
}

customElements.define('stt-view', SttView); 