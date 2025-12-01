import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Quick Actions Panel Component
 * Displays workflow quick actions based on the current agent profile
 */
export class QuickActionsPanel extends LitElement {
    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
        }

        .quick-actions-container {
            padding: 16px;
            background: rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .quick-actions-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .header-icon {
            font-size: 16px;
        }

        .header-title {
            font-size: 13px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        }

        .header-subtitle {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-left: auto;
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
        }

        .action-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .action-card:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }

        .action-card:active {
            transform: translateY(0);
        }

        .action-header {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .action-icon {
            font-size: 18px;
        }

        .action-title {
            font-size: 12px;
            font-weight: 500;
            color: white;
            flex: 1;
        }

        .action-form-indicator {
            font-size: 10px;
            color: rgba(255, 200, 100, 0.8);
        }

        .action-description {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.4;
        }

        .action-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
        }

        .action-category {
            font-size: 9px;
            padding: 2px 6px;
            background: rgba(100, 150, 255, 0.2);
            border: 1px solid rgba(100, 150, 255, 0.3);
            border-radius: 8px;
            color: rgba(150, 200, 255, 0.9);
        }

        .action-time {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.4);
            margin-left: auto;
        }

        .no-workflows {
            text-align: center;
            padding: 32px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
        }

        .no-workflows-icon {
            font-size: 32px;
            margin-bottom: 8px;
            opacity: 0.3;
        }

        .profile-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
        }
    `;

    static properties = {
        workflows: { type: Object, state: true },
        activeProfile: { type: String, state: true },
        isLoading: { type: Boolean, state: true }
    };

    constructor() {
        super();
        this.workflows = {};
        this.activeProfile = 'lucide_assistant';
        this.isLoading = true;

        this.loadWorkflows();
    }

    async loadWorkflows() {
        if (!window.api) return;

        this.isLoading = true;

        try {
            // Get current active profile
            const profileData = await window.api.settingsView.agent.getActiveProfile();
            this.activeProfile = profileData || 'lucide_assistant';

            // Get workflows for current profile
            const workflowsData = await window.api.workflows.getWorkflowsMetadata(this.activeProfile);
            this.workflows = workflowsData || [];

            console.log(`[QuickActionsPanel] Loaded ${this.workflows.length} workflows for profile: ${this.activeProfile}`);
        } catch (error) {
            console.error('[QuickActionsPanel] Error loading workflows:', error);
            this.workflows = [];
        }

        this.isLoading = false;
    }

    handleWorkflowClick(workflow) {
        console.log(`[QuickActionsPanel] Workflow selected: ${workflow.id}`);

        // Emit custom event to parent (AskView)
        this.dispatchEvent(new CustomEvent('workflow-selected', {
            detail: { workflow },
            bubbles: true,
            composed: true
        }));
    }

    getProfileName(profileId) {
        const names = {
            'lucide_assistant': 'Assistant Général',
            'hr_specialist': 'Expert RH',
            'it_expert': 'Expert IT',
            'marketing_expert': 'Expert Marketing'
        };
        return names[profileId] || 'Général';
    }

    getProfileIcon(profileId) {
        const icons = {
            'lucide_assistant': '🤖',
            'hr_specialist': '👩‍💼',
            'it_expert': '💻',
            'marketing_expert': '📱'
        };
        return icons[profileId] || '🤖';
    }

    render() {
        if (this.isLoading) {
            return html`
                <div class="quick-actions-container">
                    <div class="no-workflows">
                        <div>Chargement des actions rapides...</div>
                    </div>
                </div>
            `;
        }

        // If no workflows for this profile, show friendly message
        if (!this.workflows || this.workflows.length === 0) {
            return html`
                <div class="quick-actions-container">
                    <div class="quick-actions-header">
                        <span class="header-icon">✨</span>
                        <span class="header-title">Actions Rapides</span>
                        <span class="profile-indicator">
                            ${this.getProfileIcon(this.activeProfile)}
                            ${this.getProfileName(this.activeProfile)}
                        </span>
                    </div>
                    <div class="no-workflows">
                        <div class="no-workflows-icon">💬</div>
                        <div>Posez n'importe quelle question</div>
                        <div style="margin-top: 4px; font-size: 10px;">Mode ${this.getProfileName(this.activeProfile)} actif</div>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="quick-actions-container">
                <div class="quick-actions-header">
                    <span class="header-icon">⚡</span>
                    <span class="header-title">Actions Rapides</span>
                    <span class="profile-indicator">
                        ${this.getProfileIcon(this.activeProfile)}
                        ${this.getProfileName(this.activeProfile)}
                    </span>
                    <span class="header-subtitle">${this.workflows.length} workflows</span>
                </div>

                <div class="actions-grid">
                    ${this.workflows.map(workflow => html`
                        <div
                            class="action-card"
                            @click=${() => this.handleWorkflowClick(workflow)}
                        >
                            <div class="action-header">
                                <span class="action-icon">${workflow.icon}</span>
                                <span class="action-title">${workflow.title}</span>
                                ${workflow.hasForm ? html`
                                    <span class="action-form-indicator" title="Formulaire guidé disponible">📋</span>
                                ` : ''}
                            </div>
                            <div class="action-description">${workflow.description}</div>
                            <div class="action-meta">
                                ${workflow.category ? html`
                                    <span class="action-category">${workflow.category}</span>
                                ` : ''}
                                ${workflow.estimatedTime ? html`
                                    <span class="action-time">⏱️ ${workflow.estimatedTime}</span>
                                ` : ''}
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }
}

customElements.define('quick-actions-panel', QuickActionsPanel);
