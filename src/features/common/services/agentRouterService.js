/**
 * Agent Router Service - Intelligent routing to specialized agents
 *
 * Implements a 4-level decision system for automatic agent selection:
 *  - Level 1: Fast keyword matching (80% of cases, <50ms)
 *  - Level 2a: Session history context enrichment (~10% of cases, ~100ms)
 *  - Level 2b: User profile context enrichment (job role, industry, function) (~5% of cases, ~50ms)
 *  - Level 3: LLM classification (5% edge cases, ~500ms)
 *
 * Phase Audit Enhancement (2024):
 *  - Added user profile context: job_role, job_function, industry
 *  - Role-based agent boosting (CEO → ceo_advisor, CTO → it_expert, etc.)
 *  - Industry-specific keyword matching (SaaS: ARR, MRR, churn; E-commerce: AOV, cart abandonment)
 *  - Expanded LLM classification to all 9 agent profiles
 *
 * This enables automatic redirection to the most appropriate specialist agent
 * based on the user's question AND their professional context.
 */

const agentProfileService = require('./agentProfileService');
const conversationHistoryService = require('./conversationHistoryService');
const userContextService = require('./userContextService');

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
                marketing_expert: 0,
                student_assistant: 0,
                researcher_assistant: 0
            },
            userOverrides: 0
        };

        // Phase WOW 1 - Jour 4: Suggestion system
        this.lastSuggestion = null;
        this.suggestionHistory = [];
        this.maxHistorySize = 50;
        this.suggestionEnabled = true; // Can be toggled by user

        // Phase Audit: Role-based agent boost mapping
        // Maps job roles to their most relevant agent profiles
        this.roleToAgentMapping = {
            // Executive roles
            'CEO': 'ceo_advisor',
            'Founder': 'ceo_advisor',
            'Co-founder': 'ceo_advisor',
            'Fondateur': 'ceo_advisor',
            'Co-fondateur': 'ceo_advisor',
            'Président': 'ceo_advisor',
            'President': 'ceo_advisor',
            'DG': 'ceo_advisor',
            'Directeur Général': 'ceo_advisor',
            'General Manager': 'ceo_advisor',
            'COO': 'ceo_advisor',
            // Tech roles
            'CTO': 'it_expert',
            'VP Engineering': 'it_expert',
            'Tech Lead': 'it_expert',
            'Lead Developer': 'it_expert',
            'Développeur': 'it_expert',
            'Developer': 'it_expert',
            'Engineer': 'it_expert',
            'Ingénieur': 'it_expert',
            // Sales roles
            'VP Sales': 'sales_expert',
            'Sales Director': 'sales_expert',
            'Directeur Commercial': 'sales_expert',
            'Account Executive': 'sales_expert',
            'Business Developer': 'sales_expert',
            'Commercial': 'sales_expert',
            'SDR': 'sales_expert',
            'BDR': 'sales_expert',
            // Marketing roles
            'CMO': 'marketing_expert',
            'VP Marketing': 'marketing_expert',
            'Marketing Director': 'marketing_expert',
            'Directeur Marketing': 'marketing_expert',
            'Growth Manager': 'marketing_expert',
            'Marketing Manager': 'marketing_expert',
            // HR roles
            'CHRO': 'hr_specialist',
            'VP HR': 'hr_specialist',
            'HR Director': 'hr_specialist',
            'DRH': 'hr_specialist',
            'Directeur RH': 'hr_specialist',
            'HR Manager': 'hr_specialist',
            'Talent Acquisition': 'hr_specialist',
            'Recruiter': 'hr_specialist',
            'Recruteur': 'hr_specialist',
            // Management roles
            'Manager': 'manager_coach',
            'Team Lead': 'manager_coach',
            'Head of': 'manager_coach',
            'Responsable': 'manager_coach',
            'Chef d\'équipe': 'manager_coach',
            // Academic roles
            'Student': 'student_assistant',
            'Étudiant': 'student_assistant',
            'Researcher': 'researcher_assistant',
            'Chercheur': 'researcher_assistant',
            'PhD': 'researcher_assistant',
            'Doctorant': 'researcher_assistant'
        };

        // Phase Audit: Job function to agent mapping
        this.functionToAgentMapping = {
            'Executive': 'ceo_advisor',
            'Engineering': 'it_expert',
            'Development': 'it_expert',
            'Sales': 'sales_expert',
            'Marketing': 'marketing_expert',
            'HR': 'hr_specialist',
            'Human Resources': 'hr_specialist',
            'Management': 'manager_coach',
            'Operations': 'manager_coach',
            'Research': 'researcher_assistant',
            'Education': 'student_assistant'
        };

        // Phase Audit: Industry-specific keywords that boost certain agents
        this.industryKeywords = {
            'SaaS': {
                ceo_advisor: ['arr', 'mrr', 'churn', 'ndr', 'net revenue retention', 'cac', 'ltv', 'product-led', 'plg', 'series', 'runway', 'burn rate'],
                sales_expert: ['enterprise sales', 'smb', 'mid-market', 'land and expand', 'upsell', 'expansion revenue'],
                marketing_expert: ['plg', 'freemium', 'trial conversion', 'activation', 'product qualified lead', 'pql']
            },
            'E-commerce': {
                marketing_expert: ['cart abandonment', 'aov', 'average order value', 'repeat purchase', 'retention', 'customer lifetime'],
                sales_expert: ['b2b', 'wholesale', 'dropshipping', 'marketplace', 'fulfillment'],
                ceo_advisor: ['gmv', 'gross merchandise value', 'take rate', 'unit economics']
            },
            'Fintech': {
                ceo_advisor: ['compliance', 'regulation', 'license', 'aml', 'kyc', 'psd2'],
                it_expert: ['api banking', 'open banking', 'payment gateway', 'blockchain', 'smart contract'],
                sales_expert: ['b2b fintech', 'enterprise', 'financial services']
            },
            'Marketplace': {
                ceo_advisor: ['liquidity', 'network effects', 'take rate', 'gmv', 'supply demand'],
                marketing_expert: ['demand generation', 'supply acquisition', 'viral loop'],
                sales_expert: ['merchant acquisition', 'seller onboarding']
            },
            'Healthcare': {
                ceo_advisor: ['hipaa', 'compliance', 'fda', 'clinical', 'regulatory'],
                it_expert: ['ehr', 'electronic health record', 'interoperability', 'hl7', 'fhir'],
                hr_specialist: ['medical staff', 'healthcare recruitment', 'credentialing']
            },
            'Agency': {
                sales_expert: ['pitch', 'proposal', 'retainer', 'scope', 'deliverable'],
                manager_coach: ['client management', 'project management', 'resource allocation'],
                marketing_expert: ['campaign management', 'creative brief', 'media buying']
            }
        };

        // Confidence boost values
        this.ROLE_BOOST = 0.12;           // Boost when user role matches agent domain
        this.FUNCTION_BOOST = 0.08;       // Boost when job function matches
        this.INDUSTRY_KEYWORD_BOOST = 0.06; // Boost per industry-specific keyword match
        this.MAX_INDUSTRY_BOOST = 0.15;   // Maximum total boost from industry keywords
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

        // LEVEL 2a: Enrich with session history context
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
            // Continue to Level 2b
        }

        // LEVEL 2b: Enrich with user profile (Phase Audit - job role, industry, function)
        try {
            const profileEnriched = await this.enrichWithUserProfile(keywordMatch, question, userId);

            if (profileEnriched.confidence > 0.8) {
                this.stats.byLevel.context++; // Count as context enrichment
                this.stats.byAgent[profileEnriched.agent]++;
                console.log(`[AgentRouter] 👤 Profile route: ${profileEnriched.agent} (confidence: ${profileEnriched.confidence.toFixed(2)})`);
                return profileEnriched;
            }
        } catch (error) {
            console.error('[AgentRouter] Profile enrichment failed:', error);
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
     * Level 2b: Enrich with user profile context (Phase Audit)
     * Uses user's job role, function, and industry to improve routing
     * @param {Object} detection - Current detection from Level 1/2
     * @param {string} question - Original question (for industry keyword matching)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Enhanced detection with profile context
     */
    async enrichWithUserProfile(detection, question, userId) {
        try {
            const userContext = userContextService.getContext(userId);

            if (!userContext) {
                console.log('[AgentRouter] No user context available for profile enrichment');
                return detection;
            }

            const lower = question.toLowerCase();
            let totalBoost = 0;
            const boostReasons = [];

            // 1. Check job role match
            if (userContext.job_role) {
                const roleAgent = this._findMatchingAgent(userContext.job_role, this.roleToAgentMapping);

                if (roleAgent) {
                    // If detected agent matches user's role domain, boost confidence
                    if (detection.agent === roleAgent) {
                        totalBoost += this.ROLE_BOOST;
                        boostReasons.push(`role_match:${userContext.job_role}`);
                        console.log(`[AgentRouter] 👤 Role boost: ${userContext.job_role} → ${roleAgent} (+${this.ROLE_BOOST})`);
                    }
                    // If confidence is low and role strongly suggests another agent, consider switching
                    else if (detection.confidence < 0.75 && roleAgent !== 'lucide_assistant') {
                        // Give partial boost towards role-preferred agent
                        const partialBoost = this.ROLE_BOOST * 0.5;

                        // If the question doesn't strongly match current detection, switch to role's agent
                        if (detection.confidence < 0.65) {
                            detection.agent = roleAgent;
                            totalBoost += partialBoost;
                            boostReasons.push(`role_preference:${userContext.job_role}→${roleAgent}`);
                            console.log(`[AgentRouter] 👤 Role switch: low confidence (${detection.confidence.toFixed(2)}) + role ${userContext.job_role} → switching to ${roleAgent}`);
                        }
                    }
                }
            }

            // 2. Check job function match
            if (userContext.job_function && totalBoost === 0) {
                const functionAgent = this.functionToAgentMapping[userContext.job_function];

                if (functionAgent && detection.agent === functionAgent) {
                    totalBoost += this.FUNCTION_BOOST;
                    boostReasons.push(`function_match:${userContext.job_function}`);
                    console.log(`[AgentRouter] 💼 Function boost: ${userContext.job_function} → ${functionAgent} (+${this.FUNCTION_BOOST})`);
                }
            }

            // 3. Check industry-specific keywords
            if (userContext.industry && this.industryKeywords[userContext.industry]) {
                const industryConfig = this.industryKeywords[userContext.industry];
                let industryBoost = 0;
                const matchedIndustryKeywords = [];

                for (const [agent, keywords] of Object.entries(industryConfig)) {
                    if (agent === detection.agent) {
                        for (const keyword of keywords) {
                            const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
                            if (regex.test(lower)) {
                                industryBoost += this.INDUSTRY_KEYWORD_BOOST;
                                matchedIndustryKeywords.push(keyword);
                            }
                        }
                    }
                }

                if (industryBoost > 0) {
                    // Cap industry boost
                    industryBoost = Math.min(industryBoost, this.MAX_INDUSTRY_BOOST);
                    totalBoost += industryBoost;
                    boostReasons.push(`industry_keywords:${userContext.industry}[${matchedIndustryKeywords.join(',')}]`);
                    console.log(`[AgentRouter] 🏭 Industry boost: ${userContext.industry} keywords [${matchedIndustryKeywords.join(', ')}] (+${industryBoost.toFixed(2)})`);
                    detection.industryKeywords = matchedIndustryKeywords;
                }
            }

            // 4. Apply total boost
            if (totalBoost > 0) {
                const oldConfidence = detection.confidence;
                detection.confidence = Math.min(0.98, detection.confidence + totalBoost);
                detection.profileBoost = {
                    totalBoost: totalBoost.toFixed(3),
                    reasons: boostReasons,
                    userRole: userContext.job_role || null,
                    userFunction: userContext.job_function || null,
                    userIndustry: userContext.industry || null
                };

                // Update reason if profile significantly influenced the decision
                if (totalBoost >= 0.1) {
                    detection.reason = detection.reason === 'keyword_match'
                        ? 'keyword_match+profile_boost'
                        : 'profile_boost';
                }

                console.log(`[AgentRouter] 📊 Profile enrichment: ${oldConfidence.toFixed(2)} → ${detection.confidence.toFixed(2)} (boost: +${totalBoost.toFixed(2)})`);
            }

            return detection;
        } catch (error) {
            console.error('[AgentRouter] Error enriching with user profile:', error);
            return detection;
        }
    }

    /**
     * Find matching agent from a role/function mapping
     * Supports partial matching for roles like "Head of Engineering"
     * @param {string} value - The role or function to match
     * @param {Object} mapping - The mapping object
     * @returns {string|null} Matched agent or null
     */
    _findMatchingAgent(value, mapping) {
        if (!value) return null;

        const valueLower = value.toLowerCase();

        // Direct match first
        for (const [key, agent] of Object.entries(mapping)) {
            if (key.toLowerCase() === valueLower) {
                return agent;
            }
        }

        // Partial match (e.g., "Head of Engineering" contains "Engineering")
        for (const [key, agent] of Object.entries(mapping)) {
            if (valueLower.includes(key.toLowerCase()) || key.toLowerCase().includes(valueLower)) {
                return agent;
            }
        }

        return null;
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
- ceo_advisor: Questions about strategy, leadership, fundraising, board management, OKR, vision, M&A, crisis management
- sales_expert: Questions about sales, prospecting, pipeline, CRM, closing, negotiation, BANT, MEDDIC
- manager_coach: Questions about management, 1:1 meetings, feedback, team culture, coaching, performance management
- hr_specialist: Questions about HR, recruitment, contracts, salaries, employees, hiring, onboarding
- it_expert: Questions about code, bugs, development, tech, programming, databases, deployment, DevOps
- marketing_expert: Questions about campaigns, content, strategy, SEO, ads, social media, branding, growth
- student_assistant: Questions about studies, exams, learning, courses, homework, academic research
- researcher_assistant: Questions about research methodology, papers, analysis, scientific methods
- lucide_assistant: General questions or anything that doesn't fit the above

Question: "${question}"

Reply with ONLY the category ID.`;

            // Use the current active AI provider with minimal tokens
            const provider = aiFactory.createProvider();
            const response = await provider.ask(prompt, {
                max_tokens: 30,
                temperature: 0.1
            });

            const agent = response.trim().toLowerCase();

            // Validate response is a valid agent ID (all 9 profiles)
            const validAgents = [
                'ceo_advisor', 'sales_expert', 'manager_coach',
                'hr_specialist', 'it_expert', 'marketing_expert',
                'student_assistant', 'researcher_assistant', 'lucide_assistant'
            ];

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

        // Store in database for ML improvement
        this._storeOverrideForML(logEntry);
    }

    /**
     * Store user override in database for ML training data
     * @param {Object} logEntry - Override data
     * @private
     */
    async _storeOverrideForML(logEntry) {
        try {
            const sqliteClient = require('./sqliteClient');
            const db = sqliteClient.getDatabase();

            if (!db) {
                console.warn('[AgentRouter] Database not available for ML storage');
                return;
            }

            // Create table if not exists
            db.exec(`
                CREATE TABLE IF NOT EXISTS agent_routing_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    question TEXT NOT NULL,
                    predicted_agent TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    reason TEXT,
                    user_choice TEXT NOT NULL,
                    matched_keywords TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
                )
            `);

            // Insert override data
            db.prepare(`
                INSERT INTO agent_routing_feedback (
                    timestamp, question, predicted_agent, confidence,
                    reason, user_choice, matched_keywords
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                logEntry.timestamp,
                logEntry.question,
                logEntry.predicted_agent,
                logEntry.confidence,
                logEntry.reason,
                logEntry.user_choice,
                JSON.stringify(logEntry.matched_keywords)
            );

            console.log('[AgentRouter] ✅ Override stored for ML improvement');
        } catch (error) {
            console.error('[AgentRouter] Failed to store override for ML:', error.message);
            // Non-blocking - don't throw
        }
    }

    /**
     * Get ML feedback data for analysis
     * @param {number} limit - Max number of records
     * @returns {Promise<Array>} Feedback records
     */
    async getMLFeedbackData(limit = 100) {
        try {
            const sqliteClient = require('./sqliteClient');
            const db = sqliteClient.getDatabase();

            if (!db) return [];

            const records = db.prepare(`
                SELECT * FROM agent_routing_feedback
                ORDER BY created_at DESC
                LIMIT ?
            `).all(limit);

            return records.map(r => ({
                ...r,
                matched_keywords: r.matched_keywords ? JSON.parse(r.matched_keywords) : []
            }));
        } catch (error) {
            console.error('[AgentRouter] Failed to get ML feedback:', error.message);
            return [];
        }
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
                marketing_expert: 0,
                student_assistant: 0,
                researcher_assistant: 0
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
