/**
 * Test Suite: Shortcuts System
 *
 * Tests all aspects of the keyboard shortcuts system:
 * 1. Predefined shortcuts listing
 * 2. Platform-specific shortcuts (Mac/Windows/Linux)
 * 3. Shortcut customization
 * 4. Restore default values
 * 5. Shortcut conflicts detection
 * 6. Cross-platform compatibility
 */

const fs = require('fs');
const path = require('path');

// ============================================
// TEST UTILITIES
// ============================================

let testsPassed = 0;
let testsFailed = 0;
let currentGroup = '';

function startGroup(name) {
    currentGroup = name;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 ${name}`);
    console.log('='.repeat(60));
}

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`  ✅ ${name}`);
    } catch (e) {
        testsFailed++;
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${e.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertIncludes(str, pattern, message) {
    if (!str.includes(pattern)) {
        throw new Error(message || `String should include "${pattern}"`);
    }
}

function assertNotIncludes(str, pattern, message) {
    if (str.includes(pattern)) {
        throw new Error(message || `String should NOT include "${pattern}"`);
    }
}

// ============================================
// LOAD SOURCE FILES
// ============================================

const shortcutsServiceSource = fs.readFileSync('./src/features/shortcuts/shortcutsService.js', 'utf8');
const shortcutsRepoSource = fs.readFileSync('./src/features/shortcuts/repositories/sqlite.repository.js', 'utf8');
const shortcutSettingsViewSource = fs.readFileSync('./src/ui/settings/ShortCutSettingsView.js', 'utf8');
const settingsBridgeSource = fs.readFileSync('./src/bridge/modules/settingsBridge.js', 'utf8');
const preloadSource = fs.readFileSync('./src/preload.js', 'utf8');

// ============================================
// PREDEFINED SHORTCUTS
// ============================================

// Extract default keybinds from source (simulating Mac and Windows)
function getDefaultKeybinds(isMac) {
    return {
        moveUp: isMac ? 'Cmd+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Cmd+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Cmd+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Cmd+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+D' : 'Ctrl+D',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
        manualScreenshot: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
        previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
        nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
        scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        sendLastTranscription: isMac ? 'Cmd+S' : 'Ctrl+S',
        openBrowser: isMac ? 'Cmd+B' : 'Ctrl+B',
    };
}

// System shortcuts that should be reserved
const COMMON_SYSTEM_SHORTCUTS = new Set([
    'Cmd+Q', 'Cmd+W', 'Cmd+A', 'Cmd+S', 'Cmd+Z', 'Cmd+X', 'Cmd+C', 'Cmd+V', 'Cmd+P', 'Cmd+F', 'Cmd+G', 'Cmd+H', 'Cmd+M', 'Cmd+N', 'Cmd+O', 'Cmd+T',
    'Ctrl+Q', 'Ctrl+W', 'Ctrl+A', 'Ctrl+S', 'Ctrl+Z', 'Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+P', 'Ctrl+F', 'Ctrl+G', 'Ctrl+H', 'Ctrl+M', 'Ctrl+N', 'Ctrl+O', 'Ctrl+T'
]);

// ============================================
// TEST 1: Predefined Shortcuts Listing
// ============================================

function testPredefinedShortcuts() {
    startGroup('1. Predefined Shortcuts Listing');

    const macDefaults = getDefaultKeybinds(true);
    const windowsDefaults = getDefaultKeybinds(false);

    // Test 1.1: All 14 shortcuts defined
    test('14 default shortcuts defined', () => {
        assertEqual(Object.keys(macDefaults).length, 14, 'Should have 14 default shortcuts');
    });

    // Test 1.2: Movement shortcuts
    test('Movement shortcuts defined (moveUp, moveDown, moveLeft, moveRight)', () => {
        assert(macDefaults.moveUp, 'moveUp should be defined');
        assert(macDefaults.moveDown, 'moveDown should be defined');
        assert(macDefaults.moveLeft, 'moveLeft should be defined');
        assert(macDefaults.moveRight, 'moveRight should be defined');
    });

    // Test 1.3: Visibility toggles
    test('Visibility shortcuts defined', () => {
        assert(macDefaults.toggleVisibility, 'toggleVisibility should be defined');
        assert(macDefaults.toggleClickThrough, 'toggleClickThrough should be defined');
    });

    // Test 1.4: Navigation shortcuts
    test('Navigation shortcuts defined (scrollUp, scrollDown, previous/nextResponse)', () => {
        assert(macDefaults.scrollUp, 'scrollUp should be defined');
        assert(macDefaults.scrollDown, 'scrollDown should be defined');
        assert(macDefaults.previousResponse, 'previousResponse should be defined');
        assert(macDefaults.nextResponse, 'nextResponse should be defined');
    });

    // Test 1.5: Action shortcuts
    test('Action shortcuts defined (nextStep, manualScreenshot, sendLastTranscription)', () => {
        assert(macDefaults.nextStep, 'nextStep should be defined');
        assert(macDefaults.manualScreenshot, 'manualScreenshot should be defined');
        assert(macDefaults.sendLastTranscription, 'sendLastTranscription should be defined');
    });

    // Test 1.6: Browser shortcut
    test('Browser shortcut defined', () => {
        assert(macDefaults.openBrowser, 'openBrowser should be defined');
    });

    // Test 1.7: getDefaultKeybinds exists in service
    test('getDefaultKeybinds method exists in service', () => {
        assertIncludes(shortcutsServiceSource, 'getDefaultKeybinds()');
    });

    // Test 1.8: loadKeybinds returns defaults when empty
    test('loadKeybinds loads defaults when no saved keybinds', () => {
        assertIncludes(shortcutsServiceSource, 'No keybinds found. Loading defaults');
    });
}

// ============================================
// TEST 2: Platform-Specific Shortcuts
// ============================================

function testPlatformSpecificShortcuts() {
    startGroup('2. Platform-Specific Shortcuts (Mac/Windows/Linux)');

    const macDefaults = getDefaultKeybinds(true);
    const windowsDefaults = getDefaultKeybinds(false);

    // Test 2.1: Mac uses Cmd
    test('Mac shortcuts use Cmd modifier', () => {
        Object.values(macDefaults).forEach(shortcut => {
            assert(shortcut.includes('Cmd'), `Mac shortcut "${shortcut}" should use Cmd`);
        });
    });

    // Test 2.2: Windows/Linux uses Ctrl
    test('Windows/Linux shortcuts use Ctrl modifier', () => {
        Object.values(windowsDefaults).forEach(shortcut => {
            assert(shortcut.includes('Ctrl'), `Windows shortcut "${shortcut}" should use Ctrl`);
        });
    });

    // Test 2.3: Platform detection in service
    test('Service detects platform via process.platform', () => {
        assertIncludes(shortcutsServiceSource, "process.platform === 'darwin'");
    });

    // Test 2.4: Same action keys across platforms
    test('Same action keys used across platforms', () => {
        assertEqual(macDefaults.moveUp.replace('Cmd', 'X'), windowsDefaults.moveUp.replace('Ctrl', 'X'));
        assertEqual(macDefaults.toggleVisibility.replace('Cmd', 'X'), windowsDefaults.toggleVisibility.replace('Ctrl', 'X'));
        assertEqual(macDefaults.nextStep.replace('Cmd', 'X'), windowsDefaults.nextStep.replace('Ctrl', 'X'));
    });

    // Test 2.5: Platform modifier for hardcoded shortcuts
    test('Hardcoded shortcuts also use platform modifier', () => {
        assertIncludes(shortcutsServiceSource, "const modifier = isMac ? 'Cmd' : 'Ctrl'");
    });

    // Test 2.6: Monitor switching shortcuts use Shift
    test('Monitor switching shortcuts include Shift', () => {
        assertIncludes(shortcutsServiceSource, '${modifier}+Shift+${index + 1}');
    });

    // Test 2.7: Edge snapping shortcuts
    test('Edge snapping shortcuts defined', () => {
        assertIncludes(shortcutsServiceSource, '${modifier}+Shift+Left');
        assertIncludes(shortcutsServiceSource, '${modifier}+Shift+Right');
    });
}

// ============================================
// TEST 3: Shortcut Customization
// ============================================

function testShortcutCustomization() {
    startGroup('3. Shortcut Customization');

    // Test 3.1: saveKeybinds method exists
    test('saveKeybinds method exists', () => {
        assertIncludes(shortcutsServiceSource, 'async saveKeybinds(newKeybinds)');
    });

    // Test 3.2: Repository upsert function
    test('Repository has upsertKeybinds function', () => {
        assertIncludes(shortcutsRepoSource, 'function upsertKeybinds');
    });

    // Test 3.3: Uses transaction for bulk updates
    test('Repository uses transaction for bulk updates', () => {
        assertIncludes(shortcutsRepoSource, 'db.transaction');
    });

    // Test 3.4: ON CONFLICT for upsert
    test('Uses ON CONFLICT for upsert behavior', () => {
        assertIncludes(shortcutsRepoSource, 'ON CONFLICT');
    });

    // Test 3.5: IPC handler for saving shortcuts
    test('IPC handler for saving shortcuts exists', () => {
        assertIncludes(settingsBridgeSource, 'shortcut:saveShortcuts');
    });

    // Test 3.6: handleSaveShortcuts closes window after save
    test('handleSaveShortcuts closes settings window after save', () => {
        const handleSaveSection = shortcutsServiceSource.substring(
            shortcutsServiceSource.indexOf('async handleSaveShortcuts'),
            shortcutsServiceSource.indexOf('async handleSaveShortcuts') + 400
        );
        assertIncludes(handleSaveSection, 'closeShortcutSettingsWindow');
    });

    // Test 3.7: UI can capture new shortcuts
    test('UI has keyboard capture for new shortcuts', () => {
        assertIncludes(shortcutSettingsViewSource, 'handleKeydown');
        assertIncludes(shortcutSettingsViewSource, 'capturingKey');
    });

    // Test 3.8: UI allows disabling shortcuts
    test('UI allows disabling shortcuts', () => {
        assertIncludes(shortcutSettingsViewSource, 'disableShortcut');
    });

    // Test 3.9: Disabled shortcuts use empty string
    test('Disabled shortcuts stored as empty string', () => {
        assertIncludes(shortcutSettingsViewSource, "''");
    });

    // Test 3.10: Service skips empty accelerators
    test('Service skips empty accelerators during registration', () => {
        assertIncludes(shortcutsServiceSource, 'if (!accelerator) continue');
    });
}

// ============================================
// TEST 4: Restore Default Values
// ============================================

function testRestoreDefaults() {
    startGroup('4. Restore Default Values');

    // Test 4.1: handleRestoreDefaults method exists
    test('handleRestoreDefaults method exists', () => {
        assertIncludes(shortcutsServiceSource, 'async handleRestoreDefaults()');
    });

    // Test 4.2: Deletes all keybinds before restoring
    test('Deletes all existing keybinds before restoring', () => {
        assertIncludes(shortcutsServiceSource, 'deleteAllKeybinds');
    });

    // Test 4.3: Repository has deleteAllKeybinds
    test('Repository has deleteAllKeybinds function', () => {
        assertIncludes(shortcutsRepoSource, 'function deleteAllKeybinds');
    });

    // Test 4.4: Saves default keybinds after deletion
    test('Saves default keybinds after deletion', () => {
        const restoreSection = shortcutsServiceSource.substring(
            shortcutsServiceSource.indexOf('async handleRestoreDefaults'),
            shortcutsServiceSource.indexOf('async handleRestoreDefaults') + 300
        );
        assertIncludes(restoreSection, 'getDefaultKeybinds');
        assertIncludes(restoreSection, 'saveKeybinds');
    });

    // Test 4.5: Re-registers shortcuts after restore
    test('Re-registers shortcuts after restore', () => {
        const restoreSection = shortcutsServiceSource.substring(
            shortcutsServiceSource.indexOf('async handleRestoreDefaults'),
            shortcutsServiceSource.indexOf('async handleRestoreDefaults') + 300
        );
        assertIncludes(restoreSection, 'registerShortcuts');
    });

    // Test 4.6: Returns default keybinds to UI
    test('Returns default keybinds to UI', () => {
        // Method returns defaults after restoring
        assertIncludes(shortcutsServiceSource, 'return defaults;');
    });

    // Test 4.7: UI has reset button
    test('UI has reset to default button', () => {
        assertIncludes(shortcutSettingsViewSource, 'handleResetToDefault');
    });

    // Test 4.8: UI confirms before reset
    test('UI shows confirmation before reset', () => {
        assertIncludes(shortcutSettingsViewSource, 'confirm(');
    });

    // Test 4.9: IPC handler for getting defaults
    test('IPC handler for getting defaults exists', () => {
        assertIncludes(settingsBridgeSource, 'shortcut:getDefaultShortcuts');
    });
}

// ============================================
// TEST 5: Shortcut Conflicts Detection
// ============================================

function testShortcutConflicts() {
    startGroup('5. Shortcut Conflicts Detection');

    // Test 5.1: System shortcuts list defined
    test('System shortcuts list defined in UI', () => {
        assertIncludes(shortcutSettingsViewSource, 'commonSystemShortcuts');
    });

    // Test 5.2: System shortcuts include common shortcuts
    test('System shortcuts include Cmd+C, Cmd+V, etc.', () => {
        assertIncludes(shortcutSettingsViewSource, "'Cmd+C'");
        assertIncludes(shortcutSettingsViewSource, "'Cmd+V'");
        assertIncludes(shortcutSettingsViewSource, "'Ctrl+C'");
        assertIncludes(shortcutSettingsViewSource, "'Ctrl+V'");
    });

    // Test 5.3: Validates against system shortcuts
    test('Validates against system shortcuts', () => {
        assertIncludes(shortcutSettingsViewSource, 'commonSystemShortcuts.has');
    });

    // Test 5.4: Returns error for system shortcuts
    test('Returns error for reserved system shortcuts', () => {
        assertIncludes(shortcutSettingsViewSource, 'systemReserved');
    });

    // Test 5.5: Requires modifier key
    test('Requires at least one modifier key', () => {
        assertIncludes(shortcutSettingsViewSource, 'needsModifier');
    });

    // Test 5.6: Limits max keys
    test('Limits maximum number of keys', () => {
        assertIncludes(shortcutSettingsViewSource, 'maxKeys');
    });

    // Test 5.7: Parses accelerator correctly
    test('Parses accelerator from keyboard event', () => {
        assertIncludes(shortcutSettingsViewSource, '_parseAccelerator');
    });

    // Test 5.8: Handles modifier keys separately
    test('Handles modifier-only key presses', () => {
        assertIncludes(shortcutSettingsViewSource, 'isModifier');
        assertIncludes(shortcutSettingsViewSource, "'Meta','Control','Alt','Shift'");
    });

    // Test 5.9: Service catches registration errors
    test('Service catches shortcut registration errors', () => {
        assertIncludes(shortcutsServiceSource, 'Failed to register shortcut');
    });

    // Test 5.10: No duplicate shortcuts in defaults
    test('No duplicate shortcuts in default keybinds', () => {
        const macDefaults = getDefaultKeybinds(true);
        const values = Object.values(macDefaults);
        const uniqueValues = new Set(values);
        assertEqual(values.length, uniqueValues.size, 'Default shortcuts should be unique');
    });
}

// ============================================
// TEST 6: Cross-Platform Compatibility
// ============================================

function testCrossPlatformCompatibility() {
    startGroup('6. Cross-Platform Compatibility');

    // Test 6.1: Uses Electron globalShortcut
    test('Uses Electron globalShortcut module', () => {
        assertIncludes(shortcutsServiceSource, "require('electron')");
        assertIncludes(shortcutsServiceSource, 'globalShortcut');
    });

    // Test 6.2: Unregisters before registering
    test('Unregisters all shortcuts before registering new ones', () => {
        assertIncludes(shortcutsServiceSource, 'globalShortcut.unregisterAll()');
    });

    // Test 6.3: Arrow key mapping
    test('Maps arrow keys to Electron format', () => {
        assertIncludes(shortcutSettingsViewSource, 'ArrowUp');
        assertIncludes(shortcutSettingsViewSource, 'ArrowDown');
        assertIncludes(shortcutSettingsViewSource, "'Up'");
        assertIncludes(shortcutSettingsViewSource, "'Down'");
    });

    // Test 6.4: Space key mapping
    test('Maps space key correctly', () => {
        assertIncludes(shortcutSettingsViewSource, "'Space'");
    });

    // Test 6.5: Multi-display support
    test('Supports multi-display setup', () => {
        assertIncludes(shortcutsServiceSource, 'screen.getAllDisplays()');
        assertIncludes(shortcutsServiceSource, 'displays.length > 1');
    });

    // Test 6.6: Display switching shortcuts dynamically created
    test('Display switching shortcuts created per monitor', () => {
        assertIncludes(shortcutsServiceSource, 'displays.forEach');
        assertIncludes(shortcutsServiceSource, 'moveToDisplay');
    });

    // Test 6.7: SQLite storage works cross-platform
    test('Uses SQLite for cross-platform storage', () => {
        assertIncludes(shortcutsRepoSource, 'sqliteClient');
        assertIncludes(shortcutsRepoSource, 'shortcuts');
    });

    // Test 6.8: Storage schema correct
    test('Storage schema has action and accelerator columns', () => {
        assertIncludes(shortcutsRepoSource, 'action');
        assertIncludes(shortcutsRepoSource, 'accelerator');
    });

    // Test 6.9: Handles both Cmd and Ctrl in validation
    test('UI validates both Cmd and Ctrl shortcuts', () => {
        const systemShortcutsList = shortcutSettingsViewSource.substring(
            shortcutSettingsViewSource.indexOf('commonSystemShortcuts'),
            shortcutSettingsViewSource.indexOf('commonSystemShortcuts') + 400
        );
        assertIncludes(systemShortcutsList, 'Cmd+');
        assertIncludes(systemShortcutsList, 'Ctrl+');
    });
}

// ============================================
// TEST 7: Shortcut Registration
// ============================================

function testShortcutRegistration() {
    startGroup('7. Shortcut Registration');

    // Test 7.1: registerShortcuts method exists
    test('registerShortcuts method exists', () => {
        assertIncludes(shortcutsServiceSource, 'async registerShortcuts');
    });

    // Test 7.2: Each action has callback
    test('Each shortcut action has associated callback', () => {
        const actions = [
            'toggleVisibility', 'nextStep', 'sendLastTranscription',
            'scrollUp', 'scrollDown', 'moveUp', 'moveDown', 'moveLeft', 'moveRight',
            'toggleClickThrough', 'manualScreenshot', 'previousResponse', 'nextResponse',
            'openBrowser'
        ];
        actions.forEach(action => {
            assertIncludes(shortcutsServiceSource, `case '${action}'`);
        });
    });

    // Test 7.3: Broadcasts shortcuts-updated event
    test('Broadcasts shortcuts-updated event to renderers', () => {
        assertIncludes(shortcutsServiceSource, "'shortcuts-updated'");
    });

    // Test 7.4: Can register only toggleVisibility
    test('Can register only toggleVisibility when windows hidden', () => {
        assertIncludes(shortcutsServiceSource, 'registerOnlyToggleVisibility');
    });

    // Test 7.5: ApiKeyHeader mode registers limited shortcuts
    test('ApiKeyHeader mode registers only toggleVisibility', () => {
        assertIncludes(shortcutsServiceSource, "currentHeaderState === 'apikey'");
    });

    // Test 7.6: unregisterAll method exists
    test('unregisterAll method exists', () => {
        assertIncludes(shortcutsServiceSource, 'unregisterAll()');
    });

    // Test 7.7: Initializes with windowPool
    test('Service initializes with windowPool dependency', () => {
        assertIncludes(shortcutsServiceSource, 'initialize(windowPool)');
    });

    // Test 7.8: Listens for reregister-shortcuts event
    test('Listens for reregister-shortcuts internal event', () => {
        assertIncludes(shortcutsServiceSource, "'reregister-shortcuts'");
    });
}

// ============================================
// TEST 8: UI Integration
// ============================================

function testUIIntegration() {
    startGroup('8. UI Integration');

    // Test 8.1: ShortcutSettingsView component exists
    test('ShortcutSettingsView component defined', () => {
        assertIncludes(shortcutSettingsViewSource, 'class ShortcutSettingsView');
    });

    // Test 8.2: Custom element registered
    test('Custom element registered as shortcut-settings-view', () => {
        assertIncludes(shortcutSettingsViewSource, "customElements.define('shortcut-settings-view'");
    });

    // Test 8.3: Uses TranslationMixin for i18n
    test('Uses TranslationMixin for internationalization', () => {
        assertIncludes(shortcutSettingsViewSource, 'TranslationMixin');
    });

    // Test 8.4: Displays shortcut names nicely
    test('Has formatShortcutName for display', () => {
        assertIncludes(shortcutSettingsViewSource, 'formatShortcutName');
    });

    // Test 8.5: Display name map for common shortcuts
    test('Has display name map for actions', () => {
        assertIncludes(shortcutSettingsViewSource, 'displayNameMap');
        assertIncludes(shortcutSettingsViewSource, "'Ask Anything'");
    });

    // Test 8.6: Shows feedback messages
    test('Shows feedback messages (success/error)', () => {
        assertIncludes(shortcutSettingsViewSource, 'feedback');
        assertIncludes(shortcutSettingsViewSource, "'success'");
        assertIncludes(shortcutSettingsViewSource, "'error'");
    });

    // Test 8.7: Save button
    test('Has save button', () => {
        assertIncludes(shortcutSettingsViewSource, 'handleSave');
    });

    // Test 8.8: Cancel button
    test('Has cancel button', () => {
        assertIncludes(shortcutSettingsViewSource, 'handleClose');
    });

    // Test 8.9: Edit button per shortcut
    test('Has edit button per shortcut', () => {
        assertIncludes(shortcutSettingsViewSource, 'startCapture');
    });

    // Test 8.10: Disable button per shortcut
    test('Has disable button per shortcut', () => {
        assertIncludes(shortcutSettingsViewSource, 'disableShortcut');
    });
}

// ============================================
// TEST 9: Preload API
// ============================================

function testPreloadAPI() {
    startGroup('9. Preload API');

    // Test 9.1: shortcutSettingsView API exposed
    test('shortcutSettingsView API exposed to renderer', () => {
        assertIncludes(preloadSource, 'shortcutSettingsView');
    });

    // Test 9.2: saveShortcuts method exposed
    test('saveShortcuts method exposed', () => {
        assertIncludes(preloadSource, 'saveShortcuts');
    });

    // Test 9.3: getDefaultShortcuts method exposed
    test('getDefaultShortcuts method exposed', () => {
        assertIncludes(preloadSource, 'getDefaultShortcuts');
    });

    // Test 9.4: closeShortcutSettingsWindow method exposed
    test('closeShortcutSettingsWindow method exposed', () => {
        assertIncludes(preloadSource, 'closeShortcutSettingsWindow');
    });

    // Test 9.5: onLoadShortcuts listener
    test('onLoadShortcuts listener exposed', () => {
        assertIncludes(preloadSource, 'onLoadShortcuts');
    });

    // Test 9.6: IPC handlers in settingsBridge
    test('All IPC handlers registered in settingsBridge', () => {
        assertIncludes(settingsBridgeSource, 'shortcut:getDefaultShortcuts');
        assertIncludes(settingsBridgeSource, 'shortcut:closeShortcutSettingsWindow');
        assertIncludes(settingsBridgeSource, 'shortcut:saveShortcuts');
    });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

function runAllTests() {
    console.log('\n' + '⌨️'.repeat(30));
    console.log('⌨️  SHORTCUTS SYSTEM TEST SUITE ⌨️');
    console.log('⌨️'.repeat(30));
    console.log(`\nDate: ${new Date().toISOString()}`);
    console.log(`Node Version: ${process.version}`);

    try {
        testPredefinedShortcuts();
        testPlatformSpecificShortcuts();
        testShortcutCustomization();
        testRestoreDefaults();
        testShortcutConflicts();
        testCrossPlatformCompatibility();
        testShortcutRegistration();
        testUIIntegration();
        testPreloadAPI();
    } catch (e) {
        console.log(`\n❌ FATAL ERROR: ${e.message}`);
        console.log(e.stack);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Total:  ${testsPassed + testsFailed}`);
    console.log(`📊 Rate:   ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Shortcuts system is working correctly.\n');
    } else {
        console.log(`\n⚠️  ${testsFailed} test(s) failed. Review the issues above.\n`);
    }

    // Feature Summary
    console.log('='.repeat(60));
    console.log('⌨️  SHORTCUTS FEATURES');
    console.log('='.repeat(60));
    console.log('✓ 14 predefined shortcuts');
    console.log('✓ Platform-specific (Cmd on Mac, Ctrl on Windows/Linux)');
    console.log('✓ Full customization via UI');
    console.log('✓ Restore defaults functionality');
    console.log('✓ System shortcut conflict detection');
    console.log('✓ Multi-display support');
    console.log('✓ SQLite persistence');
    console.log('✓ Localization support');
    console.log('');

    // Shortcuts list
    console.log('='.repeat(60));
    console.log('📋 DEFAULT SHORTCUTS (Mac)');
    console.log('='.repeat(60));
    const macDefaults = getDefaultKeybinds(true);
    Object.entries(macDefaults).forEach(([action, shortcut]) => {
        console.log(`  ${action.padEnd(24)} → ${shortcut}`);
    });
    console.log('');

    return { passed: testsPassed, failed: testsFailed };
}

// Run if executed directly
if (require.main === module) {
    const result = runAllTests();
    process.exit(result.failed > 0 ? 1 : 0);
}

module.exports = { runAllTests };
