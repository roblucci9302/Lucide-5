/**
 * Workflow Service Test Suite
 *
 * Tests for the structured workflows functionality:
 * - Workflow templates per profile
 * - Form fields retrieval
 * - Prompt building with form data
 * - Document enhancement
 *
 * Phase 2: Workflows Audit Fix
 */

// Mock dependencies before importing
jest.mock('../src/features/common/services/agentProfileService', () => ({
    getCurrentProfile: jest.fn().mockReturnValue('hr_specialist')
}));

jest.mock('../src/features/common/services/sqliteClient', () => ({
    getDb: jest.fn(),
    getDatabase: jest.fn()
}));

// Import after mocking
const workflowService = require('../src/features/common/services/workflowService');
const { WORKFLOW_TEMPLATES, buildWorkflowPrompt } = require('../src/features/common/prompts/workflowTemplates');
const workflowDocumentEnhancer = require('../src/features/common/services/workflowDocumentEnhancer');

describe('Workflow Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // Section 1: Workflow Templates Count
    // ==========================================
    describe('Workflow Templates Count', () => {
        test('should have 38 total workflows across all profiles', () => {
            let total = 0;
            for (const profileId of Object.keys(WORKFLOW_TEMPLATES)) {
                total += Object.keys(WORKFLOW_TEMPLATES[profileId]).length;
            }
            expect(total).toBe(38);
        });

        test('hr_specialist should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('hr_specialist');
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('ceo_advisor should have 8 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('ceo_advisor');
            expect(Object.keys(workflows).length).toBe(8);
        });

        test('it_expert should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('it_expert');
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('marketing_expert should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('marketing_expert');
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('sales_expert should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('sales_expert');
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('manager_coach should have 6 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('manager_coach');
            expect(Object.keys(workflows).length).toBe(6);
        });

        test('lucide_assistant should have 0 workflows', () => {
            const workflows = workflowService.getWorkflowsForProfile('lucide_assistant');
            expect(Object.keys(workflows).length).toBe(0);
        });
    });

    // ==========================================
    // Section 2: Workflow Retrieval
    // ==========================================
    describe('Workflow Retrieval', () => {
        test('should get specific workflow by profile and id', () => {
            const workflow = workflowService.getWorkflow('hr_specialist', 'create_job_posting');
            expect(workflow).toBeDefined();
            expect(workflow.id).toBe('create_job_posting');
            expect(workflow.title).toBeDefined();
        });

        test('should return null for non-existent workflow', () => {
            const workflow = workflowService.getWorkflow('hr_specialist', 'non_existent');
            expect(workflow).toBeNull();
        });

        test('should return null for non-existent profile', () => {
            const workflow = workflowService.getWorkflow('fake_profile', 'create_job_posting');
            expect(workflow).toBeNull();
        });

        test('should get workflow metadata', () => {
            const metadata = workflowService.getWorkflowMetadata('ceo_advisor', 'pitch_deck_creation');
            expect(metadata).toBeDefined();
            expect(metadata.id).toBe('pitch_deck_creation');
            expect(metadata.title).toBeDefined();
            expect(metadata.icon).toBeDefined();
            expect(metadata.hasForm).toBeDefined();
        });

        test('should get all workflows metadata for profile', () => {
            const metadata = workflowService.getProfileWorkflowsMetadata('marketing_expert');
            expect(Array.isArray(metadata)).toBe(true);
            expect(metadata.length).toBe(6);
            metadata.forEach(m => {
                expect(m.id).toBeDefined();
                expect(m.title).toBeDefined();
            });
        });
    });

    // ==========================================
    // Section 3: Form Fields
    // ==========================================
    describe('Form Fields', () => {
        test('should return form fields for workflow with form', () => {
            const fields = workflowService.getWorkflowFormFields('hr_specialist', 'create_job_posting');
            expect(fields).toBeDefined();
            expect(Array.isArray(fields)).toBe(true);
            expect(fields.length).toBeGreaterThan(0);
        });

        test('should return null for workflow without form', () => {
            // Find a workflow without form
            const workflows = workflowService.getWorkflowsForProfile('it_expert');
            const workflowWithoutForm = Object.values(workflows).find(w => !w.hasForm);

            if (workflowWithoutForm) {
                const fields = workflowService.getWorkflowFormFields('it_expert', workflowWithoutForm.id);
                expect(fields).toBeNull();
            }
        });

        test('form fields should have required properties', () => {
            const fields = workflowService.getWorkflowFormFields('ceo_advisor', 'pitch_deck_creation');

            if (fields && fields.length > 0) {
                fields.forEach(field => {
                    expect(field.name).toBeDefined();
                    expect(field.label).toBeDefined();
                    expect(field.type).toBeDefined();
                    expect(['text', 'number', 'select', 'multiselect', 'textarea']).toContain(field.type);
                });
            }
        });

        test('select/multiselect fields should have options', () => {
            const fields = workflowService.getWorkflowFormFields('marketing_expert', 'create_campaign');

            if (fields) {
                const selectFields = fields.filter(f => f.type === 'select' || f.type === 'multiselect');
                selectFields.forEach(field => {
                    expect(field.options).toBeDefined();
                    expect(Array.isArray(field.options)).toBe(true);
                    expect(field.options.length).toBeGreaterThan(0);
                });
            }
        });
    });

    // ==========================================
    // Section 4: Prompt Building with Form Data
    // ==========================================
    describe('Prompt Building with Form Data', () => {
        test('should build prompt without form data', () => {
            const prompt = workflowService.buildPrompt('hr_specialist', 'create_job_posting', {});
            expect(prompt).toBeDefined();
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(0);
        });

        test('should build prompt with form data', () => {
            const formData = {
                jobTitle: 'Senior Developer',
                department: 'Engineering'
            };

            const prompt = workflowService.buildPrompt('hr_specialist', 'create_job_posting', formData);
            expect(prompt).toBeDefined();
            expect(prompt).toContain('Senior Developer');
            expect(prompt).toContain('Engineering');
        });

        test('should return null for non-existent workflow', () => {
            const prompt = workflowService.buildPrompt('hr_specialist', 'fake_workflow', {});
            expect(prompt).toBeNull();
        });

        test('prompt should include document generation instructions for document workflows', () => {
            const prompt = workflowService.buildPrompt('ceo_advisor', 'pitch_deck_creation', {
                companyName: 'TestCorp'
            });

            expect(prompt).toBeDefined();
            // Should contain document enhancement instructions
            expect(prompt).toContain('DOCUMENT');
        });
    });

    // ==========================================
    // Section 5: Form Validation
    // ==========================================
    describe('Form Validation', () => {
        test('should validate empty form data against required fields', () => {
            const result = workflowService.validateFormData('hr_specialist', 'create_job_posting', {});

            // If workflow has required fields, validation should fail
            const fields = workflowService.getWorkflowFormFields('hr_specialist', 'create_job_posting');
            const hasRequiredFields = fields && fields.some(f => f.required);

            if (hasRequiredFields) {
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });

        test('should pass validation with all required fields filled', () => {
            const fields = workflowService.getWorkflowFormFields('hr_specialist', 'create_job_posting');

            if (fields) {
                const formData = {};
                fields.forEach(field => {
                    if (field.required) {
                        if (field.type === 'multiselect') {
                            formData[field.name] = [field.options?.[0] || 'test'];
                        } else if (field.type === 'select') {
                            formData[field.name] = field.options?.[0] || 'test';
                        } else {
                            formData[field.name] = 'Test value';
                        }
                    }
                });

                const result = workflowService.validateFormData('hr_specialist', 'create_job_posting', formData);
                expect(result.valid).toBe(true);
                expect(result.errors.length).toBe(0);
            }
        });

        test('should return valid for workflow without form', () => {
            const result = workflowService.validateFormData('lucide_assistant', 'fake', {});
            expect(result.valid).toBe(true);
        });
    });

    // ==========================================
    // Section 6: Document Enhancer
    // ==========================================
    describe('Document Enhancer', () => {
        test('should identify document-generating workflows', () => {
            expect(workflowDocumentEnhancer.shouldGenerateDocument('create_job_posting')).toBe(true);
            expect(workflowDocumentEnhancer.shouldGenerateDocument('pitch_deck_creation')).toBe(true);
            expect(workflowDocumentEnhancer.shouldGenerateDocument('strategic_okrs')).toBe(true);
        });

        test('should return document config for known workflows', () => {
            const config = workflowDocumentEnhancer.getDocumentConfig('create_job_posting');
            expect(config).toBeDefined();
            expect(config.type).toBeDefined();
            expect(config.defaultTitle).toBeDefined();
        });

        test('should enhance prompt with document instructions', () => {
            const originalPrompt = 'Create a job posting for Senior Developer';
            const enhanced = workflowDocumentEnhancer.enhancePrompt('create_job_posting', originalPrompt, {});

            expect(enhanced).toContain(originalPrompt);
            expect(enhanced).toContain('DOCUMENT');
            expect(enhanced).toContain('markdown');
        });

        test('should not enhance prompt for non-document workflows', () => {
            const originalPrompt = 'Some random prompt';
            const enhanced = workflowDocumentEnhancer.enhancePrompt('non_document_workflow', originalPrompt, {});

            expect(enhanced).toBe(originalPrompt);
        });

        test('should extract title from form data', () => {
            const config = workflowDocumentEnhancer.getDocumentConfig('create_job_posting');
            const enhanced = workflowDocumentEnhancer.enhancePrompt('create_job_posting', 'Test', {
                jobTitle: 'CTO Position'
            });

            expect(enhanced).toContain('CTO Position');
        });

        test('should have stats about document workflows', () => {
            const stats = workflowDocumentEnhancer.getStats();
            expect(stats.totalWorkflows).toBeGreaterThan(0);
            expect(stats.documentTypes).toBeGreaterThan(0);
            expect(Array.isArray(stats.types)).toBe(true);
        });
    });

    // ==========================================
    // Section 7: Workflows with Forms Count
    // ==========================================
    describe('Workflows with Forms', () => {
        test('should have 28 workflows with forms', () => {
            let count = 0;
            for (const profileId of Object.keys(WORKFLOW_TEMPLATES)) {
                const workflows = WORKFLOW_TEMPLATES[profileId];
                count += Object.values(workflows).filter(w => w.hasForm).length;
            }
            expect(count).toBe(28);
        });

        test('all workflows with hasForm should have formFields', () => {
            for (const profileId of Object.keys(WORKFLOW_TEMPLATES)) {
                const workflows = WORKFLOW_TEMPLATES[profileId];
                for (const [workflowId, workflow] of Object.entries(workflows)) {
                    if (workflow.hasForm) {
                        expect(workflow.formFields).toBeDefined();
                        expect(Array.isArray(workflow.formFields)).toBe(true);
                        expect(workflow.formFields.length).toBeGreaterThan(0);
                    }
                }
            }
        });
    });

    // ==========================================
    // Section 8: Specific Workflow Tests (Documentation)
    // ==========================================
    describe('Documented Workflows', () => {
        test('HR: create_job_posting should exist with form', () => {
            const workflow = workflowService.getWorkflow('hr_specialist', 'create_job_posting');
            expect(workflow).toBeDefined();
            expect(workflow.hasForm).toBe(true);
            expect(workflow.formFields.length).toBeGreaterThan(0);
        });

        test('HR: onboarding_plan should exist', () => {
            const workflow = workflowService.getWorkflow('hr_specialist', 'onboarding_plan');
            expect(workflow).toBeDefined();
        });

        test('CEO: pitch_deck_creation should exist with form', () => {
            const workflow = workflowService.getWorkflow('ceo_advisor', 'pitch_deck_creation');
            expect(workflow).toBeDefined();
            expect(workflow.hasForm).toBe(true);
        });

        test('CEO: investor_quarterly_report should exist', () => {
            const workflow = workflowService.getWorkflow('ceo_advisor', 'investor_quarterly_report');
            expect(workflow).toBeDefined();
        });

        test('CEO: strategic_okrs should exist', () => {
            const workflow = workflowService.getWorkflow('ceo_advisor', 'strategic_okrs');
            expect(workflow).toBeDefined();
        });

        test('Marketing: create_campaign should exist with form', () => {
            const workflow = workflowService.getWorkflow('marketing_expert', 'create_campaign');
            expect(workflow).toBeDefined();
            expect(workflow.hasForm).toBe(true);
        });

        test('Sales: proposal_creation should exist with form', () => {
            const workflow = workflowService.getWorkflow('sales_expert', 'proposal_creation');
            expect(workflow).toBeDefined();
            expect(workflow.hasForm).toBe(true);
        });

        test('Manager: one_on_one_template should exist', () => {
            const workflow = workflowService.getWorkflow('manager_coach', 'one_on_one_template');
            expect(workflow).toBeDefined();
        });
    });
});
