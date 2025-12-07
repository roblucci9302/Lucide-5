/**
 * Architecture Detection Utilities
 *
 * Provides platform and architecture detection, including Rosetta 2 detection
 * on Apple Silicon Macs. Used for selecting correct binaries for native modules
 * and local AI services.
 *
 * Architecture values:
 * - 'x64' (Intel 64-bit) - Windows, Linux, Intel Macs
 * - 'arm64' (ARM 64-bit) - Apple Silicon Macs, ARM Linux
 * - 'ia32' (Intel 32-bit) - Legacy Windows
 *
 * Platform values:
 * - 'darwin' (macOS)
 * - 'win32' (Windows)
 * - 'linux' (Linux)
 */

const { execSync } = require('child_process');
const os = require('os');

// Cache the detection results (they don't change during runtime)
let _cachedArchInfo = null;

/**
 * Get detailed architecture information
 * @returns {Object} Architecture information
 */
function getArchitectureInfo() {
    if (_cachedArchInfo) {
        return _cachedArchInfo;
    }

    const info = {
        platform: process.platform,
        arch: process.arch,
        nodeArch: process.arch,
        isAppleSilicon: false,
        isRosetta: false,
        nativeArch: process.arch,
        cpuModel: '',
        cpuCores: os.cpus().length,
        totalMemory: os.totalmem(),
        osVersion: os.release()
    };

    // Get CPU model
    const cpus = os.cpus();
    if (cpus.length > 0) {
        info.cpuModel = cpus[0].model;
    }

    // macOS-specific detection
    if (process.platform === 'darwin') {
        try {
            // Check if we're running under Rosetta 2
            // sysctl.proc_translated returns 1 if running under Rosetta
            const rosettaCheck = execSync('sysctl -n sysctl.proc_translated 2>/dev/null || echo 0', {
                encoding: 'utf8',
                timeout: 5000
            }).trim();

            info.isRosetta = rosettaCheck === '1';

            // Check the actual hardware architecture
            const hwArch = execSync('uname -m', {
                encoding: 'utf8',
                timeout: 5000
            }).trim();

            // Map uname output to Node.js arch values
            if (hwArch === 'arm64') {
                info.nativeArch = 'arm64';
                info.isAppleSilicon = true;
            } else if (hwArch === 'x86_64') {
                info.nativeArch = 'x64';
                info.isAppleSilicon = false;
            }

            // If running under Rosetta, process.arch will be 'x64' but native is 'arm64'
            if (info.isRosetta) {
                info.nativeArch = 'arm64';
                info.isAppleSilicon = true;
                console.log('[ArchitectureUtils] Running under Rosetta 2 translation');
            }

        } catch (error) {
            console.warn('[ArchitectureUtils] Failed to detect macOS architecture details:', error.message);
            // Fall back to process.arch
            info.nativeArch = process.arch;
        }
    }

    // Linux ARM detection
    if (process.platform === 'linux' && process.arch === 'arm64') {
        info.isAppleSilicon = false; // ARM Linux, but not Apple Silicon
    }

    _cachedArchInfo = info;
    return info;
}

/**
 * Check if running on Apple Silicon Mac
 * @returns {boolean}
 */
function isAppleSilicon() {
    const info = getArchitectureInfo();
    return info.isAppleSilicon;
}

/**
 * Check if running under Rosetta 2 translation
 * @returns {boolean}
 */
function isRunningUnderRosetta() {
    const info = getArchitectureInfo();
    return info.isRosetta;
}

/**
 * Get the native architecture (not the translated one)
 * @returns {string} 'x64', 'arm64', etc.
 */
function getNativeArch() {
    const info = getArchitectureInfo();
    return info.nativeArch;
}

/**
 * Get the current platform
 * @returns {string} 'darwin', 'win32', 'linux'
 */
function getPlatform() {
    return process.platform;
}

/**
 * Check if current platform is macOS
 * @returns {boolean}
 */
function isMacOS() {
    return process.platform === 'darwin';
}

/**
 * Check if current platform is Windows
 * @returns {boolean}
 */
function isWindows() {
    return process.platform === 'win32';
}

/**
 * Check if current platform is Linux
 * @returns {boolean}
 */
function isLinux() {
    return process.platform === 'linux';
}

/**
 * Select the appropriate binary URL based on platform and architecture
 * @param {Object} binaryConfig - Configuration object with URLs per platform/arch
 * @param {Object} options - Options for selection
 * @returns {Object} Selected binary info { url, arch, platform }
 */
