/**
 * English translations for Lucidi
 * @module i18n/locales/en
 */

export const en = {
  // Headers and navigation
  header: {
    question: 'Question',
    toggleVisibility: 'Show/Hide',
    listen: 'Listen',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    done: 'Done',
  },

  // Permissions
  permissions: {
    title: 'Permission Setup Required',
    subtitle: 'Grant access to microphone, screen recording and keychain to continue',
    microphone: 'Microphone',
    microphoneGranted: 'Microphone ✓',
    screen: 'Screen Recording',
    screenGranted: 'Screen Recording ✓',
    encryption: 'Data Encryption',
    encryptionGranted: 'Data Encryption ✓',
    grantMicrophone: 'Grant Microphone Access',
    microphoneAccessGranted: 'Microphone Access Granted',
    grantScreen: 'Grant Screen Recording Access',
    screenRecordingGranted: 'Screen Recording Granted',
    enableEncryption: 'Enable Encryption',
    encryptionEnabled: 'Encryption Enabled',
    keychainInstructions: 'Stores the key to encrypt your data. Press "Always Allow" to continue.',
  },

  // API Configuration
  apiKey: {
    title: 'Use Personal API keys',
    back: 'Back',
    selectLLMProvider: '1. Select LLM Provider',
    enterAPIKey: '2. Enter API Key',
    selectSTTProvider: '3. Select STT Provider',
    enterSTTAPIKey: '4. Enter STT API Key',
    modelNamePlaceholder: 'Model name (press Enter to install)',
    enterYourKey: 'Enter your ${provider} API key',
    enterSTTKey: 'Enter your STT API key',
    selectModel: 'Select a model...',
    sttNotSupported: 'STT not supported by Ollama',
    whisperTiny: 'Whisper Tiny (39M)',
    whisperBase: 'Whisper Base (74M)',
    whisperSmall: 'Whisper Small (244M)',
    whisperMedium: 'Whisper Medium (769M)',
    settingUp: 'Setting up...',
    installing: 'Installing ${model}...',
    downloading: 'Downloading...',
    confirm: 'Confirm',
    getAPIKey: 'Get your API key from: OpenAI | Google | Anthropic',
    seeDetails: 'See details',
    installOllama: 'Install Ollama',
    startOllama: 'Start Ollama Service',
    retryConnection: 'Retry Connection',
    connectionFailed: 'Connection failed',
    unknownState: 'Unknown state - Please refresh',
  },

  // Ask View
  ask: {
    aiResponse: 'AI Response',
    placeholder: 'Ask a question about your screen or audio',
    send: 'Send',
    thinking: 'Thinking...',
    analyzing: 'analyzing screen...',
    backToConversation: 'Back to conversation',
    hide: 'Hide',
    close: 'Close',
    back: 'Back',
    forward: 'Forward',
    returnToConversation: 'Return to conversation',
  },

  // Listen View
  listen: {
    liveInsights: 'Live Insights',
    aiSuggestions: 'AI Suggestions',
    copyTranscript: 'Copy Transcript',
    copyInsights: 'Copy Lucide Insights',
    lucideListening: 'Lucide Listening',
    showTranscript: 'Show Transcript',
    showInsights: 'Show Insights',
    close: 'Close',
  },

  // Settings
  settings: {
    loading: 'Loading...',
    appTitle: 'Lucide',
    accountNotConnected: 'Account: Not Connected',
    accountConnected: 'Account: ${email}',
    shortcuts: {
      toggleVisibility: 'Show / Hide',
      askQuestion: 'Ask Question',
      scrollUp: 'Scroll Up',
      scrollDown: 'Scroll Down',
    },
    editShortcuts: 'Edit Shortcuts',
    myPresets: 'My Presets',
    noPresets: 'No custom presets.',
    createFirstPreset: 'Create your first preset',
    selected: 'Selected',
    customizeNotes: 'Customize / Meeting Notes',
    autoUpdatesOn: 'Auto Updates: Enabled',
    autoUpdatesOff: 'Auto Updates: Disabled',
    moveLeft: '← Move',
    moveRight: 'Move →',
    disableInvisibility: 'Disable Invisibility',
    enableInvisibility: 'Enable Invisibility',
    logout: 'Logout',
    login: 'Login',
    quit: 'Quit',
    save: 'Save',
    clear: 'Clear',
    changeLLMModel: 'Change LLM Model',
    changeSTTModel: 'Change STT Model',
    installed: '✓ Installed',
    clickToInstall: 'Click to Install',
    notInstalled: 'Not Installed',
    llmModel: 'LLM Model: ',
    sttModel: 'STT Model: ',
    notSet: 'Not Set',
    lucyMode: 'Lucy Mode',
    apiKeyLabel: '${provider} API Key',
    usingLucideKey: 'Using Lucide Key',
    enterAPIKeyPlaceholder: 'Enter ${provider} API key',
    ollamaActive: '✓ Ollama is Active',
    stopOllama: 'Stop Ollama Service',
    ollamaInstalledNotActive: '⚠ Ollama Installed but Not Active',
    startOllama: 'Start Ollama',
    ollamaNotInstalled: '✗ Ollama Not Installed',
    installOllama: 'Install and Configure Ollama',
    whisperEnabled: '✓ Whisper is Enabled',
    disableWhisper: 'Disable Whisper',
    enableWhisper: 'Enable Whisper STT',
  },

  // Shortcut Editor
  shortcuts: {
    loading: 'Loading Shortcuts...',
    title: 'Edit Shortcuts',
    edit: 'Edit',
    disable: 'Disable',
    pressNew: 'Press new shortcut…',
    clickToEdit: 'Click to edit',
    cancel: 'Cancel',
    resetToDefault: 'Reset to Default',
    save: 'Save',
    errors: {
      needsModifier: 'Invalid shortcut: needs a modifier',
      maxKeys: 'Invalid shortcut: max 4 keys',
      systemReserved: 'Invalid shortcut: system reserved',
    },
    shortcutSet: 'Shortcut set',
    shortcutDisabled: 'Shortcut disabled',
    failedToSave: 'Failed to save shortcuts: ',
    failedToLoad: 'Failed to load default settings.',
    confirmReset: 'Are you sure you want to reset all shortcuts to their default values?',
  },

  // Documents
  documents: {
    searchPlaceholder: 'Search documents...',
  },

  // History
  history: {
    searchPlaceholder: 'Search conversations...',
  },

  // Common messages
  common: {
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
  },
};

export default en;
