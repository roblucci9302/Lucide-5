/**
 * Sync Service - Phase 2
 * Bidirectional synchronization between local SQLite and Supabase cloud
 *
 * Features:
 * - Offline-first architecture
 * - Automatic periodic sync (every 30s)
 * - Manual sync on-demand
 * - Conflict resolution (last-write-wins)
 * - Incremental sync (only changed records)
 */

const sqliteClient = require('./sqliteClient');
const fetch = require('node-fetch');

class SyncService {
    constructor() {
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastSyncTime = 0;
        this.isOnline = true;
        this.syncEnabled = false;

        // Configuration
        this.config = {
            apiUrl: process.env.LUCIDE_API_URL || 'http://localhost:3001',
            syncIntervalMs: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelayMs: 2000
        };

        // Stats
        this.stats = {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            lastSyncDuration: 0,
            lastError: null
        };

        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[Sync] Connection restored');
                this.isOnline = true;
                if (this.syncEnabled) {
                    this.performSync();
                }
            });

            window.addEventListener('offline', () => {
                console.log('[Sync] Connection lost - entering offline mode');
                this.isOnline = false;
            });
        }
    }

    /**
     * Initialize and start automatic sync
     * @param {string} userId - User ID
     * @param {string} authToken - JWT access token from Supabase
     */
    async start(userId, authToken) {
        if (!userId || !authToken) {
            console.warn('[Sync] Cannot start sync without userId and authToken');
            return false;
        }

        this.userId = userId;
        this.authToken = authToken;
        this.syncEnabled = true;

        console.log('[Sync] Starting automatic sync for user:', userId);

        // Initial sync
        await this.performSync();

        // Start periodic sync
        this.syncInterval = setInterval(() => {
            if (this.syncEnabled && this.isOnline && !this.isSyncing) {
                this.performSync();
            }
        }, this.config.syncIntervalMs);

        return true;
    }

    /**
     * Stop automatic sync
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        this.syncEnabled = false;
        console.log('[Sync] Automatic sync stopped');
    }

    /**
     * Perform full bidirectional sync
     * @param {boolean} force - Force sync even if already syncing
     */
    async performSync(force = false) {
        if (this.isSyncing && !force) {
            console.log('[Sync] Sync already in progress, skipping...');
            return { success: false, message: 'Sync already in progress' };
        }

        if (!this.isOnline) {
            console.log('[Sync] Offline - sync skipped');
            return { success: false, message: 'Device is offline' };
        }

        if (!this.authToken) {
            console.warn('[Sync] No auth token available');
            return { success: false, message: 'Not authenticated' };
        }

        this.isSyncing = true;
        const startTime = Date.now();
        this.stats.totalSyncs++;

        try {
            console.log('[Sync] Starting bidirectional sync...');

            // Step 1: Push local changes to cloud
            const pushResult = await this.pushLocalChanges();

            // Step 2: Pull remote changes to local
            const pullResult = await this.pullRemoteChanges();

            const duration = Date.now() - startTime;
            this.lastSyncTime = Date.now();
            this.stats.lastSyncDuration = duration;
            this.stats.successfulSyncs++;
            this.stats.lastError = null;

            console.log(`[Sync] ✅ Sync completed in ${duration}ms`, {
                pushed: pushResult.totalPushed,
                pulled: pullResult.totalPulled
            });

            return {
                success: true,
                duration,
                pushed: pushResult,
                pulled: pullResult
            };
        } catch (error) {
            this.stats.failedSyncs++;
            this.stats.lastError = error.message;
            console.error('[Sync] ❌ Sync failed:', error);

            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Push local changes (dirty records) to cloud
     */
    async pushLocalChanges() {
        const db = sqliteClient.getDatabase();

        // Get all dirty/pending sessions
        const dirtySessions = db.prepare(`
            SELECT * FROM sessions
            WHERE sync_state IN ('dirty', 'pending')
        `).all();

        // Get all dirty/pending messages
        const dirtyMessages = db.prepare(`
            SELECT m.* FROM ai_messages m
            WHERE m.sync_state IN ('dirty', 'pending')
        `).all();

        // Get all dirty/pending documents
        const dirtyDocuments = db.prepare(`
            SELECT * FROM documents
            WHERE sync_state IN ('dirty', 'pending')
        `).all();

        // Get all dirty/pending presets
        const dirtyPresets = db.prepare(`
            SELECT * FROM prompt_presets
            WHERE sync_state IN ('dirty', 'pending')
        `).all();

        if (dirtySessions.length === 0 && dirtyMessages.length === 0 &&
            dirtyDocuments.length === 0 && dirtyPresets.length === 0) {
            console.log('[Sync] No local changes to push');
            return { totalPushed: 0 };
        }

        console.log(`[Sync] Pushing ${dirtySessions.length} sessions, ${dirtyMessages.length} messages, ${dirtyDocuments.length} documents, ${dirtyPresets.length} presets`);

        // Parse JSON fields for cloud
        const sessionsForCloud = dirtySessions.map(s => ({
            ...s,
            tags: s.tags ? JSON.parse(s.tags) : []
        }));

        const documentsForCloud = dirtyDocuments.map(d => ({
            ...d,
            tags: d.tags ? JSON.parse(d.tags) : []
        }));

        // Send to cloud
        const response = await fetch(`${this.config.apiUrl}/api/sync/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            },
            body: JSON.stringify({
                sessions: sessionsForCloud,
                messages: dirtyMessages,
                documents: documentsForCloud,
                presets: dirtyPresets
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Push failed: ${error.message || response.statusText}`);
        }

        const result = await response.json();

        // Mark as clean in local DB
        if (dirtySessions.length > 0) {
            db.prepare(`
                UPDATE sessions
                SET sync_state = 'clean'
                WHERE sync_state IN ('dirty', 'pending')
            `).run();
        }

        if (dirtyMessages.length > 0) {
            db.prepare(`
                UPDATE ai_messages
                SET sync_state = 'clean'
                WHERE sync_state IN ('dirty', 'pending')
            `).run();
        }

        if (dirtyDocuments.length > 0) {
            db.prepare(`
                UPDATE documents
                SET sync_state = 'clean'
                WHERE sync_state IN ('dirty', 'pending')
            `).run();
        }

        if (dirtyPresets.length > 0) {
            db.prepare(`
                UPDATE prompt_presets
                SET sync_state = 'clean'
                WHERE sync_state IN ('dirty', 'pending')
            `).run();
        }

        console.log('[Sync] ✅ Push completed:', result.results);

        return {
            totalPushed: dirtySessions.length + dirtyMessages.length + dirtyDocuments.length + dirtyPresets.length,
            details: result.results
        };
    }

    /**
     * Pull remote changes from cloud to local
     */
    async pullRemoteChanges() {
        // Get last sync time from user record
        const db = sqliteClient.getDatabase();
        const user = db.prepare('SELECT last_sync_at FROM users WHERE uid = ?').get(this.userId);
        const lastSyncAt = user?.last_sync_at || 0;

        console.log(`[Sync] Pulling changes since: ${lastSyncAt || 'beginning'}`);

        // Fetch from cloud
        const response = await fetch(
            `${this.config.apiUrl}/api/sync/pull?last_sync_time=${lastSyncAt}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Pull failed: ${error.message || response.statusText}`);
        }

        const { data } = await response.json();
        const { sessions = [], messages = [], documents = [], presets = [] } = data;

        console.log(`[Sync] Received ${sessions.length} sessions, ${messages.length} messages, ${documents.length} documents, ${presets.length} presets`);

        // Upsert into local database
        let totalInserted = 0;

        // Upsert sessions
        const upsertSession = db.prepare(`
            INSERT INTO sessions (
                id, uid, title, session_type, started_at, ended_at,
                tags, description, agent_profile, message_count, auto_title,
                updated_at, created_at, sync_state
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'clean')
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                ended_at = excluded.ended_at,
                tags = excluded.tags,
                description = excluded.description,
                agent_profile = excluded.agent_profile,
                message_count = excluded.message_count,
                auto_title = excluded.auto_title,
                updated_at = excluded.updated_at,
                sync_state = 'clean'
        `);

        for (const session of sessions) {
            upsertSession.run(
                session.id, session.uid, session.title, session.session_type,
                session.started_at, session.ended_at,
                JSON.stringify(session.tags || []), session.description,
                session.agent_profile, session.message_count, session.auto_title,
                session.updated_at, session.created_at
            );
            totalInserted++;
        }

        // Upsert messages
        const upsertMessage = db.prepare(`
            INSERT INTO ai_messages (
                id, session_id, sent_at, role, content, tokens, model,
                created_at, sync_state
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'clean')
            ON CONFLICT(id) DO UPDATE SET
                content = excluded.content,
                tokens = excluded.tokens,
                model = excluded.model,
                sync_state = 'clean'
        `);

        for (const message of messages) {
            upsertMessage.run(
                message.id, message.session_id, message.sent_at, message.role,
                message.content, message.tokens, message.model, message.created_at
            );
            totalInserted++;
        }

        // Update last sync time
        db.prepare(`
            UPDATE users
            SET last_sync_at = ?
            WHERE uid = ?
        `).run(Math.floor(Date.now() / 1000), this.userId);

        console.log(`[Sync] ✅ Pull completed: ${totalInserted} records synced`);

        return {
            totalPulled: totalInserted,
            details: {
                sessions: sessions.length,
                messages: messages.length,
                documents: documents.length,
                presets: presets.length
            }
        };
    }

    /**
     * Get sync statistics
     */
    getStats() {
        return {
            ...this.stats,
            isEnabled: this.syncEnabled,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            lastSyncAgo: this.lastSyncTime ? Date.now() - this.lastSyncTime : null
        };
    }

    /**
     * Manual sync trigger
     */
    async syncNow() {
        return await this.performSync(true);
    }

    /**
     * Update auth token (when token is refreshed)
     */
    updateAuthToken(newToken) {
        this.authToken = newToken;
        console.log('[Sync] Auth token updated');
    }
}

// Singleton instance
const syncService = new SyncService();

module.exports = syncService;
