/**
 * Test léger des nouveaux profils CEO, Sales, Manager
 * Phase WOW 1 - Jour 2
 * Ne nécessite pas de base de données
 */

const { profilePrompts } = require('./src/features/common/prompts/promptTemplates');
const {
    getWorkflowsForProfile,
    getWorkflowIds,
    agentProfiles
} = require('./src/features/common/prompts/workflowTemplates');

console.log('\n🧪 ============================================');
console.log('   TEST DES NOUVEAUX PROFILS - Phase WOW 1');
console.log('   Version Lite (sans DB)');
console.log('   ============================================\n');

// Test 1: Vérifier que les 7 profils sont définis
console.log('📋 Test 1: Définition des profils');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const expectedProfiles = [
    'lucide_assistant',
    'hr_specialist',
    'it_expert',
    'marketing_expert',
    'ceo_advisor',
    'sales_expert',
    'manager_coach'
];

const newProfiles = ['ceo_advisor', 'sales_expert', 'manager_coach'];

let profilesOK = true;
expectedProfiles.forEach(profileId => {
    const hasWorkflows = getWorkflowIds(profileId).length > 0;
    const isNew = newProfiles.includes(profileId);

    if (hasWorkflows) {
        console.log(`  ✅ ${profileId} ${isNew ? '(NOUVEAU)' : ''}`);
    } else {
        console.log(`  ❌ Profil manquant: ${profileId}`);
        profilesOK = false;
    }
});

console.log(`\n${profilesOK ? '✅' : '❌'} Test 1: ${profilesOK ? 'RÉUSSI' : 'ÉCHOUÉ'}\n`);

// Test 2: Vérifier les prompts des nouveaux profils
console.log('📋 Test 2: Prompts des nouveaux profils');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let promptsOK = true;

newProfiles.forEach(profileId => {
    console.log(`\n🔍 Profil: ${profileId}`);
    console.log('   ─────────────────────────────────────');

    const promptTemplate = profilePrompts[profileId];

    if (!promptTemplate) {
        console.log(`   ❌ Prompt template manquant`);
        promptsOK = false;
        return;
    }

    // Vérifier les sections du prompt
    const sections = ['intro', 'formatRequirements', 'searchUsage', 'content', 'outputInstructions'];
    sections.forEach(section => {
        if (promptTemplate[section]) {
            const length = promptTemplate[section].length;
            console.log(`   ✅ ${section}: ${length} caractères`);
        } else {
            console.log(`   ❌ ${section}: MANQUANT`);
            promptsOK = false;
        }
    });

    // Vérifier que le prompt contient bien "français"
    const fullPrompt = Object.values(promptTemplate).join(' ');
    if (fullPrompt.toLowerCase().includes('français')) {
        console.log(`   ✅ Contrainte de langue FR présente`);
    } else {
        console.log(`   ⚠️  Contrainte de langue FR absente`);
    }
});

console.log(`\n${promptsOK ? '✅' : '❌'} Test 2: ${promptsOK ? 'RÉUSSI' : 'ÉCHOUÉ'}\n`);

// Test 3: Vérifier les workflows des nouveaux profils
console.log('📋 Test 3: Workflows des nouveaux profils');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let workflowsOK = true;

const expectedWorkflowCounts = {
    'ceo_advisor': 6,
    'sales_expert': 6,
    'manager_coach': 6
};

newProfiles.forEach(profileId => {
    console.log(`\n🔍 Profil: ${profileId}`);
    console.log('   ─────────────────────────────────────');

    const workflows = getWorkflowsForProfile(profileId);
    const workflowIds = getWorkflowIds(profileId);
    const expectedCount = expectedWorkflowCounts[profileId];

    console.log(`   Workflows attendus: ${expectedCount}`);
    console.log(`   Workflows trouvés: ${workflowIds.length}`);

    if (workflowIds.length === expectedCount) {
        console.log(`   ✅ Nombre correct de workflows`);
    } else {
        console.log(`   ❌ Nombre incorrect de workflows`);
        workflowsOK = false;
    }

    // Lister les workflows
    workflowIds.forEach(workflowId => {
        const workflow = workflows[workflowId];
        console.log(`\n   ${workflow.icon} ${workflow.title}`);
        console.log(`      ID: ${workflowId}`);
        console.log(`      Catégorie: ${workflow.category}`);
        console.log(`      Temps estimé: ${workflow.estimatedTime}`);
        console.log(`      Formulaire: ${workflow.hasForm ? 'Oui' : 'Non'}`);

        // Vérifier les champs obligatoires
        if (!workflow.prompt || workflow.prompt.length === 0) {
            console.log(`      ❌ Prompt manquant`);
            workflowsOK = false;
        } else {
            console.log(`      ✅ Prompt: ${workflow.prompt.length} caractères`);
        }
    });
});

console.log(`\n${workflowsOK ? '✅' : '❌'} Test 3: ${workflowsOK ? 'RÉUSSI' : 'ÉCHOUÉ'}\n`);

