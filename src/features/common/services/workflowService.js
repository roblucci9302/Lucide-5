/**
 * Phase 3: Workflow Service
 *
 * Manages specialized workflows for each agent profile.
 * Provides quick actions and structured prompts for common tasks.
 */

const {
    getWorkflowsForProfile,
    getWorkflow,
    getWorkflowIds,
    buildWorkflowPrompt
} = require('../prompts/workflowTemplates');

const agentProfileService = require('./agentProfileService');
const workflowDocumentEnhancer = require('./workflowDocumentEnhancer');

/**
 * @class WorkflowService
 * @description Singleton service for managing workflows
 */
class WorkflowService {
    constructor() {
        console.log('[WorkflowService] Service initialized');
    }

    /**
     * Get all available workflows for the current active profile
     * @returns {Object} Workflows object with workflow definitions
     */
    getCurrentProfileWorkflows() {
        const currentProfile = agentProfileService.getCurrentProfile();
        const workflows = getWorkflowsForProfile(currentProfile);

        console.log(`[WorkflowService] Retrieved ${Object.keys(workflows).length} workflows for profile: ${currentProfile}`);
        return workflows;
    }

    /**
     * Get workflows for a specific profile
     * @param {string} profileId - Agent profile ID
     * @returns {Object} Workflows object
     */
    getWorkflowsForProfile(profileId) {
        return getWorkflowsForProfile(profileId);
    }

    /**
     * Get a specific workflow by ID for current profile
     * @param {string} workflowId - Workflow ID
     * @returns {Object|null} Workflow object or null
     */
    getCurrentProfileWorkflow(workflowId) {
        const currentProfile = agentProfileService.getCurrentProfile();
        return this.getWorkflow(currentProfile, workflowId);
    }

    /**
     * Get a specific workflow by profile and workflow ID
     * @param {string} profileId - Agent profile ID
     * @param {string} workflowId - Workflow ID
     * @returns {Object|null} Workflow object or null
     */
    getWorkflow(profileId, workflowId) {
        const workflow = getWorkflow(profileId, workflowId);

        if (workflow) {
            console.log(`[WorkflowService] Retrieved workflow: ${workflowId} for profile: ${profileId}`);
        } else {
            console.warn(`[WorkflowService] Workflow not found: ${workflowId} for profile: ${profileId}`);
        }

        return workflow;
    }

    /**
     * Get workflow IDs for current profile (for UI rendering)
     * @returns {Array<string>} Array of workflow IDs
     */
    getCurrentProfileWorkflowIds() {
        const currentProfile = agentProfileService.getCurrentProfile();
        return getWorkflowIds(currentProfile);
    }

    /**
     * Build a complete prompt from a workflow template
     * @param {string} workflowId - Workflow ID
     * @param {Object} formData - Optional form data
     * @returns {string} Complete prompt ready to send to LLM
     */
    buildPromptForCurrentProfile(workflowId, formData = {}) {
        const currentProfile = agentProfileService.getCurrentProfile();
        return this.buildPrompt(currentProfile, workflowId, formData);
    }

    /**
     * Build a complete prompt from a workflow template with specific profile
     * Phase 4: Automatically enhances prompts for document generation
     * @param {string} profileId - Agent profile ID
     * @param {string} workflowId - Workflow ID
     * @param {Object} formData - Optional form data
     * @returns {string} Complete prompt ready to send to LLM
     */
    buildPrompt(profileId, workflowId, formData = {}) {
        const prompt = buildWorkflowPrompt(profileId, workflowId, formData);

        if (!prompt) {
            return null;
        }

        // Phase 4: Enhance prompt for document generation if applicable
        const enhancedPrompt = workflowDocumentEnhancer.enhancePrompt(workflowId, prompt, formData);

        if (enhancedPrompt !== prompt) {
            console.log(`[WorkflowService] Enhanced prompt for document generation: ${workflowId}`);
        }

        console.log(`[WorkflowService] Built prompt for workflow: ${workflowId} (length: ${enhancedPrompt.length} chars)`);

        return enhancedPrompt;
    }

    /**
     * Get workflow metadata (for UI display)
     * @param {string} profileId - Agent profile ID
     * @param {string} workflowId - Workflow ID
     * @returns {Object} Metadata object with title, icon, description, etc.
     */
    getWorkflowMetadata(profileId, workflowId) {
        const workflow = this.getWorkflow(profileId, workflowId);

        if (!workflow) return null;

        return {
            id: workflow.id,
            title: workflow.title,
            icon: workflow.icon,
            description: workflow.description,
            category: workflow.category,
            estimatedTime: workflow.estimatedTime,
            hasForm: workflow.hasForm || false
        };
    }

    /**
     * Get all workflows metadata for a profile (optimized for UI)
     * @param {string} profileId - Agent profile ID
     * @returns {Array<Object>} Array of workflow metadata objects
     */
    getProfileWorkflowsMetadata(profileId) {
        const workflows = getWorkflowsForProfile(profileId);

        return Object.keys(workflows).map(workflowId => {
            const workflow = workflows[workflowId];
            return {
                id: workflow.id,
                title: workflow.title,
                icon: workflow.icon,
                description: workflow.description,
                category: workflow.category,
                estimatedTime: workflow.estimatedTime,
                hasForm: workflow.hasForm || false
            };
        });
    }

    /**
     * Check if a profile has workflows available
     * @param {string} profileId - Agent profile ID
     * @returns {boolean} True if profile has workflows
     */
    hasWorkflows(profileId) {
        const workflows = getWorkflowsForProfile(profileId);
        return Object.keys(workflows).length > 0;
    }

    /**
     * Get workflow form fields (if workflow has a form)
     * @param {string} profileId - Agent profile ID
     * @param {string} workflowId - Workflow ID
     * @returns {Array<Object>|null} Form fields array or null
     */
    getWorkflowFormFields(profileId, workflowId) {
        const workflow = this.getWorkflow(profileId, workflowId);

        if (!workflow || !workflow.hasForm) return null;

        return workflow.formFields || [];
    }

    /**
     * Validate form data against workflow form fields
     * @param {string} profileId - Agent profile ID
     * @param {string} workflowId - Workflow ID
     * @param {Object} formData - Form data to validate
     * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
     */
    validateFormData(profileId, workflowId, formData) {
        const formFields = this.getWorkflowFormFields(profileId, workflowId);

        if (!formFields) {
            return { valid: true, errors: [] };
        }

        const errors = [];

        formFields.forEach(field => {
            if (field.required && !formData[field.name]) {
                errors.push(`Le champ "${field.label}" est requis`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Singleton instance
const workflowService = new WorkflowService();

module.exports = workflowService;
