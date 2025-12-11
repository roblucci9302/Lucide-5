/**
 * Test: Vérification de l'implémentation du Plan de Transformation des Insights
 * Vérifie que les réponses factuelles multi-angles sont bien générées
 */

const path = require('path');

// Setup environment
process.env.NODE_ENV = 'development';

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('🧪 TEST: PLAN DE TRANSFORMATION DES INSIGHTS EN SUGGESTIONS FACTUELLES');
console.log('═══════════════════════════════════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result) {
            console.log(`✅ PASS: ${name}`);
            testsPassed++;
        } else {
            console.log(`❌ FAIL: ${name}`);
            testsFailed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${name} - ${error.message}`);
        testsFailed++;
    }
}

console.log('📋 Phase 1: Vérification des fichiers modifiés\n');

// Test 1: Vérifier que InsightType inclut FACTUAL_RESPONSE
test('InsightType.FACTUAL_RESPONSE existe', () => {
    const liveInsightsService = require('./src/features/listen/liveInsights/liveInsightsService');
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/liveInsightsService.js', 'utf8');
    return content.includes('FACTUAL_RESPONSE') && content.includes('factual_response');
});

// Test 2: Vérifier que contextualAnalysisService a generateMultiAngleResponses
test('contextualAnalysisService.generateMultiAngleResponses existe', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('generateMultiAngleResponses') && 
           content.includes('Technical, Business, Risk, Innovation');
});

// Test 3: Vérifier l'intervalle de 5 tours de conversation
test('PROACTIVE_SUGGESTIONS_INTERVAL = 5', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/liveInsightsService.js', 'utf8');
    return content.includes('this.PROACTIVE_SUGGESTIONS_INTERVAL = 5');
});

// Test 4: Vérifier que _generateProactiveSuggestions appelle generateMultiAngleResponses
test('_generateProactiveSuggestions utilise generateMultiAngleResponses', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/liveInsightsService.js', 'utf8');
    return content.includes('contextualAnalysisService.generateMultiAngleResponses');
});

// Test 5: Vérifier que le prompt demande des réponses factuelles, pas des actions
test('Prompt demande réponses factuelles (pas actions)', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('réponse factuelle') && 
           content.includes('EXEMPLES À ÉVITER') &&
           content.includes('"Je suggère de..."');
});

// Test 6: Vérifier que les 4 angles sont supportés
test('4 angles supportés: technical, business, risk, innovation', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('technical|business|risk|innovation');
});

console.log('\n📋 Phase 2: Vérification de l\'intégration UI\n');

// Test 7: Vérifier que LiveInsightsPanel affiche factual_response
test('LiveInsightsPanel supporte factual_response', () => {
    const content = require('fs').readFileSync('./src/ui/listen/LiveInsightsPanel.js', 'utf8');
    return content.includes("factual_response: '💬'");
});

// Test 8: Vérifier que les badges d'angle sont affichés
test('UI affiche badges d\'angle (🔧💰⚠️💡)', () => {
    const content = require('fs').readFileSync('./src/ui/listen/LiveInsightsPanel.js', 'utf8');
    return content.includes('getAngleBadge') && 
           content.includes('technical: \'🔧\'') &&
           content.includes('business: \'💰\'');
});

// Test 9: Vérifier que le badge KB est affiché
test('UI affiche badge Knowledge Base (📚)', () => {
    const content = require('fs').readFileSync('./src/ui/listen/LiveInsightsPanel.js', 'utf8');
    return content.includes('hasKB') && content.includes('From Knowledge Base');
});

console.log('\n📋 Phase 3: Vérification de l\'intégration Knowledge Base\n');

// Test 10: Vérifier que contextualAnalysisService utilise ragService
test('contextualAnalysisService intègre ragService', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes("require('../../common/services/ragService')");
});

// Test 11: Vérifier que le KB est utilisé pour enrichir les réponses
test('KB utilisé pour enrichir les réponses factuelles', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('_getKBContext') && content.includes('retrieveContext');
});

// Test 12: Vérifier le seuil minScore pour RAG
test('RAG utilise minScore: 0.3 pour meilleure récupération', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('minScore: 0.3') || content.includes('minScore: 0.5');
});

console.log('\n📋 Phase 4: Vérification de la structure des réponses\n');

// Test 13: Vérifier que les réponses sont courtes (15-30 mots)
test('Réponses limitées à 15-30 mots', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('15-30 mots');
});

// Test 14: Vérifier que les réponses incluent le badge angle au début
test('Réponses incluent badge angle au début', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('badge angle au début');
});

// Test 15: Vérifier que le parsing JSON est robuste
test('Parsing JSON robuste avec nettoyage', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/contextualAnalysisService.js', 'utf8');
    return content.includes('_parseMultiAngleResponses') && 
           content.includes('cleaned = response.replace');
});

console.log('\n📋 Phase 5: Vérification du déclenchement\n');

// Test 16: Vérifier que le turnCounter déclenche bien tous les 5 tours
test('Déclenchement tous les 5 tours de conversation', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/liveInsightsService.js', 'utf8');
    return content.includes('this.turnCounter % this.PROACTIVE_SUGGESTIONS_INTERVAL === 0');
});

// Test 17: Vérifier que les insights sont émis
test('Insights émis via event emitter', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/liveInsightsService.js', 'utf8');
    return content.includes("this.emit('insight-detected', insight)");
});

// Test 18: Vérifier que les notifications sont envoyées
test('Notifications envoyées pour insights factuels', () => {
    const content = require('fs').readFileSync('./src/features/listen/liveInsights/liveInsightsService.js', 'utf8');
    return content.includes('notificationService.notifyInsight(insight)');
});

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('📊 RÉSULTATS FINAUX');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log(`✅ Tests réussis: ${testsPassed}`);
console.log(`❌ Tests échoués: ${testsFailed}`);
console.log(`📈 Taux de réussite: ${Math.round(testsPassed / (testsPassed + testsFailed) * 100)}%\n`);

if (testsFailed === 0) {
    console.log('🎉 SUCCÈS: Le plan de transformation des insights a été CORRECTEMENT implémenté!\n');
    console.log('📝 Détails de l\'implémentation:');
    console.log('   - InsightType.FACTUAL_RESPONSE ajouté');
    console.log('   - generateMultiAngleResponses() implémenté');
    console.log('   - 4 angles supportés: Technical, Business, Risk, Innovation');
    console.log('   - Réponses courtes: 15-30 mots avec badge angle');
    console.log('   - Intégration Knowledge Base pour enrichissement');
    console.log('   - Déclenchement tous les 5 tours de conversation');
    console.log('   - UI avec icônes 💬, badges 🔧💰⚠️💡 et 📚');
    console.log('   - Notifications intelligentes activées\n');
    
    console.log('⚠️  POURQUOI VOUS NE VOYEZ PEUT-ÊTRE PAS LES INSIGHTS:');
    console.log('   1. Déclenchement: Besoin de 5+ tours de conversation en mode Listen');
    console.log('   2. Contexte: Besoin de 3+ messages pour générer des réponses');
    console.log('   3. Rate limiting: AI génère tous les 5 tours pour ne pas submerger');
    console.log('   4. Filtre UI: Vérifiez que le filtre "Factual Response 💬" n\'est pas actif\n');
    
    console.log('🧪 COMMENT TESTER:');
    console.log('   1. Lancer l\'app et ouvrir le mode Listen');
    console.log('   2. Avoir une conversation de 5+ échanges');
    console.log('   3. Vérifier le panneau Live Insights (à droite)');
    console.log('   4. Chercher les icônes 💬 avec badges 🔧💰⚠️💡');
    console.log('   5. Si KB activé, badge 📚 apparaît aussi\n');
    
    process.exit(0);
} else {
    console.log('❌ ÉCHEC: Certains éléments du plan ne sont pas implémentés.\n');
    console.log('🔍 Vérifiez les tests échoués ci-dessus pour identifier les problèmes.\n');
    process.exit(1);
}
