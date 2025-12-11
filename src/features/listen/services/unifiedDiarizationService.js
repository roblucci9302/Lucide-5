/**
 * Service de diarisation unifiée
 * Identifie intelligemment les speakers dans une conversation
 * en utilisant des heuristiques et l'historique de la session
 */

class UnifiedDiarizationService {
  constructor() {
    this.speakerProfiles = new Map(); // Speaker ID -> Profile info
    this.userSpeakerId = null; // ID du speaker principal (l'utilisateur)
    this.lastSpeakerId = null; // Dernier speaker détecté
    this.speakerDurations = new Map(); // Speaker ID -> Durée totale de parole
    this.sessionStartTime = null;
  }

  /**
   * Réinitialiser le service pour une nouvelle session
   */
  reset() {
    this.speakerProfiles.clear();
    this.speakerDurations.clear();
    this.userSpeakerId = null;
    this.lastSpeakerId = null;
    this.sessionStartTime = Date.now();
    console.log('[UnifiedDiarizationService] Service reset for new session');
  }

  /**
   * Enregistrer le speaker utilisateur
   * @param {number} speakerId - ID du speaker Deepgram
   * @returns {Object} Speaker info
   */
  registerUserSpeaker(speakerId) {
    this.userSpeakerId = speakerId;
    this.speakerProfiles.set(speakerId, {
      id: speakerId,
      isUser: true,
      name: 'Moi',
      label: 'Me',
      firstAppearance: Date.now(),
      segmentCount: 0
    });

    console.log(`[UnifiedDiarizationService] Registered user speaker: ${speakerId}`);
    
    return {
      speakerId,
      label: 'Me',
      name: 'Moi',
      isUser: true
    };
  }

  /**
   * Enregistrer ou récupérer un participant
   * @param {number} speakerId - ID du speaker Deepgram
   * @returns {Object} Speaker info
   */
  getOrCreateParticipant(speakerId) {
    if (!this.speakerProfiles.has(speakerId)) {
      // Compter les participants existants (hors utilisateur)
      const participantCount = Array.from(this.speakerProfiles.values())
        .filter(p => !p.isUser).length;

      const participantNumber = participantCount + 1;
      const name = `Participant ${participantNumber}`;

      this.speakerProfiles.set(speakerId, {
        id: speakerId,
        isUser: false,
        name: name,
        label: 'Them',
        firstAppearance: Date.now(),
        segmentCount: 0
      });

      console.log(`[UnifiedDiarizationService] Registered new participant: ${name} (ID: ${speakerId})`);
    }

    const profile = this.speakerProfiles.get(speakerId);
    profile.segmentCount++;

    return {
      speakerId: profile.id,
      label: profile.label,
      name: profile.name,
      isUser: profile.isUser
    };
  }

  /**
   * Identifier le speaker dans un segment avec heuristiques intelligentes
   * @param {Array} words - Mots avec timestamps et speaker IDs de Deepgram
   * @param {number} dominantSpeakerId - Speaker ID dominant dans le segment
   * @returns {Object} Speaker identification
   */
  identifySpeaker(words, dominantSpeakerId) {
    // Calculer la durée pour ce speaker
    if (words && words.length > 0) {
      const duration = words[words.length - 1].end - words[0].start;
      const currentDuration = this.speakerDurations.get(dominantSpeakerId) || 0;
      this.speakerDurations.set(dominantSpeakerId, currentDuration + duration);
    }

    // HEURISTIQUE 1: Le premier speaker est toujours l'utilisateur
    if (this.speakerProfiles.size === 0) {
      this.lastSpeakerId = dominantSpeakerId;
      return this.registerUserSpeaker(dominantSpeakerId);
    }

    // HEURISTIQUE 2: Si c'est le speaker utilisateur connu
    if (dominantSpeakerId === this.userSpeakerId) {
      const profile = this.speakerProfiles.get(dominantSpeakerId);
      profile.segmentCount++;
      this.lastSpeakerId = dominantSpeakerId;
      
      return {
        speakerId: dominantSpeakerId,
        label: 'Me',
        name: 'Moi',
        isUser: true
      };
    }

    // HEURISTIQUE 3: Détecter si c'est probablement l'utilisateur qui revient parler
    // (le speaker qui parle le plus est généralement l'utilisateur)
    if (this.shouldReclassifyAsUser(dominantSpeakerId)) {
      console.log(`[UnifiedDiarizationService] Reclassifying speaker ${dominantSpeakerId} as user (speaks most)`);
      
      // Échanger les profils
      const oldUserId = this.userSpeakerId;
      const oldUserProfile = this.speakerProfiles.get(oldUserId);
      const newUserProfile = this.speakerProfiles.get(dominantSpeakerId);

      if (oldUserProfile && newUserProfile) {
        // L'ancien "Moi" devient un participant
        const participantCount = Array.from(this.speakerProfiles.values())
          .filter(p => !p.isUser).length;
        oldUserProfile.isUser = false;
        oldUserProfile.label = 'Them';
        oldUserProfile.name = `Participant ${participantCount + 1}`;

        // Le nouveau devient "Moi"
        newUserProfile.isUser = true;
        newUserProfile.label = 'Me';
        newUserProfile.name = 'Moi';
        
        this.userSpeakerId = dominantSpeakerId;
      }
    }

    // HEURISTIQUE 4: C'est un participant (nouveau ou existant)
    this.lastSpeakerId = dominantSpeakerId;
    return this.getOrCreateParticipant(dominantSpeakerId);
  }

