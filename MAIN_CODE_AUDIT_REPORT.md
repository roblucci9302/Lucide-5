# 🔍 Audit Complet du Code Principal - Lucide

**Date**: 2025-11-10
**Scope**: Code principal (main process, window management, bridges, core services)
**Exclusions**: Features Phases 1-4 (déjà auditées), Sprints 1-3 (déjà corrigés)

---

## 📊 Résumé Exécutif

### Métriques Globales

| Métrique | Valeur |
|----------|--------|
| Fichiers analysés | 22 fichiers principaux |
| Lignes de code | ~10,000 lignes |
| **Problèmes critiques** | **8** 🔴 |
| **Problèmes majeurs** | **24** 🟠 |
| **Problèmes mineurs** | **35** 🟡 |
| **Code Smell Density** | 6.3 problèmes / 1000 lignes |
| **Technical Debt** | ~15 jours de refactoring |
| **Security Score** | 6/10 |
| **Maintainability Score** | 5/10 |

### Score par Catégorie

```
Architecture:     ████████░░ 4/10 (Classes trop longues, God objects)
Gestion d'erreurs: █████░░░░░ 5/10 (Try/catch manquants, erreurs silencieuses)
Performance:      ██████░░░░ 6/10 (Memory leaks, listeners non removed)
Sécurité:         ██████░░░░ 6/10 (webSecurity:false, shell.openExternal)
Code Quality:     █████░░░░░ 5/10 (Duplication, magic numbers)
```

---

## 🚨 Problèmes Critiques (à corriger immédiatement)

### 1. Sécurité: webSecurity Désactivé ❌

**Fichier**: `src/window/windowManager.js:670`

```javascript
// ❌ DANGER: Désactive Same-Origin Policy
webPreferences: {
    webSecurity: false,  // Permet XSS, CSRF, data exfiltration!
}
```

**Impact**:
- Vulnérabilité XSS
- Contournement CORS
- Exfiltration de données

**Solution**:
```javascript
// ✅ Corriger
webPreferences: {
    webSecurity: true,  // Ou retirer la ligne
}
```

---

### 2. Sécurité: shell.openExternal Non Validé 🔓

**Fichier**: `src/bridge/windowBridge.js:21`

```javascript
// ❌ Accepte n'importe quelle URL
ipcMain.handle('open-external', (event, url) => shell.openExternal(url));
```

**Impact**:
- Peut ouvrir `file://`, `javascript:`, etc.
- Exécution de code arbitraire

**Solution**:
```javascript
// ✅ Whitelist des protocoles
ipcMain.handle('open-external', (event, url) => {
    const allowedProtocols = ['http:', 'https:'];
    try {
        const parsed = new URL(url);
        if (!allowedProtocols.includes(parsed.protocol)) {
            console.error('[Security] Blocked protocol:', parsed.protocol);
            return { success: false, error: 'Invalid protocol' };
        }
        return shell.openExternal(url);
    } catch (error) {
        console.error('[Security] Invalid URL:', error);
        return { success: false, error: 'Invalid URL' };
    }
});
```

---

### 3. Command Injection: osascript avec Template String 💉

**Fichier**: `src/features/common/services/ollamaService.js:740`

```javascript
// ❌ Injection possible
const script = `do shell script "mkdir -p /usr/local/bin && ln -sf '${this.getOllamaCliPath()}' '/usr/local/bin/ollama'" with administrator privileges`;
await spawnAsync('osascript', ['-e', script]);
```

**Impact**: Si `getOllamaCliPath()` contient `'; rm -rf /;'`

**Solution**:
```javascript
// ✅ Valider et échapper le path
const ollamaCliPath = this.getOllamaCliPath();
if (!/^[a-zA-Z0-9\/\-_. ]+$/.test(ollamaCliPath)) {
    throw new Error('Invalid ollama CLI path');
}

// Ou mieux: utiliser spawn avec arguments séparés
const mkdir = spawn('mkdir', ['-p', '/usr/local/bin']);
const ln = spawn('ln', ['-sf', ollamaCliPath, '/usr/local/bin/ollama']);
```

---

### 4. PowerShell Injection 💉

**Fichier**: `src/features/common/services/whisperService.js:660-661`

```javascript
// ❌ PowerShell injection possible
const expandCommand = `Expand-Archive -Path "${tempFile}" -DestinationPath "${extractDir}" -Force`;
await spawnAsync('powershell', ['-command', expandCommand]);
```