function selectBinaryForPlatform(binaryConfig, options = {}) {
    const { preferNative = true, fallbackToX64 = true } = options;
    const info = getArchitectureInfo();
    const platform = info.platform;
    const arch = preferNative ? info.nativeArch : info.arch;

    // Platform key mapping
    const platformKeys = {
        'darwin': ['mac', 'darwin', 'macos', 'osx'],
        'win32': ['windows', 'win32', 'win'],
        'linux': ['linux']
    };

    // Find platform config
    let platformConfig = null;
    const keys = platformKeys[platform] || [platform];

    for (const key of keys) {
        if (binaryConfig[key]) {
            platformConfig = binaryConfig[key];
            break;
        }
    }

    if (!platformConfig) {
        return {
            url: null,
            arch: null,
            platform,
            error: `No binary available for platform: ${platform}`
        };
    }

    // If platformConfig is a string (direct URL), return it
    if (typeof platformConfig === 'string') {
        return {
            url: platformConfig,
            arch: 'unknown',
            platform
        };
    }

    // If platformConfig has arch-specific URLs
    if (typeof platformConfig === 'object') {
        // Check for specific architecture URL
        if (platformConfig.url) {
            // Single URL for platform
            return {
                url: platformConfig.url,
                arch: platformConfig.arch || 'unknown',
                platform
            };
        }

        // Check for architecture-specific URLs
        const archKeys = {
            'arm64': ['arm64', 'aarch64', 'apple-silicon', 'arm'],
            'x64': ['x64', 'x86_64', 'amd64', 'intel']
        };

        const archKeyList = archKeys[arch] || [arch];

        for (const archKey of archKeyList) {
            if (platformConfig[archKey]) {
                const config = platformConfig[archKey];
                return {
                    url: typeof config === 'string' ? config : config.url,
                    arch,
                    platform,
                    sha256: typeof config === 'object' ? config.sha256 : null
                };
            }
        }

        // Fallback to x64 if ARM64 not available and fallback is enabled
        if (fallbackToX64 && arch === 'arm64') {
            for (const archKey of archKeys['x64']) {
                if (platformConfig[archKey]) {
                    const config = platformConfig[archKey];
                    console.warn(`[ArchitectureUtils] ARM64 binary not available, falling back to x64 (Rosetta)`);
                    return {
                        url: typeof config === 'string' ? config : config.url,
                        arch: 'x64',
                        platform,
                        sha256: typeof config === 'object' ? config.sha256 : null,
                        isFallback: true
                    };
                }
            }
        }

        // Check for universal binary
        if (platformConfig.universal) {
            const config = platformConfig.universal;
            return {
                url: typeof config === 'string' ? config : config.url,
                arch: 'universal',
                platform,
                sha256: typeof config === 'object' ? config.sha256 : null
            };
        }
    }

    return {
        url: null,
        arch: null,
        platform,
        error: `No binary available for architecture: ${arch} on platform: ${platform}`
    };
}

/**
 * Get a diagnostic summary of the system architecture
 * Useful for troubleshooting and logs
 * @returns {string} Human-readable summary
 */
function getArchitectureSummary() {
    const info = getArchitectureInfo();
    const lines = [
        `Platform: ${info.platform}`,
        `Architecture: ${info.arch}`,
        `Native Architecture: ${info.nativeArch}`,
        `CPU: ${info.cpuModel}`,
        `Cores: ${info.cpuCores}`,
        `Memory: ${Math.round(info.totalMemory / (1024 * 1024 * 1024))} GB`,
        `OS Version: ${info.osVersion}`
    ];

    if (info.platform === 'darwin') {
        lines.push(`Apple Silicon: ${info.isAppleSilicon ? 'Yes' : 'No'}`);
        if (info.isRosetta) {
            lines.push(`Rosetta 2: Running under translation`);
        }
    }

    return lines.join('\n');
}

/**
 * Log architecture information for diagnostics
 */
function logArchitectureInfo() {
    const info = getArchitectureInfo();
    console.log('[ArchitectureUtils] System Information:');
    console.log(`  Platform: ${info.platform}`);
    console.log(`  Architecture: ${info.arch}`);
    console.log(`  Native Architecture: ${info.nativeArch}`);
    console.log(`  CPU: ${info.cpuModel}`);
    console.log(`  Cores: ${info.cpuCores}`);

    if (info.platform === 'darwin') {
        console.log(`  Apple Silicon: ${info.isAppleSilicon ? 'Yes' : 'No'}`);
        if (info.isRosetta) {
            console.log(`  Rosetta 2: Running under translation (performance may be reduced)`);
        }
    }
}

/**
 * Clear cached architecture info (useful for testing)
 */
function clearCache() {
    _cachedArchInfo = null;
}

module.exports = {
    getArchitectureInfo,
    isAppleSilicon,
    isRunningUnderRosetta,
    getNativeArch,
    getPlatform,
    isMacOS,
    isWindows,
    isLinux,
    selectBinaryForPlatform,
    getArchitectureSummary,
    logArchitectureInfo,
    clearCache
};
