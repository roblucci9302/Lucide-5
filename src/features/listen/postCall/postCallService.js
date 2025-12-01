const StructuredNotesService = require('./structuredNotesService');
const sttRepository = require('../stt/repositories');
const sessionRepository = require('../../common/repositories/session');
const authService = require('../../common/services/authService');
const { meetingNotesRepository, meetingTasksRepository } = require('./repositories');

/**
 * Post-Call Service
 * Orchestre la génération des notes de réunion structurées
 * et la gestion des tâches post-meeting
 */
class PostCallService {
    constructor() {
        this.structuredNotesService = new StructuredNotesService();
        this.isProcessing = false;

        // Setup callbacks for structured notes service
        this.structuredNotesService.setCallbacks({
            onNotesGenerated: (notes) => {
                console.log('[PostCallService] Structured notes generated successfully');
            },
            onGenerationError: (error) => {
                console.error('[PostCallService] Error generating notes:', error);
            },
            onStatusUpdate: (status) => {
                console.log('[PostCallService] Status:', status);
                this._updateStatus(status);
            }
        });

        // Callbacks
        this.onNotesReady = null;
        this.onTasksExtracted = null;
        this.onProcessingComplete = null;
        this.onProcessingError = null;
        this.onStatusUpdate = null;
    }

    setCallbacks({ onNotesReady, onTasksExtracted, onProcessingComplete, onProcessingError, onStatusUpdate }) {
        this.onNotesReady = onNotesReady;
        this.onTasksExtracted = onTasksExtracted;
        this.onProcessingComplete = onProcessingComplete;
        this.onProcessingError = onProcessingError;
        this.onStatusUpdate = onStatusUpdate;
    }

