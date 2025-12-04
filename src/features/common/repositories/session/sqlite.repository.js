const sqliteClient = require('../../services/sqliteClient');

// Fix HIGH BUG-H13: Whitelist for session types to prevent invalid values
const ALLOWED_SESSION_TYPES = ['ask', 'listen'];

function getById(id) {
    const db = sqliteClient.getDb();
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function create(uid, type = 'ask') {
    // Fix HIGH BUG-H13: Validate session type against whitelist
    if (!ALLOWED_SESSION_TYPES.includes(type)) {
        throw new Error(`Invalid session type: ${type}. Must be 'ask' or 'listen'`);
    }

    const db = sqliteClient.getDb();
    const sessionId = require('crypto').randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const query = `INSERT INTO sessions (id, uid, title, session_type, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`;

    try {
        db.prepare(query).run(sessionId, uid, `Session @ ${new Date().toLocaleTimeString()}`, type, now, now);
        console.log(`SQLite: Created session ${sessionId} for user ${uid} (type: ${type})`);
        return sessionId;
    } catch (err) {
        console.error('SQLite: Failed to create session:', err);
        throw err;
    }
}

// FIX MEDIUM: Add configurable limit for performance
const DEFAULT_SESSION_LIMIT = 100;
const MAX_SESSION_LIMIT = 500;

function getAllByUserId(uid, options = {}) {
    const db = sqliteClient.getDb();
    // FIX MEDIUM: Add limit to prevent performance issues with large datasets
    const limit = Math.min(options.limit || DEFAULT_SESSION_LIMIT, MAX_SESSION_LIMIT);
    const offset = options.offset || 0;

    const query = `SELECT id, uid, title, session_type, started_at, ended_at, sync_state, updated_at
                   FROM sessions WHERE uid = ?
                   ORDER BY started_at DESC
                   LIMIT ? OFFSET ?`;
    return db.prepare(query).all(uid, limit, offset);
}

function updateTitle(id, title) {
    const db = sqliteClient.getDb();
    const result = db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, id);
    return { changes: result.changes };
}

function deleteWithRelatedData(id) {
    const db = sqliteClient.getDb();
    const transaction = db.transaction(() => {
        // Fix HIGH BUG: Delete in proper order to respect FK relationships
        // First delete tasks (depends on meeting_notes and sessions)
        db.prepare("DELETE FROM meeting_tasks WHERE session_id = ?").run(id);
        // Then delete meeting_notes (depends on sessions)
        db.prepare("DELETE FROM meeting_notes WHERE session_id = ?").run(id);
        // Delete session_participants
        db.prepare("DELETE FROM session_participants WHERE session_id = ?").run(id);
        // Delete live_insights
        db.prepare("DELETE FROM live_insights WHERE session_id = ?").run(id);
        // Delete transcripts
        db.prepare("DELETE FROM transcripts WHERE session_id = ?").run(id);
        // Delete ai_messages
        db.prepare("DELETE FROM ai_messages WHERE session_id = ?").run(id);
        // Delete summaries
        db.prepare("DELETE FROM summaries WHERE session_id = ?").run(id);
        // Finally delete the session itself
        db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    });

    try {
        transaction();
        console.log(`[Repo] Deleted session ${id} and all related data`);
        return { success: true };
    } catch (err) {
        // Fix HIGH BUG-H15: Log transaction rollback for better error diagnostics
        console.error(`SQLite: Transaction failed for deleteWithRelatedData(${id}), rollback automatic:`, err);
        throw err;
    }
}

function end(id) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);
    const query = `UPDATE sessions SET ended_at = ?, updated_at = ? WHERE id = ?`;
    const result = db.prepare(query).run(now, now, id);
    return { changes: result.changes };
}

function updateType(id, type) {
    // Fix HIGH BUG-H13: Validate session type against whitelist
    if (!ALLOWED_SESSION_TYPES.includes(type)) {
        throw new Error(`Invalid session type: ${type}. Must be 'ask' or 'listen'`);
    }

    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);
    const query = 'UPDATE sessions SET session_type = ?, updated_at = ? WHERE id = ?';
    const result = db.prepare(query).run(type, now, id);
    return { changes: result.changes };
}

