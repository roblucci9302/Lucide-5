/**
 * Sync Scheduler Service
 *
 * Manages scheduled synchronization of external data sources.
 * Supports: manual, hourly, daily, weekly sync frequencies.
 *
 * @module syncSchedulerService
 */

const sqliteClient = require('./sqliteClient');

console.log('[SyncSchedulerService] Service loaded');

/**
 * Sync frequency intervals in milliseconds
 */
const SYNC_INTERVALS = {
    hourly: 60 * 60 * 1000,           // 1 hour
    daily: 24 * 60 * 60 * 1000,       // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000   // 7 days
};

/**
 * Scheduler check interval (how often to check for due syncs)
 */
const SCHEDULER_CHECK_INTERVAL = 60 * 1000; // 1 minute

class SyncSchedulerService {
    constructor() {
        this.db = null;
        this.schedulerInterval = null;
        this.isRunning = false;
        this.syncInProgress = new Set(); // Track sources currently syncing
        console.log('[SyncSchedulerService] Service initialized');
    }

    /**
     * Initialize the scheduler service
     */
    async initialize() {
        if (!this.db) {
            this.db = sqliteClient.getDb();
        }
        console.log('[SyncSchedulerService] Service ready');
    }

    /**
     * Start the scheduler
     * Should be called on app startup
     */
    async start() {
        if (this.isRunning) {
            console.log('[SyncSchedulerService] Scheduler already running');
            return;
        }

        await this.initialize();

        console.log('[SyncSchedulerService] Starting scheduler...');
        this.isRunning = true;

        // Initial check on startup
        await this._checkAndRunDueSyncs();

        // Setup periodic check
        this.schedulerInterval = setInterval(async () => {
            await this._checkAndRunDueSyncs();
        }, SCHEDULER_CHECK_INTERVAL);

        console.log('[SyncSchedulerService] Scheduler started (checking every 1 minute)');
    }

