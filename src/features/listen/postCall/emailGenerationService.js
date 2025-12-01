const participantService = require('./participantService');
const { meetingNotesRepository, meetingTasksRepository } = require('./repositories');
const aiService = require('../../common/services/aiService');

/**
 * Email Generation Service
 * Generates professional follow-up emails based on meeting notes
 * Uses Claude AI for intelligent, context-aware email composition
 */
class EmailGenerationService {
    constructor() {
        // Fix MEDIUM BUG-M32: Add rate limiting to prevent API quota exhaustion
        this.lastRequestTime = 0;
        this.MIN_REQUEST_INTERVAL_MS = 2000; // Minimum 2 seconds between requests
        console.log('[EmailGenerationService] Initialized');
    }

    /**
     * Generate a follow-up email for a meeting
     * @param {string} sessionId - Session ID
     * @param {Object} options - Generation options
     * @param {string} options.template - Email template type
     * @param {string} options.tone - Email tone (formal, friendly, technical)
     * @param {Array<string>} options.recipients - Email recipients
     * @param {boolean} options.includeActionItems - Include action items
     * @param {boolean} options.includeDecisions - Include decisions
     * @returns {Promise<Object>} Generated email data
     */
    async generateFollowUpEmail(sessionId, options = {}) {
        try {
            console.log(`[EmailGenerationService] Generating email for session ${sessionId}`);

            // Get meeting notes
            const meetingNotes = meetingNotesRepository.getBySessionId(sessionId);
            if (!meetingNotes) {
                throw new Error('No meeting notes found for this session');
            }

            // Get tasks
            const tasks = meetingTasksRepository.getBySessionId(sessionId);

            // Get participant mapping
            const participantMapping = participantService.getParticipantMapping(sessionId);
            const participants = participantService.getSessionParticipants(sessionId);

            // Parse structured data
            const structuredData = typeof meetingNotes.full_structured_data === 'string'
                ? JSON.parse(meetingNotes.full_structured_data)
                : meetingNotes.full_structured_data;

            // Determine template and tone
            const template = options.template || 'standard';
            const tone = options.tone || 'professional';
            const includeActionItems = options.includeActionItems !== false;
            const includeDecisions = options.includeDecisions !== false;

            // Build prompt for Claude
            const prompt = this._buildEmailPrompt(
                structuredData,
                tasks,
                participants,
                template,
                tone,
                includeActionItems,
                includeDecisions
            );

            // Fix MEDIUM BUG-M20: Validate prompt length before AI call
            const MAX_PROMPT_LENGTH = 100000; // ~25k tokens for Claude
            if (prompt.length > MAX_PROMPT_LENGTH) {
                throw new Error(`Prompt too long: ${prompt.length} characters. Maximum: ${MAX_PROMPT_LENGTH}`);
            }

            // Fix MEDIUM BUG-M30: Don't log AI model configuration details in production
            // Model details could reveal internal architecture
            if (process.env.NODE_ENV === 'development') {
                console.log('[EmailGenerationService] Generating email with AI model...');
            }

            // Fix MEDIUM BUG-M32: Apply rate limiting before AI request
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
                const waitTime = this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
                console.log(`[EmailGenerationService] Rate limiting: waiting ${waitTime}ms before next request`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            this.lastRequestTime = Date.now();

            // Generate email using Claude AI
            const generatedContent = await aiService.generateResponse(prompt, {
                model: 'claude-sonnet-4',
                maxTokens: 2000,
                temperature: 0.7
            });

            // Parse the generated email
            const emailData = this._parseGeneratedEmail(generatedContent);

            // Add recipients
            emailData.to = this._determineRecipients(participants, options.recipients);
            emailData.cc = this._determineCCRecipients(participants, options.recipients);

            // Add metadata
            emailData.metadata = {
                sessionId,
                generatedAt: new Date().toISOString(),
                template,
                tone,
                model: 'claude-sonnet-4'
            };

            console.log('[EmailGenerationService] Email generated successfully');
            return emailData;

        } catch (error) {
            console.error('[EmailGenerationService] Error generating email:', error);
            throw error;
        }
    }

    /**
     * Build the prompt for Claude to generate the email
     * @private
     */
    _buildEmailPrompt(structuredData, tasks, participants, template, tone, includeActionItems, includeDecisions) {
        const participantNames = participants.map(p => p.participant_name).join(', ');

        let prompt = `You are a professional email assistant. Generate a follow-up email based on the following meeting notes.

**Meeting Context:**
- Participants: ${participantNames || 'Not specified'}
- Template Type: ${template}
- Desired Tone: ${tone}

**Meeting Summary:**
${structuredData.executiveSummary || 'No summary available'}

`;

        if (structuredData.keyPoints && structuredData.keyPoints.length > 0) {
            prompt += `**Key Discussion Points:**
${structuredData.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`;
        }

        if (includeDecisions && structuredData.decisions && structuredData.decisions.length > 0) {
            prompt += `**Decisions Made:**
${structuredData.decisions.map((d, i) => `${i + 1}. ${d.decision || d.title}: ${d.description || d.rationale || ''}`).join('\n')}

`;
        }

        if (includeActionItems && tasks && tasks.length > 0) {
            prompt += `**Action Items:**
${tasks.map((t, i) => `${i + 1}. ${t.task_description} (Assigned to: ${t.assigned_to}, Deadline: ${t.deadline}, Priority: ${t.priority})`).join('\n')}

`;
        }

        prompt += `
**Instructions:**
1. Generate a professional follow-up email with the following structure:
   - Subject line (concise and clear)
   - Greeting
   - Brief context/reference to the meeting
   - Summary of key points
   ${includeDecisions ? '- Decisions made' : ''}
   ${includeActionItems ? '- Action items with assignees and deadlines' : ''}
   - Next steps (if applicable)
   - Professional closing

2. Tone: ${tone === 'formal' ? 'Use formal, corporate language' : tone === 'friendly' ? 'Use warm, approachable language while remaining professional' : 'Use clear, technical language appropriate for a technical team'}

3. Format the response as JSON with this structure:
{
  "subject": "Email subject line",
  "body": "Full email body in plain text",
  "bodyHtml": "Full email body in HTML format with <p>, <ul>, <li> tags"
}

4. Keep the email concise but comprehensive. Aim for 200-400 words.
5. Use the actual participant names where appropriate.
6. Make action items clear with assignees and deadlines.

Generate the email now:`;

        return prompt;
    }

    /**
     * Parse the Claude-generated email response
     * @private
     */
    _parseGeneratedEmail(response) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const emailData = JSON.parse(jsonMatch[0]);
                return {
                    subject: emailData.subject || 'Meeting Follow-up',
                    body: emailData.body || '',
                    bodyHtml: emailData.bodyHtml || this._convertToHtml(emailData.body || ''),
                    format: 'both'
                };
            }

