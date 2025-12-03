const { BrowserWindow, globalShortcut, screen, app, shell } = require('electron');
const WindowLayoutManager = require('./windowLayoutManager');
const SmoothMovementManager = require('./smoothMovementManager');
const path = require('node:path');
const os = require('os');
const shortcutsService = require('../features/shortcuts/shortcutsService');
const internalBridge = require('../bridge/internalBridge');
const permissionRepository = require('../features/common/repositories/permission');
const { WINDOW } = require('../features/common/config/constants');

/* ────────────────[ GLASS BYPASS ]─────────────── */
let liquidGlass;
const isLiquidGlassSupported = () => {
    if (process.platform !== 'darwin') {
        return false;
    }
    const majorVersion = parseInt(os.release().split('.')[0], 10);
    return majorVersion >= 26;
};
let shouldUseLiquidGlass = isLiquidGlassSupported();
if (shouldUseLiquidGlass) {
    try {
        liquidGlass = require('electron-liquid-glass');
    } catch (e) {
        console.warn('Could not load optional dependency "electron-liquid-glass". The feature will be disabled.');
        shouldUseLiquidGlass = false;
    }
}
/* ────────────────[ GLASS BYPASS ]─────────────── */

let isContentProtectionOn = true;
let isScreenshotEnabled = false; // Par défaut désactivé
let lastVisibleWindows = new Set(['header']);

let currentHeaderState = 'apikey';
const windowPool = new Map();

let settingsHideTimer = null;


let layoutManager = null;
let movementManager = null;

// Fix HIGH BUG-H9/H10/H11/H12: Track event listeners for proper cleanup
let headerEventListeners = {
    moved: null,
    focus: null,
    blur: null,
    beforeInput: null,
    resize: null
};
let screenEventListeners = {
    displayAdded: null,
    displayRemoved: null,
    displayMetricsChanged: null
};

/**
 * Fix NORMAL MEDIUM BUG-M27: Deduplicate DevTools initialization
 * Helper to open DevTools in development mode with consistent configuration
 * @param {BrowserWindow} window - The window to open DevTools for
 */
function openDevToolsInDevelopment(window) {
    if (!app.isPackaged && window && !window.isDestroyed()) {
        window.webContents.openDevTools({ mode: 'detach' });
    }
}

function updateChildWindowLayouts(animated = true) {
    const visibleWindows = {};
    const listenWin = windowPool.get('listen');
    const askWin = windowPool.get('ask');
    if (listenWin && !listenWin.isDestroyed() && listenWin.isVisible()) {
        visibleWindows.listen = true;
    }
    if (askWin && !askWin.isDestroyed() && askWin.isVisible()) {
        visibleWindows.ask = true;
    }

    if (Object.keys(visibleWindows).length === 0) return;

    // Fix LOW BUG-L7: Add null check for layoutManager
    if (!layoutManager) {
        console.warn('[WindowManager] layoutManager not initialized, skipping layout update');
        return;
    }

    const newLayout = layoutManager.calculateFeatureWindowLayout(visibleWindows);
    movementManager.animateLayout(newLayout, animated);
}

const showSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: true });
};

const hideSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: false });
};

const cancelHideSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: true });
};

const moveWindowStep = (direction) => {
    internalBridge.emit('window:moveStep', { direction });
};

const resizeHeaderWindow = ({ width, height }) => {
    internalBridge.emit('window:resizeHeaderWindow', { width, height });
};

const handleHeaderAnimationFinished = (state) => {
    internalBridge.emit('window:headerAnimationFinished', state);
};

const getHeaderPosition = () => {
    return new Promise((resolve) => {
        internalBridge.emit('window:getHeaderPosition', (position) => {
            resolve(position);
        });
    });
};

const moveHeaderTo = (newX, newY) => {
    internalBridge.emit('window:moveHeaderTo', { newX, newY });
};

const adjustWindowHeight = (winName, targetHeight) => {
    internalBridge.emit('window:adjustWindowHeight', { winName, targetHeight });
};