// Test 4: Statistiques globales
console.log('📋 Test 4: Statistiques globales');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let totalWorkflows = 0;
let workflowsByCategory = {};

expectedProfiles.forEach(profileId => {
    const workflows = getWorkflowsForProfile(profileId);
    const workflowIds = getWorkflowIds(profileId);
    totalWorkflows += workflowIds.length;

    workflowIds.forEach(wId => {
        const workflow = workflows[wId];
        const category = workflow.category || 'other';
        workflowsByCategory[category] = (workflowsByCategory[category] || 0) + 1;
    });
});

console.log(`📊 Statistiques:`);
console.log(`   • Profils totaux: ${expectedProfiles.length}`);
console.log(`   • Workflows totaux: ${totalWorkflows}`);
console.log(`   • Nouveaux profils: ${newProfiles.length}`);
console.log(`   • Nouveaux workflows: ${newProfiles.reduce((sum, p) => sum + expectedWorkflowCounts[p], 0)}`);

console.log(`\n   Répartition par catégorie:`);
Object.entries(workflowsByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
        console.log(`   • ${category}: ${count}`);
    });

// Test 5: Validation de la structure des workflows
console.log('\n📋 Test 5: Validation structure workflows');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let structureOK = true;
const requiredFields = ['id', 'title', 'icon', 'description', 'prompt', 'category', 'estimatedTime'];

newProfiles.forEach(profileId => {
    const workflows = getWorkflowsForProfile(profileId);
    const workflowIds = getWorkflowIds(profileId);

    workflowIds.forEach(workflowId => {
        const workflow = workflows[workflowId];

        requiredFields.forEach(field => {
            if (!workflow[field]) {
                console.log(`   ❌ ${profileId}.${workflowId}: champ "${field}" manquant`);
                structureOK = false;
            }
        });

        // Si hasForm=true, vérifier formFields
        if (workflow.hasForm && (!workflow.formFields || workflow.formFields.length === 0)) {
            console.log(`   ❌ ${profileId}.${workflowId}: hasForm=true mais formFields manquant`);
            structureOK = false;
        }
    });
});

if (structureOK) {
    console.log(`   ✅ Tous les workflows ont une structure valide`);
}

console.log(`\n${structureOK ? '✅' : '❌'} Test 5: ${structureOK ? 'RÉUSSI' : 'ÉCHOUÉ'}\n`);

// Test 6: Détails des nouveaux profils
console.log('📋 Test 6: Détails des nouveaux profils');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

newProfiles.forEach(profileId => {
    console.log(`\n${profileId.toUpperCase()}`);
    console.log('━'.repeat(50));

    const workflows = getWorkflowsForProfile(profileId);
    const workflowIds = getWorkflowIds(profileId);
    const prompt = profilePrompts[profileId];

    // Extraire le nom depuis l'intro
    const introMatch = prompt.intro.match(/Tu es Lucy, (.*?)\./);
    const profileName = introMatch ? introMatch[1] : 'N/A';

    console.log(`Nom: ${profileName}`);
    console.log(`Workflows: ${workflowIds.length}`);
    console.log(`Taille prompt total: ${Object.values(prompt).join('').length} caractères`);

    console.log(`\nWorkflows disponibles:`);
    workflowIds.forEach((wId, index) => {
        const w = workflows[wId];
        console.log(`  ${index + 1}. ${w.icon} ${w.title} (${w.estimatedTime})`);
    });
});

// Résumé final
console.log('\n\n🏁 ============================================');
console.log('   RÉSUMÉ DES TESTS');
console.log('   ============================================\n');

const allTestsPassed = profilesOK && promptsOK && workflowsOK && structureOK;

console.log(`   Test 1 - Profils disponibles:     ${profilesOK ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);
console.log(`   Test 2 - Prompts:                 ${promptsOK ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);
console.log(`   Test 3 - Workflows:               ${workflowsOK ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);
console.log(`   Test 4 - Statistiques:            ✅ RÉUSSI`);
console.log(`   Test 5 - Structure:               ${structureOK ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);
console.log(`   Test 6 - Détails:                 ✅ RÉUSSI`);

console.log(`\n   ${allTestsPassed ? '🎉 TOUS LES TESTS RÉUSSIS!' : '⚠️  CERTAINS TESTS ONT ÉCHOUÉ'}\n`);

if (allTestsPassed) {
    console.log('   ✨ Les 3 nouveaux profils sont prêts à l\'emploi:');
    console.log('      🎯 CEO Advisor - 6 workflows stratégiques');
    console.log('      💼 Sales Expert - 6 workflows commerciaux');
    console.log('      👥 Manager Coach - 6 workflows management');
    console.log('');
    console.log('   📈 Impact:');
    console.log(`      • +3 profils (${((3/7)*100).toFixed(0)}% d'augmentation)`);
    console.log(`      • +18 workflows (6 par profil)`);
    console.log(`      • Couverture complète des fonctions exécutives`);
    console.log('');
}

process.exit(allTestsPassed ? 0 : 1);
