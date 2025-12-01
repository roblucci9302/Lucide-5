const sqliteClient = require('../../services/sqliteClient');

// Fix HIGH BUG-H20: Define length limits for preset fields
const MAX_TITLE_LENGTH = 200;
const MAX_PROMPT_LENGTH = 50000;

function getPresets(uid) {
    const db = sqliteClient.getDb();
    const query = `
        SELECT * FROM prompt_presets 
        WHERE uid = ? OR is_default = 1 
        ORDER BY is_default DESC, title ASC
    `;
    
    try {
        return db.prepare(query).all(uid);
    } catch (err) {
        console.error('SQLite: Failed to get presets:', err);
        throw err;
    }
}

function getPresetTemplates() {
    const db = sqliteClient.getDb();
    const query = `
        SELECT * FROM prompt_presets 
        WHERE is_default = 1 
        ORDER BY title ASC
    `;
    
    try {
        return db.prepare(query).all();
    } catch (err) {
        console.error('SQLite: Failed to get preset templates:', err);
        throw err;
    }
}

function create({ uid, title, prompt }) {
    // Fix HIGH BUG-H20: Validate length of title and prompt
    if (!title || title.length === 0) {
        throw new Error('Preset title cannot be empty');
    }
    if (title.length > MAX_TITLE_LENGTH) {
        throw new Error(`Preset title too long (max ${MAX_TITLE_LENGTH} characters)`);
    }
    if (!prompt || prompt.length === 0) {
        throw new Error('Preset prompt cannot be empty');
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
        throw new Error(`Preset prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
    }

    const db = sqliteClient.getDb();
    const presetId = require('crypto').randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const query = `INSERT INTO prompt_presets (id, uid, title, prompt, is_default, created_at, sync_state) VALUES (?, ?, ?, ?, 0, ?, 'dirty')`;

    try {
        db.prepare(query).run(presetId, uid, title, prompt, now);
        return { id: presetId };
    } catch (err) {
        throw err;
    }
}

function update(id, { title, prompt }, uid) {
    // Fix HIGH BUG-H20: Validate length of title and prompt
    if (title !== undefined) {
        if (title.length === 0) {
            throw new Error('Preset title cannot be empty');
        }
        if (title.length > MAX_TITLE_LENGTH) {
            throw new Error(`Preset title too long (max ${MAX_TITLE_LENGTH} characters)`);
        }
    }
    if (prompt !== undefined) {
        if (prompt.length === 0) {
            throw new Error('Preset prompt cannot be empty');
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
            throw new Error(`Preset prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
        }
    }

    const db = sqliteClient.getDb();
    const query = `UPDATE prompt_presets SET title = ?, prompt = ?, sync_state = 'dirty' WHERE id = ? AND uid = ? AND is_default = 0`;

    try {
        const result = db.prepare(query).run(title, prompt, id, uid);
        if (result.changes === 0) {
            throw new Error("Preset not found or permission denied.");
        }
        return { changes: result.changes };
    } catch (err) {
        throw err;
    }
}

function del(id, uid) {
    const db = sqliteClient.getDb();
    const query = `DELETE FROM prompt_presets WHERE id = ? AND uid = ? AND is_default = 0`;

    try {
        const result = db.prepare(query).run(id, uid);
        if (result.changes === 0) {
            throw new Error("Preset not found or permission denied.");
        }
        return { changes: result.changes };
    } catch (err) {
        throw err;
    }
}

module.exports = {
    getPresets,
    getPresetTemplates,
    create,
    update,
    delete: del
}; 