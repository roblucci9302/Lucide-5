const { EventEmitter } = require('events');
const Store = require('electron-store');
const { PROVIDERS, getProviderClass } = require('../ai/factory');
const encryptionService = require('./encryptionService');
const providerSettingsRepository = require('../repositories/providerSettings');
const authService = require('./authService');
const ollamaModelRepository = require('../repositories/ollamaModel');

class ModelStateService extends EventEmitter {
    constructor() {
        super();
        this.authService = authService;
        // electron-store est utilisé uniquement pour la migration des données legacy
        this.store = new Store({ name: 'lucide-model-state' });

        // Fix CRITICAL BUG #5: Memory leak - Store listener reference for cleanup
        this.localAIStateChangeHandler = null;
        
        // PHASE 2: Reference to notification service (lazy loaded)
        this._notificationService = null;
        
        // PHASE 3: Auto-selection setting & validation cache
        this._autoSelectionEnabled = true; // Default: enabled
        this._validationCache = new Map(); // Cache for model validations
        this._cacheTimeout = 60000; // Cache valid for 60 seconds
    }
    
    /**
     * PHASE 2: Get notification service instance (lazy loading)
     */
    _getNotificationService() {
        if (!this._notificationService) {
            try {
                this._notificationService = require('../../listen/liveInsights/notificationService');
            } catch (err) {
                console.warn('[ModelStateService] NotificationService not available:', err.message);
            }
        }
        return this._notificationService;
    }
    
    /**
     * PHASE 3: Enable/disable auto-selection
     */
    setAutoSelectionEnabled(enabled) {
        this._autoSelectionEnabled = !!enabled;
        console.log(`[ModelStateService] Auto-selection ${enabled ? 'enabled' : 'disabled'}`);
        this.emit('auto-selection-changed', { enabled: this._autoSelectionEnabled });
    }
    
    /**
     * PHASE 3: Get auto-selection status
     */
    isAutoSelectionEnabled() {
        return this._autoSelectionEnabled;
    }
    
    /**
     * PHASE 3: Clear validation cache
     */
    clearValidationCache() {
        this._validationCache.clear();
        console.log('[ModelStateService] Validation cache cleared');
    }
    
