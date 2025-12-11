/**
 * Speaker Bridge - IPC handlers for speaker diarization
 * Handles speaker detection, renaming, and transcript management
 */

const { ipcMain, BrowserWindow } = require('electron');
const speakerService = require('../../features/listen/services/speakerService');

/**
 * Helper to send event to all windows
 */
function sendToAllWindows(channel, data) {
    BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, data);
        }
    });
}

module.exports = {
    /**
     * Initialize all speaker-related IPC handlers
     */
    initialize() {
        console.log('[SpeakerBridge] Initializing speaker IPC handlers...');

        // Get list of speakers for a session
        ipcMain.handle('get-session-speakers', async (event, sessionId) => {
            try {
                console.log(`[SpeakerBridge] Getting speakers for session: ${sessionId}`);
                const speakers = speakerService.getSessionSpeakers(sessionId);
                console.log(`[SpeakerBridge] Found ${speakers.length} speakers`);
                return speakers;
            } catch (error) {
                console.error('[SpeakerBridge] Error getting session speakers:', error);
                throw error;
            }
        });

        // Rename a speaker (updates all occurrences)
        ipcMain.handle('rename-speaker', async (event, { sessionId, speakerId, newName }) => {
            try {
                console.log(`[SpeakerBridge] Renaming speaker ${speakerId} to "${newName}" in session ${sessionId}`);
                const result = speakerService.renameSpeaker(sessionId, speakerId, newName);
                console.log(`[SpeakerBridge] Speaker renamed successfully`);

                // Fix HAUT #5: Notify all windows about speaker rename so UI can update
                sendToAllWindows('speaker-renamed', {
                    sessionId,
                    speakerId,
                    newName
                });

                return result;
            } catch (error) {
                console.error('[SpeakerBridge] Error renaming speaker:', error);
                throw error;
            }
        });

        // Get transcript with speaker names
        ipcMain.handle('get-session-transcript', async (event, sessionId) => {
            try {
                console.log(`[SpeakerBridge] Getting transcript for session: ${sessionId}`);
                const transcript = speakerService.getSessionTranscript(sessionId);
                console.log(`[SpeakerBridge] Retrieved ${transcript.length} segments`);
                return transcript;
            } catch (error) {
                console.error('[SpeakerBridge] Error getting session transcript:', error);
                throw error;
            }
        });

        // Get currently active speaker
        ipcMain.handle('get-current-speaker', async (event, sessionId) => {
            try {
                console.log(`[SpeakerBridge] Getting current speaker for session: ${sessionId}`);
                const currentSpeaker = speakerService.getCurrentSpeaker(sessionId);
                return currentSpeaker;
            } catch (error) {
                console.error('[SpeakerBridge] Error getting current speaker:', error);
                throw error;
            }
        });

        // Clear session data
        ipcMain.handle('clear-session-speakers', async (event, sessionId) => {
            try {
                console.log(`[SpeakerBridge] Clearing speakers for session: ${sessionId}`);
                speakerService.clearSession(sessionId);
                console.log(`[SpeakerBridge] Session cleared successfully`);
                return { success: true };
            } catch (error) {
                console.error('[SpeakerBridge] Error clearing session:', error);
                throw error;
            }
        });

        console.log('[SpeakerBridge] All handlers initialized successfully');
    }
};
