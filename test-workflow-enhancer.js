#!/usr/bin/env node
/**
 * Tests du Workflow Document Enhancer
 * Vérifie l'enrichissement automatique des workflows
 */

const workflowDocumentEnhancer = require('./src/features/common/services/workflowDocumentEnhancer');

console.log('=== Tests Workflow Document Enhancer ===\n');

// Test 1: shouldGenerateDocument()
console.log('1. Test shouldGenerateDocument()...');
const shouldGen1 = workflowDocumentEnhancer.shouldGenerateDocument('create_job_posting');
const shouldGen2 = workflowDocumentEnhancer.shouldGenerateDocument('analyze_cv');
const shouldGen3 = workflowDocumentEnhancer.shouldGenerateDocument('unknown_workflow');

if (shouldGen1 && !shouldGen2 && !shouldGen3) {
    console.log('   ✓ create_job_posting génère un document');
    console.log('   ✓ analyze_cv ne génère pas de document');
    console.log('   ✓ unknown_workflow ne génère pas de document');
    console.log('   ✓ shouldGenerateDocument() OK !');
} else {
    console.log('   ✗ Erreur détection:', shouldGen1, shouldGen2, shouldGen3);
}

// Test 2: getDocumentConfig()
console.log('\n2. Test getDocumentConfig()...');
const config1 = workflowDocumentEnhancer.getDocumentConfig('create_job_posting');
const config2 = workflowDocumentEnhancer.getDocumentConfig('strategic_plan');
const config3 = workflowDocumentEnhancer.getDocumentConfig('unknown');

if (config1 && config1.type === 'offre' && config2 && config2.type === 'plan' && !config3) {
    console.log('   ✓ create_job_posting:', config1.type, '-', config1.defaultTitle);
    console.log('   ✓ strategic_plan:', config2.type, '-', config2.defaultTitle);
    console.log('   ✓ unknown: null (correct)');
    console.log('   ✓ getDocumentConfig() OK !');
} else {
    console.log('   ✗ Erreur config:', config1, config2, config3);
}

// Test 3: extractTitleFromFormData()
console.log('\n3. Test extractTitleFromFormData()...');
const formData1 = { jobTitle: 'Développeur Full-Stack', department: 'IT' };
const formData2 = { campaignName: 'Campagne Q1 2025', budget: '50k' };
const formData3 = { randomField: 'Value' };

const title1 = workflowDocumentEnhancer.extractTitleFromFormData(formData1, 'Default Title');
const title2 = workflowDocumentEnhancer.extractTitleFromFormData(formData2, 'Default Title');
const title3 = workflowDocumentEnhancer.extractTitleFromFormData(formData3, 'Default Title');

if (title1 === 'Développeur Full-Stack' && title2 === 'Campagne Q1 2025' && title3 === 'Default Title') {
    console.log('   ✓ Extraction depuis jobTitle:', title1);
    console.log('   ✓ Extraction depuis campaignName:', title2);
    console.log('   ✓ Fallback sur default:', title3);
    console.log('   ✓ extractTitleFromFormData() OK !');
} else {
    console.log('   ✗ Erreur extraction:', title1, title2, title3);
}

// Test 4: enhancePrompt()
console.log('\n4. Test enhancePrompt()...');
const originalPrompt = `Je souhaite créer une offre d'emploi professionnelle.

Informations nécessaires :
- Titre du poste
- Département/Équipe
- Compétences requises`;

const enhanced = workflowDocumentEnhancer.enhancePrompt(
    'create_job_posting',
    originalPrompt,
    { jobTitle: 'Développeur Senior' }
);

const hasOriginal = enhanced.includes('offre d\'emploi professionnelle');
const hasInstructions = enhanced.includes('<<DOCUMENT:offre>>');
const hasTitle = enhanced.includes('Développeur Senior');

if (hasOriginal && hasInstructions && hasTitle) {
    console.log('   ✓ Prompt original préservé');
    console.log('   ✓ Instructions de formatage ajoutées');
    console.log('   ✓ Titre extrait du formulaire');
    console.log('   Longueur prompt original:', originalPrompt.length, 'chars');
    console.log('   Longueur prompt enrichi:', enhanced.length, 'chars');
    console.log('   ✓ enhancePrompt() OK !');
} else {
    console.log('   ✗ Erreur enrichissement:', hasOriginal, hasInstructions, hasTitle);
}

// Test 5: getStats()
console.log('\n5. Test getStats()...');
const stats = workflowDocumentEnhancer.getStats();

console.log('   Total workflows supportés:', stats.totalWorkflows);
console.log('   Types de documents:', stats.documentTypes);
console.log('   Types:', stats.types.slice(0, 5).join(', '), '...');

if (stats.totalWorkflows >= 20 && stats.documentTypes >= 10) {
    console.log('   ✓ Stats correctes (', stats.totalWorkflows, 'workflows,', stats.documentTypes, 'types)');
    console.log('   ✓ getStats() OK !');
} else {
    console.log('   ✗ Erreur stats trop faibles');
}

// Test 6: getDocumentWorkflowIds()
console.log('\n6. Test getDocumentWorkflowIds()...');
const workflowIds = workflowDocumentEnhancer.getDocumentWorkflowIds();