    /**
     * PHASE 3: Get cached validation result
     */
    _getCachedValidation(cacheKey) {
        const cached = this._validationCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this._cacheTimeout) {
            return cached.result;
        }
        return null;
    }
    
    /**
     * PHASE 3: Set cached validation result
     */
    _setCachedValidation(cacheKey, result) {
        this._validationCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }

    async initialize() {
        console.log('[ModelStateService] Initializing one-time setup...');
        await this._initializeEncryption();
        await this._runMigrations();
        this.setupLocalAIStateSync();
        await this._autoSelectAvailableModels([], true);
        console.log('[ModelStateService] One-time setup complete.');
    }

    async _initializeEncryption() {
        try {
            const rows = await providerSettingsRepository.getRawApiKeys();
            if (rows.some(r => r.api_key && encryptionService.looksEncrypted(r.api_key))) {
                console.log('[ModelStateService] Encrypted keys detected, initializing encryption...');
                const userIdForMigration = this.authService.getCurrentUserId();
                await encryptionService.initializeKey(userIdForMigration);
            } else {
                console.log('[ModelStateService] No encrypted keys detected, skipping encryption initialization.');
            }
        } catch (err) {
            console.warn('[ModelStateService] Error while checking encrypted keys:', err.message);
        }
    }

    async _runMigrations() {
        console.log('[ModelStateService] Checking for data migrations...');
        const userId = this.authService.getCurrentUserId();
        
        // Fix CRITICAL BUG #4: Wrap migration in try-catch with proper error handling
        // Migration should only drop table if models were successfully migrated
        try {
            const sqliteClient = require('./sqliteClient');
            const db = sqliteClient.getDb();
            const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_model_selections'").get();

            if (tableExists) {
                const selections = db.prepare('SELECT * FROM user_model_selections WHERE uid = ?').get(userId);
                if (selections) {
                    console.log('[ModelStateService] Migrating from user_model_selections table...');

                    // Store migration success flags
                    let llmMigrated = false;
                    let sttMigrated = false;

                    // Migrate LLM model
                    if (selections.llm_model) {
                        const llmProvider = this.getProviderForModel(selections.llm_model, 'llm');
                        if (llmProvider) {
                            try {
                                await this.setSelectedModel('llm', selections.llm_model);
                                llmMigrated = true;
                            } catch (error) {
                                console.error('[ModelStateService] Failed to migrate LLM model:', error);
                            }
                        }
                    } else {
                        llmMigrated = true; // No LLM to migrate
                    }

                    // Migrate STT model
                    if (selections.stt_model) {
                        const sttProvider = this.getProviderForModel(selections.stt_model, 'stt');
                        if (sttProvider) {
                            try {
                                await this.setSelectedModel('stt', selections.stt_model);
                                sttMigrated = true;
                            } catch (error) {
                                console.error('[ModelStateService] Failed to migrate STT model:', error);
                            }
                        }
                    } else {
                        sttMigrated = true; // No STT to migrate
                    }

                    // Only drop table if both migrations succeeded (or had nothing to migrate)
                    if (llmMigrated && sttMigrated) {
                        db.prepare('DROP TABLE user_model_selections').run();
                        console.log('[ModelStateService] user_model_selections migration complete and table dropped.');
                    } else {
                        console.warn('[ModelStateService] user_model_selections migration incomplete - table NOT dropped to prevent data loss.');
                    }
                }
            }
        } catch (error) {
            console.error('[ModelStateService] user_model_selections migration failed:', error);
        }

        try {
            const legacyData = this.store.get(`users.${userId}`);
            if (legacyData && legacyData.apiKeys) {
                console.log('[ModelStateService] Migrating from electron-store...');
                for (const [provider, apiKey] of Object.entries(legacyData.apiKeys)) {
                    if (apiKey && PROVIDERS[provider]) {
                        await this.setApiKey(provider, apiKey);
                    }
                }
                if (legacyData.selectedModels?.llm) {
                    await this.setSelectedModel('llm', legacyData.selectedModels.llm);
                }
                if (legacyData.selectedModels?.stt) {
                    await this.setSelectedModel('stt', legacyData.selectedModels.stt);
                }
                this.store.delete(`users.${userId}`);
                console.log('[ModelStateService] electron-store migration complete.');
            }
        } catch (error) {
            console.error('[ModelStateService] electron-store migration failed:', error);
        }
    }
    
    setupLocalAIStateSync() {
        const localAIManager = require('./localAIManager');

        // Fix CRITICAL BUG #5: Memory leak - Remove old listener before adding new one
        if (this.localAIStateChangeHandler) {
            localAIManager.removeListener('state-changed', this.localAIStateChangeHandler);
        }

        // Store handler reference for cleanup
        this.localAIStateChangeHandler = (service, status) => {
            this.handleLocalAIStateChange(service, status);
        };

        localAIManager.on('state-changed', this.localAIStateChangeHandler);
    }

    async handleLocalAIStateChange(service, state) {
        // PHASE 2: Enhanced logging with state details
        const stateInfo = state.installed && state.running 
            ? `✅ available (${state.models?.length || 0} models)`
            : `❌ unavailable (installed: ${state.installed}, running: ${state.running})`;
        console.log(`[ModelStateService] LocalAI state changed: ${service} - ${stateInfo}`);
        
        // PHASE 3: Skip auto-selection if disabled by user
        if (!this._autoSelectionEnabled) {
            console.log(`[ModelStateService] Auto-selection disabled, keeping current model selection.`);
            this.emit('state-updated', await this.getLiveState());
            return;
        }
        
        // PHASE 1 FIX: Only force re-selection if the CURRENT model depends on the unavailable service
        if (!state.installed || !state.running) {
            const type = service === 'ollama' ? 'llm' : service === 'whisper' ? 'stt' : null;
            if (!type) {
                this.emit('state-updated', await this.getLiveState());
                return;
            }

            // Check if current model actually uses this service
            const selectedModels = await this.getSelectedModels();
            const currentModelId = selectedModels[type];
            
            if (currentModelId) {
                const currentProvider = this.getProviderForModel(currentModelId, type);
                
                // Only force re-selection if current model is from the unavailable service
                if (currentProvider === service) {
                    console.log(`[ModelStateService] ⚠️ Current ${type} model (${currentModelId}) uses unavailable ${service}. Re-selecting...`);
                    await this._autoSelectAvailableModels([type]);
                } else {
                    console.log(`[ModelStateService] ✅ Current ${type} model (${currentModelId}) uses ${currentProvider}, not affected by ${service} unavailability.`);
                }
            } else {
                console.log(`[ModelStateService] ⚠️ No current ${type} model selected. Running auto-selection...`);
                await this._autoSelectAvailableModels([type]);
            }
        }
        this.emit('state-updated', await this.getLiveState());
    }

    async getLiveState() {
        const providerSettings = await providerSettingsRepository.getAll();
        const apiKeys = {};
        Object.keys(PROVIDERS).forEach(provider => {
            const setting = providerSettings.find(s => s.provider === provider);
            apiKeys[provider] = setting?.api_key || null;
        });

        const activeSettings = await providerSettingsRepository.getActiveSettings();
        const selectedModels = {
            llm: activeSettings.llm?.selected_llm_model || null,
            stt: activeSettings.stt?.selected_stt_model || null
        };
        
        return { apiKeys, selectedModels };
    }

    async _autoSelectAvailableModels(forceReselectionForTypes = [], isInitialBoot = false) {
        console.log(`[ModelStateService] Running auto-selection. Force re-selection for: [${forceReselectionForTypes.join(', ')}]`);
        const { apiKeys, selectedModels } = await this.getLiveState();
        const types = ['llm', 'stt'];

        for (const type of types) {
            const currentModelId = selectedModels[type];
            let isCurrentModelValid = false;
            const forceReselection = forceReselectionForTypes.includes(type);

            if (currentModelId && !forceReselection) {
                const provider = this.getProviderForModel(currentModelId, type);
                
                // PHASE 3: Use validation cache to reduce redundant checks
                const cacheKey = `${type}:${currentModelId}:${provider}`;
                const cachedResult = this._getCachedValidation(cacheKey);
                
                if (cachedResult !== null) {
                    isCurrentModelValid = cachedResult;
                    console.log(`[ModelStateService] 🔄 Using cached validation for ${currentModelId}: ${isCurrentModelValid ? 'valid' : 'invalid'}`);
                } else {
                    // PHASE 1 FIX 1.2: Improved validation logic
                    // A model is valid if:
                    // 1. It's a local model (ollama/whisper) that's available, OR
                    // 2. It's an API model with a valid API key
                    if (provider) {
                        if (provider === 'ollama' || provider === 'whisper') {
                            // For local models, check if the service is available
                            const localAIManager = require('./localAIManager');
                            const localState = await localAIManager.getState(provider);
                            isCurrentModelValid = localState.installed && localState.running;
                            if (isCurrentModelValid) {
                                console.log(`[ModelStateService] Current ${type} model (${currentModelId}) is valid - ${provider} is available`);
                            }
                        } else {
                            // For API models, check if API key exists
                            const apiKey = apiKeys[provider];
                            isCurrentModelValid = !!apiKey;
                            if (isCurrentModelValid) {
                                console.log(`[ModelStateService] Current ${type} model (${currentModelId}) is valid - has API key for ${provider}`);
                            }
                        }
                    }
                    
                    // PHASE 3: Cache the validation result
                    this._setCachedValidation(cacheKey, isCurrentModelValid);
                }
            }

            if (!isCurrentModelValid) {
                console.log(`[ModelStateService] No valid ${type.toUpperCase()} model selected or selection forced. Finding an alternative...`);
                const availableModels = await this.getAvailableModels(type);
                
                // PHASE 2: Log available models for debugging
                console.log(`[ModelStateService] Available ${type} models:`, availableModels.map(m => m.id).join(', '));
                
                // PHASE 3: Handle edge case - no models available at all
                if (availableModels.length === 0) {
                    console.log(`[ModelStateService] ⚠️ No ${type} models available. Possible causes:`);
                    console.log(`  - No API keys configured for any provider`);
                    console.log(`  - All local AI services (Ollama/Whisper) are down`);
                    console.log(`  - Network connectivity issues`);
                    await providerSettingsRepository.setActiveProvider(null, type);
                    if (!isInitialBoot) {
                       this.emit('state-updated', await this.getLiveState());
                    }
                    
                    // Notify user about the issue
                    const notificationService = this._getNotificationService();
                    if (notificationService && !isInitialBoot) {
                        notificationService.notifySystemEvent({
                            title: `⚠️ No ${type.toUpperCase()} Models Available`,
                            message: `Please configure an API key or start a local AI service.`,
                            priority: 'high'
                        });
                    }
                    continue; // Skip to next type
                }
                
                if (availableModels.length > 0) {
                    // PHASE 2: Preference order for auto-selection
                    const preferenceOrder = type === 'llm' 
                        ? ['gpt-4o', 'gpt-4-turbo', 'gemini-2.5-flash', 'claude-3-haiku-20240307']
                        : ['gpt-4o-mini-transcribe', 'nova-3', 'gemini-live-2.5-flash-preview'];
                    
                    let newModel = null;
                    
                    // Try to find best model according to preference order
                    for (const preferredModelId of preferenceOrder) {
                        const match = availableModels.find(m => m.id === preferredModelId);
                        if (match) {
                            newModel = match;
                            console.log(`[ModelStateService] Selected preferred ${type} model: ${preferredModelId}`);
                            break;
                        }
                    }
                    
                    // Fallback: prefer API models over local models
                    if (!newModel) {
                        const apiModel = availableModels.find(model => {
                            const provider = this.getProviderForModel(model.id, type);
                            return provider && provider !== 'ollama' && provider !== 'whisper';
                        });
                        newModel = apiModel || availableModels[0];
                        console.log(`[ModelStateService] Selected fallback ${type} model: ${newModel.id}`);
                    }
                    
                    await this.setSelectedModel(type, newModel.id);
                    console.log(`[ModelStateService] ✅ Auto-selected ${type.toUpperCase()} model: ${newModel.id}`);
                    
                    // PHASE 2: Notify user about automatic model change
                    if (!isInitialBoot && currentModelId && currentModelId !== newModel.id) {
                        const fromProvider = this.getProviderForModel(currentModelId, type);
                        const toProvider = this.getProviderForModel(newModel.id, type);
                        const reason = forceReselectionForTypes.includes(type) 
                            ? `${fromProvider} unavailable`
                            : 'No valid model selected';
                        
                        const modelChangeEvent = {
                            type,
                            from: currentModelId,
                            to: newModel.id,
                            reason
                        };
                        
                        this.emit('model-auto-changed', modelChangeEvent);
                        
                        // Send notification to user
                        const notificationService = this._getNotificationService();
                        if (notificationService) {
                            const modelName = newModel.name || newModel.id;
                            notificationService.notifySystemEvent({
                                title: '🔄 AI Model Changed',
                                message: `Switched from ${currentModelId} to ${modelName} (${reason})`,
                                priority: 'medium',
                                metadata: modelChangeEvent
                            });
                        }
                    }
                }
            } else {
                console.log(`[ModelStateService] ✅ Keeping current ${type.toUpperCase()} model: ${currentModelId}`);
            }
        }
        
        // PHASE 3: Clear validation cache after auto-selection run
        // This ensures fresh validation on next run
        this.clearValidationCache();
    }
    
    async setFirebaseVirtualKey(virtualKey) {
        console.log(`[ModelStateService] Setting Firebase virtual key.`);

        // Avant de définir la clé, vérifier si une clé openai-lucide existait précédemment
        const previousSettings = await providerSettingsRepository.getByProvider('openai');
        const wasPreviouslyConfigured = !!previousSettings?.api_key;

        // Toujours mettre à jour avec la nouvelle clé virtuelle
        await this.setApiKey('openai', virtualKey);

        if (virtualKey) {
            // Forcer le changement de modèle uniquement lors de la première configuration (première connexion)
            if (!wasPreviouslyConfigured) {
                console.log('[ModelStateService] First-time setup for OpenAI, setting default models.');
                const llmModel = PROVIDERS['openai']?.llmModels[0];
                const sttModel = PROVIDERS['openai']?.sttModels[0];
                if (llmModel) await this.setSelectedModel('llm', llmModel.id);
                if (sttModel) await this.setSelectedModel('stt', sttModel.id);
            } else {
                console.log('[ModelStateService] openai-lucide key updated, but respecting user\'s existing model selection.');
            }
        } else {
            // Lors de la déconnexion, basculer vers un autre modèle uniquement si le modèle actif est openai-lucide
            const selected = await this.getSelectedModels();
            const llmProvider = this.getProviderForModel(selected.llm, 'llm');
            const sttProvider = this.getProviderForModel(selected.stt, 'stt');

            const typesToReselect = [];
            if (llmProvider === 'openai-lucide') typesToReselect.push('llm');
            if (sttProvider === 'openai-lucide') typesToReselect.push('stt');

            if (typesToReselect.length > 0) {
                console.log('[ModelStateService] Logged out, re-selecting models for:', typesToReselect.join(', '));
                await this._autoSelectAvailableModels(typesToReselect);
            }
        }
    }

    async setApiKey(provider, key) {
        console.log(`[ModelStateService] setApiKey for ${provider}`);
        if (!provider) {
            throw new Error('Provider is required');
        }

        // 'openai' utilise sa propre clé d'authentification, donc on saute la validation
        if (provider !== 'openai') {
            const validationResult = await this.validateApiKey(provider, key);
            if (!validationResult.success) {
                console.warn(`[ModelStateService] API key validation failed for ${provider}: ${validationResult.error}`);
                return validationResult;
            }
        }

        const finalKey = (provider === 'ollama' || provider === 'whisper') ? 'local' : key;
        const existingSettings = await providerSettingsRepository.getByProvider(provider) || {};
        await providerSettingsRepository.upsert(provider, { ...existingSettings, api_key: finalKey });
        
        // PHASE 3: Clear validation cache when API key changes
        this.clearValidationCache();
        
        // La clé a été ajoutée/modifiée, vérifier si on peut auto-sélectionner un modèle pour ce provider
        await this._autoSelectAvailableModels([]);
        
        this.emit('state-updated', await this.getLiveState());
        this.emit('settings-updated');
        return { success: true };
    }

    async getApiKey(provider) {
        const settings = await providerSettingsRepository.getByProvider(provider);
        if (!settings || !settings.api_key) {
            return null;
        }
        return settings.api_key;
    }

    async getAllApiKeys() {
        const allSettings = await providerSettingsRepository.getAll();
        const apiKeys = {};
        allSettings.forEach(s => {
            if (s.provider !== 'openai') {
                apiKeys[s.provider] = s.api_key;
            }
        });
        return apiKeys;
    }

    async removeApiKey(provider) {
        const setting = await providerSettingsRepository.getByProvider(provider);
        if (setting && setting.api_key) {
            await providerSettingsRepository.upsert(provider, { ...setting, api_key: null });
            
            // PHASE 3: Clear validation cache when API key is removed
            this.clearValidationCache();
            
            await this._autoSelectAvailableModels(['llm', 'stt']);
            this.emit('state-updated', await this.getLiveState());
            this.emit('settings-updated');
            return true;
        }
        return false;
    }

    /**
     * Vérifie si l'utilisateur est connecté à Firebase.
     */
    isLoggedInWithFirebase() {
        return this.authService.getCurrentUser().isLoggedIn;
    }

    /**
     * Vérifie si au moins une clé API valide est configurée.
     */
    async hasValidApiKey() {
        if (this.isLoggedInWithFirebase()) return true;
        
        const allSettings = await providerSettingsRepository.getAll();
        return allSettings.some(s => s.api_key && s.api_key.trim().length > 0);
    }

    getProviderForModel(arg1, arg2) {
        // Compatibility: support both (type, modelId) old order and (modelId, type) new order
        let type, modelId;
        if (arg1 === 'llm' || arg1 === 'stt') {
            type = arg1;
            modelId = arg2;
        } else {
            modelId = arg1;
            type = arg2;
        }
        if (!modelId || !type) return null;
        for (const providerId in PROVIDERS) {
            const models = type === 'llm' ? PROVIDERS[providerId].llmModels : PROVIDERS[providerId].sttModels;
            if (models && models.some(m => m.id === modelId)) {
                return providerId;
            }
        }
        if (type === 'llm') {
            const installedModels = ollamaModelRepository.getInstalledModels();
            if (installedModels.some(m => m.name === modelId)) return 'ollama';
        }
        return null;
    }

    async getSelectedModels() {
        const active = await providerSettingsRepository.getActiveSettings();
        return {
            llm: active.llm?.selected_llm_model || null,
            stt: active.stt?.selected_stt_model || null,
        };
    }
    
    async setSelectedModel(type, modelId) {
        const provider = this.getProviderForModel(modelId, type);
        if (!provider) {
            console.warn(`[ModelStateService] No provider found for model ${modelId}`);
            return false;
        }

        // Fix CRITICAL BUG #4: Wrap multi-step database operations in a transaction
        // This ensures atomicity: both upsert and setActiveProvider succeed or both fail
        const sqliteClient = require('./sqliteClient');
        const sqliteRepo = require('../repositories/providerSettings/sqlite.repository');
        const db = sqliteClient.getDb();

        try {
            // Use better-sqlite3 transaction for atomicity
            const transaction = db.transaction(() => {
                const existingSettings = sqliteRepo.getByProvider(provider) || {};
                const newSettings = { ...existingSettings };

                if (type === 'llm') {
                    newSettings.selected_llm_model = modelId;
                } else {
                    newSettings.selected_stt_model = modelId;
                }

                // Both operations must succeed for the transaction to commit
                sqliteRepo.upsert(provider, newSettings);
                sqliteRepo.setActiveProvider(provider, type);
            });

            // Execute the transaction atomically
            transaction();

            console.log(`[ModelStateService] Selected ${type} model: ${modelId} (provider: ${provider})`);

            if (type === 'llm' && provider === 'ollama') {
                require('./localAIManager').warmUpModel(modelId).catch(err => console.warn(err));
            }

            this.emit('state-updated', await this.getLiveState());
            this.emit('settings-updated');
            return true;
        } catch (error) {
            console.error(`[ModelStateService] Transaction failed for setSelectedModel(${type}, ${modelId}):`, error);
            // Transaction automatically rolled back on error
            return false;
        }
    }

    async getAvailableModels(type) {
        const allSettings = await providerSettingsRepository.getAll();
        const available = [];
        const modelListKey = type === 'llm' ? 'llmModels' : 'sttModels';

        for (const setting of allSettings) {
            if (!setting.api_key) continue;

            const providerId = setting.provider;
            if (providerId === 'ollama' && type === 'llm') {
                const installed = ollamaModelRepository.getInstalledModels();
                available.push(...installed.map(m => ({ id: m.name, name: m.name })));
            } else if (PROVIDERS[providerId]?.[modelListKey]) {
                available.push(...PROVIDERS[providerId][modelListKey]);
            }
        }
        return [...new Map(available.map(item => [item.id, item])).values()];
    }

    async getCurrentModelInfo(type) {
        const activeSetting = await providerSettingsRepository.getActiveProvider(type);
        if (!activeSetting) return null;
        
        const model = type === 'llm' ? activeSetting.selected_llm_model : activeSetting.selected_stt_model;
        if (!model) return null;

        return {
            provider: activeSetting.provider,
            model: model,
            apiKey: activeSetting.api_key,
        };
    }

    // --- Méthodes de gestion et utilitaires ---

    async validateApiKey(provider, key) {
        if (!key || (key.trim() === '' && provider !== 'ollama' && provider !== 'whisper')) {
            return { success: false, error: 'API key cannot be empty.' };
        }
        const ProviderClass = getProviderClass(provider);
        if (!ProviderClass || typeof ProviderClass.validateApiKey !== 'function') {
            return { success: true };
        }
        try {
            return await ProviderClass.validateApiKey(key);
        } catch (error) {
            return { success: false, error: 'An unexpected error occurred during validation.' };
        }
    }

    getProviderConfig() {
        const config = {};
        for (const key in PROVIDERS) {
            const { handler, ...rest } = PROVIDERS[key];
            config[key] = rest;
        }
        return config;
    }
    
    async handleRemoveApiKey(provider) {
        const success = await this.removeApiKey(provider);
        if (success) {
            const selectedModels = await this.getSelectedModels();
            if (!selectedModels.llm && !selectedModels.stt) {
                this.emit('force-show-apikey-header');
            }
        }
        return success;
    }

    /*-------------- Compatibility Helpers --------------*/
    async handleValidateKey(provider, key) {
        return await this.setApiKey(provider, key);
    }

    async handleSetSelectedModel(type, modelId) {
        return await this.setSelectedModel(type, modelId);
    }

    async areProvidersConfigured() {
        if (this.isLoggedInWithFirebase()) return true;
        const allSettings = await providerSettingsRepository.getAll();
        const apiKeyMap = {};
        allSettings.forEach(s => apiKeyMap[s.provider] = s.api_key);
        // LLM
        const hasLlmKey = Object.entries(apiKeyMap).some(([provider, key]) => {
            if (!key) return false;
            if (provider === 'whisper') return false; // whisper n'a pas de LLM
            return PROVIDERS[provider]?.llmModels?.length > 0;
        });
        // STT
        const hasSttKey = Object.entries(apiKeyMap).some(([provider, key]) => {
            if (!key) return false;
            if (provider === 'ollama') return false; // ollama n'a pas de STT
            return PROVIDERS[provider]?.sttModels?.length > 0 || provider === 'whisper';
        });
        return hasLlmKey && hasSttKey;
    }

    /**
     * Cleanup resources (close Electron Store)
     * Should be called before app shutdown
     */
    cleanup() {
        console.log('[ModelStateService] Cleaning up resources...');

        // Fix CRITICAL BUG #5: Memory leak - Remove localAI event listener to prevent memory leak
        if (this.localAIStateChangeHandler) {
            try {
                const localAIManager = require('./localAIManager');
                localAIManager.removeListener('state-changed', this.localAIStateChangeHandler);
                this.localAIStateChangeHandler = null;
                console.log('[ModelStateService] LocalAI state change listener removed');
            } catch (error) {
                console.error('[ModelStateService] Error removing localAI listener:', error);
            }
        }

        // Note: electron-store doesn't have an explicit close() method
        // but we can clear our reference to allow garbage collection
        if (this.store) {
            // Force any pending writes to complete
            try {
                // electron-store automatically saves, but we can ensure it's done
                this.store = null;
                console.log('[ModelStateService] Store reference cleared');
            } catch (error) {
                console.error('[ModelStateService] Error during cleanup:', error);
            }
        }
    }
}

const modelStateService = new ModelStateService();
module.exports = modelStateService;