function setupWindowController(windowPool, layoutManager, movementManager) {
    internalBridge.on('window:requestVisibility', ({ name, visible }) => {
        handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, visible);
    });
    internalBridge.on('window:requestToggleAllWindowsVisibility', ({ targetVisibility }) => {
        changeAllWindowsVisibility(windowPool, targetVisibility);
    });
    internalBridge.on('window:moveToDisplay', ({ displayId }) => {
        const header = windowPool.get('header');
        if (header) {
            const newPosition = layoutManager.calculateNewPositionForDisplay(header, displayId);
            if (newPosition) {
                movementManager.animateWindowPosition(header, newPosition, {
                    onComplete: () => updateChildWindowLayouts(true)
                });
            }
        }
    });
    internalBridge.on('window:moveToEdge', ({ direction }) => {
        const header = windowPool.get('header');
        if (header) {
            const newPosition = layoutManager.calculateEdgePosition(header, direction);
            movementManager.animateWindowPosition(header, newPosition, { 
                onComplete: () => updateChildWindowLayouts(true) 
            });
        }
    });

    internalBridge.on('window:moveStep', ({ direction }) => {
        const header = windowPool.get('header');
        if (header) { 
            const newHeaderPosition = layoutManager.calculateStepMovePosition(header, direction);
            if (!newHeaderPosition) return;
    
            const futureHeaderBounds = { ...header.getBounds(), ...newHeaderPosition };
            const visibleWindows = {};
            const listenWin = windowPool.get('listen');
            const askWin = windowPool.get('ask');
            if (listenWin && !listenWin.isDestroyed() && listenWin.isVisible()) {
                visibleWindows.listen = true;
            }
            if (askWin && !askWin.isDestroyed() && askWin.isVisible()) {
                visibleWindows.ask = true;
            }

            const newChildLayout = layoutManager.calculateFeatureWindowLayout(visibleWindows, futureHeaderBounds);
    
            movementManager.animateWindowPosition(header, newHeaderPosition);
            movementManager.animateLayout(newChildLayout);
        }
    });

    internalBridge.on('window:resizeHeaderWindow', ({ width, height }) => {
        const header = windowPool.get('header');
        if (!header || movementManager.isAnimating) return;

        const newHeaderBounds = layoutManager.calculateHeaderResize(header, { width, height });
        
        const wasResizable = header.isResizable();
        if (!wasResizable) header.setResizable(true);

        movementManager.animateWindowBounds(header, newHeaderBounds, {
            onComplete: () => {
                if (!wasResizable) header.setResizable(false);
                updateChildWindowLayouts(true);
            }
        });
    });
    internalBridge.on('window:headerAnimationFinished', (state) => {
        const header = windowPool.get('header');
        if (!header || header.isDestroyed()) return;

        if (state === 'hidden') {
            header.hide();
        } else if (state === 'visible') {
            updateChildWindowLayouts(false);
        }
    });
    internalBridge.on('window:getHeaderPosition', (reply) => {
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            reply(header.getBounds());
        } else {
            reply({ x: 0, y: 0, width: 0, height: 0 });
        }
    });
    internalBridge.on('window:moveHeaderTo', ({ newX, newY }) => {
        const header = windowPool.get('header');
        if (header) {
            const newPosition = layoutManager.calculateClampedPosition(header, { x: newX, y: newY });
            header.setPosition(newPosition.x, newPosition.y);
        }
    });
    internalBridge.on('window:adjustWindowHeight', ({ winName, targetHeight }) => {
        console.log(`[Layout Debug] adjustWindowHeight: targetHeight=${targetHeight}`);
        const senderWindow = windowPool.get(winName);
        if (senderWindow) {
            const newBounds = layoutManager.calculateWindowHeightAdjustment(senderWindow, targetHeight);

            const wasResizable = senderWindow.isResizable();
            if (!wasResizable) senderWindow.setResizable(true);

            movementManager.animateWindowBounds(senderWindow, newBounds, {
                onComplete: () => {
                    if (!wasResizable) senderWindow.setResizable(false);
                    updateChildWindowLayouts(true);
                }
            });
        }
    });
    internalBridge.on('window:setAskBrowserMode', ({ browserMode }) => {
        console.log(`[WindowManager] Setting Ask browser mode: ${browserMode}`);
        const askWin = windowPool.get('ask');
        if (!askWin || askWin.isDestroyed()) return;

        const wasResizable = askWin.isResizable();
        if (!wasResizable) askWin.setResizable(true);

        const currentBounds = askWin.getBounds();
        const newBounds = {
            x: currentBounds.x,
            y: currentBounds.y,
            width: browserMode ? WINDOW.ASK_BROWSER_WIDTH : WINDOW.ASK_DEFAULT_WIDTH,
            height: browserMode ? WINDOW.ASK_BROWSER_HEIGHT : currentBounds.height
        };

        // Ajuster la position pour centrer la fenêtre agrandie
        if (browserMode) {
            const widthDiff = newBounds.width - currentBounds.width;
            newBounds.x = Math.max(0, currentBounds.x - Math.round(widthDiff / 2));
        }

        movementManager.animateWindowBounds(askWin, newBounds, {
            onComplete: () => {
                if (!wasResizable) askWin.setResizable(false);
                updateChildWindowLayouts(true);
            }
        });
    });
}

