/**
 * User Profile Service Test Suite
 *
 * Tests for the user profile and onboarding functionality:
 * - needsOnboarding() logic
 * - Onboarding questions per profile (Phase 3 enrichment)
 * - Migration of onboarding data to user_context
 */

// Mock dependencies before importing
jest.mock('../src/features/common/repositories/userProfileRepository', () => ({
    getOrCreateProfile: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn()
}));

jest.mock('../src/features/common/services/agentProfileService', () => ({
    initialize: jest.fn(),
    getAvailableProfiles: jest.fn().mockReturnValue([]),
    setActiveProfile: jest.fn()
}));

jest.mock('../src/features/common/services/userContextService', () => ({
    saveContext: jest.fn(),
    getContext: jest.fn()
}));

jest.mock('../src/features/common/services/sqliteClient', () => ({
    getDb: jest.fn(),
    getDatabase: jest.fn()
}));

// Import after mocking
const userProfileService = require('../src/features/common/services/userProfileService');
const userContextService = require('../src/features/common/services/userContextService');

describe('User Profile Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset service state
        userProfileService.currentProfile = null;
        userProfileService.currentUid = null;
    });

    // ==========================================
    // Section 1: needsOnboarding() Logic
    // ==========================================
    describe('needsOnboarding()', () => {
        // Fix: Service must be initialized (currentUid set) for needsOnboarding to work
        test('should return false when service is not initialized (currentUid is null)', () => {
            userProfileService.currentUid = null;
            userProfileService.currentProfile = null;
            expect(userProfileService.needsOnboarding()).toBe(false);
        });

        test('should return true when currentProfile is null but service is initialized', () => {
            userProfileService.currentUid = 'test_user';
            userProfileService.currentProfile = null;
            expect(userProfileService.needsOnboarding()).toBe(true);
        });

        test('should return true when onboarding_completed is 0', () => {
            userProfileService.currentUid = 'test_user';
            userProfileService.currentProfile = { onboarding_completed: 0 };
            expect(userProfileService.needsOnboarding()).toBe(true);
        });

        test('should return true when onboarding_completed is undefined', () => {
            userProfileService.currentUid = 'test_user';
            userProfileService.currentProfile = {};
            expect(userProfileService.needsOnboarding()).toBe(true);
        });

        test('should return false when onboarding_completed is 1', () => {
            userProfileService.currentUid = 'test_user';
            userProfileService.currentProfile = { onboarding_completed: 1 };
            expect(userProfileService.needsOnboarding()).toBe(false);
        });
    });

    // ==========================================
    // Section 1b: isInitialized() Logic (new)
    // ==========================================
    describe('isInitialized()', () => {
        test('should return false when currentUid is null', () => {
            userProfileService.currentUid = null;
            expect(userProfileService.isInitialized()).toBe(false);
        });

        test('should return true when currentUid is set', () => {
            userProfileService.currentUid = 'test_user';
            expect(userProfileService.isInitialized()).toBe(true);
        });
    });

    // ==========================================
    // Section 2: Onboarding Questions (Phase 3)
    // ==========================================
    describe('getOnboardingQuestions() - Phase 3 Enrichment', () => {

        describe('lucide_assistant profile', () => {
            test('should include industry question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('lucide_assistant');
                const industryQ = questions.find(q => q.id === 'industry');
                expect(industryQ).toBeDefined();
                expect(industryQ.type).toBe('text');
            });

            test('should include experience_level question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('lucide_assistant');
                const expQ = questions.find(q => q.id === 'experience_level');
                expect(expQ).toBeDefined();
                expect(expQ.type).toBe('select');
            });

            test('should have 4 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('lucide_assistant');
                expect(questions.length).toBe(4);
            });
        });

        describe('hr_specialist profile', () => {
            test('should include team_size question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('hr_specialist');
                const teamQ = questions.find(q => q.id === 'team_size');
                expect(teamQ).toBeDefined();
                expect(teamQ.question).toContain('équipe RH');
            });

            test('should include experience_level question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('hr_specialist');
                const expQ = questions.find(q => q.id === 'experience_level');
                expect(expQ).toBeDefined();
            });

            test('should have 5 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('hr_specialist');
                expect(questions.length).toBe(5);
            });
        });

        describe('it_expert profile', () => {
            test('should include industry question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('it_expert');
                const industryQ = questions.find(q => q.id === 'industry');
                expect(industryQ).toBeDefined();
            });

            test('should have 4 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('it_expert');
                expect(questions.length).toBe(4);
            });
        });

        describe('marketing_expert profile', () => {
            test('should include experience_level question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('marketing_expert');
                const expQ = questions.find(q => q.id === 'experience_level');
                expect(expQ).toBeDefined();
            });

            test('should include industry question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('marketing_expert');
                const industryQ = questions.find(q => q.id === 'industry');
                expect(industryQ).toBeDefined();
            });

            test('should have 5 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('marketing_expert');
                expect(questions.length).toBe(5);
            });
        });

        describe('ceo_advisor profile', () => {
            test('should include is_first_time_founder question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('ceo_advisor');
                const founderQ = questions.find(q => q.id === 'is_first_time_founder');
                expect(founderQ).toBeDefined();
                expect(founderQ.options).toContain('Oui, première fois');
            });

            test('should have 5 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('ceo_advisor');
                expect(questions.length).toBe(5);
            });
        });

        describe('sales_expert profile', () => {
            test('should include experience_level question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('sales_expert');
                const expQ = questions.find(q => q.id === 'experience_level');
                expect(expQ).toBeDefined();
            });

            test('should include industry question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('sales_expert');
                const industryQ = questions.find(q => q.id === 'industry');
                expect(industryQ).toBeDefined();
            });

            test('should have 6 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('sales_expert');
                expect(questions.length).toBe(6);
            });
        });

        describe('manager_coach profile', () => {
            test('should include industry question (Phase 3 addition)', () => {
                const questions = userProfileService.getOnboardingQuestions('manager_coach');
                const industryQ = questions.find(q => q.id === 'industry');
                expect(industryQ).toBeDefined();
            });

            test('should have 5 questions total', () => {
                const questions = userProfileService.getOnboardingQuestions('manager_coach');
                expect(questions.length).toBe(5);
            });
        });

        describe('fallback behavior', () => {
            test('should return lucide_assistant questions for unknown profile', () => {
                const questions = userProfileService.getOnboardingQuestions('unknown_profile');
                const lucideQuestions = userProfileService.getOnboardingQuestions('lucide_assistant');
                expect(questions).toEqual(lucideQuestions);
            });
        });
    });

    // ==========================================
    // Section 3: Question Structure Validation
    // ==========================================
    describe('Question Structure Validation', () => {
        const allProfiles = [
            'lucide_assistant', 'hr_specialist', 'it_expert',
            'marketing_expert', 'ceo_advisor', 'sales_expert', 'manager_coach'
        ];

        allProfiles.forEach(profileId => {
            describe(`${profileId} questions`, () => {
                test('each question should have id, question, and type', () => {
                    const questions = userProfileService.getOnboardingQuestions(profileId);
                    questions.forEach(q => {
                        expect(q.id).toBeDefined();
                        expect(q.question).toBeDefined();
                        expect(q.type).toBeDefined();
                        expect(['text', 'select', 'multiselect']).toContain(q.type);
                    });
                });

                test('select/multiselect questions should have options', () => {
                    const questions = userProfileService.getOnboardingQuestions(profileId);
                    questions.filter(q => q.type === 'select' || q.type === 'multiselect')
                        .forEach(q => {
                            expect(q.options).toBeDefined();
                            expect(Array.isArray(q.options)).toBe(true);
                            expect(q.options.length).toBeGreaterThan(0);
                        });
                });
            });
        });
    });

    // ==========================================
    // Section 4: Total Questions Count Summary
    // ==========================================
    describe('Questions Count Summary', () => {
        test('should have correct total questions per profile after Phase 3', () => {
            const expectedCounts = {
                lucide_assistant: 4,  // +2 from Phase 3
                hr_specialist: 5,     // +2 from Phase 3
                it_expert: 4,         // +1 from Phase 3
                marketing_expert: 5,  // +2 from Phase 3
                ceo_advisor: 5,       // +1 from Phase 3
                sales_expert: 6,      // +2 from Phase 3
                manager_coach: 5      // +1 from Phase 3
            };

            Object.entries(expectedCounts).forEach(([profileId, expectedCount]) => {
                const questions = userProfileService.getOnboardingQuestions(profileId);
                expect(questions.length).toBe(expectedCount);
            });
        });
    });
});
