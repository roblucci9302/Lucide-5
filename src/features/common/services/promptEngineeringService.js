/**
 * Prompt Engineering Service - Phase WOW 1 Jour 5
 *
 * Orchestrates advanced prompt engineering:
 * - Profile-specific templates
 * - User context enrichment
 * - Domain-specific vocabulary
 * - Output structure guidelines
 * - Temperature adaptation
 * - Few-shot examples injection
 *
 * This service generates optimized prompts that significantly improve
 * AI response quality and relevance.
 */

const PROFILE_TEMPLATES = require('../prompts/profileTemplates');
const userContextService = require('./userContextService');
const conversationHistoryService = require('./conversationHistoryService');

class PromptEngineeringService {
    constructor() {
        this.templates = PROFILE_TEMPLATES;
        this.defaultProfile = 'lucide_assistant';
    }

    /**
     * Generate an enriched prompt for the AI
     * @param {Object} options - Prompt options
     * @param {string} options.question - User question
     * @param {string} options.profileId - Active profile ID
     * @param {string} options.uid - User ID
     * @param {string} options.sessionId - Optional session ID for context
     * @param {Object} options.customContext - Optional additional context
     * @returns {Promise<Object>} { systemPrompt, userPrompt, temperature, examples }
     */
    async generatePrompt({
        question,
        profileId = this.defaultProfile,
        uid = 'default_user',
        sessionId = null,
        customContext = {}
    }) {
        try {
            // 1. Get profile template
            const template = this.getTemplate(profileId);
            if (!template) {
                console.warn('[PromptEngineering] Template not found for profile:', profileId);
                return this.getDefaultPrompt(question);
            }

            // 2. Get user context
            const userContext = userContextService.getContext(uid) || {};

            // 3. Get conversation context (if sessionId provided)
            let conversationContext = null;
            if (sessionId) {
                conversationContext = await this.getConversationContext(sessionId, uid);
            }

            // 4. Detect question type and complexity
            const questionAnalysis = this.analyzeQuestion(question);

            // 5. Build enriched system prompt
            const systemPrompt = this.buildSystemPrompt({
                template,
                userContext,
                conversationContext,
                questionAnalysis,
                customContext
            });

            // 6. Build enriched user prompt
            const userPrompt = this.buildUserPrompt({
                question,
                questionAnalysis,
                template
            });

            // 7. Select temperature
            const temperature = this.selectTemperature({
                template,
                questionAnalysis
            });

            // 8. Select few-shot examples (if applicable)
            const examples = this.selectExamples({
                template,
                questionAnalysis,
                limit: 2 // Max 2 examples to avoid token bloat
            });

            return {
                systemPrompt,
                userPrompt,
                temperature,
                examples,
                metadata: {
                    profileId,
                    questionType: questionAnalysis.type,
                    complexity: questionAnalysis.complexity,
                    hasContext: !!userContext,
                    hasConversationHistory: !!conversationContext
                }
            };
        } catch (error) {
            console.error('[PromptEngineering] Error generating prompt:', error);
            return this.getDefaultPrompt(question);
        }
    }

    /**
     * Get template for a profile
     * @param {string} profileId - Profile ID
     * @returns {Object|null} Template
     */
    getTemplate(profileId) {
        return this.templates[profileId] || null;
    }

    /**
     * Analyze question to determine type and complexity
     * @param {string} question - User question
     * @returns {Object} { type, complexity, intent, keywords }
     */
    analyzeQuestion(question) {
        const lower = question.toLowerCase();
        const wordCount = question.split(/\s+/).length;

        // Detect question type
        let type = 'general';
        let intent = 'unknown';

        if (lower.match(/comment|how to|how can|pourquoi|why|explain/)) {
            type = 'how_to';
            intent = 'learning';
        } else if (lower.match(/quoi|what|qu'est-ce|c'est quoi|définir|define/)) {
            type = 'definition';
            intent = 'understanding';
        } else if (lower.match(/vs|versus|différence|comparison|compare|meilleur|best/)) {
            type = 'comparison';
            intent = 'decision_making';
        } else if (lower.match(/stratégie|plan|approach|processus|framework/)) {
            type = 'strategic';
            intent = 'planning';
        } else if (lower.match(/problème|issue|bug|erreur|help|aide/)) {
            type = 'troubleshooting';
            intent = 'problem_solving';
        } else if (lower.match(/example|exemple|template|script|code/)) {
            type = 'example_request';
            intent = 'implementation';
        }

        // Determine complexity
        let complexity = 'simple';
        if (wordCount > 20 || lower.match(/complexe|advanced|sophisticated|detailed/)) {
            complexity = 'complex';
        } else if (wordCount > 10) {
            complexity = 'medium';
        }

        // Extract keywords (simple approach)
        const keywords = question
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 4);

