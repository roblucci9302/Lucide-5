/**
 * Agent Router Service - Intelligent routing to specialized agents
 *
 * Implements a 3-level decision system for automatic agent selection:
 *  - Level 1: Fast keyword matching (80% of cases, <50ms)
 *  - Level 2: User context enrichment (15% of cases, ~100ms)
 *  - Level 3: LLM classification (5% edge cases, ~500ms)
 *
 * This enables automatic redirection to the most appropriate specialist agent
 * based on the user's question, improving response quality and user experience.
 */

const agentProfileService = require('./agentProfileService');
const conversationHistoryService = require('./conversationHistoryService');

class AgentRouterService {
    constructor() {
        // Routing rules for fast keyword-based classification
        // Keywords are in French and English for broader coverage
        // Phase WOW 1 - Jour 4: Extended with CEO, Sales, Manager profiles
        this.routingRules = [
            {
                agent: 'ceo_advisor',
                keywords: [
                    // French keywords - Strategy
                    'stratégie', 'okr', 'vision', 'mission', 'objectifs stratégiques',
                    'roadmap', 'pivot', 'positionnement', 'concurrence', 'marché',
                    // Governance
                    'board', 'conseil d\'administration', 'actionnaires', 'investisseurs',
                    'investor update', 'rapport trimestriel', 'kpi', 'métriques clés',
                    // Fundraising
                    'levée de fonds', 'fundraising', 'série a', 'série b', 'seed',
                    'pitch deck', 'valorisation', 'dilution', 'term sheet',
                    // Leadership & Organization
                    'restructuration', 'organigramme', 'croissance', 'expansion',
                    'acquisition', 'm&a', 'crise', 'gestion de crise',
                    // English keywords
                    'strategy', 'okr', 'vision', 'mission', 'strategic objectives',
                    'roadmap', 'pivot', 'positioning', 'competition', 'market',
                    'board', 'shareholders', 'investors', 'investor update',
                    'fundraising', 'series a', 'series b', 'seed', 'pitch deck',
                    'valuation', 'dilution', 'term sheet', 'restructuring', 'growth',
                    'expansion', 'acquisition', 'crisis management'
                ],
                confidence: 0.92
            },
            {
                agent: 'sales_expert',
                keywords: [
                    // French keywords - Prospecting
                    'prospection', 'cold email', 'cold call', 'outreach',
                    'lead generation', 'qualification', 'pipeline',
                    // Sales process
                    'bant', 'meddic', 'spin', 'découverte', 'proposition commerciale',
                    'closing', 'deal', 'négociation', 'objection', 'prix', 'remise',
                    // CRM & Tools
                    'salesforce', 'hubspot', 'crm', 'forecast', 'prévision',
                    'tunnel de vente', 'funnel', 'taux de conversion', 'quota',
                    // English keywords
                    'prospecting', 'cold email', 'cold call', 'outreach',
                    'lead generation', 'qualification', 'pipeline', 'bant', 'meddic',
                    'sales proposal', 'closing', 'deal', 'negotiation', 'objection',
                    'pricing', 'discount', 'salesforce', 'hubspot', 'crm',
                    'forecast', 'sales funnel', 'conversion rate', 'quota'
                ],
                confidence: 0.91
            },
            {
                agent: 'manager_coach',
                keywords: [
                    // French keywords - 1:1 & Feedback
                    '1:1', 'one-on-one', 'entretien individuel', 'feedback',
                    'retour d\'expérience', 'évaluation',
                    // Team management
                    'délégation', 'responsabilisation', 'empowerment',
                    'motivation', 'engagement', 'culture d\'équipe',
                    // Conflicts & Issues
                    'conflit', 'médiation', 'tension', 'désaccord',
                    // Performance
                    'performance', 'pip', 'plan d\'amélioration', 'sous-performance',
                    'développement', 'coaching', 'mentoring', 'plan de carrière',
                    // English keywords
                    '1:1', 'one-on-one', 'individual meeting', 'feedback',
                    'evaluation', 'delegation', 'empowerment', 'motivation',
                    'engagement', 'team culture', 'conflict', 'mediation',
                    'tension', 'disagreement', 'performance', 'pip',
                    'performance improvement', 'underperformance', 'development',
                    'coaching', 'mentoring', 'career plan'
                ],
                confidence: 0.91
            },
            {
                agent: 'hr_specialist',
                keywords: [
                    // French keywords
                    'recruter', 'recrutement', 'cv', 'curriculum', 'candidat', 'candidature',
                    'entretien', 'embauche', 'embaucher', 'contrat', 'cdi', 'cdd', 'salaire', 'rémunération',
                    'congé', 'congés', 'employé', 'employés', 'rh', 'ressources humaines',
                    'formation', 'onboarding', 'licenciement', 'démission', 'paie',
                    'avantages sociaux', 'mutuelle', 'retraite', 'carrière', 'évaluation',
                    'performance', 'talent', 'talents', 'compétences', 'organigramme', 'équipe',
                    'poste', 'offre d\'emploi',
                    // English keywords
                    'recruit', 'recruitment', 'resume', 'candidate', 'interview',
                    'hire', 'hiring', 'contract', 'salary', 'compensation', 'leave',
                    'employee', 'hr', 'human resources', 'training', 'onboarding',
                    'termination', 'resignation', 'payroll', 'benefits', 'career',
                    'job', 'position', 'talent'
                ],
                confidence: 0.9
            },
            {
                agent: 'it_expert',
                keywords: [
                    // French keywords
                    'bug', 'bogue', 'erreur', 'code', 'fonction', 'variable', 'class',
                    'debug', 'debugger', 'api', 'endpoint', 'serveur', 'server', 'base de données',
                    'bdd', 'database', 'sql', 'query', 'requête', 'react', 'vue', 'angular',
                    'javascript', 'typescript', 'python', 'java', 'php', 'ruby', 'go', 'rust',
                    'développement', 'développer', 'coder', 'programmer', 'git', 'github',
                    'deploy', 'déploiement', 'docker', 'kubernetes', 'ci/cd', 'devops',
                    'frontend', 'backend', 'fullstack', 'architecture', 'microservices',
                    'rest', 'graphql', 'websocket', 'async', 'promise', 'callback',
                    'component', 'composant', 'hook', 'state', 'props', 'redux',
                    'test', 'testing', 'unittest', 'jest', 'cypress', 'selenium',
                    // English keywords
                    'bug', 'error', 'code', 'function', 'variable', 'class', 'debug',
                    'api', 'endpoint', 'server', 'database', 'development', 'developer',
                    'programming', 'git', 'deploy', 'deployment', 'devops', 'testing'
                ],
                confidence: 0.85
            },
            {
                agent: 'marketing_expert',
                keywords: [
                    // French keywords
                    'campagne', 'marketing', 'publicité', 'pub', 'contenu', 'content',
                    'seo', 'référencement', 'google', 'facebook', 'instagram', 'linkedin',
                    'social media', 'réseaux sociaux', 'email', 'newsletter', 'mailing',
                    'client', 'clients', 'prospect', 'prospects', 'lead', 'leads',
                    'stratégie', 'strategy', 'brand', 'marque', 'branding', 'image',
                    'conversion', 'conversions', 'taux de conversion', 'funnel', 'entonnoir',
                    'analytics', 'analytique', 'metrics', 'métriques', 'kpi', 'roi',
                    'engagement', 'reach', 'portée', 'impression', 'clic', 'ctr',
                    'landing page', 'page d\'atterrissage', 'a/b test', 'copywriting',
                    'storytelling', 'persona', 'audience', 'cible', 'target',
                    'inbound', 'outbound', 'growth', 'croissance', 'acquisition',
                    'ads', 'ad', 'annonce', 'annonces', 'visibilité', 'notoriété',
                    // English keywords
                    'campaign', 'marketing', 'advertising', 'ad', 'ads', 'content', 'seo',
                    'social media', 'email', 'newsletter', 'customer', 'prospect',
                    'lead', 'strategy', 'brand', 'branding', 'conversion', 'conversions', 'funnel',
                    'analytics', 'metrics', 'engagement', 'landing page', 'growth', 'roi'
                ],
                confidence: 0.85
            }
        ];

        // Statistics for monitoring and improvement
        this.stats = {
            totalRoutings: 0,
            byLevel: {
                keywords: 0,
                context: 0,
                llm: 0
            },
            byAgent: {
                lucide_assistant: 0,
                ceo_advisor: 0,
                sales_expert: 0,
                manager_coach: 0,
                hr_specialist: 0,
                it_expert: 0,
                marketing_expert: 0
            },
            userOverrides: 0
        };

        // Phase WOW 1 - Jour 4: Suggestion system
        this.lastSuggestion = null;
        this.suggestionHistory = [];
        this.maxHistorySize = 50;
        this.suggestionEnabled = true; // Can be toggled by user
    }

