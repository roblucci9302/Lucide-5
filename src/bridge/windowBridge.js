// src/bridge/windowBridge.js
const { ipcMain, shell } = require('electron');

// Le Bridge enregistre uniquement les handlers IPC (sans logique métier)
module.exports = {
  initialize() {
    // Require windowManager au moment de l'initialisation pour éviter les dépendances circulaires
    const windowManager = require('../window/windowManager');
    
    // Handlers IPC existants
    ipcMain.handle('toggle-content-protection', () => windowManager.toggleContentProtection());
    ipcMain.handle('resize-header-window', (event, args) => windowManager.resizeHeaderWindow(args));
    ipcMain.handle('get-content-protection-status', () => windowManager.getContentProtectionStatus());
    ipcMain.handle('get-screenshot-enabled', () => windowManager.getScreenshotEnabled());
    ipcMain.handle('set-screenshot-enabled', (event, enabled) => windowManager.setScreenshotEnabled(enabled));
    ipcMain.on('show-settings-window', () => windowManager.showSettingsWindow());
    ipcMain.on('hide-settings-window', () => windowManager.hideSettingsWindow());
    ipcMain.on('cancel-hide-settings-window', () => windowManager.cancelHideSettingsWindow());

    ipcMain.handle('open-login-page', () => windowManager.openLoginPage());
    ipcMain.handle('open-personalize-page', () => windowManager.openLoginPage());
    ipcMain.handle('move-window-step', (event, direction) => windowManager.moveWindowStep(direction));
    ipcMain.handle('open-external', async (event, url) => {
      // Security: Whitelist allowed protocols
      const allowedProtocols = ['http:', 'https:'];
      try {
        const parsed = new URL(url);
        if (!allowedProtocols.includes(parsed.protocol)) {
          console.error('[Security] Blocked protocol:', parsed.protocol, 'for URL:', url);
          return { success: false, error: 'Invalid protocol. Only http and https are allowed.' };
        }
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('[Security] Invalid URL:', url, error);
        return { success: false, error: 'Invalid URL format' };
      }
    });

    // Newly moved handlers from windowManager
    ipcMain.on('header-state-changed', (event, state) => windowManager.handleHeaderStateChanged(state));
    ipcMain.on('header-animation-finished', (event, state) => windowManager.handleHeaderAnimationFinished(state));
    ipcMain.handle('get-header-position', () => windowManager.getHeaderPosition());
    ipcMain.handle('move-header-to', (event, newX, newY) => windowManager.moveHeaderTo(newX, newY));
    ipcMain.handle('adjust-window-height', (event, { winName, height }) => windowManager.adjustWindowHeight(winName, height));
  },

  notifyFocusChange(win, isFocused) {
    win.webContents.send('window:focus-change', isFocused);
  }
};