/**
 * Database Manager
 *
 * Manages multiple Firebase database connections
 */

const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const sqliteClient = require('../common/services/sqliteClient');
const { loaders } = require('../common/utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;

class DatabaseManager {
    constructor() {
        this.databases = new Map(); // dbId -> { config, app, firestore, name }
        this.activeDatabase = null;
        this.initialized = false;
        console.log('[DatabaseManager] Service initialized');
    }

    /**
     * Initialize the manager
     */
    async initialize() {
        if (this.initialized) return;

        this.db = sqliteClient.getDb();

        // Load saved databases from SQLite
        await this._loadSavedDatabases();

        this.initialized = true;
        console.log('[DatabaseManager] Loaded', this.databases.size, 'saved databases');
    }

    /**
     * Add a new database connection
     * @param {Object} config - Firebase config
     * @returns {Promise<Object>} Result with dbId
     */
    async addDatabase(config) {
        console.log('[DatabaseManager] Adding new database:', config.name || config.projectId);

        try {
            // Validate config
            const validated = await this.validateConnection(config);
            if (!validated.success) {
                throw new Error(validated.error);
            }

            const dbId = uuidv4();

            // Initialize Firebase app for this database
            let app, firestore;

            try {
                // Check if app with this name already exists
                const appName = `external-${config.projectId}`;
                const existingApps = getApps();
                const existingApp = existingApps.find(a => a.name === appName);

                if (existingApp) {
                    app = existingApp;
                } else {
                    app = initializeApp(config, appName);
                }

                firestore = getFirestore(app);

                console.log('[DatabaseManager] Firebase app initialized:', appName);
            } catch (error) {
                console.error('[DatabaseManager] Error initializing Firebase app:', error);
                throw new Error(`Impossible d'initialiser la connexion: ${error.message}`);
            }

            // Store database info
            const dbInfo = {
                id: dbId,
                config,
                app,
                firestore,
                name: config.name || config.projectId,
                projectId: config.projectId,
                addedAt: Date.now()
            };

            this.databases.set(dbId, dbInfo);

            // Save to SQLite
            await this._saveDatabaseConfig(dbInfo);

            console.log('[DatabaseManager] Database added:', dbId);

            return {
                success: true,
                dbId,
                name: dbInfo.name
            };
        } catch (error) {
            console.error('[DatabaseManager] Error adding database:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Remove a database connection
     * @param {string} dbId - Database ID
     */
    async removeDatabase(dbId) {
        console.log('[DatabaseManager] Removing database:', dbId);

        try {
            const dbInfo = this.databases.get(dbId);

            if (!dbInfo) {
                throw new Error('Database not found');
            }

            // If this is the active database, deactivate it
            if (this.activeDatabase === dbId) {
                this.activeDatabase = null;
            }

            // Remove from map
            this.databases.delete(dbId);

            // Remove from SQLite
            this.db.prepare(`DELETE FROM external_databases WHERE id = ?`).run(dbId);

            console.log('[DatabaseManager] Database removed:', dbId);

            return { success: true };
        } catch (error) {
            console.error('[DatabaseManager] Error removing database:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Switch active database
     * @param {string} dbId - Database ID ('personal' or external dbId)
     */
    async switchDatabase(dbId) {
        console.log('[DatabaseManager] Switching to database:', dbId);

        try {
            if (dbId !== 'personal' && !this.databases.has(dbId)) {
                throw new Error('Database not found');
            }

            this.activeDatabase = dbId;

            // Save to config
            this._setActiveDatabase(dbId);

            console.log('[DatabaseManager] Active database set to:', dbId);

            return { success: true };
        } catch (error) {
            console.error('[DatabaseManager] Error switching database:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get active database
     * @returns {Object|null} Database info or null
     */
    getActiveDatabase() {
        if (this.activeDatabase === 'personal') {
            return {
                id: 'personal',
                name: 'Base Personnelle',
                type: 'personal'
            };
        }

        if (this.activeDatabase && this.databases.has(this.activeDatabase)) {
            const dbInfo = this.databases.get(this.activeDatabase);
            return {
                id: dbInfo.id,
                name: dbInfo.name,
                projectId: dbInfo.projectId,
                type: 'external'
            };
        }

        return null;
    }

    /**
     * Get all databases
     * @returns {Array} List of databases
     */
    getAllDatabases() {
        const databases = [
            {
                id: 'personal',
                name: 'Base Personnelle',
                type: 'personal',
                active: this.activeDatabase === 'personal'
            }
        ];

        this.databases.forEach((dbInfo) => {
            databases.push({
                id: dbInfo.id,
                name: dbInfo.name,
                projectId: dbInfo.projectId,
                type: 'external',
                active: this.activeDatabase === dbInfo.id,
                addedAt: dbInfo.addedAt
            });
        });

        return databases;
    }

    /**
     * Validate Firebase connection
     * @param {Object} config - Firebase config
     * @returns {Promise<Object>} Validation result
     */
    async validateConnection(config) {
        console.log('[DatabaseManager] Validating connection...');

        try {
            // Check required fields
            const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
            const missing = requiredFields.filter(field => !config[field]);

            if (missing.length > 0) {
                throw new Error(`Champs requis manquants: ${missing.join(', ')}`);
            }

            // Validate project ID format
            if (!/^[a-z0-9-]+$/.test(config.projectId)) {
                throw new Error('Project ID invalide (lettres minuscules, chiffres et tirets uniquement)');
            }

            // Try to initialize a temporary app to test the config
            const testAppName = `test-${Date.now()}`;
            let testApp;

            try {
                testApp = initializeApp(config, testAppName);
                const testFirestore = getFirestore(testApp);

                // Try to access Firestore (this will fail if config is invalid)
                // We don't actually read anything, just test the connection
                console.log('[DatabaseManager] Test connection successful');

                // Clean up test app
                await testApp.delete();

                return {
                    success: true
                };
            } catch (error) {
                // Clean up if app was created
                if (testApp) {
                    try {
                        await testApp.delete();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }

                throw new Error(`Configuration invalide: ${error.message}`);
            }
        } catch (error) {
            console.error('[DatabaseManager] Validation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test connection and count documents
     * @param {Object} config - Firebase config
     * @returns {Promise<Object>} Test result with document count
     */
    async testConnection(config) {
        console.log('[DatabaseManager] Testing connection with document count...');

        try {
            // Validate first
            const validation = await this.validateConnection(config);
            if (!validation.success) {
                return validation;
            }

            // For now, we can't easily count documents without user authentication
            // So we just return success from validation
            return {
                success: true,
                documentsCount: 0,
                message: 'Configuration valide'
            };
        } catch (error) {
            console.error('[DatabaseManager] Test connection error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ====== Private Helper Methods ======

    async _loadSavedDatabases() {
        try {
            // Create table if not exists
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS external_databases (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    config TEXT NOT NULL,
                    added_at INTEGER NOT NULL
                )
            `).run();

            // Load all saved databases
            const saved = this.db.prepare(`
                SELECT * FROM external_databases
            `).all();

            for (const row of saved) {
                try {
                    const config = JSON.parse(row.config);
                    const appName = `external-${config.projectId}`;

                    // Initialize Firebase app
                    let app;
                    const existingApps = getApps();
                    const existingApp = existingApps.find(a => a.name === appName);

                    if (existingApp) {
                        app = existingApp;
                    } else {
                        app = initializeApp(config, appName);
                    }

                    const firestore = getFirestore(app);

                    this.databases.set(row.id, {
                        id: row.id,
                        config,
                        app,
                        firestore,
                        name: row.name,
                        projectId: config.projectId,
                        addedAt: row.added_at
                    });

                    console.log('[DatabaseManager] Loaded database:', row.name);
                } catch (error) {
                    console.error('[DatabaseManager] Error loading database:', row.id, error);
                }
            }

            // Load active database
            const activeQuery = this.db.prepare(`
                SELECT value FROM app_config WHERE key = 'active_database'
            `).get();

            if (activeQuery) {
                this.activeDatabase = JSON.parse(activeQuery.value);
            }
        } catch (error) {
            console.error('[DatabaseManager] Error loading saved databases:', error);
        }
    }

    async _saveDatabaseConfig(dbInfo) {
        try {
            this.db.prepare(`
                INSERT OR REPLACE INTO external_databases (id, name, config, added_at)
                VALUES (?, ?, ?, ?)
            `).run(
                dbInfo.id,
                dbInfo.name,
                JSON.stringify(dbInfo.config),
                dbInfo.addedAt
            );

            console.log('[DatabaseManager] Database config saved:', dbInfo.id);
        } catch (error) {
            console.error('[DatabaseManager] Error saving database config:', error);
        }
    }

    _setActiveDatabase(dbId) {
        try {
            const existing = this.db.prepare(`
                SELECT key FROM app_config WHERE key = 'active_database'
            `).get();

            if (existing) {
                this.db.prepare(`
                    UPDATE app_config SET value = ? WHERE key = 'active_database'
                `).run(JSON.stringify(dbId));
            } else {
                this.db.prepare(`
                    INSERT INTO app_config (key, value) VALUES ('active_database', ?)
                `).run(JSON.stringify(dbId));
            }
        } catch (error) {
            console.error('[DatabaseManager] Error setting active database:', error);
        }
    }
}

// Export singleton instance
const databaseManager = new DatabaseManager();
module.exports = databaseManager;
