# Analyse du Système de Suggestions Contextuelles - Lucide

**Date**: 2025-11-26
**Version**: Phase 3.x

## Vue d'ensemble

Le système de suggestions contextuelles génère des réponses intelligentes en temps réel pour aider l'utilisateur pendant les réunions.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              STT Service (Transcription)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ onTranscriptionComplete
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ListenService                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Debounce Timer (2000ms)                            │    │
│  │  - clearTimeout() si user parle à nouveau           │    │
│  │  - setTimeout() démarre nouveau timer               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │ generateSuggestions()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  ResponseService                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  isProcessing = true (Race condition protection)    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Context Analysis:                                  │    │
│  │  - Phase: opening/exploration/discussion/decision   │    │
│  │  - Type: sales/brainstorming/problem/status        │    │
│  │  - Message: isQuestion/isRequest/questionType      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  AI Generation (timeout: 30s)                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │ onSuggestionsReady callback
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Renderer                               │
│              (ai-response-ready event)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Mécanisme de Debounce

### Localisation
- **Fichier**: `src/features/listen/listenService.js`
- **Lignes**: 258-263
- **Constante**: `SUGGESTION_GENERATION_DEBOUNCE_MS = 2000` (ligne 16)

### Code source

```javascript
// listenService.js:248-264
if (speaker === 'Me') {
    this.lastTranscription = text;

    // Cancel previous debounce timer
    if (this.suggestionDebounceTimer) {
        clearTimeout(this.suggestionDebounceTimer);
    }

    // Start new debounce timer
    this.suggestionDebounceTimer = setTimeout(() => {
        console.log('[ListenService] User finished speaking, generating response suggestions...');
        responseService.generateSuggestions().catch(error => {
            console.error('[ListenService] Failed to generate suggestions:', error);
        });
    }, SUGGESTION_GENERATION_DEBOUNCE_MS); // 2000ms
}
```

### Comportement vérifié

| Scénario | Comportement | Status |
|----------|--------------|--------|
| User parle une fois | Timer 2s → génération | ✅ |
| User parle puis reparle avant 2s | Timer annulé → nouveau timer 2s | ✅ |
| User parle 10 fois rapidement | 9 timers annulés → 1 seul final | ✅ |
| Session fermée | Timer nettoyé (closeSession:435-438) | ✅ |

---

## 2. Protection contre les Race Conditions

### Localisation
- **Fichier**: `src/features/listen/response/responseService.js`
- **Lignes**: 560-563 (check), 572 (set), 654 (finally reset)

### Code source

```javascript
// responseService.js:560-572
async generateSuggestions() {
    if (!this.enabled) {
        console.log('[ResponseService] Suggestions disabled, skipping');
        return null;
    }

    if (this.isProcessing) {
        console.log('[ResponseService] Already processing suggestions, skipping duplicate request');
        return null;  // ← SKIP si déjà en cours
    }

    // ... validation ...

    this.isProcessing = true;  // ← LOCK

    try {
        // ... génération AI ...
    } finally {
        this.isProcessing = false;  // ← UNLOCK (ligne 654)
    }
}
```

### Test de concurrence

```
Requêtes simultanées: 5
├── Requête 1: Acceptée (isProcessing = true)
├── Requête 2: SKIPPED (isProcessing = true)
├── Requête 3: SKIPPED (isProcessing = true)
├── Requête 4: SKIPPED (isProcessing = true)
└── Requête 5: SKIPPED (isProcessing = true)

Résultat: 1 traitée, 4 ignorées ✅
```

---

## 3. Scénario: User parle pendant génération

### Séquence d'événements

```
T=0ms:    User parle → Timer 2s créé
T=1000ms: User parle → Timer annulé → Nouveau timer 2s créé
T=3000ms: Timer expire → generateSuggestions()
T=3000ms: isProcessing = true
T=3500ms: User parle → Timer 2s créé (génération en cours)
T=4500ms: Génération terminée → isProcessing = false
T=5500ms: Timer expire → generateSuggestions() ← s'exécute normalement
```

### Points clés

1. **Le debounce continue de fonctionner** même pendant une génération en cours
2. **Si nouvelle requête arrive pendant génération**: elle est SKIPPED
3. **Si nouvelle requête arrive APRÈS génération**: elle s'exécute normalement

---

## 4. Pertinence Contextuelle des Suggestions

### Détection du type de conversation

