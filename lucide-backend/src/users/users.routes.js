/**
 * Users Routes
 * Handles user profile management and settings
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin, getSupabaseClient } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/users/:uid
 * Get user profile
 */
router.get('/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        // Security: Users can only access their own profile
        if (uid !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Cannot access other users\' profiles'
            });
        }

        const supabase = getSupabaseClient(req.token);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('uid', uid)
            .single();

        if (error) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'User not found'
            });
        }

        res.json({ user: data });
    } catch (error) {
        console.error('[Users] Get user error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to get user'
        });
    }
});

/**
 * PATCH /api/users/:uid
 * Update user profile
 */
router.patch('/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;

        // Security: Users can only update their own profile
        if (uid !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Cannot update other users\' profiles'
            });
        }

        // Filter allowed fields
        const allowedFields = [
            'display_name',
            'active_agent_profile',
            'auto_update_enabled'
        ];

        const filteredUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'No valid fields to update'
            });
        }

        const supabase = getSupabaseClient(req.token);
        const { data, error } = await supabase
            .from('users')
            .update(filteredUpdates)
            .eq('uid', uid)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                error: 'UpdateError',
                message: error.message
            });
        }

        res.json({ user: data });
    } catch (error) {
        console.error('[Users] Update user error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to update user'
        });
    }
});

/**
 * GET /api/users/:uid/stats
 * Get user statistics (sessions, messages, documents)
 */
router.get('/:uid/stats', async (req, res) => {
    try {
        const { uid } = req.params;

        if (uid !== req.user.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Cannot access other users\' statistics'
            });
        }

        const supabase = getSupabaseClient(req.token);

        // Get sessions count
        const { count: sessionsCount } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('uid', uid);

        // Get messages count
        const { count: messagesCount } = await supabase
            .from('ai_messages')
            .select('id', { count: 'exact', head: true })
            .in('session_id',
                supabase.from('sessions').select('id').eq('uid', uid)
            );

        // Get documents count
        const { count: documentsCount } = await supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('uid', uid);

        res.json({
            stats: {
                total_sessions: sessionsCount || 0,
                total_messages: messagesCount || 0,
                total_documents: documentsCount || 0,
                last_sync_at: Date.now()
            }
        });
    } catch (error) {
        console.error('[Users] Get stats error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to get statistics'
        });
    }
});

module.exports = router;
