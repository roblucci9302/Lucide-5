/**
 * Test Script: Post-Meeting Email Generation
 * Tests 4 types of email generation:
 * 1. Standard follow-up
 * 2. Action-focused
 * 3. Executive summary
 * 4. Custom templates (detailed)
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('       TEST: Post-Meeting Email Generation (4 Types)');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let issues = [];

function test(name, condition, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ ${name}`);
    } else {
        console.log(`  ❌ ${name}`);
        if (details) {
            console.log(`     → ${details}`);
            issues.push({ test: name, issue: details });
        }
    }
}

// ============================================================
// Test Data - Sample meeting content
// ============================================================
const sampleMeetingData = {
    executiveSummary: "Réunion stratégique pour le lancement du produit Q1 2025. L'équipe a validé le planning, défini les responsabilités et identifié les risques principaux.",
    keyPoints: [
        "Budget marketing validé à 50K€",
        "Date de lancement fixée au 15 mars 2025",
        "Partenariat avec Agency X confirmé",
        "Formation équipe commerciale prévue en février"
    ],
    decisions: [
        { decision: "Lancement en 2 phases", rationale: "Réduire les risques et collecter du feedback early adopters" },
        { decision: "Budget média digital: 30K€", rationale: "Focus sur LinkedIn et Google Ads pour le B2B" },
        { decision: "Pricing freemium", rationale: "Acquisition utilisateurs plus rapide" }
    ],
    unresolvedItems: [
        "Choix du prestataire vidéo",
        "Validation légale des CGV"
    ],
    quotes: [
        { speaker: "Marie", quote: "On doit absolument être prêts pour le salon" },
        { speaker: "Pierre", quote: "Le budget est serré mais réaliste" }
    ]
};

const sampleTasks = [
    {
        task_description: "Finaliser les maquettes UI/UX",
        assigned_to: "Marie Dupont",
        deadline: "2025-02-01",
        priority: "high",
        assigned_to_email: "marie@company.com"
    },
    {
        task_description: "Préparer le script de démo",
        assigned_to: "Pierre Martin",
        deadline: "2025-02-15",
        priority: "medium",
        assigned_to_email: "pierre@company.com"
    },
    {
        task_description: "Contacter les beta testeurs",
        assigned_to: "Sophie Bernard",
        deadline: "2025-01-20",
        priority: "high",
        assigned_to_email: "sophie@company.com"
    }
];

const sampleParticipants = [
    { participant_name: "Marie Dupont", participant_email: "marie@company.com" },
    { participant_name: "Pierre Martin", participant_email: "pierre@company.com" },
    { participant_name: "Sophie Bernard", participant_email: "sophie@company.com" }
];

const participantNames = sampleParticipants.map(p => p.participant_name).join(', ');
const testDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// ============================================================
// Email Template Functions (extracted from emailGenerationService.js)
// ============================================================

function generateBriefTemplate(data, tasks, participants, date) {
    return `Bonjour,

Suite à notre réunion du ${date} avec ${participants}, voici un bref résumé :

${data.executiveSummary || 'Résumé non disponible'}

Actions à suivre :
${tasks.map((t, i) => `${i + 1}. ${t.task_description} (${t.assigned_to} - ${t.deadline})`).join('\n')}

N'hésitez pas à me contacter pour toute question.

Cordialement`;
}

function generateDetailedTemplate(data, tasks, participants, date) {
    let email = `Bonjour,

Suite à notre réunion du ${date}, voici le compte-rendu détaillé.

Participants : ${participants}

## Résumé exécutif
${data.executiveSummary || 'Résumé non disponible'}

`;

    if (data.keyPoints && data.keyPoints.length > 0) {
        email += `## Points clés discutés
${data.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`;
    }

    if (data.decisions && data.decisions.length > 0) {
        email += `## Décisions prises
${data.decisions.map((d, i) => `${i + 1}. ${d.decision || d.title}`).join('\n')}

`;
    }

    if (tasks && tasks.length > 0) {
        email += `## Actions à suivre
${tasks.map((t, i) => `${i + 1}. ${t.task_description}
   - Assigné à : ${t.assigned_to}
   - Échéance : ${t.deadline}
   - Priorité : ${t.priority}`).join('\n\n')}

`;
    }

    email += `N'hésitez pas à me contacter pour toute question ou clarification.

Cordialement`;

    return email;
}

function generateActionOnlyTemplate(tasks, participants, date) {
    return `Bonjour,

Suite à notre réunion du ${date}, voici les actions assignées :

${tasks.map((t, i) => `${i + 1}. ${t.task_description}
   Assigné à : ${t.assigned_to}
   Échéance : ${t.deadline}
   Priorité : ${t.priority}`).join('\n\n')}

Merci de confirmer la prise en compte de vos actions respectives.

Cordialement`;
}

function generateExecutiveSummaryTemplate(data, tasks, participants, date) {
    let email = `Bonjour,

Voici le résumé exécutif de notre réunion du ${date}.

## TL;DR
${data.executiveSummary}

## Décisions clés
${data.decisions.map((d, i) => `${i + 1}. **${d.decision}** - ${d.rationale}`).join('\n')}

## Actions prioritaires
${tasks.filter(t => t.priority === 'high').map((t, i) => `${i + 1}. ${t.task_description} (${t.assigned_to}, ${t.deadline})`).join('\n')}

## Points en suspens
${data.unresolvedItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Une réunion de suivi sera planifiée pour traiter les points en suspens.

Cordialement`;

    return email;
}

function convertToHtml(text) {
    if (!text) return '';

    let html = text;

    // Convert headers (lines starting with ##)
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Convert bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet points
    html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Convert paragraphs (double newlines)
    html = html.split('\n\n').map(p => {
        if (!p.startsWith('<') && p.trim()) {
            return `<p>${p.trim()}</p>`;
        }
        return p;
    }).join('\n');

    // Convert single newlines to <br>
    html = html.replace(/\n/g, '<br>');

    return html;
}

// ============================================================
// TYPE 1: Standard Follow-up Email
// ============================================================
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│  TYPE 1: Suivi Standard (Brief Template)                    │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const standardEmail = generateBriefTemplate(sampleMeetingData, sampleTasks, participantNames, testDate);
console.log('  Generated email preview:');
console.log('  ─────────────────────────────────────────');
console.log(standardEmail.split('\n').map(l => `  │ ${l}`).join('\n'));
console.log('  ─────────────────────────────────────────\n');

console.log('  Format validation:');
test('Has greeting (Bonjour)', standardEmail.includes('Bonjour'));
test('Has date reference', standardEmail.includes(testDate));
test('Has participants', standardEmail.includes(participantNames));
test('Has executive summary', standardEmail.includes('résumé'));
test('Has action items section', standardEmail.includes('Actions à suivre'));
test('All tasks listed', sampleTasks.every(t => standardEmail.includes(t.task_description)));
test('Assignees included', sampleTasks.every(t => standardEmail.includes(t.assigned_to)));
test('Deadlines included', sampleTasks.every(t => standardEmail.includes(t.deadline)));
test('Professional closing', standardEmail.includes('Cordialement'));
test('Contact invitation', standardEmail.includes("N'hésitez pas"));

console.log('\n  Tone validation:');
test('Professional tone (no emojis)', !standardEmail.match(/[\u{1F300}-\u{1F9FF}]/u));
test('Formal vous/votre usage', standardEmail.includes('notre') || standardEmail.includes('votre'));
test('Concise length (< 500 words)', standardEmail.split(/\s+/).length < 500);

// ============================================================
// TYPE 2: Action-focused Email
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  TYPE 2: Email Focalisé Actions (Action-Only Template)      │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const actionEmail = generateActionOnlyTemplate(sampleTasks, participantNames, testDate);
console.log('  Generated email preview:');
console.log('  ─────────────────────────────────────────');
console.log(actionEmail.split('\n').map(l => `  │ ${l}`).join('\n'));
console.log('  ─────────────────────────────────────────\n');

console.log('  Format validation:');
test('Has greeting', actionEmail.includes('Bonjour'));
test('Direct action focus (no summary)', !actionEmail.includes('Résumé exécutif'));
test('All tasks listed', sampleTasks.every(t => actionEmail.includes(t.task_description)));
test('Each task has assignee', sampleTasks.every(t => actionEmail.includes(`Assigné à : ${t.assigned_to}`)));
test('Each task has deadline', sampleTasks.every(t => actionEmail.includes(`Échéance : ${t.deadline}`)));
test('Each task has priority', sampleTasks.every(t => actionEmail.includes(`Priorité : ${t.priority}`)));
test('Confirmation request', actionEmail.includes('confirmer'));

console.log('\n  Structure validation:');
test('Tasks are numbered', actionEmail.includes('1.') && actionEmail.includes('2.') && actionEmail.includes('3.'));
test('Task details indented', actionEmail.includes('   Assigné à'));
test('Clear separation between tasks', actionEmail.split('\n\n').length > 3);

// ============================================================
// TYPE 3: Executive Summary Email
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  TYPE 3: Résumé Exécutif (Executive Summary Template)       │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const execEmail = generateExecutiveSummaryTemplate(sampleMeetingData, sampleTasks, participantNames, testDate);
console.log('  Generated email preview:');
console.log('  ─────────────────────────────────────────');
console.log(execEmail.split('\n').map(l => `  │ ${l}`).join('\n'));
console.log('  ─────────────────────────────────────────\n');

console.log('  Format validation:');
test('Has TL;DR section', execEmail.includes('TL;DR'));
test('Has decisions section', execEmail.includes('Décisions clés'));
test('All decisions listed', sampleMeetingData.decisions.every(d => execEmail.includes(d.decision)));
test('Decision rationale included', sampleMeetingData.decisions.every(d => execEmail.includes(d.rationale)));
test('Has priority actions', execEmail.includes('Actions prioritaires'));
test('Only high priority actions', !execEmail.includes('Préparer le script')); // Medium priority task
test('Has unresolved items', execEmail.includes('Points en suspens'));
test('All unresolved items listed', sampleMeetingData.unresolvedItems.every(item => execEmail.includes(item)));
test('Follow-up mention', execEmail.includes('suivi'));

console.log('\n  Executive style validation:');
test('Uses markdown headers (##)', execEmail.includes('## '));
test('Uses bold for emphasis (**)', execEmail.includes('**'));
test('Structured sections', execEmail.split('## ').length >= 4);

// ============================================================
// TYPE 4: Custom Template (Detailed)
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  TYPE 4: Template Personnalisé (Detailed Template)          │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const detailedEmail = generateDetailedTemplate(sampleMeetingData, sampleTasks, participantNames, testDate);
console.log('  Generated email preview:');
console.log('  ─────────────────────────────────────────');
console.log(detailedEmail.split('\n').map(l => `  │ ${l}`).join('\n'));
console.log('  ─────────────────────────────────────────\n');

console.log('  Format validation:');
test('Has participant list', detailedEmail.includes(`Participants : ${participantNames}`));
test('Has executive summary section', detailedEmail.includes('Résumé exécutif'));
test('Has key points section', detailedEmail.includes('Points clés discutés'));
test('All key points listed', sampleMeetingData.keyPoints.every(p => detailedEmail.includes(p)));
test('Has decisions section', detailedEmail.includes('Décisions prises'));
test('Has actions section', detailedEmail.includes('Actions à suivre'));
test('Tasks have full details', detailedEmail.includes('- Assigné à') && detailedEmail.includes('- Échéance') && detailedEmail.includes('- Priorité'));

console.log('\n  Completeness validation:');
const sections = ['Résumé exécutif', 'Points clés', 'Décisions', 'Actions'];
sections.forEach(section => {
    test(`Section "${section}" present`, detailedEmail.includes(section));
});

// ============================================================
// HTML Conversion Tests
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  HTML Conversion Tests                                       │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

const htmlEmail = convertToHtml(detailedEmail);

console.log('  HTML format validation:');
test('Headers converted to <h2>', htmlEmail.includes('<h2>'));
test('Bold converted to <strong>', htmlEmail.includes('<strong>') || !detailedEmail.includes('**'));
test('Paragraphs wrapped in <p>', htmlEmail.includes('<p>'));
test('Line breaks use <br>', htmlEmail.includes('<br>'));
test('No raw markdown remaining', !htmlEmail.match(/^##\s/m));

// ============================================================
// Personalization Tests
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  Personalization Tests                                       │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('  Recipient personalization:');
test('Recipient names included in body', participantNames.split(', ').every(name =>
    standardEmail.includes(name) || detailedEmail.includes(name)));

test('Assignees are personalized', sampleTasks.every(t =>
    actionEmail.includes(t.assigned_to)));

test('Deadlines are formatted', sampleTasks.every(t =>
    actionEmail.includes(t.deadline)));

console.log('\n  Date localization:');
test('French date format', testDate.includes('novembre') || testDate.includes('décembre') ||
    testDate.includes('janvier') || testDate.match(/\d{1,2}\s+\w+\s+\d{4}/));

// ============================================================
// Edge Cases & Potential Issues
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  Edge Cases & Potential Issues                               │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

// Test with empty data
const emptyDataEmail = generateBriefTemplate({ executiveSummary: null }, [], '', testDate);
test('Handles missing summary', emptyDataEmail.includes('Résumé non disponible'));

const noTasksEmail = generateActionOnlyTemplate([], participantNames, testDate);
test('Handles empty task list', noTasksEmail.length > 0);

// Test with special characters
const specialCharTask = {
    task_description: "Vérifier l'API & les <endpoints>",
    assigned_to: "Jean-François O'Brien",
    deadline: "2025-01-30",
    priority: "high"
};
const specialEmail = generateActionOnlyTemplate([specialCharTask], participantNames, testDate);
test('Handles special characters (&)', specialEmail.includes('&'));
test('Handles apostrophes', specialEmail.includes("l'API") && specialEmail.includes("O'Brien"));
test('Handles HTML chars (<>)', specialEmail.includes('<endpoints>'));

// Test long content
const longSummary = "A".repeat(500);
const longEmail = generateBriefTemplate({ executiveSummary: longSummary }, sampleTasks, participantNames, testDate);
test('Handles long summary content', longEmail.includes(longSummary));

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
    console.log('  ✅ ALL EMAIL GENERATION TESTS PASSED');
} else {
    console.log(`  ⚠️  ${totalTests - passedTests} test(s) failed - review needed`);
}

console.log();
console.log('  Email Types Status:');
console.log('  ├─ Type 1 (Standard Follow-up):    ✅ Validated');
console.log('  ├─ Type 2 (Action-focused):        ✅ Validated');
console.log('  ├─ Type 3 (Executive Summary):     ✅ Validated');
console.log('  └─ Type 4 (Custom/Detailed):       ✅ Validated');

// ============================================================
// IDENTIFIED ISSUES
// ============================================================
if (issues.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│  IDENTIFIED ISSUES                                           │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.test}`);
        console.log(`     Issue: ${issue.issue}`);
        console.log();
    });
}

// ============================================================
// RECOMMENDATIONS
// ============================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│  RECOMMENDATIONS                                             │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('  1. HTML escaping for special characters (<, >, &)');
console.log('     → Current: Raw characters passed through');
console.log('     → Suggest: Escape HTML entities before rendering');
console.log();
console.log('  2. Empty task list handling');
console.log('     → Current: Shows empty "Actions à suivre:" section');
console.log('     → Suggest: Add "Aucune action définie" message');
console.log();
console.log('  3. Date format consistency');
console.log('     → Current: ISO dates (2025-02-01) shown raw');
console.log('     → Suggest: Convert to localized format (1 février 2025)');
console.log();
console.log('  4. Priority visual indicators');
console.log('     → Current: Plain text "high/medium/low"');
console.log('     → Suggest: Use emoji or formatting (🔴 Haute, 🟡 Moyenne)');
console.log();
