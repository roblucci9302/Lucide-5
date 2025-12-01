/**
 * Lucide Backend Server
 * Express API for cloud sync and multi-device support
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://localhost:8080'];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// API version info
app.get('/api', (req, res) => {
    res.json({
        name: 'Lucide Backend API',
        version: process.env.API_VERSION || 'v1',
        description: 'Cloud sync and multi-device support for Lucide SaaS',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            sessions: '/api/sessions',
            sync: '/api/sync'
        }
    });
});

// Import routes
const authRoutes = require('./auth/auth.routes');
const userRoutes = require('./users/users.routes');
const sessionRoutes = require('./sessions/sessions.routes');
const syncRoutes = require('./sync/sync.routes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/sync', syncRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        timestamp: Date.now()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err);

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(err.status || 500).json({
        error: err.name || 'ServerError',
        message,
        timestamp: Date.now(),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3001;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log('═'.repeat(60));
        console.log('🚀 Lucide Backend Server');
        console.log('═'.repeat(60));
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Port: ${PORT}`);
        console.log(`API Version: ${process.env.API_VERSION || 'v1'}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`API docs: http://localhost:${PORT}/api`);
        console.log('═'.repeat(60));
    });
}

module.exports = app;
