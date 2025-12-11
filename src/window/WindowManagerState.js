/**
 * WindowManagerState - Encapsulates all window manager state
 * Provides centralized state management for window operations
 */
class WindowManagerState {
    constructor() {
        // LiquidGlass state
        this.liquidGlass = null;
        this.shouldUseLiquidGlass = false;

        // Content protection
        this.isContentProtectionOn = true;

        // Window visibility tracking
        this.lastVisibleWindows = new Set(['header']);

        // Header state
        this.currentHeaderState = 'apikey';

        // Window pool
        this.windowPool = new Map();

        // Settings hide timer
        this.settingsHideTimer = null;

        // Layout and movement managers
        this.layoutManager = null;
        this.movementManager = null;
    }

    // === LiquidGlass Methods ===

    setLiquidGlass(liquidGlass) {
        this.liquidGlass = liquidGlass;
    }

    getLiquidGlass() {
        return this.liquidGlass;
    }

    setShouldUseLiquidGlass(value) {
        this.shouldUseLiquidGlass = value;
    }

    getShouldUseLiquidGlass() {
        return this.shouldUseLiquidGlass;
    }

    // === Content Protection Methods ===

    setContentProtection(status) {
        this.isContentProtectionOn = status;
    }

    getContentProtection() {
        return this.isContentProtectionOn;
    }

    toggleContentProtection() {
        this.isContentProtectionOn = !this.isContentProtectionOn;
        return this.isContentProtectionOn;
    }

    // === Window Visibility Methods ===

    setLastVisibleWindows(windows) {
        this.lastVisibleWindows = new Set(windows);
    }

    getLastVisibleWindows() {
        return this.lastVisibleWindows;
    }

    addVisibleWindow(windowName) {
        this.lastVisibleWindows.add(windowName);
    }

    removeVisibleWindow(windowName) {
        this.lastVisibleWindows.delete(windowName);
    }

    isWindowVisible(windowName) {
        return this.lastVisibleWindows.has(windowName);
    }

    clearVisibleWindows() {
        this.lastVisibleWindows.clear();
    }

    // === Header State Methods ===

    setHeaderState(state) {
        this.currentHeaderState = state;
    }

    getHeaderState() {
        return this.currentHeaderState;
    }

    // === Window Pool Methods ===

    getWindow(name) {
        return this.windowPool.get(name);
    }

    setWindow(name, window) {
        this.windowPool.set(name, window);
    }

    hasWindow(name) {
        return this.windowPool.has(name);
    }

    deleteWindow(name) {
        return this.windowPool.delete(name);
    }

    getAllWindows() {
        return Array.from(this.windowPool.values());
    }

    getWindowNames() {
        return Array.from(this.windowPool.keys());
    }

    clearWindowPool() {
        this.windowPool.clear();
    }

    // === Settings Timer Methods ===

    setSettingsHideTimer(timer) {
        this.settingsHideTimer = timer;
    }

    getSettingsHideTimer() {
        return this.settingsHideTimer;
    }

    clearSettingsHideTimer() {
        if (this.settingsHideTimer) {
            clearTimeout(this.settingsHideTimer);
            this.settingsHideTimer = null;
        }
    }

    // === Manager Methods ===

    setLayoutManager(manager) {
        this.layoutManager = manager;
    }

    getLayoutManager() {
        return this.layoutManager;
    }

    setMovementManager(manager) {
        this.movementManager = manager;
    }

    getMovementManager() {
        return this.movementManager;
    }

    // === Cleanup Method ===

    cleanup() {
        console.log('[WindowManagerState] Cleaning up state...');

        // Clear timers
        this.clearSettingsHideTimer();

        // Clear collections
        this.lastVisibleWindows.clear();
        this.windowPool.clear();

        // Reset references
        this.liquidGlass = null;
        this.layoutManager = null;
        this.movementManager = null;

        console.log('[WindowManagerState] Cleanup complete');
    }

    // === Debug Methods ===

    getState() {
        return {
            shouldUseLiquidGlass: this.shouldUseLiquidGlass,
            isContentProtectionOn: this.isContentProtectionOn,
            currentHeaderState: this.currentHeaderState,
            visibleWindows: Array.from(this.lastVisibleWindows),
            windowPoolSize: this.windowPool.size,
            hasSettingsTimer: this.settingsHideTimer !== null,
            hasLayoutManager: this.layoutManager !== null,
            hasMovementManager: this.movementManager !== null
        };
    }

    printState() {
        console.log('[WindowManagerState] Current state:', JSON.stringify(this.getState(), null, 2));
    }
}

module.exports = WindowManagerState;
