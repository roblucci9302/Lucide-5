/**
 * Action Executor Service
 *
 * Executes actions parsed from AI responses.
 * Integrates with existing services for emails, tasks, profiles.
 */

const { clipboard } = require('electron');

class ActionExecutor {
    constructor() {
        // Services will be lazy-loaded to avoid circular dependencies
        this._emailService = null;
        this._taskRepository = null;
        this._profileService = null;
        this._windowManager = null;
        this._externalDataService = null;
    }

    /**
     * Lazy load email service
     * @private
     */
    _getEmailService() {
        if (!this._emailService) {
            try {
                this._emailService = require('../../listen/postCall/emailGenerationService');
            } catch (e) {
                console.warn('[ActionExecutor] Email service not available:', e.message);
            }
        }
        return this._emailService;
    }

    /**
     * Lazy load task repository
     * @private
     */
    _getTaskRepository() {
        if (!this._taskRepository) {
            try {
                this._taskRepository = require('../../listen/postCall/repositories/meetingTasks.sqlite.repository');
            } catch (e) {
                console.warn('[ActionExecutor] Task repository not available:', e.message);
            }
        }
        return this._taskRepository;
    }

    /**
     * Lazy load profile service
     * @private
     */
    _getProfileService() {
        if (!this._profileService) {
            try {
                this._profileService = require('./agentProfileService');
            } catch (e) {
                console.warn('[ActionExecutor] Profile service not available:', e.message);
            }
        }
        return this._profileService;
    }

    /**
     * Lazy load window manager
     * @private
     */
    _getWindowManager() {
        if (!this._windowManager) {
            try {
                this._windowManager = require('../../../window/windowManager');
            } catch (e) {
                console.warn('[ActionExecutor] Window manager not available:', e.message);
            }
        }
        return this._windowManager;
    }

    /**
     * Lazy load external data service
     * @private
     */
    _getExternalDataService() {
        if (!this._externalDataService) {
            try {
                this._externalDataService = require('./externalDataService');
            } catch (e) {
                console.warn('[ActionExecutor] External data service not available:', e.message);
            }
        }
        return this._externalDataService;
    }

