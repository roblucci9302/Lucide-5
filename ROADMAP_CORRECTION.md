# ROADMAP DE CORRECTION - LUCIDE-5

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TIMELINE DE CORRECTION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Semaine 1          Semaine 2-3         Semaines 4-6       Semaines 7-10│
│  ┌──────────┐      ┌──────────┐        ┌──────────┐       ┌──────────┐  │
│  │ PHASE 1  │─────▶│ PHASE 2  │───────▶│ PHASE 3  │──────▶│ PHASE 4  │  │
│  │ Sécurité │      │ Erreurs  │        │ Refactor │       │  Tests   │  │
│  │ URGENTE  │      │ + Config │        │ Archi    │       │ CRITIQUE │  │
│  └──────────┘      └──────────┘        └──────────┘       └──────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: SÉCURITÉ URGENTE (Jours 1-2)

### Checklist

- [ ] **VUL-1** Fuite de données sync
  - Fichier: `lucide-backend/src/sync/sync.routes.js`
  - Ligne: 358-361
  - Action: Ajouter `.eq('uid', req.user.id)`

- [ ] **VUL-2** Bypass CORS
  - Fichier: `lucide-backend/src/server.js`
  - Ligne: 34
  - Action: Supprimer `|| process.env.NODE_ENV === 'development'`

- [ ] **VUL-3** XSS potentiel
  - Fichier: `lucide-backend/src/users/users.routes.js`
  - Ligne: 32
  - Action: Sanitizer `displayName` avec DOMPurify ou validator.js

- [ ] **ERR-1** Signup orphan accounts
  - Fichier: `lucide-backend/src/auth/auth.routes.js`
  - Lignes: 44-56
  - Action: Rollback Firebase auth si insert DB échoue

### Temps estimé: 8-16 heures

---

## PHASE 2: ERREURS CRITIQUES (Jours 3-7)

### 2.1 Corrections sync.routes.js

```javascript
// Fichier: lucide-backend/src/sync/sync.routes.js

// Ligne 222-224 - Ajouter:
if (messagesError) {
    console.error('[Sync] Messages error:', messagesError);
    // Retourner erreur partielle ou continuer avec warning
}

// Ligne 240 - Ajouter après:
if (documentsError) {
    console.error('[Sync] Documents error:', documentsError);
}

// Ligne 255 - Ajouter après:
if (presetsError) {
    console.error('[Sync] Presets error:', presetsError);
}

// Ligne 153-156 - Capturer résultat:
const { error: updateError } = await supabase
    .from('users')
    .update({ last_sync_at: Math.floor(Date.now() / 1000) })
    .eq('uid', req.user.id);
if (updateError) console.error('[Sync] Update error:', updateError);
```

### 2.2 Validation Input

- [ ] Installer `joi` ou utiliser `validator` existant
- [ ] Créer schémas de validation pour:
  - Sessions
  - Messages
  - Documents
  - Presets

### 2.3 Fix Query Imbriquée

```javascript
// Fichier: lucide-backend/src/users/users.routes.js
// Lignes 144-146 - Corriger:

// AVANT (incorrect):
const { count: messagesCount } = await supabase
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .in('session_id', supabase.from('sessions').select('id').eq('uid', uid));

// APRÈS (correct):
const { data: userSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('uid', uid);

const sessionIds = userSessions?.map(s => s.id) || [];
const { count: messagesCount } = await supabase
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .in('session_id', sessionIds);
```

### Temps estimé: 16-24 heures

---

## PHASE 3: REFACTORING DUPLICATIONS (Semaines 2-3)

### 3.1 Créer Utilitaires

#### `src/features/common/utils/idGenerator.js`
```javascript
const crypto = require('crypto');

module.exports = {
    generateId: () => crypto.randomUUID(),
    getTimestamp: () => Math.floor(Date.now() / 1000),
    createRecord: (data = {}) => ({
        id: crypto.randomUUID(),
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        ...data
    })
};
```

#### `src/features/common/ai/utils/apiKeyValidator.js`
```javascript
async function validateApiKey(key, config) {
    if (!key || typeof key !== 'string') {
        return { success: false, error: 'Invalid API key format.' };
    }

    try {
        const response = await fetch(config.endpoint, {
            headers: config.headers(key)
        });

        if (response.ok) {
            return { success: true };
        }

        const errorData = await response.json().catch(() => ({}));
        return {
            success: false,
            error: errorData.error?.message || `Validation failed: ${response.status}`
        };
    } catch (error) {
        console.error(`[${config.provider}] Validation error:`, error.message);
        return { success: false, error: 'Network error during validation' };
    }
}

module.exports = { validateApiKey };
```

#### `src/features/common/config/modelLimits.js`
```javascript
const MODEL_TOKEN_LIMITS = {
    // OpenAI
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,

    // Anthropic
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,

    // Google
    'gemini-pro': 32768,
    'gemini-ultra': 32768,
};

const DEFAULT_LIMIT = 4096;

function getTokenLimit(model) {
    return MODEL_TOKEN_LIMITS[model] || DEFAULT_LIMIT;
}

module.exports = { MODEL_TOKEN_LIMITS, getTokenLimit, DEFAULT_LIMIT };
```

### 3.2 Créer BaseFirebaseRepository

