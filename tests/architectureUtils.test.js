/**
 * Architecture Detection Utilities Test Suite
 *
 * Tests for the architecture detection utility module that provides
 * platform detection, Rosetta 2 detection, and binary selection logic.
 */

const path = require('path');

// Store original process values for restoration
const originalPlatform = process.platform;
const originalArch = process.arch;

// Mock child_process for Rosetta detection tests
jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

const { execSync } = require('child_process');

// Import the module after mocking
const architectureUtils = require('../src/features/common/utils/architectureUtils');

describe('Architecture Detection Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear the cached architecture info before each test
        architectureUtils.clearCache();
    });

    afterAll(() => {
        // Restore original values
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        Object.defineProperty(process, 'arch', { value: originalArch });
    });

    // ==========================================
    // Section 1: Basic Platform Detection
    // ==========================================
    describe('Basic Platform Detection', () => {
        test('getPlatform should return current platform', () => {
            const platform = architectureUtils.getPlatform();
            expect(['darwin', 'win32', 'linux']).toContain(platform);
        });

        test('isMacOS should return boolean', () => {
            const result = architectureUtils.isMacOS();
            expect(typeof result).toBe('boolean');
        });

        test('isWindows should return boolean', () => {
            const result = architectureUtils.isWindows();
            expect(typeof result).toBe('boolean');
        });

        test('isLinux should return boolean', () => {
            const result = architectureUtils.isLinux();
            expect(typeof result).toBe('boolean');
        });

        test('Platform checks should be mutually exclusive or all false on unsupported platforms', () => {
            const isMac = architectureUtils.isMacOS();
            const isWin = architectureUtils.isWindows();
            const isLin = architectureUtils.isLinux();

            // At most one should be true
            const trueCount = [isMac, isWin, isLin].filter(Boolean).length;
            expect(trueCount).toBeLessThanOrEqual(1);
        });
    });

    // ==========================================
    // Section 2: Architecture Detection
    // ==========================================
    describe('Architecture Detection', () => {
        test('getNativeArch should return valid architecture', () => {
            const arch = architectureUtils.getNativeArch();
            expect(['x64', 'arm64', 'ia32']).toContain(arch);
        });

        test('getArchitectureInfo should return complete info object', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info).toHaveProperty('platform');
            expect(info).toHaveProperty('arch');
            expect(info).toHaveProperty('nodeArch');
            expect(info).toHaveProperty('isAppleSilicon');
            expect(info).toHaveProperty('isRosetta');
            expect(info).toHaveProperty('nativeArch');
            expect(info).toHaveProperty('cpuModel');
            expect(info).toHaveProperty('cpuCores');
            expect(info).toHaveProperty('totalMemory');
            expect(info).toHaveProperty('osVersion');
        });

        test('Architecture info should be cached', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();

            const info1 = architectureUtils.getArchitectureInfo();
            const info2 = architectureUtils.getArchitectureInfo();

            // Should be the same object (cached)
            expect(info1).toBe(info2);
        });

        test('clearCache should reset cached info', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            const info1 = architectureUtils.getArchitectureInfo();
            architectureUtils.clearCache();
            const info2 = architectureUtils.getArchitectureInfo();

            // Should be different objects after cache clear
            expect(info1).not.toBe(info2);
        });
    });

    // ==========================================
    // Section 3: Rosetta Detection (macOS)
    // ==========================================
    describe('Rosetta Detection', () => {
        test('isRunningUnderRosetta should return boolean', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();
            const result = architectureUtils.isRunningUnderRosetta();
            expect(typeof result).toBe('boolean');
        });

        test('isAppleSilicon should return boolean', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();
            const result = architectureUtils.isAppleSilicon();
            expect(typeof result).toBe('boolean');
        });

        test('Simulated Apple Silicon native detection', () => {
            // Mock macOS platform
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'arm64\n';
                return '';
            });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info.isAppleSilicon).toBe(true);
            expect(info.isRosetta).toBe(false);
            expect(info.nativeArch).toBe('arm64');

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });

        test('Simulated Rosetta 2 translation detection', () => {
            // Mock macOS platform with x64 process.arch but arm64 hardware
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

            execSync.mockImplementation((cmd) => {
                // proc_translated = 1 means running under Rosetta
                if (cmd.includes('sysctl.proc_translated')) return '1\n';
                if (cmd === 'uname -m') return 'x86_64\n'; // Will show x86_64 under Rosetta
                return '';
            });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info.isRosetta).toBe(true);
            expect(info.isAppleSilicon).toBe(true); // Hardware is still Apple Silicon
            expect(info.nativeArch).toBe('arm64'); // Native is arm64 even under Rosetta
            expect(info.arch).toBe('x64'); // Process arch reports x64

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });

        test('Simulated Intel Mac detection', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info.isAppleSilicon).toBe(false);
            expect(info.isRosetta).toBe(false);
            expect(info.nativeArch).toBe('x64');

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });

        test('Should handle execSync errors gracefully', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

            execSync.mockImplementation(() => {
                throw new Error('Command failed');
            });

            architectureUtils.clearCache();

            // Should not throw, should fall back to process.arch
            expect(() => architectureUtils.getArchitectureInfo()).not.toThrow();

            const info = architectureUtils.getArchitectureInfo();
            expect(info.nativeArch).toBe(process.arch);

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        });
    });

    // ==========================================
    // Section 4: Binary Selection
    // ==========================================
    describe('Binary Selection', () => {
        test('selectBinaryForPlatform should select correct binary for platform', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();

            const binaryConfig = {
                mac: {
                    x64: { url: 'https://example.com/mac-x64.zip', sha256: 'abc123' },
                    arm64: { url: 'https://example.com/mac-arm64.zip', sha256: 'def456' }
                },
                windows: {
                    x64: { url: 'https://example.com/win-x64.zip' }
                },
                linux: {
                    x64: { url: 'https://example.com/linux-x64.tar.gz' }
                }
            };

            const result = architectureUtils.selectBinaryForPlatform(binaryConfig);

            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('platform');
            expect(result).toHaveProperty('arch');
        });

        test('selectBinaryForPlatform should handle direct URL strings', () => {
            const binaryConfig = {
                mac: 'https://example.com/mac.zip',
                windows: 'https://example.com/win.zip',
                linux: 'https://example.com/linux.tar.gz'
            };

            const result = architectureUtils.selectBinaryForPlatform(binaryConfig);

            expect(result.url).toBeTruthy();
        });

        test('selectBinaryForPlatform should fall back to x64 for ARM64 if not available', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'arm64\n';
                return '';
            });

            architectureUtils.clearCache();

            const binaryConfig = {
                mac: {
                    x64: { url: 'https://example.com/mac-x64.zip' }
                    // No arm64 available
                }
            };

            const result = architectureUtils.selectBinaryForPlatform(binaryConfig, {
                preferNative: true,
                fallbackToX64: true
            });

            expect(result.url).toBe('https://example.com/mac-x64.zip');
            expect(result.arch).toBe('x64');
            expect(result.isFallback).toBe(true);

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });

        test('selectBinaryForPlatform should select universal binary', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

            const binaryConfig = {
                mac: {
                    universal: { url: 'https://example.com/mac-universal.zip' }
                }
            };

            architectureUtils.clearCache();

            const result = architectureUtils.selectBinaryForPlatform(binaryConfig);

            expect(result.url).toBe('https://example.com/mac-universal.zip');
            expect(result.arch).toBe('universal');

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        });

        test('selectBinaryForPlatform should return error for unsupported platform', () => {
            const binaryConfig = {
                // No config for current platform
            };

            const result = architectureUtils.selectBinaryForPlatform(binaryConfig);

            expect(result.url).toBeNull();
            expect(result.error).toBeTruthy();
        });

        test('selectBinaryForPlatform should handle platform key aliases', () => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

            architectureUtils.clearCache();

            // Test with 'darwin' key instead of 'mac'
            const binaryConfig1 = {
                darwin: { x64: { url: 'https://example.com/darwin-x64.zip' } }
            };

            const result1 = architectureUtils.selectBinaryForPlatform(binaryConfig1);
            expect(result1.url).toBeTruthy();

            // Test with 'macos' key
            architectureUtils.clearCache();
            const binaryConfig2 = {
                macos: { x64: { url: 'https://example.com/macos-x64.zip' } }
            };

            const result2 = architectureUtils.selectBinaryForPlatform(binaryConfig2);
            expect(result2.url).toBeTruthy();

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        });
    });

    // ==========================================
    // Section 5: Summary and Logging
    // ==========================================
    describe('Summary and Logging', () => {
        test('getArchitectureSummary should return string', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();

            const summary = architectureUtils.getArchitectureSummary();
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(0);
        });

        test('getArchitectureSummary should contain platform info', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();

            const summary = architectureUtils.getArchitectureSummary();
            expect(summary).toContain('Platform:');
            expect(summary).toContain('Architecture:');
        });

        test('logArchitectureInfo should not throw', () => {
            execSync.mockImplementation((cmd) => {
                if (cmd.includes('sysctl.proc_translated')) return '0\n';
                if (cmd === 'uname -m') return 'x86_64\n';
                return '';
            });

            architectureUtils.clearCache();

            expect(() => architectureUtils.logArchitectureInfo()).not.toThrow();
        });
    });

    // ==========================================
    // Section 6: Edge Cases
    // ==========================================
    describe('Edge Cases', () => {
        test('Should handle Windows platform', () => {
            Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info.platform).toBe('win32');
            expect(info.isAppleSilicon).toBe(false);
            expect(info.isRosetta).toBe(false);

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });

        test('Should handle Linux platform', () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info.platform).toBe('linux');
            expect(info.isAppleSilicon).toBe(false);
            expect(info.isRosetta).toBe(false);

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });

        test('Should handle Linux ARM64', () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

            architectureUtils.clearCache();
            const info = architectureUtils.getArchitectureInfo();

            expect(info.platform).toBe('linux');
            expect(info.arch).toBe('arm64');
            expect(info.isAppleSilicon).toBe(false); // ARM Linux is not Apple Silicon

            // Restore
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
            Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
        });
    });
});

