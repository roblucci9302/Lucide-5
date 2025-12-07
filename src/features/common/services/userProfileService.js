/**
 * User Profile Service
 *
 * Business logic for managing user profiles, onboarding, and profile preferences
 * Part of Phase WOW 1: Profiles Intelligents & Agents Spécialisés
 */

const userProfileRepository = require('../repositories/userProfileRepository');
const agentProfileService = require('./agentProfileService');
const userContextService = require('./userContextService');
const EventEmitter = require('events');

class UserProfileService extends EventEmitter {
    constructor() {
        super();
        this.currentUid = null;
        this.currentProfile = null;
    }

    /**
     * Initialize the service for a user
     * @param {string} uid - User ID
     * @returns {Promise<Object>} User profile
     */
    async initialize(uid) {
        try {
            this.currentUid = uid;

            // Get or create user profile
            this.currentProfile = await userProfileRepository.getOrCreateProfile(uid);

            // Initialize agent profile service with active profile
            await agentProfileService.initialize(uid);

            console.log('[UserProfileService] Initialized for user:', uid);
            console.log('[UserProfileService] Active profile:', this.currentProfile.active_profile);
            console.log('[UserProfileService] Onboarding completed:', this.currentProfile.onboarding_completed);

            this.emit('profile-loaded', this.currentProfile);

            return this.currentProfile;
        } catch (error) {
            console.error('[UserProfileService] Error initializing:', error);
            throw error;
        }
    }

    /**
     * Get current user profile
     * @returns {Object|null} Current profile
     */
    getCurrentProfile() {
        return this.currentProfile;
    }

    /**
     * Check if user needs onboarding
     * @returns {boolean} True if onboarding needed
     */
    needsOnboarding() {
        // Fix: Check if service is initialized first
        if (!this.currentUid) {
            console.warn('[UserProfileService] needsOnboarding called before initialization - service not ready');
            return false; // Don't show onboarding if service isn't ready
        }
        if (!this.currentProfile) return true;
        return this.currentProfile.onboarding_completed !== 1;
    }

    /**
     * Check if the service is properly initialized
     * @returns {boolean} True if service is ready
     */
    isInitialized() {
        return this.currentUid !== null;
    }

    /**
     * Start onboarding process
     * @returns {Object} Onboarding configuration
     */
    startOnboarding() {
        console.log('[UserProfileService] Starting onboarding for user:', this.currentUid);

        const config = {
            uid: this.currentUid,
            steps: [
                {
                    id: 'welcome',
                    title: 'Bienvenue dans Lucide',
                    description: 'Configurons votre assistant IA personnalisé'
                },
                {
                    id: 'profile-selection',
                    title: 'Choisissez votre profil',
                    description: 'Sélectionnez le profil qui correspond à votre rôle',
                    profiles: agentProfileService.getAvailableProfiles()
                },
                {
                    id: 'profile-questions',
                    title: 'Personnalisation',
                    description: 'Quelques questions pour mieux vous connaître'
                },
                {
                    id: 'completion',
                    title: 'Configuration terminée',
                    description: 'Votre assistant est prêt à vous aider'
                }
            ]
        };

        this.emit('onboarding-started', config);
        return config;
    }

    /**
     * Complete onboarding with user selections
     * @param {Object} data - Onboarding data
     * @returns {Promise<Object>} Updated profile
     */
    async completeOnboarding(data) {
        // Fix: Validate service is initialized before proceeding
        if (!this.currentUid) {
            const error = new Error('UserProfileService not initialized. Cannot complete onboarding without a valid user ID.');
            console.error('[UserProfileService] completeOnboarding failed:', error.message);
            throw error;
        }

        try {
            console.log('[UserProfileService] Completing onboarding for user:', this.currentUid, 'data:', data);

            const { selectedProfile, preferences } = data;

            // Validate required data
            if (!selectedProfile) {
                throw new Error('No profile selected. Please select a profile to continue.');
            }

            // Update profile with onboarding data
            await userProfileRepository.updateProfile(this.currentUid, {
                active_profile: selectedProfile,
                onboarding_completed: 1,
                profile_preferences: preferences || {}
            });

            // Update agent profile service
            await agentProfileService.setActiveProfile(this.currentUid, selectedProfile);

            // Migrate onboarding answers to user_context for prompt engineering
            await this._migrateOnboardingToContext(this.currentUid, selectedProfile, preferences || {});

            // Reload current profile
            this.currentProfile = await userProfileRepository.getProfile(this.currentUid);

            console.log('[UserProfileService] Onboarding completed successfully');
            this.emit('onboarding-completed', this.currentProfile);

            return this.currentProfile;
        } catch (error) {
            console.error('[UserProfileService] Error completing onboarding:', error);
            throw error;
        }
    }