  /**
   * Déterminer si un speaker devrait être reclassifié comme utilisateur
   * Basé sur la durée totale de parole
   * @param {number} speakerId - ID du speaker à vérifier
   * @returns {boolean}
   */
  shouldReclassifyAsUser(speakerId) {
    // Ne reclassifier que si on a assez de données (après 30 secondes)
    const sessionDuration = Date.now() - this.sessionStartTime;
    if (sessionDuration < 30000) {
      return false;
    }

    const totalDuration = this.getTotalSpeakingDuration();
    const speakerDuration = this.speakerDurations.get(speakerId) || 0;
    const userDuration = this.speakerDurations.get(this.userSpeakerId) || 0;

    // Si ce speaker parle >60% du temps ET plus que l'utilisateur actuel
    // alors c'est probablement lui le vrai utilisateur
    return (
      totalDuration > 0 &&
      (speakerDuration / totalDuration) > 0.6 &&
      speakerDuration > userDuration * 1.5
    );
  }

  /**
   * Obtenir la durée totale de parole de tous les speakers
   * @returns {number} Durée en secondes
   */
  getTotalSpeakingDuration() {
    let total = 0;
    for (const duration of this.speakerDurations.values()) {
      total += duration;
    }
    return total;
  }

  /**
   * Obtenir la durée de parole d'un speaker spécifique
   * @param {number} speakerId
   * @returns {number} Durée en secondes
   */
  getSpeakerDuration(speakerId) {
    return this.speakerDurations.get(speakerId) || 0;
  }

  /**
   * Obtenir le dernier speaker détecté
   * @returns {number|null}
   */
  getLastSpeaker() {
    return this.lastSpeakerId;
  }

  /**
   * Obtenir tous les profils de speakers
   * @returns {Array} Liste des profils
   */
  getAllSpeakers() {
    return Array.from(this.speakerProfiles.values()).map(profile => ({
      id: profile.id,
      name: profile.name,
      label: profile.label,
      isUser: profile.isUser,
      segmentCount: profile.segmentCount,
      duration: this.speakerDurations.get(profile.id) || 0,
      firstAppearance: profile.firstAppearance
    }));
  }

  /**
   * Obtenir les statistiques de la session
   * @returns {Object}
   */
  getStatistics() {
    const speakers = this.getAllSpeakers();
    const totalDuration = this.getTotalSpeakingDuration();

    return {
      totalSpeakers: speakers.length,
      speakers: speakers.map(s => ({
        ...s,
        percentage: totalDuration > 0 ? ((s.duration / totalDuration) * 100).toFixed(1) : 0
      })),
      totalDuration,
      sessionDuration: Date.now() - this.sessionStartTime
    };
  }

  /**
   * Corriger manuellement l'identification d'un speaker
   * (pour apprentissage futur)
   * @param {number} speakerId
   * @param {string} correctLabel - 'Me' ou 'Them'
   * @param {string} correctName - Nom correct
   */
  correctSpeaker(speakerId, correctLabel, correctName) {
    const profile = this.speakerProfiles.get(speakerId);
    if (!profile) {
      console.warn(`[UnifiedDiarizationService] Speaker ${speakerId} not found`);
      return;
    }

    const wasUser = profile.isUser;
    profile.label = correctLabel;
    profile.name = correctName;
    profile.isUser = correctLabel === 'Me';

    // Si on corrige vers "Me", mettre à jour l'ID utilisateur
    if (correctLabel === 'Me' && !wasUser) {
      // L'ancien utilisateur devient un participant
      if (this.userSpeakerId !== null) {
        const oldUser = this.speakerProfiles.get(this.userSpeakerId);
        if (oldUser) {
          oldUser.isUser = false;
          oldUser.label = 'Them';
        }
      }
      this.userSpeakerId = speakerId;
    }

    console.log(`[UnifiedDiarizationService] Corrected speaker ${speakerId} to "${correctName}" (${correctLabel})`);
  }

  /**
   * Renommer un speaker
   * @param {number} speakerId
   * @param {string} newName
   */
  renameSpeaker(speakerId, newName) {
    const profile = this.speakerProfiles.get(speakerId);
    if (profile) {
      profile.name = newName;
      console.log(`[UnifiedDiarizationService] Renamed speaker ${speakerId} to "${newName}"`);
    }
  }
}

// Export singleton
module.exports = new UnifiedDiarizationService();