// ==========================================
// Integration with checksums.js
// ==========================================
describe('Checksums Configuration Integration', () => {
    test('Whisper mac config should indicate Homebrew installation', () => {
        const { DOWNLOAD_CHECKSUMS } = require('../src/features/common/config/checksums');

        const macConfig = DOWNLOAD_CHECKSUMS.whisper.binaries['v1.7.6'].mac;

        expect(macConfig.available).toBe(false);
        expect(macConfig.installMethod).toBe('homebrew');
        expect(macConfig.homebrewPackage).toBe('whisper-cpp');
        expect(macConfig.installCommand).toBe('brew install whisper-cpp');
    });

    test('Ollama dmg should be universal binary', () => {
        const { DOWNLOAD_CHECKSUMS } = require('../src/features/common/config/checksums');

        const dmgConfig = DOWNLOAD_CHECKSUMS.ollama.dmg;

        expect(dmgConfig.arch).toBe('universal');
        expect(dmgConfig.url).toBeTruthy();
    });

    test('Windows whisper binary should be x64', () => {
        const { DOWNLOAD_CHECKSUMS } = require('../src/features/common/config/checksums');

        const winConfig = DOWNLOAD_CHECKSUMS.whisper.binaries['v1.7.6'].windows;

        expect(winConfig.x64).toBeDefined();
        expect(winConfig.x64.url).toBeTruthy();
    });
});
