// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Platform information for renderer processes
  platform: {
    isLinux: process.platform === 'linux',
    isMacOS: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    platform: process.platform
  },
  
  // Common utilities used across multiple components
  common: {
    // User & Auth
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    startFirebaseAuth: () => ipcRenderer.invoke('start-firebase-auth'),
    firebaseLogout: () => ipcRenderer.invoke('firebase-logout'),
    
    // App Control
      quitApplication: () => ipcRenderer.invoke('quit-application'),
      openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // User state listener (used by multiple components)
      onUserStateChanged: (callback) => ipcRenderer.on('user-state-changed', callback),
      removeOnUserStateChanged: (callback) => ipcRenderer.removeListener('user-state-changed', callback),
  },

  // UI Component specific namespaces
  // src/ui/app/ApiKeyHeader.js
  apiKeyHeader: {
    // Model & Provider Management
    getProviderConfig: () => ipcRenderer.invoke('model:get-provider-config'),
    // API LocalAI unifiée
    getLocalAIStatus: (service) => ipcRenderer.invoke('localai:get-status', service),
    installLocalAI: (service, options) => ipcRenderer.invoke('localai:install', { service, options }),
    startLocalAIService: (service) => ipcRenderer.invoke('localai:start-service', service),
    stopLocalAIService: (service) => ipcRenderer.invoke('localai:stop-service', service),
    installLocalAIModel: (service, modelId, options) => ipcRenderer.invoke('localai:install-model', { service, modelId, options }),
    getInstalledModels: (service) => ipcRenderer.invoke('localai:get-installed-models', service),
    
    // Support legacy (maintenu pour compatibilité)
    getOllamaStatus: () => ipcRenderer.invoke('localai:get-status', 'ollama'),
    getModelSuggestions: () => ipcRenderer.invoke('ollama:get-model-suggestions'),
    ensureOllamaReady: () => ipcRenderer.invoke('ollama:ensure-ready'),
    installOllama: () => ipcRenderer.invoke('localai:install', { service: 'ollama' }),
    startOllamaService: () => ipcRenderer.invoke('localai:start-service', 'ollama'),
    pullOllamaModel: (modelName) => ipcRenderer.invoke('ollama:pull-model', modelName),
    downloadWhisperModel: (modelId) => ipcRenderer.invoke('whisper:download-model', modelId),
    validateKey: (data) => ipcRenderer.invoke('model:validate-key', data),
    setSelectedModel: (data) => ipcRenderer.invoke('model:set-selected-model', data),
    areProvidersConfigured: () => ipcRenderer.invoke('model:are-providers-configured'),
    
    // Window Management
    getHeaderPosition: () => ipcRenderer.invoke('get-header-position'),
    moveHeaderTo: (x, y) => ipcRenderer.invoke('move-header-to', x, y),
    
    // Listeners
    // Écouteurs d'événements LocalAI unifiés
    onLocalAIProgress: (callback) => ipcRenderer.on('localai:install-progress', callback),
    removeOnLocalAIProgress: (callback) => ipcRenderer.removeListener('localai:install-progress', callback),
    onLocalAIComplete: (callback) => ipcRenderer.on('localai:installation-complete', callback),
    removeOnLocalAIComplete: (callback) => ipcRenderer.removeListener('localai:installation-complete', callback),
    onLocalAIError: (callback) => ipcRenderer.on('localai:error-notification', callback),
    removeOnLocalAIError: (callback) => ipcRenderer.removeListener('localai:error-notification', callback),
    onLocalAIModelReady: (callback) => ipcRenderer.on('localai:model-ready', callback),
    removeOnLocalAIModelReady: (callback) => ipcRenderer.removeListener('localai:model-ready', callback),
    

    // Remove all listeners (for cleanup)
    removeAllListeners: () => {
      // Événements LocalAI unifiés
      ipcRenderer.removeAllListeners('localai:install-progress');
      ipcRenderer.removeAllListeners('localai:installation-complete');
      ipcRenderer.removeAllListeners('localai:error-notification');
      ipcRenderer.removeAllListeners('localai:model-ready');
      ipcRenderer.removeAllListeners('localai:service-status-changed');
    }
  },

  // src/ui/app/HeaderController.js
  headerController: {
    // State Management
    sendHeaderStateChanged: (state) => ipcRenderer.send('header-state-changed', state),
    reInitializeModelState: () => ipcRenderer.invoke('model:re-initialize-state'),
    
    // Window Management
    resizeHeaderWindow: (dimensions) => ipcRenderer.invoke('resize-header-window', dimensions),
    
    // Permissions
    checkSystemPermissions: () => ipcRenderer.invoke('check-system-permissions'),
    checkPermissionsCompleted: () => ipcRenderer.invoke('check-permissions-completed'),
    
    // Listeners
    onUserStateChanged: (callback) => ipcRenderer.on('user-state-changed', callback),
    removeOnUserStateChanged: (callback) => ipcRenderer.removeListener('user-state-changed', callback),
    onAuthFailed: (callback) => ipcRenderer.on('auth-failed', callback),
    removeOnAuthFailed: (callback) => ipcRenderer.removeListener('auth-failed', callback),
    onForceShowApiKeyHeader: (callback) => ipcRenderer.on('force-show-apikey-header', callback),
    removeOnForceShowApiKeyHeader: (callback) => ipcRenderer.removeListener('force-show-apikey-header', callback),
  },

  // src/ui/app/MainHeader.js
  mainHeader: {
    // Window Management
    getHeaderPosition: () => ipcRenderer.invoke('get-header-position'),
    moveHeaderTo: (x, y) => ipcRenderer.invoke('move-header-to', x, y),
    sendHeaderAnimationFinished: (state) => ipcRenderer.send('header-animation-finished', state),

    // Settings Window Management
    cancelHideSettingsWindow: () => ipcRenderer.send('cancel-hide-settings-window'),
    showSettingsWindow: () => ipcRenderer.send('show-settings-window'),
    hideSettingsWindow: () => ipcRenderer.send('hide-settings-window'),
    
    // Generic invoke (for dynamic channel names)
    // invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    sendListenButtonClick: (listenButtonText) => ipcRenderer.invoke('listen:changeSession', listenButtonText),
    sendAskButtonClick: () => ipcRenderer.invoke('ask:toggleAskButton'),
    sendBrowserButtonClick: () => ipcRenderer.invoke('browser:show'),
    sendToggleAllWindowsVisibility: () => ipcRenderer.invoke('shortcut:toggleAllWindowsVisibility'),
    
    // Listeners
    onListenChangeSessionResult: (callback) => ipcRenderer.on('listen:changeSessionResult', callback),
    removeOnListenChangeSessionResult: (callback) => ipcRenderer.removeListener('listen:changeSessionResult', callback),
    onShortcutsUpdated: (callback) => ipcRenderer.on('shortcuts-updated', callback),
    removeOnShortcutsUpdated: (callback) => ipcRenderer.removeListener('shortcuts-updated', callback)
  },

  // src/ui/app/PermissionHeader.js
  permissionHeader: {
    // Permission Management
    checkSystemPermissions: () => ipcRenderer.invoke('check-system-permissions'),
    requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
    openSystemPreferences: (preference) => ipcRenderer.invoke('open-system-preferences', preference),
    markKeychainCompleted: () => ipcRenderer.invoke('mark-keychain-completed'),
    checkKeychainCompleted: (uid) => ipcRenderer.invoke('check-keychain-completed', uid),
    initializeEncryptionKey: () => ipcRenderer.invoke('initialize-encryption-key') // New for keychain
  },

  // src/ui/app/LucideApp.js
  lucideApp: {
    // Listeners
    onClickThroughToggled: (callback) => ipcRenderer.on('click-through-toggled', callback),
    removeOnClickThroughToggled: (callback) => ipcRenderer.removeListener('click-through-toggled', callback),
    removeAllClickThroughListeners: () => ipcRenderer.removeAllListeners('click-through-toggled')
  },

  // src/ui/ask/AskView.js
  askView: {
    // Window Management
    closeAskWindow: () => ipcRenderer.invoke('ask:closeAskWindow'),
    minimizeAskWindow: () => ipcRenderer.invoke('ask:minimizeAskWindow'),
    showListenWindow: () => ipcRenderer.invoke('ask:showListenWindow'),
    adjustWindowHeight: (winName, height) => ipcRenderer.invoke('adjust-window-height', { winName, height }),
    setBrowserMode: (browserMode) => ipcRenderer.invoke('ask:setBrowserMode', browserMode),

    // Message Handling
    sendMessage: (text) => ipcRenderer.invoke('ask:sendQuestionFromAsk', text),

    // Listeners
    onAskStateUpdate: (callback) => ipcRenderer.on('ask:stateUpdate', callback),
    removeOnAskStateUpdate: (callback) => ipcRenderer.removeListener('ask:stateUpdate', callback),

    onAskStreamError: (callback) => ipcRenderer.on('ask-response-stream-error', callback),
    removeOnAskStreamError: (callback) => ipcRenderer.removeListener('ask-response-stream-error', callback),

    // Listeners
    onShowTextInput: (callback) => ipcRenderer.on('ask:showTextInput', callback),
    removeOnShowTextInput: (callback) => ipcRenderer.removeListener('ask:showTextInput', callback),

    onScrollResponseUp: (callback) => ipcRenderer.on('aks:scrollResponseUp', callback),
    removeOnScrollResponseUp: (callback) => ipcRenderer.removeListener('aks:scrollResponseUp', callback),
    onScrollResponseDown: (callback) => ipcRenderer.on('aks:scrollResponseDown', callback),
    removeOnScrollResponseDown: (callback) => ipcRenderer.removeListener('aks:scrollResponseDown', callback),

    // Browser mode - Ouvrir des URLs
    onOpenUrl: (callback) => ipcRenderer.on('ask:open-url', callback),
    removeOnOpenUrl: (callback) => ipcRenderer.removeListener('ask:open-url', callback),

    // Deep Link navigation events
    onDeepLinkNavigate: (callback) => ipcRenderer.on('deep-link:navigate', callback),
    removeOnDeepLinkNavigate: (callback) => ipcRenderer.removeListener('deep-link:navigate', callback),
    onDeepLinkAction: (callback) => ipcRenderer.on('deep-link:action', callback),
    removeOnDeepLinkAction: (callback) => ipcRenderer.removeListener('deep-link:action', callback)
  },

  // src/ui/browser/BrowserView.js
  browserView: {
    // Window Management
    closeBrowser: () => ipcRenderer.invoke('browser:close'),

    // Listeners
    onNavigateTo: (callback) => ipcRenderer.on('browser:navigate-to', callback),
    removeOnNavigateTo: (callback) => ipcRenderer.removeListener('browser:navigate-to', callback)
  },

  // src/ui/listen/ListenView.js
  listenView: {
    // Window Management
    adjustWindowHeight: (winName, height) => ipcRenderer.invoke('adjust-window-height', { winName, height }),
    hideListenWindow: () => ipcRenderer.invoke('listen:hideWindow'),

    // Phase 1 - Meeting Assistant
    getRecentListenSession: () => ipcRenderer.invoke('listen:getRecentListenSession'),
    openPostMeetingWindow: (sessionId) => ipcRenderer.invoke('listen:openPostMeetingWindow', sessionId),

    // Phase 3 - Robustness Improvements
    getTranscriptStats: () => ipcRenderer.invoke('listen:getTranscriptStats'),
    validatePreRecording: () => ipcRenderer.invoke('listen:validatePreRecording'),
    onTranscriptStats: (callback) => ipcRenderer.on('transcript-stats', (event, stats) => callback(stats)),
    removeOnTranscriptStats: (callback) => ipcRenderer.removeListener('transcript-stats', callback),

    // Listeners
    onSessionStateChanged: (callback) => ipcRenderer.on('session-state-changed', callback),
    removeOnSessionStateChanged: (callback) => ipcRenderer.removeListener('session-state-changed', callback)
  },

  // src/ui/listen/stt/SttView.js
  sttView: {
    // Listeners
    onSttUpdate: (callback) => ipcRenderer.on('stt-update', callback),
    removeOnSttUpdate: (callback) => ipcRenderer.removeListener('stt-update', callback)
  },

  // src/ui/listen/summary/SummaryView.js
  summaryView: {
    // Message Handling
    sendQuestionFromSummary: (text) => ipcRenderer.invoke('ask:sendQuestionFromSummary', text),

    // Listeners
    onSummaryUpdate: (callback) => ipcRenderer.on('summary-update', callback),
    removeOnSummaryUpdate: (callback) => ipcRenderer.removeListener('summary-update', callback),
    removeAllSummaryUpdateListeners: () => ipcRenderer.removeAllListeners('summary-update')
  },

  // src/ui/listen/response/ResponseView.js
  responseView: {
    // Listeners for AI response suggestions
    onAiResponseGenerating: (callback) => ipcRenderer.on('ai-response-generating', callback),
    removeOnAiResponseGenerating: (callback) => ipcRenderer.removeListener('ai-response-generating', callback),
    onAiResponseReady: (callback) => ipcRenderer.on('ai-response-ready', callback),
    removeOnAiResponseReady: (callback) => ipcRenderer.removeListener('ai-response-ready', callback),
    onAiResponseError: (callback) => ipcRenderer.on('ai-response-error', callback),
    removeOnAiResponseError: (callback) => ipcRenderer.removeListener('ai-response-error', callback),
    onSessionStateChanged: (callback) => ipcRenderer.on('session-state-changed', callback),
    removeOnSessionStateChanged: (callback) => ipcRenderer.removeListener('session-state-changed', callback)
  },

  // src/ui/settings/SettingsView.js
  settingsView: {
    // User & Auth
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    openPersonalizePage: () => ipcRenderer.invoke('open-personalize-page'),
    firebaseLogout: () => ipcRenderer.invoke('firebase-logout'),
    startFirebaseAuth: () => ipcRenderer.invoke('start-firebase-auth'),

    // Model & Provider Management
    getModelSettings: () => ipcRenderer.invoke('settings:get-model-settings'), // Facade call
    getProviderConfig: () => ipcRenderer.invoke('model:get-provider-config'),
    getAllKeys: () => ipcRenderer.invoke('model:get-all-keys'),
    getAvailableModels: (type) => ipcRenderer.invoke('model:get-available-models', type),
    getSelectedModels: () => ipcRenderer.invoke('model:get-selected-models'),
    validateKey: (data) => ipcRenderer.invoke('model:validate-key', data),
    saveApiKey: (key) => ipcRenderer.invoke('model:save-api-key', key),
    removeApiKey: (provider) => ipcRenderer.invoke('model:remove-api-key', provider),
    setSelectedModel: (data) => ipcRenderer.invoke('model:set-selected-model', data),
    
    // Ollama Management
    getOllamaStatus: () => ipcRenderer.invoke('ollama:get-status'),
    ensureOllamaReady: () => ipcRenderer.invoke('ollama:ensure-ready'),
    shutdownOllama: (graceful) => ipcRenderer.invoke('ollama:shutdown', graceful),
    
    // Whisper Management
    getWhisperInstalledModels: () => ipcRenderer.invoke('whisper:get-installed-models'),
    downloadWhisperModel: (modelId) => ipcRenderer.invoke('whisper:download-model', modelId),
    
    // Settings Management
    getPresets: () => ipcRenderer.invoke('settings:getPresets'),
    getAutoUpdate: () => ipcRenderer.invoke('settings:get-auto-update'),
    setAutoUpdate: (isEnabled) => ipcRenderer.invoke('settings:set-auto-update', isEnabled),
    getContentProtectionStatus: () => ipcRenderer.invoke('get-content-protection-status'),
    toggleContentProtection: () => ipcRenderer.invoke('toggle-content-protection'),
    getScreenshotEnabled: () => ipcRenderer.invoke('get-screenshot-enabled'),
    setScreenshotEnabled: (enabled) => ipcRenderer.invoke('set-screenshot-enabled', enabled),
    getCurrentShortcuts: () => ipcRenderer.invoke('settings:getCurrentShortcuts'),
    openShortcutSettingsWindow: () => ipcRenderer.invoke('shortcut:openShortcutSettingsWindow'),

    // Agent Profile Management
    getAvailableProfiles: () => ipcRenderer.invoke('agent:get-available-profiles'),
    getActiveProfile: () => ipcRenderer.invoke('agent:get-active-profile'),
    setActiveProfile: (profileId) => ipcRenderer.invoke('agent:set-active-profile', profileId),

    // Knowledge Base Management
    getKnowledgeBaseStatus: () => ipcRenderer.invoke('settings:get-knowledge-base-status'),
    createPersonalKnowledgeBase: () => ipcRenderer.invoke('settings:create-personal-knowledge-base'),
    connectExternalKnowledgeBase: () => ipcRenderer.invoke('settings:connect-external-knowledge-base'),
    syncKnowledgeBase: () => ipcRenderer.invoke('settings:sync-knowledge-base'),
    openKnowledgeBaseManager: () => ipcRenderer.invoke('settings:open-knowledge-base-manager'),

    // Window Management
    moveWindowStep: (direction) => ipcRenderer.invoke('move-window-step', direction),
    cancelHideSettingsWindow: () => ipcRenderer.send('cancel-hide-settings-window'),
    hideSettingsWindow: () => ipcRenderer.send('hide-settings-window'),
    
    // App Control
    quitApplication: () => ipcRenderer.invoke('quit-application'),
    
    // Progress Tracking
    pullOllamaModel: (modelName) => ipcRenderer.invoke('ollama:pull-model', modelName),
    
    // Listeners
    onUserStateChanged: (callback) => ipcRenderer.on('user-state-changed', callback),
    removeOnUserStateChanged: (callback) => ipcRenderer.removeListener('user-state-changed', callback),
    onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', callback),
    removeOnSettingsUpdated: (callback) => ipcRenderer.removeListener('settings-updated', callback),
    onPresetsUpdated: (callback) => ipcRenderer.on('presets-updated', callback),
    removeOnPresetsUpdated: (callback) => ipcRenderer.removeListener('presets-updated', callback),
    onShortcutsUpdated: (callback) => ipcRenderer.on('shortcuts-updated', callback),
    removeOnShortcutsUpdated: (callback) => ipcRenderer.removeListener('shortcuts-updated', callback),
    // Utilisation des événements LocalAI unifiés
    onLocalAIInstallProgress: (callback) => ipcRenderer.on('localai:install-progress', callback),
    removeOnLocalAIInstallProgress: (callback) => ipcRenderer.removeListener('localai:install-progress', callback),
    onLocalAIInstallationComplete: (callback) => ipcRenderer.on('localai:installation-complete', callback),
    removeOnLocalAIInstallationComplete: (callback) => ipcRenderer.removeListener('localai:installation-complete', callback)
  },

  // src/ui/history/HistoryView.js - Phase 2: Conversation History
  history: {
    getAllSessions: (options) => ipcRenderer.invoke('history:get-all-sessions', options),
    searchSessions: (query, filters) => ipcRenderer.invoke('history:search-sessions', query, filters),
    getSessionMessages: (sessionId) => ipcRenderer.invoke('history:get-session-messages', sessionId),
    getStats: () => ipcRenderer.invoke('history:get-stats'),
    updateMetadata: (sessionId, metadata) => ipcRenderer.invoke('history:update-metadata', sessionId, metadata),
    deleteSession: (sessionId) => ipcRenderer.invoke('history:delete-session', sessionId),
    generateTitle: (sessionId) => ipcRenderer.invoke('history:generate-title', sessionId)
  },

  // Phase 3: Workflows - Quick Actions
  workflows: {
    getCurrentProfileWorkflows: () => ipcRenderer.invoke('workflows:get-current-profile-workflows'),
    getWorkflowsMetadata: (profileId) => ipcRenderer.invoke('workflows:get-workflows-metadata', profileId),
    getWorkflow: (profileId, workflowId) => ipcRenderer.invoke('workflows:get-workflow', profileId, workflowId),
    buildPrompt: (profileId, workflowId, formData) => ipcRenderer.invoke('workflows:build-prompt', profileId, workflowId, formData),
    getFormFields: (profileId, workflowId) => ipcRenderer.invoke('workflows:get-form-fields', profileId, workflowId),
    validateForm: (profileId, workflowId, formData) => ipcRenderer.invoke('workflows:validate-form', profileId, workflowId, formData)
  },

  // Phase 4: Knowledge Base - Documents
  documents: {
    getAllDocuments: () => ipcRenderer.invoke('documents:get-all'),
    getDocument: (documentId, includeContent = true) => ipcRenderer.invoke('documents:get', documentId, includeContent),
    updateDocument: (documentId, updates) => ipcRenderer.invoke('documents:update', documentId, updates),
    searchDocuments: (query, filters) => ipcRenderer.invoke('documents:search', query, filters),
    getStats: () => ipcRenderer.invoke('documents:get-stats'),
    deleteDocument: (documentId) => ipcRenderer.invoke('documents:delete', documentId),
    uploadDocument: () => ipcRenderer.invoke('documents:upload'),
    analyzeFile: (fileData) => ipcRenderer.invoke('documents:analyze-file', fileData),
    exportDocument: (documentData) => ipcRenderer.invoke('documents:export', documentData),
    openExportFolder: () => ipcRenderer.invoke('documents:open-export-folder')
  },

  // Phase 5: Export - Conversation Export
  export: {
    toJSON: (sessionId) => ipcRenderer.invoke('export:conversation-json', sessionId),
    toMarkdown: (sessionId) => ipcRenderer.invoke('export:conversation-markdown', sessionId),
    toPDF: (sessionId) => ipcRenderer.invoke('export:conversation-pdf', sessionId),
    toDOCX: (sessionId) => ipcRenderer.invoke('export:conversation-docx', sessionId)
  },

  // Phase 4: RAG (Retrieval Augmented Generation)
  rag: {
    retrieveContext: (query, options) => ipcRenderer.invoke('rag:retrieve-context', query, options),
    getSessionCitations: (sessionId) => ipcRenderer.invoke('rag:get-session-citations', sessionId)
  },

  // src/ui/knowledge/KnowledgeBaseView.js
  knowledgeBase: {
    closeWindow: () => ipcRenderer.invoke('knowledge-base:close-window')
  },

  // src/ui/knowledge/ExternalDatabaseDialog.js
  knowledge: {
    testExternalConnection: (config) => ipcRenderer.invoke('knowledge:test-external-connection', config),
    connectExternal: (config) => ipcRenderer.invoke('knowledge:connect-external', config),
    closeExternalDialog: () => ipcRenderer.invoke('knowledge:close-external-dialog'),
    getAllDatabases: () => ipcRenderer.invoke('knowledge:get-all-databases'),
    switchDatabase: (dbId) => ipcRenderer.invoke('knowledge:switch-database', dbId),
    // KB-P2-4: Firebase connectivity
    checkConnectivity: () => ipcRenderer.invoke('knowledge:check-connectivity'),
    getConnectivityStatus: () => ipcRenderer.invoke('knowledge:get-connectivity-status'),
    // KB-UX-5: Embedding provider status
    getEmbeddingStatus: () => ipcRenderer.invoke('knowledge:get-embedding-status'),
    // KB-P2-3: Open Knowledge Manager
    openManager: () => ipcRenderer.invoke('knowledge:open-manager')
  },

  // src/ui/settings/ShortCutSettingsView.js
  shortcutSettingsView: {
    // Shortcut Management
    saveShortcuts: (shortcuts) => ipcRenderer.invoke('shortcut:saveShortcuts', shortcuts),
    getDefaultShortcuts: () => ipcRenderer.invoke('shortcut:getDefaultShortcuts'),
    closeShortcutSettingsWindow: () => ipcRenderer.invoke('shortcut:closeShortcutSettingsWindow'),
    
    // Listeners
    onLoadShortcuts: (callback) => ipcRenderer.on('shortcut:loadShortcuts', callback),
    removeOnLoadShortcuts: (callback) => ipcRenderer.removeListener('shortcut:loadShortcuts', callback)
  },

  // src/ui/app/content.html inline scripts
  content: {
    // Listeners
    onSettingsWindowHideAnimation: (callback) => ipcRenderer.on('settings-window-hide-animation', callback),
    removeOnSettingsWindowHideAnimation: (callback) => ipcRenderer.removeListener('settings-window-hide-animation', callback),    
  },

  // src/ui/listen/audioCore/listenCapture.js
  listenCapture: {
    // Audio Management
    sendMicAudioContent: (data) => ipcRenderer.invoke('listen:sendMicAudio', data),
    sendSystemAudioContent: (data) => ipcRenderer.invoke('listen:sendSystemAudio', data),
    startMacosSystemAudio: () => ipcRenderer.invoke('listen:startMacosSystemAudio'),
    stopMacosSystemAudio: () => ipcRenderer.invoke('listen:stopMacosSystemAudio'),

    // Session Management
    isSessionActive: () => ipcRenderer.invoke('listen:isSessionActive'),

    // BlackHole virtual audio device support (for FaceTime, Discord, etc.)
    detectBlackHole: () => ipcRenderer.invoke('listen:detectBlackHole'),
    getAudioDeviceStatus: () => ipcRenderer.invoke('listen:getAudioDeviceStatus'),
    getBlackHoleSetupInstructions: () => ipcRenderer.invoke('listen:getBlackHoleSetupInstructions'),

    // Listeners
    onSystemAudioData: (callback) => ipcRenderer.on('system-audio-data', callback),
    removeOnSystemAudioData: (callback) => ipcRenderer.removeListener('system-audio-data', callback)
  },

  // src/ui/listen/audioCore/renderer.js
  renderer: {
    // Listeners
    onChangeListenCaptureState: (callback) => ipcRenderer.on('change-listen-capture-state', callback),
    removeOnChangeListenCaptureState: (callback) => ipcRenderer.removeListener('change-listen-capture-state', callback)
  },

  // src/ui/onboarding/OnboardingWizard.js & Profile Management
  profile: {
    // User Profile Management
    getCurrentProfile: () => ipcRenderer.invoke('profile:get-current'),
    needsOnboarding: () => ipcRenderer.invoke('profile:needs-onboarding'),
    startOnboarding: () => ipcRenderer.invoke('profile:start-onboarding'),
    completeOnboarding: (data) => ipcRenderer.invoke('profile:complete-onboarding', data),
    switchProfile: (profileId, reason) => ipcRenderer.invoke('profile:switch', { profileId, reason }),
    updatePreferences: (preferences) => ipcRenderer.invoke('profile:update-preferences', preferences),
    getSwitchHistory: (limit) => ipcRenderer.invoke('profile:get-switch-history', limit),
    getUsageStats: () => ipcRenderer.invoke('profile:get-usage-stats'),

    // Agent Profile Management
    getAgentProfiles: () => ipcRenderer.invoke('profile:get-agent-profiles'),
    getCurrentAgent: () => ipcRenderer.invoke('profile:get-current-agent'),
    getOnboardingQuestions: (profileId) => ipcRenderer.invoke('profile:get-onboarding-questions', profileId),

    // Theme Management (Phase WOW 1 - Jour 3)
    getTheme: (profileId) => ipcRenderer.invoke('profile:get-theme', profileId),
    getCurrentTheme: () => ipcRenderer.invoke('profile:get-current-theme'),
    getAllThemes: () => ipcRenderer.invoke('profile:get-all-themes'),

    // Agent Router & Suggestions (Phase WOW 1 - Jour 4)
    analyzeSuggestion: (question, currentProfile) => ipcRenderer.invoke('profile:analyze-suggestion', { question, currentProfile }),
    acceptSuggestion: (suggestion) => ipcRenderer.invoke('profile:accept-suggestion', suggestion),
    rejectSuggestion: (suggestion) => ipcRenderer.invoke('profile:reject-suggestion', suggestion),
    getSuggestionHistory: (limit) => ipcRenderer.invoke('profile:get-suggestion-history', limit),
    getSuggestionStats: () => ipcRenderer.invoke('profile:get-suggestion-stats'),
    setSuggestionsEnabled: (enabled) => ipcRenderer.invoke('profile:set-suggestions-enabled', enabled),

    // Listeners
    onThemeChanged: (callback) => ipcRenderer.on('profile:theme-changed', (event, data) => callback(data)),
    removeOnThemeChanged: (callback) => ipcRenderer.removeListener('profile:theme-changed', callback),
    onProfileSwitched: (callback) => ipcRenderer.on('profile-switched', (event, data) => callback(data)),
    removeOnProfileSwitched: (callback) => ipcRenderer.removeListener('profile-switched', callback)
  },

  // Phase WOW 1 - Jour 5: Prompt Engineering & User Context
  prompt: {
    // Generate enriched prompt for AI
    generate: ({ question, profileId, uid, sessionId, customContext }) =>
      ipcRenderer.invoke('prompt:generate', { question, profileId, uid, sessionId, customContext }),

    // Get profile information
    getProfileInfo: (profileId) => ipcRenderer.invoke('prompt:get-profile-info', profileId),

    // Get available profiles
    getAvailableProfiles: () => ipcRenderer.invoke('prompt:get-available-profiles')
  },

  context: {
    // Get user context
    get: (uid) => ipcRenderer.invoke('context:get', uid),

    // Save user context
    save: (uid, context) => ipcRenderer.invoke('context:save', { uid, context }),

    // Update user context
    update: (uid, updates) => ipcRenderer.invoke('context:update', { uid, updates }),

    // Complete onboarding
    completeOnboarding: (uid) => ipcRenderer.invoke('context:complete-onboarding', uid),

    // Skip onboarding
    skipOnboarding: (uid) => ipcRenderer.invoke('context:skip-onboarding', uid),

    // Check if onboarding completed
    hasCompletedOnboarding: (uid) => ipcRenderer.invoke('context:has-completed-onboarding', uid),

    // Get context summary
    getSummary: (uid) => ipcRenderer.invoke('context:get-summary', uid)
  },

  // Phase 1: Meeting Assistant - Post-Meeting Features
  // FIX: Added .catch() blocks to prevent unhandled promise rejections
  postMeeting: {
    // Generate meeting notes for a session
    generateNotes: (sessionId) => ipcRenderer.invoke('post-meeting:generate-notes', sessionId)
      .catch(err => { console.error('[Preload] generateNotes error:', err); return { success: false, error: err.message }; }),

    // Get meeting notes for a session
    getMeetingNotes: (sessionId) => ipcRenderer.invoke('post-meeting:get-notes', sessionId)
      .catch(err => { console.error('[Preload] getMeetingNotes error:', err); return { success: false, error: err.message }; }),

    // Export meeting notes to a format
    exportNotes: (sessionId, format) => ipcRenderer.invoke('post-meeting:export', sessionId, format)
      .catch(err => { console.error('[Preload] exportNotes error:', err); return { success: false, error: err.message }; }),

    // IMP-U6: Export meeting notes with save dialog (user chooses destination)
    exportNotesWithDialog: (sessionId, format) => ipcRenderer.invoke('post-meeting:export-with-dialog', sessionId, format)
      .catch(err => { console.error('[Preload] exportNotesWithDialog error:', err); return { success: false, error: err.message }; }),

    // Get all meeting notes for current user
    getAllNotes: () => ipcRenderer.invoke('post-meeting:get-all-notes')
      .catch(err => { console.error('[Preload] getAllNotes error:', err); return { success: false, notes: [] }; }),

    // Phase 2.4: Update meeting notes (for editing)
    updateNotes: (noteId, updates) => ipcRenderer.invoke('post-meeting:update-notes', noteId, updates)
      .catch(err => { console.error('[Preload] updateNotes error:', err); return { success: false, error: err.message }; }),

    // Task management
    updateTask: (taskId, updates) => ipcRenderer.invoke('post-meeting:update-task', taskId, updates)
      .catch(err => { console.error('[Preload] updateTask error:', err); return { success: false, error: err.message }; }),
    completeTask: (taskId) => ipcRenderer.invoke('post-meeting:complete-task', taskId)
      .catch(err => { console.error('[Preload] completeTask error:', err); return { success: false, error: err.message }; }),
    getTasks: (meetingNoteId) => ipcRenderer.invoke('post-meeting:get-tasks', meetingNoteId)
      .catch(err => { console.error('[Preload] getTasks error:', err); return { success: false, tasks: [] }; }),

    // Delete meeting notes
    deleteNotes: (noteId) => ipcRenderer.invoke('post-meeting:delete-notes', noteId)
      .catch(err => { console.error('[Preload] deleteNotes error:', err); return { success: false, error: err.message }; }),

    // Check if session has notes
    hasNotes: (sessionId) => ipcRenderer.invoke('post-meeting:has-notes', sessionId)
      .catch(err => { console.error('[Preload] hasNotes error:', err); return { success: false, hasNotes: false }; }),

    // FIX-U2: Open export folder in file explorer
    openExportFolder: () => ipcRenderer.invoke('post-meeting:open-export-folder')
      .catch(err => { console.error('[Preload] openExportFolder error:', err); return { success: false, error: err.message }; }),

    // Listeners
    onSetSession: (callback) => ipcRenderer.on('post-meeting:set-session', (event, sessionId) => callback(sessionId)),
    removeOnSetSession: (callback) => ipcRenderer.removeListener('post-meeting:set-session', callback),
    onNotesGenerated: (callback) => ipcRenderer.on('post-meeting:notes-generated', (event, data) => callback(data)),
    removeOnNotesGenerated: (callback) => ipcRenderer.removeListener('post-meeting:notes-generated', callback),
    onExportComplete: (callback) => ipcRenderer.on('post-meeting:export-complete', (event, data) => callback(data)),
    removeOnExportComplete: (callback) => ipcRenderer.removeListener('post-meeting:export-complete', callback),
    onError: (callback) => ipcRenderer.on('post-meeting:error', (event, data) => callback(data)),
    removeOnError: (callback) => ipcRenderer.removeListener('post-meeting:error', callback),

    // P1-4: Real progress updates
    onProgress: (callback) => ipcRenderer.on('post-meeting:progress', (event, data) => callback(data)),
    removeOnProgress: (callback) => ipcRenderer.removeListener('post-meeting:progress', callback),

    // FIX: Close the post-meeting window
    closeWindow: () => ipcRenderer.invoke('post-meeting:close-window')
      .catch(err => { console.error('[Preload] closeWindow error:', err); return { success: false }; })
  },

  // Phase 2 - Participant Attribution
  // FIX HIGH: Added .catch() blocks to all promise chains
  participants: {
    // Detect speakers from session transcripts
    detectSpeakers: (sessionId) => ipcRenderer.invoke('participants:detect-speakers', sessionId)
      .then(result => result.success ? result.speakers : [])
      .catch(err => { console.error('[Preload] detectSpeakers error:', err); return []; }),

    // Get participants for a session
    getSessionParticipants: (sessionId) => ipcRenderer.invoke('participants:get-session-participants', sessionId)
      .then(result => result.success ? result.participants : [])
      .catch(err => { console.error('[Preload] getSessionParticipants error:', err); return []; }),

    // Save participants for a session
    saveParticipants: (sessionId, participantsData) => ipcRenderer.invoke('participants:save-participants', sessionId, participantsData)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      })
      .catch(err => { console.error('[Preload] saveParticipants error:', err); throw err; }),

    // Get frequent participants for autocomplete
    getFrequentParticipants: (limit = 10) => ipcRenderer.invoke('participants:get-frequent', limit)
      .then(result => result.success ? result.participants : [])
      .catch(err => { console.error('[Preload] getFrequentParticipants error:', err); return []; }),

    // Check if participants are assigned
    hasParticipantsAssigned: (sessionId) => ipcRenderer.invoke('participants:has-assigned', sessionId)
      .then(result => result.success ? result.hasAssigned : false)
      .catch(err => { console.error('[Preload] hasParticipantsAssigned error:', err); return false; }),

    // Get participant mapping (speaker label -> participant info)
    getParticipantMapping: (sessionId) => ipcRenderer.invoke('participants:get-mapping', sessionId)
      .then(result => result.success ? result.mapping : {})
      .catch(err => { console.error('[Preload] getParticipantMapping error:', err); return {}; }),

    // Delete participants for a session
    deleteSessionParticipants: (sessionId) => ipcRenderer.invoke('participants:delete-session-participants', sessionId)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      })
      .catch(err => { console.error('[Preload] deleteSessionParticipants error:', err); throw err; }),

    // Update meeting notes with participant names
    updateNotesWithParticipants: (sessionId, meetingNoteId) => ipcRenderer.invoke('participants:update-notes', sessionId, meetingNoteId)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      })
      .catch(err => { console.error('[Preload] updateNotesWithParticipants error:', err); throw err; }),

    // Listeners
    onParticipantsSaved: (callback) => ipcRenderer.on('participants:saved', (event, data) => callback(data)),
    removeOnParticipantsSaved: (callback) => ipcRenderer.removeListener('participants:saved', callback),
    onError: (callback) => ipcRenderer.on('participants:error', (event, data) => callback(data)),
    removeOnError: (callback) => ipcRenderer.removeListener('participants:error', callback)
  },

  // Phase 2.2 - Email Generation
  email: {
    // Generate follow-up email using AI
    generateFollowUp: (sessionId, options = {}) => ipcRenderer.invoke('email:generate-followup', sessionId, options)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result.emailData;
      }),

    // Generate quick email template (without AI)
    generateTemplate: (sessionId, templateType = 'brief') => ipcRenderer.invoke('email:generate-template', sessionId, templateType)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result.emailData;
      }),

    // Copy email to clipboard
    copyToClipboard: (content, format = 'text') => ipcRenderer.invoke('email:copy-to-clipboard', content, format)
      .then(result => result.success),

    // Open email in default mail client
    openInMailClient: (emailData) => ipcRenderer.invoke('email:open-in-mail-client', emailData)
      .then(result => result.success)
  },

  // Phase 2.3 - Advanced Task Management
  tasks: {
    // Auto-assign emails from participants
    autoAssignEmails: (sessionId) => ipcRenderer.invoke('tasks:auto-assign-emails', sessionId)
      .then(result => result),

    // Update task
    updateTask: (taskId, updates) => ipcRenderer.invoke('tasks:update', taskId, updates)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      }),

    // Change task status
    changeStatus: (taskId, newStatus, metadata = {}) => ipcRenderer.invoke('tasks:change-status', taskId, newStatus, metadata)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      }),

    // Get tasks by status
    getByStatus: (sessionId, status) => ipcRenderer.invoke('tasks:get-by-status', sessionId, status)
      .then(result => result.success ? result.tasks : []),

    // Get overdue tasks
    getOverdue: (sessionId = null) => ipcRenderer.invoke('tasks:get-overdue', sessionId)
      .then(result => result.success ? result.tasks : []),

    // Get upcoming tasks
    getUpcoming: (days = 7, sessionId = null) => ipcRenderer.invoke('tasks:get-upcoming', days, sessionId)
      .then(result => result.success ? result.tasks : []),

    // Set reminder
    setReminder: (taskId, reminderDate) => ipcRenderer.invoke('tasks:set-reminder', taskId, reminderDate)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      }),

    // Add tags
    addTags: (taskId, tags) => ipcRenderer.invoke('tasks:add-tags', taskId, tags)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      }),

    // Get statistics
    getStatistics: (sessionId) => ipcRenderer.invoke('tasks:get-statistics', sessionId)
      .then(result => result.success ? result.stats : null),

    // Export to CSV
    exportToCSV: (sessionId) => ipcRenderer.invoke('tasks:export-csv', sessionId)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        return result;
      }),

    // Phase 2.4 - Follow-up Suggestions
    generateSuggestions: (sessionId, options = {}) => ipcRenderer.invoke('tasks:generate-suggestions', sessionId, options)
      .then(result => result.success ? result.suggestions : []),

    acceptSuggestion: (sessionId, suggestion) => ipcRenderer.invoke('tasks:accept-suggestion', sessionId, suggestion)
      .then(result => result),

    dismissSuggestion: (sessionId, suggestionType) => ipcRenderer.invoke('tasks:dismiss-suggestion', sessionId, suggestionType)
      .then(result => result)
  },

  // Phase 3: Live Insights - Real-time Meeting Intelligence
  insights: {
    // Get all insights for current session
    getAll: () => ipcRenderer.invoke('insights:get-all')
      .then(result => result.success ? result.insights : []),

    // Get active (non-dismissed) insights
    getActive: () => ipcRenderer.invoke('insights:get-active')
      .then(result => result.success ? result.insights : []),

    // Get insights by type
    getByType: (type) => ipcRenderer.invoke('insights:get-by-type', type)
      .then(result => result.success ? result.insights : []),

    // Get insights by priority
    getByPriority: (priority) => ipcRenderer.invoke('insights:get-by-priority', priority)
      .then(result => result.success ? result.insights : []),

    // Get recent insights
    getRecent: (count = 5) => ipcRenderer.invoke('insights:get-recent', count)
      .then(result => result.success ? result.insights : []),

    // Get high priority insights
    getHighPriority: () => ipcRenderer.invoke('insights:get-high-priority')
      .then(result => result.success ? result.insights : []),

    // Get session statistics
    getStatistics: () => ipcRenderer.invoke('insights:get-statistics')
      .then(result => result.success ? result.stats : null),

    // Dismiss an insight
    dismiss: (insightId) => ipcRenderer.invoke('insights:dismiss', insightId)
      .then(result => result),

    // Save insight to database
    save: (insightData) => ipcRenderer.invoke('insights:save', insightData)
      .then(result => result),

    // Get saved insights from database by session
    getFromDb: (sessionId) => ipcRenderer.invoke('insights:get-from-db', sessionId)
      .then(result => result.success ? result.insights : []),

    // Get database statistics for a session
    getDbStatistics: (sessionId) => ipcRenderer.invoke('insights:get-db-statistics', sessionId)
      .then(result => result.success ? result.stats : null),

    // Phase 3.4: AI-Powered Analysis
    // Generate intelligent summary of conversation
    generateSummary: () => ipcRenderer.invoke('insights:generate-summary')
      .then(result => result.success ? result.summary : null),

    // Get context summary from AI analysis
    getContextSummary: () => ipcRenderer.invoke('insights:get-context-summary')
      .then(result => result.success ? result.context : null),

    // Event listeners
    onInsightDetected: (callback) => ipcRenderer.on('insight-detected', (event, data) => callback(data)),
    removeOnInsightDetected: (callback) => ipcRenderer.removeListener('insight-detected', callback),

    onInsightDismissed: (callback) => ipcRenderer.on('insight-dismissed', (event, data) => callback(data)),
    removeOnInsightDismissed: (callback) => ipcRenderer.removeListener('insight-dismissed', callback)
  },

  // Phase 3.3: Notifications
  notifications: {
    // Get all notifications
    getAll: () => ipcRenderer.invoke('notifications:get-all')
      .then(result => result.success ? result.notifications : []),

    // Get unread notifications
    getUnread: () => ipcRenderer.invoke('notifications:get-unread')
      .then(result => result.success ? result.notifications : []),

    // Get unread count
    getUnreadCount: () => ipcRenderer.invoke('notifications:get-unread-count')
      .then(result => result.success ? result.count : 0),

    // Mark notification as read
    markAsRead: (notificationId) => ipcRenderer.invoke('notifications:mark-as-read', notificationId)
      .then(result => result.success),

    // Mark all as read
    markAllAsRead: () => ipcRenderer.invoke('notifications:mark-all-as-read')
      .then(result => result.success),

    // Clear notification
    clear: (notificationId) => ipcRenderer.invoke('notifications:clear', notificationId)
      .then(result => result.success),

    // Clear all notifications
    clearAll: () => ipcRenderer.invoke('notifications:clear-all')
      .then(result => result.success),

    // Get preferences
    getPreferences: () => ipcRenderer.invoke('notifications:get-preferences')
      .then(result => result.success ? result.preferences : null),

    // Update preferences
    updatePreferences: (preferences) => ipcRenderer.invoke('notifications:update-preferences', preferences)
      .then(result => result.success),

    // Enable/disable notifications
    setEnabled: (enabled) => ipcRenderer.invoke('notifications:set-enabled', enabled)
      .then(result => result.success),

    // Get by type
    getByType: (type) => ipcRenderer.invoke('notifications:get-by-type', type)
      .then(result => result.success ? result.notifications : []),

    // Get by priority
    getByPriority: (priority) => ipcRenderer.invoke('notifications:get-by-priority', priority)
      .then(result => result.success ? result.notifications : []),

    // Event listeners
    onNotification: (callback) => ipcRenderer.on('notification', (event, data) => callback(data)),
    removeOnNotification: (callback) => ipcRenderer.removeListener('notification', callback),

    onNotificationRead: (callback) => ipcRenderer.on('notification-read', (event, data) => callback(data)),
    removeOnNotificationRead: (callback) => ipcRenderer.removeListener('notification-read', callback),

    onAllRead: (callback) => ipcRenderer.on('all-notifications-read', (event) => callback()),
    removeOnAllRead: (callback) => ipcRenderer.removeListener('all-notifications-read', callback),

    onNotificationCleared: (callback) => ipcRenderer.on('notification-expired', (event, data) => callback(data)),
    removeOnNotificationCleared: (callback) => ipcRenderer.removeListener('notification-expired', callback),

    onAllCleared: (callback) => ipcRenderer.on('all-notifications-cleared', (event) => callback()),
    removeOnAllCleared: (callback) => ipcRenderer.removeListener('all-notifications-cleared', callback)
  },

  // Phase 4: Analytics
  analytics: {
    // Get overview statistics
    getOverview: (options = {}) => ipcRenderer.invoke('analytics:get-overview', options)
      .then(result => result.success ? result.stats : null),

    // Get session analytics
    getSession: (sessionId) => ipcRenderer.invoke('analytics:get-session', sessionId)
      .then(result => result.success ? result.analytics : null),

    // Get trending topics
    getTrendingTopics: (options = {}) => ipcRenderer.invoke('analytics:get-trending-topics', options)
      .then(result => result.success ? result.topics : []),

    // Get productivity trends
    getProductivityTrends: (options = {}) => ipcRenderer.invoke('analytics:get-productivity-trends', options)
      .then(result => result.success ? result.trends : []),

    // Compare sessions
    compareSessions: (sessionId1, sessionId2) => ipcRenderer.invoke('analytics:compare-sessions', sessionId1, sessionId2)
      .then(result => result.success ? result.comparison : null)
  },

  // Phase 2: Memory Dashboard
  memory: {
    // Get memory statistics
    getStats: () => ipcRenderer.invoke('memory:get-stats'),

    // Get timeline data
    getTimeline: (days = 30) => ipcRenderer.invoke('memory:get-timeline', { days }),

    // Get knowledge graph statistics
    getKnowledgeGraphStats: () => ipcRenderer.invoke('memory:get-knowledge-graph-stats'),

    // Search indexed content
    search: (query, filters = {}) => ipcRenderer.invoke('memory:search', { query, filters }),

    // Get specific content by ID
    getContent: (contentId) => ipcRenderer.invoke('memory:get-content', { contentId }),

    // Delete indexed content
    deleteContent: (contentId) => ipcRenderer.invoke('memory:delete-content', { contentId }),

    // Manually index a conversation session
    indexSession: (sessionId) => ipcRenderer.invoke('memory:index-session', { sessionId }),

    // Manually index an audio session
    indexAudio: (sessionId) => ipcRenderer.invoke('memory:index-audio', { sessionId }),

    // Get knowledge graph data
    getKnowledgeGraph: (limit = 100) => ipcRenderer.invoke('memory:get-knowledge-graph', { limit }),

    // Get projects list
    getProjects: () => ipcRenderer.invoke('memory:get-projects')
  },

  // Phase 3: License & Feature Gates
  license: {
    // Get current license info
    getInfo: () => ipcRenderer.invoke('license:get-info'),

    // Activate a license key
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),

    // Deactivate current license
    deactivate: () => ipcRenderer.invoke('license:deactivate'),

    // Refresh license from server
    refresh: () => ipcRenderer.invoke('license:refresh'),

    // Check if a specific feature is available
    checkFeature: (featureName) => ipcRenderer.invoke('license:check-feature', featureName),

    // Check cloud sync availability
    canUseCloudSync: () => ipcRenderer.invoke('license:can-use-cloud-sync'),

    // Check enterprise gateway availability
    canUseEnterpriseGateway: () => ipcRenderer.invoke('license:can-use-enterprise-gateway'),

    // Check advanced agents availability
    canUseAdvancedAgents: () => ipcRenderer.invoke('license:can-use-advanced-agents'),

    // Get all feature availability at once
    getAllFeatures: () => ipcRenderer.invoke('license:get-all-features'),

    // Listen for upgrade needed events
    onUpgradeNeeded: (callback) => {
      ipcRenderer.on('license:upgrade-needed', (event, data) => callback(data));
      ipcRenderer.invoke('license:on-upgrade-needed');
    },

    // Remove upgrade listener
    removeUpgradeListener: () => {
      ipcRenderer.removeAllListeners('license:upgrade-needed');
    }
  },

  // Phase 3: Cloud Sync
  sync: {
    // Start automatic cloud sync
    start: () => ipcRenderer.invoke('sync:start'),

    // Stop automatic cloud sync
    stop: () => ipcRenderer.invoke('sync:stop'),

    // Force immediate sync
    force: () => ipcRenderer.invoke('sync:force'),

    // Get current sync status
    getStatus: () => ipcRenderer.invoke('sync:get-status'),

    // Get sync statistics
    getStats: () => ipcRenderer.invoke('sync:get-stats'),

    // Check if sync is available
    isAvailable: () => ipcRenderer.invoke('sync:is-available'),

    // Get pending conflicts
    getConflicts: () => ipcRenderer.invoke('sync:get-conflicts'),

    // Resolve a sync conflict
    resolveConflict: (conflictId, resolution) => ipcRenderer.invoke('sync:resolve-conflict', { conflictId, resolution }),

    // Listen for sync status changes
    onStatusChanged: (callback) => ipcRenderer.on('sync:status-changed', (event, status) => callback(status)),

    // Remove status change listener
    removeStatusListener: () => ipcRenderer.removeAllListeners('sync:status-changed')
  },

  // Phase 3: Enterprise Gateway
  enterprise: {
    // Connect to enterprise gateway
    connect: (gatewayToken) => ipcRenderer.invoke('enterprise:connect', { gatewayToken }),

    // Disconnect from gateway
    disconnect: () => ipcRenderer.invoke('enterprise:disconnect'),

    // Get connection status
    getStatus: () => ipcRenderer.invoke('enterprise:get-status'),

    // Get available databases
    getDatabases: () => ipcRenderer.invoke('enterprise:get-databases'),

    // Get database schema
    getSchema: (database) => ipcRenderer.invoke('enterprise:get-schema', { database }),

    // Get table details
    getTableDetails: (database, table) => ipcRenderer.invoke('enterprise:get-table-details', { database, table }),

    // Ask a question in natural language
    ask: (question, database) => ipcRenderer.invoke('enterprise:ask', { question, database }),

    // Execute raw SQL query
    executeSql: (sql, database) => ipcRenderer.invoke('enterprise:execute-sql', { sql, database }),

    // Get query history
    getHistory: (limit = 50) => ipcRenderer.invoke('enterprise:get-history', { limit }),

    // Clear query history
    clearHistory: () => ipcRenderer.invoke('enterprise:clear-history'),

    // Get query statistics
    getStats: () => ipcRenderer.invoke('enterprise:get-stats')
  }
});