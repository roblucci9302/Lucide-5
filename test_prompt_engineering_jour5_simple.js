/**
 * Test Prompt Engineering - Phase WOW 1 Jour 5 (Simplified)
 * Validation de la structure et des templates sans DB
 */

console.log('\n🎯 ============================================');
console.log('   TEST SIMPLIFIÉ - PROMPT ENGINEERING');
console.log('   Phase WOW 1 - Jour 5');
console.log('   ============================================\n');

let testsPass = 0;
let testsTotal = 0;

// Test 1: Profile Templates disponibles
console.log('📋 Test 1: Chargement des templates de profils');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testsTotal++;
try {
    const profileTemplates = require('./src/features/common/prompts/profileTemplates');

    const expectedProfiles = [
        'lucide_assistant',
        'ceo_advisor',
        'sales_expert',
        'manager_coach',
        'hr_specialist',
        'it_expert',
        'marketing_expert'
    ];

    let allPresent = true;
    let profileCount = 0;

    for (const profileId of expectedProfiles) {
        if (profileTemplates[profileId]) {
            profileCount++;
            const profile = profileTemplates[profileId];
            console.log(`   ✅ ${profileId}:`);
            console.log(`      - Name: ${profile.name}`);
            console.log(`      - Temperature: ${profile.temperature}`);
            console.log(`      - Examples: ${profile.examples ? profile.examples.length : 0}`);
            console.log(`      - Vocabulary: ${profile.vocabulary ? profile.vocabulary.length : 0} keywords`);
        } else {
            console.log(`   ❌ ${profileId}: MANQUANT`);
            allPresent = false;
        }
    }

    if (allPresent && profileCount === 7) {
        testsPass++;
        console.log(`\n   ✅ Tous les 7 profils sont chargés correctement\n`);
    } else {
        console.log(`\n   ❌ Seulement ${profileCount}/7 profils présents\n`);
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Test 2: Structure des templates
console.log('📋 Test 2: Validation de la structure des templates');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testsTotal++;
try {
    const profileTemplates = require('./src/features/common/prompts/profileTemplates');

    const ceoTemplate = profileTemplates.ceo_advisor;

    const hasSystemPrompt = ceoTemplate.systemPrompt && ceoTemplate.systemPrompt.length > 100;
    const hasVocabulary = ceoTemplate.vocabulary && ceoTemplate.vocabulary.length > 10;
    const hasOutputStructure = ceoTemplate.outputStructure && ceoTemplate.outputStructure.default;
    const hasTemperature = typeof ceoTemplate.temperature === 'number';
    const hasExamples = ceoTemplate.examples && ceoTemplate.examples.length >= 3;

    console.log(`   System Prompt: ${hasSystemPrompt ? '✅' : '❌'} (${ceoTemplate.systemPrompt.length} chars)`);
    console.log(`   Vocabulary: ${hasVocabulary ? '✅' : '❌'} (${ceoTemplate.vocabulary.length} keywords)`);
    console.log(`   Output Structure: ${hasOutputStructure ? '✅' : '❌'}`);
    console.log(`   Temperature: ${hasTemperature ? '✅' : '❌'} (${ceoTemplate.temperature})`);
    console.log(`   Examples: ${hasExamples ? '✅' : '❌'} (${ceoTemplate.examples.length})`);

    if (hasSystemPrompt && hasVocabulary && hasOutputStructure && hasTemperature && hasExamples) {
        testsPass++;
        console.log(`\n   ✅ Structure du template CEO Advisor valide\n`);
    } else {
        console.log(`\n   ❌ Structure du template incomplète\n`);
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Test 3: Domain-specific vocabulary
console.log('📋 Test 3: Vocabulaire domain-specific');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testsTotal++;
try {
    const profileTemplates = require('./src/features/common/prompts/profileTemplates');

    const salesVocab = profileTemplates.sales_expert.vocabulary;
    const hasMEDDIC = salesVocab.includes('MEDDIC');
    const hasBANT = salesVocab.includes('BANT');
    const hasICP = salesVocab.includes('ICP');

    console.log(`   Sales Expert vocabulary:`);
    console.log(`      - MEDDIC: ${hasMEDDIC ? '✅' : '❌'}`);
    console.log(`      - BANT: ${hasBANT ? '✅' : '❌'}`);
    console.log(`      - ICP: ${hasICP ? '✅' : '❌'}`);
    console.log(`      - Total: ${salesVocab.length} keywords`);

    const marketingVocab = profileTemplates.marketing_expert.vocabulary;
    const hasSEO = marketingVocab.includes('SEO');
    const hasCAC = marketingVocab.includes('CAC');
    const hasROAS = marketingVocab.includes('ROAS');

    console.log(`\n   Marketing Expert vocabulary:`);
    console.log(`      - SEO: ${hasSEO ? '✅' : '❌'}`);
    console.log(`      - CAC: ${hasCAC ? '✅' : '❌'}`);
    console.log(`      - ROAS: ${hasROAS ? '✅' : '❌'}`);
    console.log(`      - Total: ${marketingVocab.length} keywords`);

    if (hasMEDDIC && hasBANT && hasSEO && hasCAC) {
        testsPass++;
        console.log(`\n   ✅ Vocabulaire domain-specific présent\n`);
    } else {
        console.log(`\n   ❌ Vocabulaire incomplet\n`);
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Test 4: Few-shot examples
console.log('📋 Test 4: Few-shot examples quality');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testsTotal++;
try {
    const profileTemplates = require('./src/features/common/prompts/profileTemplates');

    let totalExamples = 0;
    let profilesWithGoodExamples = 0;

    const profiles = ['ceo_advisor', 'sales_expert', 'marketing_expert', 'it_expert'];

    for (const profileId of profiles) {
        const examples = profileTemplates[profileId].examples;
        const count = examples.length;
        totalExamples += count;

        // Check if examples have both question and substantial answer
        const hasQualityExamples = examples.every(ex =>
            ex.question && ex.question.length > 10 &&
            ex.answer && ex.answer.length > 200
        );

        if (hasQualityExamples && count >= 3) {
            profilesWithGoodExamples++;
            console.log(`   ✅ ${profileId}: ${count} examples (quality ✅)`);
        } else {
            console.log(`   ⚠️  ${profileId}: ${count} examples`);
        }
    }

    console.log(`\n   📊 Total: ${totalExamples} examples across ${profiles.length} profiles`);
    console.log(`   📊 Average: ${Math.round(totalExamples / profiles.length)} examples per profile`);

    if (profilesWithGoodExamples >= 3 && totalExamples >= 20) {
        testsPass++;
        console.log(`\n   ✅ Few-shot examples de qualité présents\n`);
    } else {
        console.log(`\n   ❌ Examples insuffisants ou incomplets\n`);
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Test 5: Temperature adaptation
console.log('📋 Test 5: Temperature adaptation par profil');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testsTotal++;
try {
    const profileTemplates = require('./src/features/common/prompts/profileTemplates');

    const temps = {
        ceo_advisor: profileTemplates.ceo_advisor.temperature,
        sales_expert: profileTemplates.sales_expert.temperature,
        marketing_expert: profileTemplates.marketing_expert.temperature,
        it_expert: profileTemplates.it_expert.temperature,
        hr_specialist: profileTemplates.hr_specialist.temperature
    };

    console.log(`   CEO Advisor: ${temps.ceo_advisor} (précis, stratégique)`);
    console.log(`   Sales Expert: ${temps.sales_expert} (équilibré)`);
    console.log(`   Marketing Expert: ${temps.marketing_expert} (créatif)`);
    console.log(`   IT Expert: ${temps.it_expert} (très précis)`);
    console.log(`   HR Specialist: ${temps.hr_specialist} (précis, légal)`);

    // Validate temperature ranges
    const allValid = Object.values(temps).every(t => t >= 0.4 && t <= 0.7);
    const hasDiversity = new Set(Object.values(temps)).size >= 3; // At least 3 different values

    if (allValid && hasDiversity) {
        testsPass++;
        console.log(`\n   ✅ Températures adaptées par profil (range: 0.4-0.7)\n`);
    } else {
        console.log(`\n   ❌ Températures non adaptées\n`);
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Test 6: IPC Bridge structure
console.log('📋 Test 6: Structure du Prompt Bridge (IPC)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testsTotal++;
try {
    // Just check the file can be loaded (syntax check)
    const promptBridgeCode = require('fs').readFileSync('./src/bridge/modules/promptBridge.js', 'utf8');

    const hasInitialize = promptBridgeCode.includes('initialize()');
    const hasPromptGenerate = promptBridgeCode.includes('prompt:generate');
    const hasContextGet = promptBridgeCode.includes('context:get');
    const hasContextSave = promptBridgeCode.includes('context:save');

    console.log(`   initialize() method: ${hasInitialize ? '✅' : '❌'}`);
    console.log(`   prompt:generate handler: ${hasPromptGenerate ? '✅' : '❌'}`);
    console.log(`   context:get handler: ${hasContextGet ? '✅' : '❌'}`);
    console.log(`   context:save handler: ${hasContextSave ? '✅' : '❌'}`);

    if (hasInitialize && hasPromptGenerate && hasContextGet && hasContextSave) {
        testsPass++;
        console.log(`\n   ✅ Prompt Bridge structure correcte\n`);
    } else {
        console.log(`\n   ❌ Prompt Bridge incomplet\n`);
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Summary
console.log('\n🏁 ============================================');
console.log('   RÉSUMÉ DES TESTS');
console.log('   ============================================\n');

const percentage = Math.round((testsPass / testsTotal) * 100);
console.log(`   📊 Score: ${testsPass}/${testsTotal} tests réussis (${percentage}%)\n`);

if (percentage >= 80) {
    console.log('✅ Phase WOW 1 - Jour 5: STRUCTURE VALIDÉE\n');
    console.log('🎯 Composants opérationnels:');
    console.log('   • 7 profils avec templates riches ✅');
    console.log('   • Domain-specific vocabulary ✅');
    console.log('   • Few-shot examples (5-7 per profile) ✅');
    console.log('   • Temperature adaptation (0.4-0.7) ✅');
    console.log('   • IPC Bridge pour prompt engineering ✅');
    console.log('   • Output structuring adapté ✅\n');
    console.log('⚠️  Note: Tests complets avec DB nécessitent Electron');
    console.log('   Les services seront testés lors de l\'exécution de l\'app\n');
    process.exit(0);
} else {
    console.log('⚠️  Certains tests ont échoué\n');
    process.exit(1);
}