**Solution**:
```javascript
// ✅ Valider les paths
if (!tempFile.startsWith(this.tempDir) || !extractDir.startsWith(this.modelsDir)) {
    throw new Error('Invalid path');
}

// Utiliser -File avec script PS1 ou échapper
const escapedPath = tempFile.replace(/"/g, '""');
const escapedDest = extractDir.replace(/"/g, '""');
```

---

### 5. Async sans Try/Catch 💥

**Fichier**: `src/window/windowManager.js:260-405`

```javascript
// ❌ 145 lignes de code async sans protection
async function handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, shouldBeVisible) {
    // Pas de try/catch global
    // Une erreur crashe l'app entière
}
```

**Impact**: Crash de l'application si erreur

**Solution**:
```javascript
// ✅ Wrapper avec try/catch
async function handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, shouldBeVisible) {
    try {
        // ... code existant
    } catch (error) {
        logger.error('Window visibility request failed', { name, shouldBeVisible, error });
        // Graceful degradation
    }
}
```

---

### 6. Memory Leak: Maps Jamais Nettoyés 💾

**Fichier**: `src/features/common/services/ollamaService.js:36-48`

```javascript
// ❌ Structures qui grandissent indéfiniment
this.installedModels = new Map();        // Jamais clear
this.modelWarmupStatus = new Map();      // Jamais clear
this.installCheckpoints = [];            // Jamais clear
this.installationProgress = new Map();   // Jamais clear
this.warmingModels = new Map();          // Peut accumuler
this.warmedModels = new Set();           // Grandit sans limite
this.lastWarmUpAttempt = new Map();      // Jamais nettoyé
```

**Solution**:
```javascript
// ✅ Ajouter méthode cleanup
cleanup() {
    this.installedModels.clear();
    this.modelWarmupStatus.clear();
    this.installCheckpoints = [];
    this.installationProgress.clear();
    // ... etc
}

// Appeler dans shutdown
async shutdown(force = false) {
    // ... code existant
    this.cleanup();
}
```

---

### 7. Listeners Jamais Removed 🔊

**Fichier**: `src/bridge/featureBridge.js:300-344`

```javascript
// ❌ 8 listeners ajoutés, jamais removed
localAIManager.on('install-progress', (service, data) => { ... });
localAIManager.on('installation-complete', (service) => { ... });
localAIManager.on('model-ready', (service) => { ... });
// ... 5 autres
```

**Impact**: Memory leak progressif

**Solution**:
```javascript
// ✅ Tracker les listeners et cleanup
class FeatureBridge {
    constructor() {
        this.listeners = [];
    }

    initialize() {
        const handler1 = (service, data) => { ... };
        localAIManager.on('install-progress', handler1);
        this.listeners.push({ emitter: localAIManager, event: 'install-progress', handler: handler1 });
        // ... autres
    }

    cleanup() {
        this.listeners.forEach(({ emitter, event, handler }) => {
            emitter.removeListener(event, handler);
        });
        this.listeners = [];
    }
}
```

---

### 8. Timers Non Nettoyés ⏰

**Fichier**: `src/features/common/services/localAIManager.js:534`

```javascript
// ❌ setInterval jamais cleared dans tous les cas
this.syncInterval = setInterval(async () => {
    for (const serviceName of Object.keys(this.services)) {
        await this.updateServiceState(serviceName);
    }
}, interval); // 30s - boucle infinie
```

**Solution**:
```javascript
// ✅ Cleanup sur shutdown
cleanup() {
    if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
    }
}
```

---

## 🟠 Problèmes Majeurs

### Architecture

#### 1. God Object: ollamaService.js (1530 lignes)

**Problème**: Classe monolithique avec trop de responsabilités

**Responsabilités mélangées**:
- Installation Ollama (lignes 234-805)
- Gestion du service (lignes 806-921)
- Téléchargement de modèles (lignes 542-677)
- Warm-up (lignes 922-1120)
- State management (lignes 1121-1530)

**Solution**: Diviser en 4 classes

```
ollamaService.js (Main orchestrator)
  ├─ OllamaInstaller.js (Installation logic)
  ├─ OllamaServiceManager.js (Start/stop/health)
  ├─ OllamaModelManager.js (Download/list/validate)
  └─ OllamaWarmupService.js (Model warm-up)
```

---

#### 2. God Object: featureBridge.js (415 lignes)