    /**
     * Migrate onboarding answers to user_context table
     * Maps profile-specific answers to standardized user_context fields
     * @private
     * @param {string} uid - User ID
     * @param {string} profileId - Selected profile ID
     * @param {Object} preferences - Onboarding answers
     */
    async _migrateOnboardingToContext(uid, profileId, preferences) {
        try {
            const contextData = {
                onboarding_completed: 1,
                onboarding_completed_at: Date.now()
            };

            // Map common fields across all profiles
            if (preferences.company_size) {
                contextData.company_size = preferences.company_size;
            }

            if (preferences.industry) {
                contextData.industry = preferences.industry;
            }

            if (preferences.experience_level) {
                // Parse experience level to extract years
                const expMatch = preferences.experience_level.match(/(\d+)/);
                if (expMatch) {
                    contextData.experience_years = parseInt(expMatch[1], 10);
                }
                contextData.seniority = preferences.experience_level;
            }

            if (preferences.team_size) {
                // Extract numeric value if possible
                const teamMatch = preferences.team_size.match(/(\d+)/);
                if (teamMatch) {
                    contextData.team_size = parseInt(teamMatch[1], 10);
                }
            }

            // Profile-specific mappings
            switch (profileId) {
                case 'ceo_advisor':
                    if (preferences.company_stage) {
                        contextData.company_stage = preferences.company_stage;
                    }
                    if (preferences.strategic_focus) {
                        contextData.current_challenges = preferences.strategic_focus;
                    }
                    // Phase 3 Audit: Handle is_first_time_founder
                    if (preferences.is_first_time_founder) {
                        contextData.is_first_time_founder = preferences.is_first_time_founder.includes('Oui') ? 1 : 0;
                    }
                    contextData.job_role = 'CEO';
                    contextData.job_function = 'Executive';
                    break;

                case 'hr_specialist':
                    if (preferences.hr_focus) {
                        contextData.current_challenges = preferences.hr_focus;
                    }
                    // Phase 3 Audit: Set has_managed_team if team_size is not Solo
                    if (preferences.team_size && preferences.team_size !== 'Solo') {
                        contextData.has_managed_team = 1;
                    }
                    contextData.job_function = 'HR';
                    contextData.job_role = 'DRH';
                    break;

                case 'it_expert':
                    if (preferences.tech_stack) {
                        contextData.preferred_frameworks = preferences.tech_stack;
                    }
                    if (preferences.dev_focus) {
                        contextData.current_challenges = preferences.dev_focus;
                    }
                    contextData.job_function = 'Engineering';
                    break;

                case 'marketing_expert':
                    if (preferences.marketing_channels) {
                        contextData.current_challenges = preferences.marketing_channels;
                    }
                    if (preferences.target_audience) {
                        contextData.industry_sub = preferences.target_audience;
                    }
                    contextData.job_function = 'Marketing';
                    break;

                case 'sales_expert':
                    if (preferences.sales_model) {
                        contextData.industry_sub = preferences.sales_model;
                    }
                    if (preferences.sales_focus) {
                        contextData.current_challenges = preferences.sales_focus;
                    }
                    contextData.job_function = 'Sales';
                    break;

                case 'manager_coach':
                    if (preferences.management_level) {
                        contextData.seniority = preferences.management_level;
                    }
                    if (preferences.management_challenges) {
                        contextData.current_challenges = preferences.management_challenges;
                    }
                    if (preferences.team_type) {
                        contextData.company_type = preferences.team_type;
                    }
                    contextData.job_function = 'Management';
                    contextData.has_managed_team = 1;
                    break;

                case 'lucide_assistant':
                default:
                    if (preferences.primary_use) {
                        contextData.job_function = preferences.primary_use;
                    }
                    if (preferences.goals) {
                        contextData.current_goals = preferences.goals;
                    }
                    break;
            }

            // Save to user_context
            userContextService.saveContext(uid, contextData);
            console.log('[UserProfileService] Migrated onboarding data to user_context:', Object.keys(contextData).length, 'fields');

        } catch (error) {
            // Log but don't fail onboarding if context migration fails
            console.error('[UserProfileService] Error migrating to user_context (non-critical):', error);
        }
    }

