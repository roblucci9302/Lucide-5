# 🎯 RÉSOLUTION DU PROBLÈME DE DIARISATION

## 📊 Diagnostic

### Problème identifié
La diarisation ne fonctionne pas correctement car :

1. **Deux flux STT séparés** qui ne communiquent pas entre eux
2. **Deepgram diarise chaque flux indépendamment** sans coordination
3. **Les speaker IDs sont isolés par flux** au lieu d'être globaux à la session
4. **Pas de mapping intelligent** entre les speakers détectés et les participants réels

### Ce qui se passe actuellement
```
Flux "Me" (microphone):
  ├─ Deepgram détecte: Speaker 0 (vous) + Speaker 1 (votre amie qui parle fort)
  └─ Les deux sont marqués "Me" dans l'interface

Flux "Them" (système - si utilisé):
  ├─ Deepgram détecte: Speaker 0, Speaker 1...
  └─ Les deux sont marqués "Them" dans l'interface

Résultat: Confusion totale des interlocuteurs
```

## 🔧 Solution proposée : Diarisation unifiée intelligente

### Option 1 : Un seul flux STT avec diarisation globale (RECOMMANDÉ)

**Avantages** :
- ✅ Diarisation cohérente sur un seul flux
- ✅ Les speaker IDs sont globalement cohérents
- ✅ Plus simple à gérer
- ✅ Meilleure précision

**Implémentation** :

```javascript
// Dans sttService.js

// AVANT (2 flux séparés):
this.mySttSession = await createSTT('my');
this.theirSttSession = await createSTT('their');

// APRÈS (1 flux unifié avec diarisation):
this.unifiedSttSession = await createSTT({
  apiKey,
  language,
  callbacks: {
    onmessage: this.handleUnifiedMessage.bind(this)
  }
});
```

### Option 2 : Mapping intelligent des speakers inter-flux

**Principe** :
1. Enregistrer un profil vocal de l'utilisateur au démarrage
2. Comparer les voiceprints entre les flux
3. Mapper automatiquement les speakers similaires

**Avantages** :
- ✅ Garde l'architecture actuelle
- ✅ Plus robuste dans des environnements complexes

**Inconvénients** :
- ⚠️ Complexe à implémenter
- ⚠️ Nécessite une librairie de voice recognition supplémentaire

## 🚀 Implémentation recommandée

### 1. Créer un service de diarisation unifié

**Fichier** : `src/features/listen/services/unifiedDiarizationService.js`

```javascript
class UnifiedDiarizationService {
  constructor() {
    this.speakerProfiles = new Map(); // Speaker ID -> Voice characteristics
    this.userSpeakerId = null; // ID du speaker principal (vous)
  }

  /**
   * Enregistrer le profil vocal de l'utilisateur
   */
  async calibrateUserVoice(audioSamples) {
    // Analyser les caractéristiques vocales
    const voiceprint = this.extractVoiceFeatures(audioSamples);
    this.userSpeakerId = 0; // Premier speaker détecté = utilisateur
    this.speakerProfiles.set(0, {
      isUser: true,
      voiceprint,
      name: 'Moi'
    });
  }

  /**
   * Identifier le speaker dans un segment
   */
  identifySpeaker(words, speakerId) {
    // Si c'est le premier segment, c'est probablement l'utilisateur
    if (this.speakerProfiles.size === 0) {
      this.userSpeakerId = speakerId;
      this.speakerProfiles.set(speakerId, {
        isUser: true,
        name: 'Moi',
        firstAppearance: Date.now()
      });
      return { speakerId, label: 'Me', name: 'Moi' };
    }

    // Si c'est le speaker utilisateur connu
    if (speakerId === this.userSpeakerId) {
      return { speakerId, label: 'Me', name: 'Moi' };
    }

    // Nouveau speaker = interlocuteur
    if (!this.speakerProfiles.has(speakerId)) {
      const participantNumber = this.speakerProfiles.size;
      this.speakerProfiles.set(speakerId, {
        isUser: false,
        name: `Participant ${participantNumber}`,
        firstAppearance: Date.now()
      });
    }

    const profile = this.speakerProfiles.get(speakerId);
    return { 
      speakerId, 
      label: 'Them', 
      name: profile.name 
    };
  }

  /**
   * Extraire les caractéristiques vocales d'un échantillon
   */
  extractVoiceFeatures(audioSamples) {
    // Analyse simplifiée : pitch moyen, tempo, formants
    // Dans une vraie implémentation, utiliser une lib comme 
    // speaker-recognition ou tensorflow.js
    return {
      avgPitch: this.calculateAveragePitch(audioSamples),
      tempo: this.calculateTempo(audioSamples),
      // ... autres features
    };
  }

  reset() {
    this.speakerProfiles.clear();
    this.userSpeakerId = null;
  }
}

module.exports = new UnifiedDiarizationService();
```

