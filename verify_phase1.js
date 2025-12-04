#!/usr/bin/env node

/**
 * Script de vérification automatique - Phase 1
 * Vérifie que tous les composants du système de profils sont correctement installés
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   VÉRIFICATION PHASE 1 - SYSTÈME DE PROFILS LUCY      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

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
        failedTests++;
        return false;
    }
}

function section(name) {
    console.log(`\n━━━ ${name} ━━━`);
}

// ============================================================
// VÉRIFICATION DES FICHIERS
// ============================================================

section('📁 Vérification des fichiers');

test(
    'agentProfileService.js existe',
    fs.existsSync('./src/features/common/services/agentProfileService.js')
);

test(
    'promptTemplates.js existe',
    fs.existsSync('./src/features/common/prompts/promptTemplates.js')
);

test(
    'schema.js existe',
    fs.existsSync('./src/features/common/config/schema.js')
);

test(
    'askService.js existe',
    fs.existsSync('./src/features/ask/askService.js')
);

test(
    'featureBridge.js existe',
    fs.existsSync('./src/bridge/featureBridge.js')
);

test(
    'SettingsView.js existe',
    fs.existsSync('./src/ui/settings/SettingsView.js')
);

// ============================================================
// VÉRIFICATION DU CODE
// ============================================================

section('🔍 Vérification du contenu des fichiers');

// Vérifier promptTemplates.js
try {
    const promptTemplates = require('./src/features/common/prompts/promptTemplates.js');
    const profiles = promptTemplates.profilePrompts;

    test(
        'promptTemplates.js exporte profilePrompts',
        !!profiles
    );

    test(
        'Profil hr_specialist existe',
        !!profiles.hr_specialist,
        `Intro: ${profiles.hr_specialist?.intro?.substring(0, 50)}...`
    );

    test(
        'Profil it_expert existe',
        !!profiles.it_expert,
        `Intro: ${profiles.it_expert?.intro?.substring(0, 50)}...`
    );

    test(
        'Profil marketing_expert existe',
        !!profiles.marketing_expert,
        `Intro: ${profiles.marketing_expert?.intro?.substring(0, 50)}...`
    );

    test(
        'Profil lucide_assistant existe (défaut)',
        !!profiles.lucide_assistant
    );

    // Vérifier la structure de chaque profil
    const requiredFields = ['intro', 'formatRequirements', 'searchUsage', 'content', 'outputInstructions'];
    let allStructuresValid = true;

    for (const [profileId, profile] of Object.entries(profiles)) {
        const missingFields = requiredFields.filter(field => !profile[field]);
        if (missingFields.length > 0) {
            allStructuresValid = false;
            console.log(`   ⚠️  ${profileId} manque: ${missingFields.join(', ')}`);
        }
    }

    test(
        'Tous les profils ont la structure complète',
        allStructuresValid
    );

} catch (error) {
    test(
        'promptTemplates.js charge sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// Vérifier agentProfileService.js
try {
    const agentProfileService = require('./src/features/common/services/agentProfileService.js');

    test(
        'agentProfileService exporte un objet',
        typeof agentProfileService === 'object'
    );

    test(
        'agentProfileService.getAvailableProfiles() existe',
        typeof agentProfileService.getAvailableProfiles === 'function'
    );

    test(
        'agentProfileService.getCurrentProfile() existe',
        typeof agentProfileService.getCurrentProfile === 'function'
    );

    test(
        'agentProfileService.setActiveProfile() existe',
        typeof agentProfileService.setActiveProfile === 'function'
    );

    const availableProfiles = agentProfileService.getAvailableProfiles();
    test(
        'getAvailableProfiles() retourne un tableau',
        Array.isArray(availableProfiles),
        `Trouvé: ${availableProfiles.length} profils`
    );

    test(
        '4 profils sont disponibles',
        availableProfiles.length === 4,
        `Profils: ${availableProfiles.map(p => p.id).join(', ')}`
    );

    const currentProfile = agentProfileService.getCurrentProfile();
    test(
        'getCurrentProfile() retourne un ID',
        typeof currentProfile === 'string' && currentProfile.length > 0,
        `Profil actuel: ${currentProfile}`
    );

} catch (error) {
    test(
        'agentProfileService.js charge sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// Vérifier schema.js
try {
    const schema = require('./src/features/common/config/schema.js');

    test(
        'schema.js exporte LATEST_SCHEMA',
        !!schema && !!schema.users
    );

    const usersColumns = schema.users.columns;
    const hasProfileColumn = usersColumns.some(col => col.name === 'active_agent_profile');

    test(
        'Colonne active_agent_profile existe dans users',
        hasProfileColumn,
        `Colonnes users: ${usersColumns.map(c => c.name).join(', ')}`
    );

    if (hasProfileColumn) {
        const profileColumn = usersColumns.find(col => col.name === 'active_agent_profile');
        test(
            'active_agent_profile a une valeur par défaut',
            profileColumn.type.includes("DEFAULT 'lucide_assistant'"),
            `Type: ${profileColumn.type}`
        );
    }

} catch (error) {
    test(
        'schema.js charge sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// Vérifier askService.js
try {
    const askServiceContent = fs.readFileSync('./src/features/ask/askService.js', 'utf-8');

    test(
        'askService.js importe agentProfileService',
        askServiceContent.includes("require('../common/services/agentProfileService')")
    );

    test(
        'askService.js utilise getCurrentProfile()',
        askServiceContent.includes('agentProfileService.getCurrentProfile()')
    );

    test(
        'askService.js passe le profil à getSystemPrompt',
        askServiceContent.includes('const systemPrompt = getSystemPrompt(activeProfile')
    );

} catch (error) {
    test(
        'askService.js analyse sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// Vérifier featureBridge.js
try {
    const bridgeContent = fs.readFileSync('./src/bridge/featureBridge.js', 'utf-8');

    test(
        'featureBridge.js importe agentProfileService',
        bridgeContent.includes("require('../features/common/services/agentProfileService')")
    );

    test(
        'Handler agent:get-available-profiles existe',
        bridgeContent.includes("ipcMain.handle('agent:get-available-profiles'")
    );

    test(
        'Handler agent:get-active-profile existe',
        bridgeContent.includes("ipcMain.handle('agent:get-active-profile'")
    );

    test(
        'Handler agent:set-active-profile existe',
        bridgeContent.includes("ipcMain.handle('agent:set-active-profile'")
    );

} catch (error) {
    test(
        'featureBridge.js analyse sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// Vérifier preload.js
try {
    const preloadContent = fs.readFileSync('./src/preload.js', 'utf-8');

    test(
        'preload.js expose getAvailableProfiles API',
        preloadContent.includes('getAvailableProfiles: ()')
    );

    test(
        'preload.js expose getActiveProfile API',
        preloadContent.includes('getActiveProfile: ()')
    );

    test(
        'preload.js expose setActiveProfile API',
        preloadContent.includes('setActiveProfile: (profileId)')
    );

} catch (error) {
    test(
        'preload.js analyse sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// Vérifier SettingsView.js
try {
    const settingsContent = fs.readFileSync('./src/ui/settings/SettingsView.js', 'utf-8');

    test(
        'SettingsView.js déclare availableProfiles property',
        settingsContent.includes('availableProfiles: { type: Array')
    );

    test(
        'SettingsView.js déclare activeProfile property',
        settingsContent.includes('activeProfile: { type: String')
    );

    test(
        'SettingsView.js charge les profils dans loadInitialData',
        settingsContent.includes('getAvailableProfiles()') &&
        settingsContent.includes('getActiveProfile()')
    );

    test(
        'SettingsView.js a handleProfileSelect method',
        settingsContent.includes('handleProfileSelect(profileId)')
    );

    test(
        'SettingsView.js affiche la section "Mode de Lucy"',
        settingsContent.includes('Mode de Lucy')
    );

} catch (error) {
    test(
        'SettingsView.js analyse sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// ============================================================
// VÉRIFICATION DES PROMPTS
// ============================================================

section('💬 Vérification de la génération de prompts');

try {
    const { getSystemPrompt } = require('./src/features/common/prompts/promptBuilder.js');

    const profiles = ['lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert'];

    for (const profileId of profiles) {
        const prompt = getSystemPrompt(profileId, 'Test context', false);
        test(
            `Prompt généré pour ${profileId}`,
            prompt && prompt.length > 100,
            `Longueur: ${prompt.length} caractères`
        );
    }

} catch (error) {
    test(
        'Génération de prompts sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// ============================================================
// RÉSUMÉ
// ============================================================

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                      RÉSUMÉ                            ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`Total de tests : ${totalTests}`);
console.log(`✅ Réussis     : ${passedTests}`);
console.log(`❌ Échoués     : ${failedTests}`);
console.log(`📊 Taux        : ${Math.round((passedTests / totalTests) * 100)}%\n`);

if (failedTests === 0) {
    console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('\n✨ La Phase 1 est prête à être testée dans l\'application.');
    console.log('📖 Consultez PHASE1_TEST_GUIDE.md pour les tests manuels.\n');
    process.exit(0);
} else {
    console.log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('\n🔧 Veuillez corriger les erreurs avant de continuer.\n');
    process.exit(1);
}
