/**
 * Phase 2.3 Test - Task Management
 * Tests advanced task management features: email assignment, status tracking,
 * reminders, tags, statistics, and CSV export
 */

const taskManagementService = require('../../src/features/listen/postCall/taskManagementService');
const participantService = require('../../src/features/listen/postCall/participantService');
const { meetingTasksRepository, sessionParticipantsRepository } = require('../../src/features/listen/postCall/repositories');
const { v4: uuidv4 } = require('uuid');

console.log('\n=== PHASE 2.3 TEST: TASK MANAGEMENT ===\n');

// Test data
const testSessionId = `test-task-session-${Date.now()}`;
const testUserId = 'test-user-tasks-001';

async function runTests() {
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Setup: Create test data
        console.log('📝 Setting up test data...\n');

        const db = require('../../src/features/common/services/database');
        const dbInstance = db.getDB();
        const now = Math.floor(Date.now() / 1000);

        // Create participants
        const participants = [
            {
                id: uuidv4(),
                session_id: testSessionId,
                speaker_label: 'Me',
                participant_name: 'Alice Johnson',
                participant_email: 'alice.johnson@example.com',
                participant_role: 'Project Manager'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                speaker_label: 'Them',
                participant_name: 'Bob Williams',
                participant_email: 'bob.williams@example.com',
                participant_role: 'Developer'
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

        // Create tasks (some with assigned_to but no email)
        const tasks = [
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Complete project documentation',
                assigned_to: 'Alice Johnson',
                deadline: '2025-11-25',
                priority: 'high',
                status: 'pending'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Review code changes',
                assigned_to: 'Bob Williams',
                deadline: '2025-11-28',
                priority: 'medium',
                status: 'in_progress'
            },
            {
                id: uuidv4(),
                session_id: testSessionId,
                user_id: testUserId,
                task_description: 'Deploy to staging',
                assigned_to: 'Bob Williams',
                deadline: '2025-11-20', // Overdue
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

        console.log('✅ Test data created\n');

        // Test 1: Auto-assign emails to tasks
        console.log('✓ Test 1: Auto-assign emails from participants');
        const assignResult = await taskManagementService.autoAssignEmails(testSessionId);

        if (assignResult.success) {
            console.log(`  ✅ Auto-assignment successful`);
            console.log(`    Assigned: ${assignResult.assigned}/${assignResult.total} tasks`);

            // Verify emails were assigned
            const updatedTasks = meetingTasksRepository.getBySessionId(testSessionId);
            const tasksWithEmail = updatedTasks.filter(t => t.assigned_to_email);

            if (tasksWithEmail.length === 3) {
                console.log('  ✅ All tasks have email addresses');
                testsPassed++;
            } else {
                console.log(`  ⚠️  Expected 3 tasks with emails, got ${tasksWithEmail.length}`);
                testsFailed++;
            }
        } else {
            console.log('  ❌ Auto-assignment failed:', assignResult.message);
            testsFailed++;
        }

        // Test 2: Update task with new fields
        console.log('\n✓ Test 2: Update task with extended fields');
        const taskToUpdate = tasks[0].id;

        const updateResult = taskManagementService.updateTask(taskToUpdate, {
            notes: 'Need to include API documentation',
            estimated_hours: 8,
            tags: JSON.stringify(['documentation', 'api'])
        });

        if (updateResult.success) {
            console.log('  ✅ Task updated successfully');

            const updatedTask = meetingTasksRepository.getById(taskToUpdate);
            if (updatedTask.notes && updatedTask.estimated_hours && updatedTask.tags) {
                console.log(`    Notes: ${updatedTask.notes}`);
                console.log(`    Estimated hours: ${updatedTask.estimated_hours}`);
                console.log(`    Tags: ${updatedTask.tags}`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Some fields not updated');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Update failed');
            testsFailed++;
        }

        // Test 3: Change task status
        console.log('\n✓ Test 3: Change task status');
        const statusResult = taskManagementService.changeStatus(
            tasks[0].id,
            'completed'
        );

        if (statusResult.success) {
            console.log('  ✅ Status changed to completed');

            const task = meetingTasksRepository.getById(tasks[0].id);
            if (task.status === 'completed' && task.completed_at) {
                console.log(`    Completed at: ${new Date(task.completed_at * 1000).toISOString()}`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Completed timestamp not set');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Status change failed');
            testsFailed++;
        }

        // Test 4: Change status to blocked
        console.log('\n✓ Test 4: Change status to blocked with reason');
        const blockedResult = taskManagementService.changeStatus(
            tasks[1].id,
            'blocked',
            { blocked_reason: 'Waiting for API access' }
        );

        if (blockedResult.success) {
            const task = meetingTasksRepository.getById(tasks[1].id);
            if (task.status === 'blocked' && task.blocked_reason) {
                console.log('  ✅ Task marked as blocked');
                console.log(`    Reason: ${task.blocked_reason}`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Blocked reason not set');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to block task');
            testsFailed++;
        }

        // Test 5: Get tasks by status
        console.log('\n✓ Test 5: Filter tasks by status');
        const pendingTasks = taskManagementService.getTasksByStatus(testSessionId, 'pending');
        const completedTasks = taskManagementService.getTasksByStatus(testSessionId, 'completed');
        const blockedTasks = taskManagementService.getTasksByStatus(testSessionId, 'blocked');

        console.log(`  Pending: ${pendingTasks.length}`);
        console.log(`  Completed: ${completedTasks.length}`);
        console.log(`  Blocked: ${blockedTasks.length}`);

        if (pendingTasks.length === 1 && completedTasks.length === 1 && blockedTasks.length === 1) {
            console.log('  ✅ Status filtering works correctly');
            testsPassed++;
        } else {
            console.log('  ⚠️  Unexpected task counts by status');
            testsFailed++;
        }

        // Test 6: Get overdue tasks
        console.log('\n✓ Test 6: Identify overdue tasks');
        const overdueTasks = taskManagementService.getOverdueTasks(testSessionId);

        if (overdueTasks.length > 0) {
            console.log(`  ✅ Found ${overdueTasks.length} overdue task(s)`);
            overdueTasks.forEach(task => {
                console.log(`    - ${task.task_description} (due: ${task.deadline})`);
            });
            testsPassed++;
        } else {
            console.log('  ⚠️  Expected at least 1 overdue task');
            testsFailed++;
        }

        // Test 7: Get upcoming tasks
        console.log('\n✓ Test 7: Get upcoming tasks (7 days)');
        const upcomingTasks = taskManagementService.getUpcomingTasks(7, testSessionId);

        console.log(`  Found ${upcomingTasks.length} upcoming task(s)`);
        if (upcomingTasks.length > 0) {
            console.log('  ✅ Upcoming tasks retrieved');
            upcomingTasks.forEach(task => {
                console.log(`    - ${task.task_description} (due: ${task.deadline})`);
            });
            testsPassed++;
        } else {
            console.log('  ⚠️  No upcoming tasks found');
            testsFailed++;
        }

        // Test 8: Set reminder
        console.log('\n✓ Test 8: Set task reminder');
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 1);

        const reminderResult = taskManagementService.setReminder(
            tasks[2].id,
            reminderDate.toISOString()
        );

        if (reminderResult.success) {
            const task = meetingTasksRepository.getById(tasks[2].id);
            if (task.reminder_date && task.reminder_sent === 0) {
                console.log('  ✅ Reminder set successfully');
                console.log(`    Reminder date: ${task.reminder_date}`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Reminder not properly set');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to set reminder');
            testsFailed++;
        }

        // Test 9: Add tags to task
        console.log('\n✓ Test 9: Add tags to task');
        const addTagsResult = taskManagementService.addTags(
            tasks[2].id,
            ['urgent', 'deployment', 'staging']
        );

        if (addTagsResult.success) {
            const task = meetingTasksRepository.getById(tasks[2].id);
            const tags = JSON.parse(task.tags);

            if (tags.length === 3 && tags.includes('urgent')) {
                console.log('  ✅ Tags added successfully');
                console.log(`    Tags: ${tags.join(', ')}`);
                testsPassed++;
            } else {
                console.log('  ⚠️  Tags not properly added');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to add tags');
            testsFailed++;
        }

        // Test 10: Get task statistics
        console.log('\n✓ Test 10: Calculate task statistics');
        const stats = taskManagementService.getTaskStatistics(testSessionId);

        if (stats) {
            console.log('  ✅ Statistics calculated');
            console.log(`    Total tasks: ${stats.total}`);
            console.log(`    By status:`);
            console.log(`      - Pending: ${stats.byStatus.pending}`);
            console.log(`      - In Progress: ${stats.byStatus.in_progress}`);
            console.log(`      - Completed: ${stats.byStatus.completed}`);
            console.log(`      - Blocked: ${stats.byStatus.blocked}`);
            console.log(`    By priority:`);
            console.log(`      - High: ${stats.byPriority.high}`);
            console.log(`      - Medium: ${stats.byPriority.medium}`);
            console.log(`      - Low: ${stats.byPriority.low}`);
            console.log(`    Overdue: ${stats.overdue}`);
            console.log(`    With email: ${stats.withEmail}`);
            console.log(`    Without email: ${stats.withoutEmail}`);

            if (stats.total === 3 && stats.withEmail === 3) {
                testsPassed++;
            } else {
                console.log('  ⚠️  Unexpected statistics');
                testsFailed++;
            }
        } else {
            console.log('  ❌ Failed to calculate statistics');
            testsFailed++;
        }

        // Test 11: Export to CSV
        console.log('\n✓ Test 11: Export tasks to CSV');
        const csv = taskManagementService.exportToCSV(testSessionId);

        if (csv) {
            const lines = csv.split('\n');
            console.log('  ✅ CSV exported successfully');
            console.log(`    Total lines: ${lines.length}`);
            console.log(`    Header: ${lines[0]}`);

            // Check CSV structure
            const hasHeader = lines[0].includes('Task Description') &&
                            lines[0].includes('Assigned To') &&
                            lines[0].includes('Email');

            const hasData = lines.length > 1;

            if (hasHeader && hasData) {
                console.log('  ✅ CSV properly formatted');
                testsPassed++;
            } else {
                console.log('  ⚠️  CSV format issues');
                testsFailed++;
            }
        } else {
            console.log('  ❌ CSV export failed');
            testsFailed++;
        }

        // Test 12: CSV escaping
        console.log('\n✓ Test 12: CSV field escaping');
        const testField1 = taskManagementService._escapeCSV('Simple text');
        const testField2 = taskManagementService._escapeCSV('Text with, comma');
        const testField3 = taskManagementService._escapeCSV('Text with "quotes"');

        const escaped1 = testField1 === 'Simple text';
        const escaped2 = testField2 === '"Text with, comma"';
        const escaped3 = testField3.includes('""'); // Double quotes escaped

        if (escaped1 && escaped2 && escaped3) {
            console.log('  ✅ CSV escaping works correctly');
            console.log(`    Simple: ${testField1}`);
            console.log(`    Comma: ${testField2}`);
            console.log(`    Quotes: ${testField3}`);
            testsPassed++;
        } else {
            console.log('  ⚠️  CSV escaping issues');
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

        dbInstance.prepare('DELETE FROM meeting_tasks WHERE session_id = ?').run(testSessionId);
        dbInstance.prepare('DELETE FROM session_participants WHERE session_id = ?').run(testSessionId);

        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('⚠️  Cleanup error:', error);
    }

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('PHASE 2.3 TEST RESULTS:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total: ${testsPassed + testsFailed}`);
    console.log('='.repeat(50) + '\n');

    return { passed: testsPassed, failed: testsFailed };
}

// Run tests
runTests().catch(console.error);