```javascript
// src/features/common/repositories/base/BaseFirebaseRepository.js

const { getFirestoreInstance } = require('../../services/firebaseClient');

class BaseFirebaseRepository {
    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    getDb() {
        const db = getFirestoreInstance();
        if (!db) {
            throw new Error(`[${this.constructor.name}] Firestore not initialized`);
        }
        return db;
    }

    getCollection(uid) {
        return this.getDb()
            .collection('users')
            .doc(uid)
            .collection(this.collectionName);
    }

    async getById(uid, id) {
        const docRef = this.getCollection(uid).doc(id);
        const doc = await docRef.get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async getAll(uid) {
        const snapshot = await this.getCollection(uid).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async insert(uid, data) {
        const docRef = this.getCollection(uid).doc(data.id);
        await docRef.set(data);
        return data;
    }

    async update(uid, id, data) {
        const docRef = this.getCollection(uid).doc(id);
        await docRef.update(data);
        return { id, ...data };
    }

    async delete(uid, id) {
        await this.getCollection(uid).doc(id).delete();
    }
}

module.exports = BaseFirebaseRepository;
```

### 3.3 Fichiers à Modifier

| Fichier | Action | Lignes économisées |
|---------|--------|-------------------|
| `openai.js` | Utiliser apiKeyValidator | ~20 |
| `anthropic.js` | Utiliser apiKeyValidator | ~30 |
| `gemini.js` | Utiliser apiKeyValidator | ~20 |
| `deepgram.js` | Utiliser apiKeyValidator | ~20 |
| `whisper.js` | Utiliser apiKeyValidator | ~20 |
| `ollama.js` | Utiliser apiKeyValidator | ~20 |
| 93 fichiers | Utiliser idGenerator | ~200 |
| 3 firebase repos | Étendre BaseFirebaseRepository | ~80 |

### Temps estimé: 40-60 heures

---

## PHASE 4: TESTS (Semaines 4-10)

### 4.1 Setup Jest

```javascript
// jest.config.js
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/*.test.js', '**/*.spec.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/ui/**',
        '!**/node_modules/**'
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapper: {
        '^electron$': '<rootDir>/tests/__mocks__/electron.js',
        '^better-sqlite3$': '<rootDir>/tests/__mocks__/better-sqlite3.js'
    }
};
```

### 4.2 Priorité des Tests

#### Semaine 4-5: Services Critiques
1. `aiService.js` - 20 tests
2. `authService.js` - 15 tests
3. `ragService.js` - 20 tests
4. `structuredNotesService.js` - 25 tests
5. `externalDataService.js` - 20 tests

#### Semaine 6-7: Repositories
1. Tous les SQLite repositories - 50 tests
2. Tous les Firebase repositories - 30 tests

#### Semaine 8-9: Bridges IPC
1. 10 bridges principaux - 50 tests

#### Semaine 10: Intégration
1. E2E flows critiques - 20 tests
2. CI/CD setup

### 4.3 Template de Test

```javascript
// tests/features/common/services/aiService.test.js
const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mocks
jest.mock('../../../src/features/common/services/firebaseClient');
jest.mock('electron', () => require('../__mocks__/electron'));

const aiService = require('../../../src/features/common/services/aiService');

describe('aiService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateResponse', () => {
        it('should return response for valid input', async () => {
            // Arrange
            const input = { message: 'Hello', model: 'gpt-4' };

            // Act
            const result = await aiService.generateResponse(input);

            // Assert
            expect(result).toBeDefined();
            expect(result.content).toBeTruthy();
        });

        it('should throw error for invalid model', async () => {
            // Arrange
            const input = { message: 'Hello', model: 'invalid-model' };

            // Act & Assert
            await expect(aiService.generateResponse(input))
                .rejects.toThrow('Unsupported model');
        });
    });
});
```

### Temps estimé: 120-160 heures

---

## SUIVI D'AVANCEMENT

### Tableau de Bord

```
┌─────────────────────────────────────────────────────────────┐
│                    PROGRESSION GLOBALE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Sécurité    [░░░░░░░░░░] 0%    Objectif: Semaine 1         │
│  Erreurs     [░░░░░░░░░░] 0%    Objectif: Semaine 1         │
│  Duplications[░░░░░░░░░░] 0%    Objectif: Semaine 2-3       │
│  Architecture[░░░░░░░░░░] 0%    Objectif: Semaine 4-6       │
│  Tests       [░░░░░░░░░░] 0%    Objectif: Semaine 7-10      │
│                                                              │
│  TOTAL       [░░░░░░░░░░] 0%                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Métriques Cibles

| Métrique | Actuel | Cible S2 | Cible S6 | Cible S10 |
|----------|--------|----------|----------|-----------|
| Vulnérabilités critiques | 3 | 0 | 0 | 0 |
| Erreurs silencieuses | 8 | 2 | 0 | 0 |
| Lignes dupliquées | ~1500 | ~1000 | ~300 | ~100 |
| Couverture tests | 10% | 15% | 40% | 60% |
| Fichiers >500 lignes | 5 | 5 | 2 | 0 |

---

## PROCHAINES ACTIONS IMMÉDIATES

### Aujourd'hui
1. [ ] Fix VUL-1 (sync data leak)
2. [ ] Fix VUL-2 (CORS bypass)
3. [ ] Review VUL-3 (XSS)

### Cette semaine
4. [ ] Fix ERR-1 (auth orphans)
5. [ ] Fix ERR-2 à ERR-5 (sync errors)
6. [ ] Créer `idGenerator.js`
7. [ ] Créer `apiKeyValidator.js`

### Semaine prochaine
8. [ ] Refactor 6 providers AI
9. [ ] Créer `BaseFirebaseRepository`
10. [ ] Setup Jest config

---

*Dernière mise à jour: 2025-12-04*
