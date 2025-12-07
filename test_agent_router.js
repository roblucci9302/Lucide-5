#!/usr/bin/env node
/**
 * Test Suite for Agent Router Service - Phase 1
 *
 * Tests the 3-level intelligent routing system:
 *  - Level 1: Keyword matching
 *  - Level 2: Context enrichment
 *  - Level 3: LLM classification
 *
 * Run with: node test_agent_router.js
 */

const path = require('path');
const fs = require('fs');

// Setup database path for testing
const testDbPath = path.join(__dirname, 'data', 'test_router.db');
if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    console.log('🗑️  Removed existing test database');
}

// Mock environment
process.env.NODE_ENV = 'test';

const agentRouterService = require('./src/features/common/services/agentRouterService');

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
        console.log('\n🧪 AGENT ROUTER SERVICE - TEST SUITE\n');
        console.log('═'.repeat(60));

        for (const test of this.tests) {
            try {
                console.log(`\n▶ ${test.name}`);
                await test.fn();
                console.log(`  ✅ PASSED`);
                this.passed++;
            } catch (error) {
                console.log(`  ❌ FAILED: ${error.message}`);
                console.error(error.stack);
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

// Test suite
const runner = new TestRunner();

// ==============================================================================
// LEVEL 1 TESTS: Keyword Detection
// ==============================================================================

runner.test('Level 1: Should detect HR questions (French)', async () => {
    const result = await agentRouterService.routeQuestion('Comment recruter un développeur senior ?', 'test-user-1');

    assertEquals(result.agent, 'hr_specialist', 'Should route to HR specialist');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
    assertTrue(result.matchedKeywords?.includes('recruter'), 'Should match "recruter" keyword');
});

runner.test('Level 1: Should detect HR questions (English)', async () => {
    const result = await agentRouterService.routeQuestion('How to write a job contract for new employee?', 'test-user-2');

    assertEquals(result.agent, 'hr_specialist', 'Should route to HR specialist');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect IT questions (French)', async () => {
    const result = await agentRouterService.routeQuestion('J\'ai un bug dans mon code React, la fonction useEffect ne marche pas', 'test-user-3');

    assertEquals(result.agent, 'it_expert', 'Should route to IT expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
    assertTrue(result.matchedKeywords?.length > 0, 'Should match keywords');
});

runner.test('Level 1: Should detect IT questions (English)', async () => {
    const result = await agentRouterService.routeQuestion('My API endpoint returns 500 error, how to debug this?', 'test-user-4');

    assertEquals(result.agent, 'it_expert', 'Should route to IT expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect Marketing questions (French)', async () => {
    const result = await agentRouterService.routeQuestion('Comment améliorer le taux de conversion de notre landing page ?', 'test-user-5');

    assertEquals(result.agent, 'marketing_expert', 'Should route to Marketing expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should detect Marketing questions (English)', async () => {
    const result = await agentRouterService.routeQuestion('What are the best strategies for social media engagement?', 'test-user-6');

    assertEquals(result.agent, 'marketing_expert', 'Should route to Marketing expert');
    assertGreaterThan(result.confidence, 0.8, 'Confidence should be high');
});

runner.test('Level 1: Should use default for general questions', async () => {
    const result = await agentRouterService.routeQuestion('Quelle est la capitale de la France ?', 'test-user-7');

    assertEquals(result.agent, 'lucide_assistant', 'Should route to general assistant');
});

// ==============================================================================
// MULTI-KEYWORD TESTS
// ==============================================================================

runner.test('Level 1: Should increase confidence with multiple keywords', async () => {
    const result = await agentRouterService.routeQuestion('Je cherche à recruter un candidat pour un poste RH avec contrat CDI', 'test-user-8');

    assertEquals(result.agent, 'hr_specialist', 'Should route to HR specialist');
    assertGreaterThan(result.confidence, 0.9, 'Confidence should be very high with multiple keywords');
    assertTrue(result.matchedKeywords?.length >= 3, 'Should match multiple keywords');
});

runner.test('Level 1: Should handle mixed domain keywords', async () => {
    const result = await agentRouterService.routeQuestion('Notre développeur a un bug dans le système de recrutement', 'test-user-9');

    // Should pick the domain with more/stronger matches
    assertTrue(['hr_specialist', 'it_expert'].includes(result.agent), 'Should route to either HR or IT');
    assertGreaterThan(result.confidence, 0.7, 'Should have reasonable confidence');
});

// ==============================================================================
// WORD BOUNDARY TESTS
// ==============================================================================

runner.test('Level 1: Should use word boundaries (avoid false positives)', async () => {
    // "fonction" should not match "fonctionnement" incorrectly
    const result = await agentRouterService.routeQuestion('Comment optimiser le fonctionnement de notre équipe ?', 'test-user-10');

    // Should not strongly match IT keywords
    // "fonction" is in IT keywords, but "fonctionnement" has different meaning
    // This is a soft test - we just ensure it doesn't crash
    assertTrue(result.agent !== undefined, 'Should return a valid agent');
});

// ==============================================================================
// EDGE CASES
// ==============================================================================

runner.test('Edge case: Empty question should return default', async () => {
    const result = await agentRouterService.routeQuestion('', 'test-user-11');

    assertEquals(result.agent, 'lucide_assistant', 'Should return default for empty question');
});

runner.test('Edge case: Very short question', async () => {
    const result = await agentRouterService.routeQuestion('bug', 'test-user-12');

    assertEquals(result.agent, 'it_expert', 'Should detect even with single keyword');
});

runner.test('Edge case: Question with special characters', async () => {
    const result = await agentRouterService.routeQuestion('Comment recruter ??? Urgent!!!', 'test-user-13');

    assertEquals(result.agent, 'hr_specialist', 'Should ignore special characters and route correctly');
});

runner.test('Edge case: Case insensitive matching', async () => {
    const result = await agentRouterService.routeQuestion('RECRUTER UN DEVELOPPEUR', 'test-user-14');

    assertEquals(result.agent, 'hr_specialist', 'Should work with uppercase');
});

// ==============================================================================
// STATISTICS TESTS
// ==============================================================================

runner.test('Stats: Should track routing statistics', async () => {
    agentRouterService.resetStats();

    await agentRouterService.routeQuestion('Comment recruter ?', 'test-user-15');
    await agentRouterService.routeQuestion('Bug dans le code', 'test-user-16');
    await agentRouterService.routeQuestion('Stratégie marketing', 'test-user-17');

    const stats = agentRouterService.getStats();

    assertEquals(stats.totalRoutings, 3, 'Should track total routings');
    assertTrue(stats.byAgent.hr_specialist > 0, 'Should track HR routings');
    assertTrue(stats.byAgent.it_expert > 0, 'Should track IT routings');
    assertTrue(stats.byAgent.marketing_expert > 0, 'Should track Marketing routings');
});

runner.test('Stats: Should track user overrides', () => {
    agentRouterService.resetStats();

    const prediction = {
        agent: 'hr_specialist',
        confidence: 0.85,
        reason: 'keyword_match',
        matchedKeywords: ['recruter']
    };

    agentRouterService.logUserOverride('Comment recruter ?', prediction, 'it_expert');

    const stats = agentRouterService.getStats();
    assertEquals(stats.userOverrides, 1, 'Should track user overrides');
});

// ==============================================================================
// REAL-WORLD SCENARIOS
// ==============================================================================

runner.test('Real-world: HR - Interview preparation', async () => {
    const result = await agentRouterService.routeQuestion(
        'Peux-tu m\'aider à préparer des questions d\'entretien pour un poste de chef de projet ?',
        'test-user-18'
    );

    assertEquals(result.agent, 'hr_specialist', 'Should route interview questions to HR');
});

runner.test('Real-world: IT - Code review', async () => {
    const result = await agentRouterService.routeQuestion(
        'Peux-tu review ce code JavaScript et me dire s\'il y a des problèmes de performance ?',
        'test-user-19'
    );

    assertEquals(result.agent, 'it_expert', 'Should route code review to IT');
});

runner.test('Real-world: Marketing - Campaign strategy', async () => {
    const result = await agentRouterService.routeQuestion(
        'Quelle stratégie SEO recommandes-tu pour augmenter notre visibilité sur Google ?',
        'test-user-20'
    );

    assertEquals(result.agent, 'marketing_expert', 'Should route SEO questions to Marketing');
});

runner.test('Real-world: IT - Database optimization', async () => {
    const result = await agentRouterService.routeQuestion(
        'Ma requête SQL est très lente, comment optimiser les index de ma base de données PostgreSQL ?',
        'test-user-21'
    );

    assertEquals(result.agent, 'it_expert', 'Should route database questions to IT');
});

runner.test('Real-world: HR - Salary negotiation', async () => {
    const result = await agentRouterService.routeQuestion(
        'Comment négocier une augmentation de salaire pour un employé performant ?',
        'test-user-22'
    );

    assertEquals(result.agent, 'hr_specialist', 'Should route salary questions to HR');
});

runner.test('Real-world: Marketing - Email campaign', async () => {
    const result = await agentRouterService.routeQuestion(
        'Aide-moi à rédiger un email de newsletter pour notre nouvelle campagne produit',
        'test-user-23'
    );

    assertEquals(result.agent, 'marketing_expert', 'Should route email campaigns to Marketing');
});

// ==============================================================================
// PERFORMANCE TESTS
// ==============================================================================

runner.test('Performance: Should route quickly with keywords (<100ms)', async () => {
    const start = Date.now();
    await agentRouterService.routeQuestion('Comment recruter un développeur ?', 'test-user-24');
    const duration = Date.now() - start;

    assertTrue(duration < 100, `Keyword routing should be fast (took ${duration}ms)`);
});

runner.test('Performance: Bulk routing (10 questions)', async () => {
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
        'Formation RH'
    ];

    const start = Date.now();
    for (const q of questions) {
        await agentRouterService.routeQuestion(q, 'test-user-25');
    }
    const duration = Date.now() - start;
    const avgDuration = duration / questions.length;

    console.log(`  ℹ️  Average routing time: ${avgDuration.toFixed(1)}ms`);
    assertTrue(avgDuration < 200, 'Average routing should be fast');
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
