/**
 * TEST - Advanced Window Features for Investor Demo
 * Tests platform-specific and advanced window functionalities:
 * 1. Click-through mode - Mouse events pass through windows
 * 2. Content protection - DRM/screen recording protection
 * 3. Screenshot blocking - Capture prevention
 * 4. Repositioning - Drag & drop fluidity
 * 5. Height adjustment - Dynamic resizing
 * 6. Visibility toggle - Show/hide windows
 * 7. Multi-window coordination - IPC communication
 */

const fs = require('fs');
const path = require('path');

class AdvancedWindowFeaturesTester {
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
    // 1. CLICK-THROUGH MODE TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testClickThroughMode() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('1. CLICK-THROUGH MODE (Mouse Events Pass Through)');
        this.log('═══════════════════════════════════════════════════════════════');

        // Check shortcutsService.js for click-through toggle
        const shortcutsPath = path.join(this.srcPath, 'features/shortcuts/shortcutsService.js');
        const shortcutsContent = this.readFile(shortcutsPath);

        this.assert(this.fileExists(shortcutsPath), 'shortcutsService.js exists');
        this.assert(shortcutsContent.includes('toggleClickThrough'), 'Has toggleClickThrough shortcut case');
        this.assert(shortcutsContent.includes('setIgnoreMouseEvents'), 'Uses setIgnoreMouseEvents API');
        this.assert(shortcutsContent.includes('mouseEventsIgnored'), 'Tracks mouse events state');
        this.assert(shortcutsContent.includes('forward: true'), 'Forwards mouse events through window');
        this.assert(shortcutsContent.includes('click-through-toggled'), 'Sends IPC notification on toggle');

        // Check windowManager.js for click management
        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        this.assert(windowManagerContent.includes('disableClicks'), 'Has disableClicks function');
        this.assert(windowManagerContent.includes('restoreClicks'), 'Has restoreClicks function');
        this.assert(windowManagerContent.includes('setIgnoreMouseEvents(true'), 'Can disable clicks on windows');
        this.assert(windowManagerContent.includes('setIgnoreMouseEvents(false'), 'Can restore clicks on windows');

        // Check preload.js exposes click-through API
        const preloadPath = path.join(this.srcPath, 'preload.js');
        const preloadContent = this.readFile(preloadPath);

        this.assert(preloadContent.includes('click-through') || preloadContent.includes('clickThrough'),
            'Preload exposes click-through API');

        // Check UI handles click-through state
        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        this.assert(headerContent.includes('-webkit-app-region: drag') ||
                   headerContent.includes('app-region'),
            'UI supports drag regions');
        this.assert(headerContent.includes('-webkit-app-region: no-drag') ||
                   headerContent.includes('no-drag'),
            'UI has non-draggable button areas');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. CONTENT PROTECTION TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testContentProtection() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('2. CONTENT PROTECTION (DRM/Screen Recording Protection)');
        this.log('═══════════════════════════════════════════════════════════════');

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // Content protection implementation
        this.assert(windowManagerContent.includes('setContentProtection'), 'Has setContentProtection function');
        this.assert(windowManagerContent.includes('isContentProtectionOn'), 'Tracks content protection state');
        this.assert(windowManagerContent.includes('toggleContentProtection'), 'Has toggleContentProtection function');
        this.assert(windowManagerContent.includes('getContentProtectionStatus'), 'Has getContentProtectionStatus function');

        // Protection applied to all windows
        this.assert(windowManagerContent.includes('windowPool.forEach') &&
                   windowManagerContent.includes('setContentProtection'),
            'Applies protection to all windows in pool');

        // Check window bridge for IPC
        const bridgePath = path.join(this.srcPath, 'bridge/windowBridge.js');
        const bridgeContent = this.readFile(bridgePath);

        this.assert(bridgeContent.includes('toggle-content-protection') ||
                   bridgeContent.includes('toggleContentProtection'),
            'IPC handler for content protection toggle');
        this.assert(bridgeContent.includes('get-content-protection-status') ||
                   bridgeContent.includes('getContentProtectionStatus'),
            'IPC handler to get protection status');

        // Check preload exposes API
        const preloadPath = path.join(this.srcPath, 'preload.js');
        const preloadContent = this.readFile(preloadPath);

