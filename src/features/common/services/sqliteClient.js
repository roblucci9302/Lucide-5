const { loaders } = require('../utils/dependencyLoader');
const Database = loaders.loadSqlite();
const path = require('path');
const LATEST_SCHEMA = require('../config/schema');

class SQLiteClient {
    constructor() {
        this.db = null;
        this.dbPath = null;
        this.defaultUserId = 'default_user';
        this._connecting = false; // Race condition protection

        // Fix NORMAL MEDIUM BUG-M26: Extract database pragma timeout constant
        // 5 second timeout for busy/locked database retries
        // Balances responsiveness (not too long) with resilience (handles concurrent access)
        this.DB_BUSY_TIMEOUT_MS = 5000;
    }

    connect(dbPath) {
        // Check if already connected
        if (this.db) {
            console.log('[SQLiteClient] Already connected.');
            return;
        }

        // Prevent concurrent connection attempts
        if (this._connecting) {
            throw new Error('[SQLiteClient] Connection already in progress. Please wait for it to complete.');
        }

        this._connecting = true;

        try {
            const tempDb = new Database(dbPath); // Connect first

            // Configure database
            try {
                tempDb.pragma('journal_mode = WAL');
                tempDb.pragma(`busy_timeout = ${this.DB_BUSY_TIMEOUT_MS}`); // Configurable timeout for lock retries
                tempDb.pragma('foreign_keys = ON'); // Enable foreign key constraints
            } catch (pragmaErr) {
                console.warn('[SQLiteClient] Could not set all pragmas:', pragmaErr.message);
                // Continue anyway - pragmas are optimizations
            }

            // Only set instance state if successful
            this.db = tempDb;
            this.dbPath = dbPath;
            console.log('[SQLiteClient] Connected successfully to:', this.dbPath);
        } catch (err) {
            console.error('[SQLiteClient] Could not connect to database', err);
            // Ensure clean state on failure
            this.db = null;
            this.dbPath = null;
            throw err;
        } finally {
            this._connecting = false;
        }
    }

    getDb() {
        if (!this.db) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.db;
    }

    // Alias for backward compatibility - many files call getDatabase()
    getDatabase() {
        return this.getDb();
    }

