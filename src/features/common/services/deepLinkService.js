/**
 * Deep Link Service
 *
 * Handles lucide:// protocol URLs for deep linking into the application.
 * Supports navigation to specific views, sessions, and actions.
 *
 * Supported Deep Links:
 * - lucide://                          → Open app (focus main window)
 * - lucide://chat                      → Open Ask/Chat view
 * - lucide://chat/new                  → Start new chat session
 * - lucide://chat/{sessionId}          → Open specific chat session
 * - lucide://listen                    → Open Listen view
 * - lucide://listen/start              → Start listening
 * - lucide://listen/stop               → Stop listening
 * - lucide://settings                  → Open Settings view
 * - lucide://settings/{section}        → Open specific settings section
 * - lucide://session/{sessionId}       → Open specific session
 * - lucide://search?q={query}          → Search conversations
 * - lucide://knowledge                 → Open Knowledge Base
 * - lucide://knowledge/upload          → Open document upload
 * - lucide://profile                   → Open user profile
 * - lucide://profile/{profileId}       → Switch to specific agent profile
 */

const { BrowserWindow } = require('electron');

class DeepLinkService {
    constructor() {
        this.windowManager = null;
        this.pendingDeepLink = null;
        this.initialized = false;
        this.handlers = new Map();

        // Register default handlers
        this._registerDefaultHandlers();

        console.log('[DeepLinkService] Initialized');
    }

    /**
     * Set window manager reference for navigation
     * @param {Object} windowManager
     */
    setWindowManager(windowManager) {
        this.windowManager = windowManager;
        this.initialized = true;

        // Process any pending deep link
        if (this.pendingDeepLink) {
            console.log('[DeepLinkService] Processing pending deep link:', this.pendingDeepLink);
            this.handleDeepLink(this.pendingDeepLink);
            this.pendingDeepLink = null;
        }
    }

    /**
     * Register default route handlers
     * @private
     */
    _registerDefaultHandlers() {
        // Root - just focus the app
        this.registerHandler('', async () => {
            return this._focusMainWindow();
        });

        // Chat routes
        this.registerHandler('chat', async (params) => {
            return this._navigateToChat(params);
        });

        this.registerHandler('chat/new', async () => {
            return this._startNewChat();
        });

        this.registerHandler('chat/:sessionId', async (params) => {
            return this._openChatSession(params.sessionId);
        });

        // Listen routes
        this.registerHandler('listen', async () => {
            return this._navigateToListen();
        });

        this.registerHandler('listen/start', async () => {
            return this._startListening();
        });

        this.registerHandler('listen/stop', async () => {
            return this._stopListening();
        });

        // Settings routes
        this.registerHandler('settings', async (params) => {
            return this._navigateToSettings(params);
        });

        this.registerHandler('settings/:section', async (params) => {
            return this._navigateToSettings({ section: params.section });
        });

        // Session route
        this.registerHandler('session/:sessionId', async (params) => {
            return this._openSession(params.sessionId);
        });

        // Search route
        this.registerHandler('search', async (params) => {
            return this._performSearch(params.q || params.query);
        });

        // Knowledge Base routes
        this.registerHandler('knowledge', async () => {
            return this._navigateToKnowledge();
        });

        this.registerHandler('knowledge/upload', async () => {
            return this._openKnowledgeUpload();
        });

        // Profile routes
        this.registerHandler('profile', async () => {
            return this._navigateToProfile();
        });

        this.registerHandler('profile/:profileId', async (params) => {
            return this._switchProfile(params.profileId);
        });
    }

    /**
     * Register a custom handler for a route
     * @param {string} route - Route pattern (e.g., 'chat/:sessionId')
     * @param {Function} handler - Async handler function
     */
    registerHandler(route, handler) {
        this.handlers.set(route, handler);
    }

