/**
 * Workflow Integration Test Suite
 *
 * Tests for the complete workflow flow:
 * - QuickActionsPanel profile names/icons
 * - Workflow selection → Form display → Prompt generation
 * - All profiles with workflows
 *
 * Phase 3: Workflows Audit Fix
 */

// Mock dependencies
jest.mock('../src/features/common/services/agentProfileService', () => ({
    getCurrentProfile: jest.fn().mockReturnValue('hr_specialist')
}));

jest.mock('../src/features/common/services/sqliteClient', () => ({
    getDb: jest.fn(),
    getDatabase: jest.fn()
}));

// Import after mocking
const workflowService = require('../src/features/common/services/workflowService');
const { WORKFLOW_TEMPLATES } = require('../src/features/common/prompts/workflowTemplates');
const workflowDocumentEnhancer = require('../src/features/common/services/workflowDocumentEnhancer');

describe('Workflow Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // Section 1: QuickActionsPanel Profile Support
    // ==========================================
    describe('QuickActionsPanel Profile Support', () => {
        // These match the updated QuickActionsPanel.js
        const profileNames = {
            'lucide_assistant': 'Assistant Général',
            'hr_specialist': 'Expert RH',
            'it_expert': 'Expert IT',
            'marketing_expert': 'Expert Marketing',
            'ceo_advisor': 'Conseiller CEO',
            'sales_expert': 'Expert Commercial',
            'manager_coach': 'Coach Manager'
        };

        const profileIcons = {
            'lucide_assistant': '🤖',
            'hr_specialist': '👩‍💼',
            'it_expert': '💻',
            'marketing_expert': '📱',
            'ceo_advisor': '👔',
            'sales_expert': '💰',
            'manager_coach': '🎯'
        };

        test('all profiles with workflows should have names defined', () => {
            const profilesWithWorkflows = Object.keys(WORKFLOW_TEMPLATES).filter(
                p => Object.keys(WORKFLOW_TEMPLATES[p]).length > 0
            );

            profilesWithWorkflows.forEach(profileId => {
                expect(profileNames[profileId]).toBeDefined();
                expect(profileNames[profileId].length).toBeGreaterThan(0);
            });
        });

        test('all profiles with workflows should have icons defined', () => {
            const profilesWithWorkflows = Object.keys(WORKFLOW_TEMPLATES).filter(
                p => Object.keys(WORKFLOW_TEMPLATES[p]).length > 0
            );

            profilesWithWorkflows.forEach(profileId => {
                expect(profileIcons[profileId]).toBeDefined();
            });
        });

        test('should have 7 profiles defined', () => {
            expect(Object.keys(profileNames).length).toBe(7);
            expect(Object.keys(profileIcons).length).toBe(7);
        });
    });

    // ==========================================
    // Section 2: Complete Workflow Flow per Profile
    // ==========================================
    describe('Complete Workflow Flow - HR Specialist', () => {
        const profileId = 'hr_specialist';

        test('should have workflows available', () => {
            expect(workflowService.hasWorkflows(profileId)).toBe(true);
        });

        test('create_job_posting: full flow with form', () => {
            const workflowId = 'create_job_posting';

            // Step 1: Get workflow
            const workflow = workflowService.getWorkflow(profileId, workflowId);
            expect(workflow).toBeDefined();
            expect(workflow.hasForm).toBe(true);

            // Step 2: Get form fields
            const formFields = workflowService.getWorkflowFormFields(profileId, workflowId);
            expect(formFields).toBeDefined();
            expect(formFields.length).toBeGreaterThan(0);

            // Step 3: Fill form data
            const formData = {};
            formFields.forEach(field => {
                if (field.type === 'multiselect') {
                    formData[field.name] = field.options ? [field.options[0]] : ['Test'];
                } else if (field.type === 'select') {
                    formData[field.name] = field.options ? field.options[0] : 'Test';
                } else {
                    formData[field.name] = 'Test Value';
                }
            });

            // Step 4: Validate form
            const validation = workflowService.validateFormData(profileId, workflowId, formData);
            expect(validation.valid).toBe(true);

            // Step 5: Build prompt with form data
            const prompt = workflowService.buildPrompt(profileId, workflowId, formData);
            expect(prompt).toBeDefined();
            expect(prompt.length).toBeGreaterThan(100);

            // Step 6: Should be a document workflow
            expect(workflowDocumentEnhancer.shouldGenerateDocument(workflowId)).toBe(true);
        });

        test('onboarding_plan: workflow exists', () => {
            const workflow = workflowService.getWorkflow(profileId, 'onboarding_plan');
            expect(workflow).toBeDefined();
        });
    });

    describe('Complete Workflow Flow - CEO Advisor', () => {
        const profileId = 'ceo_advisor';

        test('should have 8 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile(profileId);
            expect(Object.keys(workflows).length).toBe(8);
        });

        test('pitch_deck_creation: full flow with form', () => {
            const workflowId = 'pitch_deck_creation';

            // Get workflow and verify
            const workflow = workflowService.getWorkflow(profileId, workflowId);
            expect(workflow).toBeDefined();
            expect(workflow.hasForm).toBe(true);

            // Get and fill form
            const formFields = workflowService.getWorkflowFormFields(profileId, workflowId);
            const formData = { companyName: 'TestCorp', fundingStage: 'Seed' };

            // Build prompt
            const prompt = workflowService.buildPrompt(profileId, workflowId, formData);
            expect(prompt).toContain('TestCorp');
            expect(prompt).toContain('DOCUMENT');
        });

        test('strategic_okrs: document generation', () => {
            const workflowId = 'strategic_okrs';
            expect(workflowDocumentEnhancer.shouldGenerateDocument(workflowId)).toBe(true);

            const config = workflowDocumentEnhancer.getDocumentConfig(workflowId);
            expect(config.type).toBe('plan');
        });

        test('investor_quarterly_report: exists and generates document', () => {
            const workflow = workflowService.getWorkflow(profileId, 'investor_quarterly_report');
            expect(workflow).toBeDefined();
            expect(workflowDocumentEnhancer.shouldGenerateDocument('investor_quarterly_report')).toBe(true);
        });
    });

    describe('Complete Workflow Flow - IT Expert', () => {
        const profileId = 'it_expert';

        test('should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile(profileId);
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('code_review: workflow without form', () => {
            const workflow = workflowService.getWorkflow(profileId, 'code_review');
            expect(workflow).toBeDefined();

            // Build prompt without form
            const prompt = workflowService.buildPrompt(profileId, 'code_review', {});
            expect(prompt).toBeDefined();
        });

        test('technical_spec: document generation', () => {
            expect(workflowDocumentEnhancer.shouldGenerateDocument('technical_spec')).toBe(true);
        });
    });

    describe('Complete Workflow Flow - Marketing Expert', () => {
        const profileId = 'marketing_expert';

        test('should have 6 workflows with forms', () => {
            const workflows = workflowService.getWorkflowsForProfile(profileId);
            expect(Object.keys(workflows).length).toBe(6);

            // All marketing workflows have forms
            const withForms = Object.values(workflows).filter(w => w.hasForm).length;
            expect(withForms).toBe(6);
        });

        test('create_campaign: full flow', () => {
            const workflowId = 'create_campaign';
            const workflow = workflowService.getWorkflow(profileId, workflowId);

            expect(workflow.hasForm).toBe(true);
            expect(workflowDocumentEnhancer.shouldGenerateDocument(workflowId)).toBe(true);

            const prompt = workflowService.buildPrompt(profileId, workflowId, {
                campaignName: 'Summer Launch',
                budget: '50000'
            });
            expect(prompt).toContain('Summer Launch');
        });
    });

    describe('Complete Workflow Flow - Sales Expert', () => {
        const profileId = 'sales_expert';

        test('should have 6 workflows with forms', () => {
            const workflows = workflowService.getWorkflowsForProfile(profileId);
            expect(Object.keys(workflows).length).toBe(6);

            const withForms = Object.values(workflows).filter(w => w.hasForm).length;
            expect(withForms).toBe(6);
        });

        test('proposal_creation: generates document', () => {
            expect(workflowDocumentEnhancer.shouldGenerateDocument('proposal_creation')).toBe(true);

            const prompt = workflowService.buildPrompt(profileId, 'proposal_creation', {
                clientName: 'Acme Corp',
                productName: 'Enterprise Suite'
            });
            expect(prompt).toContain('Acme Corp');
        });

        test('cold_outreach: email document type', () => {
            const config = workflowDocumentEnhancer.getDocumentConfig('cold_outreach');
            expect(config).toBeDefined();
            expect(config.type).toBe('email');
        });
    });

    describe('Complete Workflow Flow - Manager Coach', () => {
        const profileId = 'manager_coach';

        test('should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile(profileId);
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('one_on_one_template: agenda document type', () => {
            const config = workflowDocumentEnhancer.getDocumentConfig('one_on_one_template');
            expect(config).toBeDefined();
            expect(config.type).toBe('agenda');
        });

        test('performance_feedback: feedback document type', () => {
            const config = workflowDocumentEnhancer.getDocumentConfig('performance_feedback');
            expect(config).toBeDefined();
            expect(config.type).toBe('feedback');
        });
    });

    // ==========================================
    // Section 3: Document Types Coverage
    // ==========================================
    describe('Document Types Coverage', () => {
        test('should support multiple document types', () => {
            const stats = workflowDocumentEnhancer.getStats();

            expect(stats.types).toContain('offre');
            expect(stats.types).toContain('plan');
            expect(stats.types).toContain('presentation');
            expect(stats.types).toContain('rapport');
            expect(stats.types).toContain('email');
            expect(stats.types).toContain('analyse');
        });

        test('should have workflows grouped by type', () => {
            const stats = workflowDocumentEnhancer.getStats();
            const grouped = stats.workflowsByType;

            expect(grouped['plan']).toBeDefined();
            expect(grouped['plan'].length).toBeGreaterThan(0);

            expect(grouped['rapport']).toBeDefined();
        });
    });

    // ==========================================
    // Section 4: Edge Cases
    // ==========================================
    describe('Edge Cases', () => {
        test('lucide_assistant should have no workflows', () => {
            expect(workflowService.hasWorkflows('lucide_assistant')).toBe(false);
            const workflows = workflowService.getWorkflowsForProfile('lucide_assistant');
            expect(Object.keys(workflows).length).toBe(0);
        });

        test('unknown profile should return empty workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('unknown_profile');
            expect(workflows).toBeDefined();
            expect(Object.keys(workflows).length).toBe(0);
        });

        test('form validation should handle missing optional fields', () => {
            // Get a workflow with both required and optional fields
            const formFields = workflowService.getWorkflowFormFields('hr_specialist', 'create_job_posting');

            if (formFields) {
                // Only fill required fields
                const formData = {};
                formFields.filter(f => f.required).forEach(field => {
                    formData[field.name] = 'Required Value';
                });

                const validation = workflowService.validateFormData('hr_specialist', 'create_job_posting', formData);
                expect(validation.valid).toBe(true);
            }
        });
    });

    // ==========================================
    // Section 5: Workflow Metadata Consistency
    // ==========================================
    describe('Workflow Metadata Consistency', () => {
        const allProfiles = ['hr_specialist', 'it_expert', 'marketing_expert', 'ceo_advisor', 'sales_expert', 'manager_coach'];

        allProfiles.forEach(profileId => {
            test(`${profileId}: all workflows should have required metadata`, () => {
                const metadata = workflowService.getProfileWorkflowsMetadata(profileId);

                metadata.forEach(m => {
                    expect(m.id).toBeDefined();
                    expect(m.title).toBeDefined();
                    expect(m.title.length).toBeGreaterThan(0);
                    expect(m.icon).toBeDefined();
                    expect(typeof m.hasForm).toBe('boolean');
                });
            });
        });
    });

    // ==========================================
    // Section 6: Form Fields Consistency
    // ==========================================
    describe('Form Fields Consistency', () => {
        test('all form fields should have valid types', () => {
            const validTypes = ['text', 'number', 'select', 'multiselect', 'textarea'];

            for (const profileId of Object.keys(WORKFLOW_TEMPLATES)) {
                const workflows = WORKFLOW_TEMPLATES[profileId];

                for (const [workflowId, workflow] of Object.entries(workflows)) {
                    if (workflow.hasForm && workflow.formFields) {
                        workflow.formFields.forEach(field => {
                            expect(validTypes).toContain(field.type);
                        });
                    }
                }
            }
        });

        test('all required fields should be fillable', () => {
            for (const profileId of Object.keys(WORKFLOW_TEMPLATES)) {
                const workflows = WORKFLOW_TEMPLATES[profileId];

                for (const [workflowId, workflow] of Object.entries(workflows)) {
                    if (workflow.hasForm && workflow.formFields) {
                        const requiredFields = workflow.formFields.filter(f => f.required);

                        requiredFields.forEach(field => {
                            // Select/multiselect should have options
                            if (field.type === 'select' || field.type === 'multiselect') {
                                expect(field.options).toBeDefined();
                                expect(field.options.length).toBeGreaterThan(0);
                            }
                            // All fields should have a label
                            expect(field.label).toBeDefined();
                        });
                    }
                }
            }
        });
    });
});