function touch(id) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);
    const query = 'UPDATE sessions SET updated_at = ? WHERE id = ?';
    const result = db.prepare(query).run(now, id);
    return { changes: result.changes };
}

function getOrCreateActive(uid, requestedType = 'ask') {
    const db = sqliteClient.getDb();
    
    // 1. Look for ANY active session for the user (ended_at IS NULL).
    //    Prefer 'listen' sessions over 'ask' sessions to ensure continuity.
    const findQuery = `
        SELECT id, session_type FROM sessions 
        WHERE uid = ? AND ended_at IS NULL
        ORDER BY CASE session_type WHEN 'listen' THEN 1 WHEN 'ask' THEN 2 ELSE 3 END
        LIMIT 1
    `;

    const activeSession = db.prepare(findQuery).get(uid);

    if (activeSession) {
        // An active session exists.
        console.log(`[Repo] Found active session ${activeSession.id} of type ${activeSession.session_type}`);
        
        // 2. Promotion Logic: If it's an 'ask' session and we need 'listen', promote it.
        if (activeSession.session_type === 'ask' && requestedType === 'listen') {
            updateType(activeSession.id, 'listen');
            console.log(`[Repo] Promoted session ${activeSession.id} to 'listen' type.`);
        }

        // 3. Touch the session and return its ID.
        touch(activeSession.id);
        return activeSession.id;
    } else {
        // 4. No active session found, create a new one.
        console.log(`[Repo] No active session for user ${uid}. Creating new '${requestedType}' session.`);
        return create(uid, requestedType);
    }
}

function endAllActiveSessions(uid) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);
    // Filter by uid to match the Firebase repository's behavior.
    const query = `UPDATE sessions SET ended_at = ?, updated_at = ? WHERE ended_at IS NULL AND uid = ?`;

    try {
        const result = db.prepare(query).run(now, now, uid);
        console.log(`[Repo] Ended ${result.changes} active SQLite session(s) for user ${uid}.`);
        return { changes: result.changes };
    } catch (err) {
        console.error('SQLite: Failed to end all active sessions:', err);
        throw err;
    }
}

/**
 * Fix HIGH BUG: Mark session as post-processed (meeting notes generated)
 * This flag is persisted in the database to survive app restarts
 * @param {string} id - Session ID
 * @returns {Object} Update result with changes count
 */
function markAsPostProcessed(id) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);
    const query = 'UPDATE sessions SET is_post_processed = 1, updated_at = ? WHERE id = ?';

    try {
        const result = db.prepare(query).run(now, id);
        console.log(`[Repo] Marked session ${id} as post-processed`);
        return { changes: result.changes };
    } catch (err) {
        console.error('SQLite: Failed to mark session as post-processed:', err);
        throw err;
    }
}

/**
 * Fix HIGH BUG: Check if session has been post-processed
 * @param {string} id - Session ID
 * @returns {boolean} True if session has meeting notes
 */
function isPostProcessed(id) {
    const db = sqliteClient.getDb();
    const result = db.prepare('SELECT is_post_processed FROM sessions WHERE id = ?').get(id);
    return result ? result.is_post_processed === 1 : false;
}

/**
 * Get sessions that need post-processing (ended but not processed)
 * Useful for recovering from app restarts during processing
 * @param {string} uid - User ID
 * @returns {Array} List of unprocessed sessions
 */
function getUnprocessedSessions(uid, options = {}) {
    const db = sqliteClient.getDb();
    // FIX MEDIUM: Add limit for performance
    const limit = Math.min(options.limit || 50, 100);

    const query = `
        SELECT * FROM sessions
        WHERE uid = ?
          AND session_type = 'listen'
          AND ended_at IS NOT NULL
          AND (is_post_processed IS NULL OR is_post_processed = 0)
        ORDER BY ended_at DESC
        LIMIT ?
    `;
    return db.prepare(query).all(uid, limit);
}

module.exports = {
    getById,
    create,
    getAllByUserId,
    updateTitle,
    deleteWithRelatedData,
    end,
    updateType,
    touch,
    getOrCreateActive,
    endAllActiveSessions,
    // Fix HIGH BUG: Session post-processing tracking
    markAsPostProcessed,
    isPostProcessed,
    getUnprocessedSessions,
}; 