    /**
     * Route a question to the best agent
     * @param {string} question - User question
     * @param {string} userId - User ID for context enrichment
     * @returns {Promise<Object>} { agent, confidence, reason, matchedKeywords? }
     */
    async routeQuestion(question, userId) {
        if (!question || typeof question !== 'string') {
            console.warn('[AgentRouter] Invalid question, using default agent');
            return {
                agent: 'lucide_assistant',
                confidence: 1.0,
                reason: 'invalid_input'
            };
        }

        this.stats.totalRoutings++;

        // LEVEL 1: Fast keyword matching
        const keywordMatch = this.detectByKeywords(question);

        if (keywordMatch.confidence > 0.9) {
            this.stats.byLevel.keywords++;
            this.stats.byAgent[keywordMatch.agent]++;
            console.log(`[AgentRouter] ⚡ Fast route: ${keywordMatch.agent} (confidence: ${keywordMatch.confidence.toFixed(2)})`);
            return keywordMatch;
        }

        // LEVEL 2: Enrich with user context
        try {
            const contextEnriched = await this.enrichWithContext(keywordMatch, userId);

            if (contextEnriched.confidence > 0.8) {
                this.stats.byLevel.context++;
                this.stats.byAgent[contextEnriched.agent]++;
                console.log(`[AgentRouter] 📊 Context route: ${contextEnriched.agent} (confidence: ${contextEnriched.confidence.toFixed(2)})`);
                return contextEnriched;
            }
        } catch (error) {
            console.error('[AgentRouter] Context enrichment failed:', error);
            // Continue to Level 3
        }

        // LEVEL 3: LLM classification for edge cases
        try {
            const llmAgent = await this.classifyWithLLM(question);
            this.stats.byLevel.llm++;
            this.stats.byAgent[llmAgent]++;
            console.log(`[AgentRouter] 🤖 LLM route: ${llmAgent} (confidence: 0.95)`);

            return {
                agent: llmAgent,
                confidence: 0.95,
                reason: 'llm_classification'
            };
        } catch (error) {
            console.error('[AgentRouter] LLM classification failed:', error);

            // Fallback to keyword match or default
            const fallbackAgent = keywordMatch.confidence > 0.5 ? keywordMatch.agent : 'lucide_assistant';
            this.stats.byAgent[fallbackAgent]++;

            return {
                agent: fallbackAgent,
                confidence: keywordMatch.confidence,
                reason: 'fallback'
            };
        }
    }

