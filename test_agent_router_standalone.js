#!/usr/bin/env node
/**
 * Standalone Test Suite for Agent Router Service - Phase 1
 * This version doesn't require full database setup
 *
 * Run with: node test_agent_router_standalone.js
 */

// Test utilities
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('\n🧪 AGENT ROUTER SERVICE - STANDALONE TEST SUITE\n');
        console.log('═'.repeat(60));

        for (const test of this.tests) {
            try {
                console.log(`\n▶ ${test.name}`);
                await test.fn();
                console.log(`  ✅ PASSED`);
                this.passed++;
            } catch (error) {
                console.log(`  ❌ FAILED: ${error.message}`);
                if (process.env.VERBOSE) {
                    console.error(error.stack);
                }
                this.failed++;
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('\n📊 TEST RESULTS:');
        console.log(`   Passed: ${this.passed}`);
        console.log(`   Failed: ${this.failed}`);
        console.log(`   Total:  ${this.tests.length}`);

        if (this.failed === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log('\n⚠️  Some tests failed.');
            process.exit(1);
        }
    }
}

// Simplified Router (mimics the real one without DB dependencies)
class SimpleAgentRouter {
    constructor() {
        this.routingRules = [
            {
                agent: 'hr_specialist',
                keywords: [
                    'recruter', 'recrutement', 'cv', 'curriculum', 'candidat', 'candidature',
                    'entretien', 'embauche', 'embaucher', 'contrat', 'cdi', 'cdd', 'salaire', 'rémunération',
                    'congé', 'congés', 'employé', 'employés', 'rh', 'ressources humaines',
                    'formation', 'onboarding', 'licenciement', 'démission', 'paie',
                    'talent', 'talents', 'poste', 'offre d\'emploi',
                    'recruit', 'recruitment', 'resume', 'candidate', 'interview',
                    'hire', 'hiring', 'contract', 'salary', 'compensation', 'leave',
                    'employee', 'hr', 'human resources', 'training', 'job', 'position', 'talent'
                ],
                confidence: 0.9
            },
            {
                agent: 'it_expert',
                keywords: [
                    'bug', 'bogue', 'erreur', 'code', 'fonction', 'variable', 'class',
                    'debug', 'debugger', 'api', 'endpoint', 'serveur', 'server', 'base de données',
                    'bdd', 'database', 'sql', 'query', 'requête', 'react', 'vue', 'angular',
                    'javascript', 'typescript', 'python', 'java', 'php', 'ruby', 'go', 'rust',
                    'développement', 'développer', 'coder', 'programmer', 'git', 'github',
                    'deploy', 'déploiement', 'docker', 'kubernetes', 'error', 'development'
                ],
                confidence: 0.85
            },
            {
                agent: 'marketing_expert',
                keywords: [
                    'campagne', 'marketing', 'publicité', 'pub', 'contenu', 'content',
                    'seo', 'référencement', 'social media', 'réseaux sociaux', 'email', 'newsletter',
                    'client', 'clients', 'prospect', 'prospects', 'lead', 'leads',
                    'stratégie', 'strategy', 'brand', 'marque', 'branding',
                    'conversion', 'conversions', 'funnel', 'analytics', 'engagement', 'campaign', 'advertising',
                    'roi', 'ads', 'ad', 'annonce', 'annonces', 'landing page'
                ],
                confidence: 0.85
            }
        ];
    }

