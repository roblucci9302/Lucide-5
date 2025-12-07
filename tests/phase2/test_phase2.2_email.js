/**
 * Phase 2.2 Test - Email Generation
 * Tests template generation, AI email generation, and email utilities
 */

const emailGenerationService = require('../../src/features/listen/postCall/emailGenerationService');
const { meetingNotesRepository, meetingTasksRepository } = require('../../src/features/listen/postCall/repositories');
const participantService = require('../../src/features/listen/postCall/participantService');
const { v4: uuidv4 } = require('uuid');

console.log('\n=== PHASE 2.2 TEST: EMAIL GENERATION ===\n');

// Test data
const testSessionId = `test-email-session-${Date.now()}`;
const testUserId = 'test-user-email-001';

async function runTests() {
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Setup: Create test meeting notes
        console.log('📝 Setting up test data...\n');

        const db = require('../../src/features/common/services/database');
        const dbInstance = db.getDB();

        const noteId = uuidv4();
        const now = Math.floor(Date.now() / 1000);

        // Create meeting notes
        dbInstance.prepare(`
            INSERT INTO meeting_notes (
                id, session_id, user_id, meeting_title, participants,
                key_points, action_items, decisions, next_steps,
                created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            noteId,
            testSessionId,
            testUserId,
            'Q4 Planning Meeting',
            'John Doe, Jane Smith, Bob Johnson',
            JSON.stringify([
                'Discussed Q4 product roadmap',
                'Reviewed budget allocation',
                'Identified key risks and mitigation strategies'
            ]),
            JSON.stringify([
                'John to prepare budget proposal by Friday',
                'Jane to review technical feasibility',
                'Bob to coordinate with stakeholders'
            ]),
            JSON.stringify([
                'Approved budget of $500K for Q4',
                'Decided to launch feature in November'
            ]),
            'Schedule follow-up meeting for next week',
            now,
            'clean'
        );

        // Create test tasks
        const taskId1 = uuidv4();
        const taskId2 = uuidv4();

        dbInstance.prepare(`
            INSERT INTO meeting_tasks (
                id, session_id, user_id, task_description, assigned_to,
                assigned_to_email, deadline, priority, status, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            taskId1,
            testSessionId,
            testUserId,
            'Prepare budget proposal',
            'John Doe',
            'john.doe@example.com',
            '2025-11-29',
            'high',
            'pending',
            now,
            'clean'
        );

        dbInstance.prepare(`
            INSERT INTO meeting_tasks (
                id, session_id, user_id, task_description, assigned_to,
                assigned_to_email, deadline, priority, status, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            taskId2,
            testSessionId,
            testUserId,
            'Review technical feasibility',
            'Jane Smith',
            'jane.smith@example.com',
            '2025-11-30',
            'medium',
            'pending',
            now,
            'clean'
        );

        // Create participants
        const participantId1 = uuidv4();
        const participantId2 = uuidv4();

        dbInstance.prepare(`
            INSERT INTO session_participants (
                id, session_id, speaker_label, participant_name,
                participant_email, participant_role, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            participantId1,
            testSessionId,
            'Me',
            'John Doe',
            'john.doe@example.com',
            'Product Manager',
            now,
            'clean'
        );

        dbInstance.prepare(`
            INSERT INTO session_participants (
                id, session_id, speaker_label, participant_name,
                participant_email, participant_role, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            participantId2,
            testSessionId,
            'Them',
            'Jane Smith',
            'jane.smith@example.com',
            'Engineering Lead',
            now,
            'clean'
        );

        console.log('✅ Test data created\n');

        // Test 1: Generate brief template
        console.log('✓ Test 1: Generate brief email template');
        const briefEmail = emailGenerationService.generateQuickTemplate(testSessionId, 'brief');

        if (briefEmail && briefEmail.subject && briefEmail.body) {
            console.log('  ✅ Brief template generated');
            console.log(`    Subject: ${briefEmail.subject}`);
            console.log(`    Body length: ${briefEmail.body.length} characters`);
            console.log(`    Recipients: ${briefEmail.recipients.length} people`);
            testsPassed++;
        } else {
            console.log('  ❌ Failed to generate brief template');
            testsFailed++;
        }

        // Test 2: Generate detailed template
        console.log('\n✓ Test 2: Generate detailed email template');
        const detailedEmail = emailGenerationService.generateQuickTemplate(testSessionId, 'detailed');

        if (detailedEmail && detailedEmail.subject && detailedEmail.body) {
            console.log('  ✅ Detailed template generated');
            console.log(`    Subject: ${detailedEmail.subject}`);
            console.log(`    Body length: ${detailedEmail.body.length} characters`);

            // Check if it includes key sections
            const hasKeyPoints = detailedEmail.body.includes('Key Points') || detailedEmail.body.includes('Points clés');
            const hasDecisions = detailedEmail.body.includes('Decisions') || detailedEmail.body.includes('Décisions');
            const hasActions = detailedEmail.body.includes('Action Items') || detailedEmail.body.includes('Actions');

            if (hasKeyPoints && hasDecisions && hasActions) {
                console.log('  ✅ Template includes all required sections');
                testsPassed++;
            } else {
                console.log('  ⚠️  Template missing some sections');
                console.log(`    Has Key Points: ${hasKeyPoints}`);
                console.log(`    Has Decisions: ${hasDecisions}`);
                console.log(`    Has Actions: ${hasActions}`);
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to generate detailed template');
            testsFailed++;
        }

        // Test 3: Generate action-only template
        console.log('\n✓ Test 3: Generate action-only email template');
        const actionEmail = emailGenerationService.generateQuickTemplate(testSessionId, 'action-only');

        if (actionEmail && actionEmail.subject && actionEmail.body) {
            console.log('  ✅ Action-only template generated');
            console.log(`    Subject: ${actionEmail.subject}`);
            console.log(`    Body length: ${actionEmail.body.length} characters`);

            // Check if it focuses on tasks
            const tasks = meetingTasksRepository.getBySessionId(testSessionId);
            let mentionsAllTasks = true;

            tasks.forEach(task => {
                if (!actionEmail.body.includes(task.task_description)) {
                    mentionsAllTasks = false;
                }
            });

            if (mentionsAllTasks) {
                console.log('  ✅ All tasks mentioned in email');
                testsPassed++;
            } else {
                console.log('  ⚠️  Some tasks not mentioned');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to generate action-only template');
            testsFailed++;
        }

        // Test 4: Recipient extraction
        console.log('\n✓ Test 4: Email recipient extraction');
        const recipients = emailGenerationService._getRecipients(testSessionId);

        if (Array.isArray(recipients) && recipients.length > 0) {
            console.log(`  ✅ Extracted ${recipients.length} recipients:`);
            recipients.forEach(r => console.log(`    - ${r}`));

            // Check for expected emails
            const hasJohn = recipients.includes('john.doe@example.com');
            const hasJane = recipients.includes('jane.smith@example.com');

            if (hasJohn && hasJane) {
                console.log('  ✅ All expected recipients found');
                testsPassed++;
            } else {
                console.log('  ⚠️  Some expected recipients missing');
                testsFailed++;
            }
        } else {
            console.log('  ❌ No recipients extracted');
            testsFailed++;
        }

        // Test 5: HTML formatting
        console.log('\n✓ Test 5: HTML email formatting');
        const htmlEmail = emailGenerationService.generateQuickTemplate(testSessionId, 'detailed');

        if (htmlEmail.bodyHtml) {
            console.log('  ✅ HTML version generated');

            // Check for HTML elements
            const hasHtmlTags = htmlEmail.bodyHtml.includes('<html>') &&
                               htmlEmail.bodyHtml.includes('<body>') &&
                               htmlEmail.bodyHtml.includes('</html>');

            const hasFormatting = htmlEmail.bodyHtml.includes('<strong>') ||
                                 htmlEmail.bodyHtml.includes('<b>') ||
                                 htmlEmail.bodyHtml.includes('<ul>');

            if (hasHtmlTags && hasFormatting) {
                console.log('  ✅ HTML properly formatted with styling');
                testsPassed++;
            } else {
                console.log('  ⚠️  HTML formatting incomplete');
                console.log(`    Has HTML tags: ${hasHtmlTags}`);
                console.log(`    Has formatting: ${hasFormatting}`);
                testsFailed++;
            }
        } else {
            console.log('  ❌ HTML version not generated');
            testsFailed++;
        }

        // Test 6: Mailto URL generation
        console.log('\n✓ Test 6: Mailto URL generation');
        const mailtoUrl = emailGenerationService._buildMailtoUrl(
            ['test@example.com'],
            'Test Subject',
            'Test body content'
        );

        if (mailtoUrl && mailtoUrl.startsWith('mailto:')) {
            console.log('  ✅ Mailto URL generated');

            const includesRecipient = mailtoUrl.includes('test@example.com');
            const includesSubject = mailtoUrl.includes('subject=');
            const includesBody = mailtoUrl.includes('body=');

            if (includesRecipient && includesSubject && includesBody) {
                console.log('  ✅ Mailto URL contains all components');
                console.log(`    URL: ${mailtoUrl.substring(0, 100)}...`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Mailto URL missing components');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Invalid mailto URL');
            testsFailed++;
        }

        // Test 7: AI email generation (if AI service is available)
        console.log('\n✓ Test 7: AI email generation');
        try {
            // Note: This test may fail if AI service is not configured
            const aiEmail = await emailGenerationService.generateFollowUpEmail(testSessionId, {
                tone: 'professional',
                template: 'follow-up'
            });

            if (aiEmail && aiEmail.subject && aiEmail.body) {
                console.log('  ✅ AI email generated');
                console.log(`    Subject: ${aiEmail.subject}`);
                console.log(`    Body preview: ${aiEmail.body.substring(0, 100)}...`);
                testsPassed++;
            } else {
                console.log('  ⚠️  AI email generated but incomplete');
                testsFailed++;
            }
        } catch (error) {
            if (error.message.includes('AI service') || error.message.includes('API key')) {
                console.log('  ⚠️  AI service not configured (skipping test)');
                console.log(`    Note: ${error.message}`);
                // Don't count as failure since it's expected without AI config
            } else {
                console.log('  ❌ AI generation error:', error.message);
                testsFailed++;
            }
        }

    } catch (error) {
        console.error('\n❌ Test execution error:', error);
        testsFailed++;
    }

    // Cleanup
    try {
        console.log('\n🧹 Cleaning up test data...');
        const db = require('../../src/features/common/services/database');
        const dbInstance = db.getDB();

        dbInstance.prepare('DELETE FROM meeting_notes WHERE session_id = ?').run(testSessionId);
        dbInstance.prepare('DELETE FROM meeting_tasks WHERE session_id = ?').run(testSessionId);
        dbInstance.prepare('DELETE FROM session_participants WHERE session_id = ?').run(testSessionId);

        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('⚠️  Cleanup error:', error);
    }

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('PHASE 2.2 TEST RESULTS:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total: ${testsPassed + testsFailed}`);
    console.log('='.repeat(50) + '\n');

    return { passed: testsPassed, failed: testsFailed };
}

// Run tests
runTests().catch(console.error);
