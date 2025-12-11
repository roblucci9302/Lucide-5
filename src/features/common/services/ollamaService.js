/**
 * OllamaService - Main orchestrator for Ollama integration
 * Uses modular components for installation, models, warming, and shutdown
 */
const { EventEmitter } = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const { spawnAsync } = require('../utils/spawnHelper');
const ollamaModelRepository = require('../repositories/ollamaModel');
const { TIME, SERVICE } = require('../config/constants');

// Import modular components
const OllamaDownloader = require('./ollama/ollamaDownloader');
const OllamaInstaller = require('./ollama/ollamaInstaller');
const OllamaModelManager = require('./ollama/ollamaModelManager');
const OllamaWarmup = require('./ollama/ollamaWarmup');
const OllamaShutdown = require('./ollama/ollamaShutdown');

const execAsync = promisify(exec);

class OllamaService extends EventEmitter {
    constructor() {
        super();
        this.serviceName = 'OllamaService';
        this.baseUrl = 'http://localhost:11434';

        // Simplified state management
        this.installState = {
            isInstalled: false,
            isInstalling: false,
            progress: 0
        };

        // Request management
        this.activeRequest = null;
        this.requestTimeout = TIME.STANDARD_TIMEOUT;

        // State synchronization
        this._lastState = null;
        this._syncInterval = null;
        this._lastLoadedModels = [];

        // Shutdown flag
        this.isShuttingDown = false;

        // Initialize modular components
        this.downloader = new OllamaDownloader();
        this.installer = new OllamaInstaller(this.downloader);
        this.modelManager = new OllamaModelManager(this.baseUrl);
        this.warmup = new OllamaWarmup();
        this.shutdownManager = new OllamaShutdown(this.serviceName);

        // Forward events from modules
        this._setupEventForwarding();
    }

    /**
     * Forward events from modules to main service
     */
    _setupEventForwarding() {
        this.downloader.on('download-error', (data) => this.emit('download-error', data));
        this.modelManager.on('install-progress', (data) => this.emit('install-progress', data));
        this.modelManager.on('model-pull-complete', (data) => this.emit('model-pull-complete', data));
        this.warmup.on('model-warmed-up', (data) => this.emit('model-warmed-up', data));
    }

    // === Platform & CLI Utilities ===

    getPlatform() {
        return process.platform;
    }

    getOllamaCliPath() {
        if (this.getPlatform() === 'darwin') {
            return '/Applications/Ollama.app/Contents/Resources/ollama';
        }
        return 'ollama';
    }

    async checkCommand(command) {
        try {
            const platform = this.getPlatform();
            const checkCmd = platform === 'win32' ? 'where' : 'which';
            const { stdout } = await execAsync(`${checkCmd} ${command}`);
            return stdout.trim();
        } catch (error) {
            return null;
        }
    }

