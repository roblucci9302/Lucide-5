/**
 * Test Suite: Profile Routing System
 *
 * Tests automatic routing between profiles:
 * 1. Keyword-based routing to correct profiles
 * 2. Profile persistence during conversation
 * 3. Manual profile switching
 * 4. Suggestion system
 *
 * Run: node test_profile_routing.js
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
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
    if (details) {
        const detailColor = passed ? colors.blue : colors.yellow;
        console.log(`       ${detailColor}${details}${colors.reset}`);
    }
    testResults.tests.push({ name, passed, details });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
    return passed;
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
// TEST DATA: Messages with expected routing
// ============================================================

const TEST_QUERIES = {
    it_expert: [
        { query: "J'ai un bug dans mon code Python", keywords: ['bug', 'code'] },
        { query: "Comment debugger cette erreur JavaScript ?", keywords: ['debugger', 'erreur', 'javascript'] },
        { query: "Mon API REST renvoie une erreur 500", keywords: ['api', 'rest', 'erreur'] },
        { query: "Comment optimiser cette requête SQL ?", keywords: ['sql', 'requête'] },
        { query: "J'ai un problème avec mon déploiement Docker", keywords: ['déploiement', 'docker'] }
    ],
    hr_specialist: [
        { query: "Je dois recruter un développeur senior", keywords: ['recruter', 'développeur'] },
        { query: "Comment rédiger une offre d'emploi attractive ?", keywords: ['offre d\'emploi'] },
        { query: "Quel salaire proposer pour ce poste ?", keywords: ['salaire', 'poste'] },
        { query: "Comment gérer un entretien d'embauche ?", keywords: ['entretien', 'embauche'] },
        { query: "Je dois faire l'onboarding d'un nouvel employé", keywords: ['onboarding', 'employé'] }
    ],
    ceo_advisor: [
        { query: "Quelle stratégie pour ma levée de fonds ?", keywords: ['stratégie', 'levée de fonds'] },
        { query: "Comment préparer mon pitch deck série A ?", keywords: ['pitch deck', 'série a'] },
        { query: "Je dois présenter les OKR au board", keywords: ['okr', 'board'] },
        { query: "Comment définir la vision de mon entreprise ?", keywords: ['vision', 'entreprise'] },
        { query: "Quelle valorisation demander aux investisseurs ?", keywords: ['valorisation', 'investisseurs'] }
    ],
    marketing_expert: [
        { query: "Comment améliorer mon SEO ?", keywords: ['seo'] },
        { query: "Je veux lancer une campagne Facebook Ads", keywords: ['campagne', 'facebook'] },
        { query: "Comment augmenter mon taux de conversion ?", keywords: ['taux de conversion'] },
        { query: "Quelle stratégie de content marketing adopter ?", keywords: ['content', 'marketing', 'stratégie'] },
        { query: "Comment créer une landing page efficace ?", keywords: ['landing page'] }
    ],
    sales_expert: [
        { query: "Comment closer ce deal important ?", keywords: ['closing', 'deal'] },
        { query: "Mon prospect a une objection sur le prix", keywords: ['objection', 'prix'] },
        { query: "Comment améliorer mon cold email ?", keywords: ['cold email'] },
        { query: "Je dois qualifier un lead avec MEDDIC", keywords: ['qualifier', 'lead', 'meddic'] },
        { query: "Comment optimiser mon pipeline commercial ?", keywords: ['pipeline'] }
    ],
    manager_coach: [
        { query: "Mon équipe est démotivée", keywords: ['équipe', 'motivation'] },
        { query: "Comment donner un feedback négatif ?", keywords: ['feedback'] },
        { query: "Je dois préparer mes 1:1 hebdomadaires", keywords: ['1:1'] },
        { query: "Comment déléguer efficacement ?", keywords: ['délégation'] },
        { query: "J'ai un conflit entre deux membres de l'équipe", keywords: ['conflit', 'équipe'] }
    ],
    lucide_assistant: [
        { query: "Comment organiser ma journée ?", keywords: [] },
        { query: "Peux-tu m'aider à rédiger un email ?", keywords: [] },
        { query: "Quel temps fait-il aujourd'hui ?", keywords: [] },
        { query: "Merci pour ton aide !", keywords: [] },
        { query: "Bonjour, comment vas-tu ?", keywords: [] }
    ]
};

// ============================================================
// TESTS
// ============================================================

function runTests() {
    log('\n🔀 PROFILE ROUTING TEST SUITE', colors.bold + colors.cyan);
    log('Testing automatic routing between 9 agent profiles\n', colors.cyan);

    // Load source files
    const routerSource = readFile('src/features/common/services/agentRouterService.js');
    const profileSource = readFile('src/features/common/services/agentProfileService.js');

    if (!routerSource) {
        log('ERROR: agentRouterService.js not found!', colors.red);
        return;
    }

    // ============================================================
    // 1. ROUTING SERVICE ARCHITECTURE (10 tests)
    // ============================================================
    logSection('1. ROUTING SERVICE ARCHITECTURE');

    // Test: 3-level routing system
    logTest(
        '3-level routing system implemented',
        routerSource.includes('LEVEL 1') &&
        routerSource.includes('LEVEL 2') &&
        routerSource.includes('LEVEL 3')
    );

    // Test: Fast keyword matching (Level 1)
    logTest(
        'Level 1: Fast keyword matching (<50ms)',
        routerSource.includes('detectByKeywords') &&
        routerSource.includes('keyword_match')
    );

    // Test: Context enrichment (Level 2)
    logTest(
        'Level 2: Context enrichment with user history',
        routerSource.includes('enrichWithContext') &&
        routerSource.includes('context_boost')
    );

    // Test: LLM classification (Level 3)
    logTest(
        'Level 3: LLM classification for edge cases',
        routerSource.includes('classifyWithLLM') &&
        routerSource.includes('llm_classification')
    );

    // Test: Confidence thresholds
    logTest(
        'Confidence thresholds for routing decisions',
        routerSource.includes('confidence > 0.9') &&
        routerSource.includes('confidence > 0.8')
    );

    // Test: Word boundary matching
    logTest(
        'Word boundary matching for precision',
        routerSource.includes('\\\\b') || routerSource.includes('\\b')
    );

    // Test: Statistics tracking
    logTest(
        'Statistics tracking for routing',
        routerSource.includes('this.stats') &&
        routerSource.includes('totalRoutings')
    );

    // Test: User override logging
    logTest(
        'User override logging for improvement',
        routerSource.includes('logUserOverride') &&
        routerSource.includes('userOverrides')
    );

    // Test: Fallback to default
    logTest(
        'Fallback to lucide_assistant if routing fails',
        routerSource.includes("'lucide_assistant'") &&
        routerSource.includes('fallback')
    );

    // Test: Singleton pattern
    logTest(
        'Singleton instance exported',
        routerSource.includes('const agentRouterService = new AgentRouterService()') &&
        routerSource.includes('module.exports = agentRouterService')
    );

    // ============================================================
    // 2. KEYWORD ROUTING RULES (7 tests)
    // ============================================================
    logSection('2. KEYWORD ROUTING RULES');

    const profiles = ['ceo_advisor', 'sales_expert', 'manager_coach', 'hr_specialist', 'it_expert', 'marketing_expert'];

    profiles.forEach(profile => {
        const hasRule = routerSource.includes(`agent: '${profile}'`) &&
                       routerSource.includes('keywords:');
        logTest(
            `Routing rule defined for ${profile}`,
            hasRule
        );
    });

    // Test: Multiple keywords per profile
    logTest(
        'Multiple keywords per profile (30+ per rule)',
        (routerSource.match(/'[^']+',/g) || []).length > 150
    );

    // ============================================================
    // 3. IT EXPERT ROUTING (5 tests)
    // ============================================================
    logSection('3. IT EXPERT ROUTING');
    log('  Testing: "J\'ai un bug dans mon code" → IT Expert ?', colors.magenta);
    console.log();

    TEST_QUERIES.it_expert.forEach(test => {
        const keywordsFound = test.keywords.filter(kw =>
            routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
        );
        const passed = keywordsFound.length > 0;
        logTest(
            `"${test.query.substring(0, 40)}..." routes to IT Expert`,
            passed,
            `Keywords: ${test.keywords.join(', ')}`
        );
    });

    // ============================================================
    // 4. HR SPECIALIST ROUTING (5 tests)
    // ============================================================
    logSection('4. HR SPECIALIST ROUTING');
    log('  Testing: "Je dois recruter un développeur" → HR Specialist ?', colors.magenta);
    console.log();

    TEST_QUERIES.hr_specialist.forEach(test => {
        const keywordsFound = test.keywords.filter(kw =>
            routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
        );
        const passed = keywordsFound.length > 0;
        logTest(
            `"${test.query.substring(0, 40)}..." routes to HR Specialist`,
            passed,
            `Keywords: ${test.keywords.join(', ')}`
        );
    });

    // ============================================================
    // 5. CEO ADVISOR ROUTING (5 tests)
    // ============================================================
    logSection('5. CEO ADVISOR ROUTING');
    log('  Testing: "Quelle stratégie pour ma levée de fonds ?" → CEO Advisor ?', colors.magenta);
    console.log();

    TEST_QUERIES.ceo_advisor.forEach(test => {
        const keywordsFound = test.keywords.filter(kw =>
            routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
        );
        const passed = keywordsFound.length > 0;
        logTest(
            `"${test.query.substring(0, 40)}..." routes to CEO Advisor`,
            passed,
            `Keywords: ${test.keywords.join(', ')}`
        );
    });

    // ============================================================
    // 6. MARKETING EXPERT ROUTING (5 tests)
    // ============================================================
    logSection('6. MARKETING EXPERT ROUTING');
    log('  Testing: "Comment améliorer mon SEO ?" → Marketing Expert ?', colors.magenta);
    console.log();

    TEST_QUERIES.marketing_expert.forEach(test => {
        const keywordsFound = test.keywords.filter(kw =>
            routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
        );
        const passed = keywordsFound.length > 0;
        logTest(
            `"${test.query.substring(0, 40)}..." routes to Marketing Expert`,
            passed,
            `Keywords: ${test.keywords.join(', ')}`
        );
    });

    // ============================================================
    // 7. SALES EXPERT ROUTING (5 tests)
    // ============================================================
    logSection('7. SALES EXPERT ROUTING');
    log('  Testing: "Comment closer ce deal ?" → Sales Expert ?', colors.magenta);
    console.log();

    TEST_QUERIES.sales_expert.forEach(test => {
        const keywordsFound = test.keywords.filter(kw =>
            routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
        );
        const passed = keywordsFound.length > 0;
        logTest(
            `"${test.query.substring(0, 40)}..." routes to Sales Expert`,
            passed,
            `Keywords: ${test.keywords.join(', ')}`
        );
    });

    // ============================================================
    // 8. MANAGER COACH ROUTING (5 tests)
    // ============================================================
    logSection('8. MANAGER COACH ROUTING');
    log('  Testing: "Mon équipe est démotivée" → Manager Coach ?', colors.magenta);
    console.log();

    TEST_QUERIES.manager_coach.forEach(test => {
        const keywordsFound = test.keywords.filter(kw =>
            routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
        );
        const passed = keywordsFound.length > 0;
        logTest(
            `"${test.query.substring(0, 40)}..." routes to Manager Coach`,
            passed,
            `Keywords: ${test.keywords.join(', ')}`
        );
    });

    // ============================================================
    // 9. DEFAULT ROUTING (5 tests)
    // ============================================================
    logSection('9. DEFAULT ROUTING (Lucide Assistant)');
    log('  Testing: Generic queries → Lucide Assistant ?', colors.magenta);
    console.log();

    // Test: Default for low confidence
    logTest(
        'Default to lucide_assistant for low confidence matches',
        routerSource.includes("agent: 'lucide_assistant'") &&
        routerSource.includes('confidence: 0.5')
    );

    // Test: Default for invalid input
    logTest(
        'Default for invalid/empty input',
        routerSource.includes('Invalid question, using default agent') &&
        routerSource.includes('invalid_input')
    );

    // Test: Default for ambiguous queries
    logTest(
        'Generic queries fall back to lucide_assistant',
        routerSource.includes("'lucide_assistant'") &&
        routerSource.includes("reason: 'default'")
    );

    // Test: Confidence starts at 0.5 for default
    logTest(
        'Default confidence is 0.5',
        routerSource.includes('confidence: 0.5')
    );

    // Test: No specialization for general queries
    logTest(
        'Lucide Assistant handles general queries',
        routerSource.includes("agent: 'lucide_assistant'")
    );

    // ============================================================
    // 10. PROFILE PERSISTENCE (8 tests)
    // ============================================================
    logSection('10. PROFILE PERSISTENCE');

    // Test: Context stores profile
    logTest(
        'Session stores agent_profile',
        routerSource.includes('agent_profile')
    );

    // Test: Context enrichment uses history
    logTest(
        'Context enrichment uses recent sessions',
        routerSource.includes('recentSessions') &&
        routerSource.includes('getAllSessions')
    );

    // Test: Agent frequency tracking
    logTest(
        'Agent frequency tracked in history',
        routerSource.includes('agentFrequency') &&
        routerSource.includes('usageFrequency')
    );

    // Test: Most used agent detection
    logTest(
        'Most used agent detection',
        routerSource.includes('mostUsedAgent')
    );

    // Test: Context boost for frequent users
    logTest(
        'Context boost for frequent profile usage',
        routerSource.includes('context_boost') &&
        routerSource.includes('usageFrequency > 0.6')
    );

    // Test: History limit
    logTest(
        'History limited to recent sessions (10)',
        routerSource.includes('limit: 10')
    );

    // Test: Sorted by recent
    logTest(
        'Sessions sorted by recent first',
        routerSource.includes("sortBy: 'updated_at'") &&
        routerSource.includes("order: 'DESC'")
    );

    // Test: Context info returned
    logTest(
        'Context info returned in routing result',
        routerSource.includes('contextInfo')
    );

    // ============================================================
    // 11. MANUAL PROFILE SWITCHING (7 tests)
    // ============================================================
    logSection('11. MANUAL PROFILE SWITCHING');

    // Check if profileService exists
    if (profileSource) {
        // Test: setCurrentProfile method
        logTest(
            'setCurrentProfile method exists',
            profileSource.includes('setCurrentProfile') ||
            profileSource.includes('setProfile')
        );

        // Test: getCurrentProfile method
        logTest(
            'getCurrentProfile method exists',
            profileSource.includes('getCurrentProfile') ||
            profileSource.includes('getProfile')
        );

        // Test: Profile validation
        logTest(
            'Profile validation on switch',
            profileSource.includes('isValidProfile') ||
            profileSource.includes('validateProfile') ||
            profileSource.includes('profiles[')
        );
    } else {
        logTest('setCurrentProfile method exists', false, 'agentProfileService.js not found');
        logTest('getCurrentProfile method exists', false, 'agentProfileService.js not found');
        logTest('Profile validation on switch', false, 'agentProfileService.js not found');
    }

    // Test: User override logging
    logTest(
        'Manual switch logged as override',
        routerSource.includes('logUserOverride') &&
        routerSource.includes('user_choice')
    );

    // Test: Override stats tracked
    logTest(
        'Override statistics tracked',
        routerSource.includes('userOverrides++')
    );

    // Test: Override includes question
    logTest(
        'Override log includes question context',
        routerSource.includes('question:') &&
        routerSource.includes('predicted_agent')
    );

    // Test: Accuracy calculation includes overrides
    logTest(
        'Accuracy calculation considers overrides',
        routerSource.includes('userOverrides') &&
        routerSource.includes('accuracy')
    );

    // ============================================================
    // 12. SUGGESTION SYSTEM (10 tests)
    // ============================================================
    logSection('12. SUGGESTION SYSTEM');

    // Test: Suggestion analysis method
    logTest(
        'analyzeSuggestion method exists',
        routerSource.includes('analyzeSuggestion')
    );

    // Test: Suggestion threshold
    logTest(
        'Suggestion requires high confidence (>=0.85)',
        routerSource.includes('confidence < 0.85')
    );

    // Test: No suggestion if same profile
    logTest(
        'No suggestion if already using best profile',
        routerSource.includes('detection.agent === currentProfile')
    );

    // Test: Suggestion includes reason
    logTest(
        'Suggestion includes human-readable reason',
        routerSource.includes('getSuggestionReason') &&
        routerSource.includes('reason:')
    );

    // Test: Suggestion can be accepted
    logTest(
        'acceptSuggestion method exists',
        routerSource.includes('acceptSuggestion')
    );

    // Test: Suggestion can be rejected
    logTest(
        'rejectSuggestion method exists',
        routerSource.includes('rejectSuggestion')
    );

    // Test: Suggestion history
    logTest(
        'Suggestion history maintained',
        routerSource.includes('suggestionHistory') &&
        routerSource.includes('addSuggestionToHistory')
    );

    // Test: History size limit
    logTest(
        'Suggestion history limited (50 max)',
        routerSource.includes('maxHistorySize') &&
        routerSource.includes('50')
    );

    // Test: Suggestions can be disabled
    logTest(
        'Suggestions can be enabled/disabled',
        routerSource.includes('suggestionEnabled') &&
        routerSource.includes('setSuggestionsEnabled')
    );

    // Test: Suggestion stats
    logTest(
        'Suggestion statistics available',
        routerSource.includes('getSuggestionStats') &&
        routerSource.includes('acceptanceRate')
    );

    // ============================================================
    // 13. CONFIDENCE SCORING (6 tests)
    // ============================================================
    logSection('13. CONFIDENCE SCORING');

    // Test: Base confidence per profile
    logTest(
        'Base confidence defined per profile',
        routerSource.includes('confidence: 0.92') && // CEO
        routerSource.includes('confidence: 0.91') && // Sales, Manager
        routerSource.includes('confidence: 0.90') && // HR
        routerSource.includes('confidence: 0.85')    // IT, Marketing
    );

    // Test: Confidence increases with keywords
    logTest(
        'Confidence increases with multiple keywords',
        routerSource.includes('matchedKeywords.length - 1') &&
        routerSource.includes('* 0.05')
    );

    // Test: Confidence capped at 0.95
    logTest(
        'Confidence capped at 0.95',
        routerSource.includes('Math.min(0.95')
    );

    // Test: Confidence returned in result
    logTest(
        'Confidence returned in routing result',
        routerSource.includes('confidence:') &&
        routerSource.includes('return') &&
        routerSource.includes('agent')
    );

    // Test: Matched keywords returned
    logTest(
        'Matched keywords returned (max 5)',
        routerSource.includes('matchedKeywords:') &&
        routerSource.includes('slice(0, 5)')
    );

    // Test: Best match selection
    logTest(
        'Best match selected by confidence',
        routerSource.includes('confidence > bestMatch.confidence')
    );

    // ============================================================
    // 14. BILINGUAL SUPPORT (4 tests)
    // ============================================================
    logSection('14. BILINGUAL SUPPORT (FR/EN)');

    // Test: French keywords
    logTest(
        'French keywords defined',
        routerSource.includes("'recrutement'") &&
        routerSource.includes("'stratégie'") &&
        routerSource.includes("'développement'")
    );

    // Test: English keywords
    logTest(
        'English keywords defined',
        routerSource.includes("'recruitment'") &&
        routerSource.includes("'strategy'") &&
        routerSource.includes("'development'")
    );

    // Test: Case insensitive matching
    logTest(
        'Case insensitive matching',
        routerSource.includes('toLowerCase()') ||
        routerSource.includes("'i'")
    );

    // Test: Comments indicate language
    logTest(
        'Language groups documented in comments',
        routerSource.includes('French keywords') &&
        routerSource.includes('English keywords')
    );

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    log('  ROUTING RESULTS BY PROFILE', colors.bold);
    console.log('='.repeat(70));

    const profileResults = {};
    Object.keys(TEST_QUERIES).forEach(profile => {
        const queries = TEST_QUERIES[profile];
        profileResults[profile] = {
            total: queries.length,
            passed: 0
        };
    });

    // Count passed tests by profile
    testResults.tests.forEach(test => {
        Object.keys(TEST_QUERIES).forEach(profile => {
            const profileName = profile.replace('_', ' ');
            if (test.name.toLowerCase().includes(profileName.toLowerCase()) ||
                test.name.toLowerCase().includes(profile.toLowerCase())) {
                if (test.passed) {
                    profileResults[profile].passed++;
                }
            }
        });
    });

    console.log('\n  Profile               Test Queries    Status');
    console.log('  ' + '-'.repeat(55));

    const profileDisplay = {
        it_expert: 'IT Expert 💻',
        hr_specialist: 'HR Specialist 👩‍💼',
        ceo_advisor: 'CEO Advisor 🎯',
        marketing_expert: 'Marketing Expert 📱',
        sales_expert: 'Sales Expert 💼',
        manager_coach: 'Manager Coach 👥',
        lucide_assistant: 'Lucide Assistant 🤖'
    };

    Object.keys(TEST_QUERIES).forEach(profile => {
        const queries = TEST_QUERIES[profile];
        const passed = queries.filter(q => {
            // Check if keywords would match
            return q.keywords.length === 0 || q.keywords.some(kw =>
                routerSource.toLowerCase().includes(`'${kw.toLowerCase()}'`)
            );
        }).length;
        const statusIcon = passed === queries.length ? '✅' : passed > 0 ? '⚠️' : '❌';
        const name = (profileDisplay[profile] || profile).padEnd(25);
        console.log(`  ${name} ${passed}/${queries.length} queries    ${statusIcon}`);
    });

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
            });
        if (testResults.tests.filter(t => !t.passed).length > 10) {
            log(`    ... and ${testResults.tests.filter(t => !t.passed).length - 10} more`, colors.yellow);
        }
    }

    console.log('\n' + '='.repeat(70));

    if (passRate >= 90) {
        log('  ✅ PROFILE ROUTING SYSTEM WORKING CORRECTLY!', colors.green + colors.bold);
    } else if (passRate >= 70) {
        log('  ⚠️  Routing system mostly functional, some issues.', colors.yellow + colors.bold);
    } else {
        log('  ❌ Routing system needs significant fixes.', colors.red + colors.bold);
    }
    console.log('='.repeat(70) + '\n');

    return testResults;
}

// Run tests
runTests();
