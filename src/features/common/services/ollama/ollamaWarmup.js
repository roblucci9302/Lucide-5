/**
 * OllamaWarmup - Model warming and memory management
 */
const { EventEmitter } = require('events');
const ollamaModelRepository = require('../../repositories/ollamaModel');
const { MODEL } = require('../../config/constants');

class OllamaWarmup extends EventEmitter {
    constructor() {
        super();
        this.serviceName = 'OllamaWarmup';

        // Warming state management
        this.warmingModels = new Map(); // modelName -> Promise
        this.warmedModels = new Set(); // Successfully warmed models
        this.lastWarmUpAttempt = new Map(); // modelName -> timestamp
        this.warmupTimeout = MODEL.WARMUP_TIMEOUT;
    }

    /**
     * Warm up a model by loading it into memory
     * @param {string} modelName - Name of the model to warm up
     * @param {boolean} forceRefresh - Force refresh even if already warmed
     * @param {Function} makeRequest - Function to make API requests to Ollama
     * @param {Function} pullModel - Function to pull/install a model
     * @returns {Promise<boolean>} - True if warming successful
     */
    async warmUpModel(modelName, forceRefresh, makeRequest, pullModel) {
        if (!modelName?.trim()) {
            console.warn(`[${this.serviceName}] Invalid model name for warm-up`);
            return false;
        }

        // Check if already warmed (and not forcing refresh)
        if (!forceRefresh && this.warmedModels.has(modelName)) {
            console.log(`[${this.serviceName}] Model ${modelName} already warmed up, skipping`);
            return true;
        }

        // Check if currently warming - return existing Promise
        if (this.warmingModels.has(modelName)) {
            console.log(`[${this.serviceName}] Model ${modelName} is already warming up, joining existing operation`);
            return await this.warmingModels.get(modelName);
        }

        // Check rate limiting (prevent too frequent attempts)
        const lastAttempt = this.lastWarmUpAttempt.get(modelName);
        const now = Date.now();
        if (lastAttempt && (now - lastAttempt) < MODEL.WARMUP_COOLDOWN) {
            console.log(`[${this.serviceName}] Rate limiting warm-up for ${modelName}, try again in ${5 - Math.floor((now - lastAttempt) / 1000)}s`);
            return false;
        }

        // Create and store the warming Promise
        const warmingPromise = this._performWarmUp(modelName, makeRequest, pullModel);
        this.warmingModels.set(modelName, warmingPromise);
        this.lastWarmUpAttempt.set(modelName, now);

        try {
            const result = await warmingPromise;

            if (result) {
                this.warmedModels.add(modelName);
                console.log(`[${this.serviceName}] Model ${modelName} successfully warmed up`);
            }

            return result;
        } finally {
            // Always clean up the warming Promise
            this.warmingModels.delete(modelName);
        }
    }

