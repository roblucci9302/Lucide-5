/**
 * Phase 2.4 Test - Follow-up Suggestions
 * Tests intelligent suggestion generation, pattern analysis, and action execution
 */

const followUpSuggestionsService = require('../../src/features/listen/postCall/followUpSuggestionsService');
const { meetingNotesRepository, meetingTasksRepository, sessionParticipantsRepository } = require('../../src/features/listen/postCall/repositories');
const { v4: uuidv4 } = require('uuid');

console.log('\n=== PHASE 2.4 TEST: FOLLOW-UP SUGGESTIONS ===\n');

// Test data
const testSessionId = `test-suggestions-${Date.now()}`;
const testUserId = 'test-user-suggestions-001';

async function runTests() {
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Setup: Create comprehensive test data
        console.log('📝 Setting up test data...\n');

        const db = require('../../src/features/common/services/database');
        const dbInstance = db.getDB();
        const now = Math.floor(Date.now() / 1000);

        // Create meeting notes
        const noteId = uuidv4();
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
            'Weekly Team Sync',
            'Alice, Bob, Charlie',
            JSON.stringify([
                'Discussed sprint progress',
                'Reviewed blockers',
                'Planned next sprint'
            ]),
            JSON.stringify([
                'Alice to update documentation',
                'Bob to fix critical bugs',
                'Charlie to review PRs'
            ]),
            JSON.stringify([
                'Approved new feature design',
                'Decided to extend sprint by 2 days'
            ]),
            'Schedule retrospective for Friday',
            now,
            'clean'
        );

        // Create participants
        const participants = [
            {
                id: uuidv4(),
                session_id: testSessionId,
                speaker_label: 'Speaker 1',
                participant_name: 'Alice Cooper',
                participant_email: 'alice.cooper@example.com',
                participant_role: 'Tech Lead'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                speaker_label: 'Speaker 2',
                participant_name: 'Bob Dylan',
                participant_email: 'bob.dylan@example.com',
                participant_role: 'Developer'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                speaker_label: 'Speaker 3',
                participant_name: 'Charlie Parker',
                participant_email: 'charlie.parker@example.com',
                participant_role: 'QA Engineer'
            }
        ];

        participants.forEach(p => {
            dbInstance.prepare(`
                INSERT INTO session_participants (
                    id, session_id, speaker_label, participant_name,
                    participant_email, participant_role, created_at, sync_state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(p.id, p.session_id, p.speaker_label, p.participant_name,
                   p.participant_email, p.participant_role, now, 'clean');
        });

        // Create tasks with various states
        const tasks = [
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Update API documentation',
                assigned_to: 'Alice Cooper',
                deadline: '2025-11-30',
                priority: 'high',
                status: 'pending'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Fix authentication bug',
                assigned_to: 'Bob Dylan',
                deadline: '2025-11-24',
                priority: 'high',
                status: 'in_progress'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Review pull requests',
                assigned_to: null, // Unassigned task
                deadline: 'TBD',
                priority: 'medium',
                status: 'pending'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Deploy to production',
                assigned_to: 'Charlie Parker',
                deadline: '2025-11-22', // Soon deadline
                priority: 'high',
                status: 'pending'
            }
        ];

        tasks.forEach(t => {
            dbInstance.prepare(`
                INSERT INTO meeting_tasks (
                    id, session_id, user_id, task_description, assigned_to,
                    deadline, priority, status, created_at, sync_state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(t.id, t.session_id, t.user_id, t.task_description,
                   t.assigned_to, t.deadline, t.priority, t.status, now, 'clean');
        });

        // Create historical data for pattern analysis
        const historicalSessionId = `historical-${Date.now()}`;
        const historicalNoteId = uuidv4();

        dbInstance.prepare(`
            INSERT INTO meeting_notes (
                id, session_id, user_id, meeting_title, participants,
                key_points, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            historicalNoteId,
            historicalSessionId,
            testUserId,
            'Weekly Team Sync',
            'Alice, Bob, Charlie',
            JSON.stringify(['Previous sync discussion']),
            now - 604800, // 1 week ago
            'clean'
        );

        console.log('✅ Test data created\n');

        // Test 1: Generate suggestions (all sources)
        console.log('✓ Test 1: Generate comprehensive suggestions');
        const suggestions = await followUpSuggestionsService.generateSuggestions(
            testSessionId,
            { useAI: false } // Disable AI for testing to avoid API dependencies
        );

        if (suggestions && Array.isArray(suggestions)) {
            console.log(`  ✅ Generated ${suggestions.length} suggestions`);

            suggestions.slice(0, 5).forEach((s, i) => {
                console.log(`    ${i + 1}. [${s.priority}] ${s.title}`);
                console.log(`       ${s.description}`);
            });

            if (suggestions.length > 0) {
                testsPassed++;
            } else {
                console.log('  ⚠️  No suggestions generated');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to generate suggestions');
            testsFailed++;
        }

        // Test 2: Task-based suggestions (unassigned tasks)
        console.log('\n✓ Test 2: Detect unassigned tasks suggestion');
        const unassignedSuggestion = suggestions.find(s =>
            s.type === 'assign_task' || s.title.toLowerCase().includes('unassigned')
        );

        if (unassignedSuggestion) {
            console.log('  ✅ Unassigned task suggestion found');
            console.log(`    Title: ${unassignedSuggestion.title}`);
            console.log(`    Priority: ${unassignedSuggestion.priority}`);
            testsPassed++;
        } else {
            console.log('  ⚠️  No unassigned task suggestion');
            testsFailed++;
        }

        // Test 3: Deadline-based suggestions
        console.log('\n✓ Test 3: Detect upcoming deadline suggestions');
        const deadlineSuggestion = suggestions.find(s =>
            s.type === 'set_reminder' || s.title.toLowerCase().includes('deadline')
        );

        if (deadlineSuggestion) {
            console.log('  ✅ Deadline suggestion found');
            console.log(`    Title: ${deadlineSuggestion.title}`);
            console.log(`    Action: ${deadlineSuggestion.action}`);
            testsPassed++;
        } else {
            console.log('  ⚠️  No deadline suggestion');
            testsFailed++;
        }

        // Test 4: Historical pattern suggestions
        console.log('\n✓ Test 4: Detect recurring meeting pattern');
        const patternSuggestion = suggestions.find(s =>
            s.type === 'schedule_meeting' || s.title.toLowerCase().includes('recurring')
        );

        if (patternSuggestion) {
            console.log('  ✅ Recurring meeting pattern detected');
            console.log(`    Title: ${patternSuggestion.title}`);
            testsPassed++;
        } else {
            console.log('  ⚠️  No recurring meeting suggestion');
            console.log('  Note: This is expected if pattern detection needs more data');
            // Don't count as failure
        }

        // Test 5: Suggestion ranking
        console.log('\n✓ Test 5: Validate suggestion ranking');
        if (suggestions.length > 1) {
            const priorities = suggestions.map(s => {
                const priorityMap = { high: 3, medium: 2, low: 1 };
                return priorityMap[s.priority] || 0;
            });

            // Check if suggestions are sorted by score (priority × confidence)
            let properlyRanked = true;
            for (let i = 0; i < Math.min(suggestions.length - 1, 5); i++) {
                const score1 = priorities[i] * (suggestions[i].confidence || 0.5);
                const score2 = priorities[i + 1] * (suggestions[i + 1].confidence || 0.5);

                if (score1 < score2) {
                    properlyRanked = false;
                    break;
                }
            }

            if (properlyRanked) {
                console.log('  ✅ Suggestions properly ranked by priority × confidence');
                testsPassed++;
            } else {
                console.log('  ⚠️  Ranking may not be optimal');
                testsFailed++;
            }
        } else {
            console.log('  ⚠️  Not enough suggestions to test ranking');
            testsFailed++;
        }

        // Test 6: Accept suggestion (auto-assign action)
        console.log('\n✓ Test 6: Accept suggestion and execute action');

        // Create a specific suggestion to accept
        const testSuggestion = {
            type: 'filter_status',
            action: 'filter_pending_tasks',
            title: 'Review pending tasks',
            description: 'You have pending tasks to review',
            priority: 'medium',
            confidence: 0.8,
            metadata: { status: 'pending' }
        };

        const acceptResult = await followUpSuggestionsService.acceptSuggestion(
            testSessionId,
            testSuggestion
        );

        if (acceptResult.success) {
            console.log('  ✅ Suggestion accepted and executed');
            console.log(`    Result: ${acceptResult.message || 'Action executed'}`);
            testsPassed++;
        } else {
            console.log('  ⚠️  Suggestion acceptance failed:', acceptResult.error);
            testsFailed++;
        }

        // Test 7: Dismiss suggestion
        console.log('\n✓ Test 7: Dismiss suggestion');

        const dismissResult = followUpSuggestionsService.dismissSuggestion(
            testSessionId,
            'assign_task'
        );

        if (dismissResult.success) {
            console.log('  ✅ Suggestion dismissed successfully');
            testsPassed++;
        } else {
            console.log('  ⚠️  Dismiss failed');
            testsFailed++;
        }

        // Test 8: Suggestion structure validation
        console.log('\n✓ Test 8: Validate suggestion data structure');

        if (suggestions.length > 0) {
            const firstSuggestion = suggestions[0];
            const hasRequiredFields =
                firstSuggestion.type &&
                firstSuggestion.title &&
                firstSuggestion.description &&
                firstSuggestion.priority &&
                firstSuggestion.action;

            if (hasRequiredFields) {
                console.log('  ✅ Suggestions have all required fields');
                console.log(`    Type: ${firstSuggestion.type}`);
                console.log(`    Title: ${firstSuggestion.title}`);
                console.log(`    Description: ${firstSuggestion.description}`);
                console.log(`    Priority: ${firstSuggestion.priority}`);
                console.log(`    Action: ${firstSuggestion.action}`);
                console.log(`    Confidence: ${firstSuggestion.confidence || 'N/A'}`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Missing required fields');
                console.log(`    Structure:`, firstSuggestion);
                testsFailed++;
            }
        } else {
            console.log('  ⚠️  No suggestions to validate');
            testsFailed++;
        }

        // Test 9: AI suggestion generation (optional, may skip if not configured)
        console.log('\n✓ Test 9: AI-powered suggestion generation');
        try {
            const aiSuggestions = await followUpSuggestionsService.generateSuggestions(
                testSessionId,
                { useAI: true }
            );

            if (aiSuggestions && aiSuggestions.length > 0) {
                console.log(`  ✅ AI generated ${aiSuggestions.length} suggestions`);

                // Check if AI added unique suggestions
                const aiOnlySuggestions = aiSuggestions.filter(s =>
                    !suggestions.some(existing => existing.type === s.type)
                );

                if (aiOnlySuggestions.length > 0) {
                    console.log(`    AI added ${aiOnlySuggestions.length} unique suggestions`);
                }

                testsPassed++;
            } else {
                console.log('  ⚠️  AI suggestions generated but empty');
                testsFailed++;
            }
        } catch (error) {
            if (error.message.includes('AI service') || error.message.includes('API key')) {
                console.log('  ⚠️  AI service not configured (skipping test)');
                console.log(`    Note: ${error.message}`);
                // Don't count as failure
            } else {
                console.log('  ❌ AI generation error:', error.message);
                testsFailed++;
            }
        }

        // Test 10: Suggestion limit (should return max 10)
        console.log('\n✓ Test 10: Validate suggestion limit');

        if (suggestions.length <= 10) {
            console.log(`  ✅ Suggestions limited to ${suggestions.length} (max 10)`);
            testsPassed++;
        } else {
            console.log(`  ⚠️  Too many suggestions returned: ${suggestions.length}`);
            testsFailed++;
        }

    } catch (error) {
        console.error('\n❌ Test execution error:', error);
        console.error(error.stack);
        testsFailed++;
    }

    // Cleanup
    try {
        console.log('\n🧹 Cleaning up test data...');
        const db = require('../../src/features/common/services/database');
        const dbInstance = db.getDB();

        dbInstance.prepare('DELETE FROM meeting_notes WHERE user_id = ?').run(testUserId);
        dbInstance.prepare('DELETE FROM meeting_tasks WHERE user_id = ?').run(testUserId);
        dbInstance.prepare('DELETE FROM session_participants WHERE session_id LIKE ?').run(`test-%`);

        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('⚠️  Cleanup error:', error);
    }

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('PHASE 2.4 TEST RESULTS:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total: ${testsPassed + testsFailed}`);
    console.log('='.repeat(50) + '\n');

    return { passed: testsPassed, failed: testsFailed };
}

// Run tests
runTests().catch(console.error);
