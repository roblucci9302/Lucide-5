/**
 * Structured Logger
 *
 * Provides consistent logging across the application with log levels.
 * Supports DEBUG, INFO, WARN, ERROR levels.
 */

/**
 * Log levels
 */
const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

/**
 * Get log level from environment or default to INFO
 */
function getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    return LogLevel[envLevel] !== undefined ? LogLevel[envLevel] : LogLevel.INFO;
}

/**
 * Format timestamp
 */
function formatTimestamp() {
    return new Date().toISOString();
}

/**
 * Colorize log level for console output
 */
function colorizeLevel(level) {
    const colors = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m',  // Green
        WARN: '\x1b[33m',  // Yellow
        ERROR: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';
    return `${colors[level]}${level}${reset}`;
}

/**
 * Logger class
 */
class Logger {
    constructor(context) {
        this.context = context;
        this.currentLevel = getLogLevel();
    }

    /**
     * Check if should log at level
     */
    shouldLog(level) {
        return LogLevel[level] >= this.currentLevel;
    }

    /**
     * Format log message
     */
    formatMessage(level, message, data = null) {
        const timestamp = formatTimestamp();
        const contextStr = this.context ? `[${this.context}]` : '';

        if (data) {
            return `${timestamp} ${colorizeLevel(level)} ${contextStr} ${message} ${JSON.stringify(data)}`;
        }
        return `${timestamp} ${colorizeLevel(level)} ${contextStr} ${message}`;
    }

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {Object} data - Optional data to log
     */
    debug(message, data = null) {
        if (this.shouldLog('DEBUG')) {
            console.log(this.formatMessage('DEBUG', message, data));
        }
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} data - Optional data to log
     */
    info(message, data = null) {
        if (this.shouldLog('INFO')) {
            console.log(this.formatMessage('INFO', message, data));
        }
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {Object} data - Optional data to log
     */
    warn(message, data = null) {
        if (this.shouldLog('WARN')) {
            console.warn(this.formatMessage('WARN', message, data));
        }
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Error|Object} error - Error object or data
     */
    error(message, error = null) {
        if (this.shouldLog('ERROR')) {
            if (error instanceof Error) {
                console.error(this.formatMessage('ERROR', message, {
                    message: error.message,
                    stack: error.stack
                }));
            } else {
                console.error(this.formatMessage('ERROR', message, error));
            }
        }
    }

    /**
     * Create child logger with extended context
     * @param {string} childContext - Additional context
     * @returns {Logger} New logger instance
     */
    child(childContext) {
        const newContext = this.context ? `${this.context}:${childContext}` : childContext;
        return new Logger(newContext);
    }

    /**
     * Set log level dynamically
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
     */
    setLevel(level) {
        const upperLevel = level.toUpperCase();
        if (LogLevel[upperLevel] !== undefined) {
            this.currentLevel = LogLevel[upperLevel];
            this.info(`Log level changed to ${upperLevel}`);
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }
}

/**
 * Create a logger for a specific context
 * @param {string} context - Context name (e.g., 'DocumentService', 'RAGService')
 * @returns {Logger} Logger instance
 */
function createLogger(context) {
    return new Logger(context);
}

/**
 * Default logger (no context)
 */
const defaultLogger = new Logger(null);

module.exports = {
    Logger,
    createLogger,
    defaultLogger,
    LogLevel
};
