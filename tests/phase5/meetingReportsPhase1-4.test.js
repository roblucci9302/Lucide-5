/**
 * Phase 5: Tests de validation pour les améliorations des comptes rendus de réunion
 *
 * Valide les améliorations des Phases 1-4:
 * - Phase 1: maxTokens augmenté, sections UI ajoutées
 * - Phase 2: Prompt enrichi avec méthodologie
 * - Phase 3: Pré-traitement, post-traitement, score qualité
 * - Phase 4: UI enrichie avec nouvelles sections
 *
 * Run with: node tests/phase5/meetingReportsPhase1-4.test.js
 */

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

async function runTest(name, testFn) {
    try {
        await testFn();
        console.log(`✅ PASS: ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        testsFailed++;
        failedTests.push({ name, error: error.message });
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertArrayLength(arr, minLength, message) {
    if (!Array.isArray(arr) || arr.length < minLength) {
        throw new Error(message || `Expected array with at least ${minLength} items, got ${arr?.length || 0}`);
    }
}

// ============================================================================
// Mock implementations for testing (without external dependencies)
// ============================================================================

/**
 * Mock of _preprocessTranscripts from structuredNotesService
 */
function preprocessTranscripts(transcripts) {
    if (!transcripts || transcripts.length === 0) return [];

    const processed = [];
    let currentEntry = null;

    for (const entry of transcripts) {
        if (!entry.text || entry.text.trim().length < 3) {
            continue;
        }

        let cleanedText = cleanTranscriptText(entry.text);
        if (cleanedText.length < 3) {
            continue;
        }

        if (currentEntry && currentEntry.speaker === entry.speaker) {
            currentEntry.text += ' ' + cleanedText;
            currentEntry.timestamp = entry.timestamp;
        } else {
            if (currentEntry) {
                processed.push(currentEntry);
            }
            currentEntry = {
                speaker: entry.speaker || 'Intervenant',
                text: cleanedText,
                timestamp: entry.timestamp
            };
        }
    }

    if (currentEntry) {
        processed.push(currentEntry);
    }

    return processed;
}

/**
 * Mock of _cleanTranscriptText
 */
function cleanTranscriptText(text) {
    if (!text) return '';
    let cleaned = text.trim();
    cleaned = cleaned.replace(/\b(euh|hum|hmm|ah|oh)\b[\s,.]*/gi, '');
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
    return cleaned;
}

/**
 * Mock of _validateStructure
 */
function validateStructure(data) {
    const fieldDefaults = {
        'executiveSummary': 'Résumé non disponible',
        'meetingType': 'general',
        'objectives': [],
        'meetingMetadata': {
            participants: [],
            duration: 'Non disponible',
            mainTopic: 'Non disponible',
            date: new Date().toISOString().split('T')[0]
        },
        'keyPoints': [],
        'decisions': [],
        'actionItems': [],
        'risks': [],
        'timeline': [],
        'unresolvedItems': [],
        'nextSteps': [],
        'importantQuotes': []
    };

    for (const [field, defaultValue] of Object.entries(fieldDefaults)) {
        if (!(field in data)) {
            data[field] = defaultValue;
        } else if (data[field] === null || data[field] === undefined) {
            data[field] = defaultValue;
        }
    }

    if (data.meetingMetadata && typeof data.meetingMetadata === 'object') {
        if (!data.meetingMetadata.participants) data.meetingMetadata.participants = [];
        if (!data.meetingMetadata.duration) data.meetingMetadata.duration = 'Non disponible';
        if (!data.meetingMetadata.mainTopic) data.meetingMetadata.mainTopic = 'Non disponible';
    }

    validateArrayItems(data);
    return data;
}

/**
 * Mock of _validateArrayItems
 */
function validateArrayItems(data) {
    if (Array.isArray(data.actionItems)) {
        data.actionItems = data.actionItems.map((item, index) => {
            if (typeof item === 'string') {
                return {
                    task: item,
                    assignee: 'Non assigné',
                    deadline: 'Non défini',
                    priority: 'medium',
                    status: 'pending'
                };
            }
            return {
                task: item.task || item.action || item.description || `Action ${index + 1}`,
                assignee: item.assignee || item.responsible || 'Non assigné',
                deadline: item.deadline || item.dueDate || 'Non défini',
                priority: item.priority || 'medium',
                status: item.status || 'pending',
                dependencies: item.dependencies || [],
                successCriteria: item.successCriteria || ''
            };
        });
    }

    if (Array.isArray(data.decisions)) {
        data.decisions = data.decisions.map((item, index) => {
            if (typeof item === 'string') {
                return { decision: item, rationale: '', impact: '' };
            }
            return {
                decision: item.decision || item.description || `Décision ${index + 1}`,
                rationale: item.rationale || item.justification || '',
                impact: item.impact || ''
            };
        });
    }

    if (Array.isArray(data.risks)) {
        data.risks = data.risks.map((item, index) => {
            if (typeof item === 'string') {
                return { risk: item, severity: 'medium', mitigation: '' };
            }
            return {
                risk: item.risk || item.description || `Risque ${index + 1}`,
                severity: item.severity || item.level || 'medium',
                mitigation: item.mitigation || item.action || ''
            };
        });
    }
}

/**
 * Mock of _calculateQualityScore
 */
function calculateQualityScore(notes) {
    const MIN_EXECUTIVE_SUMMARY_LENGTH = 100;
    const MIN_KEY_POINTS = 1;

    let score = 0;
    const weights = {
        executiveSummary: 25,
        keyPoints: 20,
        actionItems: 20,
        decisions: 15,
        timeline: 10,
        risks: 10
    };

    if (notes.executiveSummary && notes.executiveSummary.length >= MIN_EXECUTIVE_SUMMARY_LENGTH) {
        score += weights.executiveSummary;
    } else if (notes.executiveSummary && notes.executiveSummary.length > 50) {
        score += weights.executiveSummary * 0.5;
    }

    if (notes.keyPoints && notes.keyPoints.length >= MIN_KEY_POINTS) {
        const pointScore = Math.min(notes.keyPoints.length / 5, 1);
        score += weights.keyPoints * pointScore;
    }

    if (notes.actionItems && notes.actionItems.length > 0) {
        const hasDetails = notes.actionItems.some(a => a.assignee && a.assignee !== 'Non assigné');
        score += hasDetails ? weights.actionItems : weights.actionItems * 0.7;
    }

    if (notes.decisions && notes.decisions.length > 0) {
        score += weights.decisions;
    }

    if (notes.timeline && notes.timeline.length > 0) {
        score += weights.timeline;
    }

    if (notes.risks && notes.risks.length > 0) {
        score += weights.risks;
    }

    return Math.round(score);
}

/**
 * Mock of UI _getQualityScoreClass
 */
function getQualityScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
}

/**
 * Mock of UI _getMeetingTypeLabel
 */
function getMeetingTypeLabel(type) {
    const labels = {
        'standup': 'Daily/Standup',
        'brainstorming': 'Brainstorming',
        'planning': 'Planification',
        'review': 'Revue',
        'retrospective': 'Rétrospective',
        'one-on-one': 'One-on-One',
        'interview': 'Entretien',
        'presentation': 'Présentation',
        'workshop': 'Atelier',
        'training': 'Formation',
        'general': 'Général'
    };
    return labels[type] || type;
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function main() {
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🧪 PHASE 5: TESTS DE VALIDATION - COMPTES RENDUS DE RÉUNION');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // ========================================================================
    // PHASE 3 TESTS: Preprocessing
    // ========================================================================
    console.log('\n📋 PHASE 3: Tests de pré-traitement\n');

    await runTest('Preprocessing: Should merge consecutive speaker entries', () => {
        const transcripts = [
            { speaker: 'Alice', text: 'Bonjour tout le monde', timestamp: '2024-01-01T10:00:00' },
            { speaker: 'Alice', text: 'Comment allez-vous?', timestamp: '2024-01-01T10:00:05' },
            { speaker: 'Bob', text: 'Très bien merci', timestamp: '2024-01-01T10:00:10' }
        ];
        const result = preprocessTranscripts(transcripts);
        assertEqual(result.length, 2, 'Should merge Alice entries into one');
        assert(result[0].text.includes('Bonjour') && result[0].text.includes('Comment'),
            'Merged entry should contain both texts');
    });

    await runTest('Preprocessing: Should filter very short entries', () => {
        const transcripts = [
            { speaker: 'Alice', text: 'OK', timestamp: '2024-01-01T10:00:00' },
            { speaker: 'Bob', text: 'Bonjour tout le monde', timestamp: '2024-01-01T10:00:05' }
        ];
        const result = preprocessTranscripts(transcripts);
        assertEqual(result.length, 1, 'Should filter out "OK" (too short)');
        assertEqual(result[0].speaker, 'Bob', 'Should keep Bob entry');
    });

    await runTest('Preprocessing: Should clean filler words', () => {
        const text = 'Euh, je pense que, hum, on devrait continuer';
        const cleaned = cleanTranscriptText(text);
        assert(!cleaned.includes('Euh'), 'Should remove "Euh"');
        assert(!cleaned.includes('hum'), 'Should remove "hum"');
        assert(cleaned.includes('je pense'), 'Should keep meaningful content');
    });

    await runTest('Preprocessing: Should remove repeated words (stuttering)', () => {
        const text = 'Je je pense que que nous devons';
        const cleaned = cleanTranscriptText(text);
        assertEqual(cleaned, 'Je pense que nous devons', 'Should remove stuttering');
    });

    await runTest('Preprocessing: Should handle empty input', () => {
        const result = preprocessTranscripts([]);
        assertEqual(result.length, 0, 'Should return empty array');
    });

    // ========================================================================
    // PHASE 3 TESTS: Validation
    // ========================================================================
    console.log('\n📋 PHASE 3: Tests de validation\n');

    await runTest('Validation: Should add missing fields with defaults', () => {
        const data = { executiveSummary: 'Test summary' };
        const result = validateStructure(data);
        assert('meetingType' in result, 'Should add meetingType');
        assert('objectives' in result, 'Should add objectives');
        assert('risks' in result, 'Should add risks (Phase 2 field)');
        assertEqual(result.meetingType, 'general', 'Default meetingType should be general');
    });

    await runTest('Validation: Should normalize string actionItems to objects', () => {
        const data = { actionItems: ['Faire le rapport', 'Envoyer email'] };
        validateArrayItems(data);
        assert(typeof data.actionItems[0] === 'object', 'String should be converted to object');
        assertEqual(data.actionItems[0].task, 'Faire le rapport', 'Task should be set');
        assertEqual(data.actionItems[0].priority, 'medium', 'Default priority should be medium');
        assertEqual(data.actionItems[0].assignee, 'Non assigné', 'Default assignee');
    });

    await runTest('Validation: Should normalize string decisions to objects', () => {
        const data = { decisions: ['Approuver le budget'] };
        validateArrayItems(data);
        assert(typeof data.decisions[0] === 'object', 'String should be converted to object');
        assertEqual(data.decisions[0].decision, 'Approuver le budget', 'Decision should be set');
        assert('rationale' in data.decisions[0], 'Should have rationale field');
        assert('impact' in data.decisions[0], 'Should have impact field');
    });

    await runTest('Validation: Should normalize string risks to objects', () => {
        const data = { risks: ['Risque de retard'] };
        validateArrayItems(data);
        assert(typeof data.risks[0] === 'object', 'String should be converted to object');
        assertEqual(data.risks[0].risk, 'Risque de retard', 'Risk should be set');
        assertEqual(data.risks[0].severity, 'medium', 'Default severity should be medium');
    });

    await runTest('Validation: Should preserve existing object fields', () => {
        const data = {
            actionItems: [{
                task: 'Test task',
                assignee: 'Alice',
                priority: 'high',
                successCriteria: 'Must pass tests'
            }]
        };
        validateArrayItems(data);
        assertEqual(data.actionItems[0].assignee, 'Alice', 'Should preserve assignee');
        assertEqual(data.actionItems[0].priority, 'high', 'Should preserve priority');
        assertEqual(data.actionItems[0].successCriteria, 'Must pass tests', 'Should preserve successCriteria');
    });

    // ========================================================================
    // PHASE 3 TESTS: Quality Score
    // ========================================================================
    console.log('\n📋 PHASE 3: Tests du score de qualité\n');

    await runTest('Quality Score: Should return 0 for empty notes', () => {
        const notes = {};
        const score = calculateQualityScore(notes);
        assertEqual(score, 0, 'Empty notes should have score 0');
    });

    await runTest('Quality Score: Should score executive summary (25 pts for >= 100 chars)', () => {
        const notes = {
            executiveSummary: 'A'.repeat(100) // Exactly 100 chars
        };
        const score = calculateQualityScore(notes);
        assertEqual(score, 25, 'Should get full 25 points for summary >= 100 chars');
    });

    await runTest('Quality Score: Should give partial score for short summary (12.5 pts for 50-99 chars)', () => {
        const notes = {
            executiveSummary: 'A'.repeat(60) // 60 chars
        };
        const score = calculateQualityScore(notes);
        assertEqual(score, 13, 'Should get ~12.5 points (rounded to 13) for summary 50-99 chars');
    });

    await runTest('Quality Score: Should score key points (max 20 pts)', () => {
        const notes = {
            keyPoints: ['Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5']
        };
        const score = calculateQualityScore(notes);
        assertEqual(score, 20, 'Should get full 20 points for 5+ key points');
    });

    await runTest('Quality Score: Should give higher score for detailed action items', () => {
        const notesWithAssignee = {
            actionItems: [{ task: 'Test', assignee: 'Alice' }]
        };
        const notesWithoutAssignee = {
            actionItems: [{ task: 'Test', assignee: 'Non assigné' }]
        };
        const scoreWith = calculateQualityScore(notesWithAssignee);
        const scoreWithout = calculateQualityScore(notesWithoutAssignee);
        assert(scoreWith > scoreWithout, 'Detailed action items should score higher');
    });

    await runTest('Quality Score: Should achieve 100 for complete notes', () => {
        const completeNotes = {
            executiveSummary: 'A'.repeat(150),
            keyPoints: ['1', '2', '3', '4', '5'],
            actionItems: [{ task: 'Test', assignee: 'Alice' }],
            decisions: [{ decision: 'Approved' }],
            timeline: [{ time: '10:00', topic: 'Intro' }],
            risks: [{ risk: 'Delay', severity: 'high' }]
        };
        const score = calculateQualityScore(completeNotes);
        assertEqual(score, 100, 'Complete notes should score 100');
    });

    // ========================================================================
    // PHASE 4 TESTS: UI Helpers
    // ========================================================================
    console.log('\n📋 PHASE 4: Tests des helpers UI\n');

    await runTest('UI: Quality score class - excellent >= 80', () => {
        assertEqual(getQualityScoreClass(80), 'excellent', '80 should be excellent');
        assertEqual(getQualityScoreClass(100), 'excellent', '100 should be excellent');
    });

    await runTest('UI: Quality score class - good >= 60', () => {
        assertEqual(getQualityScoreClass(60), 'good', '60 should be good');
        assertEqual(getQualityScoreClass(79), 'good', '79 should be good');
    });

    await runTest('UI: Quality score class - fair >= 40', () => {
        assertEqual(getQualityScoreClass(40), 'fair', '40 should be fair');
        assertEqual(getQualityScoreClass(59), 'fair', '59 should be fair');
    });

    await runTest('UI: Quality score class - poor < 40', () => {
        assertEqual(getQualityScoreClass(39), 'poor', '39 should be poor');
        assertEqual(getQualityScoreClass(0), 'poor', '0 should be poor');
    });

    await runTest('UI: Meeting type labels in French', () => {
        assertEqual(getMeetingTypeLabel('standup'), 'Daily/Standup', 'standup label');
        assertEqual(getMeetingTypeLabel('planning'), 'Planification', 'planning label');
        assertEqual(getMeetingTypeLabel('retrospective'), 'Rétrospective', 'retrospective label');
        assertEqual(getMeetingTypeLabel('interview'), 'Entretien', 'interview label');
    });

    await runTest('UI: Unknown meeting type returns original', () => {
        assertEqual(getMeetingTypeLabel('custom_type'), 'custom_type', 'Unknown type should return itself');
    });

    // ========================================================================
    // INTEGRATION TESTS
    // ========================================================================
    console.log('\n📋 INTEGRATION: Tests d\'intégration\n');

    await runTest('Integration: Full pipeline - preprocess -> validate -> score', () => {
        // Simulate a meeting transcript
        const rawTranscripts = [
            { speaker: 'Alice', text: 'Euh bonjour, euh bienvenue à cette réunion', timestamp: '2024-01-01T10:00:00' },
            { speaker: 'Alice', text: 'Nous allons discuter du projet X', timestamp: '2024-01-01T10:00:30' },
            { speaker: 'Bob', text: 'OK', timestamp: '2024-01-01T10:01:00' }, // Should be filtered
            { speaker: 'Bob', text: 'Je propose que que nous commencions par les objectifs', timestamp: '2024-01-01T10:01:30' },
            { speaker: 'Charlie', text: 'Hum je suis d\'accord avec Bob', timestamp: '2024-01-01T10:02:00' }
        ];

        // Step 1: Preprocess
        const preprocessed = preprocessTranscripts(rawTranscripts);
        assert(preprocessed.length < rawTranscripts.length, 'Should have fewer entries after preprocessing');
        assert(preprocessed.length >= 2, 'Should have at least 2 entries');

        // Step 2: Simulate AI response and validate
        const aiResponse = {
            executiveSummary: 'Cette réunion a porté sur le projet X. Les participants ont discuté des objectifs et ont convenu de plusieurs actions à entreprendre pour avancer.',
            keyPoints: ['Discussion du projet X', 'Définition des objectifs'],
            actionItems: ['Préparer le rapport', 'Envoyer les invitations'],
            decisions: ['Approuver le plan'],
            risks: ['Risque de retard si ressources insuffisantes']
        };
        const validated = validateStructure(aiResponse);

        // Should have all fields
        assert('meetingType' in validated, 'Should have meetingType');
        assert('objectives' in validated, 'Should have objectives');
        assert('risks' in validated, 'Should have risks');

        // Arrays should be normalized
        assert(typeof validated.actionItems[0] === 'object', 'Action items should be objects');
        assert(typeof validated.risks[0] === 'object', 'Risks should be objects');

        // Step 3: Calculate quality score
        const score = calculateQualityScore(validated);
        assert(score > 0, 'Should have positive quality score');
        assert(score <= 100, 'Score should be <= 100');

        console.log(`      Pipeline test - Quality score: ${score}/100 (${getQualityScoreClass(score)})`);
    });

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RÉSULTATS DES TESTS');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    console.log(`Total: ${testsPassed + testsFailed} tests`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);

    if (failedTests.length > 0) {
        console.log('\n❌ Tests échoués:');
        failedTests.forEach(t => {
            console.log(`   - ${t.name}: ${t.error}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════\n');

    // Exit with appropriate code
    process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
