const sqliteClient = require('../../../common/services/sqliteClient');
const crypto = require('crypto');

/**
 * Repository for meeting_notes table (SQLite)
 */

/**
 * Get meeting note by ID
 * @param {string} id - Meeting note ID
 * @returns {Object|null} Meeting note object or null
 */
function getById(id) {
    const db = sqliteClient.getDb();
    return db.prepare('SELECT * FROM meeting_notes WHERE id = ?').get(id);
}

/**
 * Get meeting note by session ID
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Meeting note object or null
 */
function getBySessionId(sessionId) {
    const db = sqliteClient.getDb();
    return db.prepare('SELECT * FROM meeting_notes WHERE session_id = ?').get(sessionId);
}

/**
 * Get all meeting notes for a user
 * @param {string} uid - User ID
 * @returns {Array<Object>} Array of meeting notes
 */
function getAllByUserId(uid) {
    const db = sqliteClient.getDb();
    const query = `
        SELECT * FROM meeting_notes
        WHERE uid = ?
        ORDER BY created_at DESC
    `;
    return db.prepare(query).all(uid);
}

/**
 * Create a new meeting note
 * @param {Object} data - Meeting note data
 * @param {string} data.sessionId - Session ID
 * @param {string} data.uid - User ID
 * @param {Object} data.structuredData - Structured meeting data (JSON)
 * @param {string} data.modelUsed - AI model used
 * @param {number} data.tokensUsed - Tokens consumed
 * @returns {string} Created meeting note ID
 */
function create(data) {
    const db = sqliteClient.getDb();
    const noteId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const {
        sessionId,
        uid,
        structuredData,
        modelUsed = '',
        tokensUsed = 0
    } = data;

    // Extract fields from structured data
    const executiveSummary = structuredData.executiveSummary || '';
    const participants = JSON.stringify(structuredData.meetingMetadata?.participants || []);
    const meetingMetadata = JSON.stringify(structuredData.meetingMetadata || {});
    const keyPoints = JSON.stringify(structuredData.keyPoints || []);
    const decisions = JSON.stringify(structuredData.decisions || []);
    const actionItems = JSON.stringify(structuredData.actionItems || []);
    const timeline = JSON.stringify(structuredData.timeline || []);
    const unresolvedItems = JSON.stringify(structuredData.unresolvedItems || []);
    const nextSteps = JSON.stringify(structuredData.nextSteps || []);
    const importantQuotes = JSON.stringify(structuredData.importantQuotes || []);
    const fullStructuredData = JSON.stringify(structuredData);

    const query = `
        INSERT INTO meeting_notes (
            id, session_id, uid,
            executive_summary, participants, meeting_metadata,
            key_points, decisions, action_items,
            timeline, unresolved_items, next_steps,
            important_quotes, full_structured_data,
            model_used, tokens_used,
            generation_status, created_at, updated_at, sync_state
        ) VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?, ?
        )
    `;

    try {
        db.prepare(query).run(
            noteId, sessionId, uid,
            executiveSummary, participants, meetingMetadata,
            keyPoints, decisions, actionItems,
            timeline, unresolvedItems, nextSteps,
            importantQuotes, fullStructuredData,
            modelUsed, tokensUsed,
            'completed', now, now, 'clean'
        );

        console.log(`[SQLite] Created meeting note ${noteId} for session ${sessionId}`);
        return noteId;
    } catch (err) {
        console.error('[SQLite] Failed to create meeting note:', err);
        throw err;
    }
}

/**
 * Update meeting note
 * @param {string} id - Meeting note ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Update result with changes count
 */
function update(id, updates) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);

    // Build dynamic update query
    const allowedFields = [
        'executive_summary', 'participants', 'meeting_metadata',
        'key_points', 'decisions', 'action_items',
        'timeline', 'unresolved_items', 'next_steps',
        'important_quotes', 'full_structured_data',
        'email_draft', 'generation_status', 'generation_error',
        'model_used', 'tokens_used'
    ];

    const setters = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            setters.push(`${key} = ?`);
            // Stringify if object/array
            values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
    }

    if (setters.length === 0) {
        return { changes: 0 };
    }

    setters.push('updated_at = ?', 'sync_state = ?');
    values.push(now, 'dirty');
    values.push(id);

    const query = `UPDATE meeting_notes SET ${setters.join(', ')} WHERE id = ?`;

    try {
        const result = db.prepare(query).run(values);
        console.log(`[SQLite] Updated meeting note ${id}: ${result.changes} rows changed`);
        return { changes: result.changes };
    } catch (err) {
        console.error('[SQLite] Failed to update meeting note:', err);
        throw err;
    }
}