    /**
     * Switch to a different profile
     * @param {string} profileId - Target profile ID
     * @param {string} reason - 'manual' or 'auto'
     * @returns {Promise<boolean>} Success status
     */
    async switchProfile(profileId, reason = 'manual') {
        try {
            const currentProfileId = this.currentProfile?.active_profile || 'lucide_assistant';

            // Validate profile exists
            const targetProfile = agentProfileService.getProfileById(profileId);
            if (!targetProfile) {
                console.error('[UserProfileService] Invalid profile ID:', profileId);
                return false;
            }

            // Don't switch if already on this profile
            if (currentProfileId === profileId) {
                console.log('[UserProfileService] Already on profile:', profileId);
                return true;
            }

            console.log(`[UserProfileService] Switching from ${currentProfileId} to ${profileId} (${reason})`);

            // Record the switch
            await userProfileRepository.recordProfileSwitch(
                this.currentUid,
                currentProfileId,
                profileId,
                reason
            );

            // Update active profile
            await userProfileRepository.updateProfile(this.currentUid, {
                active_profile: profileId
            });

            // Update agent profile service
            await agentProfileService.setActiveProfile(this.currentUid, profileId);

            // Reload current profile
            this.currentProfile = await userProfileRepository.getProfile(this.currentUid);

            this.emit('profile-switched', {
                from: currentProfileId,
                to: profileId,
                reason
            });

            return true;
        } catch (error) {
            console.error('[UserProfileService] Error switching profile:', error);
            return false;
        }
    }

    /**
     * Update user preferences
     * @param {Object} preferences - New preferences
     * @returns {Promise<boolean>} Success status
     */
    async updatePreferences(preferences) {
        try {
            const success = await userProfileRepository.updateProfile(this.currentUid, {
                profile_preferences: preferences
            });

            if (success) {
                this.currentProfile = await userProfileRepository.getProfile(this.currentUid);
                this.emit('preferences-updated', preferences);
            }

            return success;
        } catch (error) {
            console.error('[UserProfileService] Error updating preferences:', error);
            return false;
        }
    }

    /**
     * Get profile switch history
     * @param {number} limit - Max number of records
     * @returns {Promise<Array>} Switch history
     */
    async getSwitchHistory(limit = 50) {
        try {
            return await userProfileRepository.getProfileSwitchHistory(this.currentUid, limit);
        } catch (error) {
            console.error('[UserProfileService] Error getting switch history:', error);
            return [];
        }
    }

    /**
     * Get profile usage statistics
     * @returns {Promise<Object>} Usage stats
     */
    async getUsageStats() {
        try {
            const switchStats = await userProfileRepository.getProfileSwitchStats(this.currentUid);

            return {
                current_profile: this.currentProfile?.active_profile,
                onboarding_completed: this.currentProfile?.onboarding_completed === 1,
                profile_switches: switchStats,
                preferences: this.currentProfile?.profile_preferences || {}
            };
        } catch (error) {
            console.error('[UserProfileService] Error getting usage stats:', error);
            return null;
        }
    }

