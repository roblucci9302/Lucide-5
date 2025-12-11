const { meetingNotesRepository, meetingTasksRepository } = require('./repositories');
const participantService = require('./participantService');
const taskManagementService = require('./taskManagementService');
const authService = require('../../common/services/authService');
const aiService = require('../../common/services/aiService');
const modelStateService = require('../../common/services/modelStateService'); // P2-2: User's AI model config

/**
 * Follow-up Suggestions Service - Phase 2.4
 * Intelligent suggestions for follow-up actions based on meeting analysis and historical patterns
 */
class FollowUpSuggestionsService {
    constructor() {
        console.log('[FollowUpSuggestionsService] Initialized');
    }

    /**
     * Generate intelligent follow-up suggestions for a session
     * @param {string} sessionId - Session ID
     * @param {Object} options - Generation options
     * @returns {Promise<Array<Object>>} Array of suggestions
     */
    async generateSuggestions(sessionId, options = {}) {
        try {
            console.log(`[FollowUpSuggestionsService] Generating suggestions for session ${sessionId}`);

            // Get current meeting data
            const meetingNotes = meetingNotesRepository.getBySessionId(sessionId);
            if (!meetingNotes) {
                throw new Error('Meeting notes not found');
            }

            const tasks = meetingTasksRepository.getBySessionId(sessionId);
            const participants = participantService.getSessionParticipants(sessionId);

            // Parse structured data
            const structuredData = typeof meetingNotes.full_structured_data === 'string'
                ? JSON.parse(meetingNotes.full_structured_data)
                : meetingNotes.full_structured_data;

            // Get historical context
            const uid = authService.getCurrentUserId();
            const historicalMeetings = meetingNotesRepository.getAllByUserId(uid);

            // Generate different types of suggestions
            const suggestions = [];

            // 1. Pattern-based suggestions from history
            const patternSuggestions = this._analyzeHistoricalPatterns(
                structuredData,
                tasks,
                participants,
                historicalMeetings
            );
            suggestions.push(...patternSuggestions);

            // 2. AI-powered suggestions (if enabled)
            if (options.useAI !== false) {
                try {
                    const aiSuggestions = await this._generateAISuggestions(
                        structuredData,
                        tasks,
                        participants
                    );
                    suggestions.push(...aiSuggestions);
                } catch (error) {
                    console.error('[FollowUpSuggestionsService] AI suggestions failed:', error);
                }
            }

            // 3. Task-based suggestions
            const taskSuggestions = this._analyzeTasksForSuggestions(tasks, participants);
            suggestions.push(...taskSuggestions);

            // 4. Deadline-based reminders
            const reminderSuggestions = this._generateReminderSuggestions(tasks);
            suggestions.push(...reminderSuggestions);

            // Score and rank suggestions
            const rankedSuggestions = this._rankSuggestions(suggestions);

            console.log(`[FollowUpSuggestionsService] Generated ${rankedSuggestions.length} suggestions`);
            return rankedSuggestions;

        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error generating suggestions:', error);
            throw error;
        }
    }

