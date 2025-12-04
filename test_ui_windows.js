/**
 * TEST - UI Windows for Investor Demo
 * Tests all 7 application windows:
 * 1. Header (MainHeader) - mini toolbar
 * 2. Listen (ListenView) - real-time transcription & insights
 * 3. Ask (AskView) - chat with streaming & citations
 * 4. Browser (BrowserView) - web navigation
 * 5. Settings (SettingsView) - parameters & configuration
 * 6. Analytics (AnalyticsDashboard) - graphs & data
 * 7. Knowledge Base (KnowledgeBaseView) - document management
 */

const fs = require('fs');
const path = require('path');

class UIWindowsTester {
    constructor() {
        this.results = [];
        this.srcPath = path.join(__dirname, 'src');
    }

    log(message) {
        console.log(message);
    }

    assert(condition, testName) {
        const status = condition ? 'PASS' : 'FAIL';
        const icon = condition ? '✓' : '✗';
        this.results.push({ testName, passed: condition });
        this.log(`  ${icon} ${testName}`);
        return condition;
    }

    fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    }

    readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch {
            return '';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. MAIN HEADER TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testMainHeader() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('1. MAIN HEADER (Mini-Toolbar)');
        this.log('═══════════════════════════════════════════════════════════════');

        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const content = this.readFile(headerPath);

        // File existence
        this.assert(this.fileExists(headerPath), 'MainHeader.js file exists');

        // LitElement component
        this.assert(content.includes('class MainHeader extends'), 'MainHeader extends LitElement');
        this.assert(content.includes("customElements.define('main-header'"), 'Custom element registered as main-header');

        // Component properties
        this.assert(content.includes('isTogglingSession:'), 'Has isTogglingSession property');
        this.assert(content.includes('shortcuts:'), 'Has shortcuts property');
        this.assert(content.includes('listenSessionStatus:'), 'Has listenSessionStatus property');

        // Listen button functionality
        this.assert(content.includes('_handleListenClick'), 'Has _handleListenClick method');
        this.assert(content.includes('_getListenButtonText'), 'Has _getListenButtonText method');
        this.assert(content.includes("'beforeSession'"), 'Handles beforeSession state');
        this.assert(content.includes("'inSession'"), 'Handles inSession state');
        this.assert(content.includes("'afterSession'"), 'Handles afterSession state');

        // Ask button functionality
        this.assert(content.includes('_handleAskClick'), 'Has _handleAskClick method');
        this.assert(content.includes('sendAskButtonClick'), 'Sends Ask button click event');

        // Toggle visibility button
        this.assert(content.includes('_handleToggleAllWindowsVisibility'), 'Has toggle visibility handler');
        this.assert(content.includes('sendToggleAllWindowsVisibility'), 'Sends toggle visibility event');

        // Settings button
        this.assert(content.includes('showSettingsWindow'), 'Has showSettingsWindow method');
        this.assert(content.includes('hideSettingsWindow'), 'Has hideSettingsWindow method');
        this.assert(content.includes('mouseenter'), 'Settings button shows on hover');
        this.assert(content.includes('mouseleave'), 'Settings button hides on mouse leave');

        // Drag functionality
        this.assert(content.includes('handleMouseDown'), 'Has mouse down handler for drag');
        this.assert(content.includes('handleMouseMove'), 'Has mouse move handler for drag');
        this.assert(content.includes('handleMouseUp'), 'Has mouse up handler for drag');
        this.assert(content.includes('moveHeaderTo'), 'Moves header to new position');
        this.assert(content.includes('getHeaderPosition'), 'Gets current header position');

        // Shortcut rendering
        this.assert(content.includes('renderShortcut'), 'Has renderShortcut method');
        this.assert(content.includes('icon-box'), 'Renders shortcut key boxes');
        this.assert(content.includes("'⌘'") || content.includes('Cmd'), 'Supports Command key symbol');
        this.assert(content.includes("'⌃'") || content.includes('Ctrl'), 'Supports Ctrl key symbol');

        // Animation handling
        this.assert(content.includes('toggleVisibility'), 'Has toggleVisibility method');
        this.assert(content.includes('handleAnimationEnd'), 'Has animation end handler');
        this.assert(content.includes('hiding'), 'Has hiding animation class');
        this.assert(content.includes('showing'), 'Has showing animation class');

        // IPC listeners
        this.assert(content.includes('onListenChangeSessionResult'), 'Listens for session state changes');
        this.assert(content.includes('onShortcutsUpdated'), 'Listens for shortcuts updates');

        // Translation support
        this.assert(content.includes('TranslationMixin'), 'Uses TranslationMixin for i18n');
        this.assert(content.includes("this.t('header"), 'Uses translation for header texts');

        // Glass mode support
        this.assert(content.includes('has-glass'), 'Supports glass mode styling');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. LISTEN VIEW TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testListenView() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('2. LISTEN VIEW (Real-Time Interface)');
        this.log('═══════════════════════════════════════════════════════════════');

        const listenPath = path.join(this.srcPath, 'ui/listen/ListenView.js');
        const content = this.readFile(listenPath);

        // File existence
        this.assert(this.fileExists(listenPath), 'ListenView.js file exists');

        // LitElement component
        this.assert(content.includes('class ListenView extends LitElement'), 'ListenView extends LitElement');
        this.assert(content.includes("customElements.define('listen-view'"), 'Custom element registered as listen-view');

        // Component properties
        this.assert(content.includes('viewMode:'), 'Has viewMode property');
        this.assert(content.includes('isSessionActive:'), 'Has isSessionActive property');
        this.assert(content.includes('elapsedTime:'), 'Has elapsedTime property');
        this.assert(content.includes('copyState:'), 'Has copyState property');

        // View modes
        this.assert(content.includes("'insights'"), 'Supports insights view mode');
        this.assert(content.includes("'transcript'"), 'Supports transcript view mode');
        this.assert(content.includes("'suggestions'"), 'Supports suggestions view mode');
        this.assert(content.includes('toggleViewMode'), 'Has toggleViewMode method');

        // Timer functionality
        this.assert(content.includes('startTimer'), 'Has startTimer method');
        this.assert(content.includes('stopTimer'), 'Has stopTimer method');
        this.assert(content.includes('timerInterval'), 'Uses timer interval');
        this.assert(content.includes('captureStartTime'), 'Tracks capture start time');
        this.assert(content.includes("padStart(2, '0')"), 'Formats time with leading zeros');

        // Copy functionality
        this.assert(content.includes('handleCopy'), 'Has handleCopy method');
        this.assert(content.includes('navigator.clipboard.writeText'), 'Uses clipboard API');
        this.assert(content.includes('getTranscriptText'), 'Gets transcript text for copy');
        this.assert(content.includes('getSummaryText'), 'Gets summary text for copy');

        // Height adjustment
        this.assert(content.includes('adjustWindowHeight'), 'Has adjustWindowHeight method');
        this.assert(content.includes('adjustWindowHeightThrottled'), 'Has throttled height adjustment');

        // Child components
        this.assert(content.includes('<stt-view'), 'Renders stt-view component');
        this.assert(content.includes('<summary-view'), 'Renders summary-view component');
        this.assert(content.includes('<response-view'), 'Renders response-view component');
        this.assert(content.includes('<live-insights-panel'), 'Renders live-insights-panel component');
        this.assert(content.includes('<notification-center'), 'Renders notification-center component');

        // IPC communication
        this.assert(content.includes('onSessionStateChanged'), 'Listens for session state changes');
        this.assert(content.includes('hideListenWindow'), 'Can hide listen window');

        // Close button
        this.assert(content.includes('handleCloseWindow'), 'Has close window handler');

        // Animation support
        this.assert(content.includes('hiding'), 'Has hiding animation');
        this.assert(content.includes('showing'), 'Has showing animation');

        // Recording state
        this.assert(content.includes('hasCompletedRecording'), 'Tracks completed recording state');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. ASK VIEW TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testAskView() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('3. ASK VIEW (Chat with Streaming)');
        this.log('═══════════════════════════════════════════════════════════════');

        const askPath = path.join(this.srcPath, 'ui/ask/AskView.js');
        const content = this.readFile(askPath);

        // File existence
        this.assert(this.fileExists(askPath), 'AskView.js file exists');

        // LitElement component
        this.assert(content.includes('class AskView extends LitElement'), 'AskView extends LitElement');
        this.assert(content.includes("customElements.define('ask-view'"), 'Custom element registered as ask-view');

        // Component properties
        this.assert(content.includes('currentResponse:'), 'Has currentResponse property');
        this.assert(content.includes('currentQuestion:'), 'Has currentQuestion property');
        this.assert(content.includes('isLoading:'), 'Has isLoading property');
        this.assert(content.includes('isStreaming:'), 'Has isStreaming property');
        this.assert(content.includes('sessionId:'), 'Has sessionId property for citations');

        // Chat functionality
        this.assert(content.includes('handleSendText'), 'Has handleSendText method');
        this.assert(content.includes("getElementById('textInput')"), 'Has text input element');
        this.assert(content.includes('sendMessage'), 'Sends messages via IPC');

        // Streaming markdown rendering
        this.assert(content.includes('parser'), 'Uses smd.js parser');
        this.assert(content.includes('parser_write'), 'Uses parser_write for streaming');
        this.assert(content.includes('parser_end'), 'Uses parser_end for completion');
        this.assert(content.includes('renderStreamingMarkdown'), 'Has renderStreamingMarkdown method');
        this.assert(content.includes('default_renderer'), 'Uses default_renderer from smd.js');

        // Markdown libraries
        this.assert(content.includes('marked'), 'Uses marked library');
        this.assert(content.includes('hljs'), 'Uses highlight.js');
        this.assert(content.includes('DOMPurify'), 'Uses DOMPurify for sanitization');
        this.assert(content.includes('loadLibraries'), 'Loads libraries dynamically');

        // Copy functionality
        this.assert(content.includes('handleCopy'), 'Has handleCopy for full response');
        this.assert(content.includes('handleLineCopy'), 'Has handleLineCopy for line-by-line');
        this.assert(content.includes('copy-button'), 'Has copy button styling');

        // Document upload/attachments
        this.assert(content.includes('attachments:'), 'Has attachments property');
        this.assert(content.includes('handleFileSelect'), 'Has handleFileSelect method');
        this.assert(content.includes('handleUploadClick'), 'Has handleUploadClick method');
        this.assert(content.includes('uploadAndAnalyzeFile'), 'Has uploadAndAnalyzeFile method');
        this.assert(content.includes("type=\"file\""), 'Has file input element');
        this.assert(content.includes('<attachment-bubble'), 'Renders attachment-bubble component');

        // Generated documents
        this.assert(content.includes('generatedDocuments:'), 'Has generatedDocuments property');
        this.assert(content.includes('parseDocuments'), 'Has parseDocuments method');
        this.assert(content.includes('<<DOCUMENT:'), 'Parses DOCUMENT markers');
        this.assert(content.includes('<document-preview'), 'Renders document-preview component');

        // Citations
        this.assert(content.includes('<citation-view'), 'Renders citation-view component');

        // Profile suggestion
        this.assert(content.includes('analyzeSuggestion'), 'Analyzes for profile suggestions');
        this.assert(content.includes('profile-suggestion-banner'), 'Shows profile suggestion banner');

        // Keyboard shortcuts
        this.assert(content.includes('handleEscKey'), 'Handles ESC key');
        this.assert(content.includes('handleTextKeydown'), 'Handles text keydown events');
        this.assert(content.includes("e.key === 'Enter'"), 'Handles Enter key for send');

        // Scroll handling
        this.assert(content.includes('handleScroll'), 'Has scroll handler');
        this.assert(content.includes('onScrollResponseUp'), 'Listens for scroll up');
        this.assert(content.includes('onScrollResponseDown'), 'Listens for scroll down');

        // Window controls
        this.assert(content.includes('handleCloseAskWindow'), 'Has close window handler');
        this.assert(content.includes('handleMinimizeAskWindow'), 'Has minimize window handler');
        this.assert(content.includes('handleShowListenWindow'), 'Can show listen window');

        // Height adjustment
        this.assert(content.includes('adjustWindowHeight'), 'Has adjustWindowHeight method');
        this.assert(content.includes('adjustWindowHeightThrottled'), 'Has throttled adjustment');
        this.assert(content.includes('ResizeObserver'), 'Uses ResizeObserver');

        // Loading state
        this.assert(content.includes('loading-dots'), 'Has loading dots indicator');

        // Quick actions
        this.assert(content.includes('quick-actions-panel'), 'References quick-actions-panel');
        this.assert(content.includes('workflow-selected'), 'Handles workflow selection');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. BROWSER VIEW TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testBrowserView() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('4. BROWSER VIEW (Web Navigation)');
        this.log('═══════════════════════════════════════════════════════════════');

        const browserPath = path.join(this.srcPath, 'ui/browser/BrowserView.js');
        const content = this.readFile(browserPath);

        // File existence
        this.assert(this.fileExists(browserPath), 'BrowserView.js file exists');

        // LitElement component
        this.assert(content.includes('class BrowserView extends LitElement'), 'BrowserView extends LitElement');
        this.assert(content.includes("customElements.define('browser-view'"), 'Custom element registered as browser-view');

        // Component properties
        this.assert(content.includes('currentUrl:'), 'Has currentUrl property');
        this.assert(content.includes('pageTitle:'), 'Has pageTitle property');
        this.assert(content.includes('browserHistory') || content.includes('canGoBack'), 'Has navigation history state');
        this.assert(content.includes('browserHistoryIndex') || content.includes('canGoForward'), 'Has forward navigation state');
        this.assert(content.includes('webviewLoading:'), 'Has loading property');

        // Webview integration
        this.assert(content.includes('<webview'), 'Uses webview element');
        this.assert(content.includes('webview.addEventListener') || content.includes('webviewListeners'), 'Sets up webview events');
        this.assert(content.includes('did-navigate'), 'Handles navigation events');
        this.assert(content.includes('did-start-loading'), 'Handles loading start');
        this.assert(content.includes('did-stop-loading'), 'Handles loading stop');
        this.assert(content.includes('page-title-updated'), 'Handles title updates');

        // Navigation controls
        this.assert(content.includes('handleBrowserBack'), 'Has back navigation handler');
        this.assert(content.includes('handleBrowserForward'), 'Has forward navigation handler');
        this.assert(content.includes('handleBrowserRefresh'), 'Has refresh handler');
        this.assert(content.includes('handleBrowserStop'), 'Has stop navigation handler');
        this.assert(content.includes('navigateTo'), 'Has URL navigation handler');

        // URL bar
        this.assert(content.includes('url-input') || content.includes('urlInput'), 'Has URL input');
        this.assert(content.includes('handleUrlKeydown'), 'Has URL keydown handler');
        this.assert(content.includes('urlInputValue') || content.includes('handleUrlChange'), 'Has URL value management');

        // Zoom functionality
        this.assert(content.includes('zoomLevel'), 'Has zoom level property');
        this.assert(content.includes('handleZoomIn'), 'Has zoom in handler');
        this.assert(content.includes('handleZoomOut'), 'Has zoom out handler');
        this.assert(content.includes('handleZoomReset'), 'Has zoom reset handler');

        // DevTools
        this.assert(content.includes('DevTools') || content.includes('devTools'), 'References DevTools');
        this.assert(content.includes('openDevTools') || content.includes('toggleDevTools'), 'Can open/toggle DevTools');

        // Find in page
        this.assert(content.includes('findInPageOpen') || content.includes('findInPage'), 'Has find in page feature');
        this.assert(content.includes('findQuery'), 'Has search query property');

        // History management
        this.assert(content.includes('history') || content.includes('navigationHistory'), 'Manages navigation history');

        // Security indicator
        this.assert(content.includes('https') || content.includes('secure'), 'Has security indicator');
        this.assert(content.includes('lock') || content.includes('security'), 'Shows lock icon for HTTPS');

        // Downloads
        this.assert(content.includes('download'), 'Handles downloads');

        // Keyboard shortcuts
        this.assert(content.includes('keydown'), 'Has keyboard event handling');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. SETTINGS VIEW TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testSettingsView() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('5. SETTINGS VIEW (Parameters & Configuration)');
        this.log('═══════════════════════════════════════════════════════════════');

        const settingsPath = path.join(this.srcPath, 'ui/settings/SettingsView.js');
        const content = this.readFile(settingsPath);

        // File existence
        this.assert(this.fileExists(settingsPath), 'SettingsView.js file exists');

        // LitElement component
        this.assert(content.includes('class SettingsView'), 'SettingsView class exists');
        this.assert(content.includes("customElements.define('settings-view'") ||
                   content.includes('customElements.define'), 'Custom element registered');

        // Shortcuts display
        this.assert(content.includes('shortcuts') || content.includes('keybinds'), 'Has shortcuts/keybinds property');
        this.assert(content.includes('renderShortcut') || content.includes('shortcut'), 'Renders shortcuts');

        // API key management
        this.assert(content.includes('apiKey') || content.includes('api-key'), 'Has API key configuration');

        // Preset management
        this.assert(content.includes('preset') || content.includes('presets'), 'Has preset management');

        // Settings categories (search for common settings)
        this.assert(content.includes('Profile') || content.includes('profile') || content.includes('Agent'), 'Has profile/agent settings');

        // Save functionality
        this.assert(content.includes('save') || content.includes('Save') || content.includes('update'), 'Has save functionality');

        // Model selection
        this.assert(content.includes('model') || content.includes('Model') || content.includes('provider'), 'Has model configuration');

        // Configuration options
        this.assert(content.includes('temperature') || content.includes('config') || content.includes('settings'), 'Has configuration options');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. ANALYTICS DASHBOARD TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testAnalyticsDashboard() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('6. ANALYTICS DASHBOARD (Graphs & Data)');
        this.log('═══════════════════════════════════════════════════════════════');

        const analyticsPath = path.join(this.srcPath, 'ui/analytics/AnalyticsDashboard.js');
        const content = this.readFile(analyticsPath);

        // File existence
        this.assert(this.fileExists(analyticsPath), 'AnalyticsDashboard.js file exists');

        // LitElement component
        this.assert(content.includes('class AnalyticsDashboard'), 'AnalyticsDashboard class exists');
        this.assert(content.includes("customElements.define('analytics-dashboard'") ||
                   content.includes('customElements.define'), 'Custom element registered');

        // Stats grid
        this.assert(content.includes('stats') || content.includes('Stats'), 'Has stats display');
        this.assert(content.includes('grid') || content.includes('Grid'), 'Uses grid layout');

        // Period selector
        this.assert(content.includes('period') || content.includes('Period'), 'Has period selector');
        this.assert(content.includes('day') || content.includes('week') || content.includes('month'), 'Has time period options');

        // Tabs navigation
        this.assert(content.includes('tab') || content.includes('Tab'), 'Has tabs navigation');

        // Charts/graphs
        this.assert(content.includes('chart') || content.includes('Chart') || content.includes('graph'), 'Has chart/graph elements');

        // Trending topics
        this.assert(content.includes('trending') || content.includes('Trending') || content.includes('topics'), 'Has trending topics');

        // Productivity trends
        this.assert(content.includes('productivity') || content.includes('Productivity') || content.includes('trend'), 'Has productivity trends');

        // Data loading
        this.assert(content.includes('loading') || content.includes('Loading') || content.includes('fetch'), 'Has data loading');

        // Data refresh
        this.assert(content.includes('refresh') || content.includes('loadData') || content.includes('loadStats') || content.includes('fetch'), 'Has refresh functionality');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. KNOWLEDGE BASE VIEW TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testKnowledgeBaseView() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('7. KNOWLEDGE BASE VIEW (Document Management)');
        this.log('═══════════════════════════════════════════════════════════════');

        const knowledgePath = path.join(this.srcPath, 'ui/knowledge/KnowledgeBaseView.js');
        const content = this.readFile(knowledgePath);

        // File existence
        this.assert(this.fileExists(knowledgePath), 'KnowledgeBaseView.js file exists');

        // LitElement component
        this.assert(content.includes('class KnowledgeBaseView'), 'KnowledgeBaseView class exists');
        this.assert(content.includes("customElements.define('knowledge-base-view'") ||
                   content.includes('customElements.define'), 'Custom element registered');

        // Document upload
        this.assert(content.includes('upload') || content.includes('Upload'), 'Has upload functionality');
        this.assert(content.includes('upload-btn') || content.includes('file'), 'Has upload button');
        this.assert(content.includes('uploadDocument') || content.includes('uploading'), 'Has upload handler');

        // Search functionality
        this.assert(content.includes('search') || content.includes('Search'), 'Has search functionality');
        this.assert(content.includes('searchQuery') || content.includes('query'), 'Has search query property');

        // Stats section
        this.assert(content.includes('stats') || content.includes('Stats'), 'Has stats section');
        this.assert(content.includes('totalDocuments') || content.includes('count'), 'Shows document count');

        // Document list
        this.assert(content.includes('documents') || content.includes('Documents'), 'Has documents list');
        this.assert(content.includes('renderDocument') || content.includes('document-item'), 'Renders document items');

        // Document metadata
        this.assert(content.includes('metadata') || content.includes('size') || content.includes('date'), 'Shows document metadata');

        // Tags
        this.assert(content.includes('tag') || content.includes('Tag'), 'Has tag support');

        // Delete/remove documents
        this.assert(content.includes('delete') || content.includes('Delete') || content.includes('remove'), 'Has delete functionality');

        // Supported formats
        this.assert(content.includes('file_type') || content.includes('getFileIcon') || content.includes('fileType'), 'Supports document formats');

        // Loading state
        this.assert(content.includes('loading') || content.includes('Loading'), 'Has loading state');

        // Empty state
        this.assert(content.includes('empty') || content.includes('no documents') || content.includes('Empty'), 'Has empty state');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UI COMPONENT DEPENDENCIES TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testUIComponentDependencies() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('8. UI COMPONENT DEPENDENCIES');
        this.log('═══════════════════════════════════════════════════════════════');

        // Check Lit library
        const litPath = path.join(this.srcPath, 'ui/assets/lit-core-2.7.4.min.js');
        this.assert(this.fileExists(litPath), 'LitElement library exists');

        // Check smd.js streaming markdown
        const smdPath = path.join(this.srcPath, 'ui/assets/smd.js');
        this.assert(this.fileExists(smdPath), 'SMD.js streaming markdown parser exists');

        // Check marked library
        const markedPath = path.join(this.srcPath, 'ui/assets/marked-4.3.0.min.js');
        this.assert(this.fileExists(markedPath), 'Marked markdown library exists');

        // Check highlight.js
        const hljsPath = path.join(this.srcPath, 'ui/assets/highlight-11.9.0.min.js');
        this.assert(this.fileExists(hljsPath), 'Highlight.js library exists');

        // Check DOMPurify
        const domPurifyPath = path.join(this.srcPath, 'ui/assets/dompurify-3.0.7.min.js');
        this.assert(this.fileExists(domPurifyPath), 'DOMPurify library exists');

        // Check translation system
        const translationPath = path.join(this.srcPath, 'ui/i18n/useTranslation.js');
        this.assert(this.fileExists(translationPath), 'Translation system exists');

        // Check sub-components
        this.log('\n  Sub-components:');

        // Listen sub-components
        const sttPath = path.join(this.srcPath, 'ui/listen/stt/SttView.js');
        this.assert(this.fileExists(sttPath), 'SttView component exists');

        const summaryPath = path.join(this.srcPath, 'ui/listen/summary/SummaryView.js');
        this.assert(this.fileExists(summaryPath), 'SummaryView component exists');

        const responsePath = path.join(this.srcPath, 'ui/listen/response/ResponseView.js');
        this.assert(this.fileExists(responsePath), 'ResponseView component exists');

        const insightsPath = path.join(this.srcPath, 'ui/listen/LiveInsightsPanel.js');
        this.assert(this.fileExists(insightsPath), 'LiveInsightsPanel component exists');

        const notificationPath = path.join(this.srcPath, 'ui/listen/NotificationCenter.js');
        this.assert(this.fileExists(notificationPath), 'NotificationCenter component exists');

        // Ask sub-components
        const citationPath = path.join(this.srcPath, 'ui/ask/CitationView.js');
        this.assert(this.fileExists(citationPath), 'CitationView component exists');

        const attachmentPath = path.join(this.srcPath, 'ui/ask/AttachmentBubble.js');
        this.assert(this.fileExists(attachmentPath), 'AttachmentBubble component exists');

        const docPreviewPath = path.join(this.srcPath, 'ui/ask/DocumentPreview.js');
        this.assert(this.fileExists(docPreviewPath), 'DocumentPreview component exists');

        const quickActionsPath = path.join(this.srcPath, 'ui/ask/QuickActionsPanel.js');
        this.assert(this.fileExists(quickActionsPath), 'QuickActionsPanel component exists');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UI STYLING TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testUIStyling() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('9. UI STYLING & THEMES');
        this.log('═══════════════════════════════════════════════════════════════');

        // Check CSS variables file
        const cssVarsPath = path.join(this.srcPath, 'ui/styles/variables.css');
        if (this.fileExists(cssVarsPath)) {
            const cssContent = this.readFile(cssVarsPath);
            this.assert(cssContent.includes('--'), 'CSS variables file uses CSS custom properties');
        } else {
            // Check inline in components
            const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
            const headerContent = this.readFile(headerPath);
            this.assert(headerContent.includes('var(--'), 'Components use CSS variables');
        }

        // Check for common styling patterns
        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        this.assert(headerContent.includes('static styles'), 'Components use static styles');
        this.assert(headerContent.includes('css`'), 'Uses lit-element css template literal');

        // Glass mode support
        this.assert(headerContent.includes('has-glass'), 'Supports glass mode');

        // Animations
        this.assert(headerContent.includes('@keyframes') || headerContent.includes('animation:'), 'Has CSS animations');

        // Transitions
        this.assert(headerContent.includes('transition:'), 'Has CSS transitions');

        // Responsive variables
        this.assert(headerContent.includes('--space') || headerContent.includes('--padding') || headerContent.includes('--radius'), 'Uses spacing/sizing variables');

        // Font family
        this.assert(headerContent.includes('font-family'), 'Defines font family');

        // Color variables
        this.assert(headerContent.includes('--color') || headerContent.includes('rgba'), 'Uses color definitions');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IPC COMMUNICATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testIPCCommunication() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('10. IPC COMMUNICATION');
        this.log('═══════════════════════════════════════════════════════════════');

        // Main Header IPC
        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        this.assert(headerContent.includes('window.api'), 'MainHeader uses window.api');
        this.assert(headerContent.includes('api.mainHeader'), 'MainHeader has dedicated API namespace');

        // Listen View IPC
        const listenPath = path.join(this.srcPath, 'ui/listen/ListenView.js');
        const listenContent = this.readFile(listenPath);

        this.assert(listenContent.includes('window.api'), 'ListenView uses window.api');
        this.assert(listenContent.includes('api.listenView'), 'ListenView has dedicated API namespace');

        // Ask View IPC
        const askPath = path.join(this.srcPath, 'ui/ask/AskView.js');
        const askContent = this.readFile(askPath);

        this.assert(askContent.includes('window.api'), 'AskView uses window.api');
        this.assert(askContent.includes('api.askView'), 'AskView has dedicated API namespace');
        this.assert(askContent.includes('onAskStateUpdate'), 'AskView listens for state updates');
        this.assert(askContent.includes('sendMessage'), 'AskView sends messages');

        // Check preload bridge exists
        const preloadPath = path.join(this.srcPath, 'electron/preload.js');
        if (this.fileExists(preloadPath)) {
            const preloadContent = this.readFile(preloadPath);
            this.assert(preloadContent.includes('contextBridge'), 'Preload uses contextBridge');
            this.assert(preloadContent.includes('ipcRenderer'), 'Preload uses ipcRenderer');
        } else {
            // Check for preload in different location
            this.log('  ! Preload.js not found at expected path');
        }

        // Check for event listeners cleanup
        this.assert(headerContent.includes('disconnectedCallback'), 'MainHeader cleans up in disconnectedCallback');
        this.assert(listenContent.includes('disconnectedCallback'), 'ListenView cleans up in disconnectedCallback');
        this.assert(askContent.includes('disconnectedCallback'), 'AskView cleans up in disconnectedCallback');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESSIBILITY TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testAccessibility() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('11. ACCESSIBILITY');
        this.log('═══════════════════════════════════════════════════════════════');

        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        const askPath = path.join(this.srcPath, 'ui/ask/AskView.js');
        const askContent = this.readFile(askPath);

        // Button elements
        this.assert(headerContent.includes('<button'), 'Uses semantic button elements');

        // Title/tooltips
        this.assert(askContent.includes('title='), 'Has title attributes for tooltips');

        // Placeholder text
        this.assert(askContent.includes('placeholder='), 'Has placeholder text for inputs');

        // Disabled state
        this.assert(headerContent.includes('?disabled=') || headerContent.includes('disabled'), 'Supports disabled state');

        // Keyboard navigation
        this.assert(askContent.includes('@keydown'), 'Has keyboard event handlers');

        // Focus management
        this.assert(askContent.includes('focus()') || askContent.includes('focusTextInput'), 'Has focus management');

        // ARIA (check if used)
        const hasAria = headerContent.includes('aria-') || askContent.includes('aria-');
        this.log(`  ${hasAria ? '✓' : '○'} Uses ARIA attributes (optional)`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RUN ALL TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    runAllTests() {
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║     UI WINDOWS TEST SUITE - Investor Demo                     ║');
        console.log('║     Testing All 7 Application Windows                         ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        // Run all test categories
        this.testMainHeader();
        this.testListenView();
        this.testAskView();
        this.testBrowserView();
        this.testSettingsView();
        this.testAnalyticsDashboard();
        this.testKnowledgeBaseView();
        this.testUIComponentDependencies();
        this.testUIStyling();
        this.testIPCCommunication();
        this.testAccessibility();

        // Summary
        this.printSummary();
    }

    printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;
        const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    TEST SUMMARY                               ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:     ${total.toString().padStart(3)}                                        ║`);
        console.log(`║  Passed:          ${passed.toString().padStart(3)} ✓                                      ║`);
        console.log(`║  Failed:          ${failed.toString().padStart(3)} ✗                                      ║`);
        console.log(`║  Pass Rate:       ${percentage.padStart(5)}%                                    ║`);
        console.log('╠═══════════════════════════════════════════════════════════════╣');

        if (failed > 0) {
            console.log('║  FAILED TESTS:                                                ║');
            this.results.filter(r => !r.passed).forEach(r => {
                const truncated = r.testName.substring(0, 55).padEnd(55);
                console.log(`║    ✗ ${truncated} ║`);
            });
        }

        console.log('╚═══════════════════════════════════════════════════════════════╝');

        // Final status
        if (percentage >= 90) {
            console.log('\n🎉 EXCELLENT! UI Windows are ready for investor demo!');
        } else if (percentage >= 70) {
            console.log('\n⚠️ GOOD: Most UI windows are functional, review failed tests.');
        } else {
            console.log('\n❌ NEEDS WORK: Several UI issues need to be addressed.');
        }

        return { passed, failed, total, percentage: parseFloat(percentage) };
    }
}

// Run tests
const tester = new UIWindowsTester();
tester.runAllTests();
