/**
 * Browser Service
 *
 * Gère l'affichage et l'interaction avec le navigateur web intégré.
 * Le navigateur réutilise la fenêtre Ask avec la vue 'browser'.
 */

const { BrowserWindow } = require('electron');
const path = require('node:path');

// Lazy require helper to avoid circular dependency issues
const getWindowManager = () => require('../../window/windowManager');
const internalBridge = require('../../bridge/internalBridge');

const getWindowPool = () => {
    try {
        return getWindowManager().windowPool;
    } catch {
        return null;
    }
};

class BrowserService {
    constructor() {
        this.initialUrl = 'https://www.google.com'; // URL par défaut
    }

    /**
     * Affiche le navigateur Browser dans la fenêtre Ask
     * Charge content.html avec ?view=browser
     */
    async showBrowser(url = null) {
        console.log('[BrowserService] showBrowser() called', { url });

        const askWindow = getWindowPool()?.get('ask');

        if (!askWindow) {
            console.error('[BrowserService] Ask window not found in pool');
            return { success: false, error: 'Window not found' };
        }

        try {
            // Afficher la fenêtre si elle est cachée
            if (!askWindow.isVisible()) {
                console.log('[BrowserService] Showing hidden Ask window');
                internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
            }

            // Charger la vue browser dans la fenêtre Ask
            const browserLoadOptions = {
                query: {
                    view: 'browser',
                    // On pourra passer l'URL initiale ici plus tard si nécessaire
                    // url: url || this.initialUrl
                }
            };

            console.log('[BrowserService] Loading browser view with options:', browserLoadOptions);

            await askWindow.loadFile(
                path.join(__dirname, '../../ui/app/content.html'),
                browserLoadOptions
            );

            console.log('[BrowserService] Browser view loaded successfully');

            // Toujours envoyer une URL (spécifique ou par défaut)
            const targetUrl = url || this.initialUrl;
            askWindow.webContents.once('did-finish-load', () => {
                console.log('[BrowserService] Sending initial URL to browser:', targetUrl);
                askWindow.webContents.send('browser:navigate-to', targetUrl);
            });

            return { success: true };

        } catch (error) {
            console.error('[BrowserService] Error showing browser:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Navigue vers une URL dans le navigateur
     * @param {string} url - URL vers laquelle naviguer
     */
    async navigateTo(url) {
        console.log('[BrowserService] navigateTo() called', { url });

        const askWindow = getWindowPool()?.get('ask');

        if (!askWindow || !askWindow.webContents) {
            console.error('[BrowserService] Ask window not available');
            return { success: false, error: 'Window not available' };
        }

        try {
            // Envoyer la commande de navigation au BrowserView
            askWindow.webContents.send('browser:navigate-to', url);
            console.log('[BrowserService] Navigation command sent');
            return { success: true };
        } catch (error) {
            console.error('[BrowserService] Error navigating:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ferme le navigateur et retourne à la vue Ask
     */
    async closeBrowser() {
        console.log('[BrowserService] closeBrowser() called');

        const askWindow = getWindowPool()?.get('ask');

        if (!askWindow) {
            console.error('[BrowserService] Ask window not found');
            return { success: false, error: 'Window not found' };
        }

        try {
            // Recharger la vue Ask
            const askLoadOptions = { query: { view: 'ask' } };
            await askWindow.loadFile(
                path.join(__dirname, '../../ui/app/content.html'),
                askLoadOptions
            );

            console.log('[BrowserService] Returned to Ask view');
            return { success: true };

        } catch (error) {
            console.error('[BrowserService] Error closing browser:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
module.exports = new BrowserService();
