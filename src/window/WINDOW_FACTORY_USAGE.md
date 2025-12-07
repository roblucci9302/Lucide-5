# WindowFactory Usage Guide

## Overview

`WindowFactory` implements the Factory Pattern for creating BrowserWindow instances with predefined configurations. This centralizes window creation logic and ensures consistency across the application.

## Benefits

1. **Centralized Configuration**: All window presets in one place
2. **Consistency**: Same base config for all windows
3. **DRY**: No duplicate configuration code
4. **Maintainability**: Update presets in one place
5. **Type Safety**: Factory methods ensure correct window types
6. **Testability**: Can mock factory for tests

## Quick Start

### Import Factory

```javascript
const { windowFactory } = require('./WindowFactory');
```

### Create Windows

```javascript
// Header window
const header = windowFactory.createHeaderWindow();

// Feature windows (listen, ask, summary, etc.)
const listen = windowFactory.createFeatureWindow('listen');
const ask = windowFactory.createFeatureWindow('ask', { width: 600 });

// Settings window
const settings = windowFactory.createSettingsWindow(headerWindow);

// Shortcut editor
const shortcutEditor = windowFactory.createShortcutEditorWindow();

// Login window
const login = windowFactory.createLoginWindow();
```

## Predefined Presets

### Base Configuration

Applied to all windows:

```javascript
{
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    experimentalFeatures: false,
    backgroundThrottling: false,
    preload: path.join(__dirname, '../preload.js')
}
```

### Header Window

```javascript
{
    width: 1200,
    height: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    acceptFirstMouse: true,
    visibleOnAllWorkspaces: true
}
```

### Feature Window

Default configuration for listen, ask, summary windows:

```javascript
{
    width: 1200,
    height: 0,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    acceptFirstMouse: true,
    visibleOnAllWorkspaces: true,
    show: false
}
```

### Settings Window

```javascript
{
    width: 240,
    maxHeight: 400,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false
}
```

## Migration Guide

### Before (Direct BrowserWindow Creation)

```javascript
const listen = new BrowserWindow({
    width: 1200,
    height: 0,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    acceptFirstMouse: true,
    visibleOnAllWorkspaces: true,
    show: false,
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        backgroundThrottling: false,
        enableRemoteModule: false,
        experimentalFeatures: false
    }
});
```

### After (Factory Pattern)

```javascript
const { windowFactory } = require('./WindowFactory');

const listen = windowFactory.createFeatureWindow('listen');
```

### Benefits of Migration

- **Before**: 21 lines of configuration
- **After**: 1 line of code
- **Reduction**: ~95% less code per window

## Advanced Usage

### Override Preset Values

```javascript
// Create feature window with custom width
const customWindow = windowFactory.createFeatureWindow('custom', {
    width: 800,
    height: 600
});

// Override webPreferences
const debugWindow = windowFactory.createFeatureWindow('debug', {
    webPreferences: {
        devTools: true
    }
});
```

### Create Custom Window

For non-standard windows:

```javascript
const customWindow = windowFactory.createCustomWindow({
    width: 1024,
    height: 768,
    frame: true,
    transparent: false,
    title: 'Custom Window'
});
```

### Update Presets Dynamically

```javascript
// Update feature window preset
windowFactory.updatePreset('feature', {
    width: 1400,  // Increase default width
    height: 100
});

// All future feature windows will use updated preset
const listen = windowFactory.createFeatureWindow('listen');
```

### Inspect Preset Configuration

```javascript
// Get preset for debugging/testing
const headerPreset = windowFactory.getPreset('header');
console.log('Header config:', headerPreset);
```

## Migration Plan for windowManager.js

### Step 1: Import Factory

```javascript
// At top of windowManager.js
const { windowFactory } = require('./WindowFactory');
```

### Step 2: Replace Header Window Creation

**Before:**
```javascript
const header = new BrowserWindow({
    width: 1200,
    height: 40,
    frame: false,
    // ... many more options
    webPreferences: {
        nodeIntegration: false,
        // ... more options
    }
});
```

**After:**
```javascript
const header = windowFactory.createHeaderWindow();
```

### Step 3: Replace Feature Window Creations

**Before:**
```javascript
const listen = new BrowserWindow({
    width: 1200,
    height: 0,
    frame: false,
    // ... many options
});

const ask = new BrowserWindow({ ...commonChildOptions, width: 600 });
```

**After:**
```javascript
const listen = windowFactory.createFeatureWindow('listen');
const ask = windowFactory.createFeatureWindow('ask', { width: 600 });
```

### Step 4: Replace Settings Window

**Before:**
```javascript
const settings = new BrowserWindow({
    ...commonChildOptions,
    width: 240,
    maxHeight: 400,
    parent: undefined
});
```

**After:**
```javascript
const settings = windowFactory.createSettingsWindow(null, {
    maxHeight: 400
});
```

### Step 5: Remove commonChildOptions

Once all windows use factory, remove the `commonChildOptions` object since it's now handled by presets.

## Testing

### Mock Factory for Tests

```javascript
// test/windowFactory.test.js
const { WindowFactory } = require('../src/window/WindowFactory');

describe('WindowFactory', () => {
    let factory;

    beforeEach(() => {
        factory = new WindowFactory();
    });

    it('should create header window with correct preset', () => {
        const preset = factory.getPreset('header');
        expect(preset.width).toBe(1200);
        expect(preset.height).toBe(40);
        expect(preset.frame).toBe(false);
    });

    it('should merge custom options', () => {
        // Create window with custom width
        const window = factory.createHeaderWindow({ width: 1400 });
        // Verify configuration
    });
});
```

## Best Practices

### ✅ Do

```javascript
// Use factory methods for standard windows
const header = windowFactory.createHeaderWindow();
const listen = windowFactory.createFeatureWindow('listen');

// Override specific options when needed
const customAsk = windowFactory.createFeatureWindow('ask', {
    width: 800
});

// Update presets if many windows need same change
windowFactory.updatePreset('feature', { width: 1400 });
```

### ❌ Don't

```javascript
// Don't create windows directly
const window = new BrowserWindow({ /* config */ }); // ❌

// Don't duplicate configuration
const listen = new BrowserWindow({ ...commonOptions }); // ❌

// Don't hardcode configurations in multiple places
function createWindow() {
    return new BrowserWindow({ width: 1200, ... }); // ❌
}
```

## Configuration Reference

All presets support these options:

- **Dimensions**: width, height, minWidth, minHeight, maxWidth, maxHeight
- **Position**: x, y
- **Window Style**: frame, transparent, opacity
- **Behavior**: resizable, movable, minimizable, maximizable, closable
- **Visibility**: show, alwaysOnTop, skipTaskbar, hasShadow
- **Parent**: parent (for modal windows)
- **Web Preferences**: All Electron webPreferences options

## Future Enhancements

1. **Themes**: Different presets for light/dark mode
2. **Responsive**: Auto-adjust based on screen size
3. **Validation**: Validate configurations before creation
4. **Telemetry**: Track which windows are created
5. **Hot Reload**: Update running windows when presets change
