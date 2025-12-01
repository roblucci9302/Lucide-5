/**
 * Authentication Middleware
 * Verifies Supabase JWT tokens and attaches user context to requests
 */

const { supabase } = require('../config/supabase');

/**
 * Verify JWT token and attach user to request
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid or expired token'
            });
        }

        // Attach user to request
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        console.error('[Auth Middleware] Error:', error);
        return res.status(500).json({
            error: 'AuthenticationError',
            message: 'Failed to authenticate token'
        });
    }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                req.user = user;
                req.token = token;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
}

module.exports = {
    authenticateToken,
    optionalAuth
};
