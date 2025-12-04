/**
 * Email Bridge - IPC handlers for email generation and management
 */
const { ipcMain } = require('electron');
const emailGenerationService = require('../../features/listen/postCall/emailGenerationService');

module.exports = {
    initialize() {
        console.log('[EmailBridge] Initializing IPC handlers...');

        /**
         * Generate a follow-up email using AI
         * @param {string} sessionId - Session ID
         * @param {Object} options - Generation options
         * @returns {Promise<Object>} Generated email data
         */
        ipcMain.handle('email:generate-followup', async (event, sessionId, options = {}) => {
            try {
                console.log(`[EmailBridge] Generating follow-up email for session ${sessionId}`);

                const emailData = await emailGenerationService.generateFollowUpEmail(sessionId, options);

                return {
                    success: true,
                    emailData
                };
            } catch (error) {
                console.error('[EmailBridge] Error generating follow-up email:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Generate a quick email template (without AI)
         * @param {string} sessionId - Session ID
         * @param {string} templateType - Template type (brief, detailed, action-only)
         * @returns {Promise<Object>} Generated email data
         */
        ipcMain.handle('email:generate-template', async (event, sessionId, templateType = 'brief') => {
            try {
                console.log(`[EmailBridge] Generating ${templateType} template for session ${sessionId}`);

                const emailData = emailGenerationService.generateQuickTemplate(sessionId, templateType);

                return {
                    success: true,
                    emailData
                };
            } catch (error) {
                console.error('[EmailBridge] Error generating template:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Copy email to clipboard
         * @param {string} content - Email content
         * @param {string} format - Format (text, html)
         * @returns {Promise<Object>} Copy result
         */
        ipcMain.handle('email:copy-to-clipboard', async (event, content, format = 'text') => {
            try {
                console.log(`[EmailBridge] Copying email to clipboard (format: ${format})`);

                const success = await emailGenerationService.copyToClipboard(content, format);

                return {
                    success,
                    message: success ? 'Email copied to clipboard' : 'Failed to copy'
                };
            } catch (error) {
                console.error('[EmailBridge] Error copying to clipboard:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        /**
         * Open email in default mail client
         * @param {Object} emailData - Email data
         * @returns {Promise<Object>} Open result
         */
        ipcMain.handle('email:open-in-mail-client', async (event, emailData) => {
            try {
                console.log('[EmailBridge] Opening email in mail client');

                const success = await emailGenerationService.openInMailClient(emailData);

                return {
                    success,
                    message: success ? 'Email opened in mail client' : 'Failed to open'
                };
            } catch (error) {
                console.error('[EmailBridge] Error opening mail client:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        console.log('[EmailBridge] ✅ IPC handlers initialized');
    }
};
