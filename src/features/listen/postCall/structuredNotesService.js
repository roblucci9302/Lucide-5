const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');
const tokenTrackingService = require('../../common/services/tokenTrackingService');

/**
 * Service pour générer des notes structurées à partir d'une transcription de réunion
 * Utilise le prompt 'structured_meeting_notes' pour extraire:
 * - Résumé exécutif
 * - Participants
 * - Points clés
 * - Décisions
 * - Actions
 * - Timeline
 */

// Fix LOW BUG: Token limits for different models
// These are conservative estimates to leave room for system prompt and response
const MODEL_TOKEN_LIMITS = {
    'gpt-4': 6000,          // 8k context, leave room for prompt + response
    'gpt-4-turbo': 100000,  // 128k context
    'gpt-4o': 100000,       // 128k context
    'gpt-4o-mini': 100000,  // 128k context
    'gpt-3.5-turbo': 12000, // 16k context
    'claude-3-opus': 150000,// 200k context
    'claude-3-sonnet': 150000,
    'claude-3-haiku': 150000,
    'claude-3.5-sonnet': 150000,
    'gemini-pro': 25000,    // 32k context
    'gemini-1.5-pro': 800000, // 1M context
    'default': 6000         // Conservative default
};

// Approximate characters per token (varies by language, ~4 for English, ~2-3 for French)
const CHARS_PER_TOKEN = 3;

class StructuredNotesService {
    constructor() {
        this.isGenerating = false;

        // Callbacks
        this.onNotesGenerated = null;
        this.onGenerationError = null;
        this.onStatusUpdate = null;
    }

    setCallbacks({ onNotesGenerated, onGenerationError, onStatusUpdate }) {
        this.onNotesGenerated = onNotesGenerated;
        this.onGenerationError = onGenerationError;
        this.onStatusUpdate = onStatusUpdate;
    }

