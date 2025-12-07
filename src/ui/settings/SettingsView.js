import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class SettingsView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 240px;
            height: 100%;
            color: white;
        }

        .settings-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: var(--color-gray-800);
            border-radius: var(--radius-lg);
            outline: 0.5px var(--color-white-20) solid;
            outline-offset: -1px;
            box-sizing: border-box;
            position: relative;
            overflow-y: auto;
            padding: 12px 12px;
            z-index: 1000;
        }

        .settings-container::-webkit-scrollbar {
            width: var(--scrollbar-width);
        }

        .settings-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .settings-container::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 4px;
        }

        .settings-container::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .settings-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: var(--color-black-15);
            box-shadow: var(--shadow-lg);
            border-radius: var(--radius-lg);
            filter: blur(10px);
            z-index: -1;
        }
            
        .settings-button[disabled],
        .api-key-section input[disabled] {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
        }

        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--color-white-10);
            position: relative;
            z-index: 1;
        }

        .title-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .app-title {
            font-size: 13px;
            font-weight: 500;
            color: white;
            margin: 0 0 4px 0;
        }

        .account-info {
            font-size: 11px;
            color: var(--color-white-70);
            margin: 0;
        }

        .invisibility-icon {
            padding-top: 2px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .invisibility-icon.visible {
            opacity: 1;
        }

        .invisibility-icon svg {
            width: 16px;
            height: 16px;
        }

        .shortcuts-section {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 4px 0;
            position: relative;
            z-index: 1;
        }

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            color: white;
            font-size: 11px;
        }

        .shortcut-name {
            font-weight: 300;
        }

        .shortcut-keys {
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .cmd-key, .shortcut-key {
            background: var(--color-white-10);
            border-radius: 4px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 500;
            color: var(--color-white-90);
        }

        /* Buttons Section */
        .buttons-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-top: 6px;
            border-top: 1px solid var(--color-white-10);
            position: relative;
            z-index: 1;
            flex: 1;
        }

        .settings-button {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            color: white;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        }

        .settings-button:hover {
            background: var(--color-white-15);
            border-color: var(--scrollbar-thumb-hover);
        }

        .settings-button:active {
            transform: translateY(1px);
        }

        .settings-button.full-width {
            width: 100%;
        }

        .settings-button.half-width {
            flex: 1;
        }

        .settings-button.danger {
            background: color-mix(in srgb, var(--color-error-500) 10%, transparent);
            border-color: color-mix(in srgb, var(--color-error-500) 30%, transparent);
            color: color-mix(in srgb, var(--color-error-500) 90%, transparent);
        }

        .settings-button.danger:hover {
            background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
            border-color: color-mix(in srgb, var(--color-error-500) 40%, transparent);
        }

        .move-buttons, .bottom-buttons {
            display: flex;
            gap: 4px;
        }

        .api-key-section {
            padding: 6px 0;
            border-top: 1px solid var(--color-white-10);
        }

        .api-key-section input {
            width: 100%;
            background: var(--color-black-20);
            border: 1px solid var(--color-white-20);
            color: white;
            border-radius: 4px;
            padding: 4px;
            font-size: 11px;
            margin-bottom: 4px;
            box-sizing: border-box;
        }

        .api-key-section input::placeholder {
            color: var(--color-white-40);
        }

        /* Preset Management Section */
        .preset-section {
            padding: 6px 0;
            border-top: 1px solid var(--color-white-10);
        }

        .preset-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .preset-title {
            font-size: 11px;
            font-weight: 500;
            color: white;
        }

        .preset-count {
            font-size: 9px;
            color: var(--color-white-50);
            margin-left: 4px;
        }

        .preset-toggle {
            font-size: 10px;
            color: var(--color-white-60);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 2px;
            transition: background-color 0.15s ease;
        }

        .preset-toggle:hover {
            background: var(--color-white-10);
        }

        .preset-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            max-height: 120px;
            overflow-y: auto;
        }

        .preset-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 6px;
            background: var(--scrollbar-track);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 11px;
            border: 1px solid transparent;
        }

        .preset-item:hover {
            background: var(--color-white-10);
            border-color: var(--color-white-10);
        }

        .preset-item.selected {
            background: rgba(0, 122, 255, 0.25);
            border-color: rgba(0, 122, 255, 0.6);
            box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.3);
        }

        .preset-name {
            color: white;
            flex: 1;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            font-weight: 300;
        }

        .preset-item.selected .preset-name {
            font-weight: 500;
        }

        .preset-status {
            font-size: 9px;
            color: rgba(0, 122, 255, 0.8);
            font-weight: 500;
            margin-left: 6px;
        }

        .no-presets-message {
            padding: 12px 8px;
            text-align: center;
            color: var(--color-white-50);
            font-size: 10px;
            line-height: 1.4;
        }

        .no-presets-message .web-link {
            color: rgba(0, 122, 255, 0.8);
            text-decoration: underline;
            cursor: pointer;
        }

        .no-presets-message .web-link:hover {
            color: rgba(0, 122, 255, 1);
        }

        .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: var(--color-white-70);
            font-size: 11px;
        }

        .loading-spinner {
            width: 12px;
            height: 12px;
            border: 1px solid var(--color-white-20);
            border-top: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 6px;
        }

        .hidden {
            display: none;
        }

        .api-key-section, .model-selection-section {
            padding: 8px 0;
            border-top: 1px solid var(--color-white-10);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .provider-key-group, .model-select-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        label {
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.8);
            margin-left: 2px;
        }
        label > strong {
            color: white;
            font-weight: 600;
        }
        .provider-key-group input {
            width: 100%; background: var(--color-black-20); border: 1px solid var(--color-white-20);
            color: white; border-radius: 4px; padding: 5px 8px; font-size: 11px; box-sizing: border-box;
        }
        .key-buttons { display: flex; gap: 4px; }
        .key-buttons .settings-button { flex: 1; padding: 4px; }
        .model-list {
            display: flex; flex-direction: column; gap: 2px; max-height: 120px;
            overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 4px;
            padding: 4px; margin-top: 4px;
        }
        .model-item { 
            padding: 5px 8px; 
            font-size: 11px; 
            border-radius: 4px; 
            cursor: pointer; 
            transition: background-color 0.15s; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .model-item:hover { background-color: rgba(255,255,255,0.1); }
        .model-item.selected { background-color: rgba(0, 122, 255, 0.4); font-weight: 500; }
        .model-status { 
            font-size: 9px; 
            color: rgba(255,255,255,0.6); 
            margin-left: 8px; 
        }
        .model-status.installed { color: rgba(0, 255, 0, 0.8); }
        .model-status.not-installed { color: rgba(255, 200, 0, 0.8); }
        .install-progress {
            flex: 1;
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            margin-left: 8px;
            overflow: hidden;
        }
        .install-progress-bar {
            height: 100%;
            background: rgba(0, 122, 255, 0.8);
            transition: width 0.3s ease;
        }
        
        /* Dropdown styles */
        select.model-dropdown {
            background: var(--color-black-20);
            color: white;
            cursor: pointer;
        }
        
        select.model-dropdown option {
            background: #1a1a1a;
            color: white;
        }
        
        select.model-dropdown option:disabled {
            color: rgba(255,255,255,0.4);
        }
            
        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            will-change: auto !important;
        }

        :host-context(body.has-glass) * {
            background: transparent !important;
            filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            outline: none !important;
            border: none !important;
            border-radius: 0 !important;
            transition: none !important;
            animation: none !important;
        }

        :host-context(body.has-glass) .settings-container::before {
            display: none !important;
        }

        /* ────────────────[ PHASE 4 SECTIONS ]─────────────── */
        .agent-profile-section,
        .knowledge-base-section,
        .license-section,
        .sync-section,
        .enterprise-section {
            margin-top: 12px;
            padding: 12px;
            background: var(--color-gray-700, rgba(50, 50, 50, 0.5));
            border-radius: var(--radius-md, 8px);
            border: 1px solid var(--color-white-10, rgba(255, 255, 255, 0.1));
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 500;
            color: var(--color-white-80, rgba(255, 255, 255, 0.8));
        }

        .kb-status,
        .license-status,
        .sync-status,
        .enterprise-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: var(--radius-sm, 4px);
            font-size: 10px;
            font-weight: 500;
        }

        .kb-status.active,
        .license-status.active,
        .sync-status.active,
        .enterprise-status.connected {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .kb-status.inactive,
        .license-status.inactive,
        .sync-status.inactive,
        .enterprise-status.disconnected {
            background: rgba(156, 163, 175, 0.2);
            color: #9ca3af;
        }

        .profile-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 8px;
        }

        .profile-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            background: var(--color-gray-600, rgba(60, 60, 60, 0.5));
            border-radius: var(--radius-sm, 4px);
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .profile-item:hover {
            background: var(--color-gray-500, rgba(70, 70, 70, 0.5));
        }

        .profile-item.active {
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .profile-item .profile-name {
            font-size: 11px;
            color: var(--color-white-90, rgba(255, 255, 255, 0.9));
        }

        .profile-item .profile-description {
            font-size: 9px;
            color: var(--color-white-50, rgba(255, 255, 255, 0.5));
            margin-top: 2px;
        }
    `;


    //////// after_modelStateService ////////
    static properties = {
        shortcuts: { type: Object, state: true },
        firebaseUser: { type: Object, state: true },
        isLoading: { type: Boolean, state: true },
        isContentProtectionOn: { type: Boolean, state: true },
        isScreenshotEnabled: { type: Boolean, state: true },
        saving: { type: Boolean, state: true },
        providerConfig: { type: Object, state: true },
        apiKeys: { type: Object, state: true },
        availableLlmModels: { type: Array, state: true },
        availableSttModels: { type: Array, state: true },
        selectedLlm: { type: String, state: true },
        selectedStt: { type: String, state: true },
        isLlmListVisible: { type: Boolean },
        isSttListVisible: { type: Boolean },
        presets: { type: Array, state: true },
        selectedPreset: { type: Object, state: true },
        showPresets: { type: Boolean, state: true },
        autoUpdateEnabled: { type: Boolean, state: true },
        autoUpdateLoading: { type: Boolean, state: true },
        // Ollama related properties
        ollamaStatus: { type: Object, state: true },
        ollamaModels: { type: Array, state: true },
        installingModels: { type: Object, state: true },
        // Whisper related properties
        whisperModels: { type: Array, state: true },
        // Agent profile properties
        availableProfiles: { type: Array, state: true },
        activeProfile: { type: String, state: true },
        // Knowledge base properties
        knowledgeBaseStatus: { type: String, state: true },
        knowledgeBaseName: { type: String, state: true },
        documentCount: { type: Number, state: true },
        knowledgeBaseLoading: { type: Boolean, state: true },
        // Phase 1 - Meeting Assistant: Listen session state
        currentSessionId: { type: String, state: true },
        hasEndedSession: { type: Boolean, state: true },
        // Phase 4 - License Management
        licenseInfo: { type: Object, state: true },
        licenseLoading: { type: Boolean, state: true },
        licenseKeyInput: { type: String, state: true },
        // Phase 4 - Cloud Sync
        syncStatus: { type: Object, state: true },
        syncLoading: { type: Boolean, state: true },
        // Phase 4 - Enterprise Gateway
        enterpriseStatus: { type: Object, state: true },
        enterpriseLoading: { type: Boolean, state: true },
        enterpriseDatabases: { type: Array, state: true },
    };
    //////// after_modelStateService ////////

    constructor() {
        super();
        //////// after_modelStateService ////////
        this.shortcuts = {};
        this.firebaseUser = null;
        this.apiKeys = { openai: '', gemini: '', anthropic: '', whisper: '' };
        this.providerConfig = {};
        this.isLoading = true;
        this.isContentProtectionOn = true;
        this.isScreenshotEnabled = false;
        this.saving = false;
        this.availableLlmModels = [];
        this.availableSttModels = [];
        this.selectedLlm = null;
        this.selectedStt = null;
        this.isLlmListVisible = false;
        this.isSttListVisible = false;
        this.presets = [];
        this.selectedPreset = null;
        this.showPresets = false;
        // Ollama related
        this.ollamaStatus = { installed: false, running: false };
        this.ollamaModels = [];
        this.installingModels = {}; // { modelName: progress }
        // Whisper related
        this.whisperModels = [];
        this.whisperProgressTracker = null; // Will be initialized when needed
        this.handleUseLucideKey = this.handleUseLucideKey.bind(this)
        this.autoUpdateEnabled = true;
        this.autoUpdateLoading = true;
        // Agent profiles
        this.availableProfiles = [];
        this.activeProfile = 'lucide_assistant';
        // Knowledge base
        this.knowledgeBaseStatus = 'inactive'; // 'inactive' | 'active' | 'syncing'
        this.knowledgeBaseName = '';
        this.documentCount = 0;
        this.knowledgeBaseLoading = false;
        // Phase 1 - Meeting Assistant: Session state
        this.currentSessionId = null;
        this.hasEndedSession = false;
        // Phase 4 - License Management
        this.licenseInfo = { tier: 'STARTER', isValid: false, features: {} };
        this.licenseLoading = false;
        this.licenseKeyInput = '';
        // Phase 4 - Cloud Sync
        this.syncStatus = { isEnabled: false, isSyncing: false, isOnline: false };
        this.syncLoading = false;
        // Phase 4 - Enterprise Gateway
        this.enterpriseStatus = { connected: false };
        this.enterpriseLoading = false;
        this.enterpriseDatabases = [];
        this.loadInitialData();
        //////// after_modelStateService ////////
    }

    async loadAutoUpdateSetting() {
        if (!window.api) return;
        this.autoUpdateLoading = true;
        try {
            const enabled = await window.api.settingsView.getAutoUpdate();
            this.autoUpdateEnabled = enabled;
            console.log('Auto-update setting loaded:', enabled);
        } catch (e) {
            console.error('Error loading auto-update setting:', e);
            this.autoUpdateEnabled = true; // fallback
        }
        this.autoUpdateLoading = false;
        this.requestUpdate();
    }

    async handleToggleAutoUpdate() {
        if (!window.api || this.autoUpdateLoading) return;
        this.autoUpdateLoading = true;
        this.requestUpdate();
        try {
            const newValue = !this.autoUpdateEnabled;
            const result = await window.api.settingsView.setAutoUpdate(newValue);
            if (result && result.success) {
                this.autoUpdateEnabled = newValue;
            } else {
                console.error('Failed to update auto-update setting');
            }
        } catch (e) {
            console.error('Error toggling auto-update:', e);
        }
        this.autoUpdateLoading = false;
        this.requestUpdate();
    }

    async loadLocalAIStatus() {
        try {
            // Load Ollama status
            const ollamaStatus = await window.api.settingsView.getOllamaStatus();
            if (ollamaStatus?.success) {
                this.ollamaStatus = { installed: ollamaStatus.installed, running: ollamaStatus.running };
                this.ollamaModels = ollamaStatus.models || [];
            }
            
            // Load Whisper models status only if Whisper is enabled
            if (this.apiKeys?.whisper === 'local') {
                const whisperModelsResult = await window.api.settingsView.getWhisperInstalledModels();
                if (whisperModelsResult?.success) {
                    const installedWhisperModels = whisperModelsResult.models;
                    if (this.providerConfig?.whisper) {
                        this.providerConfig.whisper.sttModels.forEach(m => {
                            const installedInfo = installedWhisperModels.find(i => i.id === m.id);
                            if (installedInfo) {
                                m.installed = installedInfo.installed;
                            }
                        });
                    }
                }
            }
            
            // Trigger UI update
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading LocalAI status:', error);
        }
    }

    //////// after_modelStateService ////////
    async loadInitialData() {
        if (!window.api) return;
        this.isLoading = true;
        try {
            // Load essential data first
            const [userState, modelSettings, presets, contentProtection, screenshotEnabled, shortcuts, availableProfiles, activeProfile, knowledgeBaseStatus] = await Promise.all([
                window.api.settingsView.getCurrentUser(),
                window.api.settingsView.getModelSettings(), // Facade call
                window.api.settingsView.getPresets(),
                window.api.settingsView.getContentProtectionStatus(),
                window.api.settingsView.getScreenshotEnabled(),
                window.api.settingsView.getCurrentShortcuts(),
                window.api.settingsView.getAvailableProfiles(),
                window.api.settingsView.getActiveProfile(),
                window.api.settingsView.getKnowledgeBaseStatus().catch(() => ({ status: 'inactive', name: '', documentCount: 0 }))
            ]);
            
            if (userState && userState.isLoggedIn) this.firebaseUser = userState;
            
            if (modelSettings.success) {
                const { config, storedKeys, availableLlm, availableStt, selectedModels } = modelSettings.data;
                this.providerConfig = config;
                this.apiKeys = storedKeys;
                this.availableLlmModels = availableLlm;
                this.availableSttModels = availableStt;
                this.selectedLlm = selectedModels.llm;
                this.selectedStt = selectedModels.stt;
            }

            this.presets = presets || [];
            this.isContentProtectionOn = contentProtection;
            this.isScreenshotEnabled = screenshotEnabled;
            this.shortcuts = shortcuts || {};
            this.availableProfiles = availableProfiles || [];
            this.activeProfile = activeProfile || 'lucide_assistant';

            // Knowledge base status
            if (knowledgeBaseStatus) {
                this.knowledgeBaseStatus = knowledgeBaseStatus.status || 'inactive';
                this.knowledgeBaseName = knowledgeBaseStatus.name || '';
                this.documentCount = knowledgeBaseStatus.documentCount || 0;
            }

            // Phase 4: Load License, Sync, and Enterprise status (non-blocking)
            this.loadPhase4Data();

            if (this.presets.length > 0) {
                const firstUserPreset = this.presets.find(p => p.is_default === 0);
                if (firstUserPreset) this.selectedPreset = firstUserPreset;
            }

            // Load LocalAI status asynchronously to improve initial load time
            this.loadLocalAIStatus();
        } catch (error) {
            console.error('Error loading initial settings data:', error);
        } finally {
            this.isLoading = false;
        }
    }


    async handleSaveKey(provider) {
        const input = this.shadowRoot.querySelector(`#key-input-${provider}`);
        if (!input) return;
        const key = input.value;
        
        // For Ollama, we need to ensure it's ready first
        if (provider === 'ollama') {
        this.saving = true;
            
            // First ensure Ollama is installed and running
            const ensureResult = await window.api.settingsView.ensureOllamaReady();
            if (!ensureResult.success) {
                window.showToast?.(`Échec de configuration Ollama : ${ensureResult.error}`, 'error');
                this.saving = false;
                return;
            }
            
            // Now validate (which will check if service is running)
            const result = await window.api.settingsView.validateKey({ provider, key: 'local' });
            
            if (result.success) {
                await this.refreshModelData();
                await this.refreshOllamaStatus();
                window.showToast?.('Ollama connecté avec succès', 'success');
            } else {
                window.showToast?.(`Échec de connexion à Ollama : ${result.error}`, 'error');
            }
            this.saving = false;
            return;
        }

        // For Whisper, just enable it
        if (provider === 'whisper') {
            this.saving = true;
            const result = await window.api.settingsView.validateKey({ provider, key: 'local' });

            if (result.success) {
                await this.refreshModelData();
                window.showToast?.('Whisper activé avec succès', 'success');
            } else {
                window.showToast?.(`Échec d'activation de Whisper : ${result.error}`, 'error');
            }
            this.saving = false;
            return;
        }

        // For other providers, use the normal flow
        this.saving = true;
        const result = await window.api.settingsView.validateKey({ provider, key });

        if (result.success) {
            await this.refreshModelData();
            window.showToast?.(`Clé API ${provider} enregistrée avec succès`, 'success');
        } else {
            window.showToast?.(`Échec de l'enregistrement de la clé ${provider} : ${result.error}`, 'error');
            input.value = this.apiKeys[provider] || '';
        }
        this.saving = false;
    }
    
    async handleClearKey(provider) {
        console.log(`[SettingsView] handleClearKey: ${provider}`);
        this.saving = true;
        await window.api.settingsView.removeApiKey(provider);
        this.apiKeys = { ...this.apiKeys, [provider]: '' };
        await this.refreshModelData();
        this.saving = false;
    }

    async refreshModelData() {
        const [availableLlm, availableStt, selected, storedKeys] = await Promise.all([
            window.api.settingsView.getAvailableModels({ type: 'llm' }),
            window.api.settingsView.getAvailableModels({ type: 'stt' }),
            window.api.settingsView.getSelectedModels(),
            window.api.settingsView.getAllKeys()
        ]);
        this.availableLlmModels = availableLlm;
        this.availableSttModels = availableStt;
        this.selectedLlm = selected.llm;
        this.selectedStt = selected.stt;
        this.apiKeys = storedKeys;
        this.requestUpdate();
    }
    
    async toggleModelList(type) {
        const visibilityProp = type === 'llm' ? 'isLlmListVisible' : 'isSttListVisible';

        if (!this[visibilityProp]) {
            this.saving = true;
            this.requestUpdate();
            
            await this.refreshModelData();

            this.saving = false;
        }

        // Après actualisation des données, basculer l'état d'affichage de la liste
        this[visibilityProp] = !this[visibilityProp];
        this.requestUpdate();
    }
    
    async selectModel(type, modelId) {
        // Check if this is an Ollama model that needs to be installed
        const provider = this.getProviderForModel(type, modelId);
        if (provider === 'ollama') {
            const ollamaModel = this.ollamaModels.find(m => m.name === modelId);
            if (ollamaModel && !ollamaModel.installed && !ollamaModel.installing) {
                // Need to install the model first
                await this.installOllamaModel(modelId);
                return;
            }
        }
        
        // Check if this is a Whisper model that needs to be downloaded
        if (provider === 'whisper' && type === 'stt') {
            const isInstalling = this.installingModels[modelId] !== undefined;
            const whisperModelInfo = this.providerConfig.whisper.sttModels.find(m => m.id === modelId);
            
            if (whisperModelInfo && !whisperModelInfo.installed && !isInstalling) {
                await this.downloadWhisperModel(modelId);
                return;
            }
        }
        
        this.saving = true;
        await window.api.settingsView.setSelectedModel({ type, modelId });
        if (type === 'llm') this.selectedLlm = modelId;
        if (type === 'stt') this.selectedStt = modelId;
        this.isLlmListVisible = false;
        this.isSttListVisible = false;
        this.saving = false;
        this.requestUpdate();
    }
    
    async refreshOllamaStatus() {
        const ollamaStatus = await window.api.settingsView.getOllamaStatus();
        if (ollamaStatus?.success) {
            this.ollamaStatus = { installed: ollamaStatus.installed, running: ollamaStatus.running };
            this.ollamaModels = ollamaStatus.models || [];
        }
    }
    
    async installOllamaModel(modelName) {
        try {
            // Démarrer le téléchargement du modèle Ollama
            this.installingModels = { ...this.installingModels, [modelName]: 0 };
            this.requestUpdate();

            // Configuration de l'écouteur d'événements de progression - Utilisation des événements LocalAI unifiés
            const progressHandler = (event, data) => {
                if (data.service === 'ollama' && data.model === modelName) {
                    this.installingModels = { ...this.installingModels, [modelName]: data.progress || 0 };
                    this.requestUpdate();
                }
            };

            // Enregistrer l'écouteur d'événements LocalAI unifié
            window.api.settingsView.onLocalAIInstallProgress(progressHandler);

            try {
                const result = await window.api.settingsView.pullOllamaModel(modelName);
                
                if (result.success) {
                    console.log(`[SettingsView] Model ${modelName} installed successfully`);
                    delete this.installingModels[modelName];
                    this.requestUpdate();
                    
                    // Actualiser l'état
                    await this.refreshOllamaStatus();
                    await this.refreshModelData();
                } else {
                    throw new Error(result.error || 'Installation failed');
                }
            } finally {
                // Supprimer l'écouteur d'événements LocalAI unifié
                window.api.settingsView.removeOnLocalAIInstallProgress(progressHandler);
            }
        } catch (error) {
            console.error(`[SettingsView] Error installing model ${modelName}:`, error);
            delete this.installingModels[modelName];
            this.requestUpdate();
        }
    }
    
    async downloadWhisperModel(modelId) {
        // Mark as installing
        this.installingModels = { ...this.installingModels, [modelId]: 0 };
        this.requestUpdate();
        
        try {
            // Configuration de l'écouteur de progression - Utilisation des événements LocalAI unifiés
            const progressHandler = (event, data) => {
                if (data.service === 'whisper' && data.model === modelId) {
                    this.installingModels = { ...this.installingModels, [modelId]: data.progress || 0 };
                    this.requestUpdate();
                }
            };
            
            window.api.settingsView.onLocalAIInstallProgress(progressHandler);
            
            // Start download
            const result = await window.api.settingsView.downloadWhisperModel(modelId);
            
            if (result.success) {
                // Update the model's installed status
                if (this.providerConfig?.whisper?.sttModels) {
                    const modelInfo = this.providerConfig.whisper.sttModels.find(m => m.id === modelId);
                    if (modelInfo) {
                        modelInfo.installed = true;
                    }
                }
                
                // Remove from installing models
                delete this.installingModels[modelId];
                this.requestUpdate();
                
                // Reload LocalAI status to get fresh data
                await this.loadLocalAIStatus();
                
                // Auto-select the model after download
                await this.selectModel('stt', modelId);
            } else {
                // Remove from installing models on failure too
                delete this.installingModels[modelId];
                this.requestUpdate();
                window.showToast?.(`Échec du téléchargement du modèle Whisper : ${result.error}`, 'error');
            }

            // Cleanup
            window.api.settingsView.removeOnLocalAIInstallProgress(progressHandler);
        } catch (error) {
            console.error(`[SettingsView] Error downloading Whisper model ${modelId}:`, error);
            // Remove from installing models on error
            delete this.installingModels[modelId];
            this.requestUpdate();
            window.showToast?.(`Erreur lors du téléchargement de ${modelId} : ${error.message}`, 'error');
        }
    }
    
    getProviderForModel(type, modelId) {
        for (const [providerId, config] of Object.entries(this.providerConfig)) {
            const models = type === 'llm' ? config.llmModels : config.sttModels;
            if (models?.some(m => m.id === modelId)) {
                return providerId;
            }
        }
        return null;
    }


    handleUseLucideKey(e) {
        e.preventDefault()
        if (this.wasJustDragged) return

        console.log("Requesting Firebase authentication from main process...")
        window.api.settingsView.startFirebaseAuth();
    }
    //////// after_modelStateService ////////

    openShortcutEditor() {
        window.api.settingsView.openShortcutSettingsWindow();
    }

    // Phase 1 - Meeting Assistant: Open post-meeting window
    async handleOpenPostMeeting() {
        try {
            const result = await window.api.listenView.getRecentListenSession();

            if (result.success) {
                await window.api.listenView.openPostMeetingWindow(result.sessionId);
            } else {
                console.warn('[SettingsView] No listen session found for post-meeting');
                window.showToast?.('Aucune session d\'écoute trouvée. Veuillez d\'abord créer une session avec le mode écoute.', 'warning');
            }
        } catch (error) {
            console.error('[SettingsView] Error opening post-meeting window:', error);
            window.showToast?.(`Erreur lors de l'ouverture du compte-rendu : ${error.message}`, 'error');
        }
    }

    connectedCallback() {
        super.connectedCallback();
        
        this.setupEventListeners();
        this.setupIpcListeners();
        this.setupWindowResize();
        this.loadAutoUpdateSetting();
        // Force one height calculation immediately (innerHeight may be 0 at first)
        setTimeout(() => this.updateScrollHeight(), 0);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanupEventListeners();
        this.cleanupIpcListeners();
        this.cleanupWindowResize();
        
        // Cancel any ongoing Ollama installations when component is destroyed
        const installingModels = Object.keys(this.installingModels);
        if (installingModels.length > 0) {
            installingModels.forEach(modelName => {
                window.api.settingsView.cancelOllamaInstallation(modelName);
            });
        }
    }

    setupEventListeners() {
        this.addEventListener('mouseenter', this.handleMouseEnter);
        this.addEventListener('mouseleave', this.handleMouseLeave);
    }

    cleanupEventListeners() {
        this.removeEventListener('mouseenter', this.handleMouseEnter);
        this.removeEventListener('mouseleave', this.handleMouseLeave);
    }

    setupIpcListeners() {
        if (!window.api) return;
        
        this._userStateListener = (event, userState) => {
            console.log('[SettingsView] Received user-state-changed:', userState);
            if (userState && userState.isLoggedIn) {
                this.firebaseUser = userState;
            } else {
                this.firebaseUser = null;
            }
            this.loadAutoUpdateSetting();
            // Reload model settings when user state changes (Firebase login/logout)
            this.loadInitialData();
        };
        
        this._settingsUpdatedListener = (event, settings) => {
            console.log('[SettingsView] Received settings-updated');
            this.settings = settings;
            this.requestUpdate();
        };

        // Ajouter l'écouteur de mise à jour des presets
        this._presetsUpdatedListener = async (event) => {
            console.log('[SettingsView] Received presets-updated, refreshing presets');
            try {
                const presets = await window.api.settingsView.getPresets();
                this.presets = presets || [];

                // Vérifier si le preset sélectionné a été supprimé (presets utilisateur uniquement)
                const userPresets = this.presets.filter(p => p.is_default === 0);
                if (this.selectedPreset && !userPresets.find(p => p.id === this.selectedPreset.id)) {
                    this.selectedPreset = userPresets.length > 0 ? userPresets[0] : null;
                }
                
                this.requestUpdate();
            } catch (error) {
                console.error('[SettingsView] Failed to refresh presets:', error);
            }
        };
        this._shortcutListener = (event, keybinds) => {
            console.log('[SettingsView] Received updated shortcuts:', keybinds);
            this.shortcuts = keybinds;
        };
        
        window.api.settingsView.onUserStateChanged(this._userStateListener);
        window.api.settingsView.onSettingsUpdated(this._settingsUpdatedListener);
        window.api.settingsView.onPresetsUpdated(this._presetsUpdatedListener);
        window.api.settingsView.onShortcutsUpdated(this._shortcutListener);
    }

    cleanupIpcListeners() {
        if (!window.api) return;
        
        if (this._userStateListener) {
            window.api.settingsView.removeOnUserStateChanged(this._userStateListener);
        }
        if (this._settingsUpdatedListener) {
            window.api.settingsView.removeOnSettingsUpdated(this._settingsUpdatedListener);
        }
        if (this._presetsUpdatedListener) {
            window.api.settingsView.removeOnPresetsUpdated(this._presetsUpdatedListener);
        }
        if (this._shortcutListener) {
            window.api.settingsView.removeOnShortcutsUpdated(this._shortcutListener);
        }
    }

    setupWindowResize() {
        this.resizeHandler = () => {
            this.requestUpdate();
            this.updateScrollHeight();
        };
        window.addEventListener('resize', this.resizeHandler);
        
        // Initial setup
        setTimeout(() => this.updateScrollHeight(), 100);
    }

    cleanupWindowResize() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    }

    updateScrollHeight() {
        // Protection contre le bug Electron où window.innerHeight peut être 0
        const rawHeight = window.innerHeight || (window.screen ? window.screen.height : 0);
        const MIN_HEIGHT = 300; // Hauteur minimale garantie
        const maxHeight = Math.max(MIN_HEIGHT, rawHeight);

        this.style.maxHeight = `${maxHeight}px`;

        const container = this.shadowRoot?.querySelector('.settings-container');
        if (container) {
            container.style.maxHeight = `${maxHeight}px`;
        }
    }

    handleMouseEnter = () => {
        window.api.settingsView.cancelHideSettingsWindow();
        // Recalculate height in case it was set to 0 before
        this.updateScrollHeight();
    }

    handleMouseLeave = () => {
        window.api.settingsView.hideSettingsWindow();
    }


    getMainShortcuts() {
        return [
            { name: 'Afficher / Masquer', accelerator: this.shortcuts.toggleVisibility },
            { name: 'Poser une question', accelerator: this.shortcuts.nextStep },
            { name: 'Faire défiler vers le haut', accelerator: this.shortcuts.scrollUp },
            { name: 'Faire défiler vers le bas', accelerator: this.shortcuts.scrollDown },
        ];
    }

    renderShortcutKeys(accelerator) {
        if (!accelerator) return html`N/A`;
        
    const keyMap = {
        'Cmd': '⌘', 'Command': '⌘', 'Ctrl': '⌃', 'Alt': '⌥', 'Shift': '⇧', 'Enter': '↵',
        'Up': '↑', 'Down': '↓', 'Left': '←', 'Right': '→', 'D': 'D'
    };

        // Traitement spécial pour scrollDown/scrollUp
        if (accelerator.includes('↕')) {
            const keys = accelerator.replace('↕','').split('+');
            keys.push('↕');
             return html`${keys.map(key => html`<span class="shortcut-key">${keyMap[key] || key}</span>`)}`;
        }

        const keys = accelerator.split('+');
        return html`${keys.map(key => html`<span class="shortcut-key">${keyMap[key] || key}</span>`)}`;
    }

    togglePresets() {
        this.showPresets = !this.showPresets;
    }

    async handlePresetSelect(preset) {
        this.selectedPreset = preset;
        // Here you could implement preset application logic
        console.log('Selected preset:', preset);
    }

    async handleProfileSelect(profileId) {
        if (!window.api || this.isLoading) return;
        try {
            const result = await window.api.settingsView.setActiveProfile(profileId);
            if (result && result.success) {
                this.activeProfile = profileId;
                console.log('Agent profile changed to:', profileId);
                this.requestUpdate();
            } else {
                console.error('Failed to change agent profile');
            }
        } catch (error) {
            console.error('Error changing agent profile:', error);
        }
    }

    handleMoveLeft() {
        console.log('Move Left clicked');
        window.api.settingsView.moveWindowStep('left');
    }

    handleMoveRight() {
        console.log('Move Right clicked');
        window.api.settingsView.moveWindowStep('right');
    }

    async handlePersonalize() {
        console.log('Personalize clicked');
        try {
            await window.api.settingsView.openPersonalizePage();
        } catch (error) {
            console.error('Failed to open personalize page:', error);
        }
    }

    async handleToggleInvisibility() {
        console.log('Toggle Invisibility clicked');
        this.isContentProtectionOn = await window.api.settingsView.toggleContentProtection();
        this.requestUpdate();
    }

    async handleToggleScreenshot() {
        console.log('Toggle Screenshot clicked');
        this.isScreenshotEnabled = !this.isScreenshotEnabled;
        await window.api.settingsView.setScreenshotEnabled(this.isScreenshotEnabled);
        this.requestUpdate();
    }

    async handleSaveApiKey() {
        const input = this.shadowRoot.getElementById('api-key-input');
        if (!input || !input.value) return;

        const newApiKey = input.value;
        try {
            const result = await window.api.settingsView.saveApiKey(newApiKey);
            if (result.success) {
                console.log('API Key saved successfully via IPC.');
                this.apiKey = newApiKey;
                this.requestUpdate();
            } else {
                 console.error('Failed to save API Key via IPC:', result.error);
            }
        } catch(e) {
            console.error('Error invoking save-api-key IPC:', e);
        }
    }

    handleQuit() {
        console.log('Quit clicked');
        window.api.settingsView.quitApplication();
    }

    handleFirebaseLogout() {
        console.log('Firebase Logout clicked');
        window.api.settingsView.firebaseLogout();
    }

    async handleOllamaShutdown() {
        console.log('[SettingsView] Shutting down Ollama service...');

        if (!window.api) return;

        try {
            // Show loading state
            this.ollamaStatus = { ...this.ollamaStatus, running: false };
            this.requestUpdate();

            const result = await window.api.settingsView.shutdownOllama(false); // Graceful shutdown

            if (result.success) {
                console.log('[SettingsView] Ollama shut down successfully');
                // Refresh status to reflect the change
                await this.refreshOllamaStatus();
            } else {
                console.error('[SettingsView] Failed to shutdown Ollama:', result.error);
                // Restore previous state on error
                await this.refreshOllamaStatus();
            }
        } catch (error) {
            console.error('[SettingsView] Error during Ollama shutdown:', error);
            // Restore previous state on error
            await this.refreshOllamaStatus();
        }
    }

    // Knowledge Base Handlers
    async handleCreatePersonalDatabase() {
        console.log('[SettingsView] Creating personal knowledge base...');

        if (!window.api) return;

        // Allow creation in both local mode (default_user) and Firebase mode
        // No longer requires Firebase authentication
        const isLocalMode = !this.firebaseUser;
        if (isLocalMode) {
            console.log('[SettingsView] Creating knowledge base in local mode');
        }

        try {
            this.knowledgeBaseLoading = true;
            this.requestUpdate();

            const result = await window.api.settingsView.createPersonalKnowledgeBase();

            if (result.success) {
                console.log('[SettingsView] Personal knowledge base created successfully');
                this.knowledgeBaseStatus = 'active';
                this.knowledgeBaseName = result.name || (isLocalMode ? 'Base Locale' : 'Base Personnelle');
                this.documentCount = result.documentCount || 0;
                window.showToast?.(isLocalMode
                    ? 'Base de données locale créée avec succès !'
                    : 'Base de données personnelle créée avec succès !', 'success');
            } else {
                console.error('[SettingsView] Failed to create knowledge base:', result.error);
                window.showToast?.(`Échec de la création : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] Error creating knowledge base:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.knowledgeBaseLoading = false;
            this.requestUpdate();
        }
    }

    async handleConnectExternalDatabase() {
        console.log('[SettingsView] Connecting to external database...');

        if (!window.api) return;

        try {
            this.knowledgeBaseLoading = true;
            this.requestUpdate();

            const result = await window.api.settingsView.connectExternalKnowledgeBase();

            if (result.success) {
                console.log('[SettingsView] Connected to external database successfully');
                this.knowledgeBaseStatus = 'active';
                this.knowledgeBaseName = result.name || 'Base Externe';
                this.documentCount = result.documentCount || 0;
                window.showToast?.('Connexion à la base externe réussie !', 'success');
            } else if (!result.cancelled) {
                console.error('[SettingsView] Failed to connect to external database:', result.error);
                window.showToast?.(`Échec de la connexion : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] Error connecting to external database:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.knowledgeBaseLoading = false;
            this.requestUpdate();
        }
    }

    async handleManageKnowledgeBase() {
        console.log('[SettingsView] Opening knowledge base manager...');

        if (!window.api) return;

        try {
            await window.api.settingsView.openKnowledgeBaseManager();
        } catch (error) {
            console.error('[SettingsView] Error opening knowledge base manager:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4: License, Sync & Enterprise Methods
    // ═══════════════════════════════════════════════════════════════════════

    async loadPhase4Data() {
        try {
            // Load in parallel without blocking UI
            const [licenseResult, syncResult, enterpriseResult] = await Promise.all([
                window.api.license?.getInfo().catch(() => null),
                window.api.sync?.getStatus().catch(() => null),
                window.api.enterprise?.getStatus().catch(() => null)
            ]);

            if (licenseResult?.success) {
                this.licenseInfo = licenseResult.license;
            }

            if (syncResult?.success) {
                this.syncStatus = syncResult.status;
            }

            if (enterpriseResult?.success) {
                this.enterpriseStatus = enterpriseResult.status;
                this.enterpriseDatabases = enterpriseResult.databases || [];
            }

            this.requestUpdate();
        } catch (error) {
            console.error('[SettingsView] Error loading Phase 4 data:', error);
        }
    }

    // License Handlers
    async handleActivateLicense() {
        const licenseKey = this.licenseKeyInput.trim();

        if (!licenseKey) {
            window.showToast?.('Veuillez entrer une clé de licence.', 'warning');
            return;
        }

        // Validate license key format (alphanumeric with dashes, 16-64 chars)
        const licenseRegex = /^[A-Za-z0-9-]{16,64}$/;
        if (!licenseRegex.test(licenseKey)) {
            window.showToast?.('Format de clé de licence invalide. La clé doit contenir 16-64 caractères alphanumériques ou tirets.', 'error');
            return;
        }

        this.licenseLoading = true;
        this.requestUpdate();

        try {
            const result = await window.api.license.activate(this.licenseKeyInput.trim());

            if (result.success) {
                this.licenseInfo = result.license;
                this.licenseKeyInput = '';
                window.showToast?.(`Licence activée avec succès ! Tier: ${result.license?.tier || 'Unknown'}`, 'success');
            } else {
                window.showToast?.(`Échec de l'activation : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] License activation error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.licenseLoading = false;
            this.requestUpdate();
        }
    }

    async handleDeactivateLicense() {
        const confirmed = await window.showConfirm?.(
            'Désactiver la licence ?',
            'Voulez-vous vraiment désactiver votre licence ? Vous passerez en mode STARTER.',
            { confirmText: 'Désactiver', cancelText: 'Annuler', type: 'danger' }
        );
        if (!confirmed) return;

        this.licenseLoading = true;
        this.requestUpdate();

        try {
            const result = await window.api.license.deactivate();

            if (result.success) {
                this.licenseInfo = { tier: 'STARTER', isValid: false, features: {} };
                window.showToast?.('Licence désactivée. Mode STARTER activé.', 'info');
            } else {
                window.showToast?.(`Échec : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] License deactivation error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.licenseLoading = false;
            this.requestUpdate();
        }
    }

    async handleRefreshLicense() {
        this.licenseLoading = true;
        this.requestUpdate();

        try {
            const result = await window.api.license.refresh();
            if (result.success) {
                this.licenseInfo = result.license;
            }
        } catch (error) {
            console.error('[SettingsView] License refresh error:', error);
        } finally {
            this.licenseLoading = false;
            this.requestUpdate();
        }
    }

    // Sync Handlers
    async handleStartSync() {
        this.syncLoading = true;
        this.requestUpdate();

        try {
            const result = await window.api.sync.start();

            if (result.success) {
                this.syncStatus = { ...this.syncStatus, isEnabled: true };
                window.showToast?.('Synchronisation cloud activée', 'success');
            } else if (result.requiresUpgrade) {
                window.showToast?.('La synchronisation cloud nécessite une licence Professional ou supérieure.', 'warning');
            } else {
                window.showToast?.(`Échec : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] Sync start error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.syncLoading = false;
            this.requestUpdate();
        }
    }

    async handleStopSync() {
        this.syncLoading = true;
        this.requestUpdate();

        try {
            await window.api.sync.stop();
            this.syncStatus = { ...this.syncStatus, isEnabled: false };
            window.showToast?.('Synchronisation cloud désactivée', 'info');
        } catch (error) {
            console.error('[SettingsView] Sync stop error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.syncLoading = false;
            this.requestUpdate();
        }
    }

    async handleForceSync() {
        this.syncLoading = true;
        this.requestUpdate();

        try {
            const result = await window.api.sync.force();

            if (result.success) {
                window.showToast?.('Synchronisation terminée avec succès !', 'success');
            } else {
                window.showToast?.(`Échec : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] Force sync error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.syncLoading = false;
            this.requestUpdate();
        }
    }

    // Enterprise Handlers
    async handleConnectEnterprise() {
        const connectionString = await window.showInput?.(
            'Connexion Enterprise Gateway',
            'Entrez la chaîne de connexion fournie par votre administrateur.',
            { placeholder: 'https://gateway.entreprise.com/api/...', confirmText: 'Connecter', type: 'text' }
        );
        if (!connectionString) return;

        this.enterpriseLoading = true;
        this.requestUpdate();

        try {
            const result = await window.api.enterprise.connect(connectionString);

            if (result.success) {
                this.enterpriseStatus = { connected: true, ...result.gateway };
                this.enterpriseDatabases = result.databases || [];
                window.showToast?.('Connecté à Enterprise Gateway !', 'success');
            } else if (result.requiresUpgrade) {
                window.showToast?.('Enterprise Gateway nécessite une licence Enterprise ou supérieure.', 'warning');
            } else {
                window.showToast?.(`Échec : ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[SettingsView] Enterprise connect error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.enterpriseLoading = false;
            this.requestUpdate();
        }
    }

    async handleDisconnectEnterprise() {
        const confirmed = await window.showConfirm?.(
            'Déconnexion Enterprise',
            'Voulez-vous vraiment vous déconnecter du gateway Enterprise ?',
            { confirmText: 'Déconnecter', cancelText: 'Annuler', type: 'danger' }
        );
        if (!confirmed) return;

        this.enterpriseLoading = true;
        this.requestUpdate();

        try {
            await window.api.enterprise.disconnect();
            this.enterpriseStatus = { connected: false };
            this.enterpriseDatabases = [];
            window.showToast?.('Déconnecté du gateway Enterprise', 'info');
        } catch (error) {
            console.error('[SettingsView] Enterprise disconnect error:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error');
        } finally {
            this.enterpriseLoading = false;
            this.requestUpdate();
        }
    }

    async handleSyncKnowledgeBase() {
        console.log('[SettingsView] Syncing knowledge base...');

        if (!window.api) return;

        try {
            this.knowledgeBaseStatus = 'syncing';
            this.requestUpdate();

            const result = await window.api.settingsView.syncKnowledgeBase();

            if (result.success) {
                console.log('[SettingsView] Knowledge base synced successfully');
                this.documentCount = result.documentCount || this.documentCount;
                window.showToast?.(`Synchronisation réussie ! ${result.syncedCount || 0} documents synchronisés.`, 'success');
            } else {
                console.error('[SettingsView] Sync failed:', result.error);
                window.showToast?.(`Échec de la synchronisation : ${result.error}`, 'error');
            }

            this.knowledgeBaseStatus = 'active';
        } catch (error) {
            console.error('[SettingsView] Error syncing knowledge base:', error);
            window.showToast?.(`Erreur de synchronisation : ${error.message}`, 'error');
            this.knowledgeBaseStatus = 'active';
        } finally {
            this.requestUpdate();
        }
    }

    //////// after_modelStateService ////////
    render() {
        if (this.isLoading) {
            return html`
                <div class="settings-container">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <span>Chargement...</span>
                    </div>
                </div>
            `;
        }

        const loggedIn = !!this.firebaseUser;

        const apiKeyManagementHTML = html`
            <div class="api-key-section">
                ${Object.entries(this.providerConfig)
                    .filter(([id, config]) => !id.includes('-lucide'))
                    .map(([id, config]) => {
                        if (id === 'ollama') {
                            // Special UI for Ollama
                            return html`
                                <div class="provider-key-group">
                                    <label>${config.name} (Local)</label>
                                    ${this.ollamaStatus.installed && this.ollamaStatus.running ? html`
                                        <div style="padding: 8px; background: rgba(0,255,0,0.1); border-radius: 4px; font-size: 11px; color: rgba(0,255,0,0.8);">
                                            ✓ Ollama est actif
                                        </div>
                                        <button class="settings-button full-width danger" @click=${this.handleOllamaShutdown}>
                                            Arrêter le service Ollama
                                        </button>
                                    ` : this.ollamaStatus.installed ? html`
                                        <div style="padding: 8px; background: rgba(255,200,0,0.1); border-radius: 4px; font-size: 11px; color: rgba(255,200,0,0.8);">
                                            ⚠ Ollama installé mais non actif
                                        </div>
                                        <button class="settings-button full-width" @click=${() => this.handleSaveKey(id)}>
                                            Démarrer Ollama
                                        </button>
                                    ` : html`
                                        <div style="padding: 8px; background: rgba(255,100,100,0.1); border-radius: 4px; font-size: 11px; color: rgba(255,100,100,0.8);">
                                            ✗ Ollama non installé
                                        </div>
                                        <button class="settings-button full-width" @click=${() => this.handleSaveKey(id)}>
                                            Installer et configurer Ollama
                                        </button>
                                    `}
                                </div>
                            `;
                        }
                        
                        if (id === 'whisper') {
                            // Simplified UI for Whisper without model selection
                            return html`
                                <div class="provider-key-group">
                                    <label>${config.name} (Local STT)</label>
                                    ${this.apiKeys[id] === 'local' ? html`
                                        <div style="padding: 8px; background: rgba(0,255,0,0.1); border-radius: 4px; font-size: 11px; color: rgba(0,255,0,0.8); margin-bottom: 8px;">
                                            ✓ Whisper est activé
                                        </div>
                                        <button class="settings-button full-width danger" @click=${() => this.handleClearKey(id)}>
                                            Désactiver Whisper
                                        </button>
                                    ` : html`
                                        <button class="settings-button full-width" @click=${() => this.handleSaveKey(id)}>
                                            Activer Whisper STT
                                        </button>
                                    `}
                                </div>
                            `;
                        }
                        
                        // Regular providers
                        return html`
                        <div class="provider-key-group">
                            <label for="key-input-${id}">Clé API ${config.name}</label>
                            <input type="password" id="key-input-${id}"
                                placeholder=${loggedIn ? "Utilise la clé de Lucide" : `Entrez la clé API ${config.name}`}
                                .value=${this.apiKeys[id] || ''}
                            >
                            <div class="key-buttons">
                               <button class="settings-button" @click=${() => this.handleSaveKey(id)} >Enregistrer</button>
                               <button class="settings-button danger" @click=${() => this.handleClearKey(id)} }>Effacer</button>
                            </div>
                        </div>
                        `;
                    })}
            </div>
        `;
        
        const getModelName = (type, id) => {
            const models = type === 'llm' ? this.availableLlmModels : this.availableSttModels;
            const model = models.find(m => m.id === id);
            return model ? model.name : id;
        }

        const modelSelectionHTML = html`
            <div class="model-selection-section">
                <div class="model-select-group">
                    <label>Modèle LLM : <strong>${getModelName('llm', this.selectedLlm) || 'Non défini'}</strong></label>
                    <button class="settings-button full-width" @click=${() => this.toggleModelList('llm')} ?disabled=${this.saving || this.availableLlmModels.length === 0}>
                        Changer le modèle LLM
                    </button>
                    ${this.isLlmListVisible ? html`
                        <div class="model-list">
                            ${this.availableLlmModels.map(model => {
                                const isOllama = this.getProviderForModel('llm', model.id) === 'ollama';
                                const ollamaModel = isOllama ? this.ollamaModels.find(m => m.name === model.id) : null;
                                const isInstalling = this.installingModels[model.id] !== undefined;
                                const installProgress = this.installingModels[model.id] || 0;
                                
                                return html`
                                    <div class="model-item ${this.selectedLlm === model.id ? 'selected' : ''}" 
                                         @click=${() => this.selectModel('llm', model.id)}>
                                        <span>${model.name}</span>
                                        ${isOllama ? html`
                                            ${isInstalling ? html`
                                                <div class="install-progress">
                                                    <div class="install-progress-bar" style="width: ${installProgress}%"></div>
                                </div>
                                            ` : ollamaModel?.installed ? html`
                                                <span class="model-status installed">✓ Installé</span>
                                            ` : html`
                                                <span class="model-status not-installed">Cliquez pour installer</span>
                                            `}
                                        ` : ''}
                                    </div>
                                `;
                            })}
                        </div>
                    ` : ''}
                </div>
                <div class="model-select-group">
                    <label>Modèle STT : <strong>${getModelName('stt', this.selectedStt) || 'Non défini'}</strong></label>
                    <button class="settings-button full-width" @click=${() => this.toggleModelList('stt')} ?disabled=${this.saving || this.availableSttModels.length === 0}>
                        Changer le modèle STT
                    </button>
                    ${this.isSttListVisible ? html`
                        <div class="model-list">
                            ${this.availableSttModels.map(model => {
                                const isWhisper = this.getProviderForModel('stt', model.id) === 'whisper';
                                const whisperModel = isWhisper && this.providerConfig?.whisper?.sttModels 
                                    ? this.providerConfig.whisper.sttModels.find(m => m.id === model.id) 
                                    : null;
                                const isInstalling = this.installingModels[model.id] !== undefined;
                                const installProgress = this.installingModels[model.id] || 0;
                                
                                return html`
                                    <div class="model-item ${this.selectedStt === model.id ? 'selected' : ''}" 
                                         @click=${() => this.selectModel('stt', model.id)}>
                                        <span>${model.name}</span>
                                        ${isWhisper ? html`
                                            ${isInstalling ? html`
                                                <div class="install-progress">
                                                    <div class="install-progress-bar" style="width: ${installProgress}%"></div>
                                                </div>
                                            ` : whisperModel?.installed ? html`
                                                <span class="model-status installed">✓ Installé</span>
                                            ` : html`
                                                <span class="model-status not-installed">Non installé</span>
                                            `}
                                        ` : ''}
                                    </div>
                                `;
                            })}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return html`
            <div class="settings-container">
                <div class="header-section">
                    <div>
                        <h1 class="app-title">Lucide</h1>
                        <div class="account-info">
                            ${this.firebaseUser
                                ? html`Compte : ${this.firebaseUser.email || 'Connecté'}`
                                : `Compte : Non connecté`
                            }
                        </div>
                    </div>
                    <div class="invisibility-icon ${this.isContentProtectionOn ? 'visible' : ''}" title="Invisibility is On">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.785 7.41787C8.7 7.41787 7.79 8.19371 7.55667 9.22621C7.0025 8.98704 6.495 9.05121 6.11 9.22037C5.87083 8.18204 4.96083 7.41787 3.88167 7.41787C2.61583 7.41787 1.58333 8.46204 1.58333 9.75121C1.58333 11.0404 2.61583 12.0845 3.88167 12.0845C5.08333 12.0845 6.06333 11.1395 6.15667 9.93787C6.355 9.79787 6.87417 9.53537 7.51 9.94954C7.615 11.1454 8.58333 12.0845 9.785 12.0845C11.0508 12.0845 12.0833 11.0404 12.0833 9.75121C12.0833 8.46204 11.0508 7.41787 9.785 7.41787ZM3.88167 11.4195C2.97167 11.4195 2.2425 10.6729 2.2425 9.75121C2.2425 8.82954 2.9775 8.08287 3.88167 8.08287C4.79167 8.08287 5.52083 8.82954 5.52083 9.75121C5.52083 10.6729 4.79167 11.4195 3.88167 11.4195ZM9.785 11.4195C8.875 11.4195 8.14583 10.6729 8.14583 9.75121C8.14583 8.82954 8.875 8.08287 9.785 8.08287C10.695 8.08287 11.43 8.82954 11.43 9.75121C11.43 10.6729 10.6892 11.4195 9.785 11.4195ZM12.6667 5.95954H1V6.83454H12.6667V5.95954ZM8.8925 1.36871C8.76417 1.08287 8.4375 0.931207 8.12833 1.03037L6.83333 1.46204L5.5325 1.03037L5.50333 1.02454C5.19417 0.93704 4.8675 1.10037 4.75083 1.39787L3.33333 5.08454H10.3333L8.91 1.39787L8.8925 1.36871Z" fill="white"/>
                        </svg>
                    </div>
                </div>

                ${apiKeyManagementHTML}
                ${modelSelectionHTML}

                <!-- Agent Profile Selection Section -->
                <div class="agent-profile-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-white-10);">
                    <div class="section-header" style="font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 8px;">
                        Mode de Lucy
                    </div>
                    <div class="profile-list" style="display: flex; flex-direction: column; gap: 6px;">
                        ${this.availableProfiles.map(profile => html`
                            <div class="profile-item ${this.activeProfile === profile.id ? 'active' : ''}"
                                 @click=${() => this.handleProfileSelect(profile.id)}
                                 style="
                                     padding: 10px 12px;
                                     background: ${this.activeProfile === profile.id ? 'rgba(100, 150, 255, 0.2)' : 'var(--scrollbar-track)'};
                                     border: 1px solid ${this.activeProfile === profile.id ? 'rgba(100, 150, 255, 0.4)' : 'var(--color-white-10)'};
                                     border-radius: 8px;
                                     cursor: pointer;
                                     transition: all 0.2s;
                                 "
                                 @mouseover=${(e) => {
                                     if (this.activeProfile !== profile.id) {
                                         e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                     }
                                 }}
                                 @mouseout=${(e) => {
                                     if (this.activeProfile !== profile.id) {
                                         e.currentTarget.style.background = 'var(--scrollbar-track)';
                                     }
                                 }}>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 18px;">${profile.icon}</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 12px; font-weight: 500; color: white;">
                                            ${profile.name}
                                        </div>
                                        <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px;">
                                            ${profile.description}
                                        </div>
                                    </div>
                                    ${this.activeProfile === profile.id ? html`
                                        <span style="font-size: 12px; color: rgba(100, 200, 100, 0.9);">✓</span>
                                    ` : ''}
                                </div>
                            </div>
                        `)}
                    </div>
                </div>

                <!-- Knowledge Base Section -->
                <div class="knowledge-base-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-white-10);">
                    <div class="section-header" style="font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 8px;">
                        📚 Base de Connaissances
                    </div>

                    <!-- Status Display -->
                    <div class="kb-status" style="margin-bottom: 8px; padding: 8px; background: ${this.knowledgeBaseStatus === 'active' ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.05)'}; border-radius: 6px; font-size: 10px;">
                        ${this.knowledgeBaseStatus === 'active' ? html`
                            <div style="color: rgba(0,255,0,0.8);">
                                ✓ Base active : <strong>${this.knowledgeBaseName}</strong>
                            </div>
                            <div style="color: rgba(255,255,255,0.6); margin-top: 2px;">
                                ${this.documentCount} document${this.documentCount !== 1 ? 's' : ''}
                            </div>
                        ` : this.knowledgeBaseStatus === 'syncing' ? html`
                            <div style="color: rgba(255,200,0,0.8);">
                                ⟳ Synchronisation en cours...
                            </div>
                        ` : html`
                            <div style="color: rgba(255,255,255,0.5);">
                                Aucune base de connaissances active
                            </div>
                        `}
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <button class="settings-button full-width"
                                @click=${this.handleCreatePersonalDatabase}
                                ?disabled=${this.knowledgeBaseLoading || this.knowledgeBaseStatus === 'active'}>
                            ${this.knowledgeBaseStatus === 'active' ? '✓ Base Personnelle Créée' : '📚 Créer Base Personnelle'}
                        </button>

                        <button class="settings-button full-width"
                                @click=${this.handleConnectExternalDatabase}
                                ?disabled=${this.knowledgeBaseLoading}>
                            🔗 Connecter Base Externe
                        </button>

                        ${this.knowledgeBaseStatus === 'active' ? html`
                            <button class="settings-button full-width"
                                    @click=${this.handleSyncKnowledgeBase}
                                    ?disabled=${this.knowledgeBaseLoading || this.knowledgeBaseStatus === 'syncing'}>
                                ⟳ Synchroniser
                            </button>

                            <button class="settings-button full-width"
                                    @click=${this.handleManageKnowledgeBase}
                                    ?disabled=${this.knowledgeBaseLoading}>
                                ⚙️ Gérer les Documents
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Phase 4: License Section -->
                <div class="license-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-white-10);">
                    <div class="section-header" style="font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 8px;">
                        🔑 Licence
                    </div>

                    <div class="license-status" style="margin-bottom: 8px; padding: 8px; background: ${this.licenseInfo?.tier !== 'STARTER' ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.05)'}; border-radius: 6px; font-size: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: ${this.licenseInfo?.tier !== 'STARTER' ? 'rgba(0,255,0,0.8)' : 'rgba(255,255,255,0.6)'};">
                                Tier: <strong>${this.licenseInfo?.tier || 'STARTER'}</strong>
                            </span>
                            ${this.licenseInfo?.expiresAt ? html`
                                <span style="color: rgba(255,255,255,0.5);">
                                    Expire: ${new Date(this.licenseInfo.expiresAt).toLocaleDateString()}
                                </span>
                            ` : ''}
                        </div>
                        ${this.licenseInfo?.features ? html`
                            <div style="margin-top: 4px; color: rgba(255,255,255,0.5); font-size: 9px;">
                                ${this.licenseInfo.features.cloudSync ? '☁️ Cloud Sync ' : ''}
                                ${this.licenseInfo.features.enterpriseGateway ? '🏢 Enterprise ' : ''}
                                ${this.licenseInfo.features.advancedAgents ? '🤖 Agents Avancés' : ''}
                            </div>
                        ` : ''}
                    </div>

                    ${this.licenseInfo?.tier === 'STARTER' ? html`
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <input type="text"
                                   placeholder="Entrez votre clé de licence"
                                   style="width: 100%; background: var(--color-black-20); border: 1px solid var(--color-white-20); color: white; border-radius: 4px; padding: 6px 8px; font-size: 11px; box-sizing: border-box;"
                                   .value=${this.licenseKeyInput}
                                   @input=${(e) => this.licenseKeyInput = e.target.value}>
                            <button class="settings-button full-width"
                                    @click=${this.handleActivateLicense}
                                    ?disabled=${this.licenseLoading}>
                                ${this.licenseLoading ? '⟳ Activation...' : '🔓 Activer la Licence'}
                            </button>
                        </div>
                    ` : html`
                        <div style="display: flex; gap: 6px;">
                            <button class="settings-button half-width"
                                    @click=${this.handleRefreshLicense}
                                    ?disabled=${this.licenseLoading}>
                                ⟳ Rafraîchir
                            </button>
                            <button class="settings-button half-width danger"
                                    @click=${this.handleDeactivateLicense}
                                    ?disabled=${this.licenseLoading}>
                                Désactiver
                            </button>
                        </div>
                    `}
                </div>

                <!-- Phase 4: Cloud Sync Section -->
                <div class="sync-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-white-10);">
                    <div class="section-header" style="font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 8px;">
                        ☁️ Synchronisation Cloud
                    </div>

                    <div class="sync-status" style="margin-bottom: 8px; padding: 8px; background: ${this.syncStatus?.isEnabled ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.05)'}; border-radius: 6px; font-size: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: ${this.syncStatus?.isEnabled ? 'rgba(0,255,0,0.8)' : 'rgba(255,255,255,0.5)'};">
                                ${this.syncStatus?.isEnabled ? '✓ Sync Activé' : '○ Sync Désactivé'}
                            </span>
                            <span style="color: ${this.syncStatus?.isOnline ? 'rgba(0,255,0,0.6)' : 'rgba(255,100,100,0.6)'};">
                                ${this.syncStatus?.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
                            </span>
                        </div>
                        ${this.syncStatus?.isSyncing ? html`
                            <div style="margin-top: 4px; color: rgba(255,200,0,0.8);">
                                ⟳ Synchronisation en cours...
                            </div>
                        ` : ''}
                        ${this.syncStatus?.lastSyncTime ? html`
                            <div style="margin-top: 4px; color: rgba(255,255,255,0.4); font-size: 9px;">
                                Dernière sync: ${new Date(this.syncStatus.lastSyncTime).toLocaleString()}
                            </div>
                        ` : ''}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${this.syncStatus?.isEnabled ? html`
                            <button class="settings-button full-width"
                                    @click=${this.handleForceSync}
                                    ?disabled=${this.syncLoading || this.syncStatus?.isSyncing}>
                                ${this.syncLoading ? '⟳ En cours...' : '⟳ Forcer la Sync'}
                            </button>
                            <button class="settings-button full-width danger"
                                    @click=${this.handleStopSync}
                                    ?disabled=${this.syncLoading}>
                                Arrêter la Sync
                            </button>
                        ` : html`
                            <button class="settings-button full-width"
                                    @click=${this.handleStartSync}
                                    ?disabled=${this.syncLoading}>
                                ${this.syncLoading ? '⟳ Démarrage...' : '▶ Démarrer la Sync'}
                            </button>
                        `}
                    </div>
                </div>

                <!-- Phase 4: Enterprise Gateway Section -->
                <div class="enterprise-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-white-10);">
                    <div class="section-header" style="font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 8px;">
                        🏢 Enterprise Gateway
                    </div>

                    <div class="enterprise-status" style="margin-bottom: 8px; padding: 8px; background: ${this.enterpriseStatus?.connected ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.05)'}; border-radius: 6px; font-size: 10px;">
                        <div style="color: ${this.enterpriseStatus?.connected ? 'rgba(0,255,0,0.8)' : 'rgba(255,255,255,0.5)'};">
                            ${this.enterpriseStatus?.connected ? html`
                                ✓ Connecté à <strong>${this.enterpriseStatus.name || 'Enterprise Gateway'}</strong>
                            ` : html`
                                ○ Non connecté
                            `}
                        </div>
                        ${this.enterpriseStatus?.connected && this.enterpriseDatabases?.length > 0 ? html`
                            <div style="margin-top: 4px; color: rgba(255,255,255,0.4); font-size: 9px;">
                                ${this.enterpriseDatabases.length} base(s) de données disponible(s)
                            </div>
                        ` : ''}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${this.enterpriseStatus?.connected ? html`
                            <button class="settings-button full-width danger"
                                    @click=${this.handleDisconnectEnterprise}
                                    ?disabled=${this.enterpriseLoading}>
                                ${this.enterpriseLoading ? '⟳ Déconnexion...' : '⏻ Déconnecter'}
                            </button>
                        ` : html`
                            <button class="settings-button full-width"
                                    @click=${this.handleConnectEnterprise}
                                    ?disabled=${this.enterpriseLoading}>
                                ${this.enterpriseLoading ? '⟳ Connexion...' : '🔌 Connecter Enterprise'}
                            </button>
                        `}
                    </div>
                </div>

                <div class="buttons-section" style="border-top: 1px solid var(--color-white-10); padding-top: 6px; margin-top: 12px;">
                    <button class="settings-button full-width" @click=${this.openShortcutEditor}>
                        Modifier les raccourcis
                    </button>
                </div>

                
                <div class="shortcuts-section">
                    ${this.getMainShortcuts().map(shortcut => html`
                        <div class="shortcut-item">
                            <span class="shortcut-name">${shortcut.name}</span>
                            <div class="shortcut-keys">
                                ${this.renderShortcutKeys(shortcut.accelerator)}
                            </div>
                        </div>
                    `)}
                </div>

                <div class="preset-section">
                    <div class="preset-header">
                        <span class="preset-title">
                            Mes préréglages
                            <span class="preset-count">(${this.presets.filter(p => p.is_default === 0).length})</span>
                        </span>
                        <span class="preset-toggle" @click=${this.togglePresets}>
                            ${this.showPresets ? '▼' : '▶'}
                        </span>
                    </div>
                    
                    <div class="preset-list ${this.showPresets ? '' : 'hidden'}">
                        ${this.presets.filter(p => p.is_default === 0).length === 0 ? html`
                            <div class="no-presets-message">
                                Aucun préréglage personnalisé.<br>
                                <span class="web-link" @click=${this.handlePersonalize}>
                                    Créer votre premier préréglage
                                </span>
                            </div>
                        ` : this.presets.filter(p => p.is_default === 0).map(preset => html`
                            <div class="preset-item ${this.selectedPreset?.id === preset.id ? 'selected' : ''}"
                                 @click=${() => this.handlePresetSelect(preset)}>
                                <span class="preset-name">${preset.title}</span>
                                ${this.selectedPreset?.id === preset.id ? html`<span class="preset-status">Sélectionné</span>` : ''}
                            </div>
                        `)}
                    </div>
                </div>

                <div class="buttons-section">
                    <!-- Phase 1 - Meeting Assistant: Post-meeting button -->
                    <button class="settings-button full-width" @click=${this.handleOpenPostMeeting}>
                        <span>📋 Compte-rendu de réunion</span>
                    </button>

                    <button class="settings-button full-width" @click=${this.handlePersonalize}>
                        <span>Personnaliser / Notes de réunion</span>
                    </button>
                    <button class="settings-button full-width" @click=${this.handleToggleAutoUpdate} ?disabled=${this.autoUpdateLoading}>
                        <span>Mises à jour automatiques : ${this.autoUpdateEnabled ? 'Activées' : 'Désactivées'}</span>
                    </button>
                    
                    <div class="move-buttons">
                        <button class="settings-button half-width" @click=${this.handleMoveLeft}>
                            <span>← Déplacer</span>
                        </button>
                        <button class="settings-button half-width" @click=${this.handleMoveRight}>
                            <span>Déplacer →</span>
                        </button>
                    </div>
                    
                    <button class="settings-button full-width" @click=${this.handleToggleInvisibility}>
                        <span>${this.isContentProtectionOn ? 'Désactiver l\'invisibilité' : 'Activer l\'invisibilité'}</span>
                    </button>

                    <button class="settings-button full-width" @click=${this.handleToggleScreenshot}>
                        <span>${this.isScreenshotEnabled ? 'Désactiver les captures d\'écran' : 'Activer les captures d\'écran'}</span>
                    </button>

                    <div class="bottom-buttons">
                        ${this.firebaseUser
                            ? html`
                                <button class="settings-button half-width danger" @click=${this.handleFirebaseLogout}>
                                    <span>Déconnexion</span>
                                </button>
                                `
                            : html`
                                <button class="settings-button half-width" @click=${this.handleUseLucideKey}>
                                    <span>Connexion</span>
                                </button>
                                `
                        }
                        <button class="settings-button half-width danger" @click=${this.handleQuit}>
                            <span>Quitter</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    //////// after_modelStateService ////////
}

customElements.define('settings-view', SettingsView);