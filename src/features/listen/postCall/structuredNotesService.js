const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');
const tokenTrackingService = require('../../common/services/tokenTrackingService');

// Phase 4: Enhanced post-processing modules
const { ActionItemValidator, enrichActionItems } = require('./actionItemValidator');
const { MeetingTemplateFormatter, getAvailableTemplates } = require('./meetingTemplates');

/**
 * Service pour générer des notes structurées à partir d'une transcription de réunion
 * Phase 3: Améliorations - Pré-traitement, validation enrichie, post-traitement
 * Phase 4: Validation anti-hallucination + Templates de formatage
 *
 * Utilise le prompt 'structured_meeting_notes' pour extraire:
 * - Résumé exécutif (4-6 phrases)
 * - Participants avec rôles
 * - Points clés avec contexte
 * - Décisions avec justifications
 * - Actions avec responsables et délais
 * - Risques identifiés
 * - Objectifs de la réunion
 * - Timeline chronologique
 * - Points non résolus
 * - Prochaines étapes
 * - Citations importantes
 *
 * Phase 4 Features:
 * - Action item validation with hallucination detection (grounding check)
 * - Action item enrichment (category, effort estimation, dependencies)
 * - Multiple output templates (executive_brief, detailed, bullet_points, etc.)
 * - Re-formatting without re-generation
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

// Phase 3: Configuration for retry logic
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// P1-1: Timeout for AI calls (prevent infinite blocking)
const AI_CALL_TIMEOUT_MS = 30000; // 30 seconds

// Phase 3: Minimum quality thresholds
const MIN_EXECUTIVE_SUMMARY_LENGTH = 100;
const MIN_KEY_POINTS = 1;

class StructuredNotesService {
    constructor() {
        this.isGenerating = false;

        // Callbacks
        this.onNotesGenerated = null;
        this.onGenerationError = null;
        this.onStatusUpdate = null;

        // Phase 4: Action item validator with hallucination detection
        this.actionItemValidator = new ActionItemValidator({
            minConfidenceScore: 0.6,
            enableHallucinationDetection: true,
            enableConsistencyCheck: true,
            language: 'fr'
        });

        // Phase 4: Template formatter for different output styles
        this.templateFormatter = new MeetingTemplateFormatter();
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
     * @param {Object} params.options - Options avancées
     * @param {string} params.options.template - Template de formatage ('executive_brief', 'detailed', 'bullet_points', 'action_focused', 'timeline', 'email_ready')
     * @param {boolean} params.options.validateActionItems - Activer la validation anti-hallucination (défaut: true)
     * @param {boolean} params.options.enrichActionItems - Enrichir les action items avec catégorie/effort (défaut: true)
     * @returns {Promise<Object>} Notes structurées au format JSON avec formattedOutput optionnel
     */
    async generateStructuredNotes({ transcripts, sessionId, meetingMetadata = {}, options = {} }) {
        // Phase 4: Default options
        const {
            template = null, // null = pas de formatage, retourne le JSON brut
            validateActionItems = true,
            enrichItems = true
        } = options;

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

            // Phase 3: Pre-process transcripts to improve quality
            this._updateStatus('Pré-traitement de la transcription...');
            const preprocessedTranscripts = this._preprocessTranscripts(transcripts);
            console.log(`[StructuredNotesService] Pre-processed: ${transcripts.length} entries → ${preprocessedTranscripts.length} entries`);

            // Get AI model configuration first to determine token limit
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key is not configured.');
            }

            // Fix LOW BUG: Get token limit for the model
            const tokenLimit = this._getTokenLimitForModel(modelInfo.model);
            const maxInputChars = tokenLimit * CHARS_PER_TOKEN;

            // Format transcripts into conversation text with size limit (use preprocessed)
            const { conversationText, wasTruncated, originalLength, truncatedLength } =
                this._formatTranscriptsWithLimit(preprocessedTranscripts, maxInputChars);

            if (wasTruncated) {
                console.warn(`[StructuredNotesService] Transcript truncated from ${originalLength} to ${truncatedLength} chars for model ${modelInfo.model}`);
                meetingMetadata.transcriptTruncated = true;
                meetingMetadata.originalTranscriptLength = originalLength;
            }

            // Phase 3: Add preprocessing metadata
            meetingMetadata.originalEntryCount = transcripts.length;
            meetingMetadata.preprocessedEntryCount = preprocessedTranscripts.length;

            console.log(`[StructuredNotesService] Processing ${preprocessedTranscripts.length} transcript entries (${conversationText.length} chars)`);
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
                maxTokens: 4096, // Phase 1: Increased for more detailed and comprehensive notes
                usePortkey: modelInfo.provider === 'openai-lucide',
                portkeyVirtualKey: modelInfo.provider === 'openai-lucide' ? modelInfo.apiKey : undefined,
            });

            this._updateStatus('Appel au modèle AI...');

            // Phase 3: Call the LLM with retry logic + P1-1: timeout protection
            let completion;
            let lastError;
            for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
                try {
                    // P1-1: Wrap AI call with timeout to prevent infinite blocking
                    completion = await this._callWithTimeout(
                        () => llm.chat(messages),
                        AI_CALL_TIMEOUT_MS,
                        `AI call timeout after ${AI_CALL_TIMEOUT_MS / 1000}s`
                    );
                    break; // Success, exit retry loop
                } catch (error) {
                    lastError = error;
                    console.warn(`[StructuredNotesService] AI call attempt ${attempt} failed:`, error.message);
                    if (attempt <= MAX_RETRIES) {
                        this._updateStatus(`Nouvelle tentative (${attempt}/${MAX_RETRIES})...`);
                        await this._delay(RETRY_DELAY_MS * attempt);
                    }
                }
            }

            if (!completion) {
                throw new Error(`AI call failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
            }

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
            this._updateStatus('Analyse de la réponse...');
            const structuredNotes = this._parseAIResponse(responseText);

            // Phase 3: Post-process to enhance results
            this._updateStatus('Post-traitement des notes...');
            this._postProcessNotes(structuredNotes, preprocessedTranscripts);

            // Phase 4: Validate action items for hallucinations
            if (validateActionItems && structuredNotes.actionItems && structuredNotes.actionItems.length > 0) {
                this._updateStatus('Validation des actions (anti-hallucination)...');
                const originalTranscriptText = this._formatTranscripts(preprocessedTranscripts);
                const validationResult = this.actionItemValidator.validateActionItems(
                    structuredNotes.actionItems,
                    originalTranscriptText
                );

                // Update action items with validation data
                structuredNotes.actionItems = validationResult.validatedItems;
                structuredNotes.actionItemsValidation = {
                    summary: validationResult.summary,
                    flaggedForReview: validationResult.flaggedItems.length,
                    averageConfidence: validationResult.summary.averageConfidence
                };

                console.log(`[StructuredNotesService] Action items validated: ${validationResult.summary.highConfidence} high, ${validationResult.summary.mediumConfidence} medium, ${validationResult.summary.lowConfidence} low confidence`);
            }

            // Phase 4: Enrich action items with category, effort, dependencies
            if (enrichItems && structuredNotes.actionItems && structuredNotes.actionItems.length > 0) {
                this._updateStatus('Enrichissement des actions...');
                structuredNotes.actionItems = enrichActionItems(structuredNotes.actionItems);
                console.log(`[StructuredNotesService] Action items enriched with categories and effort estimates`);
            }

            // Add enhanced metadata
            structuredNotes.metadata = {
                sessionId,
                generatedAt: new Date().toISOString(),
                transcriptCount: transcripts.length,
                preprocessedCount: preprocessedTranscripts.length,
                model: modelInfo.model,
                provider: modelInfo.provider,
                qualityScore: this._calculateQualityScore(structuredNotes),
                ...meetingMetadata
            };

            console.log('[StructuredNotesService] ✅ Structured notes generated successfully');

            // Phase 4: Apply template formatting if requested
            if (template) {
                this._updateStatus(`Formatage avec template "${template}"...`);
                try {
                    structuredNotes.formattedOutput = this.templateFormatter.format(structuredNotes, {
                        templateId: template,
                        includeMetadata: true,
                        language: 'fr'
                    });
                    structuredNotes.metadata.templateUsed = template;
                    console.log(`[StructuredNotesService] Applied template: ${template}`);
                } catch (templateError) {
                    console.warn(`[StructuredNotesService] Template formatting failed: ${templateError.message}`);
                    // Continue without formatted output - don't fail the whole generation
                }
            }

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

            // DEBUG: Log what fields the AI actually returned
            console.log('[StructuredNotesService] 🔍 DEBUG: AI returned fields:', Object.keys(parsed));
            console.log('[StructuredNotesService] 🔍 DEBUG: Full parsed structure:', JSON.stringify(parsed, null, 2));

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
     * Phase 3: Validation enrichie avec nouveaux champs et qualité
     * @private
     */
    _validateStructure(data) {
        // Define required fields with their default values (includes Phase 2 fields)
        const fieldDefaults = {
            'executiveSummary': 'Résumé non disponible',
            'meetingType': 'general',
            'objectives': [],
            'meetingMetadata': {
                participants: [],
                duration: 'Non disponible',
                mainTopic: 'Non disponible',
                date: new Date().toISOString().split('T')[0]
            },
            'keyPoints': [],
            'decisions': [],
            'actionItems': [],
            'risks': [],
            'timeline': [],
            'unresolvedItems': [],
            'nextSteps': [],
            'importantQuotes': []
        };

        // Check and add missing fields
        for (const [field, defaultValue] of Object.entries(fieldDefaults)) {
            if (!(field in data)) {
                console.warn(`[StructuredNotesService] Missing field: ${field} - adding default value`);
                data[field] = defaultValue;
            } else if (data[field] === null || data[field] === undefined) {
                // Also fix null/undefined values
                console.warn(`[StructuredNotesService] Field ${field} is null/undefined - adding default value`);
                data[field] = defaultValue;
            }
        }

        // Ensure meetingMetadata has all required sub-fields
        if (data.meetingMetadata && typeof data.meetingMetadata === 'object') {
            if (!data.meetingMetadata.participants) data.meetingMetadata.participants = [];
            if (!data.meetingMetadata.duration) data.meetingMetadata.duration = 'Non disponible';
            if (!data.meetingMetadata.mainTopic) data.meetingMetadata.mainTopic = 'Non disponible';
            if (!data.meetingMetadata.date) data.meetingMetadata.date = new Date().toISOString().split('T')[0];
        }

        // Phase 3: Validate array items have proper structure
        this._validateArrayItems(data);

        console.log('[StructuredNotesService] Structure validation complete');
    }

    /**
     * Phase 3: Validate array items have proper structure
     * @private
     */
    _validateArrayItems(data) {
        // Ensure actionItems have required fields
        if (Array.isArray(data.actionItems)) {
            data.actionItems = data.actionItems.map((item, index) => {
                if (typeof item === 'string') {
                    return {
                        task: item,
                        assignee: 'Non assigné',
                        deadline: 'Non défini',
                        priority: 'medium',
                        status: 'pending'
                    };
                }
                return {
                    task: item.task || item.action || item.description || `Action ${index + 1}`,
                    assignee: item.assignee || item.responsible || 'Non assigné',
                    deadline: item.deadline || item.dueDate || 'Non défini',
                    priority: item.priority || 'medium',
                    status: item.status || 'pending',
                    dependencies: item.dependencies || [],
                    successCriteria: item.successCriteria || ''
                };
            });
        }

        // Ensure decisions have required fields
        if (Array.isArray(data.decisions)) {
            data.decisions = data.decisions.map((item, index) => {
                if (typeof item === 'string') {
                    return {
                        decision: item,
                        rationale: '',
                        impact: ''
                    };
                }
                return {
                    decision: item.decision || item.description || `Décision ${index + 1}`,
                    rationale: item.rationale || item.justification || '',
                    impact: item.impact || ''
                };
            });
        }

        // Ensure risks have required fields
        if (Array.isArray(data.risks)) {
            data.risks = data.risks.map((item, index) => {
                if (typeof item === 'string') {
                    return {
                        risk: item,
                        severity: 'medium',
                        mitigation: ''
                    };
                }
                return {
                    risk: item.risk || item.description || `Risque ${index + 1}`,
                    severity: item.severity || item.level || 'medium',
                    mitigation: item.mitigation || item.action || ''
                };
            });
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
     * Phase 3: Pré-traitement des transcriptions pour améliorer la qualité
     * - Fusionne les entrées consécutives du même locuteur
     * - Nettoie les bégaiements et répétitions
     * - Filtre les entrées trop courtes (bruit)
     * @private
     */
    _preprocessTranscripts(transcripts) {
        if (!transcripts || transcripts.length === 0) return [];

        const processed = [];
        let currentEntry = null;

        for (const entry of transcripts) {
            // Skip very short entries (likely noise)
            if (!entry.text || entry.text.trim().length < 3) {
                continue;
            }

            // Clean the text
            let cleanedText = this._cleanTranscriptText(entry.text);

            // Skip if cleaned text is too short
            if (cleanedText.length < 3) {
                continue;
            }

            // Merge consecutive entries from the same speaker
            if (currentEntry && currentEntry.speaker === entry.speaker) {
                currentEntry.text += ' ' + cleanedText;
                currentEntry.timestamp = entry.timestamp; // Update to latest timestamp
            } else {
                // Save previous entry if exists
                if (currentEntry) {
                    processed.push(currentEntry);
                }
                // Start new entry
                currentEntry = {
                    speaker: entry.speaker || 'Intervenant',
                    text: cleanedText,
                    timestamp: entry.timestamp
                };
            }
        }

        // Don't forget the last entry
        if (currentEntry) {
            processed.push(currentEntry);
        }

        console.log(`[StructuredNotesService] Preprocessing: merged ${transcripts.length} entries into ${processed.length}`);
        return processed;
    }

    /**
     * Phase 3: Nettoie le texte d'une transcription
     * @private
     */
    _cleanTranscriptText(text) {
        if (!text) return '';

        let cleaned = text.trim();

        // Remove common filler words repetitions (euh, hum, etc.)
        cleaned = cleaned.replace(/\b(euh|hum|hmm|ah|oh)\b[\s,.]*/gi, '');

        // Remove repeated words (bégaiements)
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

        // Remove excessive spaces
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // Remove trailing punctuation artifacts
        cleaned = cleaned.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

        return cleaned;
    }

    /**
     * Phase 3: Post-traitement pour enrichir les notes
     * @private
     */
    _postProcessNotes(notes, transcripts) {
        // Ensure executive summary is substantial
        if (notes.executiveSummary && notes.executiveSummary.length < MIN_EXECUTIVE_SUMMARY_LENGTH) {
            console.warn('[StructuredNotesService] Executive summary is too short, marking as incomplete');
            notes.executiveSummary = notes.executiveSummary + ' (Résumé potentiellement incomplet - transcription courte)';
        }

        // Enhance participants list from transcripts if missing
        if (!notes.meetingMetadata.participants || notes.meetingMetadata.participants.length === 0) {
            const speakers = [...new Set(transcripts.map(t => t.speaker).filter(s => s))];
            notes.meetingMetadata.participants = speakers.map(name => ({ name, role: 'Participant' }));
            console.log(`[StructuredNotesService] Auto-extracted ${speakers.length} participants from transcripts`);
        }

        // Calculate meeting duration estimate if not provided
        if (notes.meetingMetadata.duration === 'Non disponible' && transcripts.length > 0) {
            const firstTimestamp = transcripts[0]?.timestamp;
            const lastTimestamp = transcripts[transcripts.length - 1]?.timestamp;
            if (firstTimestamp && lastTimestamp) {
                try {
                    const start = new Date(firstTimestamp);
                    const end = new Date(lastTimestamp);
                    const durationMs = end - start;
                    if (durationMs > 0) {
                        const minutes = Math.round(durationMs / 60000);
                        notes.meetingMetadata.duration = `~${minutes} minutes`;
                    }
                } catch (e) {
                    // Ignore timestamp parsing errors
                }
            }
        }

        // Sort action items by priority
        if (notes.actionItems && notes.actionItems.length > 1) {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            notes.actionItems.sort((a, b) => {
                const pa = priorityOrder[a.priority] ?? 1;
                const pb = priorityOrder[b.priority] ?? 1;
                return pa - pb;
            });
        }

        // Sort risks by severity
        if (notes.risks && notes.risks.length > 1) {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            notes.risks.sort((a, b) => {
                const sa = severityOrder[a.severity] ?? 1;
                const sb = severityOrder[b.severity] ?? 1;
                return sa - sb;
            });
        }
    }

    /**
     * Phase 3: Calcule un score de qualité pour les notes générées
     * Score de 0 à 100
     * @private
     */
    _calculateQualityScore(notes) {
        let score = 0;
        const weights = {
            executiveSummary: 25,
            keyPoints: 20,
            actionItems: 20,
            decisions: 15,
            timeline: 10,
            risks: 10
        };

        // Executive summary quality
        if (notes.executiveSummary && notes.executiveSummary.length >= MIN_EXECUTIVE_SUMMARY_LENGTH) {
            score += weights.executiveSummary;
        } else if (notes.executiveSummary && notes.executiveSummary.length > 50) {
            score += weights.executiveSummary * 0.5;
        }

        // Key points
        if (notes.keyPoints && notes.keyPoints.length >= MIN_KEY_POINTS) {
            const pointScore = Math.min(notes.keyPoints.length / 5, 1);
            score += weights.keyPoints * pointScore;
        }

        // Action items
        if (notes.actionItems && notes.actionItems.length > 0) {
            const hasDetails = notes.actionItems.some(a => a.assignee && a.assignee !== 'Non assigné');
            score += hasDetails ? weights.actionItems : weights.actionItems * 0.7;
        }

        // Decisions
        if (notes.decisions && notes.decisions.length > 0) {
            score += weights.decisions;
        }

        // Timeline
        if (notes.timeline && notes.timeline.length > 0) {
            score += weights.timeline;
        }

        // Risks
        if (notes.risks && notes.risks.length > 0) {
            score += weights.risks;
        }

        console.log(`[StructuredNotesService] Quality score: ${Math.round(score)}/100`);
        return Math.round(score);
    }

    /**
     * Phase 3: Helper pour les délais de retry
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * P1-1: Call async function with timeout protection
     * Prevents infinite blocking on AI calls
     * @private
     * @param {Function} asyncFn - Async function to call
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} timeoutMessage - Error message on timeout
     * @returns {Promise<any>} Result of asyncFn
     */
    _callWithTimeout(asyncFn, timeoutMs, timeoutMessage) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeoutMs);

            asyncFn()
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * Récupère le statut de génération
     */
    isGeneratingNotes() {
        return this.isGenerating;
    }

    /**
     * Phase 4: Get available templates for UI selection
     * @returns {Array<Object>} List of available templates
     */
    getAvailableTemplates() {
        return getAvailableTemplates();
    }

    /**
     * Phase 4: Format existing notes with a different template
     * Useful for re-formatting without re-generating
     * @param {Object} structuredNotes - Previously generated notes
     * @param {string} templateId - Template to apply
     * @returns {string} Formatted output
     */
    formatWithTemplate(structuredNotes, templateId) {
        return this.templateFormatter.format(structuredNotes, {
            templateId,
            includeMetadata: true,
            language: 'fr'
        });
    }

    /**
     * Phase 4: Re-validate action items with updated options
     * @param {Array} actionItems - Action items to validate
     * @param {string} transcriptText - Original transcript for grounding check
     * @param {Object} validatorOptions - Override validator options
     * @returns {Object} Validation result
     */
    validateActionItems(actionItems, transcriptText, validatorOptions = {}) {
        if (validatorOptions && Object.keys(validatorOptions).length > 0) {
            // Create temporary validator with custom options
            const tempValidator = new ActionItemValidator({
                ...this.actionItemValidator.options,
                ...validatorOptions
            });
            return tempValidator.validateActionItems(actionItems, transcriptText);
        }
        return this.actionItemValidator.validateActionItems(actionItems, transcriptText);
    }

    /**
     * Phase 4: Configure validator options
     * @param {Object} options - New validator options
     */
    setValidatorOptions(options) {
        this.actionItemValidator = new ActionItemValidator({
            ...this.actionItemValidator.options,
            ...options
        });
    }
}

module.exports = StructuredNotesService;