    /**
     * Stop the scheduler
     * Should be called on app shutdown
     */
    stop() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.isRunning = false;
        console.log('[SyncSchedulerService] Scheduler stopped');
    }

    /**
     * Check for sources that need syncing and run them
     * @private
     */
    async _checkAndRunDueSyncs() {
        if (!this.db) {
            await this.initialize();
        }

        try {
            const now = Date.now();

            // Find sources that are:
            // 1. sync_enabled = 1
            // 2. sync_frequency is not null or 'manual'
            // 3. next_sync_at <= now OR next_sync_at is null (never synced)
            const dueSources = this.db.prepare(`
                SELECT * FROM external_sources
                WHERE sync_enabled = 1
                AND sync_frequency IS NOT NULL
                AND sync_frequency != 'manual'
                AND (next_sync_at IS NULL OR next_sync_at <= ?)
            `).all(now);

            if (dueSources.length === 0) {
                return; // Nothing to sync
            }

            console.log(`[SyncSchedulerService] Found ${dueSources.length} source(s) due for sync`);

            // Process each source
            for (const source of dueSources) {
                // Skip if already syncing
                if (this.syncInProgress.has(source.id)) {
                    console.log(`[SyncSchedulerService] Skipping ${source.source_name} - sync already in progress`);
                    continue;
                }

                // Run sync in background (don't await to allow parallel syncs)
                this._runSync(source).catch(error => {
                    console.error(`[SyncSchedulerService] Sync failed for ${source.source_name}:`, error.message);
                });
            }
        } catch (error) {
            console.error('[SyncSchedulerService] Error checking due syncs:', error.message);
        }
    }

    /**
     * Run sync for a specific source
     * @private
     */
    async _runSync(source) {
        const sourceId = source.id;
        const sourceName = source.source_name;

        // Mark as syncing
        this.syncInProgress.add(sourceId);
        this._updateSyncStatus(sourceId, 'syncing', null);

        console.log(`[SyncSchedulerService] Starting scheduled sync for: ${sourceName}`);

        try {
            // Get the external data service (lazy load to avoid circular dependency)
            const externalDataService = require('./externalDataService');

            // Get mapping config
            const mappingConfig = source.mapping_config
                ? JSON.parse(source.mapping_config)
                : {};

            // Default query based on mapping or a simple select
            const query = mappingConfig.query || this._getDefaultQuery(source.source_type, mappingConfig);

            if (!query) {
                throw new Error('No query configured for scheduled sync');
            }

            // Run the import
            const result = await externalDataService.importFromDatabase(
                sourceId,
                query,
                mappingConfig,
                source.uid
            );

            // Calculate next sync time
            const nextSyncAt = this._calculateNextSyncTime(source.sync_frequency);

            // Update source with success
            this._updateSyncSuccess(sourceId, nextSyncAt, result.indexedCount);

            console.log(`[SyncSchedulerService] Sync completed for ${sourceName}: ${result.indexedCount} records indexed`);

        } catch (error) {
            console.error(`[SyncSchedulerService] Sync error for ${sourceName}:`, error.message);

            // Calculate next sync time even on error (retry later)
            const nextSyncAt = this._calculateNextSyncTime(source.sync_frequency);

            // Update source with error
            this._updateSyncError(sourceId, nextSyncAt, error.message);

        } finally {
            // Remove from in-progress set
            this.syncInProgress.delete(sourceId);
        }
    }

    /**
     * Calculate next sync time based on frequency
     * @private
     */
    _calculateNextSyncTime(frequency) {
        const interval = SYNC_INTERVALS[frequency];
        if (!interval) {
            return null;
        }
        return Date.now() + interval;
    }

    /**
     * Get default query for a source type
     * @private
     */
    _getDefaultQuery(sourceType, mappingConfig) {
        // If table is specified in mapping, create a simple SELECT
        if (mappingConfig.table) {
            const columns = mappingConfig.contentColumns && mappingConfig.contentColumns.length > 0
                ? mappingConfig.contentColumns.join(', ')
                : '*';
            return `SELECT ${columns} FROM ${mappingConfig.table} LIMIT 1000`;
        }
        return null;
    }

    /**
     * Update sync status
     * @private
     */
    _updateSyncStatus(sourceId, status, error) {
        if (!this.db) return;

        const now = Date.now();
        this.db.prepare(`
            UPDATE external_sources
            SET sync_status = ?,
                sync_error = ?,
                updated_at = ?
            WHERE id = ?
        `).run(status, error, now, sourceId);
    }

    /**
     * Update source after successful sync
     * @private
     */
    _updateSyncSuccess(sourceId, nextSyncAt, recordsImported) {
        if (!this.db) return;

        const now = Date.now();
        this.db.prepare(`
            UPDATE external_sources
            SET sync_status = 'success',
                sync_error = NULL,
                last_sync_at = ?,
                next_sync_at = ?,
                documents_imported = documents_imported + ?,
                updated_at = ?
            WHERE id = ?
        `).run(now, nextSyncAt, recordsImported, now, sourceId);
    }

    /**
     * Update source after failed sync
     * @private
     */
    _updateSyncError(sourceId, nextSyncAt, errorMessage) {
        if (!this.db) return;

        const now = Date.now();
        this.db.prepare(`
            UPDATE external_sources
            SET sync_status = 'error',
                sync_error = ?,
                next_sync_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(errorMessage, nextSyncAt, now, sourceId);
    }

    /**
     * Manually trigger sync for a source
     * @param {string} sourceId - Source ID
     * @returns {Promise<object>} Sync result
     */
    async triggerManualSync(sourceId) {
        if (!this.db) {
            await this.initialize();
        }

        const source = this.db.prepare(`
            SELECT * FROM external_sources WHERE id = ?
        `).get(sourceId);

        if (!source) {
            throw new Error('Source not found');
        }

        // Check if already syncing
        if (this.syncInProgress.has(sourceId)) {
            throw new Error('Sync already in progress for this source');
        }

        // Run sync
        await this._runSync(source);

        return { success: true, message: 'Sync completed' };
    }

    /**
     * Get sync status for all sources
     * @param {string} uid - User ID
     * @returns {Array} Sources with sync status
     */
    async getSyncStatus(uid) {
        if (!this.db) {
            await this.initialize();
        }

        const sources = this.db.prepare(`
            SELECT
                id,
                source_name,
                source_type,
                sync_enabled,
                sync_frequency,
                sync_status,
                sync_error,
                last_sync_at,
                next_sync_at,
                documents_imported
            FROM external_sources
            WHERE uid = ?
            ORDER BY source_name ASC
        `).all(uid);

        return sources.map(source => ({
            ...source,
            isCurrentlySyncing: this.syncInProgress.has(source.id),
            lastSyncFormatted: source.last_sync_at
                ? new Date(source.last_sync_at).toISOString()
                : null,
            nextSyncFormatted: source.next_sync_at
                ? new Date(source.next_sync_at).toISOString()
                : null
        }));
    }

    /**
     * Update sync configuration for a source
     * @param {string} sourceId - Source ID
     * @param {object} config - Sync configuration
     */
    async updateSyncConfig(sourceId, config) {
        if (!this.db) {
            await this.initialize();
        }

        const { sync_enabled, sync_frequency, mapping_config } = config;
        const now = Date.now();

        // Calculate next sync time if enabling
        let nextSyncAt = null;
        if (sync_enabled && sync_frequency && sync_frequency !== 'manual') {
            nextSyncAt = this._calculateNextSyncTime(sync_frequency);
        }

        const updates = [];
        const values = [];

        if (sync_enabled !== undefined) {
            updates.push('sync_enabled = ?');
            values.push(sync_enabled ? 1 : 0);
        }

        if (sync_frequency !== undefined) {
            updates.push('sync_frequency = ?');
            values.push(sync_frequency);
        }

        if (mapping_config !== undefined) {
            updates.push('mapping_config = ?');
            values.push(JSON.stringify(mapping_config));
        }

        if (nextSyncAt !== null) {
            updates.push('next_sync_at = ?');
            values.push(nextSyncAt);
        }

        updates.push('updated_at = ?');
        values.push(now);

        values.push(sourceId);

        this.db.prepare(`
            UPDATE external_sources
            SET ${updates.join(', ')}
            WHERE id = ?
        `).run(...values);

        console.log(`[SyncSchedulerService] Updated sync config for source: ${sourceId}`);

        return { success: true };
    }

    /**
     * Check if scheduler is running
     */
    isSchedulerRunning() {
        return this.isRunning;
    }
}

// Singleton instance
const syncSchedulerService = new SyncSchedulerService();

module.exports = syncSchedulerService;
