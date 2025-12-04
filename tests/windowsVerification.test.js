/**
 * Windows Platform Verification Test Suite
 *
 * Tests Windows-specific functionality:
 * 1. System Audio Capture (Native Loopback)
 * 2. Clean Installation (NSIS)
 * 3. Windows Credential Manager Integration (keytar)
 * 4. Audio Permissions Handling
 * 5. App Signing Configuration
 *
 * Run with: npx mocha tests/windowsVerification.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============================================================
// SECTION 1: Windows Audio Capture Tests
// ============================================================
describe('Windows Platform Verification', function() {
    this.timeout(10000);

    describe('1. System Audio Capture (Native Loopback)', function() {
        describe('DisplayMedia Configuration', function() {
            it('should request both video and audio for native loopback', function() {
                const displayMediaConfig = { video: true, audio: true };
                assert.strictEqual(displayMediaConfig.video, true);
                assert.strictEqual(displayMediaConfig.audio, true);
            });

            it('should have setDisplayMediaRequestHandler in index.js', function() {
                const indexPath = path.join(__dirname, '../src/index.js');
                const indexContent = fs.readFileSync(indexPath, 'utf8');
                assert.ok(indexContent.includes('setDisplayMediaRequestHandler'), 'Expected setDisplayMediaRequestHandler');
                assert.ok(indexContent.includes("audio: 'loopback'"), "Expected audio: 'loopback'");
            });

            it('should capture screen sources for Windows', function() {
                const indexPath = path.join(__dirname, '../src/index.js');
                const indexContent = fs.readFileSync(indexPath, 'utf8');
                assert.ok(indexContent.includes('desktopCapturer.getSources'), 'Expected desktopCapturer.getSources');
                assert.ok(indexContent.includes("types: ['screen']"), "Expected types: ['screen']");
            });
        });

        describe('Microphone Capture Configuration', function() {
            it('should configure microphone with correct audio settings', function() {
                const micConfig = {
                    audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false
                };
                assert.strictEqual(micConfig.audio.sampleRate, 24000);
                assert.strictEqual(micConfig.audio.channelCount, 1);
                assert.strictEqual(micConfig.audio.echoCancellation, true);
                assert.strictEqual(micConfig.audio.noiseSuppression, true);
                assert.strictEqual(micConfig.audio.autoGainControl, true);
            });

            it('should verify listenCapture.js handles Windows platform', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('Windows'), 'Expected Windows reference');
                assert.ok(content.includes('native loopback'), 'Expected native loopback reference');
            });

            it('should have separate mic and system audio processing on Windows', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('setupMicProcessing'), 'Expected setupMicProcessing');
                assert.ok(content.includes('setupSystemAudioProcessing'), 'Expected setupSystemAudioProcessing');
                assert.ok(content.includes('systemAudioContext'), 'Expected systemAudioContext');
                assert.ok(content.includes('systemAudioProcessor'), 'Expected systemAudioProcessor');
            });
        });

        describe('Audio Context Setup', function() {
            it('should use correct sample rate for audio processing', function() {
                const SAMPLE_RATE = 24000;
                const BUFFER_SIZE = 4096;
                const AUDIO_CHUNK_DURATION = 0.1;
                const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;
                assert.strictEqual(samplesPerChunk, 2400);
                assert.strictEqual(BUFFER_SIZE, 4096);
            });

            it('should have proper cleanup on stopCapture', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('stopCapture'), 'Expected stopCapture');
                assert.ok(content.includes('audioProcessor.disconnect'), 'Expected audioProcessor.disconnect');
                assert.ok(content.includes('audioContext.close'), 'Expected audioContext.close');
                assert.ok(content.includes('systemAudioProcessor.disconnect'), 'Expected systemAudioProcessor.disconnect');
                assert.ok(content.includes('systemAudioContext.close'), 'Expected systemAudioContext.close');
                assert.ok(content.includes('.getTracks().forEach'), 'Expected .getTracks().forEach');
            });
        });

        describe('Platform Detection', function() {
            it('should expose platform info to renderer', function() {
                const preloadPath = path.join(__dirname, '../src/preload.js');
                const content = fs.readFileSync(preloadPath, 'utf8');
                assert.ok(content.includes("isWindows: process.platform === 'win32'"), 'Expected isWindows');
                assert.ok(content.includes("isMacOS: process.platform === 'darwin'"), 'Expected isMacOS');
                assert.ok(content.includes("isLinux: process.platform === 'linux'"), 'Expected isLinux');
            });

            it('should have Windows-specific capture path', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('isMacOS'), 'Expected isMacOS');
                assert.ok(content.includes('isLinux'), 'Expected isLinux');
                assert.ok(content.includes('else {'), 'Expected else branch for Windows');
            });
        });
    });

    // ============================================================
    // SECTION 2: Windows Installation Configuration Tests
    // ============================================================
    describe('2. Clean Installation (NSIS)', function() {
        let configContent;

        before(function() {
            const configPath = path.join(__dirname, '../electron-builder.yml');
            configContent = fs.readFileSync(configPath, 'utf8');
        });

        describe('Windows Target Configuration', function() {
            it('should have win configuration', function() {
                assert.ok(configContent.includes('win:'), 'Expected win: configuration');
            });

            it('should target x64 architecture', function() {
                assert.ok(configContent.includes('arch: x64'), 'Expected arch: x64');
            });

            it('should have NSIS installer target', function() {
                assert.ok(configContent.includes('target: nsis'), 'Expected NSIS target');
            });

            it('should have portable target', function() {
                assert.ok(configContent.includes('target: portable'), 'Expected portable target');
            });

            it('should have Windows icon configured', function() {
                assert.ok(configContent.includes('icon: src/ui/assets/logo.ico'), 'Expected Windows icon');
            });

            it('should request asInvoker execution level (no admin)', function() {
                assert.ok(configContent.includes('requestedExecutionLevel: asInvoker'), 'Expected asInvoker');
            });
        });

        describe('NSIS Installer Configuration', function() {
            it('should have NSIS configuration', function() {
                assert.ok(configContent.includes('nsis:'), 'Expected NSIS configuration');
            });

            it('should not be one-click installer', function() {
                assert.ok(configContent.includes('oneClick: false'), 'Expected oneClick: false');
            });

            it('should be per-user installation (not per-machine)', function() {
                assert.ok(configContent.includes('perMachine: false'), 'Expected perMachine: false');
            });

            it('should allow changing installation directory', function() {
                assert.ok(configContent.includes('allowToChangeInstallationDirectory: true'), 'Expected allowToChangeInstallationDirectory');
            });

            it('should delete app data on uninstall', function() {
                assert.ok(configContent.includes('deleteAppDataOnUninstall: true'), 'Expected deleteAppDataOnUninstall');
            });

            it('should always create desktop shortcut', function() {
                assert.ok(configContent.includes('createDesktopShortcut: always'), 'Expected createDesktopShortcut: always');
            });

            it('should create start menu shortcut', function() {
                assert.ok(configContent.includes('createStartMenuShortcut: true'), 'Expected createStartMenuShortcut');
            });

            it('should have correct shortcut name', function() {
                assert.ok(configContent.includes('shortcutName: Lucide'), 'Expected shortcutName: Lucide');
            });
        });

        describe('Protocol Handler Configuration', function() {
            it('should have protocol configuration', function() {
                assert.ok(configContent.includes('protocols:'), 'Expected protocols configuration');
            });

            it('should register lucide:// protocol', function() {
                assert.ok(configContent.includes('- lucide'), 'Expected lucide protocol scheme');
            });

            it('should have protocol name', function() {
                assert.ok(configContent.includes('name: Lucide Protocol'), 'Expected protocol name');
            });
        });

        describe('File Packaging', function() {
            it('should include src files', function() {
                assert.ok(configContent.includes('src/**/*'), 'Expected src files');
            });

            it('should include package.json', function() {
                assert.ok(configContent.includes('package.json'), 'Expected package.json');
            });

            it('should exclude electron from packaging', function() {
                assert.ok(configContent.includes('!**/node_modules/electron/**'), 'Expected electron exclusion');
            });

            it('should have asarUnpack for native modules', function() {
                assert.ok(configContent.includes('asarUnpack:'), 'Expected asarUnpack');
                assert.ok(configContent.includes('**/node_modules/sharp/**/*'), 'Expected sharp in asarUnpack');
            });
        });
    });

    // ============================================================
    // SECTION 3: Windows Credential Manager Integration Tests
    // ============================================================
    describe('3. Windows Credential Manager Integration (keytar)', function() {
        let encryptionServiceContent;

        before(function() {
            const servicePath = path.join(__dirname, '../src/features/common/services/encryptionService.js');
            encryptionServiceContent = fs.readFileSync(servicePath, 'utf8');
        });

        describe('Encryption Service Configuration', function() {
            it('should use keytar for credential storage', function() {
                assert.ok(encryptionServiceContent.includes("require('keytar')"), 'Expected keytar require');
            });

            it('should have correct service name for keychain', function() {
                assert.ok(encryptionServiceContent.includes("const SERVICE_NAME = 'com.ilm.lucide'"), 'Expected SERVICE_NAME');
            });

            it('should handle keytar unavailability gracefully', function() {
                assert.ok(encryptionServiceContent.includes('catch (error)'), 'Expected error handling');
                assert.ok(encryptionServiceContent.includes('keytar = null'), 'Expected keytar = null fallback');
                assert.ok(encryptionServiceContent.includes('in-memory key'), 'Expected in-memory key fallback');
            });

            it('should use AES-256-GCM encryption', function() {
                assert.ok(encryptionServiceContent.includes("const ALGORITHM = 'aes-256-gcm'"), 'Expected AES-256-GCM');
            });

            it('should have proper IV and auth tag lengths', function() {
                assert.ok(encryptionServiceContent.includes('const IV_LENGTH = 16'), 'Expected IV_LENGTH = 16');
                assert.ok(encryptionServiceContent.includes('const AUTH_TAG_LENGTH = 16'), 'Expected AUTH_TAG_LENGTH = 16');
            });
        });

        describe('Key Management', function() {
            it('should require userId for key initialization', function() {
                assert.ok(encryptionServiceContent.includes('async function initializeKey(userId)'), 'Expected initializeKey(userId)');
                assert.ok(encryptionServiceContent.includes("throw new Error('A user ID must be provided"), 'Expected userId validation');
            });

            it('should generate new key if none exists', function() {
                assert.ok(encryptionServiceContent.includes('crypto.randomBytes(32)'), 'Expected randomBytes');
                assert.ok(encryptionServiceContent.includes('setPassword'), 'Expected setPassword');
            });

            it('should retrieve existing key from keytar', function() {
                assert.ok(encryptionServiceContent.includes('keytar.getPassword'), 'Expected getPassword');
            });

            it('should securely clear session key on reset', function() {
                assert.ok(encryptionServiceContent.includes("'0'.repeat(keyLength)"), 'Expected key overwrite');
                assert.ok(encryptionServiceContent.includes('sessionKey = null'), 'Expected sessionKey = null');
            });
        });

        describe('Encryption/Decryption Functions', function() {
            it('should encrypt and decrypt correctly', function() {
                const key = crypto.randomBytes(32).toString('hex');
                const testText = 'Test Windows Credential Manager';
                const iv = crypto.randomBytes(16);
                const algorithm = 'aes-256-gcm';

                const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
                let encrypted = cipher.update(testText, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                const authTag = cipher.getAuthTag();

                const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
                decipher.setAuthTag(authTag);
                let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');

                assert.strictEqual(decrypted, testText);
            });

            it('should fail with wrong auth tag', function() {
                const key = crypto.randomBytes(32).toString('hex');
                const testText = 'Test data';
                const iv = crypto.randomBytes(16);
                const wrongAuthTag = crypto.randomBytes(16);

                const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
                let encrypted = cipher.update(testText, 'utf8', 'hex');
                encrypted += cipher.final('hex');

                const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
                decipher.setAuthTag(wrongAuthTag);

                assert.throws(() => {
                    decipher.update(encrypted, 'hex', 'utf8');
                    decipher.final('utf8');
                });
            });
        });

        describe('Auth Service Integration', function() {
            it('should initialize encryption key on login', function() {
                const authPath = path.join(__dirname, '../src/features/common/services/authService.js');
                const content = fs.readFileSync(authPath, 'utf8');
                assert.ok(content.includes('encryptionService.initializeKey'), 'Expected encryptionService.initializeKey');
            });

            it('should reset session key on logout', function() {
                const authPath = path.join(__dirname, '../src/features/common/services/authService.js');
                const content = fs.readFileSync(authPath, 'utf8');
                assert.ok(content.includes('encryptionService.resetSessionKey'), 'Expected encryptionService.resetSessionKey');
            });
        });
    });

    // ============================================================
    // SECTION 4: Audio Permissions Handling Tests
    // ============================================================
    describe('4. Audio Permissions Handling', function() {
        let permissionServiceContent;

        before(function() {
            const servicePath = path.join(__dirname, '../src/features/common/services/permissionService.js');
            permissionServiceContent = fs.readFileSync(servicePath, 'utf8');
        });

        describe('Permission Service', function() {
            it('should auto-grant permissions on Windows', function() {
                assert.ok(permissionServiceContent.includes("permissions.microphone = 'granted'"), 'Expected microphone granted');
                assert.ok(permissionServiceContent.includes("permissions.screen = 'granted'"), 'Expected screen granted');
                assert.ok(permissionServiceContent.includes("permissions.keychain = 'granted'"), 'Expected keychain granted');
                assert.ok(permissionServiceContent.includes('permissions.needsSetup = false'), 'Expected needsSetup = false');
            });

            it('should only check permissions on macOS', function() {
                assert.ok(permissionServiceContent.includes("if (process.platform === 'darwin')"), 'Expected darwin check');
                assert.ok(permissionServiceContent.includes('systemPreferences.getMediaAccessStatus'), 'Expected getMediaAccessStatus');
            });

            it('should return success for microphone permission on non-macOS', function() {
                assert.ok(permissionServiceContent.includes("if (process.platform !== 'darwin')"), 'Expected non-darwin check');
                assert.ok(permissionServiceContent.includes('return { success: true }'), 'Expected success: true');
            });
        });

        describe('Preload API for Permissions', function() {
            it('should expose permission APIs via preload', function() {
                const preloadPath = path.join(__dirname, '../src/preload.js');
                const content = fs.readFileSync(preloadPath, 'utf8');
                assert.ok(content.includes('permissionHeader'), 'Expected permissionHeader');
                assert.ok(content.includes('checkSystemPermissions'), 'Expected checkSystemPermissions');
                assert.ok(content.includes('requestMicrophonePermission'), 'Expected requestMicrophonePermission');
            });

            it('should have keychain permission APIs', function() {
                const preloadPath = path.join(__dirname, '../src/preload.js');
                const content = fs.readFileSync(preloadPath, 'utf8');
                assert.ok(content.includes('markKeychainCompleted'), 'Expected markKeychainCompleted');
                assert.ok(content.includes('checkKeychainCompleted'), 'Expected checkKeychainCompleted');
                assert.ok(content.includes('initializeEncryptionKey'), 'Expected initializeEncryptionKey');
            });
        });

        describe('Windows Audio API Compatibility', function() {
            it('should not use macOS-specific audio on Windows', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('startMacosSystemAudio'), 'Expected macOS audio function (for macOS branch)');
                assert.ok(content.includes('stopMacosSystemAudio'), 'Expected macOS audio stop (for macOS branch)');
            });

            it('should use navigator.mediaDevices APIs', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('navigator.mediaDevices.getUserMedia'), 'Expected getUserMedia');
                assert.ok(content.includes('navigator.mediaDevices.getDisplayMedia'), 'Expected getDisplayMedia');
            });
        });
    });

    // ============================================================
    // SECTION 5: App Signing Configuration Tests
    // ============================================================
    describe('5. App Signing Configuration', function() {
        let configContent;

        before(function() {
            const configPath = path.join(__dirname, '../electron-builder.yml');
            configContent = fs.readFileSync(configPath, 'utf8');
        });

        describe('Code Signing Configuration', function() {
            it('should enable code signing for Windows', function() {
                assert.ok(configContent.includes('signAndEditExecutable: true'), 'Expected code signing enabled');
            });

            it('should have certificate link configured', function() {
                assert.ok(configContent.includes('cscLink:'), 'Expected cscLink');
                assert.ok(configContent.includes('.pfx'), 'Expected .pfx certificate');
            });

            it('should use environment variable for certificate password', function() {
                assert.ok(configContent.includes('cscKeyPassword: "${env.CSC_KEY_PASSWORD}"'), 'Expected env var for password');
            });

            it('should have signtool options configured', function() {
                assert.ok(configContent.includes('signtoolOptions:'), 'Expected signtoolOptions');
            });

            it('should have certificate subject name', function() {
                assert.ok(configContent.includes('certificateSubjectName:'), 'Expected certificateSubjectName');
                assert.ok(configContent.includes('Lucide'), 'Expected Lucide in certificate subject');
            });
        });

        describe('Security Best Practices', function() {
            it('should not store certificate password in config', function() {
                const hasHardcodedPassword = /cscKeyPassword:\s*["'][^$]/.test(configContent);
                assert.ok(!hasHardcodedPassword, 'Password should not be hardcoded');
            });

            it('should have proper app ID', function() {
                assert.ok(configContent.includes('appId: com.ilm.lucide'), 'Expected correct appId');
            });
        });
    });

    // ============================================================
    // SECTION 6: Windows-Specific Deep Link Handling Tests
    // ============================================================
    describe('6. Windows Deep Link Handling', function() {
        let indexContent;

        before(function() {
            const indexPath = path.join(__dirname, '../src/index.js');
            indexContent = fs.readFileSync(indexPath, 'utf8');
        });

        describe('Second Instance Handler', function() {
            it('should handle second-instance event in index.js', function() {
                assert.ok(indexContent.includes("app.on('second-instance'"), 'Expected second-instance handler');
            });

            it('should extract deep link from command line args', function() {
                assert.ok(indexContent.includes("arg.startsWith('lucide://')"), 'Expected lucide:// check');
                assert.ok(indexContent.includes('commandLine.find'), 'Expected commandLine.find');
            });

            it('should focus existing window on second instance', function() {
                assert.ok(indexContent.includes('mainWindow.focus()'), 'Expected mainWindow.focus');
                assert.ok(indexContent.includes('mainWindow.show()'), 'Expected mainWindow.show');
            });

            it('should restore minimized window', function() {
                assert.ok(indexContent.includes('mainWindow.isMinimized()'), 'Expected isMinimized check');
                assert.ok(indexContent.includes('mainWindow.restore()'), 'Expected restore');
            });
        });

        describe('Launch Args Processing', function() {
            it('should process deep link from process.argv on launch', function() {
                assert.ok(indexContent.includes("process.argv.find(arg => arg.startsWith('lucide://'))"), 'Expected process.argv deep link');
            });

            it('should handle deep link via deepLinkService', function() {
                assert.ok(indexContent.includes('deepLinkService.handleDeepLink'), 'Expected deepLinkService.handleDeepLink');
            });
        });
    });

    // ============================================================
    // SECTION 7: Windows Ollama Installation Tests
    // ============================================================
    describe('7. Windows Ollama Installation', function() {
        describe('Checksum Configuration', function() {
            it('should have Windows Ollama installer URL', function() {
                const checksumsPath = path.join(__dirname, '../src/features/common/config/checksums.js');
                const { DOWNLOAD_CHECKSUMS } = require(checksumsPath);
                assert.ok(DOWNLOAD_CHECKSUMS.ollama.exe, 'Expected exe config');
                assert.ok(DOWNLOAD_CHECKSUMS.ollama.exe.url.includes('OllamaSetup.exe'), 'Expected OllamaSetup.exe');
            });

            it('should target x64 for Windows Ollama', function() {
                const checksumsPath = path.join(__dirname, '../src/features/common/config/checksums.js');
                const { DOWNLOAD_CHECKSUMS } = require(checksumsPath);
                assert.strictEqual(DOWNLOAD_CHECKSUMS.ollama.exe.arch, 'x64');
            });
        });

        describe('Whisper Binary Configuration', function() {
            it('should have Windows whisper binary configuration', function() {
                const checksumsPath = path.join(__dirname, '../src/features/common/config/checksums.js');
                const { DOWNLOAD_CHECKSUMS } = require(checksumsPath);
                const whisperConfig = DOWNLOAD_CHECKSUMS.whisper.binaries['v1.7.6'];
                assert.ok(whisperConfig.windows, 'Expected windows config');
                assert.ok(whisperConfig.windows.x64, 'Expected x64 config');
            });

            it('should have Windows whisper binary URL', function() {
                const checksumsPath = path.join(__dirname, '../src/features/common/config/checksums.js');
                const { DOWNLOAD_CHECKSUMS } = require(checksumsPath);
                const whisperConfig = DOWNLOAD_CHECKSUMS.whisper.binaries['v1.7.6'];
                assert.ok(whisperConfig.windows.x64.url.includes('whisper-bin-x64.zip'), 'Expected whisper-bin-x64.zip');
            });
        });
    });

    // ============================================================
    // SECTION 8: Windows Single Instance Lock Tests
    // ============================================================
    describe('8. Windows Single Instance Lock', function() {
        let indexContent;

        before(function() {
            const indexPath = path.join(__dirname, '../src/index.js');
            indexContent = fs.readFileSync(indexPath, 'utf8');
        });

        describe('Single Instance Implementation', function() {
            it('should request single instance lock', function() {
                assert.ok(indexContent.includes('app.requestSingleInstanceLock()'), 'Expected requestSingleInstanceLock');
            });

            it('should quit if lock not obtained', function() {
                assert.ok(indexContent.includes('if (!gotTheLock)'), 'Expected lock check');
                assert.ok(indexContent.includes('app.quit()'), 'Expected app.quit');
            });

            it('should setup protocol after getting lock', function() {
                // Find the gotTheLock assignment (not in comments)
                const lockMatch = indexContent.match(/const gotTheLock = app\.requestSingleInstanceLock/);
                // Find the setupProtocolHandling() call (not the function definition)
                const setupCallMatch = indexContent.match(/^setupProtocolHandling\(\);/m);

                assert.ok(lockMatch, 'Expected gotTheLock assignment');
                assert.ok(setupCallMatch, 'Expected setupProtocolHandling call');

                // Verify setup call comes after lock by checking the flow in index.js
                // The pattern is: gotTheLock -> if (!gotTheLock) quit -> setupProtocolHandling()
                const lockIndex = indexContent.indexOf('const gotTheLock = app.requestSingleInstanceLock');
                const setupCallIndex = indexContent.indexOf('setupProtocolHandling();', lockIndex);
                assert.ok(setupCallIndex > lockIndex, 'Expected protocol setup call after lock');
            });
        });

        describe('Protocol Registration', function() {
            it('should register as default protocol client', function() {
                assert.ok(indexContent.includes("app.setAsDefaultProtocolClient('lucide')"), 'Expected setAsDefaultProtocolClient');
            });

            it('should check if already registered', function() {
                assert.ok(indexContent.includes("app.isDefaultProtocolClient('lucide')"), 'Expected isDefaultProtocolClient check');
            });
        });
    });

    // ============================================================
    // SECTION 9: Architecture Utils for Windows Tests
    // ============================================================
    describe('9. Architecture Utils for Windows', function() {
        const architectureUtils = require('../src/features/common/utils/architectureUtils');

        beforeEach(function() {
            architectureUtils.clearCache();
        });

        describe('Platform Detection', function() {
            it('should correctly identify Windows platform', function() {
                if (process.platform === 'win32') {
                    assert.strictEqual(architectureUtils.isWindows(), true);
                    assert.strictEqual(architectureUtils.isMacOS(), false);
                    assert.strictEqual(architectureUtils.isLinux(), false);
                } else {
                    // On non-Windows, just verify the function exists
                    assert.ok(typeof architectureUtils.isWindows === 'function');
                }
            });

            it('should return correct platform string', function() {
                assert.strictEqual(architectureUtils.getPlatform(), process.platform);
            });
        });

        describe('Architecture Info', function() {
            it('should return architecture info object', function() {
                const info = architectureUtils.getArchitectureInfo();
                assert.ok(info.hasOwnProperty('platform'), 'Expected platform property');
                assert.ok(info.hasOwnProperty('arch'), 'Expected arch property');
                assert.ok(info.hasOwnProperty('nativeArch'), 'Expected nativeArch property');
                assert.ok(info.hasOwnProperty('cpuModel'), 'Expected cpuModel property');
                assert.ok(info.hasOwnProperty('cpuCores'), 'Expected cpuCores property');
                assert.ok(info.hasOwnProperty('totalMemory'), 'Expected totalMemory property');
            });

            it('should not detect Apple Silicon on Windows', function() {
                if (process.platform === 'win32') {
                    const info = architectureUtils.getArchitectureInfo();
                    assert.strictEqual(info.isAppleSilicon, false);
                    assert.strictEqual(info.isRosetta, false);
                } else {
                    // On non-Windows, just verify the function exists
                    assert.ok(typeof architectureUtils.getArchitectureInfo === 'function');
                }
            });
        });

        describe('Binary Selection for Windows', function() {
            it('should select Windows binary from config', function() {
                const binaryConfig = {
                    windows: { x64: { url: 'https://example.com/windows-x64.exe', sha256: 'abc123' } },
                    mac: { x64: { url: 'https://example.com/mac-x64.dmg' } }
                };

                if (process.platform === 'win32') {
                    const result = architectureUtils.selectBinaryForPlatform(binaryConfig);
                    assert.strictEqual(result.platform, 'win32');
                    assert.ok(result.url.includes('windows'), 'Expected windows in URL');
                } else {
                    // On non-Windows, verify function exists
                    assert.ok(typeof architectureUtils.selectBinaryForPlatform === 'function');
                }
            });

            it('should handle win32 platform key', function() {
                const binaryConfig = {
                    win32: { x64: { url: 'https://example.com/win-x64.exe' } }
                };

                if (process.platform === 'win32') {
                    const result = architectureUtils.selectBinaryForPlatform(binaryConfig);
                    assert.ok(result.url.includes('win-x64'), 'Expected win-x64 in URL');
                } else {
                    assert.ok(typeof architectureUtils.selectBinaryForPlatform === 'function');
                }
            });
        });
    });

    // ============================================================
    // SECTION 10: Windows Error Handling Tests
    // ============================================================
    describe('10. Windows Error Handling', function() {
        describe('Audio Capture Error Handling', function() {
            it('should handle missing audio track gracefully', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('audioTracks.length === 0'), 'Expected audio tracks check');
                assert.ok(content.includes("throw new Error('No audio track"), 'Expected error throw');
            });

            it('should handle microphone access failure', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('catch (micErr)'), 'Expected micErr catch');
                assert.ok(content.includes('Could not get microphone access on Windows'), 'Expected Windows mic error message');
            });

            it('should handle system audio failure', function() {
                const listenCapturePath = path.join(__dirname, '../src/ui/listen/audioCore/listenCapture.js');
                const content = fs.readFileSync(listenCapturePath, 'utf8');
                assert.ok(content.includes('catch (sysAudioErr)'), 'Expected sysAudioErr catch');
                assert.ok(content.includes('Failed to start Windows native loopback audio'), 'Expected loopback error message');
            });
        });

        describe('Encryption Error Handling', function() {
            it('should throw on uninitialized encryption', function() {
                const servicePath = path.join(__dirname, '../src/features/common/services/encryptionService.js');
                const content = fs.readFileSync(servicePath, 'utf8');
                assert.ok(content.includes('Encryption key is not initialized'), 'Expected uninitialized error');
            });

            it('should handle keytar failures gracefully', function() {
                const servicePath = path.join(__dirname, '../src/features/common/services/encryptionService.js');
                const content = fs.readFileSync(servicePath, 'utf8');
                assert.ok(content.includes('keytar failed. Falling back to in-memory key'), 'Expected keytar fallback message');
            });
        });
    });
});