### 2. Modifier sttService.js pour utiliser un flux unifié

**Modifications dans** : `src/features/listen/stt/sttService.js`

```javascript
const unifiedDiarizationService = require('../services/unifiedDiarizationService');

class SttService {
  constructor() {
    // Remplacer mySttSession et theirSttSession par:
    this.unifiedSttSession = null;
    this.currentUtterance = '';
    this.completionBuffer = '';
    this.completionTimer = null;
    // ...
  }

  async initializeSttSessions(language = 'fr') {
    console.log(`[SttService] Initializing unified STT with diarization`);

    const modelInfo = await modelStateService.getCurrentModelInfo('stt');
    if (!modelInfo || !modelInfo.apiKey) {
      throw new Error('AI model or API key is not configured.');
    }
    this.modelInfo = modelInfo;

    // Reset le service de diarisation
    unifiedDiarizationService.reset();

    const handleMessage = message => {
      if (!this.modelInfo || this._isClosing) return;

      try {
        if (this.modelInfo.provider === 'deepgram') {
          const alternative = message.channel?.alternatives?.[0];
          const text = alternative?.transcript;
          if (!text || text.trim().length === 0) return;

          const isFinal = message.is_final;
          const words = alternative?.words || [];

          if (words.length > 0) {
            // Détecter le speaker dominant dans cet utterance
            const speakerCounts = {};
            
            words.forEach(word => {
              const duration = word.end - word.start;
              const speaker = word.speaker ?? 0;
              
              if (!speakerCounts[speaker]) {
                speakerCounts[speaker] = 0;
              }
              speakerCounts[speaker] += duration;
            });

            const dominantSpeakerId = Object.keys(speakerCounts)
              .reduce((a, b) => speakerCounts[a] > speakerCounts[b] ? a : b);

            // ✅ NOUVEAU : Identifier intelligemment le speaker
            const { speakerId, label, name } = unifiedDiarizationService
              .identifySpeaker(words, parseInt(dominantSpeakerId, 10));

            const startTime = words[0].start;
            const endTime = words[words.length - 1].end;
            const confidence = words.reduce((sum, w) => sum + (w.confidence || 0), 0) / words.length;

            // Stocker le segment avec le bon speaker
            if (isFinal && this.sessionId) {
              try {
                speakerService.addSegment({
                  sessionId: this.sessionId,
                  speakerId: speakerId,
                  text: text,
                  startTime,
                  endTime,
                  confidence,
                  isFinal: true
                });
              } catch (error) {
                console.error('[SttService-Unified] Error storing segment:', error);
              }
            }

            if (isFinal) {
              this.currentUtterance = '';
              this.debounceCompletion(text);
              
              // Émettre event avec le bon speaker (Me ou Them)
              this.sendToRenderer('stt-recognized', {
                speaker: label, // 'Me' ou 'Them'
                text: text,
                speakerId: speakerId,
                speakerName: name,
                timestamp: Date.now(),
              });
            } else {
              if (this.completionTimer) clearTimeout(this.completionTimer);
              this.completionTimer = null;

              this.currentUtterance = text;
              
              const continuousText = (this.completionBuffer + ' ' + this.currentUtterance).trim();

              this.sendToRenderer('stt-recognizing', {
                speaker: label,
                text: continuousText,
                speakerId: speakerId,
                speakerName: name,
                isPartial: true,
                isFinal: false,
                timestamp: Date.now(),
              });

              this.sendToRenderer('stt-update', {
                speaker: label,
                text: continuousText,
                speakerId: speakerId,
                speakerName: name,
                isPartial: true,
                isFinal: false,
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (error) {
        console.error('[SttService] Error processing message:', error);
      }
    };

    const sttConfig = {
      language: language,
      callbacks: {
        onmessage: handleMessage,
        onerror: error => console.error('STT session error:', error.message),
        onclose: event => console.log('STT session closed:', event.reason),
      },
    };

    const sttOptions = {
      apiKey: this.modelInfo.apiKey,
      language: language,
      callbacks: sttConfig.callbacks,
    };

    this.unifiedSttSession = await createSTT(this.modelInfo.provider, sttOptions);

    console.log('✅ Unified STT session initialized successfully.');
  }

  // Simplifier les méthodes de completion
  debounceCompletion(text) {
    this.completionBuffer += (this.completionBuffer ? ' ' : '') + text;
    
    if (this.completionTimer) clearTimeout(this.completionTimer);
    this.completionTimer = setTimeout(() => this.flushCompletion(), COMPLETION_DEBOUNCE_MS);
  }

  flushCompletion() {
    const finalText = (this.completionBuffer + this.currentUtterance).trim();
    if (!this.modelInfo || !finalText) return;

    // Le speaker est déjà identifié dans handleMessage
    this.completionBuffer = '';
    this.completionTimer = null;
    this.currentUtterance = '';
  }

  async sendMicrophoneAudio(buffer) {
    if (!this.unifiedSttSession) {
      throw new Error('STT session not initialized');
    }

    try {
      this.unifiedSttSession.sendRealtimeInput(buffer);
    } catch (error) {
      console.error('[SttService] Error sending microphone audio:', error);
      throw error;
    }
  }

  async closeSessions() {
    console.log('[SttService] Closing unified STT session...');
    this._isClosing = true;

    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.flushCompletion();
    }

    if (this.unifiedSttSession) {
      try {
        this.unifiedSttSession.close();
        this.unifiedSttSession = null;
      } catch (error) {
        console.error('[SttService] Error closing unified session:', error);
      }
    }

    unifiedDiarizationService.reset();
    this.sessionId = null;
    this._isClosing = false;

    console.log('All STT sessions closed.');
  }
}
```

