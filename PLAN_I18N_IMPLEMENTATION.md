# Plan d'implémentation : Système i18n centralisé pour Lucidi

## Option B : Architecture i18n + Traduction complète en français

### Objectifs
1. Créer un système i18n centralisé et maintenable
2. Traduire tous les textes anglais (~85 strings) en français
3. Définir le français comme langue par défaut
4. Permettre l'ajout facile de nouvelles langues à l'avenir

---

## Phase 1 : Création du système i18n

### 1.1 Structure des fichiers de traduction

**Créer le dossier :** `/src/ui/i18n/`

**Fichiers à créer :**
```
/src/ui/i18n/
  ├── index.js           # Service i18n principal
  ├── locales/
  │   ├── fr.js          # Traductions françaises (défaut)
  │   └── en.js          # Traductions anglaises (fallback)
  └── useTranslation.js  # Hook personnalisé pour Lit Element
```

### 1.2 Structure du fichier de traduction français (`fr.js`)

```javascript
export const fr = {
  // En-têtes et navigation
  header: {
    question: 'Question',
    toggleVisibility: 'Afficher/Masquer',
    listen: 'Écouter',
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
    microphoneGranted: 'Accès au microphone autorisé',
    grantScreen: 'Autoriser l\'enregistrement d\'écran',
    screenGranted: 'Enregistrement d\'écran autorisé',
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
```

### 1.3 Service i18n principal (`index.js`)

```javascript
import fr from './locales/fr.js';
import en from './locales/en.js';

class I18nService {
  constructor() {
    this.currentLocale = 'fr'; // Français par défaut
    this.translations = { fr, en };
    this.fallbackLocale = 'en';
  }

  setLocale(locale) {
    if (this.translations[locale]) {
      this.currentLocale = locale;
      localStorage.setItem('selectedLanguage', locale);
      // Émettre un événement pour que les composants se mettent à jour
      window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
    }
  }

  getLocale() {
    return this.currentLocale;
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.currentLocale];

    // Naviguer dans l'objet de traduction
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    // Fallback vers la langue par défaut si non trouvé
    if (value === undefined) {
      value = this.translations[this.fallbackLocale];
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
    }

    // Si toujours non trouvé, retourner la clé
    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Remplacer les paramètres (ex: ${provider})
    if (typeof value === 'string') {
      return value.replace(/\${(\w+)}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  }
}

// Instance singleton
export const i18n = new I18nService();

// Export de la fonction t() pour un accès facile
export const t = (key, params) => i18n.t(key, params);
```

### 1.4 Hook pour Lit Element (`useTranslation.js`)

```javascript
import { i18n } from './index.js';

/**
 * Mixin pour ajouter les fonctionnalités i18n aux composants Lit Element
 */
export const TranslationMixin = (superClass) => class extends superClass {
  constructor() {
    super();
    this._handleLocaleChange = this._handleLocaleChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('locale-changed', this._handleLocaleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('locale-changed', this._handleLocaleChange);
  }

  _handleLocaleChange() {
    this.requestUpdate();
  }

  t(key, params) {
    return i18n.t(key, params);
  }
};
```

---

## Phase 2 : Migration des composants

### 2.1 Ordre de migration (par priorité)

1. **PermissionHeader.js** (14 strings - HAUTE priorité)
2. **ApiKeyHeader.js** (23 strings - HAUTE priorité)
3. **MainHeader.js** (2 strings - HAUTE priorité)
4. **AskView.js** (10 strings - HAUTE priorité)
5. **ShortcutSettingsView.js** (14 strings - MOYENNE priorité)
6. **SettingsView.js** (15 strings - MOYENNE priorité)
7. **ListenView.js** (quelques strings restantes - BASSE priorité)
8. **DocumentsView.js** (1 string - BASSE priorité)

### 2.2 Exemple de migration d'un composant

**AVANT (PermissionHeader.js) :**
```javascript
render() {
  return html`
    <div class="title">Permission Setup Required</div>
    <div class="subtitle">Grant access to microphone, screen recording...</div>
  `;
}
```

**APRÈS (avec i18n) :**
```javascript
import { TranslationMixin } from '../i18n/useTranslation.js';
import { LitElement } from '../assets/lit-core-2.7.4.min.js';

export class PermissionHeader extends TranslationMixin(LitElement) {
  render() {
    return html`
      <div class="title">${this.t('permissions.title')}</div>
      <div class="subtitle">${this.t('permissions.subtitle')}</div>
    `;
  }
}
```

---

## Phase 3 : Configuration de la langue par défaut

### 3.1 Modifier LucideApp.js

**Fichier :** `/src/ui/app/LucideApp.js`

