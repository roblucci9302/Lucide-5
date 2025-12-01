/**
 * OllamaShutdown - Platform-specific Ollama service shutdown logic
 */
const { spawnAsync } = require('../../utils/spawnHelper');
const { TIME } = require('../../config/constants');

class OllamaShutdown {
    constructor(serviceName = 'OllamaShutdown') {
        this.serviceName = serviceName;
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
     * Shutdown Ollama service on macOS
     * @param {boolean} force - Force kill if graceful shutdown fails
     * @param {Function} isServiceRunning - Function to check if service is still running
     * @returns {Promise<boolean>} - True if shutdown successful
     */
    async shutdownMacOS(force, isServiceRunning) {
        try {
            // 1. First, try to kill ollama server process
            console.log('[OllamaShutdown] Killing ollama server process...');
            try {
                await spawnAsync('pkill', ['-f', 'ollama serve']);
            } catch (e) {
                // Process might not be running
            }

            // 2. Then quit the Ollama.app
            console.log('[OllamaShutdown] Quitting Ollama.app...');
            try {
                await spawnAsync('osascript', ['-e', 'tell application "Ollama" to quit']);
            } catch (e) {
                console.log('[OllamaShutdown] Ollama.app might not be running');
            }

            // 3. Wait a moment for shutdown
            await new Promise(resolve => setTimeout(resolve, TIME.TWO_SECONDS));

            // 4. Force kill any remaining ollama processes
            if (force || await isServiceRunning()) {
                console.log('[OllamaShutdown] Force killing any remaining ollama processes...');
                try {
                    // Kill all ollama processes
                    await spawnAsync('pkill', ['-9', '-f', 'ollama']);
                } catch (e) {
                    // Ignore errors - process might not exist
                }
            }

            // 5. Final check
            await new Promise(resolve => setTimeout(resolve, 1000));
            const stillRunning = await isServiceRunning();
            if (stillRunning) {
                console.warn('[OllamaShutdown] Warning: Ollama may still be running');
                return false;
            }

            console.log('[OllamaShutdown] Ollama shutdown complete');
            return true;
        } catch (error) {
            console.error('[OllamaShutdown] Shutdown error:', error);
            return false;
        }
    }

    /**
     * Shutdown Ollama service on Windows
     * @param {boolean} force - Force kill if graceful shutdown fails
     * @returns {Promise<boolean>} - True if shutdown successful
     */
    async shutdownWindows(force) {
        try {
            // Try to stop the service gracefully
            await spawnAsync('taskkill', ['/IM', 'ollama.exe', '/T']);
            console.log('[OllamaShutdown] Ollama process terminated on Windows');
            return true;
        } catch (error) {
            console.log('[OllamaShutdown] Standard termination failed, trying force kill');
            try {
                await spawnAsync('taskkill', ['/IM', 'ollama.exe', '/F', '/T']);
                return true;
            } catch (killError) {
                console.error('[OllamaShutdown] Failed to force kill Ollama on Windows:', killError);
                return false;
            }
        }
    }

    /**
     * Shutdown Ollama service on Linux
     * @param {boolean} force - Force kill if graceful shutdown fails
     * @returns {Promise<boolean>} - True if shutdown successful
     */
    async shutdownLinux(force) {
        try {
            await spawnAsync('pkill', ['-f', this.getOllamaCliPath()]);
            console.log('[OllamaShutdown] Ollama process terminated on Linux');
            return true;
        } catch (error) {
            if (force) {
                await spawnAsync('pkill', ['-9', '-f', this.getOllamaCliPath()]).catch(() => {});
            }
            console.error('[OllamaShutdown] Failed to shutdown Ollama on Linux:', error);
            return false;
        }
    }

    /**
     * Shutdown Ollama service based on platform
     * @param {boolean} force - Force kill if graceful shutdown fails
     * @param {Function} isServiceRunning - Function to check if service is still running
     * @returns {Promise<boolean>} - True if shutdown successful
     */
    async shutdown(force, isServiceRunning) {
        const platform = this.getPlatform();

        try {
            switch (platform) {
                case 'darwin':
                    return await this.shutdownMacOS(force, isServiceRunning);
                case 'win32':
                    return await this.shutdownWindows(force);
                case 'linux':
                    return await this.shutdownLinux(force);
                default:
                    console.warn(`[OllamaShutdown] Unsupported platform for shutdown: ${platform}`);
                    return false;
            }
        } catch (error) {
            console.error(`[OllamaShutdown] Error during shutdown:`, error);
            return false;
        }
    }
}

module.exports = OllamaShutdown;