    /**
     * Level 1: Fast keyword detection
     * Analyzes question for domain-specific keywords
     * @param {string} question - User question
     * @returns {Object} { agent, confidence, reason, matchedKeywords }
     */
    detectByKeywords(question) {
        const lower = question.toLowerCase();
        let bestMatch = {
            agent: 'lucide_assistant',
            confidence: 0.5,
            reason: 'default',
            matchedKeywords: []
        };

        for (const rule of this.routingRules) {
            const matchedKeywords = rule.keywords.filter(keyword => {
                // Use word boundary matching for better precision
                const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
                return regex.test(lower);
            });

            if (matchedKeywords.length > 0) {
                // Confidence increases with number of matched keywords
                // Base confidence + bonus for each additional keyword
                const confidence = Math.min(0.95, rule.confidence + (matchedKeywords.length - 1) * 0.05);

                if (confidence > bestMatch.confidence) {
                    bestMatch = {
                        agent: rule.agent,
                        confidence,
                        reason: 'keyword_match',
                        matchedKeywords: matchedKeywords.slice(0, 5) // Limit to 5 for brevity
                    };
                }
            }
        }

        return bestMatch;
    }

    /**
     * Level 2: Enrich with user context
     * Uses recent conversation history to improve routing accuracy
     * @param {Object} detection - Initial detection from Level 1
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Enhanced detection
     */
    async enrichWithContext(detection, userId) {
        try {
            // Get user's default/current profile
            const currentProfile = agentProfileService.getCurrentProfile();

            // Get recent sessions (last 10)
            const recentSessions = await conversationHistoryService.getAllSessions(userId, {
                limit: 10,
                sortBy: 'updated_at',
                order: 'DESC'
            });

            if (!recentSessions || recentSessions.length === 0) {
                // No history, return original detection
                return detection;
            }

            // Count agent usage frequency in recent sessions
            const agentFrequency = {};
            recentSessions.forEach(session => {
                const agent = session.agent_profile || 'lucide_assistant';
                agentFrequency[agent] = (agentFrequency[agent] || 0) + 1;
            });

            // Calculate most frequently used agent
            const mostUsedAgent = Object.keys(agentFrequency)
                .reduce((a, b) => agentFrequency[a] > agentFrequency[b] ? a : b, currentProfile);

            const usageFrequency = agentFrequency[mostUsedAgent] / recentSessions.length;

            // If confidence is medium-low and user frequently uses a specific agent
            // Boost confidence towards that agent
            if (detection.confidence < 0.8 && usageFrequency > 0.6) {
                detection.agent = mostUsedAgent;
                detection.confidence = Math.min(0.9, detection.confidence + 0.15);
                detection.reason = 'context_boost';
                detection.contextInfo = {
                    usageFrequency: usageFrequency.toFixed(2),
                    recentSessions: recentSessions.length
                };
            }

            return detection;
        } catch (error) {
            console.error('[AgentRouter] Error enriching context:', error);
            return detection;
        }
    }

