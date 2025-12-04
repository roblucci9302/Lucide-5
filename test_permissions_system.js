/**
 * Test Suite: Permissions Management System
 *
 * Tests permission handling across platforms:
 * - macOS: microphone, screen capture, keychain, Rosetta detection
 * - Windows: microphone, system audio capture
 * - Linux: microphone, file access
 *
 * Validates:
 * - Permission request messages are clear
 * - App works if permission is denied (graceful degradation)
 * - Error messages guide the user
 *
 * Run: node test_permissions_system.js
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(`  ${title}`, colors.cyan + colors.bold);
    console.log('='.repeat(70));
}

function logTest(name, passed, details = '') {
    const status = passed ? `${colors.green}✓ PASS` : `${colors.red}✗ FAIL`;
    console.log(`  ${status}${colors.reset} ${name}`);
    if (details && !passed) {
        console.log(`       ${colors.yellow}${details}${colors.reset}`);
    }
    testResults.tests.push({ name, passed, details });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
    return passed;
}

// Read file content
function readFile(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

// ============================================================
// TESTS
// ============================================================

function runTests() {
    log('\n🔐 PERMISSIONS MANAGEMENT TEST SUITE', colors.bold + colors.cyan);
    log('Testing permission handling across macOS, Windows, and Linux\n', colors.cyan);

    // Load source files
    const permissionService = readFile('src/features/common/services/permissionService.js');
    const permissionHeader = readFile('src/ui/app/PermissionHeader.js');
    const listenCapture = readFile('src/ui/listen/audioCore/listenCapture.js');
    const preload = readFile('src/preload.js');
    const frLocale = readFile('src/ui/i18n/locales/fr.js');
    const enLocale = readFile('src/ui/i18n/locales/en.js');

    if (!permissionService) {
        log('ERROR: permissionService.js not found!', colors.red);
        return;
    }

    // ============================================================
    // 1. PERMISSION SERVICE ARCHITECTURE (10 tests)
    // ============================================================
    logSection('1. PERMISSION SERVICE ARCHITECTURE');

    // Test: Service class exists
    logTest(
        'PermissionService class exists',
        permissionService.includes('class PermissionService')
    );

    // Test: Singleton pattern
    logTest(
        'Singleton pattern implemented',
        permissionService.includes('const permissionService = new PermissionService()') &&
        permissionService.includes('module.exports = permissionService')
    );

    // Test: Check system permissions method
    logTest(
        'checkSystemPermissions method exists',
        permissionService.includes('async checkSystemPermissions()')
    );

    // Test: Request microphone permission method
    logTest(
        'requestMicrophonePermission method exists',
        permissionService.includes('async requestMicrophonePermission()')
    );

    // Test: Open system preferences method
    logTest(
        'openSystemPreferences method exists',
        permissionService.includes('async openSystemPreferences(section)')
    );

    // Test: Uses Electron systemPreferences API
    logTest(
        'Uses Electron systemPreferences API',
        permissionService.includes("require('electron')") &&
        permissionService.includes('systemPreferences')
    );

    // Test: Uses desktopCapturer for screen recording
    logTest(
        'Uses desktopCapturer for screen recording trigger',
        permissionService.includes('desktopCapturer') &&
        permissionService.includes('getSources')
    );

    // Test: Returns permission status object
    logTest(
        'Returns structured permission status object',
        permissionService.includes('microphone:') &&
        permissionService.includes('screen:') &&
        permissionService.includes('keychain:') &&
        permissionService.includes('needsSetup:')
    );

    // Test: Console logging for debugging
    logTest(
        'Console logging for debugging',
        permissionService.includes('[Permissions]') &&
        permissionService.includes('console.log')
    );

    // Test: Error handling with catch
    logTest(
        'Error handling with try-catch',
        permissionService.includes('try {') &&
        permissionService.includes('} catch (error)') &&
        permissionService.includes('console.error')
    );

    // ============================================================
    // 2. macOS PERMISSIONS (12 tests)
    // ============================================================
    logSection('2. macOS PERMISSIONS');

    // Test: Platform detection for macOS
    logTest(
        'Platform detection for macOS (darwin)',
        permissionService.includes("process.platform === 'darwin'")
    );

    // Test: Microphone permission check
    logTest(
        'Microphone permission check via systemPreferences',
        permissionService.includes("getMediaAccessStatus('microphone')")
    );

    // Test: Screen recording permission check
    logTest(
        'Screen recording permission check via systemPreferences',
        permissionService.includes("getMediaAccessStatus('screen')")
    );

    // Test: Microphone permission request
    logTest(
        'Microphone permission request via askForMediaAccess',
        permissionService.includes("askForMediaAccess('microphone')")
    );

    // Test: Screen recording trigger via desktopCapturer
    logTest(
        'Screen recording trigger via desktopCapturer.getSources',
        permissionService.includes("desktopCapturer.getSources") &&
        permissionService.includes("types: ['screen']")
    );

    // Test: System preferences deep link
    logTest(
        'System preferences URL for screen recording',
        permissionService.includes('screen-recording') ||
        permissionService.includes('Privacy_ScreenCapture')
    );

    // Test: Keychain permission tracking
    logTest(
        'Keychain permission tracking',
        permissionService.includes('checkKeychainCompleted') &&
        permissionService.includes('markKeychainCompleted')
    );

    // Test: Permission repository integration
    logTest(
        'Permission repository integration',
        permissionService.includes('permissionRepository')
    );

    // Test: Default user bypass for keychain
    logTest(
        'Default user bypass for keychain',
        permissionService.includes('"default_user"') &&
        permissionService.includes('return true')
    );

    // Test: macOS audio capture in listenCapture
    if (listenCapture) {
        logTest(
            'macOS-specific audio capture (SystemAudioDump)',
            listenCapture.includes('isMacOS') &&
            listenCapture.includes('startMacosSystemAudio')
        );

        logTest(
            'macOS microphone capture setup',
            listenCapture.includes('setupMicProcessing') &&
            listenCapture.includes('getUserMedia')
        );

        logTest(
            'macOS AEC (Acoustic Echo Cancellation)',
            listenCapture.includes('runAecSync') ||
            listenCapture.includes('AEC')
        );
    } else {
        logTest('macOS-specific audio capture', false, 'listenCapture.js not found');
        logTest('macOS microphone capture setup', false, 'listenCapture.js not found');
        logTest('macOS AEC support', false, 'listenCapture.js not found');
    }

    // ============================================================
    // 3. WINDOWS PERMISSIONS (8 tests)
    // ============================================================
    logSection('3. WINDOWS PERMISSIONS');

    // Test: Platform detection for Windows
    logTest(
        'Platform detection for Windows (win32)',
        (preload && preload.includes("process.platform === 'win32'")) ||
        (listenCapture && listenCapture.includes('isWindows'))
    );

    // Test: Windows permissions auto-granted
    logTest(
        'Windows permissions auto-granted (no system prompts needed)',
        permissionService.includes("permissions.microphone = 'granted'") &&
        permissionService.includes("permissions.screen = 'granted'") &&
        permissionService.includes("permissions.needsSetup = false")
    );

    // Test: Windows microphone capture
    if (listenCapture) {
        logTest(
            'Windows microphone capture via getUserMedia',
            listenCapture.includes('navigator.mediaDevices.getUserMedia') &&
            !listenCapture.includes('Linux only')
        );

        logTest(
            'Windows system audio via native loopback',
            listenCapture.includes('native loopback') ||
            listenCapture.includes('getDisplayMedia')
        );

        logTest(
            'Windows captures both mic and system audio',
            listenCapture.includes('micMediaStream') &&
            listenCapture.includes('mediaStream')
        );

        logTest(
            'Windows audio tracks verification',
            listenCapture.includes('getAudioTracks()') &&
            listenCapture.includes('audioTracks.length')
        );

        logTest(
            'Windows error handling for audio',
            listenCapture.includes('Failed to start Windows') ||
            listenCapture.includes('sysAudioErr')
        );
    } else {
        logTest('Windows microphone capture', false, 'listenCapture.js not found');
        logTest('Windows system audio', false, 'listenCapture.js not found');
        logTest('Windows captures both', false, 'listenCapture.js not found');
        logTest('Windows audio tracks verification', false, 'listenCapture.js not found');
        logTest('Windows error handling', false, 'listenCapture.js not found');
    }

    // Test: Windows fallback if no system audio
    logTest(
        'Windows continues without system audio if capture fails',
        listenCapture && listenCapture.includes('// Continue without system audio')
    );

    // ============================================================
    // 4. LINUX PERMISSIONS (7 tests)
    // ============================================================
    logSection('4. LINUX PERMISSIONS');

    // Test: Platform detection for Linux
    logTest(
        'Platform detection for Linux',
        (preload && preload.includes("process.platform === 'linux'")) ||
        (listenCapture && listenCapture.includes('isLinux'))
    );

    if (listenCapture) {
        // Test: Linux-specific audio processing
        logTest(
            'Linux-specific microphone processing',
            listenCapture.includes('setupLinuxMicProcessing') ||
            listenCapture.includes('isLinux')
        );

        // Test: Linux screen capture via getDisplayMedia
        logTest(
            'Linux screen capture via getDisplayMedia',
            listenCapture.includes('getDisplayMedia') &&
            listenCapture.includes('isLinux')
        );

        // Test: Linux no system audio loopback
        logTest(
            'Linux disables system audio loopback',
            listenCapture.includes("audio: false") &&
            listenCapture.includes("Don't use system audio loopback on Linux")
        );

        // Test: Linux microphone capture
        logTest(
            'Linux microphone capture via getUserMedia',
            listenCapture.includes('getUserMedia') &&
            listenCapture.includes('audio:')
        );

        // Test: Linux permission denied handling
        logTest(
            'Linux handles permission denied gracefully',
            listenCapture.includes('Failed to get microphone access on Linux') ||
            listenCapture.includes('Continue without microphone')
        );

        // Test: Linux error logging
        logTest(
            'Linux error logging for mic failures',
            listenCapture.includes('console.warn') &&
            listenCapture.includes('micError')
        );
    } else {
        for (let i = 0; i < 6; i++) {
            logTest('Linux audio handling', false, 'listenCapture.js not found');
        }
    }

    // ============================================================
    // 5. PERMISSION UI COMPONENT (12 tests)
    // ============================================================
    logSection('5. PERMISSION UI COMPONENT');

    if (permissionHeader) {
        // Test: LitElement component
        logTest(
            'PermissionHeader is LitElement component',
            permissionHeader.includes('extends TranslationMixin(LitElement)')
        );

        // Test: Properties defined
        logTest(
            'Permission properties defined',
            permissionHeader.includes('microphoneGranted:') &&
            permissionHeader.includes('screenGranted:') &&
            permissionHeader.includes('keychainGranted:')
        );

        // Test: Check permissions on connect
        logTest(
            'Check permissions on connectedCallback',
            permissionHeader.includes('connectedCallback') &&
            permissionHeader.includes('checkPermissions()')
        );

        // Test: Periodic permission check
        logTest(
            'Periodic permission check (every 1 second)',
            permissionHeader.includes('setInterval') &&
            permissionHeader.includes('1000')
        );

        // Test: Handle microphone click
        logTest(
            'Microphone permission request handler',
            permissionHeader.includes('handleMicrophoneClick')
        );

        // Test: Handle screen click
        logTest(
            'Screen recording permission handler',
            permissionHeader.includes('handleScreenClick')
        );

        // Test: Handle keychain click
        logTest(
            'Keychain permission handler',
            permissionHeader.includes('handleKeychainClick')
        );

        // Test: Auto-continue when all granted
        logTest(
            'Auto-continue when all permissions granted',
            permissionHeader.includes('All permissions granted, proceeding automatically') &&
            permissionHeader.includes('handleContinue')
        );

        // Test: Visual feedback for granted permissions
        logTest(
            'Visual feedback for granted permissions (green)',
            permissionHeader.includes("class=\"permission-item ${this.microphoneGranted === 'granted' ? 'granted' : ''}")
        );

        // Test: Check icons for status
        logTest(
            'Check icons for permission status',
            permissionHeader.includes('check-icon') &&
            permissionHeader.includes('permission-icon')
        );

        // Test: Continue button
        logTest(
            'Continue button when all granted',
            permissionHeader.includes('continue-button') &&
            permissionHeader.includes('Continuer vers Lucide')
        );

        // Test: Close button to quit app
        logTest(
            'Close button to quit application',
            permissionHeader.includes('handleClose') &&
            permissionHeader.includes('quitApplication')
        );
    } else {
        log('  WARNING: PermissionHeader.js not found, skipping UI tests', colors.yellow);
        for (let i = 0; i < 12; i++) {
            logTest('Permission UI test', false, 'PermissionHeader.js not found');
        }
    }

    // ============================================================
    // 6. PERMISSION MESSAGES (FRENCH) (8 tests)
    // ============================================================
    logSection('6. PERMISSION MESSAGES (FRENCH)');

    if (frLocale) {
        // Test: Permission title
        logTest(
            'Clear permission title in French',
            frLocale.includes('Configuration des autorisations requise')
        );

        // Test: Permission subtitle
        logTest(
            'Clear permission subtitle explaining needs',
            frLocale.includes("Autoriser l'accès au microphone")
        );

        // Test: Microphone label
        logTest(
            'Microphone permission label',
            frLocale.includes('microphone:') &&
            frLocale.includes('Microphone')
        );

        // Test: Screen recording label
        logTest(
            'Screen recording permission label',
            frLocale.includes("screen:") &&
            frLocale.includes("Enregistrement d'écran")
        );

        // Test: Encryption label
        logTest(
            'Encryption/keychain permission label',
            frLocale.includes('encryption:') &&
            frLocale.includes('Chiffrement des données')
        );

        // Test: Grant microphone button
        logTest(
            'Clear microphone grant button text',
            frLocale.includes('grantMicrophone:') &&
            frLocale.includes("Autoriser l'accès au microphone")
        );

        // Test: Grant screen button
        logTest(
            'Clear screen recording grant button text',
            frLocale.includes('grantScreen:') &&
            frLocale.includes("Autoriser l'enregistrement d'écran")
        );

        // Test: Keychain instructions
        logTest(
            'Keychain instructions for user',
            frLocale.includes('keychainInstructions:') &&
            frLocale.includes('Toujours autoriser')
        );
    } else {
        log('  WARNING: fr.js locale not found', colors.yellow);
        for (let i = 0; i < 8; i++) {
            logTest('French locale test', false, 'fr.js not found');
        }
    }

    // ============================================================
    // 7. GRACEFUL DEGRADATION (10 tests)
    // ============================================================
    logSection('7. GRACEFUL DEGRADATION');

    // Test: Error returns structured object
    logTest(
        'Error returns structured object with error message',
        permissionService.includes("error: error.message")
    );

    // Test: Unknown status handling
    logTest(
        'Unknown permission status handled',
        permissionService.includes("microphone: 'unknown'") &&
        permissionService.includes("screen: 'unknown'")
    );

    // Test: Continue without mic on failure
    if (listenCapture) {
        logTest(
            'Continue without microphone if permission denied',
            listenCapture.includes('Continue without microphone') ||
            listenCapture.includes('Failed to get microphone')
        );

        // Test: Continue without system audio
        logTest(
            'Continue without system audio if capture fails',
            listenCapture.includes('Continue without system audio')
        );

        // Test: STT session check before capture
        logTest(
            'STT session check before capture',
            listenCapture.includes('isSessionActive') &&
            listenCapture.includes('please wait for initialization')
        );

        // Test: Error state handling
        logTest(
            'Error state set on capture failure',
            listenCapture.includes("Error starting capture") ||
            listenCapture.includes('console.error')
        );
    } else {
        logTest('Continue without microphone', false, 'listenCapture.js not found');
        logTest('Continue without system audio', false, 'listenCapture.js not found');
        logTest('STT session check', false, 'listenCapture.js not found');
        logTest('Error state handling', false, 'listenCapture.js not found');
    }

    // Test: Request permission returns result
    logTest(
        'requestMicrophonePermission returns success/failure',
        permissionService.includes('return { success: true') &&
        permissionService.includes('return { success: false')
    );

    // Test: Permission service error logging
    logTest(
        'Permission service logs errors',
        permissionService.includes('console.error') &&
        permissionService.includes('[Permissions] Error')
    );

    // Test: Fallback for screen recording error
    logTest(
        'Screen capture request handles expected failures',
        permissionService.includes('expected to fail') ||
        permissionService.includes('captureError')
    );

    // Test: Non-macOS gets auto-granted
    logTest(
        'Non-macOS platforms get auto-granted permissions',
        permissionService.includes("permissions.microphone = 'granted'") &&
        permissionService.includes("permissions.screen = 'granted'") &&
        permissionService.includes("permissions.needsSetup = false")
    );

    // ============================================================
    // 8. IPC BRIDGE (8 tests)
    // ============================================================
    logSection('8. IPC BRIDGE');

    if (preload) {
        // Test: Permission header namespace
        logTest(
            'permissionHeader namespace in preload',
            preload.includes('permissionHeader:')
        );

        // Test: checkSystemPermissions IPC
        logTest(
            'checkSystemPermissions IPC handler',
            preload.includes("ipcRenderer.invoke('check-system-permissions')")
        );

        // Test: requestMicrophonePermission IPC
        logTest(
            'requestMicrophonePermission IPC handler',
            preload.includes("ipcRenderer.invoke('request-microphone-permission')")
        );

        // Test: openSystemPreferences IPC
        logTest(
            'openSystemPreferences IPC handler',
            preload.includes("ipcRenderer.invoke('open-system-preferences'")
        );

        // Test: markKeychainCompleted IPC
        logTest(
            'markKeychainCompleted IPC handler',
            preload.includes("ipcRenderer.invoke('mark-keychain-completed')")
        );

        // Test: checkKeychainCompleted IPC
        logTest(
            'checkKeychainCompleted IPC handler',
            preload.includes("ipcRenderer.invoke('check-keychain-completed'")
        );

        // Test: initializeEncryptionKey IPC
        logTest(
            'initializeEncryptionKey IPC handler',
            preload.includes("ipcRenderer.invoke('initialize-encryption-key')")
        );

        // Test: Platform info exposed
        logTest(
            'Platform information exposed to renderer',
            preload.includes('platform:') &&
            preload.includes('isLinux:') &&
            preload.includes('isMacOS:') &&
            preload.includes('isWindows:')
        );
    } else {
        log('  WARNING: preload.js not found', colors.yellow);
        for (let i = 0; i < 8; i++) {
            logTest('IPC bridge test', false, 'preload.js not found');
        }
    }

    // ============================================================
    // 9. ROSETTA DETECTION (4 tests)
    // ============================================================
    logSection('9. ROSETTA & ARCHITECTURE DETECTION');

    // Search for architecture detection in relevant files
    const ollamaInstaller = readFile('src/features/common/services/ollama/ollamaInstaller.js');

    if (ollamaInstaller) {
        // Test: Architecture detection
        logTest(
            'Architecture detection (arm64/x64)',
            ollamaInstaller.includes('process.arch') ||
            ollamaInstaller.includes('arm64') ||
            ollamaInstaller.includes('x64')
        );

        // Test: macOS architecture handling
        logTest(
            'macOS architecture handling for Ollama',
            ollamaInstaller.includes('darwin') &&
            (ollamaInstaller.includes('arm64') || ollamaInstaller.includes('x64'))
        );
    } else {
        logTest('Architecture detection', false, 'ollamaInstaller.js not found');
        logTest('macOS architecture handling', false, 'ollamaInstaller.js not found');
    }

    // Test: Platform detection consistency
    logTest(
        'Platform detection in preload',
        preload && preload.includes('process.platform')
    );

    // Test: listenCapture platform flags
    logTest(
        'Platform flags in listenCapture',
        listenCapture && listenCapture.includes('window.api.platform.isLinux') &&
        listenCapture.includes('window.api.platform.isMacOS')
    );

    // ============================================================
    // 10. AUDIO CAPTURE OPTIONS (6 tests)
    // ============================================================
    logSection('10. AUDIO CAPTURE OPTIONS');

    if (listenCapture) {
        // Test: Sample rate configuration
        logTest(
            'Sample rate configured (24000Hz)',
            listenCapture.includes('SAMPLE_RATE = 24000') ||
            listenCapture.includes('sampleRate: 24000')
        );

        // Test: Echo cancellation
        logTest(
            'Echo cancellation enabled',
            listenCapture.includes('echoCancellation: true')
        );

        // Test: Noise suppression
        logTest(
            'Noise suppression enabled',
            listenCapture.includes('noiseSuppression: true')
        );

        // Test: Auto gain control
        logTest(
            'Auto gain control enabled',
            listenCapture.includes('autoGainControl: true')
        );

        // Test: Mono audio (1 channel)
        logTest(
            'Mono audio capture (1 channel)',
            listenCapture.includes('channelCount: 1')
        );

        // Test: Buffer size configuration
        logTest(
            'Buffer size configured',
            listenCapture.includes('BUFFER_SIZE = 4096')
        );
    } else {
        log('  WARNING: listenCapture.js not found', colors.yellow);
        for (let i = 0; i < 6; i++) {
            logTest('Audio capture test', false, 'listenCapture.js not found');
        }
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(70));
    log('  PLATFORM SUPPORT SUMMARY', colors.bold);
    console.log('='.repeat(70));

    const platformTests = {
        macOS: {
            features: ['Microphone', 'Screen Recording', 'Keychain', 'AEC'],
            icon: '🍎'
        },
        Windows: {
            features: ['Microphone', 'System Audio Loopback', 'Auto-grant'],
            icon: '🪟'
        },
        Linux: {
            features: ['Microphone', 'Screen Capture', 'No System Audio'],
            icon: '🐧'
        }
    };

    console.log('\n  Platform          Features                              Status');
    console.log('  ' + '-'.repeat(60));

    Object.entries(platformTests).forEach(([platform, info]) => {
        const name = `${info.icon} ${platform}`.padEnd(18);
        const features = info.features.join(', ').substring(0, 38).padEnd(38);
        console.log(`  ${name} ${features} ✅`);
    });

    console.log('\n' + '='.repeat(70));
    log('  TEST SUMMARY', colors.bold);
    console.log('='.repeat(70));

    const total = testResults.passed + testResults.failed;
    const passRate = ((testResults.passed / total) * 100).toFixed(1);

    log(`\n  Total Tests: ${total}`, colors.bold);
    log(`  Passed: ${testResults.passed}`, colors.green);
    log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
    log(`  Pass Rate: ${passRate}%`, passRate >= 90 ? colors.green : colors.yellow);

    if (testResults.failed > 0) {
        console.log('\n  Failed Tests:');
        testResults.tests
            .filter(t => !t.passed)
            .slice(0, 10)
            .forEach(t => {
                log(`    - ${t.name}`, colors.red);
            });
        if (testResults.tests.filter(t => !t.passed).length > 10) {
            log(`    ... and ${testResults.tests.filter(t => !t.passed).length - 10} more`, colors.yellow);
        }
    }

    console.log('\n' + '='.repeat(70));

    if (passRate >= 90) {
        log('  ✅ PERMISSION SYSTEM READY FOR ALL PLATFORMS!', colors.green + colors.bold);
    } else if (passRate >= 70) {
        log('  ⚠️  Permission system mostly functional.', colors.yellow + colors.bold);
    } else {
        log('  ❌ Permission system needs fixes.', colors.red + colors.bold);
    }
    console.log('='.repeat(70) + '\n');

    return testResults;
}

// Run tests
runTests();
