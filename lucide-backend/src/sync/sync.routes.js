/**
 * Sync Routes
 * Handles bidirectional synchronization between local SQLite and cloud PostgreSQL
 */

const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/sync/push
 * Push local changes to cloud
 * Client sends all records with sync_state = 'dirty' or 'pending'
 */
router.post('/push', async (req, res) => {
    try {
        const { sessions = [], messages = [], documents = [], presets = [] } = req.body;

        if (!Array.isArray(sessions) || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Invalid sync data format'
            });
        }

        const supabase = getSupabaseClient(req.token);
        const results = {
            sessions: { inserted: 0, updated: 0, failed: 0 },
            messages: { inserted: 0, updated: 0, failed: 0 },
            documents: { inserted: 0, updated: 0, failed: 0 },
            presets: { inserted: 0, updated: 0, failed: 0 }
        };

        // ========================================================================
        // SYNC SESSIONS
        // ========================================================================

        for (const session of sessions) {
            try {
                // Ensure uid matches authenticated user
                session.uid = req.user.id;
                session.sync_state = 'clean';

                // Upsert (insert or update)
                const { error } = await supabase
                    .from('sessions')
                    .upsert(session, { onConflict: 'id' });

                if (error) {
                    console.error(`[Sync] Failed to sync session ${session.id}:`, error);
                    results.sessions.failed++;
                } else {
                    results.sessions.updated++;
                }
            } catch (error) {
                console.error(`[Sync] Error syncing session ${session.id}:`, error);
                results.sessions.failed++;
            }
        }

        // ========================================================================
        // SYNC MESSAGES
        // ========================================================================

        for (const message of messages) {
            try {
                message.sync_state = 'clean';

                // Verify session belongs to user
                const { data: session } = await supabase
                    .from('sessions')
                    .select('uid')
                    .eq('id', message.session_id)
                    .single();

                if (!session || session.uid !== req.user.id) {
                    console.warn(`[Sync] Skipping message ${message.id} - session not found or unauthorized`);
                    results.messages.failed++;
                    continue;
                }

                const { error } = await supabase
                    .from('ai_messages')
                    .upsert(message, { onConflict: 'id' });

                if (error) {
                    console.error(`[Sync] Failed to sync message ${message.id}:`, error);
                    results.messages.failed++;
                } else {
                    results.messages.updated++;
                }
            } catch (error) {
                console.error(`[Sync] Error syncing message ${message.id}:`, error);
                results.messages.failed++;
            }
        }

        // ========================================================================
        // SYNC DOCUMENTS (if provided)
        // ========================================================================

        for (const document of documents) {
            try {
                document.uid = req.user.id;
                document.sync_state = 'clean';

                const { error } = await supabase
                    .from('documents')
                    .upsert(document, { onConflict: 'id' });

                if (error) {
                    console.error(`[Sync] Failed to sync document ${document.id}:`, error);
                    results.documents.failed++;
                } else {
                    results.documents.updated++;
                }
            } catch (error) {
                console.error(`[Sync] Error syncing document ${document.id}:`, error);
                results.documents.failed++;
            }
        }

        // ========================================================================
        // SYNC PROMPT PRESETS (if provided)
        // ========================================================================

        for (const preset of presets) {
            try {
                preset.uid = req.user.id;
                preset.sync_state = 'clean';

                const { error } = await supabase
                    .from('prompt_presets')
                    .upsert(preset, { onConflict: 'id' });

                if (error) {
                    console.error(`[Sync] Failed to sync preset ${preset.id}:`, error);
                    results.presets.failed++;
                } else {
                    results.presets.updated++;
                }
            } catch (error) {
                console.error(`[Sync] Error syncing preset ${preset.id}:`, error);
                results.presets.failed++;
            }
        }

        // Update user's last sync time
        await supabase
            .from('users')
            .update({ last_sync_at: Math.floor(Date.now() / 1000) })
            .eq('uid', req.user.id);

        res.json({
            success: true,
            results,
            synced_at: Date.now()
        });
    } catch (error) {
        console.error('[Sync] Push error:', error);
        res.status(500).json({
            error: 'SyncError',
            message: 'Failed to push changes to cloud'
        });
    }
});

/**
 * GET /api/sync/pull
 * Pull cloud changes to local
 * Returns all records updated after last_sync_time
 */