    /**
     * Génère des notes structurées à partir d'une transcription
     * @param {Object} params - Paramètres de génération
     * @param {Array<Object>} params.transcripts - Array de {speaker, text, timestamp}
     * @param {String} params.sessionId - ID de la session
     * @param {Object} params.meetingMetadata - Métadonnées optionnelles (durée, type, etc.)
     * @returns {Promise<Object>} Notes structurées au format JSON
     */
    async generateStructuredNotes({ transcripts, sessionId, meetingMetadata = {} }) {
        if (this.isGenerating) {
            console.warn('[StructuredNotesService] Generation already in progress');
            return null;
        }

        this.isGenerating = true;
        this._updateStatus('Génération des notes structurées...');

        try {
            // Validate input
            if (!transcripts || transcripts.length === 0) {
                throw new Error('No transcripts provided for note generation');
            }

            // Get AI model configuration first to determine token limit
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key is not configured.');
            }

            // Fix LOW BUG: Get token limit for the model
            const tokenLimit = this._getTokenLimitForModel(modelInfo.model);
            const maxInputChars = tokenLimit * CHARS_PER_TOKEN;

            // Format transcripts into conversation text with size limit
            const { conversationText, wasTruncated, originalLength, truncatedLength } =
                this._formatTranscriptsWithLimit(transcripts, maxInputChars);

            if (wasTruncated) {
                console.warn(`[StructuredNotesService] Transcript truncated from ${originalLength} to ${truncatedLength} chars for model ${modelInfo.model}`);
                meetingMetadata.transcriptTruncated = true;
                meetingMetadata.originalTranscriptLength = originalLength;
            }

            console.log(`[StructuredNotesService] Processing ${transcripts.length} transcript entries (${conversationText.length} chars)`);
            console.log(`[StructuredNotesService] Using ${modelInfo.provider} - ${modelInfo.model}`);

            // Build the prompt
            const systemPrompt = getSystemPrompt('structured_meeting_notes', '', false);

            const userPrompt = this._buildUserPrompt(conversationText, meetingMetadata);

            const messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: userPrompt,
                },
            ];

            // Create LLM instance
            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.3, // Lower temperature for more consistent structured output
                maxTokens: 2048, // Increased for comprehensive notes
                usePortkey: modelInfo.provider === 'openai-lucide',
                portkeyVirtualKey: modelInfo.provider === 'openai-lucide' ? modelInfo.apiKey : undefined,
            });

            this._updateStatus('Appel au modèle AI...');

            // Call the LLM
            const completion = await llm.chat(messages);

            // Track token usage
            tokenTrackingService.trackUsage({
                provider: modelInfo.provider,
                model: modelInfo.model,
                response: completion,
                sessionId: sessionId,
                feature: 'structured_notes'
            });

            const responseText = completion.content;
            console.log('[StructuredNotesService] Raw AI response received');

            // Parse the JSON response
            const structuredNotes = this._parseAIResponse(responseText);

            // Add metadata
            structuredNotes.metadata = {
                sessionId,
                generatedAt: new Date().toISOString(),
                transcriptCount: transcripts.length,
                model: modelInfo.model,
                provider: modelInfo.provider,
                ...meetingMetadata
            };

            console.log('[StructuredNotesService] ✅ Structured notes generated successfully');

            this._updateStatus('Notes générées avec succès');

            // Trigger callback
            if (this.onNotesGenerated) {
                this.onNotesGenerated(structuredNotes);
            }

            return structuredNotes;

        } catch (error) {
            console.error('[StructuredNotesService] ❌ Error generating structured notes:', error);
            this._updateStatus('Erreur lors de la génération');

            if (this.onGenerationError) {
                this.onGenerationError(error);
            }

            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Formate les transcripts en texte conversationnel
     * @private
     */
    _formatTranscripts(transcripts) {
        return transcripts
            .map(t => `${t.speaker}: ${t.text}`)
            .join('\n');
    }

    /**
     * Fix LOW BUG: Get token limit for a specific model
     * @private
     * @param {string} model - Model name
     * @returns {number} Token limit
     */
    _getTokenLimitForModel(model) {
        // Check exact match first
        if (MODEL_TOKEN_LIMITS[model]) {
            return MODEL_TOKEN_LIMITS[model];
        }

        // Check partial matches for model families
        const modelLower = model.toLowerCase();
        if (modelLower.includes('gpt-4o')) return MODEL_TOKEN_LIMITS['gpt-4o'];
        if (modelLower.includes('gpt-4-turbo')) return MODEL_TOKEN_LIMITS['gpt-4-turbo'];
        if (modelLower.includes('gpt-4')) return MODEL_TOKEN_LIMITS['gpt-4'];
        if (modelLower.includes('gpt-3.5')) return MODEL_TOKEN_LIMITS['gpt-3.5-turbo'];
        if (modelLower.includes('claude-3')) return MODEL_TOKEN_LIMITS['claude-3-sonnet'];
        if (modelLower.includes('gemini-1.5')) return MODEL_TOKEN_LIMITS['gemini-1.5-pro'];
        if (modelLower.includes('gemini')) return MODEL_TOKEN_LIMITS['gemini-pro'];

        return MODEL_TOKEN_LIMITS['default'];
    }

    /**
     * Fix LOW BUG: Format transcripts with a character limit
     * Prioritizes keeping the beginning and end of the meeting for context
     * @private
     * @param {Array<Object>} transcripts - Array of transcript entries
     * @param {number} maxChars - Maximum characters allowed
     * @returns {Object} Formatted text and truncation info
     */
    _formatTranscriptsWithLimit(transcripts, maxChars) {
        const fullText = this._formatTranscripts(transcripts);
        const originalLength = fullText.length;

        if (originalLength <= maxChars) {
            return {
                conversationText: fullText,
                wasTruncated: false,
                originalLength,
                truncatedLength: originalLength
            };
        }

        // Strategy: Keep beginning and end of the meeting, with a middle summary
        const keepRatio = 0.4; // Keep 40% from beginning, 40% from end
        const beginChars = Math.floor(maxChars * keepRatio);
        const endChars = Math.floor(maxChars * keepRatio);
        const middleNotice = `\n\n[... ${Math.floor((originalLength - beginChars - endChars) / 1000)}k caractères omis pour respecter la limite du modèle ...]\n\n`;

        const beginPart = fullText.substring(0, beginChars);
        const endPart = fullText.substring(originalLength - endChars);

        const truncatedText = beginPart + middleNotice + endPart;

        console.log(`[StructuredNotesService] Truncated transcript: kept ${beginChars} chars from start, ${endChars} from end`);

        return {
            conversationText: truncatedText,
            wasTruncated: true,
            originalLength,
            truncatedLength: truncatedText.length
        };
    }

    /**
     * Construit le prompt utilisateur avec le contexte
     * @private
     */
    _buildUserPrompt(conversationText, metadata) {
        let prompt = `Voici la transcription complète de la réunion:\n\n${conversationText}\n\n`;

        if (metadata.duration) {
            prompt += `Durée de la réunion: ${metadata.duration}\n`;
        }
        if (metadata.meetingType) {
            prompt += `Type de réunion: ${metadata.meetingType}\n`;
        }

        prompt += `\nGénère des notes structurées complètes au format JSON en suivant exactement la structure définie dans les instructions système.

IMPORTANT:
- Extrais TOUS les éléments d'action mentionnés
- Identifie TOUTES les décisions prises
- Maintiens un ton professionnel et objectif
- Réponds UNIQUEMENT avec du JSON valide (pas de texte avant ou après)
- Assure-toi que tous les champs sont présents même s'ils sont vides

Génère maintenant les notes structurées:`;

        return prompt;
    }

    /**
     * Parse la réponse AI en JSON
     * @private
     */
    _parseAIResponse(responseText) {
        try {
            // Remove markdown code blocks if present
            let cleanedText = responseText.trim();

            // Remove ```json and ``` wrappers
            cleanedText = cleanedText.replace(/^```json\s*\n?/i, '');
            cleanedText = cleanedText.replace(/\n?```\s*$/i, '');

            // Parse JSON
            const parsed = JSON.parse(cleanedText);

            // Validate structure
            this._validateStructure(parsed);

            return parsed;
        } catch (error) {
            console.error('[StructuredNotesService] JSON parsing error:', error);
            console.error('[StructuredNotesService] Raw response:', responseText);

            // Return a fallback structure
            return this._createFallbackStructure(responseText);
        }
    }

    /**
     * Valide que la structure JSON contient les champs requis
     * @private
     */
    _validateStructure(data) {
        const requiredFields = [
            'executiveSummary',
            'meetingMetadata',
            'keyPoints',
            'decisions',
            'actionItems',
            'timeline',
            'unresolvedItems',
            'nextSteps'
        ];

        for (const field of requiredFields) {
            if (!(field in data)) {
                console.warn(`[StructuredNotesService] Missing field: ${field}`);
            }
        }
    }

    /**
     * Crée une structure de secours en cas d'échec du parsing
     * @private
     */
    _createFallbackStructure(rawText) {
        console.warn('[StructuredNotesService] Using fallback structure');

        return {
            executiveSummary: "Erreur lors de la génération du résumé structuré. Voir le texte brut ci-dessous.",
            meetingMetadata: {
                participants: [],
                duration: "Non disponible",
                mainTopic: "Non disponible"
            },
            keyPoints: [],
            decisions: [],
            actionItems: [],
            timeline: [],
            unresolvedItems: [],
            nextSteps: [],
            importantQuotes: [],
            rawResponse: rawText // Preserve raw response for debugging
        };
    }

    /**
     * Met à jour le statut (pour affichage dans l'UI)
     * @private
     */
    _updateStatus(status) {
        console.log(`[StructuredNotesService] Status: ${status}`);
        if (this.onStatusUpdate) {
            this.onStatusUpdate(status);
        }
    }

    /**
     * Récupère le statut de génération
     */
    isGeneratingNotes() {
        return this.isGenerating;
    }
}

module.exports = StructuredNotesService;
