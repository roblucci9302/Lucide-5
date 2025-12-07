const crypto = require('crypto');
const sqliteClient = require('../../../common/services/sqliteClient');

/**
 * Session Participants Repository - SQLite implementation
 * Manages participant attribution for listen sessions
 */

/**
 * Get all participants for a session
 * @param {string} sessionId - Session ID
 * @returns {Array<Object>} Array of participants
 */
function getBySessionId(sessionId) {
    const db = sqliteClient.getDb();
    const query = `
        SELECT
            id, session_id, speaker_label,
            participant_name, participant_email, participant_role, participant_company,
            created_at, updated_at
        FROM session_participants
        WHERE session_id = ?
        ORDER BY speaker_label ASC
    `;

    try {
        const participants = db.prepare(query).all(sessionId);
        console.log(`[SessionParticipantsRepo] Found ${participants.length} participants for session ${sessionId}`);
        return participants;
    } catch (error) {
        console.error('[SessionParticipantsRepo] Error getting participants:', error);
        throw error;
    }
}

/**
 * Get a participant by speaker label
 * @param {string} sessionId - Session ID
 * @param {string} speakerLabel - Speaker label ('Me' or 'Them')
 * @returns {Object|null} Participant or null
 */
function getBySpeakerLabel(sessionId, speakerLabel) {
    const db = sqliteClient.getDb();
    const query = `
        SELECT
            id, session_id, speaker_label,
            participant_name, participant_email, participant_role, participant_company,
            created_at, updated_at
        FROM session_participants
        WHERE session_id = ? AND speaker_label = ?
    `;

    try {
        return db.prepare(query).get(sessionId, speakerLabel);
    } catch (error) {
        console.error('[SessionParticipantsRepo] Error getting participant by speaker label:', error);
        throw error;
    }
}

/**
 * Create or update a participant
 * If participant with same session_id + speaker_label exists, update it
 * Otherwise create new
 *
 * @param {Object} data - Participant data
 * @param {string} data.sessionId - Session ID
 * @param {string} data.speakerLabel - 'Me' or 'Them'
 * @param {string} data.participantName - Full name
 * @param {string} [data.participantEmail] - Email address
 * @param {string} [data.participantRole] - Job title/role
 * @param {string} [data.participantCompany] - Company name
 * @returns {string} Participant ID
 */
