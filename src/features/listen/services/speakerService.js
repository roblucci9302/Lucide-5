const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class SpeakerService {
  constructor() {
    const lucideDir = path.join(process.env.HOME || process.env.USERPROFILE, '.lucide');
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(lucideDir)) {
      fs.mkdirSync(lucideDir, { recursive: true });
    }
    
    const dbPath = path.join(lucideDir, 'lucide.db');
    this.db = new Database(dbPath);
    this.initTables();
  }

  initTables() {
    // Créer les tables si elles n'existent pas
    // Note: Ces tables sont aussi définies dans schema.js pour la synchronisation cloud
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcript_segments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        speaker_id INTEGER NOT NULL,
        speaker_name TEXT DEFAULT NULL,
        text TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        confidence REAL DEFAULT 0.0,
        is_final BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        sync_state TEXT DEFAULT 'clean',
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS speaker_mapping (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        speaker_id INTEGER NOT NULL,
        speaker_name TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        sync_state TEXT DEFAULT 'clean',
        UNIQUE(session_id, speaker_id),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      -- Fix MOYEN #10: Indices pour améliorer les performances des requêtes
      CREATE INDEX IF NOT EXISTS idx_transcript_segments_session
      ON transcript_segments(session_id, start_time);

      CREATE INDEX IF NOT EXISTS idx_transcript_segments_speaker
      ON transcript_segments(session_id, speaker_id);

      CREATE INDEX IF NOT EXISTS idx_transcript_segments_final
      ON transcript_segments(session_id, is_final);

      CREATE INDEX IF NOT EXISTS idx_speaker_mapping_session
      ON speaker_mapping(session_id);
    `);

    console.log('[SpeakerService] Tables initialized successfully');
  }

  /**
   * Ajouter un segment de transcript avec info speaker
   */
  addSegment({ sessionId, speakerId, text, startTime, endTime, confidence, isFinal }) {
    try {
      const id = uuidv4();
      const stmt = this.db.prepare(`
        INSERT INTO transcript_segments 
        (id, session_id, speaker_id, text, start_time, end_time, confidence, is_final)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(id, sessionId, speakerId, text, startTime, endTime, confidence, isFinal ? 1 : 0);
      console.log(`[SpeakerService] Added segment: session=${sessionId}, speaker=${speakerId}, text="${text.substring(0, 30)}..."`);
      return id;
    } catch (error) {
      console.error('[SpeakerService] Error adding segment:', error);
      throw error;
    }
  }

  /**
   * Renommer un speaker (met à jour TOUTES les occurrences)
   * Fix HAUT #8: Retourne une confirmation au lieu du transcript entier
   */
  renameSpeaker(sessionId, speakerId, newName) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO speaker_mapping (id, session_id, speaker_id, speaker_name)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id, speaker_id)
        DO UPDATE SET speaker_name = ?, updated_at = strftime('%s', 'now')
      `);

      const id = uuidv4();
      const result = stmt.run(id, sessionId, speakerId, newName, newName);

      console.log(`[SpeakerService] Renamed speaker ${speakerId} to "${newName}" for session ${sessionId}`);

      // Fix HAUT #8: Retourne une confirmation légère au lieu du transcript entier
      return {
        success: true,
        sessionId,
        speakerId,
        newName,
        changes: result.changes
      };
    } catch (error) {
      console.error('[SpeakerService] Error renaming speaker:', error);
      throw error;
    }
  }

  /**
   * Obtenir le nom d'un speaker (avec fallback sur "Speaker X")
   */
  getSpeakerName(sessionId, speakerId) {
    try {
      const stmt = this.db.prepare(`
        SELECT speaker_name FROM speaker_mapping
        WHERE session_id = ? AND speaker_id = ?
      `);
      
      const row = stmt.get(sessionId, speakerId);
      return row ? row.speaker_name : `Speaker ${speakerId}`;
    } catch (error) {
      console.error('[SpeakerService] Error getting speaker name:', error);
      return `Speaker ${speakerId}`;
    }
  }

  /**
   * Obtenir le transcript complet avec noms de speakers
   */
  getSessionTranscript(sessionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          ts.id,
          ts.speaker_id,
          COALESCE(sm.speaker_name, 'Speaker ' || ts.speaker_id) as speaker_name,
          ts.text,
          ts.start_time,
          ts.end_time,
          ts.confidence,
          ts.is_final
        FROM transcript_segments ts
        LEFT JOIN speaker_mapping sm 
          ON ts.session_id = sm.session_id AND ts.speaker_id = sm.speaker_id
        WHERE ts.session_id = ?
        ORDER BY ts.start_time ASC
      `);
      
      return stmt.all(sessionId);
    } catch (error) {
      console.error('[SpeakerService] Error getting session transcript:', error);
      return [];
    }
  }

  /**
   * Obtenir la liste des speakers uniques dans une session
   */
  getSessionSpeakers(sessionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT DISTINCT
          ts.speaker_id,
          COALESCE(sm.speaker_name, 'Speaker ' || ts.speaker_id) as speaker_name,
          COUNT(*) as segment_count,
          MIN(ts.start_time) as first_appearance
        FROM transcript_segments ts
        LEFT JOIN speaker_mapping sm 
          ON ts.session_id = sm.session_id AND ts.speaker_id = sm.speaker_id
        WHERE ts.session_id = ?
        GROUP BY ts.speaker_id
        ORDER BY first_appearance ASC
      `);
      
      return stmt.all(sessionId);
    } catch (error) {
      console.error('[SpeakerService] Error getting session speakers:', error);
      return [];
    }
  }

  /**
   * Obtenir le speaker actif (dernier segment non final ou le plus récent)
   */
  getCurrentSpeaker(sessionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          ts.speaker_id,
          COALESCE(sm.speaker_name, 'Speaker ' || ts.speaker_id) as speaker_name
        FROM transcript_segments ts
        LEFT JOIN speaker_mapping sm 
          ON ts.session_id = sm.session_id AND ts.speaker_id = sm.speaker_id
        WHERE ts.session_id = ?
        ORDER BY ts.start_time DESC
        LIMIT 1
      `);
      
      return stmt.get(sessionId);
    } catch (error) {
      console.error('[SpeakerService] Error getting current speaker:', error);
      return null;
    }
  }

  /**
   * Supprimer tous les segments d'une session
   */
  clearSession(sessionId) {
    try {
      this.db.prepare('DELETE FROM transcript_segments WHERE session_id = ?').run(sessionId);
      this.db.prepare('DELETE FROM speaker_mapping WHERE session_id = ?').run(sessionId);
      console.log(`[SpeakerService] Cleared session ${sessionId}`);
    } catch (error) {
      console.error('[SpeakerService] Error clearing session:', error);
    }
  }

  /**
   * Fermer la connexion à la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('[SpeakerService] Database connection closed');
    }
  }
}

// Export singleton
module.exports = new SpeakerService();