    _validateAndQuoteIdentifier(identifier) {
        if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
            throw new Error(`Invalid database identifier used: ${identifier}. Only alphanumeric characters and underscores are allowed.`);
        }
        return `"${identifier}"`;
    }

    /**
     * Validate column type to prevent SQL injection via schema manipulation
     * @param {string} type - The column type to validate
     * @returns {string} The validated type
     * @throws {Error} If type contains potentially malicious content
     */
    _validateColumnType(type) {
        if (!type || typeof type !== 'string') {
            throw new Error('Column type must be a non-empty string');
        }

        const trimmedType = type.trim().toUpperCase();

        // Whitelist of allowed base types and constraints
        const allowedBaseTypes = [
            'TEXT', 'INTEGER', 'REAL', 'BLOB', 'NUMERIC', 'BOOLEAN'
        ];

        const allowedConstraints = [
            'PRIMARY KEY', 'NOT NULL', 'UNIQUE', 'CHECK', 'DEFAULT',
            'COLLATE', 'REFERENCES', 'ON DELETE', 'ON UPDATE',
            'AUTOINCREMENT', 'CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT'
        ];

        // Extract the base type (first word)
        const baseType = trimmedType.split(/\s+/)[0];

        // Check if base type is allowed
        if (!allowedBaseTypes.includes(baseType)) {
            throw new Error(`Invalid column type: ${baseType}. Allowed types: ${allowedBaseTypes.join(', ')}`);
        }

        // Check for SQL injection attempts (semicolons, comments, etc.)
        if (/[;]|--|\/\*|\*\/|DROP|ALTER|CREATE|INSERT|UPDATE|DELETE|EXEC|EXECUTE/i.test(type)) {
            throw new Error(`Potentially malicious content detected in column type: ${type}`);
        }

        // Validate that any additional constraints are from the whitelist
        const words = trimmedType.split(/\s+/).slice(1); // Skip base type
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // Allow parentheses and values for DEFAULT, but validate them
            if (word.includes('(') || word.includes(')') || /^['"].*['"]$/.test(word) || /^\d+$/.test(word)) {
                continue; // Allow values in parentheses, quoted strings, and numbers
            }
            // Check if word is part of an allowed constraint
            const isAllowed = allowedConstraints.some(constraint =>
                constraint.includes(word) || word === constraint.split(/\s+/)[0]
            );
            if (!isAllowed && word !== 'KEY') { // KEY is part of "PRIMARY KEY"
                throw new Error(`Invalid constraint keyword in column type: ${word}`);
            }
        }

        // Return original type if validation passes
        return type.trim();
    }

    _migrateProviderSettings() {
        const tablesInDb = this.getTablesFromDb();
        if (!tablesInDb.includes('provider_settings')) {
            return; // Table doesn't exist, no migration needed.
        }
    
        const providerSettingsInfo = this.db.prepare(`PRAGMA table_info(provider_settings)`).all();
        const hasUidColumn = providerSettingsInfo.some(col => col.name === 'uid');
    
        if (hasUidColumn) {
            console.log('[DB Migration] Old provider_settings schema detected. Starting robust migration...');
    
            try {
                this.db.transaction(() => {
                    this.db.exec('ALTER TABLE provider_settings RENAME TO provider_settings_old');
                    console.log('[DB Migration] Renamed provider_settings to provider_settings_old');
    
                    this.createTable('provider_settings', LATEST_SCHEMA.provider_settings);
                    console.log('[DB Migration] Created new provider_settings table');
    
                    // Dynamically build the migration query for robustness
                    const oldColumnNames = this.db.prepare(`PRAGMA table_info(provider_settings_old)`).all().map(c => c.name);
                    const newColumnNames = LATEST_SCHEMA.provider_settings.columns.map(c => c.name);
                    const commonColumns = newColumnNames.filter(name => oldColumnNames.includes(name));
    
                    if (!commonColumns.includes('provider')) {
                        console.warn('[DB Migration] Old table is missing the "provider" column. Aborting migration for this table.');
                        this.db.exec('DROP TABLE provider_settings_old');
                        return;
                    }
    
                    const orderParts = [];
                    if (oldColumnNames.includes('updated_at')) orderParts.push('updated_at DESC');
                    if (oldColumnNames.includes('created_at')) orderParts.push('created_at DESC');
                    const orderByClause = orderParts.length > 0 ? `ORDER BY ${orderParts.join(', ')}` : '';
    
                    const columnsForInsert = commonColumns.map(c => this._validateAndQuoteIdentifier(c)).join(', ');
    
                    const migrationQuery = `
                        INSERT INTO provider_settings (${columnsForInsert})
                        SELECT ${columnsForInsert}
                        FROM (
                            SELECT *, ROW_NUMBER() OVER(PARTITION BY provider ${orderByClause}) as rn
                            FROM provider_settings_old
                        )
                        WHERE rn = 1
                    `;
                    
                    console.log(`[DB Migration] Executing robust migration query for columns: ${commonColumns.join(', ')}`);
                    const result = this.db.prepare(migrationQuery).run();
                    console.log(`[DB Migration] Migrated ${result.changes} rows to the new provider_settings table.`);
    
                    this.db.exec('DROP TABLE provider_settings_old');
                    console.log('[DB Migration] Dropped provider_settings_old table.');
                })();
                console.log('[DB Migration] provider_settings migration completed successfully.');
            } catch (error) {
                console.error('[DB Migration] Failed to migrate provider_settings table.', error);
                
                // Try to recover by dropping the temp table if it exists
                const oldTableExists = this.getTablesFromDb().includes('provider_settings_old');
                if (oldTableExists) {
                    this.db.exec('DROP TABLE provider_settings_old');
                    console.warn('[DB Migration] Cleaned up temporary old table after failure.');
                }
                throw error;
            }
        }
    }

    async synchronizeSchema() {
        console.log('[DB Sync] Starting schema synchronization...');

        // Fix HIGH BUG #7: Wrap entire schema synchronization in transaction
        // This ensures atomicity - either all schema changes succeed or all are rolled back
        try {
            this.db.transaction(() => {
                // Run special migration for provider_settings before the generic sync logic
                this._migrateProviderSettings();

                const tablesInDb = this.getTablesFromDb();

                for (const tableName of Object.keys(LATEST_SCHEMA)) {
                    const tableSchema = LATEST_SCHEMA[tableName];

                    if (!tablesInDb.includes(tableName)) {
                        // Table doesn't exist, create it
                        this.createTable(tableName, tableSchema);
                    } else {
                        // Table exists, check for missing columns
                        this.updateTable(tableName, tableSchema);
                    }
                }
            })(); // Execute transaction

            console.log('[DB Sync] Schema synchronization finished successfully.');
        } catch (error) {
            console.error('[DB Sync] Schema synchronization failed - all changes rolled back:', error);
            throw error; // Re-throw to let caller know synchronization failed
        }
    }

    getTablesFromDb() {
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        return tables.map(t => t.name);
    }

    createTable(tableName, tableSchema) {
        const safeTableName = this._validateAndQuoteIdentifier(tableName);
        const columnDefs = tableSchema.columns
            .map(col => `${this._validateAndQuoteIdentifier(col.name)} ${this._validateColumnType(col.type)}`)
            .join(', ');
        
        const constraints = tableSchema.constraints || [];
        const constraintsDef = constraints.length > 0 ? ', ' + constraints.join(', ') : '';
        
        const query = `CREATE TABLE IF NOT EXISTS ${safeTableName} (${columnDefs}${constraintsDef})`;
        console.log(`[DB Sync] Creating table: ${tableName}`);
        this.db.exec(query);
    }

    updateTable(tableName, tableSchema) {
        const safeTableName = this._validateAndQuoteIdentifier(tableName);
        
        // Get current columns
        const currentColumns = this.db.prepare(`PRAGMA table_info(${safeTableName})`).all();
        const currentColumnNames = currentColumns.map(col => col.name);

        // Check for new columns to add
        const newColumns = tableSchema.columns.filter(col => !currentColumnNames.includes(col.name));

        if (newColumns.length > 0) {
            console.log(`[DB Sync] Adding ${newColumns.length} new column(s) to ${tableName}`);
            for (const col of newColumns) {
                const safeColName = this._validateAndQuoteIdentifier(col.name);
                const safeColType = this._validateColumnType(col.type);
                const addColumnQuery = `ALTER TABLE ${safeTableName} ADD COLUMN ${safeColName} ${safeColType}`;
                this.db.exec(addColumnQuery);
                console.log(`[DB Sync] Added column ${col.name} to ${tableName}`);
            }
        }

        if (tableSchema.constraints && tableSchema.constraints.length > 0) {
            console.log(`[DB Sync] Note: Constraints for ${tableName} can only be set during table creation`);
        }
    }

    runQuery(query, params = []) {
        return this.db.prepare(query).run(params);
    }

    cleanupEmptySessions() {
        console.log('[DB Cleanup] Checking for empty sessions...');

        // Fix HIGH MEDIUM BUG-M13: Wrap cleanup operations in transaction for atomicity
        try {
            const cleanupTransaction = this.db.transaction(() => {
                const query = `
                    SELECT s.id FROM sessions s
                    LEFT JOIN transcripts t ON s.id = t.session_id
                    LEFT JOIN ai_messages a ON s.id = a.session_id
                    LEFT JOIN summaries su ON s.id = su.session_id
                    WHERE t.id IS NULL AND a.id IS NULL AND su.session_id IS NULL
                `;

                const rows = this.db.prepare(query).all();

                if (rows.length === 0) {
                    console.log('[DB Cleanup] No empty sessions found.');
                    return 0;
                }

                const idsToDelete = rows.map(r => r.id);
                const placeholders = idsToDelete.map(() => '?').join(',');
                const deleteQuery = `DELETE FROM sessions WHERE id IN (${placeholders})`;

                console.log(`[DB Cleanup] Found ${idsToDelete.length} empty sessions. Deleting...`);
                const result = this.db.prepare(deleteQuery).run(idsToDelete);
                return result.changes;
            });

            const deletedCount = cleanupTransaction();
            if (deletedCount > 0) {
                console.log(`[DB Cleanup] Successfully deleted ${deletedCount} empty sessions.`);
            }
        } catch (error) {
            console.error('[DB Cleanup] Cleanup failed, all changes rolled back:', error);
            throw error;
        }
    }

    async initTables() {
        await this.synchronizeSchema();
        this.initDefaultData();
    }

    initDefaultData() {
        const now = Math.floor(Date.now() / 1000);
        const initUserQuery = `
            INSERT OR IGNORE INTO users (uid, display_name, email, created_at)
            VALUES (?, ?, ?, ?)
        `;

        this.db.prepare(initUserQuery).run(this.defaultUserId, 'Default User', 'contact@lucide.app', now);

        const defaultPresets = [
            ['school', 'School', 'You are a school and lecture assistant. Your goal is to help the user, a student, understand academic material and answer questions.\n\nWhenever a question appears on the user\'s screen or is asked aloud, you provide a direct, step-by-step answer, showing all necessary reasoning or calculations.\n\nIf the user is watching a lecture or working through new material, you offer concise explanations of key concepts and clarify definitions as they come up.', 1],
            ['meetings', 'Meetings', 'You are a meeting assistant. Your goal is to help the user capture key information during meetings and follow up effectively.\n\nYou help capture meeting notes, track action items, identify key decisions, and summarize important points discussed during meetings.', 1],
            ['sales', 'Sales', 'You are a real-time AI sales assistant, and your goal is to help the user close deals during sales interactions.\n\nYou provide real-time sales support, suggest responses to objections, help identify customer needs, and recommend strategies to advance deals.', 1],
            ['recruiting', 'Recruiting', 'You are a recruiting assistant. Your goal is to help the user interview candidates and evaluate talent effectively.\n\nYou help evaluate candidates, suggest interview questions, analyze responses, and provide insights about candidate fit for positions.', 1],
            ['customer-support', 'Customer Support', 'You are a customer support assistant. Your goal is to help resolve customer issues efficiently and thoroughly.\n\nYou help diagnose customer problems, suggest solutions, provide step-by-step troubleshooting guidance, and ensure customer satisfaction.', 1],
        ];

        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO prompt_presets (id, uid, title, prompt, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const preset of defaultPresets) {
            stmt.run(preset[0], this.defaultUserId, preset[1], preset[2], preset[3], now);
        }

        console.log('Default data initialized.');
    }

    /**
     * Fix NORMAL MEDIUM BUG-M25: Deduplicate query error handling
     * Generic helper for executing queries with standardized error handling
     * @param {string} methodName - Name of the calling method for error logging
     * @param {Function} queryFn - Function that executes the query
     * @param {*} param - Parameter value for error logging context
     * @returns {*} Query result
     * @private
     */
    _executeDbQuery(methodName, queryFn, param = null) {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            return queryFn();
        } catch (error) {
            const context = param ? ` for ${param}` : '';
            console.error(`[SQLiteClient] ${methodName} failed${context}:`, error);
            throw error;
        }
    }

    /**
     * Fix HIGH MEDIUM BUG-M12: Get user by UID
     * @param {string} uid - User ID to lookup
     * @returns {Object|null} User object or null if not found
     */
    async getUser(uid) {
        return this._executeDbQuery('getUser', () => {
            const user = this.db.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
            return user || null;
        }, `uid ${uid}`);
    }

    /**
     * Fix HIGH MEDIUM BUG-M12: Get prompt presets for a user
     * @param {string} uid - User ID to lookup presets for
     * @returns {Array} Array of preset objects
     */
    async getPresets(uid) {
        return this._executeDbQuery('getPresets', () => {
            const presets = this.db.prepare('SELECT * FROM prompt_presets WHERE uid = ?').all(uid);
            return presets || [];
        }, `uid ${uid}`);
    }

    close() {
        if (this.db) {
            try {
                this.db.close();
                console.log('SQLite connection closed.');
            } catch (err) {
                console.error('SQLite connection close failed:', err);
            }
            this.db = null;
        }
    }

    query(sql, params = []) {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        try {
            if (sql.toUpperCase().startsWith('SELECT')) {
                return this.db.prepare(sql).all(params);
            } else {
                const result = this.db.prepare(sql).run(params);
                return { changes: result.changes, lastID: result.lastID };
            }
        } catch (err) {
            console.error('Query error:', err);
            throw err;
        }
    }
}

const sqliteClient = new SQLiteClient();
module.exports = sqliteClient; 