    /**
     * Level 3: LLM classification for ambiguous cases
     * Uses a lightweight LLM to classify edge cases
     * @param {string} question - User question
     * @returns {Promise<string>} Agent ID
     */
    async classifyWithLLM(question) {
        try {
            const aiFactory = require('../ai/factory');

            const prompt = `You are a question classifier. Classify this question into ONE category:

Categories:
- hr_specialist: Questions about HR, recruitment, contracts, salaries, employees, hiring, onboarding
- it_expert: Questions about code, bugs, development, tech, programming, databases, deployment
- marketing_expert: Questions about campaigns, content, strategy, SEO, ads, social media, branding
- lucide_assistant: General questions or anything that doesn't fit the above

Question: "${question}"

Reply with ONLY the category ID (one of: hr_specialist, it_expert, marketing_expert, lucide_assistant).`;

            // Use the current active AI provider with minimal tokens
            const provider = aiFactory.createProvider();
            const response = await provider.ask(prompt, {
                max_tokens: 30,
                temperature: 0.1
            });

            const agent = response.trim().toLowerCase();

            // Validate response is a valid agent ID
            const validAgents = ['hr_specialist', 'it_expert', 'marketing_expert', 'lucide_assistant'];

            if (validAgents.includes(agent)) {
                return agent;
            } else {
                console.warn('[AgentRouter] LLM returned invalid agent:', agent);
                return 'lucide_assistant';
            }

        } catch (error) {
            console.error('[AgentRouter] LLM classification error:', error);
            throw error; // Propagate to use fallback in routeQuestion
        }
    }