    /**
     * Get onboarding questions based on selected profile
     * @param {string} profileId - Selected profile ID
     * @returns {Array} Questions to ask
     */
    getOnboardingQuestions(profileId) {
        const questionsByProfile = {
            lucide_assistant: [
                {
                    id: 'primary_use',
                    question: 'Comment comptez-vous principalement utiliser Lucide ?',
                    type: 'select',
                    options: ['Travail', 'Études', 'Personnel', 'Autre']
                },
                {
                    id: 'industry',
                    question: 'Dans quel secteur travaillez-vous ?',
                    type: 'text',
                    placeholder: 'Ex: Tech, Finance, Santé, Éducation...'
                },
                {
                    id: 'experience_level',
                    question: 'Votre niveau d\'expérience ?',
                    type: 'select',
                    options: ['Débutant (0-2 ans)', 'Intermédiaire (3-5 ans)', 'Confirmé (6-10 ans)', 'Expert (10+ ans)']
                },
                {
                    id: 'goals',
                    question: 'Quels sont vos objectifs principaux ?',
                    type: 'multiselect',
                    options: ['Productivité', 'Organisation', 'Apprentissage', 'Collaboration']
                }
            ],
            hr_specialist: [
                {
                    id: 'company_size',
                    question: 'Taille de votre entreprise ?',
                    type: 'select',
                    options: ['1-10', '11-50', '51-200', '201-1000', '1000+']
                },
                {
                    id: 'team_size',
                    question: 'Taille de votre équipe RH ?',
                    type: 'select',
                    options: ['Solo', '2-5', '6-10', '10+']
                },
                {
                    id: 'experience_level',
                    question: 'Votre expérience en RH ?',
                    type: 'select',
                    options: ['Junior (0-2 ans)', 'Intermédiaire (3-5 ans)', 'Senior (6-10 ans)', 'Expert (10+ ans)']
                },
                {
                    id: 'hr_focus',
                    question: 'Vos priorités RH ?',
                    type: 'multiselect',
                    options: ['Recrutement', 'Formation', 'Gestion talents', 'Paie', 'Relations employés']
                },
                {
                    id: 'industry',
                    question: 'Secteur d\'activité ?',
                    type: 'text',
                    placeholder: 'Ex: Tech, Finance, Santé...'
                }
            ],
            it_expert: [
                {
                    id: 'tech_stack',
                    question: 'Technologies principales ?',
                    type: 'multiselect',
                    options: ['JavaScript/Node', 'Python', 'Java', 'C#/.NET', 'Go', 'Rust', 'Autre']
                },
                {
                    id: 'dev_focus',
                    question: 'Domaines de focus ?',
                    type: 'multiselect',
                    options: ['Backend', 'Frontend', 'DevOps', 'Security', 'Data', 'Mobile']
                },
                {
                    id: 'experience_level',
                    question: 'Niveau d\'expérience ?',
                    type: 'select',
                    options: ['Junior (0-2 ans)', 'Intermédiaire (3-5 ans)', 'Senior (6-10 ans)', 'Expert (10+ ans)']
                },
                {
                    id: 'industry',
                    question: 'Secteur d\'activité ?',
                    type: 'text',
                    placeholder: 'Ex: SaaS, FinTech, E-commerce, Agence...'
                }
            ],
            marketing_expert: [
                {
                    id: 'marketing_channels',
                    question: 'Canaux marketing utilisés ?',
                    type: 'multiselect',
                    options: ['SEO/SEM', 'Réseaux sociaux', 'Email', 'Content', 'Publicité', 'Influenceurs']
                },
                {
                    id: 'target_audience',
                    question: 'Audience cible ?',
                    type: 'select',
                    options: ['B2B', 'B2C', 'Les deux']
                },
                {
                    id: 'company_size',
                    question: 'Taille de l\'entreprise ?',
                    type: 'select',
                    options: ['Startup', 'PME', 'Grande entreprise', 'Agence']
                },
                {
                    id: 'experience_level',
                    question: 'Votre expérience en marketing ?',
                    type: 'select',
                    options: ['Junior (0-2 ans)', 'Intermédiaire (3-5 ans)', 'Senior (6-10 ans)', 'Expert (10+ ans)']
                },
                {
                    id: 'industry',
                    question: 'Secteur d\'activité ?',
                    type: 'text',
                    placeholder: 'Ex: Tech, E-commerce, Mode, B2B SaaS...'
                }
            ],
            ceo_advisor: [
                {
                    id: 'company_stage',
                    question: 'Stade de l\'entreprise ?',
                    type: 'select',
                    options: ['Pré-seed', 'Seed', 'Série A-B', 'Croissance', 'Mature']
                },
                {
                    id: 'company_size',
                    question: 'Nombre d\'employés ?',
                    type: 'select',
                    options: ['1-10', '11-50', '51-200', '201-500', '500+']
                },
                {
                    id: 'is_first_time_founder',
                    question: 'Est-ce votre première entreprise ?',
                    type: 'select',
                    options: ['Oui, première fois', 'Non, serial entrepreneur']
                },
                {
                    id: 'strategic_focus',
                    question: 'Priorités stratégiques ?',
                    type: 'multiselect',
                    options: ['Croissance', 'Rentabilité', 'Levée de fonds', 'Expansion', 'Innovation', 'M&A']
                },
                {
                    id: 'industry',
                    question: 'Secteur d\'activité ?',
                    type: 'text',
                    placeholder: 'Ex: SaaS, E-commerce, FinTech...'
                }
            ],
            sales_expert: [
                {
                    id: 'sales_model',
                    question: 'Modèle de vente ?',
                    type: 'select',
                    options: ['B2B', 'B2C', 'B2B2C', 'Marketplace']
                },
                {
                    id: 'sales_cycle',
                    question: 'Durée du cycle de vente ?',
                    type: 'select',
                    options: ['<1 mois', '1-3 mois', '3-6 mois', '6-12 mois', '12+ mois']
                },
                {
                    id: 'sales_focus',
                    question: 'Focus commercial ?',
                    type: 'multiselect',
                    options: ['Prospection', 'Closing', 'Account management', 'Upsell/Cross-sell', 'Channel sales']
                },
                {
                    id: 'team_size',
                    question: 'Taille de l\'équipe commerciale ?',
                    type: 'select',
                    options: ['Solo', '2-5', '6-15', '16-50', '50+']
                },
                {
                    id: 'experience_level',
                    question: 'Votre expérience commerciale ?',
                    type: 'select',
                    options: ['Junior (0-2 ans)', 'Intermédiaire (3-5 ans)', 'Senior (6-10 ans)', 'Expert (10+ ans)']
                },
                {
                    id: 'industry',
                    question: 'Secteur d\'activité ?',
                    type: 'text',
                    placeholder: 'Ex: SaaS, Immobilier, Services B2B...'
                }
            ],
            manager_coach: [
                {
                    id: 'team_size',
                    question: 'Taille de votre équipe ?',
                    type: 'select',
                    options: ['1-3', '4-8', '9-15', '16-30', '30+']
                },
                {
                    id: 'management_level',
                    question: 'Niveau de management ?',
                    type: 'select',
                    options: ['Team lead', 'Manager', 'Senior manager', 'Director', 'VP+']
                },
                {
                    id: 'management_challenges',
                    question: 'Défis principaux ?',
                    type: 'multiselect',
                    options: ['Recrutement', 'Rétention', 'Performance', 'Communication', 'Développement', 'Conflits']
                },
                {
                    id: 'team_type',
                    question: 'Type d\'équipe ?',
                    type: 'select',
                    options: ['Remote', 'Hybride', 'Sur site', 'Mixte']
                },
                {
                    id: 'industry',
                    question: 'Secteur d\'activité ?',
                    type: 'text',
                    placeholder: 'Ex: Tech, Conseil, Finance, Retail...'
                }
            ]
        };

        return questionsByProfile[profileId] || questionsByProfile.lucide_assistant;
    }
}

// Singleton instance
const userProfileService = new UserProfileService();

module.exports = userProfileService;
