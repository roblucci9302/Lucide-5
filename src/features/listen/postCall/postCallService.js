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

    setCallbacks({ onNotesReady, onTasksExtracted, onProcessingComplete, onProcessingError, onStatusUpdate, onProgressUpdate }) {
        this.onNotesReady = onNotesReady;
        this.onTasksExtracted = onTasksExtracted;
        this.onProcessingComplete = onProcessingComplete;
        this.onProcessingError = onProcessingError;
        this.onStatusUpdate = onStatusUpdate;
        this.onProgressUpdate = onProgressUpdate; // P1-4: Real progress callback
    }

    /**
     * P1-4: Update progress with step number and message
     * @param {number} step - Current step (1-4)
     * @param {string} message - Progress message
     * @private
     */
    _updateProgress(step, message) {
        console.log(`[PostCallService] Progress: Step ${step}/4 - ${message}`);
        if (this.onProgressUpdate) {
            this.onProgressUpdate({ step, totalSteps: 4, message });
        }
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

        // FIX CRITICAL: Check if session has already been processed to prevent duplicates
        const alreadyProcessed = await sessionRepository.isPostProcessed(sessionId);
        if (alreadyProcessed && !options.forceRegenerate) {
            console.log(`[PostCallService] Session ${sessionId} already has meeting notes. Use forceRegenerate to override.`);
            // Return existing notes instead of creating duplicates
            const existingNotes = await meetingNotesRepository.getBySessionId(sessionId);
            if (existingNotes) {
                return existingNotes;
            }
            // If flag says processed but no notes found, allow regeneration
            console.warn(`[PostCallService] Session marked as processed but no notes found. Regenerating...`);
        }

        this.isProcessing = true;
        this._updateStatus('Démarrage du traitement post-meeting...');
        this._updateProgress(1, 'Récupération de la transcription...'); // P1-4

        try {
            // 1. Get session data
            // FIX: Added await - getById is async
            const session = await sessionRepository.getById(sessionId);
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

            // FIX HIGH: Provide user-friendly error message for empty transcripts
            if (!transcripts || transcripts.length === 0) {
                const errorMsg = 'Aucune transcription trouvée pour cette session. ' +
                    'Assurez-vous d\'avoir parlé pendant la session et que le micro fonctionnait correctement.';
                console.error(`[PostCallService] No transcripts for session ${sessionId}`);
                throw new Error(errorMsg);
            }

            // FIX HIGH: Validate transcript entries have required fields
            const validTranscripts = transcripts.filter(t => t && t.text && t.text.trim().length > 0);
            if (validTranscripts.length === 0) {
                const errorMsg = 'Les transcriptions sont vides ou invalides. ' +
                    'Veuillez vérifier que l\'audio a été correctement capturé.';
                console.error(`[PostCallService] All transcripts are empty/invalid for session ${sessionId}`);
                throw new Error(errorMsg);
            }

            if (validTranscripts.length < transcripts.length) {
                console.warn(`[PostCallService] Filtered out ${transcripts.length - validTranscripts.length} empty/invalid transcripts`);
            }

            console.log(`[PostCallService] Found ${validTranscripts.length} valid transcript entries for session ${sessionId}`);

            // 3. Calculate meeting metadata (use validTranscripts)
            const meetingMetadata = this._calculateMeetingMetadata(session, validTranscripts);
            meetingMetadata.meetingType = options.meetingType || 'general';

            // 4. Generate structured notes using AI (use validTranscripts)
            this._updateStatus('Génération des notes structurées...');
            this._updateProgress(2, 'Génération des notes avec l\'IA...'); // P1-4
            const structuredData = await this.structuredNotesService.generateStructuredNotes({
                transcripts: validTranscripts,
                sessionId,
                meetingMetadata
            });

            // 5. P1-2: Save notes AND tasks in a single atomic transaction
            this._updateStatus('Sauvegarde des notes et tâches...');
            this._updateProgress(3, 'Sauvegarde des notes et tâches...'); // P1-4
            const { noteId, tasks } = await this._saveNotesAndTasksAtomic(
                sessionId,
                user.uid,
                structuredData
            );

            // 6. Mark session as having post notes
            await this._markSessionAsProcessed(sessionId);

            this._updateStatus('Traitement terminé avec succès');
            this._updateProgress(4, 'Traitement terminé !'); // P1-4

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
        const now = Math.floor(Date.now() / 1000);

        // FIX MEDIUM: Validate timestamps are realistic
        // Timestamps should not be in the far future (more than 1 day ahead)
        const oneDayInSeconds = 86400;
        if (startTime > now + oneDayInSeconds) {
            console.warn(`[PostCallService] Session start time is in the future: ${startTime}`);
            throw new Error('[PostCallService] Session start time is in the future');
        }

        // Timestamps should not be before Unix epoch + reasonable app age (2020)
        const minValidTimestamp = 1577836800; // Jan 1, 2020
        if (startTime < minValidTimestamp) {
            console.warn(`[PostCallService] Session start time is too old: ${startTime}`);
            throw new Error('[PostCallService] Session start time is invalid (before 2020)');
        }

        // Validate endTime is after startTime
        if (endTime < startTime) {
            throw new Error('[PostCallService] Session end time is before start time');
        }

        // FIX MEDIUM: Cap maximum duration to 24 hours to detect corruption
        const maxDurationSeconds = 24 * 3600; // 24 hours
        let durationSeconds = endTime - startTime;
        if (durationSeconds > maxDurationSeconds) {
            console.warn(`[PostCallService] Session duration exceeds 24h, capping: ${durationSeconds}s`);
            durationSeconds = maxDurationSeconds;
        }

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
     * P1-2: Save meeting notes AND tasks in a single atomic transaction
     * Prevents data corruption if crash occurs between note and task creation
     * @private
     */
    async _saveNotesAndTasksAtomic(sessionId, uid, structuredData) {
        try {
            const actionItems = structuredData.actionItems || [];

            // Validate and prepare tasks
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            const tasksData = actionItems
                .filter(item => item && item.task && typeof item.task === 'string' && item.task.trim().length > 0)
                .map(item => ({
                    sessionId,
                    uid,
                    taskDescription: item.task.trim(),
                    assignedTo: (item.assignedTo && typeof item.assignedTo === 'string') ? item.assignedTo.trim() : 'TBD',
                    deadline: (item.deadline && typeof item.deadline === 'string') ? item.deadline.trim() : 'TBD',
                    priority: validPriorities.includes(item.priority) ? item.priority : 'medium',
                    context: (item.context && typeof item.context === 'string') ? item.context.trim() : ''
                }));

            // Use atomic transaction to create both notes and tasks
            const { noteId, taskIds } = meetingNotesRepository.createWithTasks(
                {
                    sessionId,
                    uid,
                    structuredData,
                    modelUsed: structuredData.metadata?.model || '',
                    tokensUsed: structuredData.metadata?.tokensUsed || 0
                },
                tasksData
            );

            console.log(`[PostCallService] P1-2: Saved notes (${noteId}) + ${taskIds.length} tasks in atomic transaction`);

            // Return structured result
            const tasks = taskIds.map((id, index) => ({
                id,
                ...tasksData[index]
            }));

            return { noteId, tasks };
        } catch (error) {
            console.error('[PostCallService] P1-2: Atomic save failed:', error);
            throw error;
        }
    }

    /**
     * @deprecated Use _saveNotesAndTasksAtomic instead
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
     * @deprecated Use _saveNotesAndTasksAtomic instead
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
            // FIX MEDIUM: Validate action items before processing
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            const validatedItems = actionItems.filter(item => {
                // Must have a task description
                if (!item || !item.task || typeof item.task !== 'string' || item.task.trim().length === 0) {
                    console.warn('[PostCallService] Skipping action item without valid task:', item);
                    return false;
                }
                return true;
            });

            if (validatedItems.length === 0) {
                console.log('[PostCallService] No valid action items to save after validation');
                return [];
            }

            if (validatedItems.length < actionItems.length) {
                console.warn(`[PostCallService] Filtered out ${actionItems.length - validatedItems.length} invalid action items`);
            }

            const tasks = validatedItems.map(item => ({
                meetingNoteId: noteId,
                sessionId,
                uid,
                taskDescription: item.task.trim(),
                assignedTo: (item.assignedTo && typeof item.assignedTo === 'string') ? item.assignedTo.trim() : 'TBD',
                deadline: (item.deadline && typeof item.deadline === 'string') ? item.deadline.trim() : 'TBD',
                priority: validPriorities.includes(item.priority) ? item.priority : 'medium',
                context: (item.context && typeof item.context === 'string') ? item.context.trim() : ''
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