### 3. Amélioration : Calibration initiale

Ajouter une phase de calibration au démarrage de Listen :

```javascript
// Dans listenService.js

async startSession() {
  // ... code existant ...

  // Nouvelle étape : Calibration
  this.sendToRenderer('calibration-prompt', {
    message: "Dites quelques mots pour calibrer la reconnaissance vocale..."
  });

  // Attendre 3 secondes de parole pour calibrer
  setTimeout(() => {
    this.sendToRenderer('calibration-complete');
  }, 3000);
}
```

## 📈 Améliorations supplémentaires

### 1. Heuristiques intelligentes

```javascript
class UnifiedDiarizationService {
  identifySpeaker(words, speakerId) {
    // Heuristique 1: Le premier speaker est toujours l'utilisateur
    if (this.speakerProfiles.size === 0) {
      return this.registerUserSpeaker(speakerId);
    }

    // Heuristique 2: Si un speaker parle >70% du temps, c'est probablement l'utilisateur
    const totalDuration = this.getTotalSpeakingDuration();
    const speakerDuration = this.getSpeakerDuration(speakerId);
    
    if (speakerDuration / totalDuration > 0.7) {
      this.userSpeakerId = speakerId;
    }

    // Heuristique 3: Détecter les changements de tour de parole
    const lastSpeaker = this.getLastSpeaker();
    if (lastSpeaker && lastSpeaker !== speakerId) {
      // Changement de speaker = probablement "Them"
      return this.getOrCreateParticipant(speakerId);
    }

    return this.identifyByHistory(speakerId);
  }
}
```

### 2. Interface de correction manuelle

Ajouter dans l'UI Listen :

```javascript
// Bouton pour corriger un speaker mal identifié
<button onclick="correctSpeaker(segmentId, newSpeakerLabel)">
  Corriger ce speaker
</button>
```

### 3. Apprentissage adaptatif

```javascript
class UnifiedDiarizationService {
  correctSpeaker(segmentId, correctLabel) {
    // Apprendre de la correction
    const segment = this.getSegment(segmentId);
    
    // Mettre à jour le profil
    if (correctLabel === 'Me') {
      this.userSpeakerId = segment.speakerId;
    }

    // Reclassifier les segments similaires
    this.reclassifySimilarSegments(segment);
  }
}
```

## 🎯 Résultat attendu

Après implémentation :

```
✅ Un seul flux STT unifié avec diarisation Deepgram
✅ Identification intelligente : premier speaker = "Me"
✅ Autres speakers = "Them" (Participant 1, 2, etc.)
✅ Heuristiques pour améliorer la précision
✅ Interface de correction manuelle
✅ Apprentissage adaptatif
```

## 📝 Plan d'implémentation

1. ✅ **Phase 1** : Créer `unifiedDiarizationService.js` (2h)
2. ✅ **Phase 2** : Modifier `sttService.js` pour utiliser un flux unifié (3h)
3. ✅ **Phase 3** : Tester avec différents scénarios (1h)
4. ✅ **Phase 4** : Ajouter les heuristiques intelligentes (2h)
5. ✅ **Phase 5** : Interface de correction manuelle (2h)
6. ✅ **Phase 6** : Tests et ajustements finaux (1h)

**Total estimé : 11 heures de développement**

## 🧪 Tests recommandés

1. **Test 1** : Conversation 1-on-1 (vous + 1 personne)
2. **Test 2** : Réunion à 3 personnes
3. **Test 3** : Environnement bruyant
4. **Test 4** : Speakers avec des voix similaires
5. **Test 5** : Changements rapides de tour de parole

---

**Voulez-vous que je procède à l'implémentation de cette solution ?**