        return {
            type,
            complexity,
            intent,
            keywords,
            wordCount
        };
    }

    /**
     * Build enriched system prompt
     * @param {Object} params
     * @returns {string} System prompt
     */
    buildSystemPrompt({
        template,
        userContext,
        conversationContext,
        questionAnalysis,
        customContext
    }) {
        let prompt = template.systemPrompt;

        // Add user context if available
        if (userContext && Object.keys(userContext).length > 0) {
            const contextSection = this.buildContextSection(userContext);
            if (contextSection) {
                prompt += `\n\n**Contexte Utilisateur:**\n${contextSection}`;
            }
        }

        // Add conversation context if available
        if (conversationContext) {
            prompt += `\n\n**Contexte Conversation:**\n${conversationContext}`;
        }

        // Add output structure guidance
        const outputGuidance = this.buildOutputGuidance(template, questionAnalysis);
        if (outputGuidance) {
            prompt += `\n\n**Format de Réponse:**\n${outputGuidance}`;
        }

        // Add custom context if provided
        if (customContext && Object.keys(customContext).length > 0) {
            const customSection = Object.entries(customContext)
                .map(([key, value]) => `- ${key}: ${value}`)
                .join('\n');
            prompt += `\n\n**Informations Supplémentaires:**\n${customSection}`;
        }

        return prompt;
    }

    /**
     * Build context section from user context
     * @param {Object} userContext
     * @returns {string} Context section
     */
    buildContextSection(userContext) {
        const parts = [];

        if (userContext.job_role || userContext.job_function) {
            parts.push(`- Rôle: ${userContext.job_role || userContext.job_function}`);
        }

        if (userContext.industry) {
            let industryText = userContext.industry;
            if (userContext.industry_sub) {
                industryText += ` (${userContext.industry_sub})`;
            }
            parts.push(`- Industrie: ${industryText}`);
        }

        if (userContext.company_size) {
            parts.push(`- Taille entreprise: ${userContext.company_size} employés`);
        }

        if (userContext.company_stage) {
            parts.push(`- Stage: ${userContext.company_stage}`);
        }

        if (userContext.experience_years) {
            parts.push(`- Expérience: ${userContext.experience_years}+ ans`);
        }

        if (userContext.is_first_time_founder === 1) {
            parts.push(`- First-time founder`);
        }

        if (userContext.current_challenges && Array.isArray(userContext.current_challenges)) {
            if (userContext.current_challenges.length > 0) {
                parts.push(`- Challenges actuels: ${userContext.current_challenges.join(', ')}`);
            }
        }

        if (userContext.preferred_frameworks && Array.isArray(userContext.preferred_frameworks)) {
            if (userContext.preferred_frameworks.length > 0) {
                parts.push(`- Frameworks préférés: ${userContext.preferred_frameworks.join(', ')}`);
            }
        }

        if (userContext.technical_level) {
            parts.push(`- Niveau technique: ${userContext.technical_level}`);
        }

        // Phase 2 Audit: Adding missing context fields
        if (userContext.seniority) {
            parts.push(`- Séniorité: ${userContext.seniority}`);
        }

        if (userContext.has_managed_team === 1) {
            const teamInfo = userContext.team_size
                ? `équipe de ${userContext.team_size} personnes`
                : 'équipe';
            parts.push(`- Responsabilité: manage une ${teamInfo}`);
        } else if (userContext.team_size) {
            parts.push(`- Taille équipe: ${userContext.team_size} personnes`);
        }

        if (userContext.current_goals && Array.isArray(userContext.current_goals)) {
            if (userContext.current_goals.length > 0) {
                parts.push(`- Objectifs actuels: ${userContext.current_goals.join(', ')}`);
            }
        }

        if (userContext.domain_knowledge && typeof userContext.domain_knowledge === 'object') {
            const domains = Object.entries(userContext.domain_knowledge)
                .filter(([_, level]) => level && level !== 'none')
                .map(([domain, level]) => `${domain} (${level})`)
                .slice(0, 5); // Limit to 5 domains to avoid prompt bloat
            if (domains.length > 0) {
                parts.push(`- Expertise domaine: ${domains.join(', ')}`);
            }
        }

        // Communication preferences (preferred_tone and preferred_format)
        if (userContext.preferred_tone && userContext.preferred_tone !== 'balanced') {
            const toneMap = {
                'formal': 'formel et professionnel',
                'casual': 'décontracté et accessible',
                'direct': 'direct et concis'
            };
            parts.push(`- Ton préféré: ${toneMap[userContext.preferred_tone] || userContext.preferred_tone}`);
        }

        if (userContext.preferred_format && userContext.preferred_format !== 'structured') {
            const formatMap = {
                'conversational': 'conversationnel et fluide',
                'bullet_points': 'listes à puces concises',
                'detailed': 'détaillé avec explications'
            };
            parts.push(`- Format préféré: ${formatMap[userContext.preferred_format] || userContext.preferred_format}`);
        }

        return parts.length > 0 ? parts.join('\n') : '';
    }

    /**
     * Build output guidance based on template and question
     * @param {Object} template
     * @param {Object} questionAnalysis
     * @returns {string} Output guidance
     */
    buildOutputGuidance(template, questionAnalysis) {
        const parts = [];

        // Get format for question type
        if (template.outputStructure && template.outputStructure.formats) {
            const format = template.outputStructure.formats[questionAnalysis.type]
                || template.outputStructure.formats[template.outputStructure.default];

            if (format) {
                parts.push(`Structure: ${format}`);
            }
        }

        // Add constraints
        if (template.outputStructure && template.outputStructure.constraints) {
            const constraints = template.outputStructure.constraints;

            if (constraints.length) {
                parts.push(`Longueur: ${constraints.length}`);
            }

            if (constraints.style) {
                parts.push(`Style: ${constraints.style}`);
            }

            if (constraints.detail) {
                parts.push(`Détail: ${constraints.detail}`);
            }
        }

        return parts.length > 0 ? parts.join('\n') : '';
    }

    /**
     * Build enriched user prompt
     * @param {Object} params
     * @returns {string} User prompt
     */
    buildUserPrompt({ question, questionAnalysis, template }) {
        // For now, just return the question
        // In the future, we could enrich it with clarifications or context hints
        return question;
    }

    /**
     * Select appropriate temperature
     * @param {Object} params
     * @returns {number} Temperature (0.0 - 1.0)
     */
    selectTemperature({ template, questionAnalysis }) {
        let temperature = template.temperature || 0.7;

        // Adjust based on question type
        if (questionAnalysis.type === 'example_request') {
            // Creative examples
            temperature = Math.min(1.0, temperature + 0.1);
        } else if (questionAnalysis.type === 'strategic') {
            // More creative for strategy
            temperature = Math.min(1.0, temperature + 0.05);
        } else if (questionAnalysis.type === 'troubleshooting') {
            // More precise for debugging
            temperature = Math.max(0.3, temperature - 0.1);
        }

        return temperature;
    }

    /**
     * Select few-shot examples
     * @param {Object} params
     * @returns {Array} Examples
     */
    selectExamples({ template, questionAnalysis, limit = 2 }) {
        if (!template.examples || template.examples.length === 0) {
            return [];
        }

        // For now, return first N examples
        // In the future, could use semantic similarity to select most relevant
        return template.examples.slice(0, limit);
    }

    /**
     * Get conversation context from session
     * @param {string} sessionId
     * @param {string} uid
     * @returns {Promise<string|null>} Context summary
     */
    async getConversationContext(sessionId, uid) {
        try {
            // Get last 3 messages from session
            const messages = await conversationHistoryService.getMessagesForSession(sessionId, {
                limit: 6, // 3 user + 3 AI
                order: 'DESC'
            });

            if (!messages || messages.length === 0) {
                return null;
            }

            // Build context summary
            const contextParts = [];

            for (const msg of messages.reverse()) {
                if (msg.role === 'user') {
                    contextParts.push(`User: "${msg.content.substring(0, 100)}..."`);
                } else if (msg.role === 'assistant') {
                    contextParts.push(`Assistant: "${msg.content.substring(0, 150)}..."`);
                }
            }

            if (contextParts.length > 0) {
                return `Messages précédents dans cette conversation:\n${contextParts.join('\n')}`;
            }

            return null;
        } catch (error) {
            console.error('[PromptEngineering] Error getting conversation context:', error);
            return null;
        }
    }

    /**
     * Get default prompt (fallback)
     * @param {string} question
     * @returns {Object} Default prompt
     */
    getDefaultPrompt(question) {
        return {
            systemPrompt: 'Tu es un assistant IA utile et bienveillant.',
            userPrompt: question,
            temperature: 0.7,
            examples: [],
            metadata: {
                profileId: this.defaultProfile,
                questionType: 'general',
                complexity: 'simple',
                hasContext: false,
                hasConversationHistory: false
            }
        };
    }

    /**
     * Get available profile IDs
     * @returns {Array<string>} Profile IDs
     */
    getAvailableProfiles() {
        return Object.keys(this.templates);
    }

    /**
     * Get profile information
     * @param {string} profileId
     * @returns {Object|null} Profile info
     */
    getProfileInfo(profileId) {
        const template = this.getTemplate(profileId);
        if (!template) return null;

        return {
            id: template.id,
            name: template.name,
            description: template.systemPrompt.split('\n')[0],
            vocabulary: template.vocabulary,
            temperature: template.temperature,
            exampleCount: template.examples ? template.examples.length : 0
        };
    }

    /**
     * Test prompt generation (for debugging)
     * @param {string} question
     * @param {string} profileId
     * @returns {Promise<Object>} Generated prompt
     */
    async testPromptGeneration(question, profileId) {
        return this.generatePrompt({
            question,
            profileId,
            uid: 'default_user',
            sessionId: null,
            customContext: {
                test_mode: true
            }
        });
    }
}

// Singleton instance
const promptEngineeringService = new PromptEngineeringService();

module.exports = promptEngineeringService;