function changeAllWindowsVisibility(windowPool, targetVisibility) {
    const header = windowPool.get('header');
    if (!header) return;

    if (typeof targetVisibility === 'boolean' &&
        header.isVisible() === targetVisibility) {
        return;
    }
  
    if (header.isVisible()) {
      lastVisibleWindows.clear();
  
      windowPool.forEach((win, name) => {
        if (win && !win.isDestroyed() && win.isVisible()) {
          lastVisibleWindows.add(name);
        }
      });
  
      lastVisibleWindows.forEach(name => {
        if (name === 'header') return;
        const win = windowPool.get(name);
        if (win && !win.isDestroyed()) win.hide();
      });
      header.hide();
  
      return;
    }
  
    lastVisibleWindows.forEach(name => {
      const win = windowPool.get(name);
      if (win && !win.isDestroyed())
        win.show();
    });
  }

/**
 * 
 * @param {Map<string, BrowserWindow>} windowPool
 * @param {WindowLayoutManager} layoutManager 
 * @param {SmoothMovementManager} movementManager
 * @param {'listen' | 'ask' | 'settings' | 'shortcut-settings'} name 
 * @param {boolean} shouldBeVisible 
 */
async function handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, shouldBeVisible) {
    try {
        console.log(`[WindowManager] Request: set '${name}' visibility to ${shouldBeVisible}`);
        const win = windowPool.get(name);

        if (!win || win.isDestroyed()) {
            console.warn(`[WindowManager] Window '${name}' not found or destroyed.`);
            return;
        }

    if (name !== 'settings') {
        const isCurrentlyVisible = win.isVisible();
        if (isCurrentlyVisible === shouldBeVisible) {
            console.log(`[WindowManager] Window '${name}' is already in the desired state.`);
            return;
        }
    }

    const disableClicks = (selectedWindow) => {
        for (const [name, win] of windowPool) {
            if (win !== selectedWindow && !win.isDestroyed()) {
                win.setIgnoreMouseEvents(true, { forward: true });
            }
        }
    };

    const restoreClicks = () => {
        for (const [, win] of windowPool) {
            if (!win.isDestroyed()) win.setIgnoreMouseEvents(false);
        }
    };

    if (name === 'settings') {
        if (shouldBeVisible) {
            // Cancel any pending hide operations
            if (settingsHideTimer) {
                clearTimeout(settingsHideTimer);
                settingsHideTimer = null;
            }
            const position = layoutManager.calculateSettingsWindowPosition();
            if (position) {
                win.setBounds(position);
                win.__lockedByButton = true;
                win.show();
                win.moveTop();
                win.setAlwaysOnTop(true);
            } else {
                console.warn('[WindowManager] Could not calculate settings window position.');
            }
        } else {
            // Hide after a delay
            if (settingsHideTimer) {
                clearTimeout(settingsHideTimer);
            }
            settingsHideTimer = setTimeout(() => {
                if (win && !win.isDestroyed()) {
                    win.setAlwaysOnTop(false);
                    win.hide();
                }
                settingsHideTimer = null;
            }, WINDOW.SETTINGS_HIDE_DELAY);

            win.__lockedByButton = false;
        }
        return;
    }


    if (name === 'shortcut-settings') {
        if (shouldBeVisible) {
            const newBounds = layoutManager.calculateShortcutSettingsWindowPosition();
            if (newBounds) win.setBounds(newBounds);

            if (process.platform === 'darwin') {
                win.setAlwaysOnTop(true, 'screen-saver');
            } else {
                win.setAlwaysOnTop(true);
            }
            disableClicks(win);
            win.show();
        } else {
            if (process.platform === 'darwin') {
                win.setAlwaysOnTop(false, 'screen-saver');
            } else {
                win.setAlwaysOnTop(false);
            }
            restoreClicks();
            win.hide();
        }
        return;
    }

    // Phase 1 - Meeting Assistant: Post-meeting window
    if (name === 'post-meeting') {
        if (shouldBeVisible) {
            // Position near header, similar to settings but larger
            const header = windowPool.get('header');
            if (header && !header.isDestroyed()) {
                const headerBounds = header.getBounds();
                const display = screen.getDisplayNearestPoint({ x: headerBounds.x, y: headerBounds.y });
                const { workArea } = display;

                // Center horizontally, position below header
                const x = Math.max(
                    workArea.x,
                    Math.min(
                        headerBounds.x + (headerBounds.width - WINDOW.POST_MEETING_WIDTH) / 2,
                        workArea.x + workArea.width - WINDOW.POST_MEETING_WIDTH
                    )
                );
                const y = headerBounds.y + headerBounds.height + 10;

                win.setBounds({ x, y, width: WINDOW.POST_MEETING_WIDTH, height: WINDOW.POST_MEETING_MAX_HEIGHT });
            }
            win.show();
        } else {
            win.hide();
        }
        return;
    }

    if (name === 'listen' || name === 'ask') {
        const win = windowPool.get(name);
        const otherName = name === 'listen' ? 'ask' : 'listen';
        const otherWin = windowPool.get(otherName);
        const isOtherWinVisible = otherWin && !otherWin.isDestroyed() && otherWin.isVisible();
        
        const ANIM_OFFSET_X = 50;
        const ANIM_OFFSET_Y = 20;

        const finalVisibility = {
            listen: (name === 'listen' && shouldBeVisible) || (otherName === 'listen' && isOtherWinVisible),
            ask: (name === 'ask' && shouldBeVisible) || (otherName === 'ask' && isOtherWinVisible),
        };
        if (!shouldBeVisible) {
            finalVisibility[name] = false;
        }

        const targetLayout = layoutManager.calculateFeatureWindowLayout(finalVisibility);

        if (shouldBeVisible) {
            if (!win) return;
            const targetBounds = targetLayout[name];
            if (!targetBounds) return;

            const startPos = { ...targetBounds };
            if (name === 'listen') startPos.x -= ANIM_OFFSET_X;
            else if (name === 'ask') startPos.y -= ANIM_OFFSET_Y;

            win.setOpacity(0);
            win.setBounds(startPos);
            win.show();

            movementManager.fade(win, { to: 1 });
            movementManager.animateLayout(targetLayout);

        } else {
            if (!win || !win.isVisible()) return;

            const currentBounds = win.getBounds();
            const targetPos = { ...currentBounds };
            if (name === 'listen') targetPos.x -= ANIM_OFFSET_X;
            else if (name === 'ask') targetPos.y -= ANIM_OFFSET_Y;

            movementManager.fade(win, { to: 0, onComplete: () => win.hide() });
            movementManager.animateWindowPosition(win, targetPos);
            
            // Animer les autres fenêtres vers le nouveau layout
            const otherWindowsLayout = { ...targetLayout };
            delete otherWindowsLayout[name];
            movementManager.animateLayout(otherWindowsLayout);
        }
    }
    } catch (error) {
        console.error(`[WindowManager] Error handling visibility request for '${name}':`, error);
        // Graceful degradation - don't crash the app
    }
}


