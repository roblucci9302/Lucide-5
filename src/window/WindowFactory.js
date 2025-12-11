/**
 * WindowFactory - Centralized window creation with predefined configurations
 * Implements Factory Pattern for BrowserWindow creation
 */
const { BrowserWindow } = require('electron');
const path = require('node:path');
const { WINDOW } = require('../features/common/config/constants');

/**
 * Common window configurations
 */
const WINDOW_PRESETS = {
    // Base configuration for all windows
    base: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        experimentalFeatures: false,
        backgroundThrottling: false
    },

    // Header window (main control bar)
    header: {
        width: WINDOW.DEFAULT_WIDTH,
        height: WINDOW.HEADER_HEIGHT,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        acceptFirstMouse: true,
        visibleOnAllWorkspaces: true
    },

    // Feature windows (listen, ask, summary, etc.)
    feature: {
        width: WINDOW.DEFAULT_WIDTH,
        height: 0,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        acceptFirstMouse: true,
        visibleOnAllWorkspaces: true,
        show: false
    },

    // Settings window
    settings: {
        width: WINDOW.SETTINGS_WIDTH,
        maxHeight: WINDOW.SETTINGS_MAX_HEIGHT,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        parent: undefined, // Will be set at creation
        show: false
    },

    // Shortcut editor window
    shortcutEditor: {
        width: 500,
        height: WINDOW.DEFAULT_HEIGHT,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        show: false
    },

    // Login window
    login: {
        width: WINDOW.ASK_DEFAULT_WIDTH,
        height: WINDOW.DEFAULT_HEIGHT,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        show: false
    }
};

class WindowFactory {
    constructor() {
        this.preloadPath = path.join(__dirname, '../preload.js');
    }

    /**
     * Create base window configuration with preload script
     */
    _getBaseConfig() {
        return {
            webPreferences: {
                ...WINDOW_PRESETS.base,
                preload: this.preloadPath
            }
        };
    }

    /**
     * Merge configurations with proper precedence
     * @param {...Object} configs - Configuration objects to merge
     */
    _mergeConfigs(...configs) {
        const merged = {};

        for (const config of configs) {
            Object.assign(merged, config);

            // Handle webPreferences separately
            if (config.webPreferences) {
                merged.webPreferences = {
                    ...merged.webPreferences,
                    ...config.webPreferences
                };
            }
        }

        return merged;
    }

    /**
     * Create header window
     * @param {Object} options - Additional options
     * @returns {BrowserWindow}
     */
    createHeaderWindow(options = {}) {
        const config = this._mergeConfigs(
            this._getBaseConfig(),
            WINDOW_PRESETS.header,
            options
        );

        return new BrowserWindow(config);
    }

    /**
     * Create feature window (listen, ask, summary, etc.)
     * @param {string} name - Window name
     * @param {Object} options - Additional options
     * @returns {BrowserWindow}
     */
    createFeatureWindow(name, options = {}) {
        const config = this._mergeConfigs(
            this._getBaseConfig(),
            WINDOW_PRESETS.feature,
            { title: name },
            options
        );

        return new BrowserWindow(config);
    }

    /**
     * Create settings window
     * @param {BrowserWindow} parent - Parent window
     * @param {Object} options - Additional options
     * @returns {BrowserWindow}
     */
    createSettingsWindow(parent = null, options = {}) {
        const config = this._mergeConfigs(
            this._getBaseConfig(),
            WINDOW_PRESETS.settings,
            { parent },
            options
        );

        return new BrowserWindow(config);
    }

    /**
     * Create shortcut editor window
     * @param {Object} options - Additional options
     * @returns {BrowserWindow}
     */
    createShortcutEditorWindow(options = {}) {
        const config = this._mergeConfigs(
            this._getBaseConfig(),
            WINDOW_PRESETS.shortcutEditor,
            options
        );

        return new BrowserWindow(config);
    }

    /**
     * Create login window
     * @param {Object} options - Additional options
     * @returns {BrowserWindow}
     */
    createLoginWindow(options = {}) {
        const config = this._mergeConfigs(
            this._getBaseConfig(),
            WINDOW_PRESETS.login,
            options
        );

        return new BrowserWindow(config);
    }

    /**
     * Create generic window with custom configuration
     * @param {Object} config - Complete window configuration
     * @returns {BrowserWindow}
     */
    createCustomWindow(config) {
        const finalConfig = this._mergeConfigs(
            this._getBaseConfig(),
            config
        );

        return new BrowserWindow(finalConfig);
    }

    /**
     * Get preset configuration (for inspection/testing)
     * @param {string} presetName - Name of preset
     * @returns {Object} Preset configuration
     */
    getPreset(presetName) {
        return { ...WINDOW_PRESETS[presetName] };
    }

    /**
     * Update preset configuration
     * @param {string} presetName - Name of preset
     * @param {Object} updates - Configuration updates
     */
    updatePreset(presetName, updates) {
        if (!WINDOW_PRESETS[presetName]) {
            throw new Error(`Preset '${presetName}' does not exist`);
        }

        Object.assign(WINDOW_PRESETS[presetName], updates);
    }
}

// Export singleton instance
const windowFactory = new WindowFactory();

module.exports = {
    WindowFactory,
    windowFactory,
    WINDOW_PRESETS
};
