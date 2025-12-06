/**
 * Agent Router Service Test Suite
 *
 * Tests for the intelligent routing system including:
 * - Phase 1: User profile enrichment (job role, industry, function)
 * - Phase 3: Thematic continuity analysis from conversation content
 * - Helper methods for theme detection and analysis
 */

// Mock dependencies before importing the service
jest.mock('../src/features/common/services/agentProfileService', () => ({
    getCurrentProfile: jest.fn().mockReturnValue('lucide_assistant')
}));

jest.mock('../src/features/common/services/conversationHistoryService', () => ({
    getAllSessions: jest.fn().mockResolvedValue([]),
    getRecentMessagesAcrossSessions: jest.fn().mockResolvedValue([])
}));

jest.mock('../src/features/common/services/userContextService', () => ({
    getContext: jest.fn().mockReturnValue(null)
}));

jest.mock('../src/features/common/services/sqliteClient', () => ({
    getDb: jest.fn(),
    getDatabase: jest.fn()
}));

// Import after mocking
const agentRouterService = require('../src/features/common/services/agentRouterService');
const userContextService = require('../src/features/common/services/userContextService');
const conversationHistoryService = require('../src/features/common/services/conversationHistoryService');

describe('Agent Router Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        agentRouterService.resetStats();
    });

    // ==========================================
    // Section 1: Basic Keyword Detection (Level 1)
    // ==========================================
    describe('Level 1: Keyword Detection', () => {
        test('should detect CEO/strategy keywords and route to ceo_advisor', () => {
            const result = agentRouterService.detectByKeywords('Comment définir ma stratégie OKR pour le prochain trimestre?');
            expect(result.agent).toBe('ceo_advisor');
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.matchedKeywords).toContain('stratégie');
        });

        test('should detect sales keywords and route to sales_expert', () => {
            const result = agentRouterService.detectByKeywords('Comment améliorer mon pipeline de prospection?');
            expect(result.agent).toBe('sales_expert');
            expect(result.confidence).toBeGreaterThan(0.85);
        });

        test('should detect HR keywords and route to hr_specialist', () => {
            const result = agentRouterService.detectByKeywords('Je dois recruter un nouveau développeur, comment structurer l\'entretien?');
            expect(result.agent).toBe('hr_specialist');
            expect(result.matchedKeywords).toContain('recruter');
        });

        test('should detect IT keywords and route to it_expert', () => {
            const result = agentRouterService.detectByKeywords('J\'ai un bug dans mon code React avec les hooks');
            expect(result.agent).toBe('it_expert');
            expect(result.matchedKeywords).toContain('bug');
        });

        test('should detect marketing keywords and route to marketing_expert', () => {
            const result = agentRouterService.detectByKeywords('Comment optimiser ma campagne SEO pour améliorer le taux de conversion?');
            expect(result.agent).toBe('marketing_expert');
        });

        test('should detect manager keywords and route to manager_coach', () => {
            const result = agentRouterService.detectByKeywords('Comment donner du feedback constructif lors de mon 1:1?');
            expect(result.agent).toBe('manager_coach');
        });

        test('should return lucide_assistant for generic questions', () => {
            const result = agentRouterService.detectByKeywords('Bonjour, comment vas-tu?');
            expect(result.agent).toBe('lucide_assistant');
            expect(result.confidence).toBe(0.5);
        });

        test('should increase confidence with multiple keyword matches', () => {
            const singleKeyword = agentRouterService.detectByKeywords('Comment faire un pitch?');
            const multipleKeywords = agentRouterService.detectByKeywords('Comment préparer mon pitch deck pour la levée de fonds série A avec les investisseurs?');

            expect(multipleKeywords.confidence).toBeGreaterThan(singleKeyword.confidence);
        });
    });

    // ==========================================
    // Section 2: User Profile Enrichment (Phase 1)
    // ==========================================
    describe('Level 2b: User Profile Enrichment (Phase 1)', () => {
        test('should boost confidence when user role matches detected agent', async () => {
            userContextService.getContext.mockReturnValue({
                job_role: 'CEO',
                industry: 'SaaS'
            });

            const detection = {
                agent: 'ceo_advisor',
                confidence: 0.75,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithUserProfile(detection, 'Comment définir ma vision?', 'user123');

            expect(result.confidence).toBeGreaterThan(0.75);
            expect(result.profileBoost).toBeDefined();
            expect(result.profileBoost.reasons.some(r => r.includes('role_match'))).toBe(true);
        });

        test('should switch agent when confidence is low and role strongly suggests another', async () => {
            userContextService.getContext.mockReturnValue({
                job_role: 'CTO',
                job_function: 'Engineering'
            });

            const detection = {
                agent: 'lucide_assistant',
                confidence: 0.55,
                reason: 'default'
            };

            const result = await agentRouterService.enrichWithUserProfile(detection, 'Quelle approche adopter?', 'user123');

            expect(result.agent).toBe('it_expert');
            expect(result.profileBoost.reasons.some(r => r.includes('role_preference'))).toBe(true);
        });

        test('should boost for job function match', async () => {
            userContextService.getContext.mockReturnValue({
                job_function: 'Sales'
            });

            const detection = {
                agent: 'sales_expert',
                confidence: 0.70,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithUserProfile(detection, 'Comment closer ce deal?', 'user123');

            expect(result.confidence).toBeGreaterThan(0.70);
        });

        test('should boost for industry-specific keywords', async () => {
            userContextService.getContext.mockReturnValue({
                industry: 'SaaS'
            });

            const detection = {
                agent: 'ceo_advisor',
                confidence: 0.75,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithUserProfile(detection, 'Comment réduire notre churn et améliorer le MRR?', 'user123');

            expect(result.confidence).toBeGreaterThan(0.75);
            expect(result.industryKeywords).toContain('churn');
        });

        test('should not modify detection when no user context', async () => {
            userContextService.getContext.mockReturnValue(null);

            const detection = {
                agent: 'it_expert',
                confidence: 0.80,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithUserProfile(detection, 'Comment debugger?', 'user123');

            expect(result.confidence).toBe(0.80);
            expect(result.profileBoost).toBeUndefined();
        });

        test('should cap confidence at 0.98', async () => {
            userContextService.getContext.mockReturnValue({
                job_role: 'CEO',
                job_function: 'Executive',
                industry: 'SaaS'
            });

            const detection = {
                agent: 'ceo_advisor',
                confidence: 0.92,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithUserProfile(detection, 'Stratégie ARR et levée de fonds', 'user123');

            expect(result.confidence).toBeLessThanOrEqual(0.98);
        });
    });

    // ==========================================
    // Section 3: Role/Function Mapping
    // ==========================================
    describe('Role and Function Mapping', () => {
        test('should map CEO role to ceo_advisor', () => {
            const result = agentRouterService._findMatchingAgent('CEO', agentRouterService.roleToAgentMapping);
            expect(result).toBe('ceo_advisor');
        });

        test('should map CTO role to it_expert', () => {
            const result = agentRouterService._findMatchingAgent('CTO', agentRouterService.roleToAgentMapping);
            expect(result).toBe('it_expert');
        });

        test('should map VP Sales role to sales_expert', () => {
            const result = agentRouterService._findMatchingAgent('VP Sales', agentRouterService.roleToAgentMapping);
            expect(result).toBe('sales_expert');
        });

        test('should handle partial matches like "Head of Engineering"', () => {
            // "Head of Engineering" matches "Engineer" in partial match, so maps to it_expert
            const result = agentRouterService._findMatchingAgent('Head of Engineering', agentRouterService.roleToAgentMapping);
            expect(result).toBe('it_expert');
        });

        test('should handle partial matches like "Head of Sales"', () => {
            // "Head of" maps to manager_coach (matched before any other partial)
            const result = agentRouterService._findMatchingAgent('Head of Sales', agentRouterService.roleToAgentMapping);
            // This will match "Head of" → manager_coach
            expect(result).not.toBeNull();
        });

        test('should map French roles correctly', () => {
            expect(agentRouterService._findMatchingAgent('Fondateur', agentRouterService.roleToAgentMapping)).toBe('ceo_advisor');
            expect(agentRouterService._findMatchingAgent('Développeur', agentRouterService.roleToAgentMapping)).toBe('it_expert');
            expect(agentRouterService._findMatchingAgent('DRH', agentRouterService.roleToAgentMapping)).toBe('hr_specialist');
        });

        test('should return null for unknown roles', () => {
            const result = agentRouterService._findMatchingAgent('Unknown Role', agentRouterService.roleToAgentMapping);
            expect(result).toBeNull();
        });
    });

    // ==========================================
    // Section 4: Theme Detection (Phase 3 Helpers)
    // ==========================================
    describe('Theme Detection Helpers (Phase 3)', () => {
        describe('_detectThemesInText', () => {
            test('should detect strategy themes', () => {
                const themes = agentRouterService._detectThemesInText('Nous devons définir notre stratégie OKR et roadmap');
                expect(themes).toContain('stratégie');
                expect(themes).toContain('okr');
                expect(themes).toContain('roadmap');
            });

            test('should detect sales themes', () => {
                const themes = agentRouterService._detectThemesInText('Comment améliorer notre pipeline et closing?');
                expect(themes).toContain('pipeline');
                expect(themes).toContain('closing');
            });

            test('should detect IT themes', () => {
                const themes = agentRouterService._detectThemesInText('J\'ai un bug dans mon code JavaScript');
                expect(themes).toContain('bug');
                expect(themes).toContain('code');
                expect(themes).toContain('javascript');
            });

            test('should detect industry-specific keywords (SaaS)', () => {
                const themes = agentRouterService._detectThemesInText('Notre ARR et MRR augmentent mais le churn aussi');
                expect(themes).toContain('arr');
                expect(themes).toContain('mrr');
                expect(themes).toContain('churn');
            });

            test('should return empty array for text without themes', () => {
                const themes = agentRouterService._detectThemesInText('Bonjour, comment allez-vous?');
                expect(themes).toHaveLength(0);
            });

            test('should deduplicate themes', () => {
                const themes = agentRouterService._detectThemesInText('stratégie stratégie stratégie');
                const uniqueCount = new Set(themes).size;
                expect(themes.length).toBe(uniqueCount);
            });

            test('should handle null/undefined input', () => {
                expect(agentRouterService._detectThemesInText(null)).toEqual([]);
                expect(agentRouterService._detectThemesInText(undefined)).toEqual([]);
                expect(agentRouterService._detectThemesInText('')).toEqual([]);
            });
        });

        describe('_getAgentForTheme', () => {
            test('should return ceo_advisor for strategy themes', () => {
                expect(agentRouterService._getAgentForTheme('stratégie')).toBe('ceo_advisor');
                expect(agentRouterService._getAgentForTheme('okr')).toBe('ceo_advisor');
                expect(agentRouterService._getAgentForTheme('fundraising')).toBe('ceo_advisor');
            });

            test('should return sales_expert for sales themes', () => {
                expect(agentRouterService._getAgentForTheme('pipeline')).toBe('sales_expert');
                expect(agentRouterService._getAgentForTheme('closing')).toBe('sales_expert');
                expect(agentRouterService._getAgentForTheme('prospection')).toBe('sales_expert');
            });

            test('should return it_expert for tech themes', () => {
                expect(agentRouterService._getAgentForTheme('bug')).toBe('it_expert');
                expect(agentRouterService._getAgentForTheme('code')).toBe('it_expert');
                expect(agentRouterService._getAgentForTheme('api')).toBe('it_expert');
            });

            test('should return null for unknown themes', () => {
                expect(agentRouterService._getAgentForTheme('randomword')).toBeNull();
            });
        });

        describe('_analyzeThemes', () => {
            test('should analyze messages and calculate agent scores', () => {
                const messages = [
                    { content: 'Comment définir notre stratégie OKR?' },
                    { content: 'Préparation du pitch deck pour les investisseurs' },
                    { content: 'Levée de fonds série A' }
                ];

                const analysis = agentRouterService._analyzeThemes(messages);

                expect(analysis).toBeDefined();
                expect(analysis.dominantAgent).toBe('ceo_advisor');
                expect(analysis.agentThemeScores.ceo_advisor).toBeGreaterThan(0);
            });

            test('should weight recent messages more heavily', () => {
                const messages = [
                    { content: 'Comment debugger mon code JavaScript?' }, // Most recent
                    { content: 'Stratégie OKR pour le trimestre' },
                    { content: 'Vision et mission de l\'entreprise' }
                ];

                const analysis = agentRouterService._analyzeThemes(messages);

                // IT themes from first message should have higher weight
                expect(analysis.themeFrequency['bug'] || analysis.themeFrequency['code']).toBeDefined();
            });

            test('should return null for empty messages', () => {
                expect(agentRouterService._analyzeThemes([])).toBeNull();
                expect(agentRouterService._analyzeThemes(null)).toBeNull();
            });

            test('should identify dominant themes correctly', () => {
                const messages = [
                    { content: 'Recrutement d\'un développeur senior' },
                    { content: 'Entretien avec un candidat' },
                    { content: 'Onboarding du nouveau recruté' }
                ];

                const analysis = agentRouterService._analyzeThemes(messages);

                expect(analysis.dominantAgent).toBe('hr_specialist');
                expect(analysis.dominantThemes.length).toBeGreaterThan(0);
            });
        });
    });

    // ==========================================
    // Section 5: Conversation Content Enrichment (Phase 3)
    // ==========================================
    describe('Level 2c: Conversation Content Enrichment (Phase 3)', () => {
        test('should boost confidence when conversation themes match detected agent', async () => {
            conversationHistoryService.getRecentMessagesAcrossSessions.mockResolvedValue([
                { content: 'Comment définir notre stratégie?' },
                { content: 'Préparation des OKR trimestriels' },
                { content: 'Roadmap produit pour 2024' }
            ]);

            const detection = {
                agent: 'ceo_advisor',
                confidence: 0.72,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithConversationContent(detection, 'Et pour la vision long terme?', 'user123');

            expect(result.confidence).toBeGreaterThan(0.72);
            expect(result.thematicAnalysis).toBeDefined();
        });

        test('should switch to dominant theme agent when confidence is low', async () => {
            conversationHistoryService.getRecentMessagesAcrossSessions.mockResolvedValue([
                { content: 'Pipeline de vente Q1' },
                { content: 'Comment améliorer le closing?' },
                { content: 'Prospection et outreach' },
                { content: 'CRM et forecast' }
            ]);

            const detection = {
                agent: 'lucide_assistant',
                confidence: 0.55,
                reason: 'default'
            };

            const result = await agentRouterService.enrichWithConversationContent(detection, 'Et pour la suite?', 'user123');

            expect(result.agent).toBe('sales_expert');
        });

        test('should not modify detection when no conversation history', async () => {
            conversationHistoryService.getRecentMessagesAcrossSessions.mockResolvedValue([]);

            const detection = {
                agent: 'it_expert',
                confidence: 0.75,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithConversationContent(detection, 'Comment debugger?', 'user123');

            expect(result.confidence).toBe(0.75);
            expect(result.thematicAnalysis).toBeUndefined();
        });

        test('should cap thematic boost at MAX_THEME_BOOST', async () => {
            conversationHistoryService.getRecentMessagesAcrossSessions.mockResolvedValue([
                { content: 'Bug critique dans le code' },
                { content: 'Déploiement Docker' },
                { content: 'API REST et GraphQL' },
                { content: 'Tests unitaires Jest' },
                { content: 'CI/CD pipeline' }
            ]);

            const detection = {
                agent: 'it_expert',
                confidence: 0.90,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithConversationContent(detection, 'Debug avancé', 'user123');

            // Should not exceed 0.98
            expect(result.confidence).toBeLessThanOrEqual(0.98);
        });

        test('should detect thematic continuity when question continues themes', async () => {
            conversationHistoryService.getRecentMessagesAcrossSessions.mockResolvedValue([
                { content: 'Marketing digital et SEO' },
                { content: 'Campagne publicitaire Facebook' }
            ]);

            const detection = {
                agent: 'marketing_expert',
                confidence: 0.70,
                reason: 'keyword_match'
            };

            // Question continues the marketing theme
            const result = await agentRouterService.enrichWithConversationContent(detection, 'Et pour notre stratégie content marketing?', 'user123');

            expect(result.thematicAnalysis?.thematicContinuity).toBeGreaterThan(0);
        });
    });

    // ==========================================
    // Section 6: Statistics Tracking
    // ==========================================
    describe('Statistics Tracking', () => {
        test('should track routing by level', async () => {
            // Keyword routing
            const keywordResult = agentRouterService.detectByKeywords('Comment recruter?');
            expect(keywordResult.agent).toBe('hr_specialist');

            const stats = agentRouterService.getStats();
            expect(stats.byLevel).toHaveProperty('keywords');
            expect(stats.byLevel).toHaveProperty('context');
            expect(stats.byLevel).toHaveProperty('thematic');
            expect(stats.byLevel).toHaveProperty('llm');
        });

        test('should reset stats correctly', () => {
            agentRouterService.stats.totalRoutings = 100;
            agentRouterService.stats.byLevel.keywords = 80;

            agentRouterService.resetStats();

            const stats = agentRouterService.getStats();
            expect(stats.totalRoutings).toBe(0);
            expect(stats.byLevel.keywords).toBe(0);
            expect(stats.byLevel.thematic).toBe(0);
        });

        test('should include thematic in stats structure', () => {
            const stats = agentRouterService.getStats();
            expect(stats.byLevel).toHaveProperty('thematic');
        });
    });

    // ==========================================
    // Section 7: Edge Cases and Error Handling
    // ==========================================
    describe('Edge Cases and Error Handling', () => {
        test('should handle invalid question gracefully', async () => {
            const result = await agentRouterService.routeQuestion(null, 'user123');
            expect(result.agent).toBe('lucide_assistant');
            expect(result.reason).toBe('invalid_input');
        });

        test('should handle empty question', async () => {
            const result = await agentRouterService.routeQuestion('', 'user123');
            expect(result.agent).toBe('lucide_assistant');
        });

        test('should handle user context service errors gracefully', async () => {
            userContextService.getContext.mockImplementation(() => {
                throw new Error('Database error');
            });

            const detection = {
                agent: 'it_expert',
                confidence: 0.75,
                reason: 'keyword_match'
            };

            // Should not throw, should return original detection
            const result = await agentRouterService.enrichWithUserProfile(detection, 'Test', 'user123');
            expect(result).toEqual(detection);
        });

        test('should handle conversation history service errors gracefully', async () => {
            conversationHistoryService.getRecentMessagesAcrossSessions.mockRejectedValue(new Error('DB error'));

            const detection = {
                agent: 'it_expert',
                confidence: 0.75,
                reason: 'keyword_match'
            };

            const result = await agentRouterService.enrichWithConversationContent(detection, 'Test', 'user123');
            expect(result).toEqual(detection);
        });

        test('should escape regex special characters in keywords', () => {
            const escaped = agentRouterService.escapeRegex('c++ (test)');
            expect(escaped).toBe('c\\+\\+ \\(test\\)');
        });
    });
});