const setContentProtection = (status) => {
    isContentProtectionOn = status;
    console.log(`[Protection] Content protection toggled to: ${isContentProtectionOn}`);
    windowPool.forEach(win => {
        if (win && !win.isDestroyed()) {
            win.setContentProtection(isContentProtectionOn);
        }
    });
};

const getContentProtectionStatus = () => isContentProtectionOn;

const toggleContentProtection = () => {
    const newStatus = !getContentProtectionStatus();
    setContentProtection(newStatus);
    return newStatus;
};

// Screenshot toggle functions
const getScreenshotEnabled = () => isScreenshotEnabled;

const setScreenshotEnabled = (enabled) => {
    isScreenshotEnabled = enabled;
    console.log(`[Screenshot] Screenshot capture ${enabled ? 'enabled' : 'disabled'}`);
    return isScreenshotEnabled;
};


const openLoginPage = () => {
    const webUrl = process.env.LUCIDE_WEB_URL || 'http://localhost:3000';
    const personalizeUrl = `${webUrl}/personalize?desktop=true`;
    shell.openExternal(personalizeUrl);
    console.log('Opening personalization page:', personalizeUrl);
};


function createFeatureWindows(header, namesToCreate) {
    const commonChildOptions = {
        parent: header,
        show: false,
        frame: false,
        transparent: true,
        vibrancy: false,
        hasShadow: false,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
        },
    };

    const createFeatureWindow = (name) => {
        if (windowPool.has(name)) return;
        
        switch (name) {
            case 'listen': {
                const listen = new BrowserWindow({
                    ...commonChildOptions,
                    width: WINDOW.LISTEN_DEFAULT_WIDTH,
                    minWidth: WINDOW.LISTEN_MIN_WIDTH,
                    maxWidth: WINDOW.LISTEN_MAX_WIDTH,
                    maxHeight: WINDOW.LISTEN_MAX_HEIGHT,
                });
                listen.setContentProtection(isContentProtectionOn);
                listen.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    listen.setWindowButtonVisibility(false);
                }
                const listenLoadOptions = { query: { view: 'listen' } };
                if (!shouldUseLiquidGlass) {
                    listen.loadFile(path.join(__dirname, '../ui/app/content.html'), listenLoadOptions);
                }
                else {
                    listenLoadOptions.query.glass = 'true';
                    listen.loadFile(path.join(__dirname, '../ui/app/content.html'), listenLoadOptions);
                    listen.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(listen.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                openDevToolsInDevelopment(listen);
                windowPool.set('listen', listen);
                break;
            }

            // ask
            case 'ask': {
                const ask = new BrowserWindow({
                    ...commonChildOptions,
                    width: WINDOW.ASK_DEFAULT_WIDTH,
                    height: WINDOW.DEFAULT_HEIGHT, // Hauteur initiale pour éviter une fenêtre trop petite
                    webPreferences: {
                        ...commonChildOptions.webPreferences,
                        webviewTag: true, // Activer le support webview pour le navigateur intégré
                    }
                });
                ask.setContentProtection(isContentProtectionOn);
                ask.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    ask.setWindowButtonVisibility(false);
                }

                // Intercepter la navigation pour afficher les liens dans un navigateur intégré
                ask.webContents.setWindowOpenHandler(({ url }) => {
                    console.log('[WindowManager] Link clicked in Ask window:', url);
                    // Fix MEDIUM BUG-M14: Check webContents not destroyed before sending
                    if (!ask.isDestroyed() && ask.webContents && !ask.webContents.isDestroyed()) {
                        try {
                            // Envoyer l'URL au renderer pour affichage dans le navigateur intégré
                            ask.webContents.send('ask:open-url', url);
                        } catch (error) {
                            // Handle EPIPE errors when window is being destroyed
                            if (error.code === 'EPIPE' || error.message?.includes('EPIPE')) {
                                console.warn('[WindowManager] EPIPE error sending open-url, window likely being destroyed');
                            } else {
                                console.error('[WindowManager] Error sending open-url:', error);
                            }
                        }
                    } else {
                        console.warn('[WindowManager] Ask window destroyed, cannot send open-url event');
                    }
                    return { action: 'deny' }; // Empêcher l'ouverture dans une nouvelle fenêtre
                });

                ask.webContents.on('will-navigate', (event, url) => {
                    // Empêcher la navigation qui remplacerait le contenu
                    if (!url.includes('content.html')) {
                        console.log('[WindowManager] Navigation intercepted:', url);
                        event.preventDefault();
                        // Envoyer l'URL au renderer pour affichage dans le navigateur intégré
                        if (!ask.isDestroyed() && ask.webContents && !ask.webContents.isDestroyed()) {
                            try {
                                ask.webContents.send('ask:open-url', url);
                            } catch (error) {
                                // Handle EPIPE errors when window is being destroyed
                                if (error.code === 'EPIPE' || error.message?.includes('EPIPE')) {
                                    console.warn('[WindowManager] EPIPE error on will-navigate, window likely being destroyed');
                                } else {
                                    console.error('[WindowManager] Error sending open-url on will-navigate:', error);
                                }
                            }
                        }
                    }
                });

                const askLoadOptions = { query: { view: 'ask' } };
                if (!shouldUseLiquidGlass) {
                    ask.loadFile(path.join(__dirname, '../ui/app/content.html'), askLoadOptions);
                }
                else {
                    askLoadOptions.query.glass = 'true';
                    ask.loadFile(path.join(__dirname, '../ui/app/content.html'), askLoadOptions);
                    ask.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(ask.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }

                // Open DevTools in development
                openDevToolsInDevelopment(ask);
                windowPool.set('ask', ask);
                break;
            }

            // settings
            case 'settings': {
                const settings = new BrowserWindow({
                    ...commonChildOptions,
                    width: WINDOW.SETTINGS_WIDTH,
                    maxHeight: WINDOW.SETTINGS_MAX_HEIGHT,
                    parent: undefined
                });
                settings.setContentProtection(isContentProtectionOn);
                settings.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    settings.setWindowButtonVisibility(false);
                }
                const settingsLoadOptions = { query: { view: 'settings' } };
                if (!shouldUseLiquidGlass) {
                    settings.loadFile(path.join(__dirname,'../ui/app/content.html'), settingsLoadOptions)
                        .catch(console.error);
                }
                else {
                    settingsLoadOptions.query.glass = 'true';
                    settings.loadFile(path.join(__dirname,'../ui/app/content.html'), settingsLoadOptions)
                        .catch(console.error);
                    settings.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(settings.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                windowPool.set('settings', settings);

                openDevToolsInDevelopment(settings);
                break;
            }

            case 'shortcut-settings': {
                const shortcutEditor = new BrowserWindow({
                    ...commonChildOptions,
                    width: 353,
                    height: 720,
                    modal: false,
                    parent: undefined,
                    alwaysOnTop: true,
                    titleBarOverlay: false,
                });

                shortcutEditor.setContentProtection(isContentProtectionOn);
                shortcutEditor.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    shortcutEditor.setWindowButtonVisibility(false);
                }

                const loadOptions = { query: { view: 'shortcut-settings' } };
                if (!shouldUseLiquidGlass) {
                    shortcutEditor.loadFile(path.join(__dirname, '../ui/app/content.html'), loadOptions);
                } else {
                    loadOptions.query.glass = 'true';
                    shortcutEditor.loadFile(path.join(__dirname, '../ui/app/content.html'), loadOptions);
                    shortcutEditor.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(shortcutEditor.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                        }
                    });
                }

                windowPool.set('shortcut-settings', shortcutEditor);
                openDevToolsInDevelopment(shortcutEditor);
                break;
            }

            // Phase 1 - Meeting Assistant
            case 'post-meeting': {
                const postMeeting = new BrowserWindow({
                    ...commonChildOptions,
                    width: WINDOW.POST_MEETING_WIDTH,
                    maxHeight: WINDOW.POST_MEETING_MAX_HEIGHT,
                    parent: undefined,
                    alwaysOnTop: false,
                });

                postMeeting.setContentProtection(isContentProtectionOn);
                postMeeting.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    postMeeting.setWindowButtonVisibility(false);
                }

                const postMeetingLoadOptions = { query: { view: 'post-meeting' } };
                if (!shouldUseLiquidGlass) {
                    postMeeting.loadFile(path.join(__dirname, '../ui/app/content.html'), postMeetingLoadOptions);
                } else {
                    postMeetingLoadOptions.query.glass = 'true';
                    postMeeting.loadFile(path.join(__dirname, '../ui/app/content.html'), postMeetingLoadOptions);
                    postMeeting.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(postMeeting.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                        }
                    });
                }

                windowPool.set('post-meeting', postMeeting);
                openDevToolsInDevelopment(postMeeting);
                break;
            }
        }
    };

    if (Array.isArray(namesToCreate)) {
        namesToCreate.forEach(name => createFeatureWindow(name));
    } else if (typeof namesToCreate === 'string') {
        createFeatureWindow(namesToCreate);
    } else {
        createFeatureWindow('listen');
        createFeatureWindow('ask');
        createFeatureWindow('settings');
        createFeatureWindow('shortcut-settings');
        createFeatureWindow('post-meeting');
    }
}