    async routeQuestion(question) {
        if (!question || typeof question !== 'string') {
            return {
                agent: 'lucide_assistant',
                confidence: 1.0,
                reason: 'invalid_input'
            };
        }

        const lower = question.toLowerCase();
        let bestMatch = {
            agent: 'lucide_assistant',
            confidence: 0.5,
            reason: 'default',
            matchedKeywords: []
        };

        for (const rule of this.routingRules) {
            const matchedKeywords = rule.keywords.filter(keyword => {
                const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
                return regex.test(lower);
            });

            if (matchedKeywords.length > 0) {
                const confidence = Math.min(0.95, rule.confidence + (matchedKeywords.length - 1) * 0.05);

                if (confidence > bestMatch.confidence) {
                    bestMatch = {
                        agent: rule.agent,
                        confidence,
                        reason: 'keyword_match',
                        matchedKeywords: matchedKeywords.slice(0, 5)
                    };
                }
            }
        }

        return bestMatch;
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Assertion helpers
function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}\n  Expected: ${expected}\n  Actual:   ${actual}`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertGreaterThan(actual, threshold, message) {
    if (actual <= threshold) {
        throw new Error(`${message}\n  Expected > ${threshold}\n  Actual:    ${actual}`);
    }
}

// Initialize
const router = new SimpleAgentRouter();
const runner = new TestRunner();

// ==============================================================================
// LEVEL 1 TESTS: Keyword Detection
// ==============================================================================

runner.test('Level 1: Should detect HR questions (French)', async () => {
    const result = await router.routeQuestion('Comment recruter un développeur senior ?');

    assertEquals(result.agent, 'hr_specialist', 'Should route to HR specialist');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
    assertTrue(result.matchedKeywords?.includes('recruter'), 'Should match "recruter" keyword');
});

runner.test('Level 1: Should detect HR questions (English)', async () => {
    const result = await router.routeQuestion('How to write a job contract for new employee?');

    assertEquals(result.agent, 'hr_specialist', 'Should route to HR specialist');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect IT questions (French)', async () => {
    const result = await router.routeQuestion('J\'ai un bug dans mon code React, la fonction useEffect ne marche pas');

    assertEquals(result.agent, 'it_expert', 'Should route to IT expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect IT questions (English)', async () => {
    const result = await router.routeQuestion('My API endpoint returns 500 error, how to debug this?');

    assertEquals(result.agent, 'it_expert', 'Should route to IT expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect Marketing questions (French)', async () => {
    const result = await router.routeQuestion('Comment améliorer le taux de conversion de notre landing page ?');

    assertEquals(result.agent, 'marketing_expert', 'Should route to Marketing expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect Marketing questions (English)', async () => {
    const result = await router.routeQuestion('What are the best strategies for social media engagement?');

    assertEquals(result.agent, 'marketing_expert', 'Should route to Marketing expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should use default for general questions', async () => {
    const result = await router.routeQuestion('Quelle est la capitale de la France ?');

    assertEquals(result.agent, 'lucide_assistant', 'Should route to general assistant');
});

// ==============================================================================
// MULTI-KEYWORD TESTS
// ==============================================================================

runner.test('Level 1: Should increase confidence with multiple keywords', async () => {
    const result = await router.routeQuestion('Je cherche à recruter un candidat pour un poste RH avec contrat CDI');

    assertEquals(result.agent, 'hr_specialist', 'Should route to HR specialist');
    assertGreaterThan(result.confidence, 0.9, 'Confidence should be very high with multiple keywords');
    assertTrue(result.matchedKeywords?.length >= 3, 'Should match multiple keywords');
});

runner.test('Level 1: Should handle mixed domain keywords', async () => {
    const result = await router.routeQuestion('Notre développeur a un bug dans le système de recrutement');

    assertTrue(['hr_specialist', 'it_expert'].includes(result.agent), 'Should route to either HR or IT');
    assertGreaterThan(result.confidence, 0.7, 'Should have reasonable confidence');
});

// ==============================================================================
// EDGE CASES
// ==============================================================================

runner.test('Edge case: Empty question should return default', async () => {
    const result = await router.routeQuestion('');

    assertEquals(result.agent, 'lucide_assistant', 'Should return default for empty question');
});

runner.test('Edge case: Very short question', async () => {
    const result = await router.routeQuestion('bug');

    assertEquals(result.agent, 'it_expert', 'Should detect even with single keyword');
});

runner.test('Edge case: Question with special characters', async () => {
    const result = await router.routeQuestion('Comment recruter ??? Urgent!!!');

    assertEquals(result.agent, 'hr_specialist', 'Should ignore special characters and route correctly');
});

runner.test('Edge case: Case insensitive matching', async () => {
    const result = await router.routeQuestion('RECRUTER UN DEVELOPPEUR');

    assertEquals(result.agent, 'hr_specialist', 'Should work with uppercase');
});

// ==============================================================================
// REAL-WORLD SCENARIOS
// ==============================================================================

runner.test('Real-world: HR - Interview preparation', async () => {
    const result = await router.routeQuestion(
        'Peux-tu m\'aider à préparer des questions d\'entretien pour un poste de chef de projet ?'
    );

    assertEquals(result.agent, 'hr_specialist', 'Should route interview questions to HR');
});

runner.test('Real-world: IT - Code review', async () => {
    const result = await router.routeQuestion(
        'Peux-tu review ce code JavaScript et me dire s\'il y a des problèmes de performance ?'
    );

    assertEquals(result.agent, 'it_expert', 'Should route code review to IT');
});

runner.test('Real-world: Marketing - Campaign strategy', async () => {
    const result = await router.routeQuestion(
        'Quelle stratégie SEO recommandes-tu pour augmenter notre visibilité sur Google ?'
    );

    assertEquals(result.agent, 'marketing_expert', 'Should route SEO questions to Marketing');
});

runner.test('Real-world: IT - Database optimization', async () => {
    const result = await router.routeQuestion(
        'Ma requête SQL est très lente, comment optimiser les index de ma base de données PostgreSQL ?'
    );

    assertEquals(result.agent, 'it_expert', 'Should route database questions to IT');
});

runner.test('Real-world: HR - Salary negotiation', async () => {
    const result = await router.routeQuestion(
        'Comment négocier une augmentation de salaire pour un employé performant ?'
    );

    assertEquals(result.agent, 'hr_specialist', 'Should route salary questions to HR');
});

runner.test('Real-world: Marketing - Email campaign', async () => {
    const result = await router.routeQuestion(
        'Aide-moi à rédiger un email de newsletter pour notre nouvelle campagne produit'
    );

    assertEquals(result.agent, 'marketing_expert', 'Should route email campaigns to Marketing');
});

// ==============================================================================
// PERFORMANCE TESTS
// ==============================================================================

runner.test('Performance: Should route quickly (<50ms)', async () => {
    const start = Date.now();
    await router.routeQuestion('Comment recruter un développeur ?');
    const duration = Date.now() - start;

    assertTrue(duration < 50, `Routing should be fast (took ${duration}ms)`);
});

runner.test('Performance: Bulk routing (20 questions)', async () => {
    const questions = [
        'Comment recruter ?',
        'Bug dans le code',
        'Stratégie marketing',
        'Contrat CDI',
        'API endpoint',
        'Landing page',
        'Salaire employé',
        'Database query',
        'SEO optimisation',
        'Formation RH',
        'React component bug',
        'Email newsletter campaign',
        'Candidat entretien',
        'Server deployment',
        'Brand strategy',
        'Congés payés',
        'Git merge conflict',
        'Social media engagement',
        'Performance review',
        'Docker container error'
    ];

    const start = Date.now();
    for (const q of questions) {
        await router.routeQuestion(q);
    }
    const duration = Date.now() - start;
    const avgDuration = duration / questions.length;

    console.log(`  ℹ️  Total: ${duration}ms | Average: ${avgDuration.toFixed(1)}ms per question`);
    assertTrue(avgDuration < 10, `Average routing should be very fast (got ${avgDuration.toFixed(1)}ms)`);
});

// ==============================================================================
// COMPREHENSIVE DOMAIN COVERAGE
// ==============================================================================

runner.test('Coverage: 30 diverse questions', async () => {
    const testCases = [
        { q: 'Je cherche à embaucher un data scientist', expected: 'hr_specialist' },
        { q: 'Mon application React crash au démarrage', expected: 'it_expert' },
        { q: 'Comment augmenter nos conversions ?', expected: 'marketing_expert' },
        { q: 'Salaire moyen pour développeur senior', expected: 'hr_specialist' },
        { q: 'Error 404 sur mon endpoint REST', expected: 'it_expert' },
        { q: 'Stratégie de contenu pour LinkedIn', expected: 'marketing_expert' },
        { q: 'Rédiger un contrat de travail CDD', expected: 'hr_specialist' },
        { q: 'Optimiser les requêtes SQL PostgreSQL', expected: 'it_expert' },
        { q: 'Améliorer le ROI de nos ads Facebook', expected: 'marketing_expert' },
        { q: 'Questions entretien pour chef de projet', expected: 'hr_specialist' },
        { q: 'Debug memory leak dans Node.js', expected: 'it_expert' },
        { q: 'Créer une campagne email marketing', expected: 'marketing_expert' },
        { q: 'Politique de congés payés entreprise', expected: 'hr_specialist' },
        { q: 'Git rebase vs merge', expected: 'it_expert' },
        { q: 'Analyse de la concurrence marketing', expected: 'marketing_expert' }
    ];

    let correct = 0;
    for (const test of testCases) {
        const result = await router.routeQuestion(test.q);
        if (result.agent === test.expected) {
            correct++;
        } else {
            console.log(`  ⚠️  Misrouted: "${test.q.substring(0, 40)}" → ${result.agent} (expected ${test.expected})`);
        }
    }

    const accuracy = (correct / testCases.length * 100).toFixed(1);
    console.log(`  ℹ️  Accuracy: ${accuracy}% (${correct}/${testCases.length})`);

    assertTrue(correct >= testCases.length * 0.85, `Should have at least 85% accuracy (got ${accuracy}%)`);
});

// ==============================================================================
// RUN ALL TESTS
// ==============================================================================

(async () => {
    try {
        await runner.run();
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
})();