    /**
     * Analyze historical patterns to suggest follow-ups
     * @private
     */
    _analyzeHistoricalPatterns(currentData, currentTasks, currentParticipants, historicalMeetings) {
        const suggestions = [];

        try {
            // Find similar meetings by participant overlap
            const participantEmails = new Set(
                currentParticipants.map(p => p.participant_email).filter(Boolean)
            );

            const similarMeetings = historicalMeetings.filter(meeting => {
                try {
                    const meetingParticipants = JSON.parse(meeting.participants || '[]');
                    const overlap = meetingParticipants.filter(p =>
                        participantEmails.has(p.email || p)
                    ).length;
                    return overlap >= 1; // At least one participant in common
                } catch (e) {
                    return false;
                }
            });

            // Check for recurring meeting patterns
            if (similarMeetings.length >= 2) {
                suggestions.push({
                    type: 'recurring_meeting',
                    title: 'Récurrence détectée avec ces participants',
                    description: `${similarMeetings.length} réunions similaires trouvées. Planifier une prochaine réunion ?`,
                    action: 'schedule_followup_meeting',
                    priority: 'medium',
                    confidence: Math.min(0.9, similarMeetings.length / 5),
                    metadata: {
                        similarMeetingCount: similarMeetings.length,
                        suggestedInterval: this._calculateAverageInterval(similarMeetings)
                    }
                });
            }

            // Check for incomplete tasks from previous meetings
            const previousTasks = [];
            similarMeetings.slice(0, 3).forEach(meeting => {
                const tasks = meetingTasksRepository.getBySessionId(meeting.session_id);
                previousTasks.push(...tasks.filter(t =>
                    t.status !== 'completed' && t.status !== 'cancelled'
                ));
            });

            if (previousTasks.length > 0) {
                suggestions.push({
                    type: 'incomplete_tasks',
                    title: `${previousTasks.length} tâches non terminées des réunions précédentes`,
                    description: 'Faire le point sur les tâches en attente avec ces participants',
                    action: 'review_incomplete_tasks',
                    priority: 'high',
                    confidence: 0.85,
                    metadata: {
                        taskCount: previousTasks.length,
                        oldestTask: previousTasks.sort((a, b) =>
                            (a.created_at || 0) - (b.created_at || 0)
                        )[0]
                    }
                });
            }

        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error analyzing patterns:', error);
        }

        return suggestions;
    }

    /**
     * Generate AI-powered suggestions using Claude
     * @private
     */
    async _generateAISuggestions(structuredData, tasks, participants) {
        const suggestions = [];

        try {
            const prompt = this._buildAISuggestionsPrompt(structuredData, tasks, participants);

            // P2-2: Use user's configured AI model instead of hardcoded 'gpt-4o'
            const modelConfig = await modelStateService.getCurrentModelInfo('llm');
            const modelId = modelConfig?.modelId || 'gpt-4o';

            const response = await aiService.generateResponse(prompt, {
                model: modelId,
                maxTokens: 1500,
                temperature: 0.7
            });

            // Parse AI response
            const parsedSuggestions = this._parseAISuggestions(response);
            suggestions.push(...parsedSuggestions);

        } catch (error) {
            console.error('[FollowUpSuggestionsService] AI generation error:', error);
        }

        return suggestions;
    }

    /**
     * Build prompt for AI suggestions
     * @private
     */
    _buildAISuggestionsPrompt(data, tasks, participants) {
        const participantNames = participants.map(p => p.participant_name).join(', ');

        return `You are a meeting follow-up assistant. Based on the following meeting, suggest 3-5 intelligent follow-up actions.

**Meeting Summary:**
${data.executiveSummary || 'No summary available'}

**Key Discussion Points:**
${data.keyPoints?.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None'}

**Decisions Made:**
${data.decisions?.map((d, i) => `${i + 1}. ${d.decision || d.title}`).join('\n') || 'None'}

**Action Items:**
${tasks.map((t, i) => `${i + 1}. ${t.task_description} (${t.assigned_to}, ${t.deadline})`).join('\n') || 'None'}

**Participants:**
${participantNames || 'None'}

**Instructions:**
Generate 3-5 actionable follow-up suggestions. Each suggestion should:
1. Be specific and actionable
2. Add value beyond the existing action items
3. Consider the context and outcomes of the meeting
4. Be realistic and achievable

Format your response as JSON:
{
  "suggestions": [
    {
      "title": "Brief title of the suggestion",
      "description": "Detailed description explaining why this follow-up is important",
      "action": "specific_action_type",
      "priority": "high|medium|low",
      "timeframe": "when to do this (e.g., 'dans 2 jours', 'avant la fin de semaine')"
    }
  ]
}

Focus on:
- Sharing meeting outcomes with stakeholders not present
- Scheduling follow-up discussions if needed
- Documenting decisions in shared tools
- Preparing for next steps mentioned in the meeting
- Checking in on action items progress

Generate suggestions now:`;
    }