    async waitForService(checkFn, maxAttempts = SERVICE.MAX_WAIT_ATTEMPTS, delayMs = SERVICE.WAIT_DELAY) {
        for (let i = 0; i < maxAttempts; i++) {
            if (await checkFn()) {
                console.log(`[${this.serviceName}] Service is ready`);
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        throw new Error(`${this.serviceName} service failed to start within timeout`);
    }

    // === API Request Management ===

    async makeRequest(endpoint, options = {}) {
        if (this.isShuttingDown) {
            throw new Error('Service is shutting down');
        }

        // Simple locking mechanism
        if (this.activeRequest) {
            await this.activeRequest;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        this.activeRequest = fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            signal: controller.signal
        }).finally(() => {
            clearTimeout(timeoutId);
            this.activeRequest = null;
        });

        return this.activeRequest;
    }

    // === Service Lifecycle ===

    async isInstalled() {
        try {
            const platform = this.getPlatform();

            if (platform === 'darwin') {
                try {
                    await fs.access('/Applications/Ollama.app');
                    return true;
                } catch {
                    const ollamaPath = await this.checkCommand(this.getOllamaCliPath());
                    return !!ollamaPath;
                }
            } else {
                const ollamaPath = await this.checkCommand(this.getOllamaCliPath());
                return !!ollamaPath;
            }
        } catch (error) {
            console.log(`[${this.serviceName}] Ollama not found:`, error.message);
            return false;
        }
    }

    async isServiceRunning() {
        try {
            const response = await this.makeRequest('/api/ps', {
                method: 'GET'
            });

            return response.ok;
        } catch (error) {
            console.log(`[${this.serviceName}] Service health check failed: ${error.message}`);
            return false;
        }
    }

    async startService() {
        this.isShuttingDown = false;

        const platform = this.getPlatform();

        try {
            if (platform === 'darwin') {
                try {
                    await spawnAsync('open', ['-a', 'Ollama']);
                    await this.waitForService(() => this.isServiceRunning());
                    return true;
                } catch {
                    const { spawn } = require('child_process');
                    spawn(this.getOllamaCliPath(), ['serve'], {
                        detached: true,
                        stdio: 'ignore'
                    }).unref();
                    await this.waitForService(() => this.isServiceRunning());
                    return true;
                }
            } else {
                const { spawn } = require('child_process');
                spawn(this.getOllamaCliPath(), ['serve'], {
                    detached: true,
                    stdio: 'ignore',
                    shell: platform === 'win32'
                }).unref();
                await this.waitForService(() => this.isServiceRunning());
                return true;
            }
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to start service:`, error);
            throw error;
        }
    }

    async stopService() {
        return await this.shutdown();
    }

    async healthCheck() {
        try {
            const checks = {
                serviceRunning: false,
                apiResponsive: false,
                modelsAccessible: false,
                memoryStatus: false
            };

            try {
                const psResponse = await this.makeRequest('/api/ps', { method: 'GET' });
                checks.serviceRunning = psResponse.ok;
                checks.memoryStatus = psResponse.ok;
            } catch (error) {
                console.log(`[${this.serviceName}] /api/ps check failed:`, error.message);
            }

            try {
                const rootResponse = await this.makeRequest('/', { method: 'GET' });
                checks.apiResponsive = rootResponse.ok;
            } catch (error) {
                console.log(`[${this.serviceName}] Root endpoint check failed:`, error.message);
            }

            try {
                const tagsResponse = await this.makeRequest('/api/tags', { method: 'GET' });
                checks.modelsAccessible = tagsResponse.ok;
            } catch (error) {
                console.log(`[${this.serviceName}] /api/tags check failed:`, error.message);
            }

            const allHealthy = Object.values(checks).every(v => v === true);

            return {
                healthy: allHealthy,
                checks,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[${this.serviceName}] Health check failed:`, error);
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getStatus() {
        try {
            const installed = await this.isInstalled();
            if (!installed) {
                return { success: true, installed: false, running: false, models: [] };
            }

            const running = await this.isServiceRunning();
            if (!running) {
                return { success: true, installed: true, running: false, models: [] };
            }

            const models = await this.modelManager.getInstalledModels(this.makeRequest.bind(this), this.isShuttingDown);
            return { success: true, installed: true, running: true, models };
        } catch (error) {
            console.error(`[${this.serviceName}] Error getting status:`, error);
            return { success: false, error: error.message, installed: false, running: false, models: [] };
        }
    }

    // === State Synchronization ===

    async syncState() {
        if (this.isShuttingDown) {
            console.log(`[${this.serviceName}] Service is shutting down, skipping state sync`);
            return this.installState;
        }

        try {
            const isInstalled = await this.isInstalled();
            const isRunning = await this.isServiceRunning();
            const models = isRunning && !this.isShuttingDown ? await this.modelManager.getInstalledModels(this.makeRequest.bind(this), this.isShuttingDown) : [];
            const loadedModels = isRunning && !this.isShuttingDown ? await this.modelManager.getLoadedModels(this.makeRequest.bind(this), this.isShuttingDown) : [];

            this.installState.isInstalled = isInstalled;
            this.installState.isRunning = isRunning;
            this.installState.lastSync = Date.now();

            // Track memory load state changes
            const previousLoadedModels = this._lastLoadedModels || [];
            const loadedChanged = loadedModels.length !== previousLoadedModels.length ||
                !loadedModels.every(m => previousLoadedModels.includes(m));

            if (loadedChanged) {
                console.log(`[${this.serviceName}] Loaded models changed: ${loadedModels.join(', ')}`);
                this._lastLoadedModels = loadedModels;

                // Remove warmed status for unloaded models
                for (const modelName of this.warmup.warmedModels) {
                    if (!loadedModels.includes(modelName)) {
                        this.warmup.removeFromWarmed(modelName);
                        console.log(`[${this.serviceName}] Model ${modelName} unloaded from memory`);
                    }
                }
            }

            // Update model status in DB
            if (isRunning && models.length > 0) {
                for (const model of models) {
                    try {
                        await ollamaModelRepository.updateInstallStatus(model.name, true, false);
                    } catch (dbError) {
                        console.warn(`[${this.serviceName}] Failed to update DB for model ${model.name}:`, dbError);
                    }
                }
            }

            // Emit state change events
            if (this._lastState?.isRunning !== isRunning ||
                this._lastState?.isInstalled !== isInstalled ||
                loadedChanged) {
                this.emit('state-changed', {
                    installed: isInstalled,
                    running: isRunning,
                    models: models.length,
                    loadedModels: loadedModels
                });
            }

            this._lastState = { isInstalled, isRunning, modelsCount: models.length };
            return { isInstalled, isRunning, models };

        } catch (error) {
            console.error(`[${this.serviceName}] State sync failed:`, error);
            return {
                isInstalled: this.installState.isInstalled || false,
                isRunning: false,
                models: []
            };
        }
    }

    startPeriodicSync() {
        if (this._syncInterval) return;

        this._syncInterval = setInterval(() => {
            this.syncState();
        }, SERVICE.SYNC_INTERVAL);
    }

    stopPeriodicSync() {
        if (this._syncInterval) {
            clearInterval(this._syncInterval);
            this._syncInterval = null;
        }
    }

    // === Cleanup & Shutdown ===

    cleanup() {
        console.log(`[${this.serviceName}] Cleaning up memory structures...`);
        this._lastLoadedModels = [];
        this._lastState = null;
        this.modelManager.cleanup();
        this.warmup.cleanup();
        this.installer.clearCheckpoints();
        console.log(`[${this.serviceName}] Memory cleanup complete`);
    }

    async shutdown(force = false) {
        console.log(`[${this.serviceName}] Shutdown initiated (force: ${force})`);

        this.isShuttingDown = true;

        // Wait for warming operations to complete
        await this.warmup.shutdown(force);

        // Cleanup resources
        this.stopPeriodicSync();
        this.cleanup();

        // Shutdown Ollama process
        const isRunning = await this.isServiceRunning();
        if (!isRunning) {
            console.log(`[${this.serviceName}] Service not running, nothing to shutdown`);
            return true;
        }

        return await this.shutdownManager.shutdown(force, this.isServiceRunning.bind(this));
    }

    // === Delegated Methods (pass-through to modules) ===

    async autoWarmUpSelectedModel() {
        return await this.warmup.autoWarmUpSelectedModel(
            this.makeRequest.bind(this),
            this.modelManager.pullModel.bind(this.modelManager),
            this.isServiceRunning.bind(this)
        );
    }

    // === IPC Handler Methods ===

    async handleGetStatus() {
        try {
            const installed = await this.isInstalled();
            if (!installed) {
                return { success: true, installed: false, running: false, models: [] };
            }

            const running = await this.isServiceRunning();
            if (!running) {
                return { success: true, installed: true, running: false, models: [] };
            }

            const models = await this.modelManager.getAllModelsWithStatus(this.makeRequest.bind(this), this.warmup);
            return { success: true, installed: true, running: true, models };
        } catch (error) {
            console.error(`[${this.serviceName}] Error getting status:`, error);
            return { success: false, error: error.message, installed: false, running: false, models: [] };
        }
    }

    async handleInstall() {
        try {
            const onProgress = (data) => {
                this.emit('install-progress', data);
            };

            await this.installer.autoInstall(onProgress);

            // Verify installation
            onProgress({ stage: 'verifying', message: 'Verifying installation...', progress: 0 });
            const verifyResult = await this.installer.verifyInstallation(this.isInstalled.bind(this));
            if (!verifyResult.success) {
                throw new Error(`Installation verification failed: ${verifyResult.error}`);
            }
            onProgress({ stage: 'verifying', message: 'Installation verified.', progress: 100 });

            // Start service
            if (!await this.isServiceRunning()) {
                onProgress({ stage: 'starting', message: 'Starting Ollama service...', progress: 0 });
                await this.startService();
                onProgress({ stage: 'starting', message: 'Ollama service started.', progress: 100 });
            }

            this.installState.isInstalled = true;
            this.emit('installation-complete');
            return { success: true };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to install:`, error);
            await this.installer.rollbackToLastCheckpoint();
            this.emit('error', {
                errorType: 'installation-failed',
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    async handleStartService() {
        try {
            if (!await this.isServiceRunning()) {
                console.log(`[${this.serviceName}] Starting Ollama service...`);
                await this.startService();
            }
            this.emit('install-complete', { success: true });
            return { success: true };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to start service:`, error);
            this.emit('install-complete', { success: false, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async handleEnsureReady() {
        try {
            if (await this.isInstalled() && !await this.isServiceRunning()) {
                console.log(`[${this.serviceName}] Ollama installed but not running, starting service...`);
                await this.startService();
            }
            return { success: true };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to ensure ready:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleGetModels() {
        try {
            const models = await this.modelManager.getAllModelsWithStatus(this.makeRequest.bind(this), this.warmup);
            return { success: true, models };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to get models:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleGetModelSuggestions() {
        try {
            const suggestions = await this.modelManager.getModelSuggestions(this.makeRequest.bind(this));
            return { success: true, suggestions };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to get model suggestions:`, error);
            return { success: false, error: error.message };
        }
    }

    async handlePullModel(modelName) {
        try {
            console.log(`[${this.serviceName}] Starting model pull: ${modelName}`);

            await ollamaModelRepository.updateInstallStatus(modelName, false, true);

            await this.modelManager.pullModel(modelName);

            await ollamaModelRepository.updateInstallStatus(modelName, true, false);

            console.log(`[${this.serviceName}] Model ${modelName} pull successful`);
            return { success: true };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to pull model:`, error);
            await ollamaModelRepository.updateInstallStatus(modelName, false, false);
            this.emit('error', {
                errorType: 'model-pull-failed',
                model: modelName,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    async handleIsModelInstalled(modelName) {
        try {
            const installed = await this.modelManager.isModelInstalled(modelName, this.makeRequest.bind(this));
            return { success: true, installed };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to check model installation:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleWarmUpModel(modelName) {
        try {
            const success = await this.warmup.warmUpModel(
                modelName,
                false,
                this.makeRequest.bind(this),
                this.modelManager.pullModel.bind(this.modelManager)
            );
            return { success };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to warm up model:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleAutoWarmUp() {
        try {
            const success = await this.autoWarmUpSelectedModel();
            return { success };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to auto warm-up:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleGetWarmUpStatus() {
        try {
            const status = await this.warmup.getWarmUpStatus(
                this.modelManager.getLoadedModels.bind(this.modelManager, this.makeRequest.bind(this), this.isShuttingDown)
            );
            return { success: true, status };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to get warm-up status:`, error);
            return { success: false, error: error.message };
        }
    }

    async handleShutdown(force = false) {
        try {
            console.log(`[${this.serviceName}] Manual shutdown requested (force: ${force})`);
            const success = await this.shutdown(force);

            if (success) {
                this.isShuttingDown = false;
                await this.syncState();
            }

            return { success };
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to shutdown Ollama:`, error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
const ollamaService = new OllamaService();
module.exports = ollamaService;