**AVANT (ligne 59) :**
```javascript
this.selectedLanguage = lang || 'en';
```

**APRÈS :**
```javascript
this.selectedLanguage = lang || 'fr'; // Français par défaut
```

### 3.2 Initialiser i18n au démarrage

**Dans LucideApp.js constructor :**
```javascript
import { i18n } from '../i18n/index.js';

constructor() {
  super();

  // Initialiser la langue
  const savedLang = localStorage.getItem('selectedLanguage') || 'fr';
  i18n.setLocale(savedLang);
  this.selectedLanguage = savedLang;

  // ... reste du code
}
```

---

## Phase 4 : Tests et validation

### 4.1 Checklist de validation

- [ ] Tous les textes anglais sont traduits
- [ ] Les traductions françaises sont naturelles et cohérentes
- [ ] Les paramètres dynamiques (${provider}, ${email}, etc.) fonctionnent
- [ ] La langue par défaut est bien le français
- [ ] Aucune régression dans l'interface
- [ ] Les composants se mettent à jour lors du changement de langue
- [ ] Les clés manquantes sont loggées dans la console
- [ ] Fallback vers l'anglais fonctionne si une clé manque

### 4.2 Tests manuels

1. **Test de démarrage :**
   - Démarrer l'application fraîchement installée
   - Vérifier que tout est en français

2. **Test de changement de langue :**
   - Changer la langue dans les paramètres
   - Vérifier que tous les composants se mettent à jour

3. **Test des paramètres dynamiques :**
   - Afficher un message avec email : "Compte : user@example.com"
   - Vérifier que le nom du provider s'affiche correctement dans les placeholders

4. **Test des erreurs :**
   - Vérifier que les messages d'erreur sont en français
   - Vérifier les tooltips et placeholders

---

## Phase 5 : Documentation

### 5.1 Guide d'utilisation pour les développeurs

Créer `/docs/I18N_GUIDE.md` avec :
- Comment ajouter une nouvelle traduction
- Comment ajouter une nouvelle langue
- Comment utiliser les paramètres dynamiques
- Conventions de nommage des clés

### 5.2 Guide pour ajouter une langue

```markdown
## Ajouter une nouvelle langue

1. Créer `/src/ui/i18n/locales/[code-langue].js`
2. Copier la structure de `fr.js`
3. Traduire tous les textes
4. Importer dans `/src/ui/i18n/index.js`
5. Ajouter au sélecteur de langue dans SettingsView
```

---

## Estimation du temps

| Phase | Durée estimée |
|-------|---------------|
| Phase 1 : Création du système i18n | 1-2 heures |
| Phase 2 : Migration des composants | 2-3 heures |
| Phase 3 : Configuration langue par défaut | 30 minutes |
| Phase 4 : Tests et validation | 1-2 heures |
| Phase 5 : Documentation | 30 minutes |
| **TOTAL** | **5-8 heures** |

---

## Avantages de l'Option B

✅ **Architecture maintenable** : Toutes les traductions centralisées
✅ **Facilité d'ajout de langues** : Ajouter simplement un nouveau fichier
✅ **Type-safe** : Possibilité d'ajouter du TypeScript plus tard
✅ **Performance** : Traductions chargées une seule fois
✅ **Réactivité** : Changement de langue en temps réel
✅ **Fallback intelligent** : Retour à l'anglais si traduction manquante
✅ **DX améliorée** : Utilisation simple avec `t('cle')`

---

## Fichiers à créer

```
/src/ui/i18n/
  ├── index.js                    (nouveau)
  ├── useTranslation.js           (nouveau)
  └── locales/
      ├── fr.js                   (nouveau)
      └── en.js                   (nouveau)

/docs/
  └── I18N_GUIDE.md              (nouveau)
```

## Fichiers à modifier

```
/src/ui/app/LucideApp.js           (import i18n, init locale)
/src/ui/app/PermissionHeader.js    (migration vers i18n)
/src/ui/app/ApiKeyHeader.js        (migration vers i18n)
/src/ui/app/MainHeader.js          (migration vers i18n)
/src/ui/ask/AskView.js             (migration vers i18n)
/src/ui/settings/SettingsView.js   (migration vers i18n)
/src/ui/settings/ShortcutSettingsView.js (migration vers i18n)
/src/ui/documents/DocumentsView.js (migration vers i18n)
/src/ui/listen/ListenView.js       (migration vers i18n si nécessaire)
```

---

## Prochaines étapes

1. Valider ce plan avec l'équipe
2. Créer les fichiers de base du système i18n
3. Migrer progressivement les composants (par ordre de priorité)
4. Tester à chaque étape
5. Déployer avec documentation complète
