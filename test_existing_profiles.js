/**
 * Test et analyse des profils existants (RH, IT, Marketing, Assistant)
 * Vérification de cohérence avec les nouveaux profils
 */

const { profilePrompts } = require('./src/features/common/prompts/promptTemplates');
const { getWorkflowsForProfile, getWorkflowIds } = require('./src/features/common/prompts/workflowTemplates');

console.log('\n🔍 ============================================');
console.log('   ANALYSE DES PROFILS EXISTANTS');
console.log('   Comparaison avec les nouveaux profils');
console.log('   ============================================\n');

// Profils à analyser
const existingProfiles = ['lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert'];
const newProfiles = ['ceo_advisor', 'sales_expert', 'manager_coach'];

// Test 1: Structure des prompts
console.log('📋 Test 1: Structure et complétude des prompts');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const requiredSections = ['intro', 'formatRequirements', 'searchUsage', 'content', 'outputInstructions'];
let structureOK = true;

function analyzePrompt(profileId, isNew = false) {
    console.log(`\n${isNew ? '🆕' : '📦'} ${profileId.toUpperCase()}`);
    console.log('   ' + '─'.repeat(50));

    const prompt = profilePrompts[profileId];

    if (!prompt) {
        console.log('   ❌ Prompt non trouvé');
        structureOK = false;
        return null;
    }

    const stats = {
        profileId,
        isNew,
        sections: {},
        totalLength: 0,
        hasLucyIntro: false,
        hasFrenchConstraint: false,
        capabilities: 0
    };

    // Vérifier chaque section
    requiredSections.forEach(section => {
        if (prompt[section]) {
            const length = prompt[section].length;
            stats.sections[section] = length;
            stats.totalLength += length;
            console.log(`   ✅ ${section}: ${length} caractères`);
        } else {
            console.log(`   ❌ ${section}: MANQUANT`);
            structureOK = false;
        }
    });

    // Analyser l'intro
    if (prompt.intro) {
        stats.hasLucyIntro = prompt.intro.includes('Lucy');
        stats.hasFrenchConstraint = prompt.intro.toLowerCase().includes('français');

        if (stats.hasLucyIntro) {
            console.log(`   ✅ Présentation "Lucy"`);
        } else {
            console.log(`   ⚠️  Pas de présentation "Lucy" (générique)`);
        }

        if (stats.hasFrenchConstraint) {
            console.log(`   ✅ Contrainte de langue FR`);
        } else {
            console.log(`   ❌ Contrainte de langue FR absente`);
        }
    }

    // Analyser les capabilities
    if (prompt.formatRequirements) {
        const capabilitiesMatch = prompt.formatRequirements.match(/\d+\.\s+[A-Z_]+:/g);
        stats.capabilities = capabilitiesMatch ? capabilitiesMatch.length : 0;
        console.log(`   📊 Capabilities définies: ${stats.capabilities}`);
    }

    console.log(`   📏 Taille totale: ${stats.totalLength} caractères`);

    return stats;
}

console.log('\n═══════════════════════════════════════════');
console.log('PROFILS EXISTANTS');
console.log('═══════════════════════════════════════════');

const existingStats = {};
existingProfiles.forEach(profileId => {
    const stats = analyzePrompt(profileId, false);
    if (stats) existingStats[profileId] = stats;
});

console.log('\n═══════════════════════════════════════════');
console.log('NOUVEAUX PROFILS (référence)');
console.log('═══════════════════════════════════════════');

const newStats = {};
newProfiles.forEach(profileId => {
    const stats = analyzePrompt(profileId, true);
    if (stats) newStats[profileId] = stats;
});

console.log(`\n${structureOK ? '✅' : '❌'} Test 1: ${structureOK ? 'RÉUSSI' : 'ÉCHOUÉ'}\n`);

// Test 2: Comparaison des tailles de prompts
console.log('📋 Test 2: Comparaison des tailles de prompts');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const avgNewSize = Object.values(newStats).reduce((sum, s) => sum + s.totalLength, 0) / Object.values(newStats).length;
const avgExistingSize = Object.values(existingStats).reduce((sum, s) => sum + s.totalLength, 0) / Object.values(existingStats).length;

console.log(`📊 Statistiques de taille:`);
console.log(`   • Taille moyenne NOUVEAUX profils: ${Math.round(avgNewSize)} caractères`);
console.log(`   • Taille moyenne EXISTANTS profils: ${Math.round(avgExistingSize)} caractères`);
console.log(`   • Ratio: ${(avgNewSize / avgExistingSize).toFixed(2)}x plus détaillés`);