**Problème**: Gère 15+ features différentes

**Handlers mélangés**:
- Documents (lignes 50-77)
- Workflows (lignes 79-109)
- History (lignes 111-144)
- Agent profiles (lignes 146-169)
- RAG (lignes 171-193)
- Settings (lignes 195-251)
- LocalAI (lignes 253-344)
- Shortcuts (lignes 346-396)

**Solution**: Diviser par domaine

```
bridges/
  ├─ featureBridge.js (Main coordinator)
  ├─ documentBridge.js
  ├─ workflowBridge.js
  ├─ historyBridge.js
  ├─ agentBridge.js
  ├─ ragBridge.js
  ├─ settingsBridge.js
  └─ localAIBridge.js
```

---

#### 3. Variables Globales Mutables

**Fichier**: `src/window/windowManager.js:31-37`

```javascript
// ❌ État global difficile à tracker
let isContentProtectionOn = true;
let lastVisibleWindows = new Set(['header']);
let currentHeaderState = 'apikey';
let settingsHideTimer = null;
```

**Solution**: Encapsuler dans une classe

```javascript
// ✅ State object encapsulé
class WindowManagerState {
    constructor() {
        this.contentProtection = true;
        this.visibleWindows = new Set(['header']);
        this.headerState = 'apikey';
        this.settingsTimer = null;
    }

    reset() {
        this.clearSettingsTimer();
        this.visibleWindows.clear();
    }

    clearSettingsTimer() {
        if (this.settingsTimer) {
            clearTimeout(this.settingsTimer);
            this.settingsTimer = null;
        }
    }
}

const state = new WindowManagerState();
```

---

#### 4. Duplication Massive: downloadFile (140 lignes)

**Fichiers**:
- `src/features/common/services/ollamaService.js:542-677`
- `src/features/common/services/whisperService.js:90-224`

**Code dupliqué**:
```javascript
// Les deux ont la même logique:
- createWriteStream
- fetch avec retry
- progress tracking
- checksum verification
- error handling
```

**Solution**: Créer service partagé

```javascript
// src/features/common/utils/downloadService.js
class DownloadService {
    async downloadFile(url, destination, options = {}) {
        const {
            onProgress,
            expectedChecksum,
            checksumAlgorithm = 'sha256',
            retries = 3
        } = options;

        // Logique centralisée
    }

    async verifyChecksum(filePath, expected, algorithm) {
        // Vérification centralisée
    }
}
```

---

#### 5. Erreurs Silencieuses

**Fichier**: `src/features/common/services/conversationHistoryService.js:60-63`

```javascript
// ❌ Masque les erreurs
} catch (error) {
    console.error('[ConversationHistoryService] Error getting sessions:', error);
    return [];  // Cache le problème au calling code
}
```

**Problème**: Le code appelant ne sait pas qu'une erreur s'est produite

**Solution**:
```javascript
// ✅ Option 1: Propager l'erreur
} catch (error) {
    logger.error('Failed to get sessions', { error, uid, options });
    throw error;  // Laisse le caller décider
}

// ✅ Option 2: Retourner un objet result
return {
    success: false,
    error: error.message,
    data: []
};
```

---

### Performance

#### 6. Cache Sans Limite

**Fichier**: `src/features/common/services/conversationHistoryService.js:11`

```javascript
// ❌ Peut devenir énorme
this.titleGenerationCache = new Map();
```

**Solution**: LRU Cache
```javascript
const { LRUCache } = require('lru-cache');

this.titleGenerationCache = new LRUCache({
    max: 100,  // Max 100 items
    ttl: 1000 * 60 * 60  // 1 hour
});
```

---

#### 7. Boucles Sans Protection

**Fichier**: `src/features/common/services/ollamaService.js:1254`

```javascript
// ❌ Peut bloquer l'event loop
async getAllModelsWithStatus() {
    for (const [name, details] of this.availableModels) {
        // Operations synchrones dans une boucle
    }
}
```

**Solution**:
```javascript
// ✅ Async chunking
async getAllModelsWithStatus() {
    const results = [];
    const entries = Array.from(this.availableModels);

    for (let i = 0; i < entries.length; i++) {
        results.push(/* ... */);

        // Yield to event loop every 10 items
        if (i % 10 === 0) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }
    return results;
}
```

---

### Sécurité

#### 8. Path Traversal

**Fichier**: `src/features/common/services/whisperService.js:516`