    /**
     * Execute a single action
     * @param {Object} action - Action object from actionParser
     * @param {Object} context - Execution context (userId, sessionId, etc.)
     * @returns {Promise<Object>} - Execution result
     */
    async execute(action, context = {}) {
        if (!action || !action.type) {
            return { success: false, error: 'Invalid action' };
        }

        console.log(`[ActionExecutor] Executing action: ${action.type}`, action.id);

        try {
            switch (action.type) {
                case 'email':
                    return await this._executeEmail(action, context);
                case 'task':
                    return await this._executeTask(action, context);
                case 'profile_switch':
                    return await this._executeProfileSwitch(action, context);
                case 'upload_request':
                    return await this._executeUploadRequest(action, context);
                case 'database_query':
                    return await this._executeQuery(action, context);
                default:
                    return { success: false, error: `Unknown action type: ${action.type}` };
            }
        } catch (error) {
            console.error(`[ActionExecutor] Error executing ${action.type}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute multiple actions
     * @param {Array<Object>} actions - Array of action objects
     * @param {Object} context - Execution context
     * @returns {Promise<Array<Object>>} - Array of execution results
     */
    async executeAll(actions, context = {}) {
        if (!actions || !Array.isArray(actions)) {
            return [];
        }

        const results = [];
        for (const action of actions) {
            const result = await this.execute(action, context);
            results.push({
                actionId: action.id,
                actionType: action.type,
                ...result
            });
        }

        console.log(`[ActionExecutor] Executed ${results.length} actions,`,
            `${results.filter(r => r.success).length} successful`);

        return results;
    }

    /**
     * Execute email action
     * @private
     */
    async _executeEmail(action, context) {
        const { data } = action;

        // Store email data for UI to display
        const emailData = {
            id: action.id,
            to: data.to,
            cc: data.cc,
            subject: data.subject,
            body: data.body,
            bodyHtml: data.bodyHtml,
            generatedAt: action.timestamp,
            sessionId: context.sessionId,
            source: 'ai_action'
        };

        // Copy to clipboard for easy use
        try {
            const emailText = `Sujet: ${data.subject}\n\n${data.body}`;
            clipboard.writeText(emailText);
            console.log('[ActionExecutor] Email copied to clipboard');
        } catch (e) {
            console.warn('[ActionExecutor] Could not copy to clipboard:', e.message);
        }

        // Emit event for UI to display email preview
        const windowManager = this._getWindowManager();
        if (windowManager) {
            const askWindow = windowManager.getWindowPool?.()?.get('ask');
            if (askWindow && !askWindow.isDestroyed()) {
                askWindow.webContents.send('action:email-generated', emailData);
            }
        }

        return {
            success: true,
            emailId: action.id,
            emailData,
            message: 'Email généré et copié dans le presse-papier'
        };
    }

    /**
     * Execute task action
     * @private
     */
    async _executeTask(action, context) {
        const { data } = action;
        const taskRepository = this._getTaskRepository();

        if (!taskRepository) {
            // If repository not available, just return the task data for UI display
            return {
                success: true,
                taskId: action.id,
                taskData: data,
                stored: false,
                message: 'Tâche créée (affichage uniquement)'
            };
        }

        try {
            // Create task in database
            const taskData = {
                id: action.id,
                session_id: context.sessionId || 'ai_generated',
                uid: context.userId || 'default_user',
                task_description: data.task_description,
                assigned_to: data.assigned_to,
                deadline: data.deadline,
                priority: data.priority,
                status: 'pending',
                context: 'Créé automatiquement par l\'IA',
                created_at: Date.now(),
                updated_at: Date.now()
            };

            await taskRepository.create(taskData);

            // Emit event for UI
            const windowManager = this._getWindowManager();
            if (windowManager) {
                const askWindow = windowManager.getWindowPool?.()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('action:task-created', taskData);
                }
            }

            return {
                success: true,
                taskId: action.id,
                taskData,
                stored: true,
                message: 'Tâche créée et enregistrée'
            };
        } catch (error) {
            console.error('[ActionExecutor] Failed to store task:', error);
            return {
                success: true,
                taskId: action.id,
                taskData: data,
                stored: false,
                message: 'Tâche créée (non enregistrée: ' + error.message + ')'
            };
        }
    }

    /**
     * Execute profile switch action
     * @private
     */
    async _executeProfileSwitch(action, context) {
        const { data } = action;
        const profileService = this._getProfileService();

        if (!profileService) {
            return {
                success: false,
                error: 'Profile service not available'
            };
        }

        try {
            const userId = context.userId || 'default_user';
            await profileService.setActiveProfile(userId, data.profileId);

            // Emit event for UI to update
            const windowManager = this._getWindowManager();
            if (windowManager) {
                const askWindow = windowManager.getWindowPool?.()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('action:profile-switched', {
                        profileId: data.profileId,
                        reason: data.reason
                    });
                }

                // Also update settings window if open
                const settingsWindow = windowManager.getWindowPool?.()?.get('settings');
                if (settingsWindow && !settingsWindow.isDestroyed()) {
                    settingsWindow.webContents.send('action:profile-switched', {
                        profileId: data.profileId
                    });
                }
            }

            return {
                success: true,
                profileId: data.profileId,
                message: `Profil changé vers: ${data.profileId}`
            };
        } catch (error) {
            console.error('[ActionExecutor] Failed to switch profile:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute upload request action
     * @private
     */
    async _executeUploadRequest(action, context) {
        const { data } = action;

        // Emit event for UI to show upload dialog
        const windowManager = this._getWindowManager();
        if (windowManager) {
            const askWindow = windowManager.getWindowPool?.()?.get('ask');
            if (askWindow && !askWindow.isDestroyed()) {
                askWindow.webContents.send('action:upload-requested', {
                    requestId: action.id,
                    description: data.description,
                    fileTypes: data.fileTypes,
                    timestamp: action.timestamp
                });
            }
        }

        return {
            success: true,
            requestId: action.id,
            description: data.description,
            message: 'Demande de fichier envoyée à l\'interface'
        };
    }

    /**
     * Execute database query action
     * @private
     */
    async _executeQuery(action, context) {
        const { data } = action;
        const externalDataService = this._getExternalDataService();

        if (!externalDataService) {
            return {
                success: false,
                error: 'Service de données externes non disponible'
            };
        }

        try {
            const userId = context.userId || 'default_user';

            // Get the source configuration
            const sources = await externalDataService.getExternalSources(userId);
            const source = sources.find(s => s.name.toLowerCase() === data.sourceName.toLowerCase());

            if (!source) {
                return {
                    success: false,
                    error: `Source "${data.sourceName}" non trouvée. Sources disponibles: ${sources.map(s => s.name).join(', ')}`
                };
            }

            console.log(`[ActionExecutor] Executing query on source: ${source.name} (${source.type})`);

            // Execute the query based on source type
            let results;
            switch (source.type) {
                case 'postgresql':
                    results = await externalDataService.queryPostgres(userId, source.id, data.query);
                    break;
                case 'mysql':
                    results = await externalDataService.queryMySQL(userId, source.id, data.query);
                    break;
                case 'mongodb':
                    // Parse JSON filter for MongoDB
                    const mongoFilter = this._parseMongoFilter(data.query);
                    results = await externalDataService.queryMongoDB(userId, source.id, mongoFilter);
                    break;
                case 'notion':
                    const notionFilter = this._parseNotionFilter(data.query);
                    results = await externalDataService.queryNotion(userId, source.id, notionFilter);
                    break;
                case 'airtable':
                    results = await externalDataService.queryAirtable(userId, source.id, { filterByFormula: data.query });
                    break;
                case 'rest_api':
                    results = await externalDataService.queryRestAPI(userId, source.id, this._parseRestRequest(data.query));
                    break;
                default:
                    return {
                        success: false,
                        error: `Type de source non supporté: ${source.type}`
                    };
            }

            // Format results for display
            const formattedResults = this._formatQueryResults(results, source.type);

            // Emit event for UI to display results
            const windowManager = this._getWindowManager();
            if (windowManager) {
                const askWindow = windowManager.getWindowPool?.()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('action:query-results', {
                        queryId: action.id,
                        sourceName: data.sourceName,
                        sourceType: source.type,
                        results: formattedResults,
                        rowCount: Array.isArray(results) ? results.length : 1,
                        timestamp: action.timestamp
                    });
                }
            }

            return {
                success: true,
                queryId: action.id,
                sourceName: data.sourceName,
                sourceType: source.type,
                results: formattedResults,
                rowCount: Array.isArray(results) ? results.length : 1,
                message: `Requête exécutée sur ${source.name}: ${Array.isArray(results) ? results.length : 1} résultat(s)`
            };
        } catch (error) {
            console.error('[ActionExecutor] Query execution failed:', error);
            return {
                success: false,
                error: `Erreur lors de l'exécution: ${error.message}`
            };
        }
    }

