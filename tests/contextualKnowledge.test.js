/**
 * Contextual Knowledge Test Suite
 *
 * Tests for the "Connaissance Contextuelle" feature:
 * - User context enrichment in prompts
 * - Onboarding data migration
 * - Profile-specific personalization
 *
 * Based on documented example: DRH with 12 years experience in 150-employee Series B company
 */

// Mock dependencies before importing
jest.mock('../src/features/common/services/userContextService', () => ({
    getContext: jest.fn()
}));

jest.mock('../src/features/common/services/conversationHistoryService', () => ({
    getMessagesForSession: jest.fn().mockResolvedValue([])
}));

jest.mock('../src/features/common/services/sqliteClient', () => ({
    getDb: jest.fn(),
    getDatabase: jest.fn()
}));

// Import after mocking
const promptEngineeringService = require('../src/features/common/services/promptEngineeringService');
const userContextService = require('../src/features/common/services/userContextService');

describe('Contextual Knowledge - Prompt Personalization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // Section 1: DRH Example from Documentation
    // ==========================================
    describe('DRH Profile Personalization (Documented Example)', () => {
        const drhContext = {
            job_role: 'DRH',
            job_function: 'HR',
            industry: 'Tech',
            industry_sub: 'SaaS',
            company_size: '150',
            company_stage: 'Série B',
            experience_years: 12,
            seniority: 'Senior (6-10 ans)',
            has_managed_team: 1,
            team_size: 8,
            current_challenges: ['Recrutement', 'Rétention', 'Gestion talents'],
            current_goals: ['Réduire turnover', 'Améliorer marque employeur'],
            preferred_tone: 'formal',
            preferred_format: 'structured'
        };

        test('should include job role in context section', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Comment améliorer la rétention des talents?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('DRH');
        });

        test('should include industry in context section', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Quelles sont les meilleures pratiques RH?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('Tech');
        });

        test('should include company size in context section', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Comment structurer mon département RH?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('150');
        });

        test('should include experience years in context section', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Conseils pour un DRH expérimenté?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('12');
        });

        test('should include team management info in context section', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Comment gérer mon équipe RH?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('équipe');
            expect(result.systemPrompt).toContain('8');
        });

        test('should include current challenges in context section', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Mes priorités RH?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('Recrutement');
        });

        test('should include current goals in context section (Phase 2 fix)', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Quels sont mes objectifs?',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('Objectifs actuels');
            expect(result.systemPrompt).toContain('Réduire turnover');
        });

        test('should include seniority in context section (Phase 2 fix)', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Question test',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('Séniorité');
        });

        test('should include formal tone preference', async () => {
            userContextService.getContext.mockReturnValue(drhContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Question test',
                profileId: 'hr_specialist',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('formel');
        });
    });

    // ==========================================
    // Section 2: CEO Profile with First-Time Founder
    // ==========================================
    describe('CEO Profile with First-Time Founder', () => {
        const ceoContext = {
            job_role: 'CEO',
            job_function: 'Executive',
            industry: 'FinTech',
            company_size: '25',
            company_stage: 'Seed',
            experience_years: 5,
            is_first_time_founder: 1,
            current_challenges: ['Levée de fonds', 'Croissance'],
            current_goals: ['Atteindre PMF', 'Lever Série A']
        };

        test('should include first-time founder status', async () => {
            userContextService.getContext.mockReturnValue(ceoContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Comment lever ma première levée de fonds?',
                profileId: 'ceo_advisor',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('First-time founder');
        });

        test('should include company stage', async () => {
            userContextService.getContext.mockReturnValue(ceoContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Question stratégique',
                profileId: 'ceo_advisor',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('Seed');
        });
    });

    // ==========================================
    // Section 3: IT Expert with Tech Stack
    // ==========================================
    describe('IT Expert Profile with Tech Stack', () => {
        const itContext = {
            job_role: 'Senior Developer',
            job_function: 'Engineering',
            industry: 'SaaS',
            experience_years: 8,
            seniority: 'Senior (6-10 ans)',
            preferred_frameworks: ['React', 'Node.js', 'TypeScript'],
            current_challenges: ['Backend', 'DevOps'],
            technical_level: 'advanced'
        };

        test('should include preferred frameworks', async () => {
            userContextService.getContext.mockReturnValue(itContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Comment optimiser mon code?',
                profileId: 'it_expert',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('React');
            expect(result.systemPrompt).toContain('Node.js');
        });

        test('should include technical level', async () => {
            userContextService.getContext.mockReturnValue(itContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Architecture question',
                profileId: 'it_expert',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('advanced');
        });
    });

    // ==========================================
    // Section 4: Manager with Domain Knowledge
    // ==========================================
    describe('Manager Profile with Domain Knowledge', () => {
        const managerContext = {
            job_role: 'Engineering Manager',
            job_function: 'Management',
            industry: 'Tech',
            has_managed_team: 1,
            team_size: 12,
            seniority: 'Senior manager',
            current_challenges: ['Performance', 'Développement'],
            domain_knowledge: {
                'Agile': 'expert',
                'Scrum': 'advanced',
                'Kanban': 'intermediate'
            }
        };

        test('should include domain knowledge (Phase 2 fix)', async () => {
            userContextService.getContext.mockReturnValue(managerContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Comment améliorer la vélocité de mon équipe?',
                profileId: 'manager_coach',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('Expertise domaine');
            expect(result.systemPrompt).toContain('Agile');
        });

        test('should include team management with size', async () => {
            userContextService.getContext.mockReturnValue(managerContext);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Conseils pour mon équipe?',
                profileId: 'manager_coach',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toContain('manage');
            expect(result.systemPrompt).toContain('12');
        });
    });

    // ==========================================
    // Section 5: Empty Context Handling
    // ==========================================
    describe('Empty Context Handling', () => {
        test('should handle null context gracefully', async () => {
            userContextService.getContext.mockReturnValue(null);

            const result = await promptEngineeringService.generatePrompt({
                question: 'Simple question',
                profileId: 'lucide_assistant',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toBeDefined();
            expect(result.systemPrompt).not.toContain('Contexte Utilisateur');
        });

        test('should handle empty context object gracefully', async () => {
            userContextService.getContext.mockReturnValue({});

            const result = await promptEngineeringService.generatePrompt({
                question: 'Simple question',
                profileId: 'lucide_assistant',
                uid: 'test_user'
            });

            expect(result.systemPrompt).toBeDefined();
        });
    });

    // ==========================================
    // Section 6: buildContextSection Direct Tests
    // ==========================================
    describe('buildContextSection Method', () => {
        test('should build complete context section with all fields', () => {
            const fullContext = {
                job_role: 'Product Manager',
                industry: 'E-commerce',
                industry_sub: 'B2C',
                company_size: '500',
                company_stage: 'Croissance',
                experience_years: 7,
                seniority: 'Senior',
                has_managed_team: 1,
                team_size: 5,
                current_challenges: ['Roadmap', 'Prioritization'],
                current_goals: ['Lancer v2', 'Augmenter NPS'],
                preferred_frameworks: ['Scrum', 'OKR'],
                domain_knowledge: { 'Product': 'expert' },
                preferred_tone: 'direct',
                preferred_format: 'bullet_points'
            };

            const contextSection = promptEngineeringService.buildContextSection(fullContext);

            expect(contextSection).toContain('Product Manager');
            expect(contextSection).toContain('E-commerce');
            expect(contextSection).toContain('500');
            expect(contextSection).toContain('7');
            expect(contextSection).toContain('Séniorité');
            expect(contextSection).toContain('équipe de 5');
            expect(contextSection).toContain('Objectifs actuels');
            expect(contextSection).toContain('Expertise domaine');
            expect(contextSection).toContain('direct');
        });
    });
});