            // Fallback: parse manually
            const lines = response.split('\n');
            let subject = 'Meeting Follow-up';
            let body = response;

            // Try to extract subject
            const subjectMatch = response.match(/Subject:?\s*(.+)/i);
            if (subjectMatch) {
                subject = subjectMatch[1].trim();
                body = response.replace(subjectMatch[0], '').trim();
            }

            return {
                subject,
                body,
                bodyHtml: this._convertToHtml(body),
                format: 'both'
            };

        } catch (error) {
            console.error('[EmailGenerationService] Error parsing email:', error);
            // Fix MEDIUM BUG-M24: Sanitize AI response in error recovery
            const sanitizedResponse = response
                .replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove scripts
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')  // Remove iframes
                .replace(/javascript:/gi, '')                 // Remove javascript: URLs
                .replace(/on\w+\s*=/gi, '')                  // Remove event handlers
                .trim();

            return {
                subject: 'Meeting Follow-up',
                body: sanitizedResponse,
                bodyHtml: this._convertToHtml(sanitizedResponse),
                format: 'both'
            };
        }
    }

    /**
     * Convert plain text to HTML
     * @private
     */
    _convertToHtml(text) {
        if (!text) return '';

        let html = text;

        // Convert headers (lines starting with ##)
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Convert bullet points
        html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Convert numbered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Convert paragraphs (double newlines)
        html = html.split('\n\n').map(p => {
            if (!p.startsWith('<') && p.trim()) {
                return `<p>${p.trim()}</p>`;
            }
            return p;
        }).join('\n');

        // Convert single newlines to <br>
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    /**
     * Determine primary recipients
     * @private
     */
    _determineRecipients(participants, customRecipients) {
        if (customRecipients && customRecipients.length > 0) {
            return customRecipients;
        }

        // Return all participants with emails
        return participants
            .filter(p => p.participant_email)
            .map(p => ({
                name: p.participant_name,
                email: p.participant_email
            }));
    }

    /**
     * Determine CC recipients
     * @private
     */
    _determineCCRecipients(participants, customRecipients) {
        // For now, return empty. Can be extended later
        return [];
    }

    /**
     * Generate quick email templates without AI
     * @param {string} sessionId - Session ID
     * @param {string} templateType - Template type (brief, detailed, action-only)
     * @returns {Object} Email data
     */
    generateQuickTemplate(sessionId, templateType = 'brief') {
        try {
            const meetingNotes = meetingNotesRepository.getBySessionId(sessionId);
            if (!meetingNotes) {
                throw new Error('No meeting notes found');
            }

            const tasks = meetingTasksRepository.getBySessionId(sessionId);
            const participants = participantService.getSessionParticipants(sessionId);

            const structuredData = typeof meetingNotes.full_structured_data === 'string'
                ? JSON.parse(meetingNotes.full_structured_data)
                : meetingNotes.full_structured_data;

            const participantNames = participants.map(p => p.participant_name).join(', ');
            const date = new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            let body = '';
            let bodyHtml = '';

            switch (templateType) {
                case 'brief':
                    body = this._generateBriefTemplate(structuredData, tasks, participantNames, date);
                    break;
                case 'detailed':
                    body = this._generateDetailedTemplate(structuredData, tasks, participantNames, date);
                    break;
                case 'action-only':
                    body = this._generateActionOnlyTemplate(tasks, participantNames, date);
                    break;
                default:
                    body = this._generateBriefTemplate(structuredData, tasks, participantNames, date);
            }

            bodyHtml = this._convertToHtml(body);

            return {
                subject: `Compte-rendu de réunion - ${date}`,
                body,
                bodyHtml,
                to: this._determineRecipients(participants, []),
                cc: [],
                format: 'both',
                metadata: {
                    sessionId,
                    generatedAt: new Date().toISOString(),
                    template: templateType,
                    type: 'quick'
                }
            };

        } catch (error) {
            console.error('[EmailGenerationService] Error generating quick template:', error);
            throw error;
        }
    }

    /**
     * Generate brief email template
     * @private
     */
    _generateBriefTemplate(data, tasks, participants, date) {
        return `Bonjour,

Suite à notre réunion du ${date} avec ${participants}, voici un bref résumé :

${data.executiveSummary || 'Résumé non disponible'}

Actions à suivre :
${tasks.map((t, i) => `${i + 1}. ${t.task_description} (${t.assigned_to} - ${t.deadline})`).join('\n')}

N'hésitez pas à me contacter pour toute question.

Cordialement`;
    }

    /**
     * Generate detailed email template
     * @private
     */
    _generateDetailedTemplate(data, tasks, participants, date) {
        let email = `Bonjour,

Suite à notre réunion du ${date}, voici le compte-rendu détaillé.

Participants : ${participants}

## Résumé exécutif
${data.executiveSummary || 'Résumé non disponible'}

`;

        if (data.keyPoints && data.keyPoints.length > 0) {
            email += `## Points clés discutés
${data.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

`;
        }

        if (data.decisions && data.decisions.length > 0) {
            email += `## Décisions prises
${data.decisions.map((d, i) => `${i + 1}. ${d.decision || d.title}`).join('\n')}

`;
        }

        if (tasks && tasks.length > 0) {
            email += `## Actions à suivre
${tasks.map((t, i) => `${i + 1}. ${t.task_description}
   - Assigné à : ${t.assigned_to}
   - Échéance : ${t.deadline}
   - Priorité : ${t.priority}`).join('\n\n')}

`;
        }

        email += `N'hésitez pas à me contacter pour toute question ou clarification.

Cordialement`;

        return email;
    }

    /**
     * Generate action-only email template
     * @private
     */
    _generateActionOnlyTemplate(tasks, participants, date) {
        return `Bonjour,

Suite à notre réunion du ${date}, voici les actions assignées :

${tasks.map((t, i) => `${i + 1}. ${t.task_description}
   Assigné à : ${t.assigned_to}
   Échéance : ${t.deadline}
   Priorité : ${t.priority}`).join('\n\n')}

Merci de confirmer la prise en compte de vos actions respectives.

Cordialement`;
    }

    /**
     * Copy email to clipboard
     * @param {string} emailBody - Email body text
     * @param {string} format - Format (text, html)
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(emailBody, format = 'text') {
        try {
            const { clipboard } = require('electron');

            if (format === 'html') {
                clipboard.write({
                    text: emailBody,
                    html: emailBody
                });
            } else {
                clipboard.writeText(emailBody);
            }

            console.log('[EmailGenerationService] Email copied to clipboard');
            return true;
        } catch (error) {
            console.error('[EmailGenerationService] Error copying to clipboard:', error);
            return false;
        }
    }

    /**
     * Open email in default mail client
     * @param {Object} emailData - Email data
     * @returns {Promise<boolean>} Success status
     */
    async openInMailClient(emailData) {
        try {
            const { shell } = require('electron');

            // Build mailto URL
            const to = emailData.to.map(r => r.email || r).join(',');
            const cc = emailData.cc && emailData.cc.length > 0
                ? emailData.cc.map(r => r.email || r).join(',')
                : '';
            const subject = encodeURIComponent(emailData.subject || '');
            const body = encodeURIComponent(emailData.body || '');

            let mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
            if (cc) {
                mailtoUrl += `&cc=${cc}`;
            }

            await shell.openExternal(mailtoUrl);

            console.log('[EmailGenerationService] Email opened in mail client');
            return true;
        } catch (error) {
            console.error('[EmailGenerationService] Error opening mail client:', error);
            return false;
        }
    }
}

// Singleton instance
const emailGenerationService = new EmailGenerationService();
module.exports = emailGenerationService;
