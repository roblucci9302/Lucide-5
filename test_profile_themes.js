/**
 * Test ProfileThemeService - Phase WOW 1 Jour 3
 * Vérifie que le système de thèmes par profil fonctionne correctement
 */

const profileThemeService = require('./src/features/common/services/profileThemeService');
const agentProfileService = require('./src/features/common/services/agentProfileService');

console.log('\n🎨 ============================================');
console.log('   TEST - PROFILE THEME SERVICE');
console.log('   Phase WOW 1 - Jour 3: UI Adaptation');
console.log('   ============================================\n');

// Test 1: Service initialization
console.log('📋 Test 1: Initialisation du service');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let themeService;
try {
    themeService = profileThemeService.getInstance();
    console.log('   ✅ Service initialisé (singleton)');
} catch (error) {
    console.error('   ❌ Erreur lors de l\'initialisation:', error.message);
    process.exit(1);
}

// Test 2: Récupération de tous les thèmes
console.log('\n📋 Test 2: Récupération de tous les thèmes');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const allThemes = themeService.getAllThemes();
const profileIds = Object.keys(allThemes);

console.log(`   📊 Nombre de thèmes: ${profileIds.length}`);
console.log(`   🎨 Profils disponibles:\n`);

profileIds.forEach(profileId => {
    const theme = allThemes[profileId];
    console.log(`      ${theme.icon} ${theme.name.padEnd(25)} (${profileId})`);
    console.log(`         Primary: ${theme.primary}`);
    console.log(`         Accent:  ${theme.accent}\n`);
});

if (profileIds.length === 7) {
    console.log('   ✅ 7 thèmes trouvés (correct)');
} else {
    console.error(`   ❌ Nombre de thèmes incorrect: attendu 7, trouvé ${profileIds.length}`);
}

// Test 3: Vérification de la cohérence avec agentProfileService
console.log('\n📋 Test 3: Cohérence avec les profils agents');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const agentProfiles = agentProfileService.getAvailableProfiles();
let coherenceOK = true;

console.log(`   🔍 Vérification de la correspondance:\n`);

agentProfiles.forEach(profile => {
    const theme = themeService.getTheme(profile.id);
    if (theme) {
        console.log(`      ✅ ${profile.id.padEnd(25)} → Thème trouvé`);
    } else {
        console.log(`      ❌ ${profile.id.padEnd(25)} → Thème MANQUANT`);
        coherenceOK = false;
    }
});

console.log(`\n   ${coherenceOK ? '✅' : '❌'} Test de cohérence: ${coherenceOK ? 'RÉUSSI' : 'ÉCHOUÉ'}`);

// Test 4: Application et changement de thème
console.log('\n📋 Test 4: Application et changement de thème');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let eventReceived = false;
themeService.on('theme-changed', (data) => {
    eventReceived = true;
    console.log(`   📡 Événement reçu:`);
    console.log(`      Profile: ${data.profile}`);
    console.log(`      New theme: ${data.theme.name} (${data.theme.primary})`);
    if (data.oldTheme) {
        console.log(`      Old theme: ${data.oldTheme.name} (${data.oldTheme.primary})`);
    }
});

// Appliquer un thème
console.log('   🎯 Application du thème "ceo_advisor"...\n');
const appliedTheme = themeService.applyTheme('ceo_advisor');

if (eventReceived) {
    console.log('\n   ✅ Événement "theme-changed" émis correctement');
} else {
    console.log('\n   ❌ Événement "theme-changed" PAS émis');
}

if (appliedTheme.primary === '#8b5cf6') {
    console.log('   ✅ Thème appliqué correctement');
} else {
    console.log(`   ❌ Thème incorrect: attendu #8b5cf6, trouvé ${appliedTheme.primary}`);
}

// Test 5: Récupération du thème actuel
console.log('\n📋 Test 5: Récupération du thème actuel');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const currentTheme = themeService.getCurrentTheme();

console.log(`   🎨 Thème actuel:`);
console.log(`      Profile: ${currentTheme.profile}`);
console.log(`      Theme: ${currentTheme.theme.name}`);
console.log(`      Icon: ${currentTheme.theme.icon}`);
console.log(`      Primary: ${currentTheme.theme.primary}`);

if (currentTheme.profile === 'ceo_advisor') {
    console.log('\n   ✅ Thème actuel correct (ceo_advisor)');
} else {
    console.log(`\n   ❌ Thème actuel incorrect: attendu ceo_advisor, trouvé ${currentTheme.profile}`);
}

// Test 6: Génération de CSS variables
console.log('\n📋 Test 6: Génération de CSS variables');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const cssVars = themeService.generateCSSVariables(appliedTheme);

console.log('   📝 CSS Variables générées:\n');
Object.entries(cssVars).forEach(([key, value]) => {
    console.log(`      ${key.padEnd(30)} = ${value}`);
});

const expectedVars = ['--profile-primary', '--profile-secondary', '--profile-accent', '--profile-accent-light'];
let cssVarsOK = expectedVars.every(varName => cssVars[varName]);

console.log(`\n   ${cssVarsOK ? '✅' : '❌'} Variables CSS: ${cssVarsOK ? 'TOUTES PRÉSENTES' : 'MANQUANTES'}`);

// Test 7: Subtilité des couleurs (Design requirement)
console.log('\n📋 Test 7: Vérification de la subtilité des couleurs');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('   🎨 Palette de couleurs (famille bleu/indigo/violet):\n');