    /**
     * Parse AI-generated suggestions
     * @private
     */
    _parseAISuggestions(response) {
        const suggestions = [];

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                    parsed.suggestions.forEach((s, index) => {
                        suggestions.push({
                            type: 'ai_generated',
                            title: s.title || `Suggestion ${index + 1}`,
                            description: s.description || '',
                            action: s.action || 'custom_action',
                            priority: s.priority || 'medium',
                            confidence: 0.75, // AI suggestions get 75% confidence
                            metadata: {
                                timeframe: s.timeframe,
                                source: 'claude-ai'
                            }
                        });
                    });
                }
            }
        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error parsing AI suggestions:', error);
        }

        return suggestions;
    }

    /**
     * Analyze tasks for follow-up suggestions
     * @private
     */
    _analyzeTasksForSuggestions(tasks, participants) {
        const suggestions = [];

        try {
            // High priority tasks without assignee
            const unassignedHighPriority = tasks.filter(t =>
                t.priority === 'high' &&
                (!t.assigned_to || t.assigned_to === 'TBD')
            );

            if (unassignedHighPriority.length > 0) {
                suggestions.push({
                    type: 'unassigned_tasks',
                    title: `${unassignedHighPriority.length} tâche(s) prioritaire(s) non assignée(s)`,
                    description: 'Assigner ces tâches urgentes à des responsables spécifiques',
                    action: 'assign_high_priority_tasks',
                    priority: 'high',
                    confidence: 0.95,
                    metadata: {
                        taskIds: unassignedHighPriority.map(t => t.id),
                        taskCount: unassignedHighPriority.length
                    }
                });
            }

            // Tasks with upcoming deadlines (within 3 days)
            const upcomingTasks = taskManagementService.getUpcomingTasks(3);
            if (upcomingTasks.length > 0) {
                suggestions.push({
                    type: 'upcoming_deadlines',
                    title: `${upcomingTasks.length} échéance(s) dans les 3 prochains jours`,
                    description: 'Vérifier la progression de ces tâches urgentes',
                    action: 'check_upcoming_tasks',
                    priority: 'high',
                    confidence: 0.9,
                    metadata: {
                        taskIds: upcomingTasks.map(t => t.id),
                        taskCount: upcomingTasks.length
                    }
                });
            }

            // Tasks without email attribution
            const tasksWithoutEmail = tasks.filter(t =>
                t.assigned_to &&
                t.assigned_to !== 'TBD' &&
                !t.assigned_to_email
            );

            if (tasksWithoutEmail.length > 0 && participants.length > 0) {
                suggestions.push({
                    type: 'missing_email_attribution',
                    title: 'Attribuer des emails aux tâches assignées',
                    description: `${tasksWithoutEmail.length} tâche(s) assignée(s) sans email. Utiliser l'attribution automatique.`,
                    action: 'auto_assign_emails',
                    priority: 'medium',
                    confidence: 0.8,
                    metadata: {
                        taskCount: tasksWithoutEmail.length
                    }
                });
            }

        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error analyzing tasks:', error);
        }

        return suggestions;
    }

    /**
     * Generate reminder suggestions based on deadlines
     * @private
     */
    _generateReminderSuggestions(tasks) {
        const suggestions = [];

        try {
            // Tasks with deadlines but no reminders
            const tasksNeedingReminders = tasks.filter(t =>
                t.deadline &&
                t.deadline !== 'TBD' &&
                !t.reminder_date &&
                t.status !== 'completed' &&
                t.status !== 'cancelled'
            );

            if (tasksNeedingReminders.length > 0) {
                suggestions.push({
                    type: 'set_reminders',
                    title: 'Planifier des rappels pour les tâches à échéance',
                    description: `${tasksNeedingReminders.length} tâche(s) avec échéance sans rappel configuré`,
                    action: 'setup_task_reminders',
                    priority: 'low',
                    confidence: 0.7,
                    metadata: {
                        taskCount: tasksNeedingReminders.length,
                        taskIds: tasksNeedingReminders.map(t => t.id)
                    }
                });
            }

        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error generating reminder suggestions:', error);
        }

        return suggestions;
    }

    /**
     * Rank suggestions by priority and confidence
     * @private
     */
    _rankSuggestions(suggestions) {
        // Calculate score for each suggestion
        const scored = suggestions.map(s => {
            const priorityWeight = {
                high: 3,
                medium: 2,
                low: 1
            };

            const score = (priorityWeight[s.priority] || 2) * (s.confidence || 0.5);

            return { ...s, score };
        });

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Limit to top 10 suggestions
        return scored.slice(0, 10);
    }

    /**
     * Calculate average interval between meetings
     * @private
     */
    _calculateAverageInterval(meetings) {
        if (meetings.length < 2) return null;

        const sorted = meetings.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
        const intervals = [];

        for (let i = 1; i < sorted.length; i++) {
            const interval = (sorted[i].created_at - sorted[i - 1].created_at) / (1000 * 60 * 60 * 24); // days
            intervals.push(interval);
        }

        const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if (avgDays < 1) return 'quotidien';
        if (avgDays <= 7) return 'hebdomadaire';
        if (avgDays <= 14) return 'bi-hebdomadaire';
        if (avgDays <= 31) return 'mensuel';
        return `tous les ${Math.round(avgDays)} jours`;
    }

    /**
     * Accept a suggestion and execute its action
     * @param {string} sessionId - Session ID
     * @param {Object} suggestion - Suggestion to accept
     * @returns {Promise<Object>} Result of action
     */
    async acceptSuggestion(sessionId, suggestion) {
        try {
            console.log(`[FollowUpSuggestionsService] Accepting suggestion: ${suggestion.type}`);

            let result = { success: true, message: 'Suggestion acceptée' };

            switch (suggestion.action) {
                case 'auto_assign_emails':
                    result = await taskManagementService.autoAssignEmails(sessionId);
                    break;

                case 'assign_high_priority_tasks':
                    result = {
                        success: true,
                        message: 'Ouvrir l\'interface d\'assignation des tâches',
                        action: 'open_task_assignment',
                        taskIds: suggestion.metadata?.taskIds
                    };
                    break;

                case 'check_upcoming_tasks':
                    result = {
                        success: true,
                        message: 'Ouvrir les tâches à échéance proche',
                        action: 'filter_upcoming_tasks'
                    };
                    break;

                case 'setup_task_reminders':
                    result = {
                        success: true,
                        message: 'Configurer les rappels pour les tâches',
                        action: 'open_reminder_setup',
                        taskIds: suggestion.metadata?.taskIds
                    };
                    break;

                case 'schedule_followup_meeting':
                    result = {
                        success: true,
                        message: 'Ouvrir le calendrier pour planifier une réunion',
                        action: 'open_calendar',
                        suggestedInterval: suggestion.metadata?.suggestedInterval
                    };
                    break;

                case 'review_incomplete_tasks':
                    result = {
                        success: true,
                        message: 'Afficher les tâches incomplètes',
                        action: 'show_incomplete_tasks'
                    };
                    break;

                default:
                    result = {
                        success: true,
                        message: 'Action personnalisée',
                        action: 'custom',
                        suggestion
                    };
            }

            return result;

        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error accepting suggestion:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Dismiss a suggestion
     * @param {string} sessionId - Session ID
     * @param {string} suggestionType - Type of suggestion to dismiss
     * @returns {Object} Result
     */
    dismissSuggestion(sessionId, suggestionType) {
        try {
            console.log(`[FollowUpSuggestionsService] Dismissing suggestion: ${suggestionType}`);

            // Could store dismissed suggestions in database to avoid re-suggesting
            // For now, just return success

            return {
                success: true,
                message: 'Suggestion ignorée'
            };

        } catch (error) {
            console.error('[FollowUpSuggestionsService] Error dismissing suggestion:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Singleton instance
const followUpSuggestionsService = new FollowUpSuggestionsService();
module.exports = followUpSuggestionsService;