function destroyFeatureWindows() {
    const featureWindows = ['listen','ask','settings','shortcut-settings','post-meeting'];
    if (settingsHideTimer) {
        clearTimeout(settingsHideTimer);
        settingsHideTimer = null;
    }

    // Fix MEDIUM BUG #11: Add error handling to prevent one window failure from blocking cleanup
    // Fix NORMAL MEDIUM BUG-M28: Improve error logging with diagnostic information
    featureWindows.forEach(name => {
        try {
            const win = windowPool.get(name);
            if (win && !win.isDestroyed()) {
                // Capture window state before destruction for better error diagnostics
                const windowState = {
                    visible: win.isVisible(),
                    minimized: win.isMinimized(),
                    maximized: win.isMaximized(),
                    focused: win.isFocused()
                };

                win.destroy();
                console.log(`[WindowManager] Destroyed feature window: ${name}`, windowState);
            }
        } catch (error) {
            // Log full error with stack trace for better debugging
            console.error(
                `[WindowManager] Failed to destroy window '${name}':`,
                error.message,
                '\nStack:', error.stack,
                '\nWindow pool has entry:', windowPool.has(name)
            );
            // Continue with other windows even if one fails
        } finally {
            // Always delete from pool to prevent zombie references
            windowPool.delete(name);
        }
    });
}



