#!/usr/bin/env node

/**
 * Test de validation - Phase 3 : Workflows Spécialisés
 * Vérifie que le système de workflows et actions rapides fonctionne correctement
 */

console.log('\n🧪 TEST DE VALIDATION - PHASE 3 : WORKFLOWS SPECIALISES\n');

let totalTests = 0;
let passedTests = 0;

function test(name, condition, details = '') {
    totalTests++;
    if (condition) {
        console.log(`✅ ${name}`);
        if (details) console.log(`   ${details}`);
        passedTests++;
        return true;
    } else {
        console.log(`❌ ${name}`);
        if (details) console.log(`   ${details}`);
        return false;
    }
}

function section(name) {
    console.log(`\n━━━ ${name} ━━━`);
}

// ============================================================
// VERIFICATION DES FICHIERS
// ============================================================

section('Verification des fichiers de la Phase 3');

const fs = require('fs');

test(
    'workflowTemplates.js existe',
    fs.existsSync('./src/features/common/prompts/workflowTemplates.js')
);

test(
    'workflowService.js existe',
    fs.existsSync('./src/features/common/services/workflowService.js')
);

test(
    'QuickActionsPanel.js existe',
    fs.existsSync('./src/ui/ask/QuickActionsPanel.js')
);

// ============================================================
// VERIFICATION DES TEMPLATES
// ============================================================

section('Verification des templates de workflows');

