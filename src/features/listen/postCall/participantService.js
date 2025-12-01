const { sessionParticipantsRepository } = require('./repositories');
const sttRepository = require('../stt/repositories');
const authService = require('../../common/services/authService');

/**
 * Participant Service
 * Manages speaker attribution and participant information for listen sessions
 */
class ParticipantService {
    constructor() {
        console.log('[ParticipantService] Initialized');
    }

    /**
     * Get all participants for a session
     * @param {string} sessionId - Session ID
     * @returns {Array<Object>} Array of participants
     */
    getSessionParticipants(sessionId) {
        try {
            return sessionParticipantsRepository.getBySessionId(sessionId);
        } catch (error) {
            console.error('[ParticipantService] Error getting session participants:', error);
            throw error;
        }
    }

    /**
     * Detect unique speakers from transcripts
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array<string>>} Array of unique speaker labels
     */
    async detectSpeakers(sessionId) {
        try {
            const transcripts = await sttRepository.getTranscriptsBySessionId(sessionId);

            if (!transcripts || transcripts.length === 0) {
                return [];
            }

            // Extract unique speakers
            const speakers = [...new Set(transcripts.map(t => t.speaker).filter(Boolean))];

            console.log(`[ParticipantService] Detected ${speakers.length} speakers for session ${sessionId}:`, speakers);
            return speakers;
        } catch (error) {
            console.error('[ParticipantService] Error detecting speakers:', error);
            throw error;
        }
    }

    /**
     * Check if participants are assigned for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} True if all speakers have assigned participants
     */
    async hasParticipantsAssigned(sessionId) {
        try {
            const speakers = await this.detectSpeakers(sessionId);
            const participants = this.getSessionParticipants(sessionId);

            // Check if we have a participant for each speaker
            const assignedLabels = new Set(participants.map(p => p.speaker_label));

            return speakers.every(speaker => assignedLabels.has(speaker));
        } catch (error) {
            console.error('[ParticipantService] Error checking participants assignment:', error);
            return false;
        }
    }

    /**
     * Save participants for a session
     * @param {string} sessionId - Session ID
     * @param {Array<Object>} participantsData - Array of participant data
     * @returns {Array<string>} Array of participant IDs
     */
    saveParticipants(sessionId, participantsData) {
        try {
            // Prepare data for upsert
            const participants = participantsData.map(p => ({
                sessionId,
                speakerLabel: p.speakerLabel,
                participantName: p.name,
                participantEmail: p.email || null,
                participantRole: p.role || null,
                participantCompany: p.company || null
            }));

            const ids = sessionParticipantsRepository.bulkUpsert(participants);

            console.log(`[ParticipantService] Saved ${ids.length} participants for session ${sessionId}`);
            return ids;
        } catch (error) {
            console.error('[ParticipantService] Error saving participants:', error);
            throw error;
        }
    }

    /**
     * Get frequently used participants for autocomplete
     * @param {number} [limit=10] - Max number of results
     * @returns {Array<Object>} Array of frequent participants
     */
    getFrequentParticipants(limit = 10) {
        try {
            const uid = authService.getCurrentUserId();
            return sessionParticipantsRepository.getFrequentParticipants(uid, limit);
        } catch (error) {
            console.error('[ParticipantService] Error getting frequent participants:', error);
            return [];
        }
    }

    /**
     * Get participant mapping for a session
     * Returns a map of speaker labels to participant names
     * @param {string} sessionId - Session ID
     * @returns {Object} Map of speaker label -> participant name
     */
    getParticipantMapping(sessionId) {
        try {
            const participants = this.getSessionParticipants(sessionId);

            const mapping = {};
            participants.forEach(p => {
                mapping[p.speaker_label] = {
                    name: p.participant_name,
                    email: p.participant_email,
                    role: p.participant_role,
                    company: p.participant_company
                };
            });

            return mapping;
        } catch (error) {
            console.error('[ParticipantService] Error getting participant mapping:', error);
            return {};
        }
    }

