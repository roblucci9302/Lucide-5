/**
 * AI Models Bridge - IPC handlers for Ollama, Whisper, ModelState, and LocalAI
 */
const { ipcMain } = require('electron');
const whisperService = require('../../features/common/services/whisperService');
const ollamaService = require('../../features/common/services/ollamaService');
const modelStateService = require('../../features/common/services/modelStateService');
const localAIManager = require('../../features/common/services/localAIManager');

module.exports = {
    initialize() {
        // Whisper
        ipcMain.handle('whisper:download-model', async (event, modelId) => await whisperService.handleDownloadModel(modelId));
        ipcMain.handle('whisper:get-installed-models', async () => await whisperService.handleGetInstalledModels());

        // Ollama
        ipcMain.handle('ollama:get-status', async () => await ollamaService.handleGetStatus());
        ipcMain.handle('ollama:install', async () => await ollamaService.handleInstall());
        ipcMain.handle('ollama:start-service', async () => await ollamaService.handleStartService());
        ipcMain.handle('ollama:ensure-ready', async () => await ollamaService.handleEnsureReady());
        ipcMain.handle('ollama:get-models', async () => await ollamaService.handleGetModels());
        ipcMain.handle('ollama:get-model-suggestions', async () => await ollamaService.handleGetModelSuggestions());
        ipcMain.handle('ollama:pull-model', async (event, modelName) => await ollamaService.handlePullModel(modelName));
        ipcMain.handle('ollama:is-model-installed', async (event, modelName) => await ollamaService.handleIsModelInstalled(modelName));
        ipcMain.handle('ollama:warm-up-model', async (event, modelName) => await ollamaService.handleWarmUpModel(modelName));
        ipcMain.handle('ollama:auto-warm-up', async () => await ollamaService.handleAutoWarmUp());
        ipcMain.handle('ollama:get-warm-up-status', async () => await ollamaService.handleGetWarmUpStatus());
        ipcMain.handle('ollama:shutdown', async (event, force = false) => await ollamaService.handleShutdown(force));

        // ModelStateService
        ipcMain.handle('model:validate-key', async (e, { provider, key }) => await modelStateService.handleValidateKey(provider, key));
        ipcMain.handle('model:get-all-keys', async () => await modelStateService.getAllApiKeys());
        ipcMain.handle('model:set-api-key', async (e, { provider, key }) => await modelStateService.setApiKey(provider, key));
        ipcMain.handle('model:remove-api-key', async (e, provider) => await modelStateService.handleRemoveApiKey(provider));
        ipcMain.handle('model:get-selected-models', async () => await modelStateService.getSelectedModels());
        ipcMain.handle('model:set-selected-model', async (e, { type, modelId }) => await modelStateService.handleSetSelectedModel(type, modelId));
        ipcMain.handle('model:get-available-models', async (e, { type }) => await modelStateService.getAvailableModels(type));
        ipcMain.handle('model:are-providers-configured', async () => await modelStateService.areProvidersConfigured());
        ipcMain.handle('model:get-provider-config', () => modelStateService.getProviderConfig());
        ipcMain.handle('model:re-initialize-state', async () => await modelStateService.initialize());

        // LocalAI Manager
        ipcMain.handle('localai:install', async (event, { service, options }) => {
            return await localAIManager.installService(service, options);
        });
        ipcMain.handle('localai:get-status', async (event, service) => {
            return await localAIManager.getServiceStatus(service);
        });
        ipcMain.handle('localai:start-service', async (event, service) => {
            return await localAIManager.startService(service);
        });
        ipcMain.handle('localai:stop-service', async (event, service) => {
            return await localAIManager.stopService(service);
        });
        ipcMain.handle('localai:install-model', async (event, { service, modelId, options }) => {
            return await localAIManager.installModel(service, modelId, options);
        });
        ipcMain.handle('localai:get-installed-models', async (event, service) => {
            return await localAIManager.getInstalledModels(service);
        });
        ipcMain.handle('localai:run-diagnostics', async (event, service) => {
            return await localAIManager.runDiagnostics(service);
        });
        ipcMain.handle('localai:repair-service', async (event, service) => {
            return await localAIManager.repairService(service);
        });
        ipcMain.handle('localai:handle-error', async (event, { service, errorType, details }) => {
            return await localAIManager.handleError(service, errorType, details);
        });
        ipcMain.handle('localai:get-all-states', async (event) => {
            return await localAIManager.getAllServiceStates();
        });

        // Start periodic sync for LocalAI
        localAIManager.startPeriodicSync();

        console.log('[AIModelsBridge] Initialized');
    }
};