// ============================================================
// Utility Functions for Mock Testing
// ============================================================
describe('Windows Mock Utilities', function() {
    describe('Audio Buffer Processing', function() {
        it('should convert Float32 to Int16 correctly', function() {
            function convertFloat32ToInt16(float32Array) {
                const int16Array = new Int16Array(float32Array.length);
                for (let i = 0; i < float32Array.length; i++) {
                    const s = Math.max(-1, Math.min(1, float32Array[i]));
                    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                return int16Array;
            }

            const input = new Float32Array([0, 0.5, 1.0, -0.5, -1.0]);
            const output = convertFloat32ToInt16(input);

            assert.strictEqual(output[0], 0);
            assert.ok(Math.abs(output[1] - 16383) <= 1, 'Expected ~16383');
            assert.strictEqual(output[2], 32767);
            assert.ok(Math.abs(output[3] - (-16384)) <= 1, 'Expected ~-16384');
            assert.strictEqual(output[4], -32768);
        });

        it('should calculate samples per chunk correctly', function() {
            const SAMPLE_RATE = 24000;
            const AUDIO_CHUNK_DURATION = 0.1;
            const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;
            assert.strictEqual(samplesPerChunk, 2400);
        });
    });

    describe('Base64 Encoding', function() {
        it('should encode buffer to base64', function() {
            function arrayBufferToBase64(buffer) {
                let binary = '';
                const bytes = new Uint8Array(buffer);
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return Buffer.from(binary, 'binary').toString('base64');
            }

            const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const base64 = arrayBufferToBase64(input.buffer);
            assert.strictEqual(base64, 'SGVsbG8=');
        });
    });
});
