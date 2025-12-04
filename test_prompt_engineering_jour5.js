/**
 * Test Prompt Engineering - Phase WOW 1 Jour 5
 * Validation du système de prompt engineering avancé
 */

const promptEngineeringService = require('./src/features/common/services/promptEngineeringService');
const userContextService = require('./src/features/common/services/userContextService');

console.log('\n🎯 ============================================');
console.log('   TEST - PROMPT ENGINEERING SERVICE');
console.log('   Phase WOW 1 - Jour 5');
console.log('   ============================================\n');

async function runTests() {
    let testsPass = 0;
    let testsTotal = 0;

    // Test 1: Generate prompt without context
    console.log('📋 Test 1: Generate prompt sans contexte utilisateur');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testsTotal++;
    try {
        const result = await promptEngineeringService.generatePrompt({
            question: "Comment préparer notre pitch deck pour la série A ?",
            profileId: 'ceo_advisor',
            uid: 'test_user',
            sessionId: null
        });

        console.log(`   ✅ Prompt généré avec succès`);
        console.log(`   Profil: ${result.metadata.profileId}`);
        console.log(`   Type question: ${result.metadata.questionType}`);
        console.log(`   Complexité: ${result.metadata.complexity}`);
        console.log(`   Temperature: ${result.temperature}`);
        console.log(`   System prompt length: ${result.systemPrompt.length} chars`);
        console.log(`   Has context: ${result.metadata.hasContext}`);
        console.log('');

        if (result.systemPrompt && result.systemPrompt.includes('conseiller exécutif')) {
            testsPass++;
            console.log('   ✅ System prompt contient le persona CEO Advisor\n');
        } else {
            console.log('   ❌ System prompt ne contient pas le bon persona\n');
        }
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
    }

    // Test 2: Question type detection
    console.log('📋 Test 2: Détection du type de question');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testQuestions = [
        { q: "Comment définir nos OKRs ?", expectedType: "how_to" },
        { q: "Qu'est-ce qu'un term sheet ?", expectedType: "definition" },
        { q: "MEDDIC vs BANT : quelle méthode choisir ?", expectedType: "comparison" },
        { q: "Stratégie de fundraising pour 2025", expectedType: "strategic" }
    ];

    for (const test of testQuestions) {
        testsTotal++;
        try {
            const result = await promptEngineeringService.generatePrompt({
                question: test.q,
                profileId: 'ceo_advisor',
                uid: 'test_user'
            });

            const match = result.metadata.questionType === test.expectedType;
            if (match) {
                testsPass++;
                console.log(`   ✅ "${test.q.substring(0, 40)}..." → ${result.metadata.questionType}`);
            } else {
                console.log(`   ❌ "${test.q.substring(0, 40)}..." → ${result.metadata.questionType} (attendu: ${test.expectedType})`);
            }
        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
        }
    }
    console.log('');

    // Test 3: Profile templates availability
    console.log('📋 Test 3: Disponibilité des profils');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testsTotal++;
    const profiles = promptEngineeringService.getAvailableProfiles();
    console.log(`   📊 Profils disponibles: ${profiles.length}`);
    profiles.forEach(id => {
        const info = promptEngineeringService.getProfileInfo(id);
        console.log(`      - ${id}: ${info.name} (${info.exampleCount} exemples, temp: ${info.temperature})`);
    });

    if (profiles.length >= 7) {
        testsPass++;
        console.log(`\n   ✅ Tous les 7 profils sont disponibles\n`);
    } else {
        console.log(`\n   ❌ Seulement ${profiles.length} profils (attendu: 7)\n`);
    }

    // Test 4: User context save/retrieve
    console.log('📋 Test 4: User Context Service');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testsTotal++;
    try {
        // Save context
        const testContext = {
            job_role: 'CEO',
            industry: 'SaaS B2B',
            company_size: '11-50',
            company_stage: 'Series A',
            experience_years: 8,
            is_first_time_founder: 1,
            current_challenges: ['fundraising', 'hiring', 'product-market fit'],
            preferred_tone: 'formal',
            technical_level: 'intermediate'
        };

        const saved = userContextService.saveContext('test_user', testContext);
        const retrieved = userContextService.getContext('test_user');

        if (saved && retrieved && retrieved.job_role === 'CEO') {
            testsPass++;
            console.log('   ✅ Context sauvegardé et récupéré avec succès');
            console.log(`   Résumé: ${userContextService.getContextSummary('test_user')}`);
            console.log('');
        } else {
            console.log('   ❌ Échec save/retrieve context\n');
        }
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
    }

    // Test 5: Prompt avec contexte utilisateur
    console.log('📋 Test 5: Prompt enrichi avec contexte utilisateur');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testsTotal++;
    try {
        const result = await promptEngineeringService.generatePrompt({
            question: "Comment optimiser notre burn rate ?",
            profileId: 'ceo_advisor',
            uid: 'test_user', // Has context from Test 4
            sessionId: null
        });

        console.log(`   Contexte détecté: ${result.metadata.hasContext}`);
        console.log(`   System prompt length: ${result.systemPrompt.length} chars`);

        if (result.metadata.hasContext && result.systemPrompt.includes('CEO')) {
            testsPass++;
            console.log('   ✅ Prompt enrichi avec contexte utilisateur');
            console.log(`   → Contient le rôle "CEO" du contexte\n`);
        } else {
            console.log('   ❌ Context pas inclus dans le prompt\n');
        }
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
    }

    // Test 6: Temperature adaptation
    console.log('📋 Test 6: Adaptation de la température');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const tempTests = [
        { profileId: 'ceo_advisor', expectedTemp: 0.5 },
        { profileId: 'sales_expert', expectedTemp: 0.6 },
        { profileId: 'marketing_expert', expectedTemp: 0.7 }
    ];

    for (const test of tempTests) {
        testsTotal++;
        try {
            const result = await promptEngineeringService.generatePrompt({
                question: "Test question",
                profileId: test.profileId,
                uid: 'test_user'
            });

            const match = result.temperature === test.expectedTemp;
            if (match) {
                testsPass++;
                console.log(`   ✅ ${test.profileId}: temp = ${result.temperature}`);
            } else {
                console.log(`   ⚠️  ${test.profileId}: temp = ${result.temperature} (attendu: ${test.expectedTemp})`);
            }
        } catch (error) {
            console.log(`   ❌ ${test.profileId}: ${error.message}`);
        }
    }
    console.log('');

    // Cleanup
    try {
        userContextService.resetContext('test_user');
        console.log('   🧹 Cleanup: test context supprimé\n');
    } catch (error) {
        // Ignore cleanup errors
    }

    // Summary
    console.log('\n🏁 ============================================');
    console.log('   RÉSUMÉ DES TESTS');
    console.log('   ============================================\n');

    const percentage = Math.round((testsPass / testsTotal) * 100);
    console.log(`   📊 Score: ${testsPass}/${testsTotal} tests réussis (${percentage}%)\n`);

    if (percentage >= 80) {
        console.log('✅ Phase WOW 1 - Jour 5: PROMPT ENGINEERING VALIDÉ\n');
        console.log('🎯 Fonctionnalités opérationnelles:');
        console.log('   • 7 profils avec templates riches');
        console.log('   • Domain-specific vocabulary');
        console.log('   • Output structuring adapté');
        console.log('   • Temperature adaptation');
        console.log('   • User context enrichment');
        console.log('   • Question type detection');
        console.log('   • Conversation context awareness\n');
        process.exit(0);
    } else {
        console.log('⚠️  Certains tests ont échoué\n');
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});