function getCurrentDisplay(window) {
    if (!window || window.isDestroyed()) return screen.getPrimaryDisplay();

    const windowBounds = window.getBounds();
    const windowCenter = {
        x: windowBounds.x + windowBounds.width / 2,
        y: windowBounds.y + windowBounds.height / 2,
    };

    return screen.getDisplayNearestPoint(windowCenter);
}



function createWindows() {
    const HEADER_HEIGHT        = 47;
    const DEFAULT_WINDOW_WIDTH = 353;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { y: workAreaY, width: screenWidth } = primaryDisplay.workArea;

    const initialX = Math.round((screenWidth - DEFAULT_WINDOW_WIDTH) / 2);
    const initialY = workAreaY + 21;
        
    const header = new BrowserWindow({
        width: DEFAULT_WINDOW_WIDTH,
        height: HEADER_HEIGHT,
        x: initialX,
        y: initialY,
        frame: false,
        transparent: true,
        vibrancy: false,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        resizable: false,
        focusable: true,
        acceptFirstMouse: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            backgroundThrottling: false,
            enableRemoteModule: false,
            // Ensure proper rendering and prevent pixelation
            experimentalFeatures: false,
        },
        // Prevent pixelation and ensure proper rendering
        useContentSize: true,
        disableAutoHideCursor: true,
    });
    if (process.platform === 'darwin') {
        header.setWindowButtonVisibility(false);
    }
    const headerLoadOptions = {};
    if (!shouldUseLiquidGlass) {
        header.loadFile(path.join(__dirname, '../ui/app/header.html'), headerLoadOptions);
    }
    else {
        headerLoadOptions.query = { glass: 'true' };
        header.loadFile(path.join(__dirname, '../ui/app/header.html'), headerLoadOptions);
        header.webContents.once('did-finish-load', () => {
            const viewId = liquidGlass.addView(header.getNativeWindowHandle());
            if (viewId !== -1) {
                liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                // liquidGlass.unstable_setScrim(viewId, 1); 
                // liquidGlass.unstable_setSubdued(viewId, 1);
            }
        });
    }
    windowPool.set('header', header);
    layoutManager = new WindowLayoutManager(windowPool);
    movementManager = new SmoothMovementManager(windowPool);


    // Fix HIGH BUG-H9: Store listener reference for cleanup
    headerEventListeners.moved = () => {
        // Fix HIGH MEDIUM BUG-M14: Add null check before accessing movementManager
        if (!movementManager) {
            console.warn('[WindowManager] movementManager not initialized, skipping layout update');
            return;
        }
        if (movementManager.isAnimating) {
            return;
        }
        updateChildWindowLayouts(false);
    };
    header.on('moved', headerEventListeners.moved);

    header.webContents.once('dom-ready', () => {
        shortcutsService.initialize(windowPool);
        shortcutsService.handleRestoreDefaults().then(() => {
            shortcutsService.registerShortcuts();
        });
    });

    setupIpcHandlers(windowPool, layoutManager);
    setupWindowController(windowPool, layoutManager, movementManager);

    if (currentHeaderState === 'main') {
        createFeatureWindows(header, ['listen', 'ask', 'settings', 'shortcut-settings']);
    }

    header.setContentProtection(isContentProtectionOn);
    header.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });


    // Open DevTools in development
    openDevToolsInDevelopment(header);

    // Fix HIGH BUG-H9: Store listener references for cleanup
    headerEventListeners.focus = () => {
        console.log('[WindowManager] Header gained focus');
    };
    header.on('focus', headerEventListeners.focus);

    headerEventListeners.blur = () => {
        console.log('[WindowManager] Header lost focus');
    };
    header.on('blur', headerEventListeners.blur);

    headerEventListeners.beforeInput = (event, input) => {
        if (input.type === 'mouseDown') {
            const target = input.target;
            if (target && (target.includes('input') || target.includes('apikey'))) {
                header.focus();
            }
        }
    };
    header.webContents.on('before-input-event', headerEventListeners.beforeInput);

    headerEventListeners.resize = () => updateChildWindowLayouts(false);
    header.on('resize', headerEventListeners.resize);

    return windowPool;
}


