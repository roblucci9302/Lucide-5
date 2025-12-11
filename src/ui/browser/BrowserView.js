import { html, css, LitElement } from '../../ui/assets/lit-core-2.7.4.min.js';

/**
 * BrowserView - Composant navigateur web intégré pour Lucide
 *
 * Fonctionnalités :
 * - Navigation web complète (back, forward, refresh, stop)
 * - Barre d'URL avec validation et autocomplétion HTTPS
 * - Contrôles de zoom (in, out, reset)
 * - DevTools intégrés
 * - Find in Page (recherche dans la page)
 * - Gestionnaire de téléchargements
 * - Gestion sécurité (indicateur HTTPS)
 * - Favicon dynamique
 * - Historique de navigation
 * - Raccourcis clavier (Cmd+F, Cmd+Opt+I, Cmd+/-, Cmd+0)
 */
export class BrowserView extends LitElement {
    static properties = {
        currentUrl: { type: String },
        urlInputValue: { type: String },
        webviewLoading: { type: Boolean },
        browserError: { type: Object },
        pageTitle: { type: String },
        zoomLevel: { type: Number },
        devToolsOpen: { type: Boolean },
        findInPageOpen: { type: Boolean },
        findQuery: { type: String },
        findResults: { type: Object },
        currentFavicon: { type: String },
        isSecure: { type: Boolean },
        downloadInProgress: { type: Object },
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: transform var(--transition-base) var(--easing-smooth-out),
                        opacity var(--transition-base) var(--easing-ease-out);
            will-change: transform, opacity;
        }

        :host(.hiding) {
            animation: slideUpEnhanced var(--animation-base) var(--easing-smooth-in) forwards;
        }

        :host(.showing) {
            animation: slideDownEnhanced 350ms var(--easing-elastic) forwards;
        }

