/**
 * Sessions Routes
 * Handles conversation sessions and messages
 */

const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/sessions
 * Get all sessions for authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const {
            limit = 50,
            offset = 0,
            sortBy = 'updated_at',
            order = 'desc',
            updated_after
        } = req.query;

        const supabase = getSupabaseClient(req.token);
        let query = supabase
            .from('sessions')
            .select('*', { count: 'exact' })
            .eq('uid', req.user.id);

        // Filter by updated_after (for incremental sync)
        if (updated_after) {
            query = query.gt('updated_at', parseInt(updated_after));
        }

        // Sorting
        const validSortColumns = ['updated_at', 'started_at', 'title', 'created_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updated_at';
        const sortOrder = order.toLowerCase() === 'asc' ? { ascending: true } : { ascending: false };

        query = query.order(sortColumn, sortOrder);

        // Pagination
        query = query.range(
            parseInt(offset),
            parseInt(offset) + parseInt(limit) - 1
        );

        const { data, error, count } = await query;

        if (error) {
            return res.status(400).json({
                error: 'QueryError',
                message: error.message
            });
        }

        res.json({
            sessions: data || [],
            pagination: {
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: count > (parseInt(offset) + parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[Sessions] Get sessions error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to get sessions'
        });
    }
});

/**
 * GET /api/sessions/:id
 * Get specific session with messages
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { include_messages = 'true' } = req.query;

        const supabase = getSupabaseClient(req.token);

        // Get session
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', id)
            .eq('uid', req.user.id)
            .single();

        if (sessionError || !session) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Session not found'
            });
        }

        let messages = [];
        if (include_messages === 'true') {
            const { data: messagesData, error: messagesError } = await supabase
                .from('ai_messages')
                .select('*')
                .eq('session_id', id)
                .order('created_at', { ascending: true });

            if (!messagesError) {
                messages = messagesData || [];
            }
        }

        res.json({
            session,
            messages
        });
    } catch (error) {
        console.error('[Sessions] Get session error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to get session'
        });
    }
});

/**
 * POST /api/sessions
 * Create new session
 */
router.post('/', async (req, res) => {
    try {
        const { session } = req.body;

        if (!session || !session.id) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Session data with ID is required'
            });
        }

        // Ensure uid matches authenticated user
        session.uid = req.user.id;

        const supabase = getSupabaseClient(req.token);
        const { data, error } = await supabase
            .from('sessions')
            .insert(session)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                error: 'InsertError',
                message: error.message
            });
        }

        res.status(201).json({ session: data });
    } catch (error) {
        console.error('[Sessions] Create session error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to create session'
        });
    }
});

/**
 * PATCH /api/sessions/:id
 * Update session
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;

        if (!updates) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Updates are required'
            });
        }

        // Don't allow updating uid or id
        delete updates.uid;
        delete updates.id;

        const supabase = getSupabaseClient(req.token);
        const { data, error } = await supabase
            .from('sessions')
            .update(updates)
            .eq('id', id)
            .eq('uid', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                error: 'UpdateError',
                message: error.message
            });
        }

        res.json({ session: data });
    } catch (error) {
        console.error('[Sessions] Update session error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to update session'
        });
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete session
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const supabase = getSupabaseClient(req.token);
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id)
            .eq('uid', req.user.id);

        if (error) {
            return res.status(400).json({
                error: 'DeleteError',
                message: error.message
            });
        }

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('[Sessions] Delete session error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to delete session'
        });
    }
});

/**
 * GET /api/sessions/:id/messages
 * Get messages for a session
 */
router.get('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;

        const supabase = getSupabaseClient(req.token);

        // Verify session belongs to user
        const { data: session } = await supabase
            .from('sessions')
            .select('uid')
            .eq('id', id)
            .single();

        if (!session || session.uid !== req.user.id) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Session not found'
            });
        }

        // Get messages
        const { data: messages, error } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(400).json({
                error: 'QueryError',
                message: error.message
            });
        }

        res.json({ messages: messages || [] });
    } catch (error) {
        console.error('[Sessions] Get messages error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to get messages'
        });
    }
});

/**
 * POST /api/sessions/:id/messages
 * Add message to session
 */
router.post('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Message data is required'
            });
        }

        message.session_id = id;

        const supabase = getSupabaseClient(req.token);

        // Verify session belongs to user
        const { data: session } = await supabase
            .from('sessions')
            .select('uid')
            .eq('id', id)
            .single();

        if (!session || session.uid !== req.user.id) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Session not found'
            });
        }

        // Insert message
        const { data, error } = await supabase
            .from('ai_messages')
            .insert(message)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                error: 'InsertError',
                message: error.message
            });
        }

        res.status(201).json({ message: data });
    } catch (error) {
        console.error('[Sessions] Add message error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to add message'
        });
    }
});

module.exports = router;
