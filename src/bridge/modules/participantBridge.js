/**
 * Participant Bridge - IPC handlers for participant attribution and management
 */
const { ipcMain } = require('electron');
const participantService = require('../../features/listen/postCall/participantService');

module.exports = {
    initialize() {
        console.log('[ParticipantBridge] Initializing IPC handlers...');

        /**
         * Detect unique speakers from session transcripts
         * @param {string} sessionId - Session ID
         * @returns {Promise<Array<string>>} Array of speaker labels
         */
        ipcMain.handle('participants:detect-speakers', async (event, sessionId) => {
            try {
                console.log(`[ParticipantBridge] Detecting speakers for session ${sessionId}`);

                const speakers = await participantService.detectSpeakers(sessionId);

                return {
                    success: true,
                    speakers
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error detecting speakers:', error);
                return {
                    success: false,
                    error: error.message,
                    speakers: []
                };
            }
        });

        /**
         * Get all participants for a session
         * @param {string} sessionId - Session ID
         * @returns {Promise<Array<Object>>} Array of participants
         */
        ipcMain.handle('participants:get-session-participants', async (event, sessionId) => {
            try {
                console.log(`[ParticipantBridge] Getting participants for session ${sessionId}`);

                const participants = participantService.getSessionParticipants(sessionId);

                return {
                    success: true,
                    participants
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error getting participants:', error);
                return {
                    success: false,
                    error: error.message,
                    participants: []
                };
            }
        });

        /**
         * Save participants for a session
         * @param {string} sessionId - Session ID
         * @param {Array<Object>} participantsData - Array of participant data
         * @returns {Promise<Object>} Save result with IDs
         */
        ipcMain.handle('participants:save-participants', async (event, sessionId, participantsData) => {
            try {
                console.log(`[ParticipantBridge] Saving participants for session ${sessionId}`, participantsData);

                const ids = participantService.saveParticipants(sessionId, participantsData);

                // Send update event to renderer
                const { windowPool } = require('../../window/windowManager');
                const settingsWindow = windowPool?.get('settings');
                if (settingsWindow && !settingsWindow.isDestroyed()) {
                    settingsWindow.webContents.send('participants:saved', {
                        sessionId,
                        participantIds: ids
                    });
                }

                return {
                    success: true,
                    participantIds: ids,
                    count: ids.length
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error saving participants:', error);

                // Send error to renderer
                const { windowPool } = require('../../window/windowManager');
                const settingsWindow = windowPool?.get('settings');
                if (settingsWindow && !settingsWindow.isDestroyed()) {
                    settingsWindow.webContents.send('participants:error', {
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
         * Get frequently used participants for autocomplete
         * @param {number} limit - Maximum number of results
         * @returns {Promise<Array<Object>>} Array of frequent participants
         */
        ipcMain.handle('participants:get-frequent', async (event, limit = 10) => {
            try {
                console.log(`[ParticipantBridge] Getting frequent participants (limit: ${limit})`);

                const participants = participantService.getFrequentParticipants(limit);

                return {
                    success: true,
                    participants
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error getting frequent participants:', error);
                return {
                    success: false,
                    error: error.message,
                    participants: []
                };
            }
        });

        /**
         * Check if participants are assigned for a session
         * @param {string} sessionId - Session ID
         * @returns {Promise<boolean>} True if all speakers have assigned participants
         */
        ipcMain.handle('participants:has-assigned', async (event, sessionId) => {
            try {
                console.log(`[ParticipantBridge] Checking participant assignment for session ${sessionId}`);

                const hasAssigned = await participantService.hasParticipantsAssigned(sessionId);

                return {
                    success: true,
                    hasAssigned
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error checking participants assignment:', error);
                return {
                    success: false,
                    error: error.message,
                    hasAssigned: false
                };
            }
        });

        /**
         * Get participant mapping for a session (speaker label -> participant info)
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Participant mapping
         */
        ipcMain.handle('participants:get-mapping', async (event, sessionId) => {
            try {
                console.log(`[ParticipantBridge] Getting participant mapping for session ${sessionId}`);

                const mapping = participantService.getParticipantMapping(sessionId);

                return {
                    success: true,
                    mapping
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error getting participant mapping:', error);
                return {
                    success: false,
                    error: error.message,
                    mapping: {}
                };
            }
        });

        /**
         * Delete all participants for a session
         * @param {string} sessionId - Session ID
         * @returns {Promise<Object>} Delete result
         */
        ipcMain.handle('participants:delete-session-participants', async (event, sessionId) => {
            try {
                console.log(`[ParticipantBridge] Deleting participants for session ${sessionId}`);

                const result = participantService.deleteSessionParticipants(sessionId);

                return {
                    success: true,
                    changes: result.changes
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error deleting participants:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Update meeting notes with participant names
         * @param {string} sessionId - Session ID
         * @param {string} meetingNoteId - Meeting note ID
         * @returns {Promise<Object>} Updated notes result
         */
        ipcMain.handle('participants:update-notes', async (event, sessionId, meetingNoteId) => {
            try {
                console.log(`[ParticipantBridge] Updating meeting notes with participants for session ${sessionId}`);

                const { meetingNotesRepository } = require('../../features/listen/postCall/repositories');
                const meetingNotes = meetingNotesRepository.getBySessionId(sessionId);

                if (!meetingNotes) {
                    throw new Error('Meeting notes not found');
                }

                const updatedNotes = participantService.updateNotesWithParticipants(meetingNotes, sessionId);

                // Update the meeting notes in the repository
                const updateQuery = `
                    UPDATE meeting_notes
                    SET full_structured_data = ?, participants = ?, updated_at = ?
                    WHERE id = ?
                `;

                const sqliteClient = require('../../db/sqliteClient');
                const db = sqliteClient.getDb();
                const now = Math.floor(Date.now() / 1000);

                db.prepare(updateQuery).run(
                    updatedNotes.full_structured_data,
                    updatedNotes.participants,
                    now,
                    meetingNotes.id
                );

                return {
                    success: true,
                    updated: true
                };
            } catch (error) {
                console.error('[ParticipantBridge] Error updating notes with participants:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        console.log('[ParticipantBridge] ✅ IPC handlers initialized');
    }
};
