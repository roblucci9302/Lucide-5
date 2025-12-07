/**
 * Post-Meeting Bridge - IPC handlers for post-meeting notes, tasks, and exports
 */
const { ipcMain } = require('electron');
const authService = require('../../features/common/services/authService');
const postCallService = require('../../features/listen/postCall/postCallService');
const exportService = require('../../features/listen/postCall/exportService');
const sttRepository = require('../../features/listen/stt/repositories');
const { meetingNotesRepository, meetingTasksRepository } = require('../../features/listen/postCall/repositories');

// FIX MEDIUM: Add retry utility for transient failures
async function withRetry(fn, options = {}) {
    const { maxRetries = 2, delayMs = 1000, retryableErrors = [] } = options;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            const isRetryable = retryableErrors.length === 0 ||
                retryableErrors.some(pattern =>
                    error.message && error.message.toLowerCase().includes(pattern.toLowerCase())
                );

            if (!isRetryable || attempt > maxRetries) {
                throw error;
            }

            console.warn(`[PostMeetingBridge] Attempt ${attempt} failed, retrying in ${delayMs}ms: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
    throw lastError;
}

module.exports = {
    initialize() {
        console.log('[PostMeetingBridge] Initializing IPC handlers...');

        /**
         * Generate meeting notes for a session
         * FIX MEDIUM: Added retry logic for transient failures
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Generated notes and tasks
         */
        ipcMain.handle('post-meeting:generate-notes', async (event, sessionId) => {
            try {
                console.log(`[PostMeetingBridge] Generating notes for session ${sessionId}`);

                // FIX MEDIUM: Retry on transient failures (network, AI service)
                const result = await withRetry(
                    () => postCallService.generateMeetingNotes(sessionId, { meetingType: 'general' }),
                    {
                        maxRetries: 2,
                        delayMs: 1000,
                        retryableErrors: ['network', 'timeout', 'ECONNRESET', 'ETIMEDOUT', '503', '504', 'rate limit']
                    }
                );

                // Send update to renderer - FIX: Send to post-meeting window, not settings
                const { windowPool } = require('../../window/windowManager');
                const postMeetingWindow = windowPool?.get('post-meeting');
                if (postMeetingWindow && !postMeetingWindow.isDestroyed()) {
                    postMeetingWindow.webContents.send('post-meeting:notes-generated', {
                        notes: result.structuredData,
                        tasks: result.tasks
                    });
                }

                return {
                    success: true,
                    noteId: result.noteId,
                    tasksCount: result.tasksCount
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error generating notes:', error);

                // Send error to renderer - FIX: Send to post-meeting window
                const { windowPool } = require('../../window/windowManager');
                const postMeetingWindow = windowPool?.get('post-meeting');
                if (postMeetingWindow && !postMeetingWindow.isDestroyed()) {
                    postMeetingWindow.webContents.send('post-meeting:error', {
                        error: error.message
                    });
                }

                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get meeting notes for a session
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Meeting notes and tasks
         */
        ipcMain.handle('post-meeting:get-notes', async (event, sessionId) => {
            try {
                const notes = meetingNotesRepository.getBySessionId(sessionId);
                if (!notes) {
                    return { success: false, error: 'No meeting notes found' };
                }

                const tasks = meetingTasksRepository.getBySessionId(sessionId);

                return {
                    success: true,
                    notes,
                    tasks
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error getting notes:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Export meeting notes to a specific format
         * @param {string} sessionId - Session ID
         * @param {string} format - Export format (markdown, pdf, word, excel, html, srt, vtt)
         * @returns {Promise<Object>} Export result with file path
         */
        ipcMain.handle('post-meeting:export', async (event, sessionId, format) => {
            try {
                console.log(`[PostMeetingBridge] Exporting session ${sessionId} to ${format}`);

                const meetingNotes = meetingNotesRepository.getBySessionId(sessionId);
                if (!meetingNotes) {
                    throw new Error('No meeting notes found for this session');
                }

                const tasks = meetingTasksRepository.getBySessionId(sessionId);
                const transcripts = await sttRepository.getTranscriptsBySessionId(sessionId);

                let filePath;

                switch (format.toLowerCase()) {
                    case 'markdown':
                    case 'md':
                        filePath = await exportService.exportToMarkdown(meetingNotes, tasks, transcripts);
                        break;

                    case 'pdf':
                        filePath = await exportService.exportToPDF(meetingNotes, tasks);
                        break;

                    case 'word':
                    case 'docx':
                        filePath = await exportService.exportToWord(meetingNotes, tasks);
                        break;

                    case 'excel':
                    case 'xlsx':
                        filePath = await exportService.exportToExcel(meetingNotes, tasks);
                        break;

                    case 'html':
                    case 'email':
                        filePath = await exportService.exportToHTML(meetingNotes, tasks);
                        break;

                    case 'srt':
                        filePath = await exportService.exportToSRT(transcripts, sessionId);
                        break;

                    case 'vtt':
                        filePath = await exportService.exportToVTT(transcripts, sessionId);
                        break;

                    case 'text':
                    case 'txt':
                        filePath = await exportService.exportToText(meetingNotes, tasks, transcripts);
                        break;

                    default:
                        throw new Error(`Unsupported export format: ${format}`);
                }

                // Send completion event to renderer - FIX: Send to post-meeting window
                const { windowPool } = require('../../window/windowManager');
                const postMeetingWindow = windowPool?.get('post-meeting');
                if (postMeetingWindow && !postMeetingWindow.isDestroyed()) {
                    postMeetingWindow.webContents.send('post-meeting:export-complete', {
                        format,
                        filePath
                    });
                }

                return {
                    success: true,
                    filePath,
                    format
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error exporting notes:', error);

                // Send error to renderer - FIX: Send to post-meeting window
                const { windowPool } = require('../../window/windowManager');
                const postMeetingWindow = windowPool?.get('post-meeting');
                if (postMeetingWindow && !postMeetingWindow.isDestroyed()) {
                    postMeetingWindow.webContents.send('post-meeting:error', {
                        error: error.message
                    });
                }

                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get all meeting notes for the current user
         * @returns {Promise<Object>} List of meeting notes
         */
        ipcMain.handle('post-meeting:get-all-notes', async (event) => {
            try {
                const userId = authService.getCurrentUserId();
                const notes = meetingNotesRepository.getAllByUserId(userId);

                return {
                    success: true,
                    notes
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error getting all notes:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Update a task
         * @param {string} taskId - Task ID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('post-meeting:update-task', async (event, taskId, updates) => {
            try {
                const result = postCallService.updateTask(taskId, updates);

                return {
                    success: true,
                    changes: result.changes
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error updating task:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Mark a task as completed
         * @param {string} taskId - Task ID
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('post-meeting:complete-task', async (event, taskId) => {
            try {
                const result = postCallService.completeTask(taskId);

                return {
                    success: true,
                    changes: result.changes
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error completing task:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Delete meeting notes
         * @param {string} noteId - Meeting note ID
         * @returns {Promise<Object>} Delete result
         */
        ipcMain.handle('post-meeting:delete-notes', async (event, noteId) => {
            try {
                const result = postCallService.deleteMeetingNotes(noteId);

                return {
                    success: true
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error deleting notes:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Get tasks for a meeting note
         * @param {string} meetingNoteId - Meeting note ID
         * @returns {Promise<Object>} Tasks
         */
        ipcMain.handle('post-meeting:get-tasks', async (event, meetingNoteId) => {
            try {
                const tasks = postCallService.getTasksByMeetingNoteId(meetingNoteId);

                return {
                    success: true,
                    tasks
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error getting tasks:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Check if a session has meeting notes
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Result with hasNotes boolean
         */
        ipcMain.handle('post-meeting:has-notes', async (event, sessionId) => {
            try {
                const notes = meetingNotesRepository.getBySessionId(sessionId);

                return {
                    success: true,
                    hasNotes: notes !== null && notes !== undefined
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error checking notes:', error);
                return {
                    success: false,
                    error: error.message,
                    hasNotes: false
                };
            }
        });

        /**
         * Phase 2.4: Update meeting notes (for editing)
         * @param {string} noteId - Meeting note ID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Update result
         */
        ipcMain.handle('post-meeting:update-notes', async (event, noteId, updates) => {
            try {
                console.log(`[PostMeetingBridge] Updating notes ${noteId}`, Object.keys(updates));

                // Validate noteId
                if (!noteId) {
                    throw new Error('Note ID is required');
                }

                // Update the meeting notes
                const result = meetingNotesRepository.update(noteId, updates);

                return {
                    success: true,
                    changes: result?.changes || 1
                };
            } catch (error) {
                console.error('[PostMeetingBridge] Error updating notes:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Close the post-meeting window
         * FIX: Added IPC handler for close button
         */
        ipcMain.handle('post-meeting:close-window', async (event) => {
            try {
                const { windowPool } = require('../../window/windowManager');
                const postMeetingWindow = windowPool?.get('post-meeting');
                if (postMeetingWindow && !postMeetingWindow.isDestroyed()) {
                    postMeetingWindow.close();
                }
                return { success: true };
            } catch (error) {
                console.error('[PostMeetingBridge] Error closing window:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[PostMeetingBridge] ✅ IPC handlers initialized');
    }
};