router.get('/pull', async (req, res) => {
    try {
        const { last_sync_time = 0 } = req.query;
        const lastSyncTimestamp = parseInt(last_sync_time);

        const supabase = getSupabaseClient(req.token);

        // ========================================================================
        // PULL SESSIONS
        // ========================================================================

        let sessionsQuery = supabase
            .from('sessions')
            .select('*')
            .eq('uid', req.user.id);

        if (lastSyncTimestamp > 0) {
            sessionsQuery = sessionsQuery.gt('updated_at', lastSyncTimestamp);
        }

        const { data: sessions, error: sessionsError } = await sessionsQuery;

        if (sessionsError) {
            throw sessionsError;
        }

        // ========================================================================
        // PULL MESSAGES (for updated sessions)
        // ========================================================================

        const sessionIds = sessions.map(s => s.id);
        let messages = [];

        if (sessionIds.length > 0) {
            let messagesQuery = supabase
                .from('ai_messages')
                .select('*')
                .in('session_id', sessionIds);

            if (lastSyncTimestamp > 0) {
                messagesQuery = messagesQuery.gt('created_at', lastSyncTimestamp);
            }

            const { data: messagesData, error: messagesError } = await messagesQuery;

            if (!messagesError) {
                messages = messagesData || [];
            }
        }

        // ========================================================================
        // PULL DOCUMENTS
        // ========================================================================

        let documentsQuery = supabase
            .from('documents')
            .select('*')
            .eq('uid', req.user.id);

        if (lastSyncTimestamp > 0) {
            documentsQuery = documentsQuery.gt('updated_at', lastSyncTimestamp);
        }

        const { data: documents, error: documentsError } = await documentsQuery;

        // ========================================================================
        // PULL PROMPT PRESETS
        // ========================================================================

        let presetsQuery = supabase
            .from('prompt_presets')
            .select('*')
            .eq('uid', req.user.id);

        if (lastSyncTimestamp > 0) {
            presetsQuery = presetsQuery.gt('created_at', lastSyncTimestamp);
        }

        const { data: presets, error: presetsError } = await presetsQuery;

        res.json({
            success: true,
            data: {
                sessions: sessions || [],
                messages: messages || [],
                documents: documents || [],
                presets: presets || []
            },
            synced_at: Date.now(),
            has_more: false // Could implement pagination if needed
        });
    } catch (error) {
        console.error('[Sync] Pull error:', error);
        res.status(500).json({
            error: 'SyncError',
            message: 'Failed to pull changes from cloud'
        });
    }
});

/**
 * POST /api/sync/full
 * Perform full bidirectional sync
 * 1. Push local changes
 * 2. Pull remote changes
 * 3. Return merged state
 */
router.post('/full', async (req, res) => {
    try {
        const {
            last_sync_time = 0,
            local_changes = {
                sessions: [],
                messages: [],
                documents: [],
                presets: []
            }
        } = req.body;

        const supabase = getSupabaseClient(req.token);

        // ========================================================================
        // STEP 1: PUSH LOCAL CHANGES
        // ========================================================================

        const pushResults = {
            sessions: { updated: 0, failed: 0 },
            messages: { updated: 0, failed: 0 },
            documents: { updated: 0, failed: 0 },
            presets: { updated: 0, failed: 0 }
        };

        // Push sessions
        if (local_changes.sessions && local_changes.sessions.length > 0) {
            for (const session of local_changes.sessions) {
                session.uid = req.user.id;
                session.sync_state = 'clean';

                const { error } = await supabase
                    .from('sessions')
                    .upsert(session, { onConflict: 'id' });

                if (error) {
                    pushResults.sessions.failed++;
                } else {
                    pushResults.sessions.updated++;
                }
            }
        }

        // Push messages
        if (local_changes.messages && local_changes.messages.length > 0) {
            for (const message of local_changes.messages) {
                message.sync_state = 'clean';

                const { error } = await supabase
                    .from('ai_messages')
                    .upsert(message, { onConflict: 'id' });

                if (error) {
                    pushResults.messages.failed++;
                } else {
                    pushResults.messages.updated++;
                }
            }
        }

        // ========================================================================
        // STEP 2: PULL REMOTE CHANGES
        // ========================================================================

        const lastSyncTimestamp = parseInt(last_sync_time);

        // Pull sessions
        const { data: remoteSessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('uid', req.user.id)
            .gt('updated_at', lastSyncTimestamp);

        // Pull messages
        const { data: remoteMessages } = await supabase
            .from('ai_messages')
            .select('*')
            .gt('created_at', lastSyncTimestamp);

        // Update last sync time
        await supabase
            .from('users')
            .update({ last_sync_at: Math.floor(Date.now() / 1000) })
            .eq('uid', req.user.id);

        // ========================================================================
        // STEP 3: RETURN RESULTS
        // ========================================================================

        res.json({
            success: true,
            push_results: pushResults,
            pull_data: {
                sessions: remoteSessions || [],
                messages: remoteMessages || [],
                documents: [],
                presets: []
            },
            synced_at: Date.now()
        });
    } catch (error) {
        console.error('[Sync] Full sync error:', error);
        res.status(500).json({
            error: 'SyncError',
            message: 'Failed to perform full sync'
        });
    }
});

/**
 * GET /api/sync/status
 * Get sync status for user
 */
router.get('/status', async (req, res) => {
    try {
        const supabase = getSupabaseClient(req.token);

        const { data: user } = await supabase
            .from('users')
            .select('last_sync_at, updated_at')
            .eq('uid', req.user.id)
            .single();

        res.json({
            user_id: req.user.id,
            last_sync_at: user?.last_sync_at || 0,
            server_time: Math.floor(Date.now() / 1000),
            sync_available: true
        });
    } catch (error) {
        console.error('[Sync] Status error:', error);
        res.status(500).json({
            error: 'SyncError',
            message: 'Failed to get sync status'
        });
    }
});

module.exports = router;