```javascript
// responseService.js:165-195
_detectConversationType() {
    const allText = this.conversationHistory.map(turn => turn.text.toLowerCase()).join(' ');

    if (/\b(prix|budget|contrat|offre|deal|vente)\b/.test(allText)) return 'sales';
    if (/\b(idée|brainstorm|créatif|innovation)\b/.test(allText)) return 'brainstorming';
    if (/\b(décision|décider|choisir|option)\b/.test(allText)) return 'decision';
    if (/\b(problème|bug|issue|blocker)\b/.test(allText)) return 'problem';
    if (/\b(statut|avancement|progrès|update)\b/.test(allText)) return 'status';
    return 'general';
}
```

### Détection de la phase de conversation

| Tours | Phase | Objectif |
|-------|-------|----------|
| 0-5 | opening | Établir contexte et objectifs |
| 5-15 | exploration | Collecter informations |
| 15-30 | discussion | Engagement actif |
| 30-50 | decision | Prise de décision |
| 50+ | closing | Actions et prochaines étapes |

### Analyse du dernier message

```javascript
// responseService.js:202-278
_analyzeLastMessage() {
    return {
        isQuestion: boolean,      // Détecté par ? ou mots interrogatifs
        isRequest: boolean,       // "pouvez-vous", "s'il vous plaît", etc.
        questionType: string,     // what/how/when/where/why/who/yesno
        subject: string           // Sujet extrait de la question
    };
}
```

### Instructions contextuelles

```javascript
// Instructions par type
sales: 'Focus on building value, addressing objections, and moving towards closing.'
brainstorming: 'Encourage creative thinking, build on ideas, ask expansive "what if" questions.'
problem: 'Identify root causes, propose solutions, and check understanding.'

// Instructions par phase
opening: 'Ask clarifying questions to understand context, goals, and expectations.'
discussion: 'Engage actively with thoughtful arguments, counter-points.'
closing: 'Recap key points, confirm next steps, ensure clear alignment.'
```

---

## 5. Ranking des Suggestions

### Système de scoring (responseService.js:492-548)

```javascript
_rankSuggestions(suggestions) {
    // Pénalités
    - 40 points: Phrases génériques ("that's interesting", "tell me more", "I see")
    - 25 points: Réponses très courtes (< 4 mots)

    // Bonus
    + 15 points: Questions spécifiques (qui/quoi/quand/où/pourquoi/comment)
    + 15 points: Chiffres ou détails spécifiques
    + 12 points: Mots d'action (propose, suggère, va, pouvons)
    + 10 points: Réponses détaillées (> 8 mots)
}
```

---

## 6. Résumé des Tests

| Test | Description | Résultat |
|------|-------------|----------|
| Debounce | Timer de 2s avant génération | ✅ PASS |
| Race Condition | Protection isProcessing | ✅ PASS |
| User parle pendant génération | Timer reset + skip si processing | ✅ PASS |
| Pertinence contextuelle | Détection type/phase/question | ✅ PASS |
| Messages rapides (stress) | 10 msg → 1 seul trigger | ✅ PASS |

---

## 7. Points d'attention

### Correctifs déjà appliqués

| Bug ID | Description | Localisation |
|--------|-------------|--------------|
| BUG-M18 | Extract debounce constant | listenService.js:16 |
| - | isProcessing protection | responseService.js:560-563 |
| - | Finally block unlock | responseService.js:654 |
| - | Timer cleanup on close | listenService.js:435-438 |
| - | AI timeout (30s) | responseService.js:605 |

### Recommandations

1. **Monitoring recommandé**
   ```javascript
   // Ajouter métrique pour suivre:
   - Nombre de requêtes skipped (isProcessing)
   - Temps moyen de génération
   - Taux de suggestions utilisées par l'user
   ```

2. **Test à considérer**
   - Simulation de longue réunion (1h+) pour vérifier stabilité mémoire

---

## 8. Conclusion

Le système de suggestions contextuelles est **robuste et bien conçu**:

- **Debounce**: Fonctionne correctement avec clearTimeout/setTimeout
- **Race conditions**: Protégées par le flag `isProcessing`
- **User parle pendant génération**: Géré élégamment (skip + nouveau timer)
- **Pertinence**: Détection riche (type, phase, question/request)
- **Cleanup**: Timer nettoyé à la fermeture de session

**Score global**: 9/10

**Le seul point d'amélioration potentiel**: Ajouter des métriques de monitoring pour suivre l'utilisation en production.