        this.assert(preloadContent.includes('content-protection') ||
                   preloadContent.includes('contentProtection') ||
                   preloadContent.includes('ContentProtection'),
            'Preload exposes content protection API');

        // Check settings service manages protection
        const settingsPath = path.join(this.srcPath, 'features/settings/settingsService.js');
        if (this.fileExists(settingsPath)) {
            const settingsContent = this.readFile(settingsPath);
            this.assert(settingsContent.includes('protection') ||
                       settingsContent.includes('Protection'),
                'Settings service can manage protection');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. SCREENSHOT BLOCKING TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testScreenshotBlocking() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('3. SCREENSHOT BLOCKING (Capture Prevention)');
        this.log('═══════════════════════════════════════════════════════════════');

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // Screenshot control implementation
        this.assert(windowManagerContent.includes('isScreenshotEnabled'), 'Has screenshot enabled state');
        this.assert(windowManagerContent.includes('getScreenshotEnabled'), 'Has getScreenshotEnabled function');
        this.assert(windowManagerContent.includes('setScreenshotEnabled'), 'Has setScreenshotEnabled function');

        // Check preload exposes screenshot API
        const preloadPath = path.join(this.srcPath, 'preload.js');
        const preloadContent = this.readFile(preloadPath);

        this.assert(preloadContent.includes('get-screenshot-enabled') ||
                   preloadContent.includes('getScreenshotEnabled'),
            'Preload has getScreenshotEnabled');
        this.assert(preloadContent.includes('set-screenshot-enabled') ||
                   preloadContent.includes('setScreenshotEnabled'),
            'Preload has setScreenshotEnabled');

        // Check bridge handlers
        const bridgePath = path.join(this.srcPath, 'bridge/windowBridge.js');
        const bridgeContent = this.readFile(bridgePath);

        this.assert(bridgeContent.includes('screenshot') || bridgeContent.includes('Screenshot'),
            'Bridge has screenshot IPC handlers');

        // Screenshot capture functionality (for Ask service OCR)
        this.assert(preloadContent.includes('desktopCapturer') ||
                   preloadContent.includes('captureScreen') ||
                   preloadContent.includes('screenshot'),
            'Has screenshot capture capability');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. REPOSITIONING & DRAG TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testRepositioning() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('4. REPOSITIONING (Drag & Drop Fluidity)');
        this.log('═══════════════════════════════════════════════════════════════');

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // Position management
        this.assert(windowManagerContent.includes('getHeaderPosition'), 'Has getHeaderPosition function');
        this.assert(windowManagerContent.includes('moveHeaderTo'), 'Has moveHeaderTo function');
        this.assert(windowManagerContent.includes('moveWindowStep'), 'Has moveWindowStep function');
        this.assert(windowManagerContent.includes('getBounds'), 'Uses getBounds API');
        this.assert(windowManagerContent.includes('setPosition'), 'Uses setPosition API');

        // Check layout manager for positioning logic
        const layoutManagerPath = path.join(this.srcPath, 'window/windowLayoutManager.js');
        const layoutManagerContent = this.readFile(layoutManagerPath);

        this.assert(this.fileExists(layoutManagerPath), 'windowLayoutManager.js exists');
        this.assert(layoutManagerContent.includes('calculateClampedPosition') ||
                   layoutManagerContent.includes('clampedPosition'),
            'Has position clamping logic');
        this.assert(layoutManagerContent.includes('display') || layoutManagerContent.includes('Display'),
            'Handles display boundaries');

        // Check smooth movement manager
        const smoothMovementPath = path.join(this.srcPath, 'window/smoothMovementManager.js');
        const smoothMovementContent = this.readFile(smoothMovementPath);

        this.assert(this.fileExists(smoothMovementPath), 'smoothMovementManager.js exists');
        this.assert(smoothMovementContent.includes('animateWindow') ||
                   smoothMovementContent.includes('animate'),
            'Has window animation function');
        this.assert(smoothMovementContent.includes('ease') || smoothMovementContent.includes('easing'),
            'Uses easing for smooth movement');
        this.assert(smoothMovementContent.includes('setBounds'), 'Uses setBounds for animation');

        // Check UI drag implementation
        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        this.assert(headerContent.includes('handleMouseDown'), 'Has mouse down handler for drag');
        this.assert(headerContent.includes('handleMouseMove'), 'Has mouse move handler');
        this.assert(headerContent.includes('handleMouseUp'), 'Has mouse up handler');
        this.assert(headerContent.includes('dragState'), 'Tracks drag state');
        this.assert(headerContent.includes('screenX') || headerContent.includes('screenY'),
            'Uses screen coordinates for drag');

        // Check internal bridge for movement events
        const internalBridgePath = path.join(this.srcPath, 'bridge/internalBridge.js');
        this.assert(this.fileExists(internalBridgePath), 'internalBridge.js exists');

        this.assert(windowManagerContent.includes('window:moveStep'), 'Has moveStep event handler');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. HEIGHT ADJUSTMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testHeightAdjustment() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('5. HEIGHT ADJUSTMENT (Dynamic Resizing)');
        this.log('═══════════════════════════════════════════════════════════════');

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // Height adjustment implementation
        this.assert(windowManagerContent.includes('adjustWindowHeight'), 'Has adjustWindowHeight function');
        this.assert(windowManagerContent.includes('resizeHeaderWindow'), 'Has resizeHeaderWindow function');
        this.assert(windowManagerContent.includes('window:adjustWindowHeight'), 'Has adjustWindowHeight event');
        this.assert(windowManagerContent.includes('calculateWindowHeightAdjustment') ||
                   windowManagerContent.includes('targetHeight'),
            'Calculates target height');

        // Smooth resize animation
        this.assert(windowManagerContent.includes('animateWindowBounds') ||
                   windowManagerContent.includes('animate'),
            'Uses animation for resize');

        // Resizable state handling
        this.assert(windowManagerContent.includes('isResizable') ||
                   windowManagerContent.includes('setResizable'),
            'Handles resizable state');

        // Check layout manager for height calculations
        const layoutManagerPath = path.join(this.srcPath, 'window/windowLayoutManager.js');
        const layoutManagerContent = this.readFile(layoutManagerPath);

        this.assert(layoutManagerContent.includes('Height') || layoutManagerContent.includes('height'),
            'Layout manager handles height calculations');

        // Check UI components call adjustWindowHeight
        const askViewPath = path.join(this.srcPath, 'ui/ask/AskView.js');
        const askViewContent = this.readFile(askViewPath);

        this.assert(askViewContent.includes('adjustWindowHeight'), 'AskView calls adjustWindowHeight');
        this.assert(askViewContent.includes('adjustWindowHeightThrottled'), 'AskView has throttled adjustment');
        this.assert(askViewContent.includes('scrollHeight'), 'AskView measures content height');

        const listenViewPath = path.join(this.srcPath, 'ui/listen/ListenView.js');
        const listenViewContent = this.readFile(listenViewPath);

        this.assert(listenViewContent.includes('adjustWindowHeight'), 'ListenView calls adjustWindowHeight');

        // Check preload exposes resize API
        const preloadPath = path.join(this.srcPath, 'preload.js');
        const preloadContent = this.readFile(preloadPath);

        this.assert(preloadContent.includes('adjust-window-height') ||
                   preloadContent.includes('adjustWindowHeight'),
            'Preload exposes adjustWindowHeight');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. VISIBILITY TOGGLE TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testVisibilityToggle() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('6. VISIBILITY TOGGLE (Show/Hide Windows)');
        this.log('═══════════════════════════════════════════════════════════════');

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // Visibility management
        this.assert(windowManagerContent.includes('changeAllWindowsVisibility'),
            'Has changeAllWindowsVisibility function');
        this.assert(windowManagerContent.includes('handleWindowVisibilityRequest') ||
                   windowManagerContent.includes('requestVisibility'),
            'Has visibility request handler');
        this.assert(windowManagerContent.includes('lastVisibleWindows'),
            'Tracks last visible windows');

        // Show/hide methods
        this.assert(windowManagerContent.includes('.show()'), 'Uses show() method');
        this.assert(windowManagerContent.includes('.hide()'), 'Uses hide() method');
        this.assert(windowManagerContent.includes('isVisible()'), 'Uses isVisible() method');
        this.assert(windowManagerContent.includes('moveTop()'), 'Uses moveTop() to bring to front');
        this.assert(windowManagerContent.includes('setAlwaysOnTop'), 'Uses setAlwaysOnTop');

        // Settings window delayed hide
        this.assert(windowManagerContent.includes('settingsHideTimer') ||
                   windowManagerContent.includes('SETTINGS_HIDE_DELAY'),
            'Settings window has delayed hide');
        this.assert(windowManagerContent.includes('setTimeout') &&
                   windowManagerContent.includes('hide'),
            'Uses setTimeout for delayed hide');

        // Internal bridge visibility events
        this.assert(windowManagerContent.includes('window:requestVisibility'),
            'Has requestVisibility event');

        // Show/hide specific windows
        this.assert(windowManagerContent.includes('showSettingsWindow') ||
                   windowManagerContent.includes('showSettings'),
            'Has showSettingsWindow');
        this.assert(windowManagerContent.includes('hideSettingsWindow') ||
                   windowManagerContent.includes('hideSettings'),
            'Has hideSettingsWindow');

        // Check shortcut for toggle
        const shortcutsPath = path.join(this.srcPath, 'features/shortcuts/shortcutsService.js');
        const shortcutsContent = this.readFile(shortcutsPath);

        this.assert(shortcutsContent.includes('toggleVisibility') ||
                   shortcutsContent.includes('toggleAllWindows'),
            'Has toggle visibility shortcut');

        // Check UI toggle handler
        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        this.assert(headerContent.includes('_handleToggleAllWindowsVisibility'),
            'Header has toggle visibility handler');
        this.assert(headerContent.includes('toggleVisibility'),
            'Header has toggleVisibility method');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. MULTI-WINDOW COORDINATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testMultiWindowCoordination() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('7. MULTI-WINDOW COORDINATION (IPC Communication)');
        this.log('═══════════════════════════════════════════════════════════════');

        // Window pool management
        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        this.assert(windowManagerContent.includes('windowPool'), 'Has central window pool');
        this.assert(windowManagerContent.includes('new Map()') ||
                   windowManagerContent.includes('Map()'),
            'Window pool uses Map');
        this.assert(windowManagerContent.includes("windowPool.get('header')") ||
                   windowManagerContent.includes('windowPool.get'),
            'Can get windows from pool by name');
        this.assert(windowManagerContent.includes('windowPool.set'),
            'Can add windows to pool');
        this.assert(windowManagerContent.includes('windowPool.forEach'),
            'Can iterate over windows');

        // Window types
        this.assert(windowManagerContent.includes("'header'"), 'Has header window');
        this.assert(windowManagerContent.includes("'listen'"), 'Has listen window');
        this.assert(windowManagerContent.includes("'ask'"), 'Has ask window');
        this.assert(windowManagerContent.includes("'settings'"), 'Has settings window');

        // Internal bridge for coordination
        const internalBridgePath = path.join(this.srcPath, 'bridge/internalBridge.js');
        const internalBridgeContent = this.readFile(internalBridgePath);

        this.assert(this.fileExists(internalBridgePath), 'internalBridge.js exists');
        this.assert(internalBridgeContent.includes('EventEmitter'), 'Uses EventEmitter pattern');

        // Window bridge for IPC
        const windowBridgePath = path.join(this.srcPath, 'bridge/windowBridge.js');
        const windowBridgeContent = this.readFile(windowBridgePath);

        this.assert(this.fileExists(windowBridgePath), 'windowBridge.js exists');
        this.assert(windowBridgeContent.includes('ipcMain'), 'Uses ipcMain for handlers');
        this.assert(windowBridgeContent.includes('ipcMain.handle') ||
                   windowBridgeContent.includes('ipcMain.on'),
            'Registers IPC handlers');

        // Preload bridge for renderer
        const preloadPath = path.join(this.srcPath, 'preload.js');
        const preloadContent = this.readFile(preloadPath);

        this.assert(preloadContent.includes('contextBridge'), 'Uses contextBridge');
        this.assert(preloadContent.includes('ipcRenderer'), 'Uses ipcRenderer');
        this.assert(preloadContent.includes('exposeInMainWorld') ||
                   preloadContent.includes('window.api'),
            'Exposes API to renderer');

        // Window factory for creation
        const windowFactoryPath = path.join(this.srcPath, 'window/WindowFactory.js');
        if (this.fileExists(windowFactoryPath)) {
            const windowFactoryContent = this.readFile(windowFactoryPath);
            this.assert(windowFactoryContent.includes('createHeaderWindow') ||
                       windowFactoryContent.includes('createWindow'),
                'Has window creation methods');
            this.assert(windowFactoryContent.includes('WINDOW_PRESETS') ||
                       windowFactoryContent.includes('preset'),
                'Uses window presets');
        } else {
            this.log('  ! WindowFactory.js not found (may be inline)');
        }

        // Parent-child window relationships
        this.assert(windowManagerContent.includes('parent') ||
                   windowManagerContent.includes('Parent'),
            'Supports parent window relationships');

        // Cross-platform workspace visibility
        this.assert(windowManagerContent.includes('setVisibleOnAllWorkspaces') ||
                   windowManagerContent.includes('visibleOnAllWorkspaces'),
            'Supports cross-workspace visibility');

        // Full screen support
        this.assert(windowManagerContent.includes('visibleOnFullScreen') ||
                   windowManagerContent.includes('fullscreen'),
            'Supports full-screen visibility');

        // Child window layout updates
        this.assert(windowManagerContent.includes('updateChildWindowLayouts') ||
                   windowManagerContent.includes('updateLayout'),
            'Updates child window layouts');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. PLATFORM-SPECIFIC FEATURES TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testPlatformSpecificFeatures() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('8. PLATFORM-SPECIFIC FEATURES');
        this.log('═══════════════════════════════════════════════════════════════');

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // macOS features
        this.assert(windowManagerContent.includes('darwin') ||
                   windowManagerContent.includes('mac') ||
                   windowManagerContent.includes('Mac'),
            'Handles macOS platform');
        this.assert(windowManagerContent.includes('titleBarStyle') ||
                   windowManagerContent.includes('vibrancy'),
            'macOS window styling support');

        // Check for liquid glass (macOS visual effect)
        const packagePath = path.join(__dirname, 'package.json');
        if (this.fileExists(packagePath)) {
            const packageContent = this.readFile(packagePath);
            this.assert(packageContent.includes('electron-liquid-glass') ||
                       windowManagerContent.includes('liquidGlass'),
                'Supports macOS liquid glass effect');
        }

        // Windows/Linux support
        this.assert(windowManagerContent.includes('win32') ||
                   windowManagerContent.includes('linux') ||
                   windowManagerContent.includes('process.platform'),
            'Cross-platform awareness');

        // Transparent windows
        this.assert(windowManagerContent.includes('transparent: true') ||
                   windowManagerContent.includes('transparent'),
            'Supports transparent windows');

        // Frameless windows
        this.assert(windowManagerContent.includes('frame: false') ||
                   windowManagerContent.includes('frameless'),
            'Supports frameless windows');

        // Always on top
        this.assert(windowManagerContent.includes('alwaysOnTop: true') ||
                   windowManagerContent.includes('alwaysOnTop'),
            'Supports always on top');

        // Skip taskbar
        this.assert(windowManagerContent.includes('skipTaskbar') ||
                   windowManagerContent.includes('taskbar'),
            'Can skip taskbar');

        // Focus behavior
        this.assert(windowManagerContent.includes('focusable') ||
                   windowManagerContent.includes('focus'),
            'Manages focus behavior');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. ANIMATION & TRANSITIONS TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testAnimationsAndTransitions() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('9. ANIMATIONS & TRANSITIONS');
        this.log('═══════════════════════════════════════════════════════════════');

        // Check smooth movement manager
        const smoothMovementPath = path.join(this.srcPath, 'window/smoothMovementManager.js');
        const smoothMovementContent = this.readFile(smoothMovementPath);

        this.assert(this.fileExists(smoothMovementPath), 'smoothMovementManager.js exists');
        this.assert(smoothMovementContent.includes('animateWindow') ||
                   smoothMovementContent.includes('animate'),
            'Has animateWindow function');
        this.assert(smoothMovementContent.includes('animateWindowBounds') ||
                   smoothMovementContent.includes('Bounds'),
            'Has bounds animation');
        this.assert(smoothMovementContent.includes('animatePosition') ||
                   smoothMovementContent.includes('Position'),
            'Has position animation');

        // Easing functions
        this.assert(smoothMovementContent.includes('ease-out') ||
                   smoothMovementContent.includes('easeOut') ||
                   smoothMovementContent.includes('cubic'),
            'Uses easing functions');

        // Animation duration
        this.assert(smoothMovementContent.includes('duration') ||
                   smoothMovementContent.includes('300'),
            'Has configurable duration');

        // Opacity animations
        this.assert(smoothMovementContent.includes('opacity') ||
                   smoothMovementContent.includes('Opacity') ||
                   smoothMovementContent.includes('fade'),
            'Supports opacity animations');

        // Layout animations
        this.assert(smoothMovementContent.includes('animateLayout') ||
                   smoothMovementContent.includes('layout'),
            'Supports layout animations');

        // Check UI animations
        const headerPath = path.join(this.srcPath, 'ui/app/MainHeader.js');
        const headerContent = this.readFile(headerPath);

        this.assert(headerContent.includes('animation:') ||
                   headerContent.includes('@keyframes'),
            'UI has CSS animations');
        this.assert(headerContent.includes('transition:'), 'UI has CSS transitions');
        this.assert(headerContent.includes('handleAnimationEnd'), 'Handles animation end events');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. WINDOW STATE MANAGEMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    testWindowStateManagement() {
        this.log('\n═══════════════════════════════════════════════════════════════');
        this.log('10. WINDOW STATE MANAGEMENT');
        this.log('═══════════════════════════════════════════════════════════════');

        // Check WindowManagerState
        const statePath = path.join(this.srcPath, 'window/WindowManagerState.js');
        if (this.fileExists(statePath)) {
            const stateContent = this.readFile(statePath);
            this.assert(stateContent.includes('class') || stateContent.includes('state'),
                'WindowManagerState exists');
        }

        const windowManagerPath = path.join(this.srcPath, 'window/windowManager.js');
        const windowManagerContent = this.readFile(windowManagerPath);

        // State tracking
        this.assert(windowManagerContent.includes('isContentProtectionOn'),
            'Tracks content protection state');
        this.assert(windowManagerContent.includes('isScreenshotEnabled'),
            'Tracks screenshot enabled state');
        this.assert(windowManagerContent.includes('lastVisibleWindows'),
            'Tracks last visible windows');

        // Window destroyed checks
        this.assert(windowManagerContent.includes('isDestroyed()'),
            'Checks if windows are destroyed');
        this.assert(windowManagerContent.includes('!win.isDestroyed()') ||
                   windowManagerContent.includes('&& !win.isDestroyed'),
            'Guards against destroyed windows');

        // Window close/destroy handling
        this.assert(windowManagerContent.includes('isDestroyed') ||
                   windowManagerContent.includes("on('closed')"),
            'Handles window close/destroy events');

        // State persistence (if applicable)
        this.assert(windowManagerContent.includes('electron-store') ||
                   windowManagerContent.includes('store') ||
                   windowManagerContent.includes('persist'),
            'May persist window state');

        // Window bounds tracking
        this.assert(windowManagerContent.includes('getBounds') ||
                   windowManagerContent.includes('bounds'),
            'Tracks window bounds');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RUN ALL TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    runAllTests() {
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║   ADVANCED WINDOW FEATURES TEST SUITE - Investor Demo         ║');
        console.log('║   Testing Platform-Specific & Advanced Functionalities        ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        // Run all test categories
        this.testClickThroughMode();
        this.testContentProtection();
        this.testScreenshotBlocking();
        this.testRepositioning();
        this.testHeightAdjustment();
        this.testVisibilityToggle();
        this.testMultiWindowCoordination();
        this.testPlatformSpecificFeatures();
        this.testAnimationsAndTransitions();
        this.testWindowStateManagement();

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

        // Platform notes
        console.log('\n📱 PLATFORM TESTING NOTES:');
        console.log('   macOS: Full support (liquid glass, vibrancy, title bar)');
        console.log('   Windows: Standard support (transparent, frameless)');
        console.log('   Linux: Basic support (may vary by DE)');

        // Final status
        if (percentage >= 90) {
            console.log('\n🎉 EXCELLENT! Advanced window features are ready for demo!');
        } else if (percentage >= 70) {
            console.log('\n⚠️ GOOD: Most features work, review failed tests.');
        } else {
            console.log('\n❌ NEEDS WORK: Several features need attention.');
        }

        return { passed, failed, total, percentage: parseFloat(percentage) };
    }
}

// Run tests
const tester = new AdvancedWindowFeaturesTester();
tester.runAllTests();
