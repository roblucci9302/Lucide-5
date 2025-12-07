import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import { SettingsView } from '../settings/SettingsView.js';
import { ListenView } from '../listen/ListenView.js';
import { AskView } from '../ask/AskView.js';
import { BrowserView } from '../browser/BrowserView.js';
import { ShortcutSettingsView } from '../settings/ShortCutSettingsView.js';
import { PostMeetingPanel } from '../listen/PostMeetingPanel.js'; // Phase 1 - Meeting Assistant
import { i18n } from '../i18n/index.js';
import { OnboardingWizard } from '../onboarding/OnboardingWizard.js'; // Phase WOW 1: Onboarding

import '../listen/audioCore/renderer.js';

export class LucideApp extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: var(--text-color);
            background: transparent;
            border-radius: 7px;
        }

        listen-view {
            display: block;
            width: 100%;
            height: 100%;
        }

        ask-view, browser-view, settings-view, history-view, help-view, setup-view, post-meeting-panel {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* Phase WOW 1: Onboarding wizard styles */
        onboarding-wizard {
            display: block;
            width: 100%;
            height: 100%;
            min-height: 500px;
        }

        /* Phase 4: Improved loading screen styles */
        .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
            gap: 24px;
        }

        .loading-logo {
            font-size: 64px;
            animation: pulse 2s ease-in-out infinite;
        }

        .loading-title {
            font-size: 28px;
            font-weight: 600;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
        }

        .loading-spinner-container {
            display: flex;
            align-items: center;
            gap: 12px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        currentResponseIndex: { type: Number },
        isMainViewVisible: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        isClickThrough: { type: Boolean, state: true },
        layoutMode: { type: String },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        structuredData: { type: Object },
        // Phase WOW 1: Onboarding state
        showOnboarding: { type: Boolean, state: true },
        onboardingChecked: { type: Boolean, state: true }
    };

    constructor() {
        super();
        const urlParams = new URLSearchParams(window.location.search);
        this.currentView = urlParams.get('view') || 'listen';
        this.currentResponseIndex = -1;
        this.selectedProfile = localStorage.getItem('selectedProfile') || 'lucide_assistant';
        
        // Language format migration for legacy users
        let lang = 'fr'; // Forcer le français par défaut
        const savedLang = localStorage.getItem('selectedLanguage');
        if (savedLang && savedLang.includes('-')) {
            const newLang = savedLang.split('-')[0];
            console.warn(`[Migration] Correcting language format from "${savedLang}" to "${newLang}".`);
            localStorage.setItem('selectedLanguage', newLang);
            lang = newLang;
        } else if (savedLang && savedLang !== 'en') {
            // Utiliser la langue sauvegardée uniquement si ce n'est pas l'anglais
            lang = savedLang;
        }
        // Forcer le français dans le localStorage
        localStorage.setItem('selectedLanguage', lang);
        this.selectedLanguage = lang;

        // Initialiser le service i18n avec la langue sélectionnée
        i18n.setLocale(this.selectedLanguage);
        console.log(`[LucideApp] I18n initialized with locale: ${this.selectedLanguage}`);

        this.selectedScreenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5';
        this.selectedImageQuality = localStorage.getItem('selectedImageQuality') || 'medium';
        this._isClickThrough = false;

        // Phase WOW 1: Onboarding state initialization
        this.showOnboarding = false;
        this.onboardingChecked = false;
    }

    connectedCallback() {
        super.connectedCallback();

        if (window.api) {
            window.api.lucideApp.onClickThroughToggled((_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
        }

        // Phase WOW 1: Check if onboarding is needed
        this.checkOnboardingStatus();

        // Listen for onboarding completion
        this.addEventListener('onboarding-completed', this.handleOnboardingCompleted.bind(this));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api) {
            window.api.lucideApp.removeAllClickThroughListeners();
        }
        // Cleanup onboarding listener
        this.removeEventListener('onboarding-completed', this.handleOnboardingCompleted);
    }

    /**
     * Phase WOW 1: Check if user needs onboarding
     * Called on app startup to determine if onboarding wizard should be shown
     */
    async checkOnboardingStatus() {
        try {
            if (!window.api || !window.api.profile) {
                console.log('[LucideApp] No API available, skipping onboarding check');
                this.onboardingChecked = true;
                return;
            }

            console.log('[LucideApp] Checking onboarding status...');
            const result = await window.api.profile.needsOnboarding();

            if (result.success && result.needsOnboarding) {
                console.log('[LucideApp] User needs onboarding - showing wizard');
                this.showOnboarding = true;
            } else {
                console.log('[LucideApp] User already completed onboarding');
                this.showOnboarding = false;
            }
        } catch (error) {
            console.error('[LucideApp] Error checking onboarding status:', error);
            // On error, don't block the app - proceed without onboarding
            this.showOnboarding = false;
        } finally {
            this.onboardingChecked = true;
        }
    }

    /**
     * Phase WOW 1: Handle onboarding completion event
     * Transitions from onboarding wizard to main app
     */
    handleOnboardingCompleted(event) {
        console.log('[LucideApp] Onboarding completed:', event.detail);
        this.showOnboarding = false;

        // Update selected profile if provided
        if (event.detail?.active_profile) {
            this.selectedProfile = event.detail.active_profile;
            localStorage.setItem('selectedProfile', this.selectedProfile);
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('currentView')) {
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        // Only update localStorage when these specific properties change
        if (changedProperties.has('selectedProfile')) {
            localStorage.setItem('selectedProfile', this.selectedProfile);
        }
        if (changedProperties.has('selectedLanguage')) {
            localStorage.setItem('selectedLanguage', this.selectedLanguage);
        }
        if (changedProperties.has('selectedScreenshotInterval')) {
            localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        }
        if (changedProperties.has('selectedImageQuality')) {
            localStorage.setItem('selectedImageQuality', this.selectedImageQuality);
        }
        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
    }

    async handleClose() {
        if (window.api) {
            await window.api.common.quitApplication();
        }
    }




    render() {
        // Phase 4: Improved loading screen while checking onboarding status
        if (!this.onboardingChecked) {
            return html`
                <div class="loading-screen">
                    <div class="loading-logo">✨</div>
                    <h1 class="loading-title">Lucide</h1>
                    <div class="loading-spinner-container">
                        <div class="loading-spinner"></div>
                        <span>Préparation de votre assistant...</span>
                    </div>
                </div>
            `;
        }

        // Phase WOW 1: Show onboarding wizard if needed
        // Exception: Allow settings view even during onboarding
        if (this.showOnboarding && this.currentView !== 'settings' && this.currentView !== 'shortcut-settings') {
            return html`<onboarding-wizard></onboarding-wizard>`;
        }

        // Normal app rendering
        switch (this.currentView) {
            case 'listen':
                return html`<listen-view
                    .currentResponseIndex=${this.currentResponseIndex}
                    .selectedProfile=${this.selectedProfile}
                    .structuredData=${this.structuredData}
                    @response-index-changed=${e => (this.currentResponseIndex = e.detail.index)}
                ></listen-view>`;
            case 'ask':
                return html`<ask-view></ask-view>`;
            case 'browser':
                return html`<browser-view></browser-view>`;
            case 'settings':
                return html`<settings-view
                    .selectedProfile=${this.selectedProfile}
                    .selectedLanguage=${this.selectedLanguage}
                    .onProfileChange=${profile => (this.selectedProfile = profile)}
                    .onLanguageChange=${lang => (this.selectedLanguage = lang)}
                ></settings-view>`;
            case 'shortcut-settings':
                return html`<shortcut-settings-view></shortcut-settings-view>`;
            case 'post-meeting':
                return html`<post-meeting-panel></post-meeting-panel>`;
            case 'history':
                return html`<history-view></history-view>`;
            case 'help':
                return html`<help-view></help-view>`;
            case 'setup':
                return html`<setup-view></setup-view>`;
            default:
                return html`<div>Unknown view: ${this.currentView}</div>`;
        }
    }
}

customElements.define('lucide-app', LucideApp);
