/**
 * Authentication Routes
 * Handles user signup, login, logout, and token management
 */

const express = require('express');
const router = express.Router();
const validator = require('validator');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth.middleware');

// Sanitize display name to prevent XSS
function sanitizeDisplayName(name) {
    if (!name || typeof name !== 'string') return null;
    return validator.escape(validator.trim(name)).substring(0, 100);
}

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Email and password are required'
            });
        }

        // Sanitize display name
        const safeDisplayName = sanitizeDisplayName(displayName) || email.split('@')[0];

        // Create user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: safeDisplayName
                }
            }
        });

        if (error) {
            return res.status(400).json({
                error: 'SignupError',
                message: error.message
            });
        }

        // FIX ERR-1: Insert user record into users table with proper error handling
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                uid: data.user.id,
                email: email,
                display_name: safeDisplayName,
                subscription_tier: 'starter' // Default tier
            });

        if (insertError) {
            console.error('[Auth] Failed to create user record:', insertError);
            // Rollback: Delete the auth user since we couldn't create the profile
            try {
                await supabase.auth.admin.deleteUser(data.user.id);
                console.log('[Auth] Rolled back auth user creation due to DB error');
            } catch (rollbackError) {
                console.error('[Auth] Failed to rollback auth user:', rollbackError);
            }
            return res.status(500).json({
                error: 'SignupError',
                message: 'Failed to create user profile. Please try again.'
            });
        }

        res.status(201).json({
            user: {
                id: data.user.id,
                email: data.user.email,
                displayName: safeDisplayName
            },
            session: data.session
        });
    } catch (error) {
        console.error('[Auth] Signup error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to create account'
        });
    }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Email and password are required'
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                error: 'LoginError',
                message: error.message
            });
        }

        res.json({
            user: {
                id: data.user.id,
                email: data.user.email
            },
            session: data.session,
            accessToken: data.session.access_token
        });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to login'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({
                error: 'LogoutError',
                message: error.message
            });
        }

        res.json({
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to logout'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Refresh token is required'
            });
        }

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
        });

        if (error) {
            return res.status(401).json({
                error: 'RefreshError',
                message: error.message
            });
        }

        res.json({
            session: data.session,
            accessToken: data.session.access_token
        });
    } catch (error) {
        console.error('[Auth] Refresh error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to refresh token'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('uid', req.user.id)
            .single();

        if (error) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'User not found'
            });
        }

        res.json({
            user: data
        });
    } catch (error) {
        console.error('[Auth] Get user error:', error);
        res.status(500).json({
            error: 'ServerError',
            message: 'Failed to get user info'
        });
    }
});

module.exports = router;
