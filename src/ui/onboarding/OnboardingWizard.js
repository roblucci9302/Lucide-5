import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * OnboardingWizard Component
 * Multi-step onboarding flow for new users
 * Part of Phase WOW 1: Profiles Intelligents & Agents Spécialisés
 */
export class OnboardingWizard extends LitElement {
    static properties = {
        currentStep: { type: Number },
        profiles: { type: Array },
        selectedProfile: { type: String },
        questions: { type: Array },
        answers: { type: Object },
        isCompleting: { type: Boolean }
    };

    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        .wizard-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            padding: var(--space-10);
            box-sizing: border-box;
        }

        .wizard-card {
            background: rgba(20, 20, 20, 0.9);
            border-radius: 20px;
            outline: 1px rgba(255, 255, 255, 0.2) solid;
            outline-offset: -1px;
            padding: var(--padding-xl) var(--padding-xl) var(--space-12);
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideIn var(--animation-slow) var(--easing-elastic);
        }

        .step-indicators {
            display: flex;
            justify-content: center;
            gap: var(--gap-sm);
            margin-bottom: var(--space-10);
        }

        .step-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transition: all 0.3s;
        }

        .step-dot.active {
            background: #6366f1;
            width: 30px;
            border-radius: 5px;
        }

        .step-dot.completed {
            background: #10b981;
        }

        .step-content {
            min-height: 400px;
            display: flex;
            flex-direction: column;
        }

        .step-title {
            font-size: 32px;
            font-weight: 700;
            color: white;
            margin: 0 0 var(--margin-sm) 0;
            text-align: center;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .step-description {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            margin-bottom: 40px;
            line-height: 1.6;
        }

        .welcome-icon {
            font-size: 80px;
            text-align: center;
            margin: var(--space-10) 0;
            animation: heartbeat 2s var(--easing-ease-in-out) infinite;
        }

        .profiles-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--gap-md);
            margin-bottom: 24px;
        }

        .profile-card {
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }

        .profile-card:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-4px);
        }

        .profile-card.selected {
            background: rgba(99, 102, 241, 0.2);
            border-color: #6366f1;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }

        .profile-icon {
            font-size: 40px;
            margin-bottom: 12px;
        }

        .profile-name {
            font-size: 14px;
            font-weight: 600;
            color: white;
            margin-bottom: 6px;
        }

        .profile-description {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.4;
        }

        .questions-list {
            display: flex;
            flex-direction: column;
            gap: 24px;
            margin-bottom: 24px;
        }

        .question-item {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .question-label {
            font-size: 14px;
            font-weight: 600;
            color: white;
        }

        .question-input,
        .question-select {
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            outline: none;
            transition: all 0.2s;
        }

        .question-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .question-input:focus,
        .question-select:focus {
            background: rgba(255, 255, 255, 0.1);
            border-color: #6366f1;
        }

        .question-select option {
            background: #1a1a1a;
            color: white;
        }

        .multiselect-options {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .multiselect-option {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            transition: all 0.2s;
        }

        .multiselect-option:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .multiselect-option.selected {
            background: rgba(99, 102, 241, 0.3);
            border-color: #6366f1;
            color: white;
        }

        .completion-message {
            text-align: center;
            padding: 40px 0;
        }

        .completion-icon {
            font-size: 80px;
            margin-bottom: 24px;
            animation: bounceIn 600ms var(--easing-bounce);
        }

        .completion-text {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.8;
            margin-bottom: 16px;
        }

        .completion-highlight {
            color: #6366f1;
            font-weight: 600;
        }

        .actions {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-top: auto;
            padding-top: 24px;
        }

        .btn {
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            outline: none;
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .btn-primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            transform: translateY(-2px);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn-full {
            width: 100%;
        }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin var(--animation-slower) linear infinite;
            margin-right: 8px;
        }
    `;

    constructor() {
        super();
        this.currentStep = 0;
        this.profiles = [];
        this.selectedProfile = null;
        this.questions = [];
        this.answers = {};
        this.isCompleting = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadProfiles();
    }

    async loadProfiles() {
        try {
            const result = await window.api.profile.getAgentProfiles();
            this.profiles = result.profiles || [];
        } catch (error) {
            console.error('[OnboardingWizard] Error loading profiles:', error);
        }
    }

    selectProfile(profileId) {
        this.selectedProfile = profileId;
        this.loadQuestions(profileId);
    }

    async loadQuestions(profileId) {
        try {
            const result = await window.api.profile.getOnboardingQuestions(profileId);
            this.questions = result.questions || [];
            this.answers = {};
        } catch (error) {
            console.error('[OnboardingWizard] Error loading questions:', error);
        }
    }

    handleAnswer(questionId, value) {
        this.answers = {
            ...this.answers,
            [questionId]: value
        };
    }

    toggleMultiselect(questionId, option) {
        const current = this.answers[questionId] || [];
        const index = current.indexOf(option);

        if (index > -1) {
            this.answers = {
                ...this.answers,
                [questionId]: current.filter((_, i) => i !== index)
            };
        } else {
            this.answers = {
                ...this.answers,
                [questionId]: [...current, option]
            };
        }
    }

    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
    }

    canProceed() {
        switch (this.currentStep) {
            case 0: // Welcome
                return true;
            case 1: // Profile selection
                return this.selectedProfile !== null;
            case 2: // Questions
                return this.questions.every(q => {
                    const answer = this.answers[q.id];
                    if (q.type === 'multiselect') {
                        return answer && answer.length > 0;
                    }
                    return answer !== undefined && answer !== '';
                });
            case 3: // Completion
                return true;
            default:
                return false;
        }
    }

    async handleNext() {
        if (this.currentStep === 2) {
            // On questions step, going to completion
            this.nextStep();
        } else if (this.currentStep === 3) {
            // On completion step, finish onboarding
            await this.completeOnboarding();
        } else {
            this.nextStep();
        }
    }

    async completeOnboarding() {
        try {
            this.isCompleting = true;

            const data = {
                selectedProfile: this.selectedProfile,
                preferences: this.answers
            };

            const result = await window.api.profile.completeOnboarding(data);

            if (!result.success) {
                throw new Error(result.error || 'Failed to complete onboarding');
            }

            // Dispatch event to notify app
            this.dispatchEvent(new CustomEvent('onboarding-completed', {
                detail: result.profile,
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('[OnboardingWizard] Error completing onboarding:', error);
            alert('Erreur lors de la finalisation. Veuillez réessayer.');
        } finally {
            this.isCompleting = false;
        }
    }

    renderWelcome() {
        return html`
            <div class="welcome-icon">🚀</div>
            <h1 class="step-title">Bienvenue dans Lucide</h1>
            <p class="step-description">
                Configurons votre assistant IA personnalisé en quelques étapes simples.
                <br/><br/>
                Lucide s'adapte à votre métier et vos besoins pour vous offrir
                une expérience sur mesure.
            </p>
        `;
    }

    renderProfileSelection() {
        return html`
            <h1 class="step-title">Choisissez votre profil</h1>
            <p class="step-description">
                Sélectionnez le profil qui correspond le mieux à votre rôle professionnel
            </p>
            <div class="profiles-grid">
                ${this.profiles.map(profile => html`
                    <div
                        class="profile-card ${this.selectedProfile === profile.id ? 'selected' : ''}"
                        @click=${() => this.selectProfile(profile.id)}
                    >
                        <div class="profile-icon">${profile.icon}</div>
                        <div class="profile-name">${profile.name}</div>
                        <div class="profile-description">${profile.description}</div>
                    </div>
                `)}
            </div>
        `;
    }

    renderQuestions() {
        return html`
            <h1 class="step-title">Personnalisation</h1>
            <p class="step-description">
                Quelques questions pour mieux vous connaître et adapter votre expérience
            </p>
            <div class="questions-list">
                ${this.questions.map(question => this.renderQuestion(question))}
            </div>
        `;
    }

    renderQuestion(question) {
        switch (question.type) {
            case 'text':
                return html`
                    <div class="question-item">
                        <label class="question-label">${question.question}</label>
                        <input
                            type="text"
                            class="question-input"
                            placeholder="${question.placeholder || ''}"
                            .value=${this.answers[question.id] || ''}
                            @input=${(e) => this.handleAnswer(question.id, e.target.value)}
                        />
                    </div>
                `;

            case 'select':
                return html`
                    <div class="question-item">
                        <label class="question-label">${question.question}</label>
                        <select
                            class="question-select"
                            @change=${(e) => this.handleAnswer(question.id, e.target.value)}
                        >
                            <option value="">Sélectionnez une option</option>
                            ${question.options.map(opt => html`
                                <option
                                    value="${opt}"
                                    ?selected=${this.answers[question.id] === opt}
                                >
                                    ${opt}
                                </option>
                            `)}
                        </select>
                    </div>
                `;

            case 'multiselect':
                const selected = this.answers[question.id] || [];
                return html`
                    <div class="question-item">
                        <label class="question-label">${question.question}</label>
                        <div class="multiselect-options">
                            ${question.options.map(opt => html`
                                <div
                                    class="multiselect-option ${selected.includes(opt) ? 'selected' : ''}"
                                    @click=${() => this.toggleMultiselect(question.id, opt)}
                                >
                                    ${opt}
                                </div>
                            `)}
                        </div>
                    </div>
                `;

            default:
                return html``;
        }
    }

    renderCompletion() {
        const selectedProfileData = this.profiles.find(p => p.id === this.selectedProfile);

        return html`
            <div class="completion-message">
                <div class="completion-icon">✨</div>
                <div class="completion-text">
                    Votre assistant <span class="completion-highlight">${selectedProfileData?.name}</span> est prêt !
                </div>
                <div class="completion-text">
                    Lucide a été configuré selon vos préférences et va s'adapter
                    à votre façon de travailler au fil du temps.
                </div>
            </div>
        `;
    }

    renderStepContent() {
        switch (this.currentStep) {
            case 0:
                return this.renderWelcome();
            case 1:
                return this.renderProfileSelection();
            case 2:
                return this.renderQuestions();
            case 3:
                return this.renderCompletion();
            default:
                return html``;
        }
    }

    render() {
        return html`
            <div class="wizard-container">
                <div class="wizard-card">
                    <div class="step-indicators">
                        ${[0, 1, 2, 3].map(step => html`
                            <div class="step-dot ${
                                step === this.currentStep ? 'active' :
                                step < this.currentStep ? 'completed' : ''
                            }"></div>
                        `)}
                    </div>

                    <div class="step-content">
                        ${this.renderStepContent()}

                        <div class="actions">
                            ${this.currentStep > 0 && this.currentStep < 3 ? html`
                                <button class="btn btn-secondary" @click=${this.prevStep}>
                                    Retour
                                </button>
                            ` : html`<div></div>`}

                            ${this.currentStep < 3 ? html`
                                <button
                                    class="btn btn-primary"
                                    ?disabled=${!this.canProceed()}
                                    @click=${this.handleNext}
                                >
                                    ${this.currentStep === 2 ? 'Terminer' : 'Continuer'}
                                </button>
                            ` : html`
                                <button
                                    class="btn btn-primary btn-full"
                                    ?disabled=${this.isCompleting}
                                    @click=${this.completeOnboarding}
                                >
                                    ${this.isCompleting ? html`
                                        <span class="spinner"></span>
                                        Configuration en cours...
                                    ` : 'Commencer à utiliser Lucide'}
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('onboarding-wizard', OnboardingWizard);
