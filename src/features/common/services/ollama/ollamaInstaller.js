/**
 * OllamaInstaller - Platform-specific installation logic with checkpoint/rollback
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawnAsync } = require('../../utils/spawnHelper');
const { DOWNLOAD_CHECKSUMS } = require('../../config/checksums');

class OllamaInstaller {
    constructor(downloader) {
        this.serviceName = 'OllamaInstaller';
        this.downloader = downloader; // OllamaDownloader instance
        this.installCheckpoints = [];
    }

    getPlatform() {
        return process.platform;
    }

    getOllamaCliPath() {
        if (this.getPlatform() === 'darwin') {
            return '/Applications/Ollama.app/Contents/Resources/ollama';
        }
        return 'ollama';
    }

    /**
     * Auto-install Ollama based on platform
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<boolean>} - True if installation successful
     */
    async autoInstall(onProgress) {
        const platform = this.getPlatform();
        console.log(`[${this.serviceName}] Starting auto-installation for ${platform}`);

        try {
            switch (platform) {
                case 'darwin':
                    return await this.installMacOS(onProgress);
                case 'win32':
                    return await this.installWindows(onProgress);
                case 'linux':
                    return await this.installLinux();
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }
        } catch (error) {
            console.error(`[${this.serviceName}] Auto-installation failed:`, error);
            throw error;
        }
    }

    /**
     * Install Ollama on macOS using DMG
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<boolean>} - True if installation successful
     */
    async installMacOS(onProgress) {
        console.log(`[${this.serviceName}] Installing Ollama on macOS using DMG...`);
        const tempDir = app.getPath('temp');
        const dmgPath = path.join(tempDir, 'Ollama.dmg');
        const mountPoint = path.join(tempDir, 'OllamaMount');

        try {
            const dmgUrl = 'https://ollama.com/download/Ollama.dmg';

            // Checkpoint: pre-install
            await this.saveCheckpoint('pre-install');

            // Step 1: Download DMG
            console.log(`[${this.serviceName}] Step 1: Downloading Ollama DMG...`);
            onProgress?.({ stage: 'downloading', message: 'Downloading Ollama installer...', progress: 0 });
            const checksumInfo = DOWNLOAD_CHECKSUMS.ollama.dmg;
            await this.downloader.downloadWithRetry(dmgUrl, dmgPath, {
                expectedChecksum: checksumInfo?.sha256,
                onProgress: (progress) => {
                    onProgress?.({ stage: 'downloading', message: `Downloading... ${progress}%`, progress });
                }
            });

            await this.saveCheckpoint('post-download');

            // Step 2: Mount DMG
            console.log(`[${this.serviceName}] Step 2: Mounting DMG...`);
            onProgress?.({ stage: 'mounting', message: 'Mounting disk image...', progress: 0 });
            await fs.mkdir(mountPoint, { recursive: true });
            await spawnAsync('hdiutil', ['attach', dmgPath, '-mountpoint', mountPoint]);
            onProgress?.({ stage: 'mounting', message: 'Disk image mounted.', progress: 100 });

            // Step 3: Install Ollama.app
            console.log(`[${this.serviceName}] Step 3: Installing Ollama.app...`);
            onProgress?.({ stage: 'installing', message: 'Installing Ollama application...', progress: 0 });
            await spawnAsync('cp', ['-R', `${mountPoint}/Ollama.app`, '/Applications/']);
            onProgress?.({ stage: 'installing', message: 'Application installed.', progress: 100 });

            await this.saveCheckpoint('post-install');

            // Step 4: Setup CLI path
            console.log(`[${this.serviceName}] Step 4: Setting up CLI path...`);
            onProgress?.({ stage: 'linking', message: 'Creating command-line shortcut...', progress: 0 });
            try {
                const ollamaCliPath = this.getOllamaCliPath();

                // Security: Validate path to prevent command injection
                if (!ollamaCliPath || typeof ollamaCliPath !== 'string') {
                    throw new Error('Invalid Ollama CLI path');
                }

                // Path must be absolute and not contain shell special characters
                if (!path.isAbsolute(ollamaCliPath) || /[;&|`$()]/.test(ollamaCliPath)) {
                    throw new Error('Invalid Ollama CLI path format');
                }

                // Escape single quotes in path for AppleScript
                const escapedPath = ollamaCliPath.replace(/'/g, "'\\''");

                const script = `do shell script "mkdir -p /usr/local/bin && ln -sf '${escapedPath}' '/usr/local/bin/ollama'" with administrator privileges`;
                await spawnAsync('osascript', ['-e', script]);
                onProgress?.({ stage: 'linking', message: 'Shortcut created.', progress: 100 });
            } catch (linkError) {
                console.error(`[${this.serviceName}] CLI symlink creation failed:`, linkError.message);
                onProgress?.({ stage: 'linking', message: 'Shortcut creation failed (permissions?).', progress: 100 });
                // Not throwing an error, as the app might still work
            }

            // Step 5: Cleanup
            console.log(`[${this.serviceName}] Step 5: Cleanup...`);
            onProgress?.({ stage: 'cleanup', message: 'Cleaning up installation files...', progress: 0 });
            await spawnAsync('hdiutil', ['detach', mountPoint]);
            await fs.unlink(dmgPath).catch(() => {});
            await fs.rmdir(mountPoint).catch(() => {});
            onProgress?.({ stage: 'cleanup', message: 'Cleanup complete.', progress: 100 });

            console.log(`[${this.serviceName}] Ollama installed successfully on macOS`);

            await new Promise(resolve => setTimeout(resolve, 2000));

            return true;
        } catch (error) {
            console.error(`[${this.serviceName}] macOS installation failed:`, error);
            // Cleanup on failure
            await fs.unlink(dmgPath).catch(() => {});
            throw new Error(`Failed to install Ollama on macOS: ${error.message}`);
        }
    }

    /**
     * Install Ollama on Windows using EXE installer
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<boolean>} - True if installation successful
     */
    async installWindows(onProgress) {
        console.log(`[${this.serviceName}] Installing Ollama on Windows...`);
        const tempDir = app.getPath('temp');
        const exePath = path.join(tempDir, 'OllamaSetup.exe');

        try {
            const exeUrl = 'https://ollama.com/download/OllamaSetup.exe';

            // Step 1: Download installer
            console.log(`[${this.serviceName}] Step 1: Downloading Ollama installer...`);
            onProgress?.({ stage: 'downloading', message: 'Downloading Ollama installer...', progress: 0 });
            const checksumInfo = DOWNLOAD_CHECKSUMS.ollama.exe;
            await this.downloader.downloadWithRetry(exeUrl, exePath, {
                expectedChecksum: checksumInfo?.sha256,
                onProgress: (progress) => {
                    onProgress?.({ stage: 'downloading', message: `Downloading... ${progress}%`, progress });
                }
            });

            // Step 2: Run silent installation
            console.log(`[${this.serviceName}] Step 2: Running silent installation...`);
            onProgress?.({ stage: 'installing', message: 'Installing Ollama...', progress: 0 });
            await spawnAsync(exePath, ['/VERYSILENT', '/NORESTART']);
            onProgress?.({ stage: 'installing', message: 'Installation complete.', progress: 100 });

            // Step 3: Cleanup
            console.log(`[${this.serviceName}] Step 3: Cleanup...`);
            onProgress?.({ stage: 'cleanup', message: 'Cleaning up installation files...', progress: 0 });
            await fs.unlink(exePath).catch(() => {});
            onProgress?.({ stage: 'cleanup', message: 'Cleanup complete.', progress: 100 });

            console.log(`[${this.serviceName}] Ollama installed successfully on Windows`);

            await new Promise(resolve => setTimeout(resolve, 3000));

            return true;
        } catch (error) {
            console.error(`[${this.serviceName}] Windows installation failed:`, error);
            throw new Error(`Failed to install Ollama on Windows: ${error.message}`);
        }
    }

    /**
     * Install Ollama on Linux (manual installation required)
     * @returns {Promise<never>} - Always throws error for manual installation
     */
    async installLinux() {
        console.log(`[${this.serviceName}] Installing Ollama on Linux...`);
        console.log(`[${this.serviceName}] Automatic installation on Linux is not supported for security reasons.`);
        console.log(`[${this.serviceName}] Please install Ollama manually:`);
        console.log(`[${this.serviceName}] 1. Visit https://ollama.com/download/linux`);
        console.log(`[${this.serviceName}] 2. Follow the official installation instructions`);
        console.log(`[${this.serviceName}] 3. Or use your package manager if available`);
        throw new Error('Manual installation required on Linux. Please visit https://ollama.com/download/linux');
    }

    /**
     * Verify Ollama installation
     * @param {Function} isInstalled - Function to check if Ollama is installed
     * @returns {Promise<Object>} - Verification result
     */
    async verifyInstallation(isInstalled) {
        try {
            console.log(`[${this.serviceName}] Verifying installation...`);

            // 1. Check binary
            const installed = await isInstalled();
            if (!installed) {
                return { success: false, error: 'Ollama binary not found' };
            }

            // 2. Test CLI command
            try {
                const { stdout } = await spawnAsync(this.getOllamaCliPath(), ['--version']);
                console.log(`[${this.serviceName}] Ollama version:`, stdout.trim());
            } catch (error) {
                return { success: false, error: 'Ollama CLI not responding' };
            }

            // 3. Check service startability
            const platform = this.getPlatform();
            if (platform === 'darwin') {
                // macOS: Check app bundle
                try {
                    await fs.access('/Applications/Ollama.app/Contents/MacOS/Ollama');
                } catch (error) {
                    return { success: false, error: 'Ollama.app executable not found' };
                }
            }

            console.log(`[${this.serviceName}] Installation verified successfully`);
            return { success: true };

        } catch (error) {
            console.error(`[${this.serviceName}] Verification failed:`, error);
            return { success: false, error: error.message };
        }
    }

    // === Checkpoint & Rollback System ===

    /**
     * Save installation checkpoint for rollback
     * @param {string} name - Checkpoint name
     */
    async saveCheckpoint(name) {
        this.installCheckpoints.push({
            name,
            timestamp: Date.now()
        });
        console.log(`[${this.serviceName}] Checkpoint saved: ${name}`);
    }

    /**
     * Rollback to last checkpoint
     */
    async rollbackToLastCheckpoint() {
        const checkpoint = this.installCheckpoints.pop();
        if (checkpoint) {
            console.log(`[${this.serviceName}] Rolling back to checkpoint: ${checkpoint.name}`);
            await this._executeRollback(checkpoint);
        }
    }

    /**
     * Execute platform-specific rollback
     * @param {Object} checkpoint - Checkpoint to roll back to
     */
    async _executeRollback(checkpoint) {
        const platform = this.getPlatform();

        if (platform === 'darwin' && checkpoint.name === 'post-install') {
            // macOS rollback - remove Ollama.app
            console.log(`[${this.serviceName}] Removing /Applications/Ollama.app...`);
            await fs.rm('/Applications/Ollama.app', { recursive: true, force: true }).catch((err) => {
                console.warn(`[${this.serviceName}] Rollback cleanup failed:`, err.message);
            });
        } else if (platform === 'win32') {
            // Windows rollback
            console.log(`[${this.serviceName}] Windows rollback not implemented - manual uninstall required`);
        }
    }

    /**
     * Clear all checkpoints
     */
    clearCheckpoints() {
        this.installCheckpoints = [];
    }
}

module.exports = OllamaInstaller;