    /**
     * Replace speaker labels in text with actual participant names
     * @param {string} text - Text containing speaker labels
     * @param {Object} mapping - Speaker label -> participant info map
     * @returns {string} Text with replaced names
     */
    replaceSpeakerLabels(text, mapping) {
        if (!text || !mapping) return text;

        // Fix MEDIUM BUG-M27: Optimize multiple regex replacements with single combined regex
        // Build single regex pattern for all labels for better performance
        const labels = Object.keys(mapping);
        if (labels.length === 0) return text;

        // Escape special regex characters in labels
        const escapedLabels = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // Create combined pattern that matches any label with optional colon
        // Pattern: (Label1|Label2|Label3)(:\s*|\b(?![a-z]))
        const combinedPattern = new RegExp(
            `\\b(${escapedLabels.join('|')})(:\\s*|\\b(?![a-z]))`,
            'gi'
        );

        // Single pass replacement
        const result = text.replace(combinedPattern, (match, label, suffix) => {
            const name = mapping[label.toLowerCase()]?.name || mapping[label]?.name || label;
            // Preserve the colon and spacing if present
            return suffix.includes(':') ? `${name}: ` : name + (suffix || '');
        });

        return result;
    }

    /**
     * Update meeting notes with participant names
     * Replaces speaker labels in structured notes
     * @param {Object} meetingNotes - Meeting notes object
     * @param {string} sessionId - Session ID
     * @returns {Object} Updated meeting notes
     */
    updateNotesWithParticipants(meetingNotes, sessionId) {
        try {
            const mapping = this.getParticipantMapping(sessionId);

            if (Object.keys(mapping).length === 0) {
                console.log('[ParticipantService] No participants assigned, returning original notes');
                return meetingNotes;
            }

            // Fix MEDIUM BUG-M22: Safe JSON parsing with structure validation
            let data;
            try {
                data = typeof meetingNotes.full_structured_data === 'string'
                    ? JSON.parse(meetingNotes.full_structured_data)
                    : meetingNotes.full_structured_data;

                // Validate expected structure
                if (!data || typeof data !== 'object') {
                    throw new Error('Structured data is not an object');
                }
            } catch (parseError) {
                console.error('[ParticipantService] Invalid JSON in structured data:', parseError);
                // Return original notes if parsing fails
                return meetingNotes;
            }

            // Replace in executive summary
            if (data.executiveSummary) {
                data.executiveSummary = this.replaceSpeakerLabels(data.executiveSummary, mapping);
            }

            // Replace in key points
            if (data.keyPoints && Array.isArray(data.keyPoints)) {
                data.keyPoints = data.keyPoints.map(point =>
                    this.replaceSpeakerLabels(point, mapping)
                );
            }

            // Replace in decisions
            if (data.decisions && Array.isArray(data.decisions)) {
                data.decisions = data.decisions.map(decision => ({
                    ...decision,
                    decision: this.replaceSpeakerLabels(decision.decision || '', mapping),
                    description: this.replaceSpeakerLabels(decision.description || '', mapping),
                    rationale: this.replaceSpeakerLabels(decision.rationale || '', mapping)
                }));
            }

            // Replace in action items
            if (data.actionItems && Array.isArray(data.actionItems)) {
                data.actionItems = data.actionItems.map(item => ({
                    ...item,
                    task: this.replaceSpeakerLabels(item.task || '', mapping),
                    assignedTo: this.replaceSpeakerLabels(item.assignedTo || '', mapping),
                    context: this.replaceSpeakerLabels(item.context || '', mapping)
                }));
            }

            // Replace in important quotes
            if (data.importantQuotes && Array.isArray(data.importantQuotes)) {
                data.importantQuotes = data.importantQuotes.map(quote => ({
                    ...quote,
                    speaker: this.replaceSpeakerLabels(quote.speaker || '', mapping),
                    quote: this.replaceSpeakerLabels(quote.quote || '', mapping)
                }));
            }

            // Update participants list if exists
            if (data.participants && Array.isArray(data.participants)) {
                // Replace generic labels with actual names
                data.participants = data.participants.map(p =>
                    this.replaceSpeakerLabels(p, mapping)
                );
            } else {
                // Add participants list if it doesn't exist
                data.participants = Object.values(mapping).map(info => {
                    let name = info.name;
                    if (info.role) name += ` (${info.role})`;
                    if (info.company) name += ` - ${info.company}`;
                    return name;
                });
            }

            // Return updated notes
            return {
                ...meetingNotes,
                full_structured_data: JSON.stringify(data),
                participants: JSON.stringify(data.participants)
            };
        } catch (error) {
            console.error('[ParticipantService] Error updating notes with participants:', error);
            return meetingNotes;
        }
    }

    /**
     * Delete all participants for a session
     * @param {string} sessionId - Session ID
     * @returns {Object} Delete result
     */
    deleteSessionParticipants(sessionId) {
        try {
            return sessionParticipantsRepository.deleteBySessionId(sessionId);
        } catch (error) {
            console.error('[ParticipantService] Error deleting session participants:', error);
            throw error;
        }
    }
}

// Singleton instance
const participantService = new ParticipantService();
module.exports = participantService;
