import { LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * ProfileThemeManager Component
 * Headless component that manages profile theme transitions
 * Phase WOW 1 - Jour 3: UI Adaptation par profil
 */
export class ProfileThemeManager extends LitElement {
    static properties = {
        currentTheme: { type: Object },
        transitionDuration: { type: Number }
    };

    constructor() {
        super();
        this.currentTheme = null;
        this.transitionDuration = 300; // ms - SUBTLE transition
        this.isInitialized = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.initializeTheme();
        this.setupListeners();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeListeners();
    }

    /**
     * Initialize theme on component mount
     */
    async initializeTheme() {
        try {
            const result = await window.api.profile.getCurrentTheme();
            if (result.success && result.theme) {
                this.currentTheme = result.theme;
                this.applyTheme(result.theme, false); // No transition on first load
                this.isInitialized = true;
                console.log('[ProfileThemeManager] Initialized with theme:', result.profile);
            }
        } catch (error) {
            console.error('[ProfileThemeManager] Error initializing theme:', error);
            // Apply default theme
            this.applyDefaultTheme();
        }
    }

    /**
     * Setup IPC event listeners
     */
    setupListeners() {
        // Listen to theme changes from main process
        this.themeChangedHandler = (data) => {
            console.log('[ProfileThemeManager] Theme changed:', data);
            if (data.theme) {
                this.currentTheme = data.theme;
                this.applyTheme(data.theme, true); // With transition
            }
        };

        window.api.profile.onThemeChanged(this.themeChangedHandler);

        // Also listen to profile switches (backup)
        this.profileSwitchedHandler = async (data) => {
            if (data.newProfile && this.isInitialized) {
                // Fetch the new theme
                const result = await window.api.profile.getTheme(data.newProfile);
                if (result.success && result.theme) {
                    this.currentTheme = result.theme;
                    this.applyTheme(result.theme, true);
                }
            }
        };

        window.api.profile.onProfileSwitched?.(this.profileSwitchedHandler);
    }

    /**
     * Remove event listeners
     */
    removeListeners() {
        // Note: In real implementation, we'd need proper cleanup
        // For now, handlers will be replaced on reconnect
    }

    /**
     * Apply theme to document root
     * @param {Object} theme - Theme object with colors
     * @param {Boolean} withTransition - Whether to animate the transition
     */
    applyTheme(theme, withTransition = true) {
        const root = document.documentElement;

        // Enable transitions if requested
        if (withTransition) {
            this.enableTransitions();
        }

        // Apply CSS variables
        root.style.setProperty('--profile-primary', theme.primary);
        root.style.setProperty('--profile-secondary', theme.secondary);
        root.style.setProperty('--profile-accent', theme.accent);
        root.style.setProperty('--profile-accent-light', theme.accentLight);

        // Also store theme name and icon as data attributes
        root.setAttribute('data-profile-icon', theme.icon || '🤖');
        root.setAttribute('data-profile-name', theme.name || 'Assistant');

        // Disable transitions after animation completes
        if (withTransition) {
            setTimeout(() => {
                this.disableTransitions();
            }, this.transitionDuration + 50); // +50ms buffer
        }

        // Emit custom event for other components
        this.dispatchEvent(new CustomEvent('theme-applied', {
            detail: { theme },
            bubbles: true,
            composed: true
        }));
    }

    /**
     * Apply default theme (fallback)
     */
    applyDefaultTheme() {
        const defaultTheme = {
            primary: '#6366f1',
            secondary: '#4f46e5',
            accent: '#818cf8',
            accentLight: '#a5b4fc',
            icon: '🤖',
            name: 'Assistant'
        };
        this.applyTheme(defaultTheme, false);
    }

    /**
     * Enable CSS transitions on root
     */
    enableTransitions() {
        const root = document.documentElement;
        root.style.setProperty('--theme-transition-duration', `${this.transitionDuration}ms`);
        root.classList.add('theme-transitioning');
    }

    /**
     * Disable CSS transitions on root
     */
    disableTransitions() {
        const root = document.documentElement;
        root.classList.remove('theme-transitioning');
    }

    /**
     * Manual theme application (for testing)
     * @param {String} profileId
     */
    async setTheme(profileId) {
        try {
            const result = await window.api.profile.getTheme(profileId);
            if (result.success && result.theme) {
                this.currentTheme = result.theme;
                this.applyTheme(result.theme, true);
            }
        } catch (error) {
            console.error('[ProfileThemeManager] Error setting theme:', error);
        }
    }

    /**
     * Get current theme
     * @returns {Object}
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    // No render method needed - this is a headless component
    render() {
        return null;
    }
}

// Register the custom element
customElements.define('profile-theme-manager', ProfileThemeManager);
