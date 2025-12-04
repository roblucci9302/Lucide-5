// Test simple pour valider la logique des profils d'agents
const { profilePrompts } = require('./src/features/common/prompts/promptTemplates.js');
const { getSystemPrompt } = require('./src/features/common/prompts/promptBuilder.js');

console.log('\n=== TEST DES PROFILS D\'AGENTS LUCY ===\n');

// Test 1: Vérifier que tous les profils existent
console.log('✓ Test 1: Vérification des profils disponibles');
const expectedProfiles = ['lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert', 'interview'];
const actualProfiles = Object.keys(profilePrompts);
console.log(`  Profils attendus: ${expectedProfiles.length}`);
console.log(`  Profils trouvés: ${actualProfiles.length}`);
console.log(`  Liste: ${actualProfiles.join(', ')}\n`);

// Test 2: Vérifier la structure de chaque profil
console.log('✓ Test 2: Vérification de la structure des profils');
let allValid = true;
for (const profileId of expectedProfiles) {
    const profile = profilePrompts[profileId];
    if (!profile) {
        console.log(`  ❌ Profil manquant: ${profileId}`);
        allValid = false;
        continue;
    }

    const requiredFields = ['intro', 'formatRequirements', 'searchUsage', 'content', 'outputInstructions'];
    const missingFields = requiredFields.filter(field => !profile[field]);

    if (missingFields.length > 0) {
        console.log(`  ❌ ${profileId}: Champs manquants: ${missingFields.join(', ')}`);
        allValid = false;
    } else {
        console.log(`  ✓ ${profileId}: Structure valide`);
    }
}

if (allValid) {
    console.log('  → Tous les profils ont une structure valide\n');
} else {
    console.log('  → Certains profils ont des problèmes de structure\n');
}

// Test 3: Générer des prompts système pour chaque profil
console.log('✓ Test 3: Génération des prompts système');
for (const profileId of ['lucide_assistant', 'hr_specialist', 'it_expert', 'marketing_expert']) {
    try {
        const prompt = getSystemPrompt(profileId, 'Test context', false);
        if (prompt && prompt.length > 100) {
            console.log(`  ✓ ${profileId}: Prompt généré (${prompt.length} caractères)`);
        } else {
            console.log(`  ❌ ${profileId}: Prompt trop court ou vide`);
        }
    } catch (error) {
        console.log(`  ❌ ${profileId}: Erreur lors de la génération: ${error.message}`);
    }
}

// Test 4: Vérifier le contenu spécifique de chaque agent
console.log('\n✓ Test 4: Vérification du contenu spécifique des agents');
const agents = {
    hr_specialist: {
        keywords: ['HR', 'recruitment', 'employee', 'CV'],
        name: 'Lucy - Expert RH'
    },
    it_expert: {
        keywords: ['software', 'debugging', 'code', 'technical'],
        name: 'Lucy - Expert IT'
    },
    marketing_expert: {
        keywords: ['marketing', 'campaign', 'content', 'brand'],
        name: 'Lucy - Expert Marketing'
    }
};

for (const [profileId, config] of Object.entries(agents)) {
    const profile = profilePrompts[profileId];
    const fullText = Object.values(profile).join(' ').toLowerCase();
    const foundKeywords = config.keywords.filter(keyword =>
        fullText.includes(keyword.toLowerCase())
    );

    console.log(`  ${profileId}:`);
    console.log(`    Nom attendu: ${config.name}`);
    console.log(`    Mots-clés trouvés: ${foundKeywords.length}/${config.keywords.length}`);
    console.log(`    → ${foundKeywords.join(', ')}`);
}

console.log('\n=== RÉSUMÉ ===');
console.log(`✓ Profils créés: ${actualProfiles.length}`);
console.log('✓ Profils spécialisés:');
console.log('  - HR Specialist (Ressources Humaines)');
console.log('  - IT Expert (Technologies & Développement)');
console.log('  - Marketing Expert (Communication & Campagnes)');
console.log('✓ Profil par défaut: lucide_assistant');
console.log('\n=== TESTS TERMINÉS ===\n');
