/**
 * Profile Theme Service
 * Gère les thèmes visuels subtils pour chaque profil agent
 * Phase WOW 1 - Jour 3
 */

const EventEmitter = require('events');

// Palette de couleurs SUBTILES et cohérentes avec le design Lucide
// Toutes basées sur des variations légères de bleu/violet/indigo
const PROFILE_THEMES = {
    // Assistant générique - Bleu/Indigo par défaut (base Lucide)
    lucide_assistant: {
        primary: '#6366f1',      // Indigo 500 (base Lucide)
        secondary: '#4f46e5',    // Indigo 600
        accent: '#818cf8',       // Indigo 400
        accentLight: '#a5b4fc',  // Indigo 300
        icon: '🤖',
        name: 'Assistant'
    },

    // CEO Advisor - Violet légèrement plus chaud (stratégique)
    ceo_advisor: {
        primary: '#8b5cf6',      // Violet 500 (légère variation)
        secondary: '#7c3aed',    // Violet 600
        accent: '#a78bfa',       // Violet 400
        accentLight: '#c4b5fd',  // Violet 300
        icon: '🎯',
        name: 'CEO Advisor'
    },

    // Sales Expert - Cyan/Bleu clair (dynamique mais subtil)
    sales_expert: {
        primary: '#3b82f6',      // Blue 500
        secondary: '#2563eb',    // Blue 600
        accent: '#60a5fa',       // Blue 400
        accentLight: '#93c5fd',  // Blue 300
        icon: '💼',
        name: 'Sales Expert'
    },

    // Manager Coach - Rose/Purple léger (leadership, empathie)
    manager_coach: {
        primary: '#a855f7',      // Purple 500
        secondary: '#9333ea',    // Purple 600
        accent: '#c084fc',       // Purple 400
        accentLight: '#d8b4fe',  // Purple 300
        icon: '👥',
        name: 'Manager Coach'
    },

    // HR Specialist - Teal/Cyan léger (humain, bienveillant)
    hr_specialist: {
        primary: '#14b8a6',      // Teal 500
        secondary: '#0d9488',    // Teal 600
        accent: '#2dd4bf',       // Teal 400
        accentLight: '#5eead4',  // Teal 300
        icon: '👩‍💼',
        name: 'HR Specialist'
    },

    // IT Expert - Indigo foncé (technique, précis)
    it_expert: {
        primary: '#4f46e5',      // Indigo 600 (légèrement plus foncé que base)
        secondary: '#4338ca',    // Indigo 700
        accent: '#6366f1',       // Indigo 500
        accentLight: '#818cf8',  // Indigo 400
        icon: '💻',
        name: 'IT Expert'
    },

    // Marketing Expert - Bleu sky léger (créatif, ouvert)
    marketing_expert: {
        primary: '#0ea5e9',      // Sky 500
        secondary: '#0284c7',    // Sky 600
        accent: '#38bdf8',       // Sky 400
        accentLight: '#7dd3fc',  // Sky 300
        icon: '📱',
        name: 'Marketing Expert'
    }
};

class ProfileThemeService extends EventEmitter {
    constructor() {
        super();
        this.currentProfile = 'lucide_assistant';
        this.currentTheme = PROFILE_THEMES.lucide_assistant;
    }

    /**
     * Récupère le thème d'un profil
     * @param {string} profileId
     * @returns {object} Theme object
     */
    getTheme(profileId) {
        const theme = PROFILE_THEMES[profileId];
        if (!theme) {
            console.warn(`[ProfileThemeService] Theme not found for profile: ${profileId}, using default`);
            return PROFILE_THEMES.lucide_assistant;
        }
        return theme;
    }

    /**
     * Récupère tous les thèmes disponibles
     * @returns {object} All themes
     */
    getAllThemes() {
        return PROFILE_THEMES;
    }

    /**
     * Applique un nouveau thème
     * @param {string} profileId
     */
    applyTheme(profileId) {
        const theme = this.getTheme(profileId);

        // Sauvegarde l'ancien thème pour la transition
        const oldTheme = this.currentTheme;

        // Met à jour le thème courant
        this.currentTheme = theme;
        this.currentProfile = profileId;

        // Émet l'événement de changement
        this.emit('theme-changed', {
            profile: profileId,
            theme: theme,
            oldTheme: oldTheme
        });

        console.log(`[ProfileThemeService] Theme applied for profile: ${profileId}`);

        return theme;
    }

    /**
     * Récupère le thème actuel
     * @returns {object} Current theme
     */
    getCurrentTheme() {
        return {
            profile: this.currentProfile,
            theme: this.currentTheme
        };
    }

    /**
     * Récupère le profil actuel
     * @returns {string} Current profile ID
     */
    getCurrentProfile() {
        return this.currentProfile;
    }

    /**
     * Génère les CSS variables pour un thème
     * @param {object} theme
     * @returns {object} CSS variables object
     */
    generateCSSVariables(theme) {
        return {
            '--profile-primary': theme.primary,
            '--profile-secondary': theme.secondary,
            '--profile-accent': theme.accent,
            '--profile-accent-light': theme.accentLight
        };
    }
}

// Singleton instance
let instance = null;

module.exports = {
    /**
     * Get or create singleton instance
     * @returns {ProfileThemeService}
     */
    getInstance() {
        if (!instance) {
            instance = new ProfileThemeService();
        }
        return instance;
    },

    /**
     * Initialize with a profile (optional)
     * @param {string} profileId
     */
    initialize(profileId = 'lucide_assistant') {
        const service = this.getInstance();
        if (profileId) {
            service.applyTheme(profileId);
        }
        return service;
    },

    // Export themes for external use
    PROFILE_THEMES
};
