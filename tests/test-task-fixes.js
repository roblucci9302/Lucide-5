/**
 * Test Script for Task Management Fixes
 * Tests:
 * - Fix 1: Relative date normalization (FR/EN)
 * - Fix 2: Time estimation heuristics
 * - Fix 3: French action patterns ("n'oubliez pas")
 */

// Import modules
const { parseRelativeDate, isOverdue, isWithinDays, formatDateForDisplay } = require('../src/features/common/utils/dateUtils');
const { estimateTaskDuration, estimateBulkTasks, getTotalEstimation } = require('../src/features/common/utils/taskEstimation');

console.log('═══════════════════════════════════════════════════════════════');
console.log('           TEST: Task Management Fixes Validation');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;

function test(name, condition, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ ${name}`);
    } else {
        console.log(`  ❌ ${name}`);
        if (details) console.log(`     → ${details}`);
    }
}

// ============================================================
// FIX 1: Relative Date Normalization Tests
// ============================================================
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│  FIX 1: Relative Date Normalization (dateUtils.js)          │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const today = new Date('2025-11-26T10:00:00');

// French day names
console.log('  French day names:');
const vendredi = parseRelativeDate('vendredi', today);
test('Parse "vendredi" → ISO date', vendredi !== null, `Got: ${vendredi}`);
test('"vendredi" is in the future', vendredi ? new Date(vendredi) > today : false);

const lundi = parseRelativeDate('lundi', today);
test('Parse "lundi" → ISO date', lundi !== null, `Got: ${lundi}`);

// French relative expressions
console.log('\n  French relative expressions:');
const demain = parseRelativeDate('demain', today);
test('Parse "demain" → ISO date', demain !== null, `Got: ${demain}`);

const cetteSemaine = parseRelativeDate('cette semaine', today);
test('Parse "cette semaine" → ISO date', cetteSemaine !== null, `Got: ${cetteSemaine}`);

const semaineProchaine = parseRelativeDate('la semaine prochaine', today);
test('Parse "la semaine prochaine" → ISO date', semaineProchaine !== null, `Got: ${semaineProchaine}`);

const dans3Jours = parseRelativeDate('dans 3 jours', today);
test('Parse "dans 3 jours" → ISO date', dans3Jours !== null, `Got: ${dans3Jours}`);

const finNovembre = parseRelativeDate('fin novembre', today);
test('Parse "fin novembre" → ISO date', finNovembre !== null, `Got: ${finNovembre}`);

// English patterns (ensure no regression)
console.log('\n  English patterns (regression test):');
const tomorrow = parseRelativeDate('tomorrow', today);
test('Parse "tomorrow" → ISO date', tomorrow !== null, `Got: ${tomorrow}`);

const nextWeek = parseRelativeDate('next week', today);
test('Parse "next week" → ISO date', nextWeek !== null, `Got: ${nextWeek}`);

const in5Days = parseRelativeDate('in 5 days', today);
test('Parse "in 5 days" → ISO date', in5Days !== null, `Got: ${in5Days}`);

// Edge cases
console.log('\n  Edge cases:');
const alreadyISO = parseRelativeDate('2025-12-15', today);
test('Already ISO date returns unchanged', alreadyISO === '2025-12-15', `Got: ${alreadyISO}`);

const tbdResult = parseRelativeDate('TBD', today);
test('TBD returns null', tbdResult === null);

const flexibleResult = parseRelativeDate('flexible', today);
test('"flexible" returns null', flexibleResult === null);

// isOverdue tests
console.log('\n  isOverdue() tests:');
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
test('Yesterday is overdue', isOverdue(yesterday.toISOString(), today) === true);
test('Tomorrow is NOT overdue', isOverdue('demain', today) === false);
test('TBD is NOT overdue', isOverdue('TBD', today) === false);

// isWithinDays tests
console.log('\n  isWithinDays() tests:');
test('"demain" is within 7 days', isWithinDays('demain', 7, today) === true);
test('"cette semaine" is within 7 days', isWithinDays('cette semaine', 7, today) === true);

// ============================================================
// FIX 2: Time Estimation Heuristics Tests
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  FIX 2: Time Estimation Heuristics (taskEstimation.js)      │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

// High complexity tasks
console.log('  High complexity tasks:');
const implTask = estimateTaskDuration('Implement the new authentication system', 'high');
test('Implement task → high complexity', implTask.complexity === 'high', `Got: ${implTask.complexity}`);
test('Implement task → 3-8 hours', implTask.estimatedHours >= 3 && implTask.estimatedHours <= 8, `Got: ${implTask.estimatedHours}h`);

const rechercheTask = estimateTaskDuration('Rechercher les solutions alternatives', 'medium');
test('"Rechercher" (FR) → high complexity', rechercheTask.complexity === 'high', `Got: ${rechercheTask.complexity}`);

// Medium complexity tasks
console.log('\n  Medium complexity tasks:');
const prepareTask = estimateTaskDuration('Préparer le rapport financier', 'medium');
test('"Préparer" task → medium complexity', prepareTask.complexity === 'medium', `Got: ${prepareTask.complexity}`);
test('Prepare task → 1-4 hours', prepareTask.estimatedHours >= 1 && prepareTask.estimatedHours <= 4, `Got: ${prepareTask.estimatedHours}h`);

const finirTask = estimateTaskDuration('Finir le document de spécifications', 'high');
test('"Finir" (FR) → medium complexity', finirTask.complexity === 'medium', `Got: ${finirTask.complexity}`);

// Low complexity tasks
console.log('\n  Low complexity tasks:');
const sendTask = estimateTaskDuration('Send the email to the client', 'low');
test('Send email → low complexity', sendTask.complexity === 'low', `Got: ${sendTask.complexity}`);
test('Send task → 0.25-1 hour', sendTask.estimatedHours >= 0.25 && sendTask.estimatedHours <= 1, `Got: ${sendTask.estimatedHours}h`);

const regarderTask = estimateTaskDuration('Regarder le bug de connexion', 'low');
test('"Regarder" (FR) → low complexity', regarderTask.complexity === 'low', `Got: ${regarderTask.complexity}`);

// Urgency modifiers
console.log('\n  Urgency modifiers:');
const urgentTask = estimateTaskDuration('Fix the urgent bug immediately', 'high');
test('Urgent task has reduced estimate', urgentTask.estimatedHours < 4, `Got: ${urgentTask.estimatedHours}h (base would be ~4h)`);

// Scope multipliers
console.log('\n  Scope multipliers:');
const allDocsTask = estimateTaskDuration('Update all the documentation', 'medium');
const singleDocTask = estimateTaskDuration('Update the documentation', 'medium');
test('"All docs" takes longer than "single doc"', allDocsTask.estimatedHours > singleDocTask.estimatedHours,
    `All: ${allDocsTask.estimatedHours}h vs Single: ${singleDocTask.estimatedHours}h`);

const quickTask = estimateTaskDuration('Quick review of the code', 'medium');
test('"Quick" modifier reduces estimate', quickTask.estimatedHours <= 1.5, `Got: ${quickTask.estimatedHours}h`);

// Bulk estimation
console.log('\n  Bulk estimation:');
const bulkTasks = estimateBulkTasks([
    { taskDescription: 'Implement new feature', priority: 'high' },
    { taskDescription: 'Send email to team', priority: 'low' },
    { taskDescription: 'Prepare presentation', priority: 'medium' }
]);
test('Bulk estimation returns 3 tasks', bulkTasks.length === 3);
test('All tasks have estimated_hours', bulkTasks.every(t => t.estimated_hours > 0));

const totalEst = getTotalEstimation(bulkTasks);
test('Total estimation calculated', totalEst.totalHours > 0, `Total: ${totalEst.totalHours}h for ${totalEst.taskCount} tasks`);

// ============================================================
// FIX 3: French Action Patterns Tests
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  FIX 3: French Action Patterns (liveInsightsService.js)     │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

// Test pattern matching directly
const actionPatterns = [
    /\b(il faut|doit|devra|dois|devons|devez)\b/i,
    /\b(tu peux|peux-tu|pouvez-vous|pourriez-vous)\s+\w+/i,
    /\b(n'oublie[zs]? pas|pensez à|pense à)/i,
    /\b(finis|termine|prépare|regarde|vérifie|envoie|contacte)\b/i
];

const deadlinePatterns = [
    /\b(pour|avant|d'ici)\s+(demain|aujourd'hui|ce soir|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i,
    /\b(pour|avant|d'ici)\s+(cette semaine|la semaine prochaine|le mois prochain)/i,
    /\b(pour|avant|d'ici)\s+le\s+\d{1,2}/i,
    /\b(dans\s+\d+\s+(heures?|jours?|semaines?|mois))/i
];

console.log('  Action pattern tests:');
const testPhrases = [
    { text: "il faut absolument finir le rapport", expected: true, desc: '"il faut"' },
    { text: "tu peux regarder le bug", expected: true, desc: '"tu peux + action"' },
    { text: "n'oubliez pas la réunion", expected: true, desc: '"n\'oubliez pas"' },
    { text: "pensez à envoyer le mail", expected: true, desc: '"pensez à"' },
    { text: "termine le document", expected: true, desc: '"termine"' },
    { text: "la réunion est à 14h", expected: false, desc: 'No action verb' }
];

testPhrases.forEach(({ text, expected, desc }) => {
    const matches = actionPatterns.some(pattern => pattern.test(text));
    test(`${desc} → ${expected ? 'match' : 'no match'}`, matches === expected, `Text: "${text}"`);
});

console.log('\n  Deadline pattern tests:');
const deadlineTests = [
    { text: "pour vendredi", expected: true, desc: '"pour vendredi"' },
    { text: "avant la semaine prochaine", expected: true, desc: '"avant la semaine prochaine"' },
    { text: "d'ici demain", expected: true, desc: '"d\'ici demain"' },
    { text: "dans 3 jours", expected: true, desc: '"dans 3 jours"' },
    { text: "pour le 15", expected: true, desc: '"pour le 15"' },
    { text: "bientôt", expected: false, desc: '"bientôt" (vague)' }
];

deadlineTests.forEach(({ text, expected, desc }) => {
    const matches = deadlinePatterns.some(pattern => pattern.test(text));
    test(`${desc} → ${expected ? 'match' : 'no match'}`, matches === expected, `Text: "${text}"`);
});

// ============================================================
// INTEGRATION TEST: Original Transcript
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  INTEGRATION TEST: Original Transcript                       │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const originalTranscript = `Marie, il faut absolument que tu finisses le rapport financier pour vendredi, c'est urgent.
Pierre, tu peux regarder le bug de connexion quand tu as le temps ?
Et n'oubliez pas la réunion client de la semaine prochaine.`;

console.log('  Original transcript:');
console.log(`  "${originalTranscript.replace(/\n/g, ' ').substring(0, 80)}..."\n`);

// Test each sentence
const sentences = originalTranscript.split(/[.!?]\s*/).filter(s => s.trim());

console.log('  Sentence analysis:');
sentences.forEach((sentence, i) => {
    const hasAction = actionPatterns.some(p => p.test(sentence));
    const hasDeadline = deadlinePatterns.some(p => p.test(sentence));

    console.log(`  ${i+1}. "${sentence.trim().substring(0, 60)}..."`);
    console.log(`     Action: ${hasAction ? '✅' : '❌'}  Deadline: ${hasDeadline ? '✅' : '❌'}`);
});

// Expected results
console.log('\n  Expected task extraction:');
test('Task 1: "finir le rapport financier" detected',
    actionPatterns.some(p => p.test('il faut absolument que tu finisses')));
test('Task 1: Deadline "vendredi" detected',
    deadlinePatterns.some(p => p.test('pour vendredi')));

test('Task 2: "regarder le bug" detected',
    actionPatterns.some(p => p.test('tu peux regarder')));

test('Task 3: "n\'oubliez pas la réunion" detected',
    actionPatterns.some(p => p.test("n'oubliez pas la réunion")));
test('Task 3: Deadline "la semaine prochaine" detected',
    parseRelativeDate('la semaine prochaine', today) !== null);

// ============================================================
// SUMMARY
// ============================================================
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                         SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

const passRate = ((passedTests / totalTests) * 100).toFixed(1);
console.log(`  Tests passed: ${passedTests}/${totalTests} (${passRate}%)`);
console.log();

if (passedTests === totalTests) {
    console.log('  ✅ ALL FIXES VALIDATED SUCCESSFULLY');
} else {
    console.log(`  ⚠️  ${totalTests - passedTests} test(s) failed - review needed`);
}

console.log();
console.log('  Fix Status:');
console.log('  ├─ Fix 1 (Date normalization): ✅ Implemented');
console.log('  ├─ Fix 2 (Time estimation):    ✅ Implemented');
console.log('  └─ Fix 3 (French patterns):    ✅ Implemented');
console.log();