    /**
     * Parse a deep link URL into components
     * @param {string} url - The lucide:// URL
     * @returns {Object} Parsed URL components
     */
    parseDeepLink(url) {
        if (!url) {
            return { valid: false, error: 'Empty URL' };
        }

        try {
            // Handle both lucide:// and lucide: formats
            let normalizedUrl = url;
            if (url.startsWith('lucide:') && !url.startsWith('lucide://')) {
                normalizedUrl = url.replace('lucide:', 'lucide://');
            }

            // Use URL API for parsing
            const parsed = new URL(normalizedUrl);

            if (parsed.protocol !== 'lucide:') {
                return { valid: false, error: 'Invalid protocol' };
            }

            // Extract path (remove leading slashes)
            const path = (parsed.hostname + parsed.pathname).replace(/^\/+|\/+$/g, '');

            // Parse query parameters
            const queryParams = {};
            parsed.searchParams.forEach((value, key) => {
                queryParams[key] = value;
            });

            // Extract path segments
            const segments = path.split('/').filter(s => s.length > 0);

            return {
                valid: true,
                url: normalizedUrl,
                protocol: 'lucide',
                path: path || '',
                segments,
                query: queryParams,
                hash: parsed.hash.replace('#', '')
            };
        } catch (error) {
            console.error('[DeepLinkService] Error parsing URL:', url, error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Handle a deep link URL
     * @param {string} url - The lucide:// URL to handle
     * @returns {Object} Result of handling the deep link
     */
    async handleDeepLink(url) {
        console.log('[DeepLinkService] Handling deep link:', url);

        // If not initialized, queue the deep link
        if (!this.initialized || !this.windowManager) {
            console.log('[DeepLinkService] Not initialized, queueing deep link');
            this.pendingDeepLink = url;
            return { success: false, pending: true, message: 'Deep link queued for processing' };
        }

        const parsed = this.parseDeepLink(url);

        if (!parsed.valid) {
            console.error('[DeepLinkService] Invalid deep link:', parsed.error);
            return { success: false, error: parsed.error };
        }

        // Find matching handler
        const result = await this._routeDeepLink(parsed);

        console.log('[DeepLinkService] Deep link handled:', result);
        return result;
    }

    /**
     * Route a parsed deep link to the appropriate handler
     * @param {Object} parsed - Parsed deep link
     * @returns {Object} Result
     * @private
     */
    async _routeDeepLink(parsed) {
        const { path, segments, query } = parsed;

        // Try exact match first
        if (this.handlers.has(path)) {
            try {
                const result = await this.handlers.get(path)({ ...query });
                return { success: true, route: path, ...result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        // Try pattern matching (e.g., 'chat/:sessionId')
        for (const [pattern, handler] of this.handlers) {
            const match = this._matchPattern(pattern, segments);
            if (match) {
                try {
                    const params = { ...match.params, ...query };
                    const result = await handler(params);
                    return { success: true, route: pattern, params, ...result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        }

        // No handler found
        console.warn('[DeepLinkService] No handler for route:', path);
        return { success: false, error: `Unknown route: ${path}` };
    }

    /**
     * Match a URL pattern against path segments
     * @param {string} pattern - Route pattern (e.g., 'chat/:sessionId')
     * @param {Array} segments - URL path segments
     * @returns {Object|null} Match result with params, or null
     * @private
     */
    _matchPattern(pattern, segments) {
        const patternParts = pattern.split('/').filter(p => p.length > 0);

        if (patternParts.length !== segments.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const segment = segments[i];

            if (patternPart.startsWith(':')) {
                // Parameter placeholder
                const paramName = patternPart.substring(1);
                params[paramName] = segment;
            } else if (patternPart !== segment) {
                // Literal mismatch
                return null;
            }
        }

        return { params };
    }

    /**
     * Get list of all supported deep links
     * @returns {Array} List of supported deep link routes
     */
    getSupportedDeepLinks() {
        return [
            { route: 'lucide://', description: 'Open app (focus main window)' },
            { route: 'lucide://chat', description: 'Open Ask/Chat view' },
            { route: 'lucide://chat/new', description: 'Start new chat session' },
            { route: 'lucide://chat/{sessionId}', description: 'Open specific chat session' },
            { route: 'lucide://listen', description: 'Open Listen view' },
            { route: 'lucide://listen/start', description: 'Start listening' },
            { route: 'lucide://listen/stop', description: 'Stop listening' },
            { route: 'lucide://settings', description: 'Open Settings view' },
            { route: 'lucide://settings/{section}', description: 'Open specific settings section (api, models, audio, appearance)' },
            { route: 'lucide://session/{sessionId}', description: 'Open specific session' },
            { route: 'lucide://search?q={query}', description: 'Search conversations' },
            { route: 'lucide://knowledge', description: 'Open Knowledge Base' },
            { route: 'lucide://knowledge/upload', description: 'Open document upload dialog' },
            { route: 'lucide://profile', description: 'Open user profile' },
            { route: 'lucide://profile/{profileId}', description: 'Switch to specific agent profile' }
        ];
    }

    // ========================================
    // Navigation Handlers
    // ========================================

    async _focusMainWindow() {
        const askWindow = this._getAskWindow();
        if (askWindow) {
            if (askWindow.isMinimized()) {
                askWindow.restore();
            }
            askWindow.focus();
            askWindow.show();
            return { action: 'focus', window: 'ask' };
        }
        return { action: 'focus', error: 'No window available' };
    }

    async _navigateToChat(params = {}) {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'chat', params });
            return { action: 'navigate', view: 'chat' };
        }
        return { error: 'Window not available' };
    }

    async _startNewChat() {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:action', { action: 'new-chat' });
            return { action: 'new-chat' };
        }
        return { error: 'Window not available' };
    }

    async _openChatSession(sessionId) {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'chat', sessionId });
            return { action: 'open-session', sessionId };
        }
        return { error: 'Window not available' };
    }

    async _navigateToListen() {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'listen' });
            return { action: 'navigate', view: 'listen' };
        }
        return { error: 'Window not available' };
    }

    async _startListening() {
        await this._focusMainWindow();

        // Use listenService to start listening
        try {
            const listenService = require('../../listen/listenService');
            await listenService.startListening();
            return { action: 'listen-start', success: true };
        } catch (error) {
            return { action: 'listen-start', error: error.message };
        }
    }

    async _stopListening() {
        try {
            const listenService = require('../../listen/listenService');
            await listenService.stopListening();
            return { action: 'listen-stop', success: true };
        } catch (error) {
            return { action: 'listen-stop', error: error.message };
        }
    }

    async _navigateToSettings(params = {}) {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'settings', section: params.section });
            return { action: 'navigate', view: 'settings', section: params.section };
        }
        return { error: 'Window not available' };
    }

    async _openSession(sessionId) {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'session', sessionId });
            return { action: 'open-session', sessionId };
        }
        return { error: 'Window not available' };
    }

    async _performSearch(query) {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:action', { action: 'search', query });
            return { action: 'search', query };
        }
        return { error: 'Window not available' };
    }

    async _navigateToKnowledge() {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'knowledge' });
            return { action: 'navigate', view: 'knowledge' };
        }
        return { error: 'Window not available' };
    }

    async _openKnowledgeUpload() {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:action', { action: 'knowledge-upload' });
            return { action: 'knowledge-upload' };
        }
        return { error: 'Window not available' };
    }

    async _navigateToProfile() {
        await this._focusMainWindow();
        const askWindow = this._getAskWindow();
        if (askWindow) {
            askWindow.webContents.send('deep-link:navigate', { view: 'profile' });
            return { action: 'navigate', view: 'profile' };
        }
        return { error: 'Window not available' };
    }

    async _switchProfile(profileId) {
        await this._focusMainWindow();

        try {
            const agentProfileService = require('./agentProfileService');
            await agentProfileService.setActiveProfile(profileId);

            const askWindow = this._getAskWindow();
            if (askWindow) {
                askWindow.webContents.send('deep-link:action', { action: 'profile-switched', profileId });
            }
            return { action: 'switch-profile', profileId, success: true };
        } catch (error) {
            return { action: 'switch-profile', profileId, error: error.message };
        }
    }

    /**
     * Get the Ask window reference
     * @returns {BrowserWindow|null}
     * @private
     */
    _getAskWindow() {
        if (this.windowManager && this.windowManager.windowPool) {
            return this.windowManager.windowPool.get('ask');
        }

        // Fallback: try to find by getAllWindows
        const windows = BrowserWindow.getAllWindows();
        return windows.find(w => !w.isDestroyed()) || null;
    }
}

// Singleton instance
const deepLinkService = new DeepLinkService();

module.exports = deepLinkService;
