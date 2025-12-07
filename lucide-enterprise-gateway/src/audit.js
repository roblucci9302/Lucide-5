/**
 * Audit Logger
 * Logs all database access for compliance and security
 */

const fs = require('fs');
const path = require('path');

class AuditLogger {
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled !== false,
            logLevel: config.logLevel || 'info',
            logToFile: config.logToFile || false,
            logFilePath: config.logFilePath || path.join(process.cwd(), 'logs', 'audit.log')
        };

        // Create logs directory if logging to file
        if (this.config.logToFile) {
            const logDir = path.dirname(this.config.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }

    /**
     * Log an audit event
     * @param {string} level - Log level (info, warn, error)
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    log(level, message, metadata = {}) {
        if (!this.config.enabled) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...metadata
        };

        // Console log
        const formattedLog = this.formatLogEntry(logEntry);
        switch (level) {
            case 'error':
                console.error(formattedLog);
                break;
            case 'warn':
                console.warn(formattedLog);
                break;
            default:
                console.log(formattedLog);
        }

        // File log
        if (this.config.logToFile) {
            this.writeToFile(logEntry);
        }
    }

    /**
     * Format log entry for console
     */
    formatLogEntry(entry) {
        const { timestamp, level, message, ...metadata } = entry;
        const levelIcon = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        }[level] || 'ℹ️';

        let formatted = `${levelIcon} [${timestamp}] ${message}`;

        if (Object.keys(metadata).length > 0) {
            formatted += '\n  ' + JSON.stringify(metadata, null, 2).replace(/\n/g, '\n  ');
        }

        return formatted;
    }

    /**
     * Write log entry to file
     */
    writeToFile(entry) {
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.config.logFilePath, logLine, 'utf8');
        } catch (error) {
            console.error('[Audit] Failed to write to log file:', error);
        }
    }

    /**
     * Query logs (read from file)
     * @param {Object} filters - Filter criteria
     * @returns {Array} Log entries
     */
    queryLogs(filters = {}) {
        if (!this.config.logToFile) {
            return [];
        }

        try {
            const logContent = fs.readFileSync(this.config.logFilePath, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());

            let logs = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);

            // Apply filters
            if (filters.user) {
                logs = logs.filter(log => log.user === filters.user);
            }

            if (filters.database) {
                logs = logs.filter(log => log.database === filters.database);
            }

            if (filters.level) {
                logs = logs.filter(log => log.level === filters.level);
            }

            if (filters.since) {
                const sinceDate = new Date(filters.since);
                logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
            }

            if (filters.limit) {
                logs = logs.slice(-filters.limit);
            }

            return logs;
        } catch (error) {
            console.error('[Audit] Failed to query logs:', error);
            return [];
        }
    }

    /**
     * Get statistics from logs
     */
    getStats(filters = {}) {
        const logs = this.queryLogs(filters);

        const stats = {
            total: logs.length,
            byLevel: {},
            byUser: {},
            byDatabase: {},
            errors: [],
            recentActivity: logs.slice(-10)
        };

        for (const log of logs) {
            // Count by level
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

            // Count by user
            if (log.user) {
                stats.byUser[log.user] = (stats.byUser[log.user] || 0) + 1;
            }

            // Count by database
            if (log.database) {
                stats.byDatabase[log.database] = (stats.byDatabase[log.database] || 0) + 1;
            }

            // Collect errors
            if (log.level === 'error') {
                stats.errors.push(log);
            }
        }

        return stats;
    }
}

module.exports = AuditLogger;
