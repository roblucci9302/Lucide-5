/**
 * Knowledge Base Service
 *
 * Manages the Knowledge Base window lifecycle
 */

const { BrowserWindow } = require('electron');
const path = require('path');

class KnowledgeBaseService {
    constructor() {
        this.knowledgeBaseWindow = null;
        this.externalDialogWindow = null;
        console.log('[KnowledgeBaseService] Service initialized');
    }

    /**
     * Show the Knowledge Base window
     */
    async showKnowledgeBase() {
        console.log('[KnowledgeBaseService] Opening Knowledge Base window');

        if (this.knowledgeBaseWindow) {
            // Window already exists, just focus it
            if (this.knowledgeBaseWindow.isMinimized()) {
                this.knowledgeBaseWindow.restore();
            }
            this.knowledgeBaseWindow.focus();
            return;
        }

        // Create new window
        this.knowledgeBaseWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            backgroundColor: '#1a1a1a',
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 10, y: 10 },
            show: false,
            webPreferences: {
                preload: path.join(__dirname, '../../preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false
            }
        });

        // Load the HTML file
        const htmlPath = path.join(__dirname, '../../ui/knowledge/knowledge-base.html');
        await this.knowledgeBaseWindow.loadFile(htmlPath);

        // Show when ready
        this.knowledgeBaseWindow.once('ready-to-show', () => {
            console.log('[KnowledgeBaseService] Window ready to show');
            this.knowledgeBaseWindow.show();
        });

        // Clean up on close
        this.knowledgeBaseWindow.on('closed', () => {
            console.log('[KnowledgeBaseService] Window closed');
            this.knowledgeBaseWindow = null;
        });

        // Open DevTools in development
        if (process.env.NODE_ENV === 'development') {
            this.knowledgeBaseWindow.webContents.openDevTools();
        }
    }

    /**
     * Close the Knowledge Base window
     */
    closeKnowledgeBase() {
        console.log('[KnowledgeBaseService] Closing Knowledge Base window');

        if (this.knowledgeBaseWindow) {
            this.knowledgeBaseWindow.close();
            this.knowledgeBaseWindow = null;
        }
    }

    /**
     * Check if Knowledge Base window is open
     */
    isOpen() {
        return this.knowledgeBaseWindow !== null && !this.knowledgeBaseWindow.isDestroyed();
    }

    /**
     * Show external database connection dialog
     */
    async showExternalDialog() {
        console.log('[KnowledgeBaseService] Opening external database dialog');

        if (this.externalDialogWindow) {
            // Dialog already exists, just focus it
            if (this.externalDialogWindow.isMinimized()) {
                this.externalDialogWindow.restore();
            }
            this.externalDialogWindow.focus();
            return;
        }

        // Create new dialog window
        this.externalDialogWindow = new BrowserWindow({
            width: 700,
            height: 850,
            minWidth: 600,
            minHeight: 700,
            backgroundColor: '#1a1a1a',
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 10, y: 10 },
            show: false,
            webPreferences: {
                preload: path.join(__dirname, '../../preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false
            }
        });

        // Load the HTML file
        const htmlPath = path.join(__dirname, '../../ui/knowledge/external-database-dialog.html');
        await this.externalDialogWindow.loadFile(htmlPath);

        // Show when ready
        this.externalDialogWindow.once('ready-to-show', () => {
            console.log('[KnowledgeBaseService] External dialog ready to show');
            this.externalDialogWindow.show();
        });

        // Clean up on close
        this.externalDialogWindow.on('closed', () => {
            console.log('[KnowledgeBaseService] External dialog closed');
            this.externalDialogWindow = null;
        });

        // Open DevTools in development
        if (process.env.NODE_ENV === 'development') {
            this.externalDialogWindow.webContents.openDevTools();
        }
    }

    /**
     * Close external database dialog
     */
    closeExternalDialog() {
        console.log('[KnowledgeBaseService] Closing external database dialog');

        if (this.externalDialogWindow) {
            this.externalDialogWindow.close();
            this.externalDialogWindow = null;
        }
    }
}

// Export singleton instance
const knowledgeBaseService = new KnowledgeBaseService();
module.exports = knowledgeBaseService;
