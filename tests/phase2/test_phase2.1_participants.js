/**
 * Phase 2.1 Test - Participant Attribution
 * Tests speaker detection, participant assignment, and label replacement
 */

const participantService = require('../../src/features/listen/postCall/participantService');
const { sessionParticipantsRepository, meetingNotesRepository } = require('../../src/features/listen/postCall/repositories');
const { v4: uuidv4 } = require('uuid');

console.log('\n=== PHASE 2.1 TEST: PARTICIPANT ATTRIBUTION ===\n');

// Test data
const testSessionId = `test-session-${Date.now()}`;
const testUserId = 'test-user-001';

// Mock meeting notes with speaker labels
const mockMeetingNotes = {
    session_id: testSessionId,
    user_id: testUserId,
    participants: 'Me, Them',
    key_points: JSON.stringify([
        'Me: Discussed the new feature roadmap',
        'Them: Agreed to review the proposal',
        'Me: Will send follow-up email'
    ]),
    action_items: JSON.stringify([
        'Me will prepare the presentation',
        'Them needs to review the budget'
    ]),
    decisions: JSON.stringify([
        'Me and Them agreed on Q4 timeline'
    ]),
    next_steps: 'Me to schedule follow-up meeting with Them',
    created_at: Math.floor(Date.now() / 1000),
    sync_state: 'clean'
};

async function runTests() {
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Test 1: Detect speakers from transcript
        console.log('✓ Test 1: Detect speakers from transcript');
        const transcript = 'Me: Hello everyone. Them: Hi there!';
        const speakers = participantService.detectSpeakers(transcript, testSessionId);

        if (speakers && speakers.length === 2) {
            console.log('  ✅ Detected 2 speakers:', speakers);
            testsPassed++;
        } else {
            console.log('  ❌ Expected 2 speakers, got:', speakers?.length || 0);
            testsFailed++;
        }

        // Test 2: Save participants
        console.log('\n✓ Test 2: Save participants with details');
        const participantData = [
            {
                speakerLabel: 'Me',
                name: 'John Doe',
                email: 'john.doe@example.com',
                role: 'Product Manager',
                company: 'Acme Corp'
            },
            {
                speakerLabel: 'Them',
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                role: 'Engineering Lead',
                company: 'Tech Inc'
            }
        ];

        const saveResult = participantService.saveParticipants(testSessionId, participantData);

        if (saveResult.success && saveResult.saved === 2) {
            console.log('  ✅ Saved 2 participants successfully');
            testsPassed++;
        } else {
            console.log('  ❌ Failed to save participants:', saveResult);
            testsFailed++;
        }

        // Test 3: Retrieve saved participants
        console.log('\n✓ Test 3: Retrieve saved participants');
        const retrievedParticipants = participantService.getSessionParticipants(testSessionId);

        if (retrievedParticipants && retrievedParticipants.length === 2) {
            console.log('  ✅ Retrieved participants:');
            retrievedParticipants.forEach(p => {
                console.log(`    - ${p.speaker_label}: ${p.participant_name} (${p.participant_email})`);
            });
            testsPassed++;
        } else {
            console.log('  ❌ Expected 2 participants, got:', retrievedParticipants?.length || 0);
            testsFailed++;
        }

        // Test 4: Get participant mapping
        console.log('\n✓ Test 4: Get participant mapping');
        const mapping = participantService.getParticipantMapping(testSessionId);

        if (mapping && mapping['Me'] && mapping['Them']) {
            console.log('  ✅ Mapping created:');
            console.log(`    Me -> ${mapping['Me'].name}`);
            console.log(`    Them -> ${mapping['Them'].name}`);
            testsPassed++;
        } else {
            console.log('  ❌ Failed to create mapping:', mapping);
            testsFailed++;
        }

        // Test 5: Replace speaker labels in text
        console.log('\n✓ Test 5: Replace speaker labels in text');
        const originalText = 'Me discussed the proposal with Them. Me agreed to follow up.';
        const replacedText = participantService.replaceSpeakerLabels(originalText, mapping);

        const expectedText = 'John Doe discussed the proposal with Jane Smith. John Doe agreed to follow up.';
        if (replacedText === expectedText) {
            console.log('  ✅ Label replacement successful');
            console.log(`    Original: ${originalText}`);
            console.log(`    Replaced: ${replacedText}`);
            testsPassed++;
        } else {
            console.log('  ❌ Label replacement failed');
            console.log(`    Expected: ${expectedText}`);
            console.log(`    Got: ${replacedText}`);
            testsFailed++;
        }

        // Test 6: Update meeting notes with participants
        console.log('\n✓ Test 6: Update meeting notes with participant names');

        // First create mock meeting notes
        const noteId = uuidv4();
        const db = require('../../src/features/common/services/database');
        const dbInstance = db.getDB();

        dbInstance.prepare(`
            INSERT INTO meeting_notes (
                id, session_id, user_id, participants, key_points,
                action_items, decisions, next_steps, created_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            noteId,
            testSessionId,
            testUserId,
            mockMeetingNotes.participants,
            mockMeetingNotes.key_points,
            mockMeetingNotes.action_items,
            mockMeetingNotes.decisions,
            mockMeetingNotes.next_steps,
            mockMeetingNotes.created_at,
            mockMeetingNotes.sync_state
        );

        // Now update with participant names
        const updateResult = participantService.updateNotesWithParticipants(testSessionId);

        if (updateResult.success) {
            console.log('  ✅ Meeting notes updated successfully');

            // Verify the update
            const updatedNotes = meetingNotesRepository.getBySessionId(testSessionId);
            if (updatedNotes) {
                const keyPoints = JSON.parse(updatedNotes.key_points);
                console.log('    Updated key points:');
                keyPoints.forEach(kp => console.log(`    - ${kp}`));

                // Check if "Me" and "Them" were replaced
                const notesText = JSON.stringify(updatedNotes);
                const hasOriginalLabels = notesText.includes('"Me:') || notesText.includes('"Them:');

                if (!hasOriginalLabels) {
                    console.log('  ✅ All speaker labels replaced with names');
                    testsPassed++;
                } else {
                    console.log('  ❌ Some speaker labels not replaced');
                    testsFailed++;
                }
            }
        } else {
            console.log('  ❌ Failed to update notes:', updateResult);
            testsFailed++;
        }

        // Test 7: Frequent participants for autocomplete
        console.log('\n✓ Test 7: Get frequent participants for autocomplete');
        const frequentParticipants = participantService.getFrequentParticipants(testUserId, 10);

        if (Array.isArray(frequentParticipants)) {
            console.log(`  ✅ Retrieved ${frequentParticipants.length} frequent participants`);
            if (frequentParticipants.length > 0) {
                console.log('    Top participants:');
                frequentParticipants.slice(0, 3).forEach((p, i) => {
                    console.log(`    ${i + 1}. ${p.name} (${p.email}) - ${p.frequency} meetings`);
                });
            }
            testsPassed++;
        } else {
            console.log('  ❌ Failed to retrieve frequent participants');
            testsFailed++;
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

        dbInstance.prepare('DELETE FROM session_participants WHERE session_id = ?').run(testSessionId);
        dbInstance.prepare('DELETE FROM meeting_notes WHERE session_id = ?').run(testSessionId);

        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('⚠️  Cleanup error:', error);
    }

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('PHASE 2.1 TEST RESULTS:');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total: ${testsPassed + testsFailed}`);
    console.log('='.repeat(50) + '\n');

    return { passed: testsPassed, failed: testsFailed };
}

// Run tests
runTests().catch(console.error);