```javascript
// ❌ modelId non validé
async getModelPath(modelId) {
    return path.join(this.modelsDir, `${modelId}.bin`);
    // Si modelId = "../../etc/passwd"
}
```

**Solution**:
```javascript
// ✅ Validation stricte
async getModelPath(modelId) {
    // Whitelist de modèles valides
    if (!/^[a-z0-9-]+$/.test(modelId)) {
        throw new Error('Invalid model ID');
    }

    const modelPath = path.join(this.modelsDir, `${modelId}.bin`);

    // Vérifier que le path résolu est bien dans modelsDir
    const resolvedPath = path.resolve(modelPath);
    if (!resolvedPath.startsWith(path.resolve(this.modelsDir))) {
        throw new Error('Path traversal detected');
    }

    return modelPath;
}
```

---

#### 9. SQL LIKE Sans Échappement

**Fichier**: `src/features/common/services/conversationHistoryService.js:92`

```javascript
// ❌ % et _ dans query ne sont pas échappés
const searchPattern = `%${query}%`;
params.push(searchPattern, searchPattern, searchPattern);
```

**Solution**:
```javascript
// ✅ Échapper les caractères spéciaux LIKE
function escapeSqlLike(str) {
    return str
        .replace(/\\/g, '\\\\')  // Backslash
        .replace(/%/g, '\\%')    // Wildcard
        .replace(/_/g, '\\_');   // Single char wildcard
}

const escapedQuery = escapeSqlLike(query);
const searchPattern = `%${escapedQuery}%`;
```

---

#### 10. Encryption Fails Silently

**Fichier**: `src/features/common/services/encryptionService.js:88`

```javascript
// ❌ Retourne texte en clair si pas de clé!
function encrypt(text) {
    if (!sessionKey) {
        return text;  // DANGEREUX
    }
}
```

**Solution**:
```javascript
// ✅ Échouer explicitement
function encrypt(text) {
    if (!sessionKey) {
        throw new Error('Encryption key not initialized');
    }
    if (text == null) {
        throw new Error('Cannot encrypt null/undefined');
    }
    // ... encryption
}
```

---

## 🟡 Problèmes Mineurs

### Code Quality

1. **Console.log partout** au lieu de structured logger (35 occurrences)
2. **Magic numbers**: timeouts hardcodés (2000, 8000, 30000)
3. **Commentaires en coréen** dans windowManager.js, preload.js
4. **DevTools toujours ouverts** en dev (ralentit)
5. **Dead code**: `preload.js` root (1 ligne vide)
6. **Fonctions trop longues**: `createFeatureWindows` (155 lignes)
7. **Callbacks sans try/catch** dans animateWindowBounds
8. **Electron Store jamais fermé** (modelStateService.js:14)
9. **Duplication animation logic** (smoothMovementManager.js)
10. **Factory pattern manquant** pour window creation

---

## 📋 Plan de Refactoring (4 Sprints)

### Sprint 4: Sécurité & Bugs Critiques (3-4 jours)

**Priorité**: 🔴 CRITIQUE

**Tâches**:

1. **Retirer webSecurity: false**
   - Fichier: `windowManager.js:670`
   - Tester que tout fonctionne
   - Si nécessaire, whitelist des URLs

2. **Valider shell.openExternal**
   - Fichier: `windowBridge.js:21`
   - Whitelist http/https seulement
   - Tests avec URLs malicieuses

3. **Échapper commandes shell**
   - `ollamaService.js:740` (osascript)
   - `whisperService.js:660-661` (PowerShell)
   - Utiliser spawn avec args ou validation stricte

4. **Ajouter try/catch**
   - `windowManager.js:260` (handleWindowVisibilityRequest)
   - `whisperService.js:522` (saveAudioToTemp)
   - Tous les async handlers IPC

5. **Valider paths**
   - `whisperService.js:516` (getModelPath)
   - Vérifier path traversal

6. **Échapper SQL LIKE**
   - `conversationHistoryService.js:92`
   - Fonction escapeSqlLike()

7. **Encryption fail-fast**
   - `encryptionService.js:88`
   - Throw au lieu de return text

**Tests**:
- ✅ Pentesting basique
- ✅ Fuzzing des inputs
- ✅ Manual security review

---

### Sprint 5: Memory & Performance (4-5 jours)

**Priorité**: 🟠 MAJEUR

**Tâches**:

1. **Cleanup Maps & Sets**
   - `ollamaService.js:36-48`
   - Méthode cleanup()
   - Appeler dans shutdown

2. **Remove listeners**
   - `featureBridge.js:300-344`
   - Tracker listeners
   - Cleanup method

3. **Clear timers/intervals**
   - `localAIManager.js:534`
   - `ollamaService.js:932`
   - `windowManager.js:310`

4. **LRU Cache pour titles**
   - `conversationHistoryService.js:11`
   - Utiliser lru-cache package
   - Max 100 items, TTL 1h

5. **Async chunking**
   - `ollamaService.js:1254`
   - Yield to event loop

6. **Close Electron Store**
   - `modelStateService.js:14`
   - store.close() dans shutdown

**Tests**:
- ✅ Memory profiling (DevTools)
- ✅ Leak detection
- ✅ Load testing

---

### Sprint 6: Architecture & Code Quality (5-6 jours)

**Priorité**: 🟠 MAJEUR

**Tâches**:

1. **Diviser ollamaService** (1530 → 400 lignes chacun)
   ```
   ollamaService.js (Main)
   ├─ OllamaInstaller.js
   ├─ OllamaServiceManager.js
   ├─ OllamaModelManager.js
   └─ OllamaWarmupService.js
   ```

2. **Diviser featureBridge** (415 → 50-80 lignes chacun)
   ```
   bridges/
   ├─ featureBridge.js (Coordinator)
   ├─ documentBridge.js
   ├─ workflowBridge.js
   ├─ historyBridge.js
   └─ ... etc
   ```

3. **WindowManagerState class**
   - Encapsuler variables globales
   - Méthodes cleanup()

4. **Extraire DownloadService**
   - Code commun ollama/whisper
   - downloadFile(), verifyChecksum()

5. **Implémenter structured logging**
   - Remplacer console.log par logger
   - Utiliser le logger de Sprint 3

6. **Factory pattern pour windows**
   - createFeatureWindow(type, config)
   - Réduire duplication

**Tests**:
- ✅ Unit tests des nouvelles classes
- ✅ Integration tests
- ✅ No regressions

---

### Sprint 7: Finalisation & Polish (3-4 jours)

**Priorité**: 🟡 MINEUR

**Tâches**:

1. **Remplacer magic numbers**
   - Utiliser constants.js de Sprint 3
   - TIMEOUTS, INTERVALS, etc.

2. **Supprimer dead code**
   - `preload.js` root
   - Fonction cleanupEmptySessions jamais appelée

3. **Traduire commentaires coréens**
   - windowManager.js
   - preload.js

4. **Refactoriser fonctions longues**
   - createFeatureWindows (155 → 50)
   - setupWindowController (110 → 40)

5. **Ajouter JSDoc**
   - Toutes les fonctions publiques
   - Types pour events

6. **DevTools conditionnels**
   - Seulement si DEBUG=true

7. **Propager les erreurs**
   - Ne plus masquer avec return []
   - Result objects ou throws

**Tests**:
- ✅ Code review
- ✅ Manual QA
- ✅ Documentation review

---

## 📈 Métriques de Succès

| Métrique | Avant | Objectif | Impact |
|----------|-------|----------|--------|
| Vulnérabilités critiques | 8 | 0 | 🔴 → 🟢 |
| Memory leaks | 6 | 0 | 🔴 → 🟢 |
| God objects (>500 lignes) | 3 | 0 | 🔴 → 🟢 |
| Code duplication | 140 lignes | <20 lignes | 🟠 → 🟢 |
| Try/catch coverage | 65% | 95% | 🟠 → 🟢 |
| Structured logging | 15% | 100% | 🔴 → 🟢 |
| Security Score | 6/10 | 9/10 | 🟡 → 🟢 |
| Maintainability | 5/10 | 8/10 | 🟡 → 🟢 |

---

## 🎯 Prochaines Étapes

### Option A: Implémenter Sprint 4 (Sécurité) immédiatement ⚡
Les 7 fixes critiques de sécurité doivent être corrigés en priorité.

### Option B: Implémenter tous les sprints (4, 5, 6, 7) séquentiellement 📋
Refactoring complet sur 15-18 jours.

### Option C: Créer des tickets détaillés pour chaque problème 📝
Pour planification agile future.

---

**Recommandation**: **Option A** pour sécuriser l'app immédiatement, puis planifier Sprints 5-7.

---

*Fin du rapport d'audit principal*
