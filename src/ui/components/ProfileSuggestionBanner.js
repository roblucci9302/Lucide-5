import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * ProfileSuggestionBanner Component
 * Displays profile switch suggestions to the user
 * Phase WOW 1 - Jour 4: Agent Router Intelligent
 */
export class ProfileSuggestionBanner extends LitElement {
    static properties = {
        suggestion: { type: Object },
        visible: { type: Boolean },
        isAnimating: { type: Boolean }
    };

    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            position: fixed;
            top: 80px; /* Below header */
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            max-width: 600px;
            width: calc(100% - 32px);
        }

        :host([hidden]) {
            display: none;
        }

        .banner {
            background: rgba(20, 20, 20, 0.95);
            border-radius: 16px;
            outline: 1px solid rgba(255, 255, 255, 0.2);
            outline-offset: -1px;
            padding: 16px 20px;
            box-shadow:
                0 10px 40px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);

            display: flex;
            align-items: center;
            gap: 16px;

            animation: slideIn var(--animation-base) var(--easing-smooth-out);
        }

        .banner.hiding {
            animation: fadeOut var(--animation-fast) var(--easing-smooth-out) forwards;
        }

        .icon {
            font-size: 32px;
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .content {
            flex: 1;
            min-width: 0;
        }

        .title {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            margin: 0 0 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .profile-name {
            color: var(--profile-accent, #818cf8);
            font-weight: 700;
        }

        .confidence {
            font-size: 11px;
            font-weight: 600;
            color: #4ade80;
            background: rgba(74, 222, 128, 0.15);
            padding: 2px 8px;
            border-radius: 8px;
        }

        .reason {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
            line-height: 1.4;
        }

        .actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        button {
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
            outline: none;
        }

        button:focus-visible {
            outline: 2px solid var(--profile-accent, #818cf8);
            outline-offset: 2px;
        }

        .btn-switch {
            background: var(--profile-primary, #6366f1);
            color: white;
        }

        .btn-switch:hover {
            background: var(--profile-secondary, #4f46e5);
            transform: translateY(-1px);
        }

        .btn-switch:active {
            transform: translateY(0);
        }

        .btn-dismiss {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }

        .btn-dismiss:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .btn-dismiss:active {
            background: rgba(255, 255, 255, 0.08);
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            .banner,
            .banner.hiding,
            button {
                animation: none !important;
                transition: none !important;
            }
        }
    `;

    constructor() {
        super();
        this.suggestion = null;
        this.visible = false;
        this.isAnimating = false;
    }

    /**
     * Show a suggestion
     * @param {Object} suggestion - Suggestion object from agentRouterService
     */
    show(suggestion) {
        if (!suggestion) return;

        this.suggestion = suggestion;
        this.visible = true;
        this.isAnimating = false;

        console.log('[ProfileSuggestionBanner] Showing suggestion:', suggestion.suggestedProfile);
    }

    /**
     * Hide the banner (with animation)
     */
    hide() {
        if (!this.visible) return;

        this.isAnimating = true;

        // Wait for animation to complete before hiding
        setTimeout(() => {
            this.visible = false;
            this.isAnimating = false;
            this.suggestion = null;
        }, 200); // Match animation duration
    }

    /**
     * Handle switch button click
     */
    async handleSwitch() {
        if (!this.suggestion) return;

        try {
            // Accept the suggestion via IPC
            const result = await window.api.profile.acceptSuggestion(this.suggestion);

            if (result.success) {
                // Switch profile
                await window.api.profile.switchProfile(this.suggestion.suggestedProfile, 'suggestion_accepted');

                // Hide banner
                this.hide();

                // Emit custom event for other components
                this.dispatchEvent(new CustomEvent('suggestion-accepted', {
                    detail: { suggestion: this.suggestion },
                    bubbles: true,
                    composed: true
                }));

                console.log('[ProfileSuggestionBanner] Suggestion accepted, switched to:', this.suggestion.suggestedProfile);
            }
        } catch (error) {
            console.error('[ProfileSuggestionBanner] Error accepting suggestion:', error);
        }
    }

    /**
     * Handle dismiss button click
     */
    async handleDismiss() {
        if (!this.suggestion) return;

        try {
            // Reject the suggestion via IPC
            await window.api.profile.rejectSuggestion(this.suggestion);

            // Hide banner
            this.hide();

            // Emit custom event
            this.dispatchEvent(new CustomEvent('suggestion-rejected', {
                detail: { suggestion: this.suggestion },
                bubbles: true,
                composed: true
            }));

            console.log('[ProfileSuggestionBanner] Suggestion rejected');
        } catch (error) {
            console.error('[ProfileSuggestionBanner] Error rejecting suggestion:', error);
        }
    }

    /**
     * Get profile info from agentProfileService via API
     */
    async getProfileInfo(profileId) {
        try {
            const result = await window.api.profile.getAgentProfiles();
            if (result.success) {
                return result.profiles.find(p => p.id === profileId);
            }
        } catch (error) {
            console.error('[ProfileSuggestionBanner] Error getting profile info:', error);
        }
        return null;
    }

    render() {
        if (!this.visible || !this.suggestion) {
            return html``;
        }

        // Map profile IDs to icons (from agentProfileService)
        const profileIcons = {
            lucide_assistant: '🤖',
            ceo_advisor: '🎯',
            sales_expert: '💼',
            manager_coach: '👥',
            hr_specialist: '👩‍💼',
            it_expert: '💻',
            marketing_expert: '📱'
        };

        const profileNames = {
            lucide_assistant: 'Assistant',
            ceo_advisor: 'CEO Advisor',
            sales_expert: 'Sales Expert',
            manager_coach: 'Manager Coach',
            hr_specialist: 'HR Specialist',
            it_expert: 'IT Expert',
            marketing_expert: 'Marketing Expert'
        };

        const icon = profileIcons[this.suggestion.suggestedProfile] || '✨';
        const name = profileNames[this.suggestion.suggestedProfile] || this.suggestion.suggestedProfile;
        const confidence = Math.round(this.suggestion.confidence * 100);

        return html`
            <div class="banner ${this.isAnimating ? 'hiding' : ''}">
                <div class="icon">${icon}</div>
                <div class="content">
                    <p class="title">
                        <span>Suggestion : passer à</span>
                        <span class="profile-name">${name}</span>
                        <span class="confidence">${confidence}%</span>
                    </p>
                    <p class="reason">${this.suggestion.reason}</p>
                </div>
                <div class="actions">
                    <button
                        class="btn-switch"
                        @click=${this.handleSwitch}
                        title="Changer de profil">
                        Changer
                    </button>
                    <button
                        class="btn-dismiss"
                        @click=${this.handleDismiss}
                        title="Ignorer cette suggestion">
                        Ignorer
                    </button>
                </div>
            </div>
        `;
    }
}

// Register the custom element
customElements.define('profile-suggestion-banner', ProfileSuggestionBanner);