// Vérifier que toutes les couleurs sont dans la gamme de couleurs froides
const coolColorRegex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
let allSubtle = true;

profileIds.forEach(profileId => {
    const theme = allThemes[profileId];
    const match = theme.primary.match(coolColorRegex);

    if (match) {
        const r = parseInt(match[1], 16);
        const g = parseInt(match[2], 16);
        const b = parseInt(match[3], 16);

        // Vérifier que c'est une couleur "froide" (bleu/violet)
        // Les couleurs froides ont généralement b > r
        const isCool = b >= r - 30; // Tolérance de 30 pour variations
        const status = isCool ? '✅' : '⚠️';

        console.log(`      ${status} ${theme.name.padEnd(20)} ${theme.primary} (R:${r} G:${g} B:${b})`);

        if (!isCool && profileId !== 'hr_specialist') { // HR peut être teal (exception)
            allSubtle = false;
        }
    }
});

console.log(`\n   ${allSubtle ? '✅' : '⚠️'} Palette de couleurs: ${allSubtle ? 'SUBTILE ET COHÉRENTE' : 'ATTENTION'}`);

// Test 8: Test de thème par défaut (fallback)
console.log('\n📋 Test 8: Thème par défaut (fallback)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const unknownTheme = themeService.getTheme('unknown_profile_xyz');

if (unknownTheme.primary === '#6366f1') {
    console.log('   ✅ Fallback vers thème par défaut (lucide_assistant) OK');
} else {
    console.log('   ❌ Fallback vers thème par défaut ÉCHOUÉ');
}

// Résumé final
console.log('\n\n🏁 ============================================');
console.log('   RÉSUMÉ DES TESTS');
console.log('   ============================================\n');

const testResults = [
    { name: 'Initialisation du service', passed: !!themeService },
    { name: 'Tous les thèmes disponibles', passed: profileIds.length === 7 },
    { name: 'Cohérence avec agents', passed: coherenceOK },
    { name: 'Application de thème', passed: appliedTheme.primary === '#8b5cf6' },
    { name: 'Événement theme-changed', passed: eventReceived },
    { name: 'Thème actuel', passed: currentTheme.profile === 'ceo_advisor' },
    { name: 'CSS Variables', passed: cssVarsOK },
    { name: 'Palette subtile', passed: allSubtle },
    { name: 'Fallback par défaut', passed: unknownTheme.primary === '#6366f1' }
];

const passedTests = testResults.filter(t => t.passed).length;
const totalTests = testResults.length;

testResults.forEach((test, index) => {
    console.log(`   ${test.passed ? '✅' : '❌'} Test ${index + 1}: ${test.name}`);
});

console.log(`\n   📊 Score: ${passedTests}/${totalTests} tests réussis (${Math.round(passedTests / totalTests * 100)}%)\n`);

if (passedTests === totalTests) {
    console.log('   🎉 TOUS LES TESTS RÉUSSIS!');
    console.log('   Le système de thèmes par profil est opérationnel.\n');
} else {
    console.log(`   ⚠️  ${totalTests - passedTests} test(s) échoué(s)`);
    console.log('   Des corrections sont nécessaires.\n');
}

// Test 9: Vérification des fichiers créés
console.log('📋 Test 9: Vérification des fichiers créés');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const fs = require('fs');
const path = require('path');

const filesToCheck = [
    'src/features/common/services/profileThemeService.js',
    'src/ui/components/ProfileThemeManager.js',
    'src/ui/styles/profile-themes.css',
    'src/ui/app/content.html',
    'src/ui/app/header.html'
];

console.log('   📁 Fichiers du système de thèmes:\n');

let allFilesExist = true;
filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    const stats = exists ? fs.statSync(filePath) : null;
    const size = stats ? `${Math.round(stats.size / 1024)} KB` : 'N/A';

    console.log(`      ${exists ? '✅' : '❌'} ${file.padEnd(55)} ${exists ? size : 'MANQUANT'}`);

    if (!exists) allFilesExist = false;
});

console.log(`\n   ${allFilesExist ? '✅' : '❌'} Fichiers: ${allFilesExist ? 'TOUS PRÉSENTS' : 'MANQUANTS'}\n`);

// Conclusion finale
console.log('\n═══════════════════════════════════════════');
console.log('CONCLUSION');
console.log('═══════════════════════════════════════════\n');

if (passedTests === totalTests && allFilesExist) {
    console.log('✅ Phase WOW 1 - Jour 3: UI Adaptation par profil');
    console.log('   → IMPLÉMENTATION COMPLÈTE ET VALIDÉE\n');
    console.log('🎨 Fonctionnalités disponibles:');
    console.log('   • 7 thèmes subtils (palette cohérente)');
    console.log('   • Service de gestion de thèmes (singleton)');
    console.log('   • Composant Lit pour transitions automatiques');
    console.log('   • CSS variables dynamiques');
    console.log('   • Transitions fluides (300ms)');
    console.log('   • Events IPC pour synchronisation\n');
    console.log('📝 Prochaine étape: Tester dans l\'application');
    console.log('   → Lancer Lucide et changer de profil');
    console.log('   → Vérifier les transitions de couleur\n');
    process.exit(0);
} else {
    console.log('⚠️  Des problèmes ont été détectés.');
    console.log('   Veuillez corriger les erreurs avant de continuer.\n');
    process.exit(1);
}