/**
 * Delete meeting note and related tasks
 * @param {string} id - Meeting note ID
 * @returns {Object} Delete result with success status
 */
function deleteWithRelatedData(id) {
    const db = sqliteClient.getDb();

    const transaction = db.transaction(() => {
        // Delete related tasks first
        db.prepare('DELETE FROM meeting_tasks WHERE meeting_note_id = ?').run(id);
        // Delete the meeting note
        db.prepare('DELETE FROM meeting_notes WHERE id = ?').run(id);
    });

    try {
        transaction();
        console.log(`[SQLite] Deleted meeting note ${id} and related tasks`);
        return { success: true };
    } catch (err) {
        console.error('[SQLite] Failed to delete meeting note:', err);
        throw err;
    }
}

/**
 * Fix MEDIUM BUG: Create a pending meeting note record before generation starts
 * This allows tracking the status and recovering from failures
 * @param {string} sessionId - Session ID
 * @param {string} uid - User ID
 * @returns {string} Created meeting note ID
 */
function createPending(sessionId, uid) {
    const db = sqliteClient.getDb();
    const noteId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const query = `
        INSERT INTO meeting_notes (
            id, session_id, uid,
            generation_status, created_at, updated_at, sync_state
        ) VALUES (?, ?, ?, 'pending', ?, ?, 'clean')
    `;

    try {
        db.prepare(query).run(noteId, sessionId, uid, now, now);
        console.log(`[SQLite] Created pending meeting note ${noteId} for session ${sessionId}`);
        return noteId;
    } catch (err) {
        console.error('[SQLite] Failed to create pending meeting note:', err);
        throw err;
    }
}

/**
 * Fix MEDIUM BUG: Mark a meeting note as currently generating
 * @param {string} id - Meeting note ID
 * @returns {Object} Update result
 */
function markAsGenerating(id) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);

    const query = `
        UPDATE meeting_notes
        SET generation_status = 'generating', generation_error = NULL, updated_at = ?, sync_state = ?
        WHERE id = ?
    `;

    try {
        const result = db.prepare(query).run(now, 'dirty', id);
        console.log(`[SQLite] Marked meeting note ${id} as generating`);
        return { changes: result.changes };
    } catch (err) {
        console.error('[SQLite] Failed to mark meeting note as generating:', err);
        throw err;
    }
}

/**
 * Mark generation as failed
 * @param {string} id - Meeting note ID
 * @param {string} errorMessage - Error message
 * @returns {Object} Update result
 */
function markAsFailed(id, errorMessage) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);

    const query = `
        UPDATE meeting_notes
        SET generation_status = ?, generation_error = ?, updated_at = ?, sync_state = ?
        WHERE id = ?
    `;

    try {
        const result = db.prepare(query).run('failed', errorMessage, now, 'dirty', id);
        console.log(`[SQLite] Marked meeting note ${id} as failed: ${errorMessage}`);
        return { changes: result.changes };
    } catch (err) {
        console.error('[SQLite] Failed to mark meeting note as failed:', err);
        throw err;
    }
}

/**
 * Fix MEDIUM BUG: Get meeting notes that are stuck in generating state
 * Useful for recovering from app crashes during generation
 * @param {string} uid - User ID
 * @param {number} stuckThresholdSeconds - Seconds after which a generating note is considered stuck
 * @returns {Array<Object>} Array of stuck meeting notes
 */
function getStuckGenerating(uid, stuckThresholdSeconds = 300) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);
    const threshold = now - stuckThresholdSeconds;

    const query = `
        SELECT * FROM meeting_notes
        WHERE uid = ?
          AND generation_status = 'generating'
          AND updated_at < ?
        ORDER BY created_at DESC
    `;
    return db.prepare(query).all(uid, threshold);
}

/**
 * Get meeting notes with pagination
 * @param {string} uid - User ID
 * @param {number} limit - Number of records to return
 * @param {number} offset - Offset for pagination
 * @returns {Array<Object>} Array of meeting notes
 */
function getPaginated(uid, limit = 20, offset = 0) {
    const db = sqliteClient.getDb();
    const query = `
        SELECT * FROM meeting_notes
        WHERE uid = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `;
    return db.prepare(query).all(uid, limit, offset);
}

module.exports = {
    getById,
    getBySessionId,
    getAllByUserId,
    create,
    update,
    deleteWithRelatedData,
    // Fix MEDIUM BUG: Generation status tracking
    createPending,
    markAsGenerating,
    markAsFailed,
    getStuckGenerating,
    getPaginated
};