function upsert(data) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);

    // Check if participant already exists
    const existing = getBySpeakerLabel(data.sessionId, data.speakerLabel);

    if (existing) {
        // Update existing participant
        const updateQuery = `
            UPDATE session_participants
            SET
                participant_name = ?,
                participant_email = ?,
                participant_role = ?,
                participant_company = ?,
                updated_at = ?,
                sync_state = 'dirty'
            WHERE id = ?
        `;

        try {
            db.prepare(updateQuery).run(
                data.participantName,
                data.participantEmail || null,
                data.participantRole || null,
                data.participantCompany || null,
                now,
                existing.id
            );

            console.log(`[SessionParticipantsRepo] Updated participant ${existing.id}`);
            return existing.id;
        } catch (error) {
            console.error('[SessionParticipantsRepo] Error updating participant:', error);
            throw error;
        }
    } else {
        // Create new participant
        const participantId = crypto.randomUUID();
        const insertQuery = `
            INSERT INTO session_participants (
                id, session_id, speaker_label,
                participant_name, participant_email, participant_role, participant_company,
                created_at, updated_at, sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            db.prepare(insertQuery).run(
                participantId,
                data.sessionId,
                data.speakerLabel,
                data.participantName,
                data.participantEmail || null,
                data.participantRole || null,
                data.participantCompany || null,
                now,
                now,
                'dirty'
            );

            console.log(`[SessionParticipantsRepo] Created participant ${participantId}`);
            return participantId;
        } catch (error) {
            console.error('[SessionParticipantsRepo] Error creating participant:', error);
            throw error;
        }
    }
}

/**
 * Bulk upsert multiple participants
 * @param {Array<Object>} participants - Array of participant data
 * @returns {Array<string>} Array of participant IDs
 */
function bulkUpsert(participants) {
    const db = sqliteClient.getDb();
    const transaction = db.transaction(() => {
        const ids = [];
        for (const participant of participants) {
            const id = upsert(participant);
            ids.push(id);
        }
        return ids;
    });

    try {
        const ids = transaction();
        console.log(`[SessionParticipantsRepo] Bulk upserted ${ids.length} participants`);
        return ids;
    } catch (error) {
        console.error('[SessionParticipantsRepo] Error in bulk upsert:', error);
        throw error;
    }
}

/**
 * Delete a participant
 * @param {string} participantId - Participant ID
 * @returns {Object} Delete result
 */
function deleteById(participantId) {
    const db = sqliteClient.getDb();
    const query = 'DELETE FROM session_participants WHERE id = ?';

    try {
        const result = db.prepare(query).run(participantId);
        console.log(`[SessionParticipantsRepo] Deleted participant ${participantId}`);
        return { success: true, changes: result.changes };
    } catch (error) {
        console.error('[SessionParticipantsRepo] Error deleting participant:', error);
        throw error;
    }
}

/**
 * Delete all participants for a session
 * @param {string} sessionId - Session ID
 * @returns {Object} Delete result
 */
function deleteBySessionId(sessionId) {
    const db = sqliteClient.getDb();
    const query = 'DELETE FROM session_participants WHERE session_id = ?';

    try {
        const result = db.prepare(query).run(sessionId);
        console.log(`[SessionParticipantsRepo] Deleted ${result.changes} participants for session ${sessionId}`);
        return { success: true, changes: result.changes };
    } catch (error) {
        console.error('[SessionParticipantsRepo] Error deleting participants by session:', error);
        throw error;
    }
}

/**
 * Fix LOW BUG: Auto-detect participants from transcripts
 * Attempts to extract names from conversation patterns
 * @param {string} sessionId - Session ID
 * @param {Array<Object>} transcripts - Array of transcript entries {speaker, text}
 * @returns {Array<Object>} Array of detected participants
 */
function detectFromTranscripts(sessionId, transcripts) {
    const detectedParticipants = [];
    const speakerTexts = new Map(); // speaker -> all their texts

    // Group transcripts by speaker
    for (const t of transcripts) {
        if (!t.speaker) continue;
        if (!speakerTexts.has(t.speaker)) {
            speakerTexts.set(t.speaker, []);
        }
        speakerTexts.get(t.speaker).push(t.text || '');
    }

    // For each speaker, try to detect their name from conversation patterns
    for (const [speaker, texts] of speakerTexts) {
        let detectedName = speaker; // Default to speaker label

        // Check first few messages for self-introduction patterns
        const firstTexts = texts.slice(0, 5);
        for (const text of firstTexts) {
            // French patterns
            const frenchPatterns = [
                /je\s+m['']appelle\s+(\w+)/i,
                /je\s+suis\s+(\w+(?:\s+\w+)?)/i,
                /c['']est\s+(\w+)\s+[àa]/i,
                /ici\s+(\w+)/i,
                /bonjour[,]?\s+c['']est\s+(\w+)/i,
                /salut[,]?\s+c['']est\s+(\w+)/i,
            ];

            // English patterns
            const englishPatterns = [
                /i['']m\s+(\w+)/i,
                /my\s+name\s+is\s+(\w+(?:\s+\w+)?)/i,
                /this\s+is\s+(\w+)/i,
                /it['']s\s+(\w+)\s+here/i,
                /hi[,]?\s+(?:this\s+is\s+)?(\w+)\s+(?:here|speaking)/i,
            ];

            const allPatterns = [...frenchPatterns, ...englishPatterns];

            for (const pattern of allPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    // Capitalize first letter of each word
                    detectedName = match[1]
                        .split(/\s+/)
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    break;
                }
            }

            if (detectedName !== speaker) break;
        }

        // Create/update participant record
        const participantId = upsert({
            sessionId,
            speakerLabel: speaker,
            participantName: detectedName
        });

        detectedParticipants.push({
            id: participantId,
            speakerLabel: speaker,
            participantName: detectedName,
            wasAutoDetected: detectedName !== speaker
        });
    }

    console.log(`[SessionParticipantsRepo] Auto-detected ${detectedParticipants.length} participants for session ${sessionId}`);
    return detectedParticipants;
}

/**
 * Get speaker label to name mapping for a session
 * Useful for replacing "Me"/"Them" with actual names in transcripts
 * @param {string} sessionId - Session ID
 * @returns {Object} Map of speaker_label -> participant_name
 */
function getSpeakerNameMap(sessionId) {
    const participants = getBySessionId(sessionId);
    const map = {};
    for (const p of participants) {
        map[p.speaker_label] = p.participant_name;
    }
    return map;
}

/**
 * Get all unique participant names from user's history (for autocomplete)
 * @param {string} uid - User ID
 * @param {number} [limit=20] - Max number of results
 * @returns {Array<Object>} Array of unique participants with frequency
 */
function getFrequentParticipants(uid, limit = 20) {
    const db = sqliteClient.getDb();
    const query = `
        SELECT
            participant_name,
            participant_email,
            participant_role,
            participant_company,
            COUNT(*) as frequency,
            MAX(created_at) as last_used
        FROM session_participants sp
        JOIN sessions s ON sp.session_id = s.id
        WHERE s.uid = ?
        GROUP BY participant_name, participant_email, participant_role, participant_company
        ORDER BY frequency DESC, last_used DESC
        LIMIT ?
    `;

    try {
        const participants = db.prepare(query).all(uid, limit);
        console.log(`[SessionParticipantsRepo] Found ${participants.length} frequent participants for user ${uid}`);
        return participants;
    } catch (error) {
        console.error('[SessionParticipantsRepo] Error getting frequent participants:', error);
        throw error;
    }
}

module.exports = {
    getBySessionId,
    getBySpeakerLabel,
    upsert,
    bulkUpsert,
    deleteById,
    deleteBySessionId,
    getFrequentParticipants,
    // Fix LOW BUG: Auto-detection methods
    detectFromTranscripts,
    getSpeakerNameMap
};
