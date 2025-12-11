/**
 * Traductions françaises pour Lucidi
 * @module i18n/locales/fr
 */

export const fr = {
  // En-têtes et navigation
  header: {
    question: 'Question',
    toggleVisibility: 'Afficher/Masquer',
    listen: 'Écouter',
    pause: 'Pause',
    resume: 'Reprendre',
    stop: 'Arrêter',
    done: 'Terminé',
  },

  // Permissions
  permissions: {
    title: 'Configuration des autorisations requise',
    subtitle: 'Autoriser l\'accès au microphone, enregistrement d\'écran et trousseau pour continuer',
    microphone: 'Microphone',
    microphoneGranted: 'Microphone ✓',
    screen: 'Enregistrement d\'écran',
    screenGranted: 'Enregistrement d\'écran ✓',
    encryption: 'Chiffrement des données',
    encryptionGranted: 'Chiffrement des données ✓',
    grantMicrophone: 'Autoriser l\'accès au microphone',
    microphoneAccessGranted: 'Accès au microphone autorisé',
    grantScreen: 'Autoriser l\'enregistrement d\'écran',
    screenRecordingGranted: 'Enregistrement d\'écran autorisé',
    enableEncryption: 'Activer le chiffrement',
    encryptionEnabled: 'Chiffrement activé',
    keychainInstructions: 'Stocke la clé pour chiffrer vos données. Appuyez sur "Toujours autoriser" pour continuer.',
  },

  // Configuration API
  apiKey: {
    title: 'Utiliser des clés API personnelles',
    back: 'Retour',
    selectLLMProvider: '1. Sélectionner le fournisseur LLM',
    enterAPIKey: '2. Entrer la clé API',
    selectSTTProvider: '3. Sélectionner le fournisseur STT',
    enterSTTAPIKey: '4. Entrer la clé API STT',
    modelNamePlaceholder: 'Nom du modèle (appuyez sur Entrée pour installer)',
    enterYourKey: 'Entrez votre clé API ${provider}',
    enterSTTKey: 'Entrez votre clé API STT',
    selectModel: 'Sélectionner un modèle...',
    sttNotSupported: 'STT non pris en charge par Ollama',
    whisperTiny: 'Whisper Tiny (39M)',
    whisperBase: 'Whisper Base (74M)',
    whisperSmall: 'Whisper Small (244M)',
    whisperMedium: 'Whisper Medium (769M)',
    settingUp: 'Configuration en cours...',
    installing: 'Installation de ${model}...',
    downloading: 'Téléchargement...',
    confirm: 'Confirmer',
    getAPIKey: 'Obtenez votre clé API depuis : OpenAI | Google | Anthropic',
    seeDetails: 'Voir les détails',
    installOllama: 'Installer Ollama',
    startOllama: 'Démarrer le service Ollama',
    retryConnection: 'Réessayer la connexion',
    connectionFailed: 'Échec de la connexion',
    unknownState: 'État inconnu - Veuillez actualiser',
  },

  // Vue Ask
  ask: {
    aiResponse: 'Réponse IA',
    placeholder: 'Posez une question sur votre écran ou audio',
    send: 'Envoyer',
    thinking: 'Réflexion...',
    analyzing: 'analyse de l\'écran...',
    backToConversation: 'Retour à la conversation',
    hide: 'Masquer',
    close: 'Fermer',
    back: 'Retour',
    forward: 'Avancer',
    returnToConversation: 'Revenir à la conversation',
  },

  // Vue Listen
  listen: {
    liveInsights: 'Analyses en direct',
    aiSuggestions: 'Suggestions IA',
    copyTranscript: 'Copier la transcription',
    copyInsights: 'Copier l\'analyse Lucide',
    lucideListening: 'Lucide écoute',
    showTranscript: 'Afficher la transcription',
    showInsights: 'Afficher les analyses',
    close: 'Fermer',
  },

  // Paramètres
  settings: {
    loading: 'Chargement...',
    appTitle: 'Lucide',
    accountNotConnected: 'Compte : Non connecté',
    accountConnected: 'Compte : ${email}',
    shortcuts: {
      toggleVisibility: 'Afficher / Masquer',
      askQuestion: 'Poser une question',
      scrollUp: 'Faire défiler vers le haut',
      scrollDown: 'Faire défiler vers le bas',
    },
    editShortcuts: 'Modifier les raccourcis',
    myPresets: 'Mes préréglages',
    noPresets: 'Aucun préréglage personnalisé.',
    createFirstPreset: 'Créer votre premier préréglage',
    selected: 'Sélectionné',
    customizeNotes: 'Personnaliser / Notes de réunion',
    autoUpdatesOn: 'Mises à jour automatiques : Activées',
    autoUpdatesOff: 'Mises à jour automatiques : Désactivées',
    moveLeft: '← Déplacer',
    moveRight: 'Déplacer →',
    disableInvisibility: 'Désactiver l\'invisibilité',
    enableInvisibility: 'Activer l\'invisibilité',
    logout: 'Déconnexion',
    login: 'Connexion',
    quit: 'Quitter',
    save: 'Enregistrer',
    clear: 'Effacer',
    changeLLMModel: 'Changer le modèle LLM',
    changeSTTModel: 'Changer le modèle STT',
    installed: '✓ Installé',
    clickToInstall: 'Cliquez pour installer',
    notInstalled: 'Non installé',
    llmModel: 'Modèle LLM : ',
    sttModel: 'Modèle STT : ',
    notSet: 'Non défini',
    lucyMode: 'Mode de Lucy',
    apiKeyLabel: 'Clé API ${provider}',
    usingLucideKey: 'Utilise la clé de Lucide',
    enterAPIKeyPlaceholder: 'Entrez la clé API ${provider}',
    ollamaActive: '✓ Ollama est actif',
    stopOllama: 'Arrêter le service Ollama',
    ollamaInstalledNotActive: '⚠ Ollama installé mais non actif',
    startOllama: 'Démarrer Ollama',
    ollamaNotInstalled: '✗ Ollama non installé',
    installOllama: 'Installer et configurer Ollama',
    whisperEnabled: '✓ Whisper est activé',
    disableWhisper: 'Désactiver Whisper',
    enableWhisper: 'Activer Whisper STT',
  },

  // Éditeur de raccourcis
  shortcuts: {
    loading: 'Chargement des raccourcis...',
    title: 'Modifier les raccourcis',
    edit: 'Modifier',
    disable: 'Désactiver',
    pressNew: 'Appuyez sur un nouveau raccourci…',
    clickToEdit: 'Cliquez pour modifier',
    cancel: 'Annuler',
    resetToDefault: 'Réinitialiser par défaut',
    save: 'Enregistrer',
    errors: {
      needsModifier: 'Raccourci invalide : nécessite un modificateur',
      maxKeys: 'Raccourci invalide : maximum 4 touches',
      systemReserved: 'Raccourci invalide : réservé par le système',
    },
    shortcutSet: 'Raccourci défini',
    shortcutDisabled: 'Raccourci désactivé',
    failedToSave: 'Échec de l\'enregistrement des raccourcis : ',
    failedToLoad: 'Échec du chargement des paramètres par défaut.',
    confirmReset: 'Êtes-vous sûr de vouloir réinitialiser tous les raccourcis à leurs valeurs par défaut ?',
  },

  // Documents
  documents: {
    searchPlaceholder: 'Rechercher des documents...',
  },

  // Historique
  history: {
    searchPlaceholder: 'Rechercher dans les conversations...',
  },

  // Messages communs
  common: {
    yes: 'Oui',
    no: 'Non',
    ok: 'OK',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
  },
};

export default fr;
