/**
 * Events Bridge - Event forwarding from services to renderer windows
 */
const { BrowserWindow } = require('electron');
const localAIManager = require('../../features/common/services/localAIManager');
const modelStateService = require('../../features/common/services/modelStateService');

// Track event listeners for cleanup
const eventListeners = [];

function trackListener(emitter, event, handler) {
    emitter.on(event, handler);
    eventListeners.push({ emitter, event, handler });
}

module.exports = {
    initialize() {
        // LocalAIManager events - broadcast to all windows
        trackListener(localAIManager, 'install-progress', (service, data) => {
            const event = { service, ...data };
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('localai:install-progress', event);
                }
            });
        });

        trackListener(localAIManager, 'installation-complete', (service) => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('localai:installation-complete', { service });
                }
            });
        });

        trackListener(localAIManager, 'error', (error) => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('localai:error-occurred', error);
                }
            });
        });

        // Handle error-occurred events from LocalAIManager's error handling
        trackListener(localAIManager, 'error-occurred', (error) => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('localai:error-occurred', error);
                }
            });
        });

        trackListener(localAIManager, 'model-ready', (data) => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('localai:model-ready', data);
                }
            });
        });

        trackListener(localAIManager, 'state-changed', (service, state) => {
            const event = { service, ...state };
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('localai:service-status-changed', event);
                }
            });
        });

        // ModelStateService events - broadcast to all windows
        trackListener(modelStateService, 'state-updated', (state) => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('model-state:updated', state);
                }
            });
        });

        trackListener(modelStateService, 'settings-updated', () => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('settings-updated');
                }
            });
        });

        trackListener(modelStateService, 'force-show-apikey-header', () => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('force-show-apikey-header');
                }
            });
        });

        console.log('[EventsBridge] Initialized with event forwarding');
    },

    /**
     * Cleanup all event listeners to prevent memory leaks
     * Should be called before app shutdown
     */
    cleanup() {
        console.log('[EventsBridge] Cleaning up event listeners...');

        eventListeners.forEach(({ emitter, event, handler }) => {
            try {
                emitter.removeListener(event, handler);
            } catch (error) {
                console.error(`[EventsBridge] Error removing listener for event '${event}':`, error);
            }
        });

        // Clear the array
        eventListeners.length = 0;

        console.log('[EventsBridge] Event listeners cleanup complete');
    }
};