console.log(`\n📈 Détail par profil EXISTANT:`);
Object.entries(existingStats).forEach(([profileId, stats]) => {
    const ratio = (stats.totalLength / avgNewSize * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(ratio / 5));
    console.log(`   ${profileId.padEnd(20)} ${stats.totalLength.toString().padStart(5)} chars ${bar} (${ratio}%)`);
});

console.log(`\n📈 Détail par profil NOUVEAU (référence):`);
Object.entries(newStats).forEach(([profileId, stats]) => {
    const ratio = (stats.totalLength / avgNewSize * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(ratio / 5));
    console.log(`   ${profileId.padEnd(20)} ${stats.totalLength.toString().padStart(5)} chars ${bar} (${ratio}%)`);
});

// Test 3: Workflows par profil
console.log('\n\n📋 Test 3: Workflows disponibles par profil');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function analyzeWorkflows(profileId) {
    const workflows = getWorkflowsForProfile(profileId);
    const workflowIds = getWorkflowIds(profileId);

    console.log(`\n🔍 ${profileId}`);
    console.log(`   Workflows: ${workflowIds.length}`);

    if (workflowIds.length > 0) {
        workflowIds.forEach((wId, index) => {
            const w = workflows[wId];
            console.log(`   ${index + 1}. ${w.icon} ${w.title} (${w.category})`);
        });
    } else {
        console.log(`   ⚠️  Aucun workflow défini`);
    }

    return workflowIds.length;
}

console.log('═══════════════════════════════════════════');
console.log('PROFILS EXISTANTS');
console.log('═══════════════════════════════════════════');

const existingWorkflowCounts = {};
existingProfiles.forEach(profileId => {
    existingWorkflowCounts[profileId] = analyzeWorkflows(profileId);
});

console.log('\n═══════════════════════════════════════════');
console.log('NOUVEAUX PROFILS (référence)');
console.log('═══════════════════════════════════════════');

const newWorkflowCounts = {};
newProfiles.forEach(profileId => {
    newWorkflowCounts[profileId] = analyzeWorkflows(profileId);
});

// Test 4: Cohérence de naming et personnalité
console.log('\n\n📋 Test 4: Cohérence de personnalité et naming');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let personalityOK = true;

console.log('🎭 Analyse de la personnalité "Lucy":\n');

existingProfiles.forEach(profileId => {
    const stats = existingStats[profileId];
    const prompt = profilePrompts[profileId];

    console.log(`   ${profileId}:`);

    if (stats.hasLucyIntro) {
        // Extraire la description de Lucy
        const match = prompt.intro.match(/Tu es Lucy, (.*?)\./);
        if (match) {
            console.log(`      ✅ "Lucy, ${match[1]}"`);
        }
    } else {
        console.log(`      ⚠️  Pas de personnalité "Lucy" (profil générique)`);
        if (profileId !== 'lucide_assistant') {
            personalityOK = false;
        }
    }

    if (stats.hasFrenchConstraint) {
        console.log(`      ✅ Contrainte FR présente`);
    } else {
        console.log(`      ❌ Contrainte FR absente`);
        personalityOK = false;
    }
});

console.log(`\n${personalityOK ? '✅' : '⚠️'} Test 4: ${personalityOK ? 'RÉUSSI' : 'ATTENTION REQUISE'}\n`);

