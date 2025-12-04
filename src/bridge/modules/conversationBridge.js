/**
 * Conversation Bridge - IPC handlers for agents, history, ask, and listen features
 */
const { ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const authService = require('../../features/common/services/authService');
const agentProfileService = require('../../features/common/services/agentProfileService');
const conversationHistoryService = require('../../features/common/services/conversationHistoryService');
const exportService = require('../../features/common/services/exportService');
const askService = require('../../features/ask/askService');
const browserService = require('../../features/browser/browserService');
const listenService = require('../../features/listen/listenService');
const sessionRepository = require('../../features/common/repositories/session');

module.exports = {
    initialize() {
        // Agent Profiles
        ipcMain.handle('agent:get-available-profiles', () => agentProfileService.getAvailableProfiles());
        ipcMain.handle('agent:get-active-profile', () => agentProfileService.getCurrentProfile());
        ipcMain.handle('agent:set-active-profile', async (event, profileId) => {
            const userId = authService.getCurrentUserId();
            const success = await agentProfileService.setActiveProfile(userId, profileId);
            return { success };
        });

        // Conversation History (Phase 2)
        ipcMain.handle('history:get-all-sessions', async (event, options) => {
            const userId = authService.getCurrentUserId();
            return await conversationHistoryService.getAllSessions(userId, options);
        });
        ipcMain.handle('history:search-sessions', async (event, query, filters) => {
            const userId = authService.getCurrentUserId();
            return await conversationHistoryService.searchSessions(userId, query, filters);
        });
        ipcMain.handle('history:get-session-messages', async (event, sessionId) => {
            return await conversationHistoryService.getSessionMessages(sessionId);
        });
        ipcMain.handle('history:get-stats', async () => {
            const userId = authService.getCurrentUserId();
            return await conversationHistoryService.getSessionStats(userId);
        });
        ipcMain.handle('history:update-metadata', async (event, sessionId, metadata) => {
            return await conversationHistoryService.updateSessionMetadata(sessionId, metadata);
        });
        ipcMain.handle('history:delete-session', async (event, sessionId) => {
            return await conversationHistoryService.deleteSession(sessionId);
        });
        ipcMain.handle('history:generate-title', async (event, sessionId) => {
            return await conversationHistoryService.generateTitleFromContent(sessionId);
        });

        // Export Features (Phase 5)
        ipcMain.handle('export:conversation-json', async (event, sessionId) => {
            try {
                const session = await conversationHistoryService.getSession(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }

                const suggestedFilename = exportService.getSuggestedFilename(session, 'json');

                const result = await dialog.showSaveDialog({
                    title: 'Export Conversation to JSON',
                    defaultPath: path.join(os.homedir(), 'Downloads', suggestedFilename),
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || !result.filePath) {
                    return { success: false, cancelled: true };
                }

                return await exportService.exportToJSON(sessionId, result.filePath);
            } catch (error) {
                console.error('[ConversationBridge] Error exporting to JSON:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('export:conversation-markdown', async (event, sessionId) => {
            try {
                const session = await conversationHistoryService.getSession(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }

                const suggestedFilename = exportService.getSuggestedFilename(session, 'markdown');

                const result = await dialog.showSaveDialog({
                    title: 'Export Conversation to Markdown',
                    defaultPath: path.join(os.homedir(), 'Downloads', suggestedFilename),
                    filters: [
                        { name: 'Markdown Files', extensions: ['md'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || !result.filePath) {
                    return { success: false, cancelled: true };
                }

                return await exportService.exportToMarkdown(sessionId, result.filePath);
            } catch (error) {
                console.error('[ConversationBridge] Error exporting to Markdown:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('export:conversation-pdf', async (event, sessionId) => {
            try {
                const session = await conversationHistoryService.getSession(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }

                const suggestedFilename = exportService.getSuggestedFilename(session, 'pdf');

                const result = await dialog.showSaveDialog({
                    title: 'Export Conversation to PDF',
                    defaultPath: path.join(os.homedir(), 'Downloads', suggestedFilename),
                    filters: [
                        { name: 'PDF Files', extensions: ['pdf'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || !result.filePath) {
                    return { success: false, cancelled: true };
                }

                return await exportService.exportToPDF(sessionId, result.filePath);
            } catch (error) {
                console.error('[ConversationBridge] Error exporting to PDF:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('export:conversation-docx', async (event, sessionId) => {
            try {
                const session = await conversationHistoryService.getSession(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }

                const suggestedFilename = exportService.getSuggestedFilename(session, 'docx');

                const result = await dialog.showSaveDialog({
                    title: 'Export Conversation to DOCX',
                    defaultPath: path.join(os.homedir(), 'Downloads', suggestedFilename),
                    filters: [
                        { name: 'Word Documents', extensions: ['docx'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || !result.filePath) {
                    return { success: false, cancelled: true };
                }

                return await exportService.exportToDOCX(sessionId, result.filePath);
            } catch (error) {
                console.error('[ConversationBridge] Error exporting to DOCX:', error);
                return { success: false, error: error.message };
            }
        });

        // Ask Feature
        ipcMain.handle('ask:sendQuestionFromAsk', async (event, userPrompt) => await askService.sendMessage(userPrompt));
        ipcMain.handle('ask:sendQuestionFromSummary', async (event, userPrompt) => await askService.sendMessage(userPrompt));
        ipcMain.handle('ask:toggleAskButton', async () => await askService.toggleAskButton());
        ipcMain.handle('ask:closeAskWindow', async () => await askService.closeAskWindow());
        ipcMain.handle('ask:minimizeAskWindow', async () => await askService.minimizeAskWindow());
        ipcMain.handle('ask:showListenWindow', async () => await askService.showListenWindow());
        ipcMain.handle('ask:setBrowserMode', async (event, browserMode) => {
            try {
                const internalBridge = require('../../bridge/internalBridge');
                internalBridge.emit('window:setAskBrowserMode', { browserMode });
                return { success: true };
            } catch (error) {
                console.error('[ConversationBridge] ask:setBrowserMode failed', error.message);
                return { success: false, error: error.message };
            }
        });

        // Browser Feature
        ipcMain.handle('browser:show', async (event, url) => {
            console.log('[ConversationBridge] browser:show called', { url });
            try {
                const result = await browserService.showBrowser(url);
                return result;
            } catch (error) {
                console.error('[ConversationBridge] browser:show failed', error.message);
                return { success: false, error: error.message };
            }
        });
        ipcMain.handle('browser:navigateTo', async (event, url) => {
            console.log('[ConversationBridge] browser:navigateTo called', { url });
            try {
                const result = await browserService.navigateTo(url);
                return result;
            } catch (error) {
                console.error('[ConversationBridge] browser:navigateTo failed', error.message);
                return { success: false, error: error.message };
            }
        });
        ipcMain.handle('browser:close', async () => {
            console.log('[ConversationBridge] browser:close called');
            try {
                const result = await browserService.closeBrowser();
                return result;
            } catch (error) {
                console.error('[ConversationBridge] browser:close failed', error.message);
                return { success: false, error: error.message };
            }
        });

        // Listen Feature
        ipcMain.handle('listen:sendMicAudio', async (event, { data, mimeType }) => await listenService.handleSendMicAudioContent(data, mimeType));
        ipcMain.handle('listen:sendSystemAudio', async (event, { data, mimeType }) => {
            const result = await listenService.sttService.sendSystemAudioContent(data, mimeType);
            if (result.success) {
                listenService.sendToRenderer('system-audio-data', { data });
            }
            return result;
        });
        ipcMain.handle('listen:startMacosSystemAudio', async () => await listenService.handleStartMacosAudio());
        ipcMain.handle('listen:stopMacosSystemAudio', async () => await listenService.handleStopMacosAudio());

        // BlackHole audio device detection (main process)
        ipcMain.handle('listen:detectBlackHole', async () => {
            const audioDeviceService = require('../../features/listen/audioDeviceService');
            return await audioDeviceService.detectBlackHole();
        });
        ipcMain.handle('listen:getAudioDeviceStatus', async () => {
            const audioDeviceService = require('../../features/listen/audioDeviceService');
            return await audioDeviceService.getStatus();
        });
        ipcMain.handle('listen:getBlackHoleSetupInstructions', async () => {
            const audioDeviceService = require('../../features/listen/audioDeviceService');
            return audioDeviceService.getSetupInstructions();
        });
        ipcMain.handle('update-google-search-setting', async (event, enabled) => await listenService.handleUpdateGoogleSearchSetting(enabled));
        ipcMain.handle('listen:isSessionActive', async () => await listenService.isSessionActive());
        ipcMain.handle('listen:changeSession', async (event, listenButtonText) => {
            console.log('[ConversationBridge] listen:changeSession from mainheader', listenButtonText);
            try {
                await listenService.handleListenRequest(listenButtonText);
                return { success: true };
            } catch (error) {
                console.error('[ConversationBridge] listen:changeSession failed', error.message);
                return { success: false, error: error.message };
            }
        });
        ipcMain.handle('listen:hideWindow', async () => {
            try {
                const internalBridge = require('../../bridge/internalBridge');
                internalBridge.emit('window:requestVisibility', { name: 'listen', visible: false });
                return { success: true };
            } catch (error) {
                console.error('[ConversationBridge] listen:hideWindow failed', error.message);
                return { success: false, error: error.message };
            }
        });

        // Phase 1 - Meeting Assistant: Get most recent listen session
        ipcMain.handle('listen:getRecentListenSession', async () => {
            try {
                // First check if there's an active session
                if (listenService.currentSessionId) {
                    const currentSession = await sessionRepository.getById(listenService.currentSessionId);
                    if (currentSession && currentSession.session_type === 'listen') {
                        return {
                            success: true,
                            sessionId: listenService.currentSessionId,
                            hasEnded: currentSession.ended_at !== null
                        };
                    }
                }

                // Otherwise, find the most recent listen session (ended or orphaned)
                const authService = require('../../features/common/services/authService');
                const userId = authService.getCurrentUserId();
                const sessions = await sessionRepository.getAllByUserId(userId);

                // Filter for listen sessions, prioritizing ended ones
                const listenSessions = sessions.filter(s => s.session_type === 'listen');

                // First, try to find ended sessions (sorted by ended_at desc)
                const endedListenSessions = listenSessions
                    .filter(s => s.ended_at !== null)
                    .sort((a, b) => b.ended_at - a.ended_at);

                if (endedListenSessions.length > 0 && endedListenSessions[0]?.id) {
                    return {
                        success: true,
                        sessionId: endedListenSessions[0].id,
                        hasEnded: true
                    };
                }

                // FIX: If no ended sessions, look for orphaned sessions (started but not ended)
                // This handles cases where:
                // - User didn't click "Stop" before requesting analysis
                // - App restarted while session was active
                const orphanedSessions = listenSessions
                    .filter(s => s.ended_at === null && s.started_at !== null)
                    .sort((a, b) => b.started_at - a.started_at);

                if (orphanedSessions.length > 0 && orphanedSessions[0]?.id) {
                    console.log(`[ConversationBridge] Found orphaned listen session: ${orphanedSessions[0].id}`);
                    // Auto-end the orphaned session so it can be properly analyzed
                    await sessionRepository.end(orphanedSessions[0].id);
                    console.log(`[ConversationBridge] Auto-ended orphaned session: ${orphanedSessions[0].id}`);

                    return {
                        success: true,
                        sessionId: orphanedSessions[0].id,
                        hasEnded: true
                    };
                }

                return {
                    success: false,
                    error: 'No listen session found'
                };
            } catch (error) {
                console.error('[ConversationBridge] Error getting recent listen session:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Phase 1 - Meeting Assistant: Open post-meeting window
        ipcMain.handle('listen:openPostMeetingWindow', async (event, sessionId) => {
            try {
                const internalBridge = require('../../bridge/internalBridge');

                // Show the post-meeting window
                internalBridge.emit('window:requestVisibility', { name: 'post-meeting', visible: true });

                // Send session ID to the window after it's visible
                const { windowPool } = require('../../window/windowManager');
                const postMeetingWindow = windowPool?.get('post-meeting');
                if (postMeetingWindow && !postMeetingWindow.isDestroyed()) {
                    // Wait a bit for the window to be ready
                    setTimeout(() => {
                        postMeetingWindow.webContents.send('post-meeting:set-session', sessionId);
                    }, 100);
                }

                return { success: true };
            } catch (error) {
                console.error('[ConversationBridge] Error opening post-meeting window:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        console.log('[ConversationBridge] Initialized');
    },

    // Envoyer l'état au Renderer
    sendAskProgress(win, progress) {
        win.webContents.send('feature:ask:progress', progress);
    }
};
