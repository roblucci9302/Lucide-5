# WindowManagerState Integration Guide

## Overview

`WindowManagerState.js` encapsulates all global state variables from `windowManager.js` into a centralized, manageable class. This improves:
- **State tracking**: All state in one place
- **Debugging**: Easy to inspect entire state
- **Memory leaks**: Proper cleanup method
- **Testing**: State can be mocked/injected

## Current Global Variables (Before)

```javascript
// windowManager.js - scattered globals
let liquidGlass;
let shouldUseLiquidGlass = isLiquidGlassSupported();
let isContentProtectionOn = true;
let lastVisibleWindows = new Set(['header']);
let currentHeaderState = 'apikey';
const windowPool = new Map();
let settingsHideTimer = null;
let layoutManager = null;
let movementManager = null;
```

## Refactored State (After)

```javascript
// windowManager.js - centralized state
const WindowManagerState = require('./WindowManagerState');
const state = new WindowManagerState();

// Initialize with defaults
state.setShouldUseLiquidGlass(isLiquidGlassSupported());
state.setContentProtection(true);
state.setHeaderState('apikey');
```

## Migration Steps

### 1. Import and Initialize State

At the top of `windowManager.js`:

```javascript
const WindowManagerState = require('./WindowManagerState');
const state = new WindowManagerState();
```

### 2. Replace Global Variable Access

**Before:**
```javascript
if (isContentProtectionOn) {
    // ...
}
```

**After:**
```javascript
if (state.getContentProtection()) {
    // ...
}
```

### 3. Replace Global Variable Mutations

**Before:**
```javascript
isContentProtectionOn = false;
lastVisibleWindows.add('settings');
windowPool.set('header', headerWindow);
```

**After:**
```javascript
state.setContentProtection(false);
state.addVisibleWindow('settings');
state.setWindow('header', headerWindow);
```

### 4. Update Functions

**Before:**
```javascript
const toggleContentProtection = () => {
    isContentProtectionOn = !isContentProtectionOn;
    return isContentProtectionOn;
};
```

**After:**
```javascript
const toggleContentProtection = () => {
    return state.toggleContentProtection();
};
```

### 5. Add Cleanup on App Shutdown

In `windowManager.js` cleanup function:

```javascript
function cleanup() {
    // ... existing cleanup
    state.cleanup(); // Clean up all state
}
```

## Example Refactorings

### Window Pool Access

**Before:**
```javascript
const headerWindow = windowPool.get('header');
if (windowPool.has('settings')) {
    const settingsWindow = windowPool.get('settings');
}
```

**After:**
```javascript
const headerWindow = state.getWindow('header');
if (state.hasWindow('settings')) {
    const settingsWindow = state.getWindow('settings');
}
```

### Visibility Tracking

**Before:**
```javascript
lastVisibleWindows.add('ask');
lastVisibleWindows.delete('summary');
if (lastVisibleWindows.has('header')) {
    // ...
}
```

**After:**
```javascript
state.addVisibleWindow('ask');
state.removeVisibleWindow('summary');
if (state.isWindowVisible('header')) {
    // ...
}
```

### Settings Timer

**Before:**
```javascript
if (settingsHideTimer) {
    clearTimeout(settingsHideTimer);
}
settingsHideTimer = setTimeout(() => {
    // ...
}, 500);
```

**After:**
```javascript
state.clearSettingsHideTimer();
const timer = setTimeout(() => {
    // ...
}, 500);
state.setSettingsHideTimer(timer);
```

## Benefits

1. **Centralized State**: All window manager state in one object
2. **Easier Debugging**: `state.printState()` shows complete state
3. **Memory Safety**: `state.cleanup()` ensures proper resource cleanup
4. **Better Testing**: State can be injected/mocked in tests
5. **Reduced Globals**: Eliminates 9 global variables

## Next Steps

1. Replace all global variable references with `state.*` methods
2. Test thoroughly after each refactoring
3. Add `state.cleanup()` to app shutdown sequence
4. Consider passing `state` as parameter to functions for better testability