// Test 5: Richesse du contenu
console.log('📋 Test 5: Richesse du contenu et examples');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function analyzeContentRichness(profileId) {
    const prompt = profilePrompts[profileId];
    if (!prompt) return { score: 0, details: {} };

    const details = {
        hasFrameworks: false,
        hasExamples: false,
        hasStepByStep: false,
        hasBulletPoints: false,
        hasCodeBlocks: false
    };

    const content = prompt.content || '';

    // Recherche de frameworks mentionnés
    details.hasFrameworks = /SWOT|BANT|MEDDIC|SBI|OKR|Porter|RACI/i.test(content);

    // Recherche d'exemples
    details.hasExamples = /example|par exemple|e\.g\.|for instance/i.test(content) ||
                          /\*\*Example/i.test(content);

    // Recherche de step-by-step
    details.hasStepByStep = /1\.|2\.|3\.|step|étape/i.test(content);

    // Recherche de bullet points structurés
    details.hasBulletPoints = /- \*\*/.test(content) || /\*\s+\*\*/.test(content);

    // Recherche de code blocks
    details.hasCodeBlocks = /```/.test(content);

    const score = Object.values(details).filter(Boolean).length;

    return { score, details };
}

console.log('🎯 Richesse du contenu (0-5):\n');

const richnessScores = {};

existingProfiles.forEach(profileId => {
    const richness = analyzeContentRichness(profileId);
    richnessScores[profileId] = richness;

    console.log(`   ${profileId}:`);
    console.log(`      Score: ${richness.score}/5 ${'⭐'.repeat(richness.score)}`);
    console.log(`      ${richness.details.hasFrameworks ? '✅' : '❌'} Frameworks mentionnés`);
    console.log(`      ${richness.details.hasExamples ? '✅' : '❌'} Exemples fournis`);
    console.log(`      ${richness.details.hasStepByStep ? '✅' : '❌'} Instructions step-by-step`);
    console.log(`      ${richness.details.hasBulletPoints ? '✅' : '❌'} Bullet points structurés`);
    console.log(`      ${richness.details.hasCodeBlocks ? '✅' : '❌'} Code blocks (si applicable)`);
});

console.log('\n   NOUVEAUX profils (référence):\n');
newProfiles.forEach(profileId => {
    const richness = analyzeContentRichness(profileId);
    console.log(`   ${profileId}: ${richness.score}/5 ${'⭐'.repeat(richness.score)}`);
});

// Résumé final
console.log('\n\n🏁 ============================================');
console.log('   RÉSUMÉ DE L\'ANALYSE');
console.log('   ============================================\n');

console.log('📊 MÉTRIQUES COMPARATIVES:\n');

console.log('   Taille des prompts:');
console.log(`      • Nouveaux profils: ${Math.round(avgNewSize)} chars (moyenne)`);
console.log(`      • Profils existants: ${Math.round(avgExistingSize)} chars (moyenne)`);
console.log(`      • Gap: ${((avgNewSize - avgExistingSize) / avgExistingSize * 100).toFixed(0)}% plus détaillés\n`);

console.log('   Workflows:');
const avgNewWorkflows = Object.values(newWorkflowCounts).reduce((s, c) => s + c, 0) / Object.values(newWorkflowCounts).length;
const avgExistingWorkflows = Object.values(existingWorkflowCounts).reduce((s, c) => s + c, 0) / existingProfiles.filter(p => p !== 'lucide_assistant').length;
console.log(`      • Nouveaux profils: ${avgNewWorkflows} workflows (moyenne)`);
console.log(`      • Profils existants: ${avgExistingWorkflows.toFixed(1)} workflows (moyenne, hors assistant)\n`);

console.log('   Richesse du contenu:');
const avgNewRichness = newProfiles.reduce((sum, p) => sum + analyzeContentRichness(p).score, 0) / newProfiles.length;
const avgExistingRichness = Object.values(richnessScores).reduce((sum, r) => sum + r.score, 0) / existingProfiles.length;
console.log(`      • Nouveaux profils: ${avgNewRichness.toFixed(1)}/5 (moyenne)`);
console.log(`      • Profils existants: ${avgExistingRichness.toFixed(1)}/5 (moyenne)\n`);

console.log('🎯 RECOMMANDATIONS:\n');

// Analyser chaque profil existant
existingProfiles.forEach(profileId => {
    const stats = existingStats[profileId];
    const workflows = existingWorkflowCounts[profileId];
    const richness = richnessScores[profileId];

    console.log(`   ${profileId}:`);

    if (profileId === 'lucide_assistant') {
        console.log(`      • Profil générique OK (pas de workflows)`);
        console.log(`      • Considérer: Enrichir le prompt pour plus de guidance`);
    } else {
        const issues = [];

        if (stats.totalLength < avgNewSize * 0.6) {
            issues.push(`Prompt trop court (${((stats.totalLength / avgNewSize) * 100).toFixed(0)}% de la cible)`);
        }

        if (workflows < 5) {
            issues.push(`Peu de workflows (${workflows} vs 6 pour nouveaux profils)`);
        }

        if (richness.score < 3) {
            issues.push(`Contenu peu détaillé (${richness.score}/5)`);
        }

        if (!stats.hasFrenchConstraint) {
            issues.push('Contrainte FR manquante');
        }

        if (issues.length > 0) {
            console.log(`      ⚠️  À améliorer:`);
            issues.forEach(issue => console.log(`         - ${issue}`));
        } else {
            console.log(`      ✅ Qualité satisfaisante`);
        }
    }
});

console.log('\n📝 CONCLUSION:\n');
console.log('   Les nouveaux profils (CEO, Sales, Manager) sont significativement');
console.log('   plus détaillés et riches que les profils existants.');
console.log('');
console.log('   Pour une expérience cohérente, il est recommandé d\'enrichir');
console.log('   les prompts RH, IT et Marketing au même niveau de détail.\n');

process.exit(0);