    /**
     * Perform the actual warm-up operation
     * @param {string} modelName - Name of the model to warm up
     * @param {Function} makeRequest - Function to make API requests to Ollama
     * @param {Function} pullModel - Function to pull/install a model
     * @returns {Promise<boolean>} - True if warming successful
     */
    async _performWarmUp(modelName, makeRequest, pullModel) {
        console.log(`[${this.serviceName}] Starting warm-up for model: ${modelName}`);

        try {
            const response = await makeRequest('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'user', content: 'Hi' }
                    ],
                    stream: false,
                    options: {
                        num_predict: 1, // Minimal response
                        temperature: 0
                    }
                })
            });

            return true;
        } catch (error) {
            // Check if it's a 404 error (model not found/installed)
            if (error.message.includes('HTTP 404') || error.message.includes('Not Found')) {
                console.log(`[${this.serviceName}] Model ${modelName} not found (404), attempting to install...`);

                try {
                    // Try to install the model
                    await pullModel(modelName);
                    console.log(`[${this.serviceName}] Successfully installed model ${modelName}, retrying warm-up...`);

                    // Update database to reflect installation
                    await ollamaModelRepository.updateInstallStatus(modelName, true, false);

                    // Retry warm-up after installation
                    const retryResponse = await makeRequest('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: modelName,
                            messages: [
                                { role: 'user', content: 'Hi' }
                            ],
                            stream: false,
                            options: {
                                num_predict: 1,
                                temperature: 0
                            }
                        })
                    });

                    console.log(`[${this.serviceName}] Successfully warmed up model ${modelName} after installation`);
                    return true;

                } catch (installError) {
                    console.error(`[${this.serviceName}] Failed to auto-install model ${modelName}:`, installError.message);
                    await ollamaModelRepository.updateInstallStatus(modelName, false, false);
                    return false;
                }
            } else {
                console.error(`[${this.serviceName}] Failed to warm up model ${modelName}:`, error.message);
                return false;
            }
        }
    }

    /**
     * Auto warm-up the selected model from ModelStateService
     * @param {Function} makeRequest - Function to make API requests to Ollama
     * @param {Function} pullModel - Function to pull/install a model
     * @param {Function} isServiceRunning - Function to check if Ollama service is running
     * @returns {Promise<boolean>} - True if warming successful
     */
    async autoWarmUpSelectedModel(makeRequest, pullModel, isServiceRunning) {
        try {
            // Get selected model from ModelStateService
            const modelStateService = global.modelStateService;
            if (!modelStateService) {
                console.log(`[${this.serviceName}] ModelStateService not available for auto warm-up`);
                return false;
            }

            const selectedModels = await modelStateService.getSelectedModels();
            const llmModelId = selectedModels.llm;

            // Check if it's an Ollama model
            const provider = modelStateService.getProviderForModel('llm', llmModelId);
            if (provider !== 'ollama') {
                console.log(`[${this.serviceName}] Selected LLM is not Ollama, skipping warm-up`);
                return false;
            }

            // Check if Ollama service is running
            const isRunning = await isServiceRunning();
            if (!isRunning) {
                console.log(`[${this.serviceName}] Ollama service not running, clearing warm-up cache`);
                this.clearCache();
                return false;
            }

            console.log(`[${this.serviceName}] Auto-warming up selected model: ${llmModelId} (will auto-install if needed)`);
            const result = await this.warmUpModel(llmModelId, false, makeRequest, pullModel);

            // Emit event on success
            if (result) {
                this.emit('model-warmed-up', { model: llmModelId });
            }

            return result;

        } catch (error) {
            console.error(`[${this.serviceName}] Auto warm-up failed:`, error);
            return false;
        }
    }

    /**
     * Get warm-up status
     * @param {Function} getLoadedModels - Function to get currently loaded models
     * @returns {Promise<Object>} - Warm-up status
     */
    async getWarmUpStatus(getLoadedModels) {
        const loadedModels = await getLoadedModels();

        return {
            warmedModels: Array.from(this.warmedModels),
            warmingModels: Array.from(this.warmingModels.keys()),
            loadedModels: loadedModels,  // Models actually loaded in memory
            lastAttempts: Object.fromEntries(this.lastWarmUpAttempt)
        };
    }

    /**
     * Clear warm-up cache
     */
    clearCache() {
        this.warmedModels.clear();
        this.warmingModels.clear();
        this.lastWarmUpAttempt.clear();
        console.log(`[${this.serviceName}] Warm-up cache cleared`);
    }

    /**
     * Remove a model from warmed cache (when unloaded from memory)
     * @param {string} modelName - Model name to remove
     */
    removeFromWarmed(modelName) {
        if (this.warmedModels.delete(modelName)) {
            console.log(`[${this.serviceName}] Model ${modelName} removed from warmed cache`);
        }
    }

    /**
     * Cleanup all warming-related data structures
     */
    cleanup() {
        console.log(`[${this.serviceName}] Cleaning up...`);
        this.clearCache();
    }

    /**
     * Shutdown - wait for warming operations to complete
     * @param {boolean} force - Force shutdown without waiting
     * @returns {Promise<boolean>} - True if shutdown successful
     */
    async shutdown(force = false) {
        console.log(`[${this.serviceName}] Shutdown initiated (force: ${force})`);

        if (!force && this.warmingModels.size > 0) {
            const warmingList = Array.from(this.warmingModels.keys());
            console.log(`[${this.serviceName}] Waiting for ${warmingList.length} models to finish warming: ${warmingList.join(', ')}`);

            const warmingPromises = Array.from(this.warmingModels.values());
            try {
                // Use Promise.allSettled to wait for all operations
                const results = await Promise.allSettled(warmingPromises);
                const completed = results.filter(r => r.status === 'fulfilled').length;
                console.log(`[${this.serviceName}] ${completed}/${results.length} warming operations completed`);
            } catch (error) {
                console.log(`[${this.serviceName}] Error waiting for warm-up completion, proceeding with shutdown`);
            }
        }

        this.cleanup();
        return true;
    }
}

module.exports = OllamaWarmup;
