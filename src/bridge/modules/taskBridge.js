/**
 * Task Bridge - IPC handlers for advanced task management
 */
const { ipcMain } = require('electron');
const taskManagementService = require('../../features/listen/postCall/taskManagementService');
const followUpSuggestionsService = require('../../features/listen/postCall/followUpSuggestionsService');
const { meetingTasksRepository } = require('../../features/listen/postCall/repositories');

module.exports = {
    initialize() {
        console.log('[TaskBridge] Initializing IPC handlers...');

        /**
         * Auto-assign emails to tasks from participants
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Assignment result
         */
        ipcMain.handle('tasks:auto-assign-emails', async (event, sessionId) => {
            try {
                console.log(`[TaskBridge] Auto-assigning emails for session ${sessionId}`);

                const result = await taskManagementService.autoAssignEmails(sessionId);

                return {
                    success: true,
                    ...result
                };
            } catch (error) {
                console.error('[TaskBridge] Error auto-assigning emails:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Update task
         * @param {string} taskId - Task ID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('tasks:update', async (event, taskId, updates) => {
            try {
                console.log(`[TaskBridge] Updating task ${taskId}`, updates);

                const result = taskManagementService.updateTask(taskId, updates);

                return {
                    success: true,
                    ...result
                };
            } catch (error) {
                console.error('[TaskBridge] Error updating task:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Change task status
         * @param {string} taskId - Task ID
         * @param {string} newStatus - New status
         * @param {Object} metadata - Additional metadata
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('tasks:change-status', async (event, taskId, newStatus, metadata = {}) => {
            try {
                console.log(`[TaskBridge] Changing status of task ${taskId} to ${newStatus}`);

                const result = taskManagementService.changeStatus(taskId, newStatus, metadata);

                return {
                    success: true,
                    ...result
                };
            } catch (error) {
                console.error('[TaskBridge] Error changing task status:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get tasks by status
         * @param {string} sessionId - Session ID
         * @param {string} status - Status to filter by
         * @returns {Promise<Object>} Filtered tasks
         */
        ipcMain.handle('tasks:get-by-status', async (event, sessionId, status) => {
            try {
                console.log(`[TaskBridge] Getting tasks with status ${status} for session ${sessionId}`);

                const tasks = taskManagementService.getTasksByStatus(sessionId, status);

                return {
                    success: true,
                    tasks
                };
            } catch (error) {
                console.error('[TaskBridge] Error getting tasks by status:', error);
                return {
                    success: false,
                    error: error.message,
                    tasks: []
                };
            }
        });

        /**
         * Get overdue tasks
         * @param {string} sessionId - Session ID (optional)
         * @returns {Promise<Object>} Overdue tasks
         */
        ipcMain.handle('tasks:get-overdue', async (event, sessionId = null) => {
            try {
                console.log(`[TaskBridge] Getting overdue tasks`);

                const tasks = taskManagementService.getOverdueTasks(sessionId);

                return {
                    success: true,
                    tasks
                };
            } catch (error) {
                console.error('[TaskBridge] Error getting overdue tasks:', error);
                return {
                    success: false,
                    error: error.message,
                    tasks: []
                };
            }
        });

        /**
         * Get upcoming tasks
         * @param {number} days - Days to look ahead
         * @param {string} sessionId - Session ID (optional)
         * @returns {Promise<Object>} Upcoming tasks
         */
        ipcMain.handle('tasks:get-upcoming', async (event, days = 7, sessionId = null) => {
            try {
                console.log(`[TaskBridge] Getting upcoming tasks (${days} days)`);

                const tasks = taskManagementService.getUpcomingTasks(days, sessionId);

                return {
                    success: true,
                    tasks
                };
            } catch (error) {
                console.error('[TaskBridge] Error getting upcoming tasks:', error);
                return {
                    success: false,
                    error: error.message,
                    tasks: []
                };
            }
        });

        /**
         * Set reminder for a task
         * @param {string} taskId - Task ID
         * @param {string} reminderDate - ISO date string
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('tasks:set-reminder', async (event, taskId, reminderDate) => {
            try {
                console.log(`[TaskBridge] Setting reminder for task ${taskId}: ${reminderDate}`);

                const result = taskManagementService.setReminder(taskId, reminderDate);

                return {
                    success: true,
                    ...result
                };
            } catch (error) {
                console.error('[TaskBridge] Error setting reminder:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Add tags to a task
         * @param {string} taskId - Task ID
         * @param {Array<string>} tags - Tags to add
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('tasks:add-tags', async (event, taskId, tags) => {
            try {
                console.log(`[TaskBridge] Adding tags to task ${taskId}:`, tags);

                const result = taskManagementService.addTags(taskId, tags);

                return {
                    success: true,
                    ...result
                };
            } catch (error) {
                console.error('[TaskBridge] Error adding tags:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get task statistics
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Task statistics
         */
        ipcMain.handle('tasks:get-statistics', async (event, sessionId) => {
            try {
                console.log(`[TaskBridge] Getting task statistics for session ${sessionId}`);

                const stats = taskManagementService.getTaskStatistics(sessionId);

                return {
                    success: true,
                    stats
                };
            } catch (error) {
                console.error('[TaskBridge] Error getting task statistics:', error);
                return {
                    success: false,
                    error: error.message,
                    stats: null
                };
            }
        });

        /**
         * Export tasks to CSV
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} CSV export result
         */
        ipcMain.handle('tasks:export-csv', async (event, sessionId) => {
            try {
                console.log(`[TaskBridge] Exporting tasks to CSV for session ${sessionId}`);

                const csv = taskManagementService.exportToCSV(sessionId);
                const fs = require('fs');
                const path = require('path');
                const { app } = require('electron');

                // Save to Downloads folder
                const downloadsPath = app.getPath('downloads');
                const fileName = `tasks-${sessionId}-${Date.now()}.csv`;
                const filePath = path.join(downloadsPath, fileName);

                fs.writeFileSync(filePath, csv, 'utf-8');

                console.log(`[TaskBridge] CSV exported to: ${filePath}`);

                return {
                    success: true,
                    filePath,
                    fileName
                };
            } catch (error) {
                console.error('[TaskBridge] Error exporting to CSV:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Generate follow-up suggestions (Phase 2.4)
         * @param {string} sessionId - Session ID
         * @param {Object} options - Generation options
         * @returns {Promise<Object>} Suggestions
         */
        ipcMain.handle('tasks:generate-suggestions', async (event, sessionId, options = {}) => {
            try {
                console.log(`[TaskBridge] Generating follow-up suggestions for session ${sessionId}`);

                const suggestions = await followUpSuggestionsService.generateSuggestions(sessionId, options);

                return {
                    success: true,
                    suggestions
                };
            } catch (error) {
                console.error('[TaskBridge] Error generating suggestions:', error);
                return {
                    success: false,
                    error: error.message,
                    suggestions: []
                };
            }
        });

        /**
         * Accept a suggestion
         * @param {string} sessionId - Session ID
         * @param {Object} suggestion - Suggestion to accept
         * @returns {Promise<Object>} Action result
         */
        ipcMain.handle('tasks:accept-suggestion', async (event, sessionId, suggestion) => {
            try {
                console.log(`[TaskBridge] Accepting suggestion: ${suggestion.type}`);

                const result = await followUpSuggestionsService.acceptSuggestion(sessionId, suggestion);

                return result;
            } catch (error) {
                console.error('[TaskBridge] Error accepting suggestion:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Dismiss a suggestion
         * @param {string} sessionId - Session ID
         * @param {string} suggestionType - Type of suggestion
         * @returns {Promise<Object>} Dismiss result
         */
        ipcMain.handle('tasks:dismiss-suggestion', async (event, sessionId, suggestionType) => {
            try {
                console.log(`[TaskBridge] Dismissing suggestion: ${suggestionType}`);

                const result = followUpSuggestionsService.dismissSuggestion(sessionId, suggestionType);

                return result;
            } catch (error) {
                console.error('[TaskBridge] Error dismissing suggestion:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        console.log('[TaskBridge] ✅ IPC handlers initialized');
    }
};