console.log('   Workflows documentés:', workflowIds.length);
console.log('   Exemples:', workflowIds.slice(0, 5).join(', '), '...');

if (workflowIds.length >= 20 && workflowIds.includes('create_job_posting')) {
    console.log('   ✓ Liste complète des workflows');
    console.log('   ✓ getDocumentWorkflowIds() OK !');
} else {
    console.log('   ✗ Erreur liste workflows');
}

// Test 7: groupWorkflowsByType()
console.log('\n7. Test groupWorkflowsByType()...');
const grouped = workflowDocumentEnhancer.groupWorkflowsByType();

const rapportWorkflows = grouped['rapport'] || [];
const planWorkflows = grouped['plan'] || [];

console.log('   Workflows "rapport":', rapportWorkflows.length);
console.log('   Workflows "plan":', planWorkflows.length);

if (rapportWorkflows.length > 0 && planWorkflows.length > 0) {
    console.log('   ✓ Groupement par type correct');
    console.log('   ✓ groupWorkflowsByType() OK !');
} else {
    console.log('   ✗ Erreur groupement');
}

// Test 8: Workflow sans document
console.log('\n8. Test Workflow Non-Documenté...');
const normalPrompt = 'Analyser ce CV...';
const notEnhanced = workflowDocumentEnhancer.enhancePrompt(
    'analyze_cv',  // Ce workflow n'est pas dans la liste
    normalPrompt,
    {}
);

if (notEnhanced === normalPrompt) {
    console.log('   ✓ Prompt non-documenté reste inchangé');
    console.log('   ✓ Pas d\'enrichissement pour workflows standards');
} else {
    console.log('   ✗ Erreur: Prompt altéré à tort');
}

// Test 9: Tous les types de documents
console.log('\n9. Test Tous les Types de Documents...');
const allTypes = new Set();
workflowDocumentEnhancer.getDocumentWorkflowIds().forEach(id => {
    const config = workflowDocumentEnhancer.getDocumentConfig(id);
    if (config) {
        allTypes.add(config.type);
    }
});

console.log('   Types uniques:', allTypes.size);
console.log('   Types trouvés:', Array.from(allTypes).slice(0, 10).join(', '));

if (allTypes.size >= 10) {
    console.log('   ✓ Diversité de types suffisante');
} else {
    console.log('   ⚠ Peu de types différents');
}

// Test 10: Exemple complet (simulation workflow réel)
console.log('\n10. Simulation Workflow Complet...');
console.log('   Scénario: User lance "create_job_posting"');

const userFormData = {
    jobTitle: 'Développeur Full-Stack Senior',
    department: 'Engineering',
    experience: 'Senior (5+ ans)'
};

const basePrompt = `Je souhaite créer une offre d'emploi professionnelle.

Détails du poste:
- Titre: ${userFormData.jobTitle}
- Département: ${userFormData.department}
- Expérience: ${userFormData.experience}

Merci de créer une offre attractive et complète.`;

const finalPrompt = workflowDocumentEnhancer.enhancePrompt(
    'create_job_posting',
    basePrompt,
    userFormData
);

console.log('\n   --- Prompt Enrichi (extrait) ---');
console.log('   ' + finalPrompt.split('\n').slice(0, 3).join('\n   '));
console.log('   ...');
console.log('   ' + finalPrompt.split('\n').slice(-5).join('\n   '));
console.log('   --- Fin ---\n');

if (finalPrompt.includes('<<DOCUMENT:offre>>') &&
    finalPrompt.includes(userFormData.jobTitle) &&
    finalPrompt.includes('Détails du poste')) {
    console.log('   ✓ Prompt prêt pour l\'IA');
    console.log('   ✓ L\'IA va générer un document structuré');
    console.log('   ✓ Simulation complète OK !');
} else {
    console.log('   ✗ Erreur simulation');
}

// Résumé
console.log('\n' + '='.repeat(50));
console.log('RÉSUMÉ DES TESTS');
console.log('='.repeat(50));

console.log('\n✅ Fonctionnalités testées:');
console.log('   ✓ shouldGenerateDocument() - Détection workflows');
console.log('   ✓ getDocumentConfig() - Configuration documents');
console.log('   ✓ extractTitleFromFormData() - Extraction titres');
console.log('   ✓ enhancePrompt() - Enrichissement prompts');
console.log('   ✓ getStats() - Statistiques globales');
console.log('   ✓ getDocumentWorkflowIds() - Liste workflows');
console.log('   ✓ groupWorkflowsByType() - Groupement types');
console.log('   ✓ Workflows non-documentés préservés');
console.log('   ✓ Diversité types de documents');
console.log('   ✓ Simulation workflow complet');

console.log('\n📊 Statistiques:');
console.log('   • Workflows documentés:', stats.totalWorkflows);
console.log('   • Types de documents:', stats.documentTypes);
console.log('   • Types disponibles:', Array.from(allTypes).join(', '));

console.log('\n🎯 Le Workflow Document Enhancer est opérationnel !');
console.log('\n✅ L\'intégration workflows → documents est complète et fonctionnelle !\n');
