const sqliteClient = require('../../../common/services/sqliteClient');
const crypto = require('crypto');
const { estimateTaskDuration } = require('../../../common/utils/taskEstimation');

/**
 * Repository for meeting_tasks table (SQLite)
 */

/**
 * Get task by ID
 * @param {string} id - Task ID
 * @returns {Object|null} Task object or null
 */
function getById(id) {
    const db = sqliteClient.getDb();
    return db.prepare('SELECT * FROM meeting_tasks WHERE id = ?').get(id);
}

/**
 * Get all tasks for a meeting note
 * @param {string} meetingNoteId - Meeting note ID
 * @returns {Array<Object>} Array of tasks
 */
function getByMeetingNoteId(meetingNoteId) {
    const db = sqliteClient.getDb();
    return db.prepare('SELECT * FROM meeting_tasks WHERE meeting_note_id = ? ORDER BY priority DESC, created_at ASC').all(meetingNoteId);
}

/**
 * Get all tasks for a session
 * @param {string} sessionId - Session ID
 * @returns {Array<Object>} Array of tasks
 */
function getBySessionId(sessionId) {
    const db = sqliteClient.getDb();
    return db.prepare('SELECT * FROM meeting_tasks WHERE session_id = ? ORDER BY priority DESC, created_at ASC').all(sessionId);
}

/**
 * Get all tasks for a user
 * @param {string} uid - User ID
 * @param {string} status - Optional status filter ('pending', 'completed', etc.)
 * @returns {Array<Object>} Array of tasks
 */
function getAllByUserId(uid, status = null) {
    const db = sqliteClient.getDb();
    let query = 'SELECT * FROM meeting_tasks WHERE uid = ?';
    const params = [uid];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    return db.prepare(query).all(params);
}

/**
 * Create a new task
 * @param {Object} data - Task data
 * @param {string} data.meetingNoteId - Meeting note ID
 * @param {string} data.sessionId - Session ID
 * @param {string} data.uid - User ID
 * @param {string} data.taskDescription - Task description
 * @param {string} data.assignedTo - Assigned person/team
 * @param {string} data.deadline - Deadline
 * @param {string} data.priority - Priority (low, medium, high)
 * @param {string} data.context - Task context
 * @param {number} data.estimatedHours - Pre-calculated estimated hours (optional)
 * @returns {string} Created task ID
 */
function create(data) {
    const db = sqliteClient.getDb();
    const taskId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const {
        meetingNoteId,
        sessionId,
        uid,
        taskDescription,
        assignedTo = 'TBD',
        deadline = 'TBD',
        priority = 'medium',
        context = '',
        estimatedHours = null
    } = data;

    // Auto-calculate estimated hours if not provided
    let finalEstimatedHours = estimatedHours;
    if (finalEstimatedHours === null && taskDescription) {
        const estimation = estimateTaskDuration(taskDescription, priority, context);
        finalEstimatedHours = estimation.estimatedHours;
        console.log(`[SQLite] Auto-estimated ${finalEstimatedHours}h for task: "${taskDescription.substring(0, 50)}..."`);
    }

    const query = `
        INSERT INTO meeting_tasks (
            id, meeting_note_id, session_id, uid,
            task_description, assigned_to, deadline, priority, context,
            status, created_at, updated_at, sync_state, estimated_hours
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
        )
    `;

    try {
        db.prepare(query).run(
            taskId, meetingNoteId, sessionId, uid,
            taskDescription, assignedTo, deadline, priority, context,
            'pending', now, now, 'clean', finalEstimatedHours
        );

        console.log(`[SQLite] Created task ${taskId} for meeting note ${meetingNoteId}`);
        return taskId;
    } catch (err) {
        console.error('[SQLite] Failed to create task:', err);
        throw err;
    }
}

/**
 * Bulk create tasks
 * @param {Array<Object>} tasks - Array of task objects
 * @returns {Array<string>} Array of created task IDs
 */
function createBulk(tasks) {
    const db = sqliteClient.getDb();
    const createdIds = [];

    const transaction = db.transaction(() => {
        for (const task of tasks) {
            const taskId = create(task);
            createdIds.push(taskId);
        }
    });

    try {
        transaction();
        console.log(`[SQLite] Created ${createdIds.length} tasks in bulk`);
        return createdIds;
    } catch (err) {
        console.error('[SQLite] Failed to bulk create tasks:', err);
        throw err;
    }
}

/**
 * Update task
 * @param {string} id - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Update result with changes count
 */
function update(id, updates) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);

    const allowedFields = [
        'task_description', 'assigned_to', 'deadline', 'priority',
        'context', 'status', 'completed_at'
    ];

    const setters = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            setters.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (setters.length === 0) {
        return { changes: 0 };
    }

    setters.push('updated_at = ?', 'sync_state = ?');
    values.push(now, 'dirty');
    values.push(id);

    const query = `UPDATE meeting_tasks SET ${setters.join(', ')} WHERE id = ?`;

    try {
        const result = db.prepare(query).run(values);
        console.log(`[SQLite] Updated task ${id}: ${result.changes} rows changed`);
        return { changes: result.changes };
    } catch (err) {
        console.error('[SQLite] Failed to update task:', err);
        throw err;
    }
}

/**
 * Mark task as completed
 * @param {string} id - Task ID
 * @returns {Object} Update result
 */
function markCompleted(id) {
    const db = sqliteClient.getDb();
    const now = Math.floor(Date.now() / 1000);

    const query = `
        UPDATE meeting_tasks
        SET status = ?, completed_at = ?, updated_at = ?, sync_state = ?
        WHERE id = ?
    `;

    try {
        const result = db.prepare(query).run('completed', now, now, 'dirty', id);
        console.log(`[SQLite] Marked task ${id} as completed`);
        return { changes: result.changes };
    } catch (err) {
        console.error('[SQLite] Failed to mark task as completed:', err);
        throw err;
    }
}

/**
 * Delete task
 * @param {string} id - Task ID
 * @returns {Object} Delete result
 */
function deleteTask(id) {
    const db = sqliteClient.getDb();

    try {
        const result = db.prepare('DELETE FROM meeting_tasks WHERE id = ?').run(id);
        console.log(`[SQLite] Deleted task ${id}`);
        return { changes: result.changes };
    } catch (err) {
        console.error('[SQLite] Failed to delete task:', err);
        throw err;
    }
}

/**
 * Get tasks with filters
 * @param {string} uid - User ID
 * @param {Object} filters - Filter options
 * @param {string} filters.priority - Priority filter
 * @param {string} filters.status - Status filter
 * @param {string} filters.assignedTo - Assigned to filter
 * @returns {Array<Object>} Array of filtered tasks
 */
function getFiltered(uid, filters = {}) {
    const db = sqliteClient.getDb();
    let query = 'SELECT * FROM meeting_tasks WHERE uid = ?';
    const params = [uid];

    if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
    }

    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.assignedTo) {
        query += ' AND assigned_to = ?';
        params.push(filters.assignedTo);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    return db.prepare(query).all(params);
}

module.exports = {
    getById,
    getByMeetingNoteId,
    getBySessionId,
    getAllByUserId,
    create,
    createBulk,
    update,
    markCompleted,
    deleteTask,
    getFiltered
};