function setupIpcHandlers(windowPool, layoutManager) {
    // Fix HIGH BUG-H10: Store screen listener references for cleanup
    screenEventListeners.displayAdded = (event, newDisplay) => {
        console.log('[Display] New display added:', newDisplay.id);
    };
    screen.on('display-added', screenEventListeners.displayAdded);

    screenEventListeners.displayRemoved = (event, oldDisplay) => {
        console.log('[Display] Display removed:', oldDisplay.id);
        const header = windowPool.get('header');

        if (header && getCurrentDisplay(header).id === oldDisplay.id) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const newPosition = layoutManager.calculateNewPositionForDisplay(header, primaryDisplay.id);
            if (newPosition) {
                // Situation de récupération : déplacement immédiat sans animation
                header.setPosition(newPosition.x, newPosition.y, false);
                updateChildWindowLayouts(false);
            }
        }
    };
    screen.on('display-removed', screenEventListeners.displayRemoved);

    screenEventListeners.displayMetricsChanged = (event, display, changedMetrics) => {
        // Appeler la nouvelle version de la fonction de mise à jour du layout
        updateChildWindowLayouts(false);
    };
    screen.on('display-metrics-changed', screenEventListeners.displayMetricsChanged);
}


const handleHeaderStateChanged = (state) => {
    console.log(`[WindowManager] Header state changed to: ${state}`);
    currentHeaderState = state;

    if (state === 'main') {
        createFeatureWindows(windowPool.get('header'));
    } else {         // 'apikey' | 'permission'
        destroyFeatureWindows();
    }
    internalBridge.emit('reregister-shortcuts');
};

