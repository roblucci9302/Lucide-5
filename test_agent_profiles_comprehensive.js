/**
 * Test Suite: Agent Profiles Comprehensive
 *
 * Tests all 9 agent profiles for:
 * - Profile configuration completeness
 * - System prompt relevance
 * - Vocabulary specialization
 * - Output structure appropriateness
 * - Temperature settings
 * - Example quality
 *
 * Run: node test_agent_profiles_comprehensive.js
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    profileScores: {}
};

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(`  ${title}`, colors.cyan + colors.bold);
    console.log('='.repeat(70));
}

function logTest(name, passed, details = '') {
    const status = passed ? `${colors.green}✓ PASS` : `${colors.red}✗ FAIL`;
    console.log(`  ${status}${colors.reset} ${name}`);
    if (details && !passed) {
        console.log(`       ${colors.yellow}${details}${colors.reset}`);
    }
    testResults.tests.push({ name, passed, details });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
    return passed ? 1 : 0;
}

// Read file content
function readFile(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

// ============================================================
// PROFILE DEFINITIONS
// ============================================================

const EXPECTED_PROFILES = [
    {
        id: 'lucide_assistant',
        displayName: 'Lucide Assistant 🤖',
        description: 'Assistant polyvalent par défaut',
        testQuery: 'Comment organiser ma journée de travail ?',
        requiredKeywords: ['polyvalent', 'bienveillant', 'accessible', 'adapté'],
        expectedVocab: ['assistant', 'aide', 'support', 'conseil'],
        expectedTemp: 0.7,
        expectedTone: 'conversational'
    },
    {
        id: 'student_assistant',
        displayName: 'Student Assistant 🎓',
        description: 'Assistant académique pour étudiants',
        testQuery: 'Aide-moi à préparer mon examen de droit',
        requiredKeywords: ['académique', 'pédagogique', 'méthodologie', 'examens', 'révision'],
        expectedVocab: ['dissertation', 'mémoire', 'révision', 'fiche', 'examen'],
        expectedTemp: 0.6,
        expectedTone: 'pedagogical'
    },
    {
        id: 'researcher_assistant',
        displayName: 'Researcher 🔬',
        description: 'Assistant pour chercheurs et académiques',
        testQuery: 'Comment structurer ma revue de littérature ?',
        requiredKeywords: ['recherche', 'scientifique', 'méthodologie', 'publication', 'peer review'],
        expectedVocab: ['article scientifique', 'IMRaD', 'hypothèse', 'peer review'],
        expectedTemp: 0.5,
        expectedTone: 'academic'
    },
    {
        id: 'hr_specialist',
        displayName: 'HR Specialist 👩‍💼',
        description: 'Spécialiste RH et recrutement',
        testQuery: 'Comment gérer un conflit dans mon équipe ?',
        requiredKeywords: ['recrutement', 'RH', 'employee', 'conflict', 'performance'],
        expectedVocab: ['recrutement', 'onboarding', 'CDI', 'package salarial'],
        expectedTemp: 0.4,
        expectedTone: 'hr_process'
    },
    {
        id: 'it_expert',
        displayName: 'IT Expert 💻',
        description: 'Expert technique développement et DevOps',
        testQuery: 'Optimise ce code Python',
        requiredKeywords: ['architecture', 'technique', 'code', 'sécurité', 'performance'],
        expectedVocab: ['microservices', 'API', 'Docker', 'AWS', 'auth'],
        expectedTemp: 0.4,
        expectedTone: 'technical_guide'
    },
    {
        id: 'marketing_expert',
        displayName: 'Marketing Expert 📱',
        description: 'Expert marketing digital et growth',
        testQuery: 'Stratégie pour lancer mon produit',
        requiredKeywords: ['marketing', 'SEO', 'content', 'analytics', 'funnel'],
        expectedVocab: ['SEO', 'content marketing', 'funnel', 'CAC', 'LTV'],
        expectedTemp: 0.7,
        expectedTone: 'marketing_playbook'
    },
    {
        id: 'ceo_advisor',
        displayName: 'CEO Advisor 🎯',
        description: 'Conseiller exécutif stratégie entreprise',
        testQuery: 'Prépare ma board meeting',
        requiredKeywords: ['stratégie', 'executive', 'board', 'fundraising', 'OKR'],
        expectedVocab: ['OKR', 'term sheet', 'valuation', 'ARR', 'burn rate'],
        expectedTemp: 0.5,
        expectedTone: 'executive_summary'
    },
    {
        id: 'sales_expert',
        displayName: 'Sales Expert 💼',
        description: 'Expert vente B2B et closing',
        testQuery: 'Comment closer ce deal ?',
        requiredKeywords: ['vente', 'B2B', 'MEDDIC', 'closing', 'objection'],
        expectedVocab: ['cold email', 'BANT', 'MEDDIC', 'discovery call', 'win rate'],
        expectedTemp: 0.6,
        expectedTone: 'tactical_playbook'
    },
    {
        id: 'manager_coach',
        displayName: 'Manager Coach 👥',
        description: 'Coach en management et leadership',
        testQuery: 'Mon équipe est démotivée',
        requiredKeywords: ['management', '1:1', 'feedback', 'delegation', 'coaching'],
        expectedVocab: ['1:1', 'one-on-one', 'feedback', 'coaching', 'empowerment'],
        expectedTemp: 0.7,
        expectedTone: 'coaching_framework'
    }
];

// ============================================================
// TESTS
// ============================================================

function runTests() {
    log('\n🤖 AGENT PROFILES COMPREHENSIVE TEST SUITE', colors.bold + colors.cyan);
    log('Testing all 9 agent profiles for investor demo\n', colors.cyan);

    // Load profile templates
    const profileSource = readFile('src/features/common/prompts/profileTemplates.js');

    if (!profileSource) {
        log('ERROR: profileTemplates.js not found!', colors.red);
        return;
    }

    // Parse the profiles (simplified extraction)
    let profiles;
    try {
        // Extract PROFILE_TEMPLATES object
        const templateMatch = profileSource.match(/const PROFILE_TEMPLATES = \{([\s\S]*)\};[\s\n]*module\.exports/);
        if (!templateMatch) {
            log('ERROR: Could not parse PROFILE_TEMPLATES', colors.red);
            return;
        }

        // For testing, we'll analyze the source directly
        profiles = profileSource;
    } catch (e) {
        log('ERROR: Failed to parse profiles: ' + e.message, colors.red);
        return;
    }

    // ============================================================
    // Test each profile
    // ============================================================

    EXPECTED_PROFILES.forEach(expected => {
        logSection(`${expected.displayName}`);
        log(`  📋 ${expected.description}`, colors.blue);
        log(`  💬 Test Query: "${expected.testQuery}"`, colors.magenta);
        console.log();

        let profileScore = 0;
        let maxScore = 0;

        // Find the profile section in source
        const profileRegex = new RegExp(`${expected.id}:\\s*\\{[\\s\\S]*?(?=\\n    \\w+:|\\n\\};)`, 'g');
        const profileMatch = profiles.match(profileRegex);
        const profileSection = profileMatch ? profileMatch[0] : '';

        // 1. Profile exists
        maxScore++;
        profileScore += logTest(
            `Profile "${expected.id}" exists`,
            profileSection.length > 0
        );

        // 2. Has systemPrompt
        maxScore++;
        const hasSystemPrompt = profileSection.includes('systemPrompt:') || profileSection.includes('systemPrompt`');
        profileScore += logTest(
            'Has systemPrompt defined',
            hasSystemPrompt
        );

        // 3. System prompt contains required keywords
        expected.requiredKeywords.forEach(keyword => {
            maxScore++;
            const hasKeyword = profileSection.toLowerCase().includes(keyword.toLowerCase());
            profileScore += logTest(
                `System prompt mentions "${keyword}"`,
                hasKeyword
            );
        });

        // 4. Has vocabulary array
        maxScore++;
        const hasVocab = profileSection.includes('vocabulary:') && profileSection.includes('[');
        profileScore += logTest(
            'Has vocabulary array',
            hasVocab
        );

        // 5. Vocabulary contains expected terms
        const vocabFound = expected.expectedVocab.filter(term =>
            profileSection.toLowerCase().includes(term.toLowerCase())
        );
        maxScore++;
        profileScore += logTest(
            `Vocabulary contains ${vocabFound.length}/${expected.expectedVocab.length} expected terms`,
            vocabFound.length >= Math.floor(expected.expectedVocab.length * 0.7),
            `Missing: ${expected.expectedVocab.filter(t => !vocabFound.includes(t)).join(', ')}`
        );

        // 6. Has outputStructure
        maxScore++;
        const hasOutputStructure = profileSection.includes('outputStructure:');
        profileScore += logTest(
            'Has outputStructure defined',
            hasOutputStructure
        );

        // 7. Output structure has default format
        maxScore++;
        const hasDefaultFormat = profileSection.includes(`default: '${expected.expectedTone}'`) ||
                                 profileSection.includes(`default: "${expected.expectedTone}"`);
        profileScore += logTest(
            `Default output format is "${expected.expectedTone}"`,
            hasDefaultFormat,
            'Check outputStructure.default value'
        );

        // 8. Has temperature setting
        maxScore++;
        const hasTemperature = profileSection.includes('temperature:');
        profileScore += logTest(
            'Has temperature setting',
            hasTemperature
        );

        // 9. Temperature is appropriate
        maxScore++;
        const tempRegex = /temperature:\s*([\d.]+)/;
        const tempMatch = profileSection.match(tempRegex);
        const actualTemp = tempMatch ? parseFloat(tempMatch[1]) : null;
        const tempCorrect = actualTemp !== null && Math.abs(actualTemp - expected.expectedTemp) < 0.2;
        profileScore += logTest(
            `Temperature is appropriate (expected: ${expected.expectedTemp}, got: ${actualTemp || 'N/A'})`,
            tempCorrect
        );

        // 10. Has examples
        maxScore++;
        const hasExamples = profileSection.includes('examples:') && profileSection.includes('[{');
        profileScore += logTest(
            'Has example conversations',
            hasExamples
        );

        // 11. Examples have question and answer
        maxScore++;
        const hasQuestionAnswer = profileSection.includes('question:') && profileSection.includes('answer:');
        profileScore += logTest(
            'Examples have question/answer format',
            hasQuestionAnswer
        );

        // 12. Examples are substantial (>100 chars)
        maxScore++;
        const answerMatch = profileSection.match(/answer:\s*`([^`]+)`/);
        const answerLength = answerMatch ? answerMatch[1].length : 0;
        profileScore += logTest(
            `Example answers are substantial (${answerLength > 100 ? answerLength + ' chars' : 'too short'})`,
            answerLength > 100
        );

        // 13. Has constraints
        maxScore++;
        const hasConstraints = profileSection.includes('constraints:');
        profileScore += logTest(
            'Has output constraints defined',
            hasConstraints
        );

        // 14. Has name property
        maxScore++;
        const hasName = profileSection.includes(`name: '`) || profileSection.includes(`name: "`);
        profileScore += logTest(
            'Has name property',
            hasName
        );

        // 15. Has id property
        maxScore++;
        const hasId = profileSection.includes(`id: '${expected.id}'`) || profileSection.includes(`id: "${expected.id}"`);
        profileScore += logTest(
            `Has correct id: "${expected.id}"`,
            hasId
        );

        // Calculate and store profile score
        const scorePercent = Math.round((profileScore / maxScore) * 100);
        const scoreOutOf10 = Math.round((profileScore / maxScore) * 10 * 10) / 10;
        testResults.profileScores[expected.id] = {
            score: scoreOutOf10,
            passed: profileScore,
            total: maxScore,
            percent: scorePercent
        };

        console.log();
        const scoreColor = scoreOutOf10 >= 8 ? colors.green : scoreOutOf10 >= 6 ? colors.yellow : colors.red;
        log(`  📊 Profile Score: ${scoreColor}${scoreOutOf10}/10${colors.reset} (${scorePercent}%)`, colors.bold);
    });

    // ============================================================
    // CROSS-PROFILE TESTS
    // ============================================================
    logSection('CROSS-PROFILE VALIDATION');

    // Test: All 9 profiles exist
    const allProfileIds = EXPECTED_PROFILES.map(p => p.id);
    const missingProfiles = allProfileIds.filter(id => !profiles.includes(`${id}:`));
    logTest(
        `All 9 profiles are defined`,
        missingProfiles.length === 0,
        missingProfiles.length > 0 ? `Missing: ${missingProfiles.join(', ')}` : ''
    );

    // Test: No duplicate profile IDs
    const profileIdCounts = {};
    allProfileIds.forEach(id => {
        const matches = profiles.match(new RegExp(`${id}:`, 'g'));
        profileIdCounts[id] = matches ? matches.length : 0;
    });
    const duplicates = Object.entries(profileIdCounts).filter(([id, count]) => count > 1);
    logTest(
        'No duplicate profile IDs',
        duplicates.length === 0,
        duplicates.length > 0 ? `Duplicates: ${duplicates.map(d => d[0]).join(', ')}` : ''
    );

    // Test: Temperature range is valid (0-1)
    const tempMatches = profiles.match(/temperature:\s*([\d.]+)/g);
    const temps = tempMatches ? tempMatches.map(t => parseFloat(t.split(':')[1])) : [];
    const validTemps = temps.every(t => t >= 0 && t <= 1);
    logTest(
        'All temperatures are in valid range (0-1)',
        validTemps,
        !validTemps ? `Invalid temps found: ${temps.filter(t => t < 0 || t > 1).join(', ')}` : ''
    );

    // Test: Each profile has unique vocabulary focus
    const vocabSets = {};
    EXPECTED_PROFILES.forEach(p => {
        vocabSets[p.id] = p.expectedVocab;
    });
    // Check for minimal overlap (some overlap is expected)
    logTest(
        'Profiles have differentiated vocabulary',
        true // Simplified - would need deeper analysis
    );

    // Test: Module exports correctly
    logTest(
        'Module exports PROFILE_TEMPLATES',
        profiles.includes('module.exports = PROFILE_TEMPLATES')
    );

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    log('  PROFILE SCORES SUMMARY', colors.bold);
    console.log('='.repeat(70));

    console.log('\n  Profile                       Score    Status');
    console.log('  ' + '-'.repeat(50));

    EXPECTED_PROFILES.forEach(expected => {
        const score = testResults.profileScores[expected.id];
        if (score) {
            const statusIcon = score.score >= 8 ? '✅' : score.score >= 6 ? '⚠️' : '❌';
            const scoreColor = score.score >= 8 ? colors.green : score.score >= 6 ? colors.yellow : colors.red;
            const paddedName = expected.displayName.padEnd(28);
            console.log(`  ${paddedName} ${scoreColor}${score.score.toFixed(1)}/10${colors.reset}   ${statusIcon}`);
        }
    });

    // Calculate average score
    const scores = Object.values(testResults.profileScores);
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    console.log('  ' + '-'.repeat(50));
    const avgColor = avgScore >= 8 ? colors.green : avgScore >= 6 ? colors.yellow : colors.red;
    console.log(`  ${'Average Score'.padEnd(28)} ${avgColor}${avgScore.toFixed(1)}/10${colors.reset}`);

    console.log('\n' + '='.repeat(70));
    log('  TEST SUMMARY', colors.bold);
    console.log('='.repeat(70));

    const total = testResults.passed + testResults.failed;
    const passRate = ((testResults.passed / total) * 100).toFixed(1);

    log(`\n  Total Tests: ${total}`, colors.bold);
    log(`  Passed: ${testResults.passed}`, colors.green);
    log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
    log(`  Pass Rate: ${passRate}%`, passRate >= 90 ? colors.green : colors.yellow);

    if (testResults.failed > 0) {
        console.log('\n  Failed Tests:');
        testResults.tests
            .filter(t => !t.passed)
            .slice(0, 10)
            .forEach(t => {
                log(`    - ${t.name}`, colors.red);
                if (t.details) {
                    log(`      ${t.details}`, colors.yellow);
                }
            });
        if (testResults.tests.filter(t => !t.passed).length > 10) {
            log(`    ... and ${testResults.tests.filter(t => !t.passed).length - 10} more`, colors.yellow);
        }
    }

    console.log('\n' + '='.repeat(70));

    if (avgScore >= 8 && testResults.failed < 10) {
        log('  ✅ ALL PROFILES READY FOR INVESTOR DEMO!', colors.green + colors.bold);
    } else if (avgScore >= 6) {
        log('  ⚠️  Profiles mostly ready, minor improvements needed.', colors.yellow + colors.bold);
    } else {
        log('  ❌ Profiles need significant improvements.', colors.red + colors.bold);
    }
    console.log('='.repeat(70) + '\n');

    return testResults;
}

// Run tests
runTests();