    /**
     * Parse MongoDB filter from query string
     * @private
     */
    _parseMongoFilter(query) {
        try {
            // Try to parse as JSON
            return JSON.parse(query);
        } catch {
            // If not valid JSON, try to convert simple key:value format
            const filter = {};
            const parts = query.split(',').map(p => p.trim());
            for (const part of parts) {
                const [key, value] = part.split(':').map(s => s.trim());
                if (key && value) {
                    filter[key] = value;
                }
            }
            return filter;
        }
    }

    /**
     * Parse Notion filter from query string
     * @private
     */
    _parseNotionFilter(query) {
        try {
            return JSON.parse(query);
        } catch {
            // Simple text search
            return { query: query };
        }
    }

    /**
     * Parse REST API request from query string
     * @private
     */
    _parseRestRequest(query) {
        const lines = query.trim().split('\n');
        const firstLine = lines[0].trim().toUpperCase();

        // Parse method and path
        let method = 'GET';
        let path = '/';
        if (firstLine.startsWith('GET ') || firstLine.startsWith('POST ') ||
            firstLine.startsWith('PUT ') || firstLine.startsWith('DELETE ')) {
            const parts = firstLine.split(' ');
            method = parts[0];
            path = parts[1] || '/';
        } else {
            path = firstLine;
        }

        // Parse body if present (for POST/PUT)
        let body = null;
        if (lines.length > 1) {
            const bodyText = lines.slice(1).join('\n').trim();
            try {
                body = JSON.parse(bodyText);
            } catch {
                body = bodyText;
            }
        }

        return { method, path, body };
    }

    /**
     * Format query results for display
     * @private
     */
    _formatQueryResults(results, sourceType) {
        if (!results) return [];

        // Ensure results is an array
        const rows = Array.isArray(results) ? results : [results];

        // Limit to 50 rows for display
        const limitedRows = rows.slice(0, 50);

        // Format based on source type
        return limitedRows.map(row => {
            if (typeof row !== 'object') return { value: row };

            // Clean up the row for display
            const cleaned = {};
            for (const [key, value] of Object.entries(row)) {
                // Skip internal fields
                if (key.startsWith('_') && key !== '_id') continue;

                // Format value
                if (value === null) {
                    cleaned[key] = 'null';
                } else if (typeof value === 'object') {
                    cleaned[key] = JSON.stringify(value);
                } else {
                    cleaned[key] = String(value);
                }
            }
            return cleaned;
        });
    }

    /**
     * Get execution status message for display
     * @param {Object} result - Execution result
     * @returns {string}
     */
    getStatusMessage(result) {
        if (!result) return '';

        const icons = {
            email: '📧',
            task: '✅',
            profile_switch: '🔄',
            upload_request: '📁',
            database_query: '🔍'
        };

        const icon = icons[result.actionType] || '⚡';
        const status = result.success ? '✓' : '✗';

        return `${icon} ${status} ${result.message || result.error || 'Action exécutée'}`;
    }
}

// Export singleton instance
module.exports = new ActionExecutor();