/**
 * Fix HIGH BUG-H9/H10/H11/H12: Cleanup all event listeners to prevent memory leaks
 * Should be called before app shutdown
 */
function cleanup() {
    console.log('[WindowManager] Starting cleanup of all event listeners...');

    // Fix HIGH BUG-H12: Clear settings hide timer
    if (settingsHideTimer) {
        clearTimeout(settingsHideTimer);
        settingsHideTimer = null;
        console.log('[WindowManager] Cleared settings hide timer');
    }

    // Fix HIGH BUG-H9: Remove header window event listeners
    const header = windowPool.get('header');
    if (header && !header.isDestroyed()) {
        try {
            if (headerEventListeners.moved) {
                header.removeListener('moved', headerEventListeners.moved);
            }
            if (headerEventListeners.focus) {
                header.removeListener('focus', headerEventListeners.focus);
            }
            if (headerEventListeners.blur) {
                header.removeListener('blur', headerEventListeners.blur);
            }
            if (headerEventListeners.beforeInput) {
                header.webContents.removeListener('before-input-event', headerEventListeners.beforeInput);
            }
            if (headerEventListeners.resize) {
                header.removeListener('resize', headerEventListeners.resize);
            }
            console.log('[WindowManager] Removed header event listeners (5 listeners)');
        } catch (error) {
            console.warn('[WindowManager] Error removing header listeners:', error.message);
        }
    }

    // Fix HIGH BUG-H10: Remove screen event listeners
    try {
        if (screenEventListeners.displayAdded) {
            screen.removeListener('display-added', screenEventListeners.displayAdded);
        }
        if (screenEventListeners.displayRemoved) {
            screen.removeListener('display-removed', screenEventListeners.displayRemoved);
        }
        if (screenEventListeners.displayMetricsChanged) {
            screen.removeListener('display-metrics-changed', screenEventListeners.displayMetricsChanged);
        }
        console.log('[WindowManager] Removed screen event listeners (3 listeners)');
    } catch (error) {
        console.warn('[WindowManager] Error removing screen listeners:', error.message);
    }

    // Fix HIGH BUG-H11: Remove all internalBridge event handlers
    try {
        internalBridge.removeAllListeners();
        console.log('[WindowManager] Removed all internalBridge event handlers');
    } catch (error) {
        console.warn('[WindowManager] Error removing internalBridge listeners:', error.message);
    }

    console.log('[WindowManager] Cleanup completed successfully');
}


module.exports = {
    createWindows,
    windowPool,
    toggleContentProtection,
    resizeHeaderWindow,
    getContentProtectionStatus,
    getScreenshotEnabled,
    setScreenshotEnabled,
    showSettingsWindow,
    hideSettingsWindow,
    cancelHideSettingsWindow,
    openLoginPage,
    moveWindowStep,
    handleHeaderStateChanged,
    handleHeaderAnimationFinished,
    getHeaderPosition,
    moveHeaderTo,
    adjustWindowHeight,
    cleanup, // Fix HIGH BUG-H9/H10/H11/H12: Export cleanup function
};