    /**
     * Log when user manually overrides the agent selection
     * This data can be used to improve routing rules
     * @param {string} question - Original question
     * @param {Object} prediction - Router's prediction
     * @param {string} userChoice - User's manual choice
     */
    logUserOverride(question, prediction, userChoice) {
        this.stats.userOverrides++;

        const logEntry = {
            timestamp: new Date().toISOString(),
            question: question.substring(0, 200), // Truncate for privacy
            predicted_agent: prediction.agent,
            confidence: prediction.confidence,
            reason: prediction.reason,
            user_choice: userChoice,
            matched_keywords: prediction.matchedKeywords || []
        };

        console.log('[AgentRouter] ⚠️  User override:', logEntry);

        // TODO: In Phase 2, store this in database for ML improvement
        // This data will help identify patterns where the router makes mistakes
        // and allow for continuous improvement of routing rules
    }

    /**
     * Get routing statistics
     * @returns {Object} Statistics about routing performance
     */
    getStats() {
        return {
            ...this.stats,
            accuracy: this.stats.totalRoutings > 0
                ? ((this.stats.totalRoutings - this.stats.userOverrides) / this.stats.totalRoutings * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }

    /**
     * Reset statistics (useful for testing)
     */
    resetStats() {
        this.stats = {
            totalRoutings: 0,
            byLevel: { keywords: 0, context: 0, llm: 0 },
            byAgent: {
                lucide_assistant: 0,
                ceo_advisor: 0,
                sales_expert: 0,
                manager_coach: 0,
                hr_specialist: 0,
                it_expert: 0,
                marketing_expert: 0
            },
            userOverrides: 0
        };
    }

    /**
     * Phase WOW 1 - Jour 4: Analyze and suggest profile (without auto-switching)
     * Creates a suggestion that the user can accept or reject
     * @param {string} question - User question
     * @param {string} currentProfile - Currently active profile
     * @returns {Object|null} Suggestion or null if no suggestion needed
     */
    analyzeSuggestion(question, currentProfile) {
        if (!this.suggestionEnabled || !question || question.length < 10) {
            return null;
        }

        // Use keyword detection to find best match
        const detection = this.detectByKeywords(question);

        // Don't suggest if already using the best profile
        if (detection.agent === currentProfile) {
            return null;
        }

        // Only suggest if confidence is high enough (>= 0.85)
        if (detection.confidence < 0.85) {
            return null;
        }

        // Create suggestion object
        const suggestion = {
            suggestedProfile: detection.agent,
            currentProfile: currentProfile,
            confidence: detection.confidence,
            matchedKeywords: detection.matchedKeywords || [],
            question: question.substring(0, 200), // Truncate for privacy
            timestamp: new Date().toISOString(),
            reason: this.getSuggestionReason(detection.agent)
        };

        // Store as last suggestion
        this.lastSuggestion = suggestion;

        // Add to history
        this.addSuggestionToHistory(suggestion);

        console.log(`[AgentRouter] 💡 Suggestion: switch from ${currentProfile} to ${detection.agent} (confidence: ${detection.confidence.toFixed(2)})`);

        return suggestion;
    }

    /**
     * Get human-readable reason for suggestion
     * @param {string} profileId - Suggested profile ID
     * @returns {string} Reason
     */
    getSuggestionReason(profileId) {
        const reasons = {
            ceo_advisor: 'Cette question concerne la stratégie, la gouvernance ou le leadership exécutif',
            sales_expert: 'Cette question concerne la vente, la prospection ou le pipeline commercial',
            manager_coach: 'Cette question concerne le management, le feedback ou la gestion d\'équipe',
            hr_specialist: 'Cette question concerne le recrutement, les RH ou la gestion des employés',
            it_expert: 'Cette question concerne le développement, le code ou l\'infrastructure technique',
            marketing_expert: 'Cette question concerne le marketing, les campagnes ou le contenu'
        };

        return reasons[profileId] || 'Ce profil semble plus adapté à votre question';
    }

    /**
     * Add suggestion to history
     * @param {Object} suggestion
     */
    addSuggestionToHistory(suggestion) {
        this.suggestionHistory.unshift(suggestion);

        // Limit history size
        if (this.suggestionHistory.length > this.maxHistorySize) {
            this.suggestionHistory = this.suggestionHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Accept a suggestion (user clicked "Switch")
     * @param {Object} suggestion
     * @returns {boolean} Success
     */
    acceptSuggestion(suggestion) {
        if (!suggestion) return false;

        // Find in history and mark as accepted
        const historyItem = this.suggestionHistory.find(
            s => s.timestamp === suggestion.timestamp
        );

        if (historyItem) {
            historyItem.accepted = true;
            historyItem.acceptedAt = new Date().toISOString();
        }

        if (this.lastSuggestion?.timestamp === suggestion.timestamp) {
            this.lastSuggestion.accepted = true;
            this.lastSuggestion.acceptedAt = new Date().toISOString();
        }

        console.log(`[AgentRouter] ✅ Suggestion accepted: ${suggestion.suggestedProfile}`);
        return true;
    }

    /**
     * Reject a suggestion (user clicked "Dismiss")
     * @param {Object} suggestion
     * @returns {boolean} Success
     */
    rejectSuggestion(suggestion) {
        if (!suggestion) return false;

        // Find in history and mark as rejected
        const historyItem = this.suggestionHistory.find(
            s => s.timestamp === suggestion.timestamp
        );

        if (historyItem) {
            historyItem.rejected = true;
            historyItem.rejectedAt = new Date().toISOString();
        }

        if (this.lastSuggestion?.timestamp === suggestion.timestamp) {
            this.lastSuggestion.rejected = true;
            this.lastSuggestion.rejectedAt = new Date().toISOString();
        }

        console.log(`[AgentRouter] ❌ Suggestion rejected: ${suggestion.suggestedProfile}`);
        return true;
    }

    /**
     * Get suggestion history
     * @param {number} limit - Max number of suggestions to return
     * @returns {Array} Suggestions
     */
    getSuggestionHistory(limit = 10) {
        return this.suggestionHistory.slice(0, limit);
    }

    /**
     * Get last suggestion
     * @returns {Object|null}
     */
    getLastSuggestion() {
        return this.lastSuggestion;
    }

    /**
     * Clear last suggestion
     */
    clearLastSuggestion() {
        this.lastSuggestion = null;
    }

    /**
     * Enable/disable suggestions
     * @param {boolean} enabled
     */
    setSuggestionsEnabled(enabled) {
        this.suggestionEnabled = enabled;
        console.log(`[AgentRouter] Suggestions ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get suggestion statistics
     * @returns {Object}
     */
    getSuggestionStats() {
        const total = this.suggestionHistory.length;
        const accepted = this.suggestionHistory.filter(s => s.accepted).length;
        const rejected = this.suggestionHistory.filter(s => s.rejected).length;
        const pending = total - accepted - rejected;

        const profileCounts = {};
        this.suggestionHistory.forEach(s => {
            profileCounts[s.suggestedProfile] = (profileCounts[s.suggestedProfile] || 0) + 1;
        });

        return {
            total,
            accepted,
            rejected,
            pending,
            acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(1) + '%' : '0%',
            profileCounts,
            mostSuggested: Object.entries(profileCounts)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || null
        };
    }

    /**
     * Escape special regex characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Singleton instance
const agentRouterService = new AgentRouterService();

module.exports = agentRouterService;