    /**
     * Génère les notes de réunion pour une session
     * @param {string} sessionId - ID de la session
     * @param {Object} options - Options de génération
     * @param {string} options.meetingType - Type de réunion (sales, internal, etc.)
     * @returns {Promise<Object>} Meeting notes object with ID
     */
    async generateMeetingNotes(sessionId, options = {}) {
        if (this.isProcessing) {
            throw new Error('Post-call processing already in progress');
        }

        this.isProcessing = true;
        this._updateStatus('Démarrage du traitement post-meeting...');

        try {
            // 1. Get session data
            const session = sessionRepository.getById(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Fix MEDIUM BUG-M17: Validate session has required properties
            if (!session.started_at || !session.session_type) {
                throw new Error(`Session ${sessionId} is malformed - missing required properties`);
            }

            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('No authenticated user found');
            }

            // 2. Get transcripts for this session
            this._updateStatus('Récupération de la transcription...');
            const transcripts = await sttRepository.getTranscriptsBySessionId(sessionId);

            if (!transcripts || transcripts.length === 0) {
                throw new Error('No transcripts found for this session');
            }

            console.log(`[PostCallService] Found ${transcripts.length} transcript entries for session ${sessionId}`);

            // 3. Calculate meeting metadata
            const meetingMetadata = this._calculateMeetingMetadata(session, transcripts);
            meetingMetadata.meetingType = options.meetingType || 'general';

            // 4. Generate structured notes using AI
            this._updateStatus('Génération des notes structurées...');
            const structuredData = await this.structuredNotesService.generateStructuredNotes({
                transcripts,
                sessionId,
                meetingMetadata
            });

            // 5. Save to database
            this._updateStatus('Sauvegarde des notes...');
            const noteId = await this._saveMeetingNotes(sessionId, user.uid, structuredData);

            // 6. Extract and save tasks
            this._updateStatus('Extraction des tâches...');
            const tasks = await this._extractAndSaveTasks(noteId, sessionId, user.uid, structuredData);

            // 7. Mark session as having post notes
            await this._markSessionAsProcessed(sessionId);

            this._updateStatus('Traitement terminé avec succès');

            const result = {
                noteId,
                sessionId,
                tasksCount: tasks.length,
                structuredData,
                tasks
            };

            // Trigger callbacks
            if (this.onNotesReady) {
                this.onNotesReady(structuredData);
            }

            if (this.onTasksExtracted) {
                this.onTasksExtracted(tasks);
            }

            if (this.onProcessingComplete) {
                this.onProcessingComplete(result);
            }

            console.log(`[PostCallService] ✅ Processing complete for session ${sessionId}`);

            return result;

        } catch (error) {
            console.error('[PostCallService] ❌ Error processing post-call:', error);
            this._updateStatus('Erreur lors du traitement');

            if (this.onProcessingError) {
                this.onProcessingError(error);
            }

            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get meeting notes for a session
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Meeting notes or null
     */
    getMeetingNotesBySessionId(sessionId) {
        try {
            return meetingNotesRepository.getBySessionId(sessionId);
        } catch (error) {
            console.error('[PostCallService] Error getting meeting notes:', error);
            return null;
        }
    }

    /**
     * Get tasks for a meeting note
     * @param {string} meetingNoteId - Meeting note ID
     * @returns {Array<Object>} Array of tasks
     */
    getTasksByMeetingNoteId(meetingNoteId) {
        try {
            return meetingTasksRepository.getByMeetingNoteId(meetingNoteId);
        } catch (error) {
            console.error('[PostCallService] Error getting tasks:', error);
            return [];
        }
    }

    /**
     * Get all meeting notes for a user
     * @param {string} uid - User ID
     * @returns {Array<Object>} Array of meeting notes
     */
    getAllMeetingNotes(uid) {
        try {
            return meetingNotesRepository.getAllByUserId(uid);
        } catch (error) {
            console.error('[PostCallService] Error getting all meeting notes:', error);
            return [];
        }
    }

    /**
     * Mark task as completed
     * @param {string} taskId - Task ID
     * @returns {Object} Update result
     */
    completeTask(taskId) {
        try {
            return meetingTasksRepository.markCompleted(taskId);
        } catch (error) {
            console.error('[PostCallService] Error completing task:', error);
            throw error;
        }
    }

    /**
     * Update task
     * @param {string} taskId - Task ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Update result
     */
    updateTask(taskId, updates) {
        try {
            return meetingTasksRepository.update(taskId, updates);
        } catch (error) {
            console.error('[PostCallService] Error updating task:', error);
            throw error;
        }
    }

    /**
     * Delete meeting notes and related tasks
     * @param {string} noteId - Meeting note ID
     * @returns {Object} Delete result
     */
    deleteMeetingNotes(noteId) {
        try {
            return meetingNotesRepository.deleteWithRelatedData(noteId);
        } catch (error) {
            console.error('[PostCallService] Error deleting meeting notes:', error);
            throw error;
        }
    }

    /**
     * Calculate meeting metadata from session and transcripts
     * @private
     */
    _calculateMeetingMetadata(session, transcripts) {
        // Fix MEDIUM BUG-M23: Add defensive property checks
        if (!session.started_at || typeof session.started_at !== 'number') {
            throw new Error('[PostCallService] Session missing valid started_at timestamp');
        }

        const startTime = session.started_at;
        const endTime = session.ended_at || Math.floor(Date.now() / 1000);

        // Validate endTime is after startTime
        if (endTime < startTime) {
            throw new Error('[PostCallService] Session end time is before start time');
        }

        const durationSeconds = endTime - startTime;

        // Format duration as HH:MM:SS or MM:SS
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;

        let durationStr;
        if (hours > 0) {
            durationStr = `${hours}h ${minutes}min`;
        } else {
            durationStr = `${minutes}min ${seconds}s`;
        }

        return {
            duration: durationStr,
            durationSeconds,
            startedAt: new Date(startTime * 1000).toISOString(),
            endedAt: new Date(endTime * 1000).toISOString(),
            transcriptCount: transcripts.length
        };
    }

    /**
     * Save meeting notes to database
     * @private
     */
    async _saveMeetingNotes(sessionId, uid, structuredData) {
        try {
            const noteId = meetingNotesRepository.create({
                sessionId,
                uid,
                structuredData,
                modelUsed: structuredData.metadata?.model || '',
                tokensUsed: structuredData.metadata?.tokensUsed || 0
            });

            console.log(`[PostCallService] Saved meeting notes with ID: ${noteId}`);
            return noteId;
        } catch (error) {
            console.error('[PostCallService] Error saving meeting notes:', error);
            throw error;
        }
    }

    /**
     * Extract tasks from structured data and save to database
     * @private
     */
    async _extractAndSaveTasks(noteId, sessionId, uid, structuredData) {
        const actionItems = structuredData.actionItems || [];

        if (actionItems.length === 0) {
            console.log('[PostCallService] No action items to save');
            return [];
        }

        try {
            const tasks = actionItems.map(item => ({
                meetingNoteId: noteId,
                sessionId,
                uid,
                taskDescription: item.task,
                assignedTo: item.assignedTo || 'TBD',
                deadline: item.deadline || 'TBD',
                priority: item.priority || 'medium',
                context: item.context || ''
            }));

            const taskIds = meetingTasksRepository.createBulk(tasks);

            console.log(`[PostCallService] Created ${taskIds.length} tasks`);

            // Return tasks with IDs
            return taskIds.map((id, index) => ({
                id,
                ...tasks[index]
            }));
        } catch (error) {
            console.error('[PostCallService] Error extracting/saving tasks:', error);
            // Don't throw - tasks are not critical
            return [];
        }
    }

    /**
     * Mark session as having post-meeting notes
     * Fix HIGH BUG: Now persists the flag in the database
     * @private
     */
    async _markSessionAsProcessed(sessionId) {
        try {
            await sessionRepository.markAsPostProcessed(sessionId);
            console.log(`[PostCallService] Session ${sessionId} marked as post-processed in database`);
        } catch (error) {
            // Log but don't fail - the meeting notes are still saved
            console.error(`[PostCallService] Failed to mark session as processed:`, error);
        }
    }

    /**
     * Fix HIGH BUG: Check if a session has already been processed
     * Useful to avoid duplicate processing
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} True if already processed
     */
    async isSessionProcessed(sessionId) {
        try {
            return await sessionRepository.isPostProcessed(sessionId);
        } catch (error) {
            console.error('[PostCallService] Error checking session processed status:', error);
            // Check if meeting notes exist as fallback
            const notes = this.getMeetingNotesBySessionId(sessionId);
            return notes !== null;
        }
    }

    /**
     * Fix HIGH BUG: Get sessions that need post-processing
     * Useful for recovering from app restarts during processing
     * @returns {Promise<Array>} List of unprocessed sessions
     */
    async getUnprocessedSessions() {
        try {
            return await sessionRepository.getUnprocessedSessions();
        } catch (error) {
            console.error('[PostCallService] Error getting unprocessed sessions:', error);
            return [];
        }
    }

    /**
     * Update status for callbacks
     * @private
     */
    _updateStatus(status) {
        console.log(`[PostCallService] Status: ${status}`);
        if (this.onStatusUpdate) {
            this.onStatusUpdate(status);
        }
    }

    /**
     * Check if service is currently processing
     */
    isCurrentlyProcessing() {
        return this.isProcessing;
    }
}

// Singleton instance
const postCallService = new PostCallService();
module.exports = postCallService;