        :host(.hidden) {
            opacity: 0;
            transform: translateY(-150%) scale(0.85);
            pointer-events: none;
        }

        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        .browser-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            outline: 0.5px rgba(255, 255, 255, 0.3) solid;
            outline-offset: -1px;
            backdrop-filter: blur(1px);
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
        }

        .browser-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            filter: blur(10px);
            z-index: -1;
        }

        /* Barre de navigation */
        .browser-navigation-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--color-white-10);
            height: 44px;
            flex-shrink: 0;
        }

        .nav-button {
            background: var(--color-white-10);
            border: none;
            border-radius: var(--radius-md);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.9);
            transition: all 0.2s ease;
        }

        .nav-button:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
        }

        .nav-button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .close-browser-btn {
            background: rgba(255, 80, 80, 0.2);
        }

        .close-browser-btn:hover {
            background: rgba(255, 80, 80, 0.3);
        }

        .url-input-with-icons {
            flex: 1;
            position: relative;
        }

        .url-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-md);
            padding: 6px 12px;
            padding-left: 32px;
            padding-right: 32px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.9);
            font-family: 'SF Mono', 'Menlo', monospace;
            outline: none;
            transition: all 0.2s;
            cursor: text;
            user-select: text;
        }

        .url-input:hover {
            background: rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .url-input:focus {
            background: var(--color-black-40);
            border-color: rgba(100, 150, 255, 0.6);
            box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.2);
        }

        /* Favicon */
        .favicon-container {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .favicon {
            width: 16px;
            height: 16px;
            border-radius: 2px;
        }

        .favicon-placeholder {
            width: 16px;
            height: 16px;
            background: var(--color-white-10);
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
        }

        /* Security Indicator */
        .security-indicator {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .security-indicator.secure {
            color: rgba(80, 200, 120, 0.9);
        }

        .security-indicator.insecure {
            color: rgba(255, 180, 50, 0.9);
        }

        /* Zoom Controls */
        .zoom-controls {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .zoom-level {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            min-width: 40px;
            text-align: center;
            cursor: pointer;
        }

        .zoom-level:hover {
            color: rgba(255, 255, 255, 0.9);
        }

        /* DevTools Button */
        .devtools-button {
            background: rgba(255, 180, 50, 0.15);
            border: 1px solid rgba(255, 180, 50, 0.3);
        }

        .devtools-button:hover:not(:disabled) {
            background: rgba(255, 180, 50, 0.25);
            border-color: rgba(255, 180, 50, 0.5);
        }

        .devtools-button.active {
            background: rgba(255, 180, 50, 0.3);
            border-color: rgba(255, 180, 50, 0.6);
        }

        /* Webview */
        .browser-webview {
            flex: 1;
            width: 100%;
            height: 100%;
            min-height: 0;
            border: none;
            background: white;
        }

        /* Loading indicator */
        .loading-indicator {
            position: absolute;
            top: 44px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            z-index: 100;
            backdrop-filter: blur(4px);
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-top-color: rgba(100, 150, 255, 0.8);
            border-radius: 50%;
            animation: spin var(--animation-slower) linear infinite;
        }

        .loading-text {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            font-weight: 500;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Error display */
        .browser-error {
            position: absolute;
            top: 44px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(20, 20, 30, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            z-index: 100;
            padding: 32px;
            backdrop-filter: blur(8px);
        }

        .error-icon {
            width: 64px;
            height: 64px;
            background: rgba(255, 80, 80, 0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
        }

        .error-icon svg {
            width: 32px;
            height: 32px;
            stroke: rgba(255, 80, 80, 0.9);
            stroke-width: 2;
        }

        .error-title {
            color: rgba(255, 255, 255, 0.95);
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .error-message {
            color: rgba(255, 255, 255, 0.7);
            font-size: 13px;
            text-align: center;
            max-width: 400px;
            line-height: 1.5;
        }

        .error-code {
            color: rgba(255, 255, 255, 0.5);
            font-size: 11px;
            font-family: 'SF Mono', 'Menlo', monospace;
            margin-top: 8px;
        }

        .error-retry-btn {
            margin-top: 16px;
            background: rgba(100, 150, 255, 0.2);
            border: 1px solid rgba(100, 150, 255, 0.4);
            color: rgba(255, 255, 255, 0.9);
            padding: 8px 20px;
            border-radius: var(--radius-md);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .error-retry-btn:hover {
            background: rgba(100, 150, 255, 0.3);
            border-color: rgba(100, 150, 255, 0.6);
        }

        /* Find in Page Bar */
        .find-bar {
            position: absolute;
            top: 44px;
            right: 12px;
            background: rgba(30, 30, 40, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-md);
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 200;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        }

        .find-input {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-md);
            padding: 4px 8px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.9);
            width: 200px;
            outline: none;
            cursor: text;
            user-select: text;
        }

        .find-input:focus {
            border-color: rgba(100, 150, 255, 0.6);
            box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.2);
        }

        .find-results {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            min-width: 50px;
        }

        .find-nav-button {
            background: var(--color-white-10);
            border: none;
            border-radius: 4px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.8);
            transition: all 0.15s;
        }

        .find-nav-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .find-close-button {
            background: rgba(255, 80, 80, 0.2);
            border: none;
            border-radius: 4px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.9);
            transition: all 0.15s;
        }

        .find-close-button:hover {
            background: rgba(255, 80, 80, 0.3);
        }

        /* Download Popup */
        .download-popup {
            position: absolute;
            bottom: 16px;
            right: 16px;
            background: rgba(30, 30, 40, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 16px;
            min-width: 320px;
            max-width: 400px;
            z-index: 300;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
        }

        .download-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .download-icon {
            width: 40px;
            height: 40px;
            background: rgba(100, 150, 255, 0.2);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .download-icon svg {
            width: 20px;
            height: 20px;
            stroke: rgba(100, 150, 255, 0.9);
        }

        .download-info {
            flex: 1;
            min-width: 0;
        }

        .download-filename {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .download-size {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 2px;
        }

        .download-progress {
            width: 100%;
            height: 4px;
            background: var(--color-white-10);
            border-radius: 2px;
            overflow: hidden;
            margin: 12px 0;
        }

        .download-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, rgba(100, 150, 255, 0.8), rgba(100, 200, 255, 0.8));
            border-radius: 2px;
            transition: width 0.3s ease;
        }

        .download-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .download-btn {
            flex: 1;
            padding: 8px 16px;
            border-radius: var(--radius-md);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        .download-btn.primary {
            background: rgba(100, 150, 255, 0.3);
            border: 1px solid rgba(100, 150, 255, 0.5);
            color: rgba(255, 255, 255, 0.9);
        }

        .download-btn.primary:hover {
            background: rgba(100, 150, 255, 0.4);
            border-color: rgba(100, 150, 255, 0.7);
        }

        .download-btn.secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.7);
        }

        .download-btn.secondary:hover {
            background: var(--color-white-10);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .download-status {
            font-size: 12px;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .download-status.success {
            color: rgba(80, 200, 120, 0.9);
        }

        .download-status.error {
            color: rgba(255, 80, 80, 0.9);
        }
    `;

    constructor() {
        super();
        this.currentUrl = '';
        this.urlInputValue = '';
        this.browserHistory = [];
        this.browserHistoryIndex = -1;
        this.webviewLoading = false;
        this.browserError = null;
        this.pageTitle = '';
        this.webviewListeners = [];

        // Fonctionnalités avancées
        this.zoomLevel = 100;
        this.devToolsOpen = false;
        this.findInPageOpen = false;
        this.findQuery = '';
        this.findResults = { activeMatchOrdinal: 0, matches: 0 };
        this.currentFavicon = '';
        this.isSecure = false;
        this.downloadInProgress = null;

        // Bind methods
        this.handleBrowserBack = this.handleBrowserBack.bind(this);
        this.handleBrowserForward = this.handleBrowserForward.bind(this);
        this.handleBrowserRefresh = this.handleBrowserRefresh.bind(this);
        this.handleBrowserStop = this.handleBrowserStop.bind(this);
        this.handleUrlInput = this.handleUrlInput.bind(this);
        this.handleUrlKeydown = this.handleUrlKeydown.bind(this);
        this.handleCloseBrowser = this.handleCloseBrowser.bind(this);
        this.handleToggleDevTools = this.handleToggleDevTools.bind(this);
        this.handleZoomIn = this.handleZoomIn.bind(this);
        this.handleZoomOut = this.handleZoomOut.bind(this);
        this.handleZoomReset = this.handleZoomReset.bind(this);
        this.handleOpenFindInPage = this.handleOpenFindInPage.bind(this);
        this.handleCloseFindInPage = this.handleCloseFindInPage.bind(this);
        this.handleFindQueryChange = this.handleFindQueryChange.bind(this);
        this.handleFindNext = this.handleFindNext.bind(this);
        this.handleFindPrevious = this.handleFindPrevious.bind(this);
        this.handleDownloadAccept = this.handleDownloadAccept.bind(this);
        this.handleDownloadCancel = this.handleDownloadCancel.bind(this);
        this.handleDownloadComplete = this.handleDownloadComplete.bind(this);
        this.handleDownloadError = this.handleDownloadError.bind(this);
        this.handleBrowserKeydown = this.handleBrowserKeydown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        console.log('[BrowserView] Connected');

        // Setup keyboard shortcuts
        document.addEventListener('keydown', this.handleBrowserKeydown);

        // Listen for navigation requests from main process
        if (window.api && window.api.browserView) {
            this._navigationListener = (event, url) => {
                console.log('[BrowserView] Received navigation request:', url);
                if (url) {
                    this.navigateTo(url);
                }
            };
            window.api.browserView.onNavigateTo(this._navigationListener);
        }

        // Setup webview listeners après le premier render
        this.updateComplete.then(() => {
            this.setupWebviewListeners();
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        console.log('[BrowserView] Disconnected');

        // Cleanup
        document.removeEventListener('keydown', this.handleBrowserKeydown);

        // Remove IPC listener
        if (window.api && window.api.browserView && this._navigationListener) {
            window.api.browserView.removeOnNavigateTo(this._navigationListener);
        }

        this.cleanupWebviewListeners();
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // Re-setup webview listeners when URL changes
        if (changedProperties.has('currentUrl') && this.currentUrl) {
            this.updateComplete.then(() => {
                this.setupWebviewListeners();
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // NAVIGATION METHODS
    // ═══════════════════════════════════════════════════════════

    async navigateTo(url) {
        console.log('[BrowserView] Navigating to:', url);
        this.currentUrl = url;
        this.urlInputValue = url;
        this.browserError = null;

        // Add to history
        if (this.browserHistoryIndex === -1 || url !== this.browserHistory[this.browserHistoryIndex]) {
            this.browserHistory = this.browserHistory.slice(0, this.browserHistoryIndex + 1);
            this.browserHistory.push(url);
            this.browserHistoryIndex = this.browserHistory.length - 1;
        }

        // Update security indicator
        this.isSecure = url.startsWith('https://');

        this.requestUpdate();
    }

    handleBrowserBack() {
        if (this.browserHistoryIndex > 0) {
            this.browserHistoryIndex--;
            this.currentUrl = this.browserHistory[this.browserHistoryIndex];
            this.urlInputValue = this.currentUrl;
            console.log('[BrowserView] Going back to:', this.currentUrl);
            this.requestUpdate();
        } else {
            console.log('[BrowserView] At start of history, cannot go back');
        }
    }

    handleBrowserForward() {
        if (this.browserHistoryIndex < this.browserHistory.length - 1) {
            this.browserHistoryIndex++;
            this.currentUrl = this.browserHistory[this.browserHistoryIndex];
            this.urlInputValue = this.currentUrl;
            console.log('[BrowserView] Going forward to:', this.currentUrl);
            this.requestUpdate();
        }
    }

    handleBrowserRefresh() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            console.log('[BrowserView] Refreshing webview');
            webview.reload();
        }
    }

    handleBrowserStop() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            console.log('[BrowserView] Stopping webview loading');
            webview.stop();
            this.webviewLoading = false;
            this.requestUpdate();
        }
    }

    async handleCloseBrowser() {
        console.log('[BrowserView] Closing browser');

        try {
            if (window.api && window.api.browserView) {
                await window.api.browserView.closeBrowser();
                console.log('[BrowserView] Browser closed successfully');
            } else {
                console.error('[BrowserView] window.api.browserView not available');
            }
        } catch (error) {
            console.error('[BrowserView] Error closing browser:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // URL INPUT METHODS
    // ═══════════════════════════════════════════════════════════

    handleUrlInput(e) {
        this.urlInputValue = e.target.value;
    }

    handleUrlKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const url = this.validateAndFormatUrl(this.urlInputValue);

            if (url) {
                console.log('[BrowserView] Navigating to URL from input:', url);
                this.navigateTo(url);
            } else {
                console.warn('[BrowserView] Invalid URL entered:', this.urlInputValue);
                alert('URL invalide. Veuillez entrer une URL valide (ex: google.com ou https://google.com)');
            }
        }
    }

    validateAndFormatUrl(url) {
        if (!url || url.trim() === '') {
            return null;
        }

        let formattedUrl = url.trim();

        // Add https:// if protocol is missing
        if (!formattedUrl.match(/^https?:\/\//i)) {
            formattedUrl = 'https://' + formattedUrl;
        }

        // Validate URL
        try {
            new URL(formattedUrl);
            return formattedUrl;
        } catch (error) {
            console.error('[BrowserView] Invalid URL:', formattedUrl, error);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZOOM METHODS
    // ═══════════════════════════════════════════════════════════

    handleZoomIn() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            this.zoomLevel = Math.min(300, this.zoomLevel + 10);
            const zoomFactor = this.zoomLevel / 100;
            webview.setZoomFactor(zoomFactor);
            console.log('[BrowserView] Zoom in to', this.zoomLevel + '%');
            this.requestUpdate();
        }
    }

    handleZoomOut() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            this.zoomLevel = Math.max(25, this.zoomLevel - 10);
            const zoomFactor = this.zoomLevel / 100;
            webview.setZoomFactor(zoomFactor);
            console.log('[BrowserView] Zoom out to', this.zoomLevel + '%');
            this.requestUpdate();
        }
    }

    handleZoomReset() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            this.zoomLevel = 100;
            webview.setZoomFactor(1.0);
            console.log('[BrowserView] Zoom reset to 100%');
            this.requestUpdate();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DEVTOOLS METHODS
    // ═══════════════════════════════════════════════════════════

    handleToggleDevTools() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            if (this.devToolsOpen) {
                console.log('[BrowserView] Closing DevTools');
                webview.closeDevTools();
                this.devToolsOpen = false;
            } else {
                console.log('[BrowserView] Opening DevTools');
                webview.openDevTools();
                this.devToolsOpen = true;
            }
            this.requestUpdate();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FIND IN PAGE METHODS
    // ═══════════════════════════════════════════════════════════

    handleOpenFindInPage() {
        console.log('[BrowserView] Opening Find in Page');
        this.findInPageOpen = true;
        this.findQuery = '';
        this.findResults = { activeMatchOrdinal: 0, matches: 0 };
        this.requestUpdate();

        // Focus the search input after render
        this.updateComplete.then(() => {
            const findInput = this.shadowRoot?.querySelector('.find-input');
            if (findInput) {
                findInput.focus();
            }
        });
    }

    handleCloseFindInPage() {
        console.log('[BrowserView] Closing Find in Page');
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview) {
            webview.stopFindInPage('clearSelection');
        }
        this.findInPageOpen = false;
        this.findQuery = '';
        this.findResults = { activeMatchOrdinal: 0, matches: 0 };
        this.requestUpdate();
    }

    handleFindQueryChange(e) {
        this.findQuery = e.target.value;
        const webview = this.shadowRoot?.querySelector('webview');

        if (webview && this.findQuery) {
            this.findRequestId = webview.findInPage(this.findQuery, {
                forward: true,
                findNext: false
            });
            console.log('[BrowserView] Finding:', this.findQuery);
        } else if (webview) {
            webview.stopFindInPage('clearSelection');
            this.findResults = { activeMatchOrdinal: 0, matches: 0 };
        }
        this.requestUpdate();
    }

    handleFindNext() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview && this.findQuery) {
            this.findRequestId = webview.findInPage(this.findQuery, {
                forward: true,
                findNext: true
            });
            console.log('[BrowserView] Find next');
        }
    }

    handleFindPrevious() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview && this.findQuery) {
            this.findRequestId = webview.findInPage(this.findQuery, {
                forward: false,
                findNext: true
            });
            console.log('[BrowserView] Find previous');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DOWNLOAD METHODS
    // ═══════════════════════════════════════════════════════════

    handleDownloadAccept() {
        if (this.downloadInProgress && this.downloadInProgress.callback) {
            console.log('[BrowserView] Download accepted:', this.downloadInProgress.filename);
            this.downloadInProgress.callback(true);
        }
    }

    handleDownloadCancel() {
        if (this.downloadInProgress && this.downloadInProgress.callback) {
            console.log('[BrowserView] Download cancelled');
            this.downloadInProgress.callback(false);
            this.downloadInProgress = null;
            this.requestUpdate();
        }
    }

    handleDownloadComplete() {
        console.log('[BrowserView] Download complete');
        if (this.downloadInProgress) {
            this.downloadInProgress.status = 'completed';
            this.requestUpdate();
            setTimeout(() => {
                this.downloadInProgress = null;
                this.requestUpdate();
            }, 3000);
        }
    }

    handleDownloadError(errorMessage) {
        console.error('[BrowserView] Download error:', errorMessage);
        if (this.downloadInProgress) {
            this.downloadInProgress.status = 'error';
            this.downloadInProgress.error = errorMessage;
            this.requestUpdate();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════

    handleBrowserKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? e.metaKey : e.ctrlKey;

        // Cmd+F : Find in Page
        if (cmdKey && e.key === 'f') {
            e.preventDefault();
            if (!this.findInPageOpen) {
                this.handleOpenFindInPage();
            }
            return;
        }

        // Escape : Close Find in Page
        if (e.key === 'Escape' && this.findInPageOpen) {
            e.preventDefault();
            this.handleCloseFindInPage();
            return;
        }

        // Cmd+Option+I : Toggle DevTools
        if (cmdKey && e.altKey && e.key === 'i') {
            e.preventDefault();
            this.handleToggleDevTools();
            return;
        }

        // Cmd+Plus or Cmd+= : Zoom In
        if (cmdKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.handleZoomIn();
            return;
        }

        // Cmd+Minus : Zoom Out
        if (cmdKey && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            this.handleZoomOut();
            return;
        }

        // Cmd+0 : Reset Zoom
        if (cmdKey && e.key === '0') {
            e.preventDefault();
            this.handleZoomReset();
            return;
        }

        // Enter in Find input : Find Next
        if (e.key === 'Enter' && this.findInPageOpen) {
            e.preventDefault();
            if (e.shiftKey) {
                this.handleFindPrevious();
            } else {
                this.handleFindNext();
            }
            return;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WEBVIEW LISTENERS
    // ═══════════════════════════════════════════════════════════

    setupWebviewListeners() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (!webview) {
            console.warn('[BrowserView] Webview not found for listener setup');
            return;
        }

        console.log('[BrowserView] Setting up webview event listeners');

        // Cleanup old listeners
        this.cleanupWebviewListeners();

        // did-navigate - Main navigation synchronization
        const didNavigateHandler = (e) => {
            console.log('[BrowserView] did-navigate:', e.url);
            this.currentUrl = e.url;
            this.urlInputValue = e.url;
            this.browserError = null;
            this.isSecure = e.url.startsWith('https://');

            // Add to history
            if (this.browserHistoryIndex === -1 || e.url !== this.browserHistory[this.browserHistoryIndex]) {
                this.browserHistory = this.browserHistory.slice(0, this.browserHistoryIndex + 1);
                this.browserHistory.push(e.url);
                this.browserHistoryIndex = this.browserHistory.length - 1;
            }

            this.requestUpdate();
        };
        webview.addEventListener('did-navigate', didNavigateHandler);
        this.webviewListeners.push({ event: 'did-navigate', handler: didNavigateHandler });

        // did-navigate-in-page - SPA navigation
        const didNavigateInPageHandler = (e) => {
            console.log('[BrowserView] did-navigate-in-page:', e.url);
            this.currentUrl = e.url;
            this.urlInputValue = e.url;
            this.requestUpdate();
        };
        webview.addEventListener('did-navigate-in-page', didNavigateInPageHandler);
        this.webviewListeners.push({ event: 'did-navigate-in-page', handler: didNavigateInPageHandler });

        // did-start-loading
        const didStartLoadingHandler = () => {
            console.log('[BrowserView] did-start-loading');
            this.webviewLoading = true;
            this.browserError = null;
            this.requestUpdate();
        };
        webview.addEventListener('did-start-loading', didStartLoadingHandler);
        this.webviewListeners.push({ event: 'did-start-loading', handler: didStartLoadingHandler });

        // did-stop-loading
        const didStopLoadingHandler = () => {
            console.log('[BrowserView] did-stop-loading');
            this.webviewLoading = false;
            this.requestUpdate();
        };
        webview.addEventListener('did-stop-loading', didStopLoadingHandler);
        this.webviewListeners.push({ event: 'did-stop-loading', handler: didStopLoadingHandler });

        // did-fail-load - Error handling
        const didFailLoadHandler = (e) => {
            console.error('[BrowserView] did-fail-load:', e.errorCode, e.errorDescription);

            // Ignore errors -3 (aborted) and -27 (blocked by client)
            if (e.errorCode === -3 || e.errorCode === -27) {
                console.log('[BrowserView] Ignoring expected error:', e.errorCode);
                return;
            }

            this.browserError = {
                code: e.errorCode,
                description: e.errorDescription,
                url: e.validatedURL
            };
            this.webviewLoading = false;
            this.requestUpdate();
        };
        webview.addEventListener('did-fail-load', didFailLoadHandler);
        this.webviewListeners.push({ event: 'did-fail-load', handler: didFailLoadHandler });

        // page-title-updated
        const pageTitleUpdatedHandler = (e) => {
            console.log('[BrowserView] page-title-updated:', e.title);
            this.pageTitle = e.title;
            this.requestUpdate();
        };
        webview.addEventListener('page-title-updated', pageTitleUpdatedHandler);
        this.webviewListeners.push({ event: 'page-title-updated', handler: pageTitleUpdatedHandler });

        // page-favicon-updated
        const pageFaviconUpdatedHandler = (e) => {
            if (e.favicons && e.favicons.length > 0) {
                console.log('[BrowserView] page-favicon-updated:', e.favicons[0]);
                this.currentFavicon = e.favicons[0];
                this.requestUpdate();
            }
        };
        webview.addEventListener('page-favicon-updated', pageFaviconUpdatedHandler);
        this.webviewListeners.push({ event: 'page-favicon-updated', handler: pageFaviconUpdatedHandler });

        // found-in-page - Find results
        const foundInPageHandler = (e) => {
            if (e.result) {
                this.findResults = {
                    activeMatchOrdinal: e.result.activeMatchOrdinal,
                    matches: e.result.matches
                };
                this.requestUpdate();
            }
        };
        webview.addEventListener('found-in-page', foundInPageHandler);
        this.webviewListeners.push({ event: 'found-in-page', handler: foundInPageHandler });

        console.log('[BrowserView] Webview listeners setup complete. Total listeners:', this.webviewListeners.length);
    }

    cleanupWebviewListeners() {
        const webview = this.shadowRoot?.querySelector('webview');
        if (webview && this.webviewListeners.length > 0) {
            console.log('[BrowserView] Cleaning up webview listeners');
            this.webviewListeners.forEach(({ event, handler }) => {
                webview.removeEventListener(event, handler);
            });
            this.webviewListeners = [];
        }
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    render() {
        const canGoBack = this.browserHistoryIndex > 0;
        const canGoForward = this.browserHistoryIndex < this.browserHistory.length - 1;

        return html`
            <div class="browser-container">
                <!-- Navigation Bar -->
                <div class="browser-navigation-bar">
                    <button class="nav-button" ?disabled=${!canGoBack} @click=${this.handleBrowserBack} title="Retour">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <button class="nav-button" ?disabled=${!canGoForward} @click=${this.handleBrowserForward} title="Avancer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>

                    <!-- Refresh / Stop Button -->
                    ${this.webviewLoading
                        ? html`
                            <button class="nav-button" @click=${this.handleBrowserStop} title="Arrêter">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="6" y="6" width="12" height="12" rx="1"/>
                                </svg>
                            </button>
                        `
                        : html`
                            <button class="nav-button" @click=${this.handleBrowserRefresh} title="Recharger">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M23 4v6h-6M1 20v-6h6"/>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                </svg>
                            </button>
                        `
                    }

                    <!-- URL Input with Favicon and Security Indicator -->
                    <div class="url-input-with-icons">
                        <!-- Favicon -->
                        <div class="favicon-container">
                            ${this.currentFavicon
                                ? html`<img src="${this.currentFavicon}" class="favicon" />`
                                : html`
                                    <div class="favicon-placeholder">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"/>
                                        </svg>
                                    </div>
                                `
                            }
                        </div>

                        <input
                            type="text"
                            class="url-input"
                            .value=${this.urlInputValue || this.currentUrl}
                            @input=${this.handleUrlInput}
                            @keydown=${this.handleUrlKeydown}
                            placeholder="Entrez une URL..."
                            title="Appuyez sur Entrée pour naviguer"
                        />

                        <!-- Security Indicator -->
                        ${this.currentUrl ? html`
                            <div class="security-indicator ${this.isSecure ? 'secure' : 'insecure'}" title="${this.isSecure ? 'Connexion sécurisée' : 'Connexion non sécurisée'}">
                                ${this.isSecure
                                    ? html`
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                        </svg>
                                    `
                                    : html`
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                            <line x1="12" y1="9" x2="12" y2="13"/>
                                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                                        </svg>
                                    `
                                }
                            </div>
                        ` : ''}
                    </div>

                    <!-- Zoom Controls -->
                    <div class="zoom-controls">
                        <button class="nav-button" @click=${this.handleZoomOut} title="Zoom arrière (Cmd -)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                        <div class="zoom-level" @click=${this.handleZoomReset} title="Réinitialiser zoom (Cmd 0)">
                            ${this.zoomLevel}%
                        </div>
                        <button class="nav-button" @click=${this.handleZoomIn} title="Zoom avant (Cmd +)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- DevTools Button -->
                    <button
                        class="nav-button devtools-button ${this.devToolsOpen ? 'active' : ''}"
                        @click=${this.handleToggleDevTools}
                        title="Outils de développement (Cmd+Opt+I)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="16 18 22 12 16 6"/>
                            <polyline points="8 6 2 12 8 18"/>
                        </svg>
                    </button>

                    <button class="nav-button close-browser-btn" @click=${this.handleCloseBrowser} title="Revenir à Ask">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <!-- Webview -->
                <webview
                    src="${this.currentUrl}"
                    class="browser-webview"
                    partition="persist:lucide-browser"
                    allowpopups
                ></webview>

                <!-- Loading Indicator -->
                ${this.webviewLoading && !this.browserError ? html`
                    <div class="loading-indicator">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Chargement de la page...</div>
                    </div>
                ` : ''}

                <!-- Error Display -->
                ${this.browserError ? html`
                    <div class="browser-error">
                        <div class="error-icon">
                            <svg viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <div class="error-title">Impossible de charger la page</div>
                        <div class="error-message">${this.browserError.description || 'Une erreur est survenue lors du chargement de la page.'}</div>
                        <div class="error-code">Code d'erreur: ${this.browserError.code}</div>
                        <button class="error-retry-btn" @click=${this.handleBrowserRefresh}>Réessayer</button>
                    </div>
                ` : ''}

                <!-- Find in Page Bar -->
                ${this.findInPageOpen ? html`
                    <div class="find-bar">
                        <input
                            type="text"
                            class="find-input"
                            .value=${this.findQuery}
                            @input=${this.handleFindQueryChange}
                            placeholder="Rechercher dans la page..."
                        />
                        <div class="find-results">
                            ${this.findResults.matches > 0
                                ? `${this.findResults.activeMatchOrdinal}/${this.findResults.matches}`
                                : '0/0'
                            }
                        </div>
                        <button class="find-nav-button" @click=${this.handleFindPrevious} title="Précédent">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <button class="find-nav-button" @click=${this.handleFindNext} title="Suivant">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                        <button class="find-close-button" @click=${this.handleCloseFindInPage} title="Fermer">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}

                <!-- Download Popup -->
                ${this.downloadInProgress ? html`
                    <div class="download-popup">
                        <div class="download-header">
                            <div class="download-icon">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </div>
                            <div class="download-info">
                                <div class="download-filename">${this.downloadInProgress.filename}</div>
                                <div class="download-size">${this.downloadInProgress.size || 'Taille inconnue'}</div>
                            </div>
                        </div>

                        ${this.downloadInProgress.status === 'pending' ? html`
                            <div class="download-actions">
                                <button class="download-btn secondary" @click=${this.handleDownloadCancel}>Annuler</button>
                                <button class="download-btn primary" @click=${this.handleDownloadAccept}>Télécharger</button>
                            </div>
                        ` : ''}

                        ${this.downloadInProgress.status === 'downloading' ? html`
                            <div class="download-progress">
                                <div class="download-progress-bar" style="width: ${this.downloadInProgress.progress || 0}%"></div>
                            </div>
                        ` : ''}

                        ${this.downloadInProgress.status === 'completed' ? html`
                            <div class="download-status success">
                                ✓ Téléchargement terminé
                            </div>
                        ` : ''}

                        ${this.downloadInProgress.status === 'error' ? html`
                            <div class="download-status error">
                                ✗ ${this.downloadInProgress.error || 'Erreur de téléchargement'}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('browser-view', BrowserView);
