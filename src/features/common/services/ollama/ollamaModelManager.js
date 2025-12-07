/**
 * OllamaModelManager - Model listing, pulling, and status tracking
 */
const { EventEmitter } = require('events');
const fetch = require('node-fetch');
const { spawnAsync } = require('../../utils/spawnHelper');
const ollamaModelRepository = require('../../repositories/ollamaModel');
const { MODEL } = require('../../config/constants');

class OllamaModelManager extends EventEmitter {
    constructor(baseUrl) {
        super();
        this.serviceName = 'OllamaModelManager';
        this.baseUrl = baseUrl;
        this.installationProgress = new Map(); // modelName -> progress
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
     * Get installed models from Ollama API
     * @param {Function} makeRequest - Function to make API requests
     * @param {boolean} isShuttingDown - Service shutdown flag
     * @returns {Promise<Array>} - List of installed models
     */
    async getInstalledModels(makeRequest, isShuttingDown) {
        if (isShuttingDown) {
            console.log(`[${this.serviceName}] Service is shutting down, returning empty models list`);
            return [];
        }

        try {
            const response = await makeRequest('/api/tags', {
                method: 'GET'
            });

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to get installed models:`, error.message);
            return [];
        }
    }

    /**
     * Get models currently loaded in memory using /api/ps
     * @param {Function} makeRequest - Function to make API requests
     * @param {boolean} isShuttingDown - Service shutdown flag
     * @returns {Promise<Array>} - List of loaded model names
     */
    async getLoadedModels(makeRequest, isShuttingDown) {
        if (isShuttingDown) {
            console.log(`[${this.serviceName}] Service is shutting down, returning empty loaded models list`);
            return [];
        }

        try {
            const response = await makeRequest('/api/ps', {
                method: 'GET'
            });

            if (!response.ok) {
                console.log(`[${this.serviceName}] Failed to get loaded models via /api/ps`);
                return [];
            }

            const data = await response.json();
            return (data.models || []).map(m => m.name);
        } catch (error) {
            console.error(`[${this.serviceName}] Error getting loaded models:`, error);
            return [];
        }
    }

    /**
     * Get detailed memory info for loaded models
     * @param {Function} makeRequest - Function to make API requests
     * @returns {Promise<Array>} - List of loaded models with memory info
     */
    async getLoadedModelsWithMemoryInfo(makeRequest) {
        try {
            const response = await makeRequest('/api/ps', {
                method: 'GET'
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error(`[${this.serviceName}] Error getting loaded models info:`, error);
            return [];
        }
    }

    /**
     * Check if a specific model is loaded in memory
     * @param {string} modelName - Model name to check
     * @param {Function} makeRequest - Function to make API requests
     * @returns {Promise<boolean>} - True if model is loaded
     */
    async isModelLoaded(modelName, makeRequest) {
        const loadedModels = await this.getLoadedModels(makeRequest, false);
        return loadedModels.includes(modelName);
    }

    /**
     * Get installed models list using CLI
     * @returns {Promise<Array>} - List of installed models with details
     */
    async getInstalledModelsList(makeRequest) {
        try {
            const { stdout } = await spawnAsync(this.getOllamaCliPath(), ['list']);
            const lines = stdout.split('\n').filter(line => line.trim());

            // Skip header line (NAME, ID, SIZE, MODIFIED)
            const modelLines = lines.slice(1);

            const models = [];
            for (const line of modelLines) {
                if (!line.trim()) continue;

                // Parse line: "model:tag    model_id    size    modified_time"
                const parts = line.split(/\s+/);
                if (parts.length >= 3) {
                    models.push({
                        name: parts[0],
                        id: parts[1],
                        size: parts[2] + (parts[3] === 'GB' || parts[3] === 'MB' ? ' ' + parts[3] : ''),
                        status: 'installed'
                    });
                }
            }

            return models;
        } catch (error) {
            console.log(`[${this.serviceName}] Failed to get installed models via CLI, falling back to API`);
            // Fallback to API if CLI fails
            const apiModels = await this.getInstalledModels(makeRequest, false);
            return apiModels.map(model => ({
                name: model.name,
                id: model.digest || 'unknown',
                size: model.size || 'Unknown',
                status: 'installed'
            }));
        }
    }

    /**
     * Get model suggestions (currently returns installed models)
     * @param {Function} makeRequest - Function to make API requests
     * @returns {Promise<Array>} - List of model suggestions
     */
    async getModelSuggestions(makeRequest) {
        try {
            const installedModels = await this.getInstalledModelsList(makeRequest);
            return installedModels;
        } catch (error) {
            console.error(`[${this.serviceName}] Failed to get model suggestions:`, error);
            return [];
        }
    }

    /**
     * Check if a model is installed
     * @param {string} modelName - Model name to check
     * @param {Function} makeRequest - Function to make API requests
     * @returns {Promise<boolean>} - True if model is installed
     */
    async isModelInstalled(modelName, makeRequest) {
        const models = await this.getInstalledModels(makeRequest, false);
        return models.some(model => model.name === modelName);
    }

    /**
     * Pull/download a model from Ollama registry
     * @param {string} modelName - Model name to pull
     * @returns {Promise<void>}
     */
    async pullModel(modelName) {
        if (!modelName?.trim()) {
            throw new Error(`Invalid model name: ${modelName}`);
        }

        console.log(`[${this.serviceName}] Starting to pull model: ${modelName} via API`);

        // Emit progress event
        this.emit('install-progress', {
            model: modelName,
            progress: 0,
            status: 'starting'
        });

        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Pull API failed: ${response.status} ${response.statusText}`);
            }

            // Handle Node.js streaming response
            return new Promise((resolve, reject) => {
                let buffer = '';

                response.body.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');

                    // Keep incomplete line in buffer
                    buffer = lines.pop() || '';

                    // Process complete lines
                    for (const line of lines) {
                        if (!line.trim()) continue;

                        try {
                            const data = JSON.parse(line);
                            const progress = this._parseOllamaPullProgress(data, modelName);

                            if (progress !== null) {
                                this.setInstallProgress(modelName, progress);
                                this.emit('install-progress', {
                                    model: modelName,
                                    progress,
                                    status: data.status || 'downloading'
                                });
                                console.log(`[${this.serviceName}] API Progress: ${progress}% for ${modelName} (${data.status || 'downloading'})`);
                            }

                            // Handle completion
                            if (data.status === 'success') {
                                console.log(`[${this.serviceName}] Successfully pulled model: ${modelName}`);
                                this.emit('model-pull-complete', { model: modelName });
                                this.clearInstallProgress(modelName);
                                resolve();
                                return;
                            }
                        } catch (parseError) {
                            console.warn(`[${this.serviceName}] Failed to parse response line:`, line);
                        }
                    }
                });

                response.body.on('end', () => {
                    // Process any remaining data in buffer
                    if (buffer.trim()) {
                        try {
                            const data = JSON.parse(buffer);
                            if (data.status === 'success') {
                                console.log(`[${this.serviceName}] Successfully pulled model: ${modelName}`);
                                this.emit('model-pull-complete', { model: modelName });
                            }
                        } catch (parseError) {
                            console.warn(`[${this.serviceName}] Failed to parse final buffer:`, buffer);
                        }
                    }
                    this.clearInstallProgress(modelName);
                    resolve();
                });

                response.body.on('error', (error) => {
                    console.error(`[${this.serviceName}] Stream error for ${modelName}:`, error);
                    this.clearInstallProgress(modelName);
                    reject(error);
                });
            });
        } catch (error) {
            this.clearInstallProgress(modelName);
            console.error(`[${this.serviceName}] Pull model failed:`, error);
            throw error;
        }
    }

    /**
     * Parse Ollama pull progress from API response
     * @param {Object} data - API response data
     * @param {string} modelName - Model name
     * @returns {number|null} - Progress percentage or null
     */
    _parseOllamaPullProgress(data, modelName) {
        if (data.status === 'success') {
            return 100;
        }

        // Handle downloading progress
        if (data.total && data.completed !== undefined) {
            const progress = Math.round((data.completed / data.total) * 100);
            return Math.min(progress, 99); // Don't show 100% until success
        }

        // Handle status-based progress
        const statusProgress = {
            'pulling manifest': 5,
            'downloading': 10,
            'verifying sha256 digest': 90,
            'writing manifest': 95,
            'removing any unused layers': 98
        };

        if (data.status && statusProgress[data.status] !== undefined) {
            return statusProgress[data.status];
        }

        return null;
    }

    /**
     * Get all models with status (installed, loading, warmed, etc.)
     * @param {Function} makeRequest - Function to make API requests
     * @param {Object} warmupManager - OllamaWarmup instance
     * @returns {Promise<Array>} - List of models with status
     */
    async getAllModelsWithStatus(makeRequest, warmupManager) {
        const installedModels = await this.getInstalledModels(makeRequest, false);
        const loadedModels = await this.getLoadedModels(makeRequest, false);

        const models = [];
        let count = 0;

        // Process installed models with async chunking
        for (const model of installedModels) {
            const isWarmingUp = warmupManager.warmingModels.has(model.name);
            const isWarmedUp = warmupManager.warmedModels.has(model.name);
            const isLoaded = loadedModels.includes(model.name);

            models.push({
                name: model.name,
                displayName: model.name,
                size: model.size || 'Unknown',
                description: `Ollama model: ${model.name}`,
                installed: true,
                installing: this.installationProgress.has(model.name),
                progress: this.getInstallProgress(model.name),
                warmedUp: isWarmedUp,
                isWarmingUp,
                isLoaded,
                status: isWarmingUp ? 'warming' : (isLoaded ? 'loaded' : (isWarmedUp ? 'ready' : 'cold'))
            });

            // Yield to event loop every N items to prevent blocking
            count++;
            if (count % MODEL.CHUNK_SIZE === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }

        // Also add any models currently being installed
        count = 0;
        for (const [modelName, progress] of this.installationProgress) {
            if (!models.find(m => m.name === modelName)) {
                models.push({
                    name: modelName,
                    displayName: modelName,
                    size: 'Unknown',
                    description: `Ollama model: ${modelName}`,
                    installed: false,
                    installing: true,
                    progress: progress
                });

                // Yield to event loop every N items
                count++;
                if (count % MODEL.CHUNK_SIZE === 0) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
        }

        return models;
    }

    // === Installation Progress Tracking ===

    getInstallProgress(modelName) {
        return this.installationProgress.get(modelName) || 0;
    }

    setInstallProgress(modelName, progress) {
        this.installationProgress.set(modelName, progress);
    }

    clearInstallProgress(modelName) {
        this.installationProgress.delete(modelName);
    }

    /**
     * Cleanup all progress tracking
     */
    cleanup() {
        console.log(`[${this.serviceName}] Cleaning up...`);
        this.installationProgress.clear();
    }
}

module.exports = OllamaModelManager;
