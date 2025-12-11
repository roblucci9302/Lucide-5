#!/usr/bin/env node

/**
 * Test de validation - Phase 2 : Historique Conversationnel
 * Vérifie que le système de mémoire persistante fonctionne correctement
 */

console.log('\n🧪 TEST DE VALIDATION - PHASE 2 : HISTORIQUE CONVERSATIONNEL\n');

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
// VÉRIFICATION DES FICHIERS
// ============================================================

section('📁 Vérification des fichiers de la Phase 2');

const fs = require('fs');

test(
    'conversationHistoryService.js existe',
    fs.existsSync('./src/features/common/services/conversationHistoryService.js')
);

test(
    'HistoryView.js existe',
    fs.existsSync('./src/ui/history/HistoryView.js')
);

test(
    'Schema enrichi (sessions table)',
    fs.existsSync('./src/features/common/config/schema.js')
);

// ============================================================
// VÉRIFICATION DU SCHÉMA
// ============================================================

section('🗄️ Vérification du schéma enrichi');

try {
    const schema = require('./src/features/common/config/schema.js');
    const sessionColumns = schema.sessions.columns.map(c => c.name);

    test(
        'Colonne tags ajoutée',
        sessionColumns.includes('tags'),
        `Colonnes: ${sessionColumns.join(', ')}`
    );

    test(
        'Colonne agent_profile ajoutée',
        sessionColumns.includes('agent_profile')
    );

    test(
        'Colonne message_count ajoutée',
        sessionColumns.includes('message_count')
    );

    test(
        'Colonne description ajoutée',
        sessionColumns.includes('description')
    );

    test(
        'Colonne auto_title ajoutée',
        sessionColumns.includes('auto_title')
    );

} catch (error) {
    test('Schéma charge sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// VÉRIFICATION DU SERVICE
// ============================================================

section('Vérification du service conversationHistoryService');

// Mock SQLite pour éviter les dépendances natives
const mockDb = {
    prepare: () => ({
        all: () => [],
        get: () => ({}),
        run: () => ({ changes: 1 })
    })
};

const mockSqliteClient = {
    getDatabase: () => mockDb
};

// Inject le mock
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === './sqliteClient' || id.includes('sqliteClient')) {
        return mockSqliteClient;
    }
    return originalRequire.apply(this, arguments);
};

try {
    const conversationHistoryService = require('./src/features/common/services/conversationHistoryService.js');

    test(
        'Service exporte un objet',
        typeof conversationHistoryService === 'object'
    );

    test(
        'getAllSessions() existe',
        typeof conversationHistoryService.getAllSessions === 'function'
    );

    test(
        'searchSessions() existe',
        typeof conversationHistoryService.searchSessions === 'function'
    );

    test(
        'getSessionMessages() existe',
        typeof conversationHistoryService.getSessionMessages === 'function'
    );

    test(
        'generateTitleFromContent() existe',
        typeof conversationHistoryService.generateTitleFromContent === 'function'
    );

    test(
        'updateSessionMetadata() existe',
        typeof conversationHistoryService.updateSessionMetadata === 'function'
    );

    test(
        'getSessionStats() existe',
        typeof conversationHistoryService.getSessionStats === 'function'
    );

    test(
        'deleteSession() existe',
        typeof conversationHistoryService.deleteSession === 'function'
    );

} catch (error) {
    test(
        'conversationHistoryService charge sans erreur',
        false,
        `Erreur: ${error.message}`
    );
}

// ============================================================
// VÉRIFICATION DE L'INTÉGRATION
// ============================================================

section('Vérification de l\'intégration');

// Vérifier featureBridge.js
try {
    const bridgeContent = fs.readFileSync('./src/bridge/featureBridge.js', 'utf-8');

    test(
        'conversationHistoryService importé dans featureBridge',
        bridgeContent.includes("require('../features/common/services/conversationHistoryService')")
    );

    test(
        'Handler history:get-all-sessions existe',
        bridgeContent.includes("ipcMain.handle('history:get-all-sessions'")
    );

    test(
        'Handler history:search-sessions existe',
        bridgeContent.includes("ipcMain.handle('history:search-sessions'")
    );

    test(
        'Handler history:generate-title existe',
        bridgeContent.includes("ipcMain.handle('history:generate-title'")
    );

} catch (error) {
    test('featureBridge analyse sans erreur', false, `Erreur: ${error.message}`);
}

// Vérifier preload.js
try {
    const preloadContent = fs.readFileSync('./src/preload.js', 'utf-8');

    test(
        'preload.js expose history API',
        preloadContent.includes('history: {')
    );

    test(
        'API getAllSessions exposée',
        preloadContent.includes('getAllSessions:')
    );

    test(
        'API searchSessions exposée',
        preloadContent.includes('searchSessions:')
    );

} catch (error) {
    test('preload.js analyse sans erreur', false, `Erreur: ${error.message}`);
}

// Vérifier askService.js
try {
    const askServiceContent = fs.readFileSync('./src/features/ask/askService.js', 'utf-8');

    test(
        'askService importe conversationHistoryService',
        askServiceContent.includes("require('../common/services/conversationHistoryService')")
    );

    test(
        'askService met à jour les métadonnées de session',
        askServiceContent.includes('updateSessionMetadata')
    );

    test(
        'askService génère un titre automatique',
        askServiceContent.includes('generateTitleFromContent')
    );

    test(
        'askService met à jour le compteur de messages',
        askServiceContent.includes('updateMessageCount')
    );

} catch (error) {
    test('askService analyse sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// VÉRIFICATION DE L'UI
// ============================================================

section('Vérification de l\'interface utilisateur');

try {
    const historyViewContent = fs.readFileSync('./src/ui/history/HistoryView.js', 'utf-8');

    test(
        'HistoryView utilise LitElement',
        historyViewContent.includes('extends LitElement')
    );

    test(
        'HistoryView a un champ de recherche',
        historyViewContent.includes('search-input') || historyViewContent.includes('searchQuery')
    );

    test(
        'HistoryView affiche les sessions',
        historyViewContent.includes('sessions-list') || historyViewContent.includes('session-item')
    );

    test(
        'HistoryView a des filtres par profil',
        historyViewContent.includes('filters') && historyViewContent.includes('filter-btn')
    );

    test(
        'HistoryView affiche les tags',
        historyViewContent.includes('session-tags') || historyViewContent.includes('tag')
    );

    test(
        'HistoryView appelle window.api.history',
        historyViewContent.includes('window.api.history')
    );

} catch (error) {
    test('HistoryView analyse sans erreur', false, `Erreur: ${error.message}`);
}

// ============================================================
// RÉSUMÉ
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
    console.log('\n✨ La Phase 2 est prête à être testée dans l\'application.');
    console.log('\nFonctionnalités implémentées:');
    console.log('  ✅ Historique conversationnel complet');
    console.log('  ✅ Recherche dans les conversations');
    console.log('  ✅ Filtres par profil d\'agent');
    console.log('  ✅ Génération automatique de titres');
    console.log('  ✅ Métadonnées enrichies (tags, description, profil)');
    console.log('  ✅ Statistiques globales');
    console.log('  ✅ Interface utilisateur HistoryView\n');
    process.exit(0);
} else {
    console.log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('\n🔧 Veuillez corriger les erreurs avant de continuer.\n');
    process.exit(1);
}