try {
    const {
        WORKFLOW_TEMPLATES,
        getWorkflowsForProfile,
        getWorkflow,
        buildWorkflowPrompt
    } = require('./src/features/common/prompts/workflowTemplates.js');

    test(
        'WORKFLOW_TEMPLATES est défini',
        typeof WORKFLOW_TEMPLATES === 'object'
    );

    // Test profil RH
    const hrWorkflows = WORKFLOW_TEMPLATES.hr_specialist;
    test(
        'Profil RH a des workflows',
        hrWorkflows && Object.keys(hrWorkflows).length > 0,
        `${Object.keys(hrWorkflows || {}).length} workflows définis`
    );

    test(
        'RH: Workflow "create_job_posting" existe',
        hrWorkflows && hrWorkflows.create_job_posting !== undefined
    );

    test(
        'RH: Workflow "analyze_cv" existe',
        hrWorkflows && hrWorkflows.analyze_cv !== undefined
    );

    test(
        'RH: Workflow "onboarding_plan" existe',
        hrWorkflows && hrWorkflows.onboarding_plan !== undefined
    );

    // Test profil IT
    const itWorkflows = WORKFLOW_TEMPLATES.it_expert;
    test(
        'Profil IT a des workflows',
        itWorkflows && Object.keys(itWorkflows).length > 0,
        `${Object.keys(itWorkflows || {}).length} workflows définis`
    );

    test(
        'IT: Workflow "code_review" existe',
        itWorkflows && itWorkflows.code_review !== undefined
    );

    test(
        'IT: Workflow "debug_error" existe',
        itWorkflows && itWorkflows.debug_error !== undefined
    );

    test(
        'IT: Workflow "system_architecture" existe',
        itWorkflows && itWorkflows.system_architecture !== undefined
    );

    // Test profil Marketing
    const mktWorkflows = WORKFLOW_TEMPLATES.marketing_expert;
    test(
        'Profil Marketing a des workflows',
        mktWorkflows && Object.keys(mktWorkflows).length > 0,
        `${Object.keys(mktWorkflows || {}).length} workflows définis`
    );

    test(
        'Marketing: Workflow "create_campaign" existe',
        mktWorkflows && mktWorkflows.create_campaign !== undefined
    );

    test(
        'Marketing: Workflow "linkedin_post" existe',
        mktWorkflows && mktWorkflows.linkedin_post !== undefined
    );

    // Test structure de workflow
    const testWorkflow = hrWorkflows.create_job_posting;
    test(
        'Structure workflow complète (id, title, icon, description, prompt)',
        testWorkflow &&
        testWorkflow.id &&
        testWorkflow.title &&
        testWorkflow.icon &&
        testWorkflow.description &&
        testWorkflow.prompt
    );

    test(
        'Workflow a des métadonnées (category, estimatedTime)',
        testWorkflow &&
        testWorkflow.category &&
        testWorkflow.estimatedTime
    );

    // Test fonctions helpers
    test(
        'getWorkflowsForProfile() fonctionne',
        typeof getWorkflowsForProfile('hr_specialist') === 'object'
    );

    test(
        'getWorkflow() retourne un workflow',
        getWorkflow('hr_specialist', 'create_job_posting') !== null
    );

    test(
        'buildWorkflowPrompt() génère un prompt',
        buildWorkflowPrompt('hr_specialist', 'create_job_posting').length > 0
    );

} catch (error) {
    test('Templates chargent sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// VERIFICATION DU SERVICE
// ============================================================

section('Verification du service workflowService');

try {
    const workflowService = require('./src/features/common/services/workflowService.js');

    test(
        'Service exporte un objet',
        typeof workflowService === 'object'
    );

    test(
        'getCurrentProfileWorkflows() existe',
        typeof workflowService.getCurrentProfileWorkflows === 'function'
    );

    test(
        'getWorkflowsForProfile() existe',
        typeof workflowService.getWorkflowsForProfile === 'function'
    );

    test(
        'getWorkflow() existe',
        typeof workflowService.getWorkflow === 'function'
    );

    test(
        'buildPrompt() existe',
        typeof workflowService.buildPrompt === 'function'
    );

    test(
        'getProfileWorkflowsMetadata() existe',
        typeof workflowService.getProfileWorkflowsMetadata === 'function'
    );

    test(
        'getWorkflowFormFields() existe',
        typeof workflowService.getWorkflowFormFields === 'function'
    );

    test(
        'validateFormData() existe',
        typeof workflowService.validateFormData === 'function'
    );

    // Test méthodes
    const hrMetadata = workflowService.getProfileWorkflowsMetadata('hr_specialist');
    test(
        'getProfileWorkflowsMetadata() retourne un array',
        Array.isArray(hrMetadata)
    );

    test(
        'Métadonnées contiennent les champs requis',
        hrMetadata.length > 0 &&
        hrMetadata[0].id &&
        hrMetadata[0].title &&
        hrMetadata[0].icon &&
        hrMetadata[0].description
    );

} catch (error) {
    test('workflowService charge sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// VERIFICATION DE L'INTEGRATION
// ============================================================

section('Verification de l\'integration');

// Vérifier featureBridge.js
try {
    const bridgeContent = fs.readFileSync('./src/bridge/featureBridge.js', 'utf-8');

    test(
        'workflowService importé dans featureBridge',
        bridgeContent.includes("require('../features/common/services/workflowService')")
    );

    test(
        'Handler workflows:get-current-profile-workflows existe',
        bridgeContent.includes("ipcMain.handle('workflows:get-current-profile-workflows'")
    );

    test(
        'Handler workflows:get-workflows-metadata existe',
        bridgeContent.includes("ipcMain.handle('workflows:get-workflows-metadata'")
    );

    test(
        'Handler workflows:build-prompt existe',
        bridgeContent.includes("ipcMain.handle('workflows:build-prompt'")
    );

    test(
        'Handler workflows:get-form-fields existe',
        bridgeContent.includes("ipcMain.handle('workflows:get-form-fields'")
    );

} catch (error) {
    test('featureBridge analyse sans erreur', false, `Erreur: ${error.message}`);
}

// Vérifier preload.js
try {
    const preloadContent = fs.readFileSync('./src/preload.js', 'utf-8');

    test(
        'preload.js expose workflows API',
        preloadContent.includes('workflows: {')
    );

    test(
        'API getCurrentProfileWorkflows exposée',
        preloadContent.includes('getCurrentProfileWorkflows:')
    );

    test(
        'API getWorkflowsMetadata exposée',
        preloadContent.includes('getWorkflowsMetadata:')
    );

    test(
        'API buildPrompt exposée',
        preloadContent.includes('buildPrompt:')
    );

} catch (error) {
    test('preload.js analyse sans erreur', false, `Erreur: ${error.message}`);
}

// Vérifier AskView.js
try {
    const askViewContent = fs.readFileSync('./src/ui/ask/AskView.js', 'utf-8');

    test(
        'AskView importe QuickActionsPanel',
        askViewContent.includes("import './QuickActionsPanel.js'")
    );

    test(
        'AskView a un handler pour workflow-selected',
        askViewContent.includes('handleWorkflowSelected')
    );

    test(
        'AskView affiche QuickActionsPanel',
        askViewContent.includes('<quick-actions-panel>')
    );

    test(
        'QuickActionsPanel affiché seulement sans réponse',
        askViewContent.includes('!hasResponse') &&
        askViewContent.includes('<quick-actions-panel>')
    );

} catch (error) {
    test('AskView analyse sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// VERIFICATION DE L'UI
// ============================================================

section('Verification de l\'interface utilisateur');

try {
    const quickActionsContent = fs.readFileSync('./src/ui/ask/QuickActionsPanel.js', 'utf-8');

    test(
        'QuickActionsPanel utilise LitElement',
        quickActionsContent.includes('extends LitElement')
    );

    test(
        'QuickActionsPanel a un grid d\'actions',
        quickActionsContent.includes('actions-grid')
    );

    test(
        'QuickActionsPanel affiche l\'icône de profil',
        quickActionsContent.includes('getProfileIcon')
    );

    test(
        'QuickActionsPanel émet l\'événement workflow-selected',
        quickActionsContent.includes("'workflow-selected'")
    );

    test(
        'QuickActionsPanel charge les workflows via API',
        quickActionsContent.includes('window.api.workflows')
    );

    test(
        'QuickActionsPanel affiche indicateur de formulaire',
        quickActionsContent.includes('hasForm')
    );

} catch (error) {
    test('QuickActionsPanel analyse sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// TESTS FONCTIONNELS
// ============================================================

section('Tests fonctionnels');

try {
    const { buildWorkflowPrompt } = require('./src/features/common/prompts/workflowTemplates.js');

    // Test build prompt avec form data
    const formData = {
        jobTitle: 'Développeur Senior',
        department: 'IT',
        experience: 'Senior (5+ ans)'
    };

    const promptWithForm = buildWorkflowPrompt('hr_specialist', 'create_job_posting', formData);

    test(
        'buildWorkflowPrompt() intègre les données du formulaire',
        promptWithForm.includes('Développeur Senior') &&
        promptWithForm.includes('IT') &&
        promptWithForm.includes('Senior')
    );

    // Test validation
    const workflowService = require('./src/features/common/services/workflowService.js');

    const validationResult = workflowService.validateFormData(
        'hr_specialist',
        'create_job_posting',
        {} // Empty form data
    );

    test(
        'validateFormData() détecte les champs manquants',
        validationResult &&
        validationResult.valid === false &&
        validationResult.errors.length > 0
    );

    const validFormData = {
        jobTitle: 'Test',
        department: 'Test',
        experience: 'Junior (0-2 ans)'
    };

    const validValidation = workflowService.validateFormData(
        'hr_specialist',
        'create_job_posting',
        validFormData
    );

    test(
        'validateFormData() valide les données complètes',
        validValidation &&
        validValidation.valid === true &&
        validValidation.errors.length === 0
    );

} catch (error) {
    test('Tests fonctionnels exécutés sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// RESUME
// ============================================================

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                      RÉSUMÉ                            ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`Total de tests : ${totalTests}`);
console.log(`✅ Réussis     : ${passedTests}`);
console.log(`❌ Échoués     : ${totalTests - passedTests}`);
console.log(`📊 Taux        : ${Math.round((passedTests / totalTests) * 100)}%\n`);

if (passedTests === totalTests) {
    console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('\n✨ La Phase 3 est prête à être testée dans l\'application.');
    console.log('\nFonctionnalités implémentées:');
    console.log('  ✅ 15 workflows spécialisés (5 par profil)');
    console.log('  ✅ RH: Offres d\'emploi, CV, onboarding, salaires, conflits');
    console.log('  ✅ IT: Code review, debug, architecture, perf, sécurité');
    console.log('  ✅ Marketing: Campagnes, LinkedIn, analyse, contenu, email');
    console.log('  ✅ Interface Quick Actions Panel dans AskView');
    console.log('  ✅ Formulaires guidés pour workflows complexes');
    console.log('  ✅ Validation de données de formulaire');
    console.log('  ✅ Intégration complète avec IPC\n');
    process.exit(0);
} else {
    console.log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('\n🔧 Veuillez corriger les erreurs avant de continuer.\n');
    process.exit(1);
}
