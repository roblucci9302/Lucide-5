/**
 * Feature Gates - Phase 4
 * Centralized feature gating based on license tier
 *
 * This service provides a unified interface for checking
 * feature availability across the application.
 *
 * Usage:
 *   const featureGates = require('./featureGates');
 *
 *   if (await featureGates.canUseCloudSync()) {
 *     // Enable cloud sync
 *   }
 */

const licenseService = require('./licenseService');

class FeatureGates {
    constructor() {
        this.initialized = false;
        this.upgradeCallbacks = [];
    }

    /**
     * Initialize feature gates
     * Must be called on app startup
     */
    async initialize() {
        await licenseService.initialize();
        this.initialized = true;

        console.log('[FeatureGates] Initialized');
        console.log(`[FeatureGates] Current tier: ${licenseService.getCurrentTier()}`);
    }

    /**
     * Check if cloud sync is available
     */
    async canUseCloudSync() {
        if (!this.initialized) {
            await this.initialize();
        }

        const canUse = licenseService.hasFeature('cloudSync');

        if (!canUse) {
            console.warn('[FeatureGates] ⚠️ Cloud sync requires Professional tier or higher');
            this.notifyUpgradeNeeded('cloudSync', 'PROFESSIONAL');
        }

        return canUse;
    }

    /**
     * Check if enterprise gateway is available
     */
    async canUseEnterpriseGateway() {
        if (!this.initialized) {
            await this.initialize();
        }

        const canUse = licenseService.hasFeature('enterpriseGateway');

        if (!canUse) {
            console.warn('[FeatureGates] ⚠️ Enterprise Gateway requires Enterprise tier');
            this.notifyUpgradeNeeded('enterpriseGateway', 'ENTERPRISE');
        }

        return canUse;
    }

    /**
     * Check if advanced agents are available
     */
    async canUseAdvancedAgents() {
        if (!this.initialized) {
            await this.initialize();
        }

        const canUse = licenseService.hasFeature('advancedAgents');

        if (!canUse) {
            console.warn('[FeatureGates] ⚠️ Advanced agents require Professional tier or higher');
            this.notifyUpgradeNeeded('advancedAgents', 'PROFESSIONAL');
        }

        return canUse;
    }

    /**
     * Check if custom profiles are available
     */
    async canUseCustomProfiles() {
        if (!this.initialized) {
            await this.initialize();
        }

        return licenseService.hasFeature('customProfiles');
    }

    /**
     * Check if can add more devices
     * @param {number} currentDeviceCount - Current number of registered devices
     */
    async canAddDevice(currentDeviceCount) {
        if (!this.initialized) {
            await this.initialize();
        }

        const canAdd = licenseService.canAddDevice(currentDeviceCount);

        if (!canAdd) {
            const maxDevices = licenseService.getFeatureLimit('maxDevices');
            console.warn(`[FeatureGates] ⚠️ Device limit reached (${maxDevices})`);
            this.notifyUpgradeNeeded('maxDevices', 'PROFESSIONAL');
        }

        return canAdd;
    }

    /**
     * Check session limit
     * @param {number} currentSessionCount - Sessions this month
     */
    async checkSessionLimit(currentSessionCount) {
        if (!this.initialized) {
            await this.initialize();
        }

        const maxSessions = licenseService.getFeatureLimit('maxSessionsPerMonth');

        if (maxSessions === -1) {
            return { allowed: true, remaining: -1 }; // Unlimited
        }

        const remaining = maxSessions - currentSessionCount;
        const allowed = remaining > 0;

        if (!allowed) {
            console.warn(`[FeatureGates] ⚠️ Monthly session limit reached (${maxSessions})`);
            this.notifyUpgradeNeeded('maxSessionsPerMonth', 'PROFESSIONAL');
        } else if (remaining <= 10) {
            console.warn(`[FeatureGates] ⚠️ Approaching session limit: ${remaining} remaining`);
        }

        return { allowed, remaining, max: maxSessions };
    }

    /**
     * Get current license info
     */
    getLicenseInfo() {
        return licenseService.getLicenseInfo();
    }

    /**
     * Get current tier
     */
    getCurrentTier() {
        return licenseService.getCurrentTier();
    }

    /**
     * Check if license is valid
     */
    async isLicenseValid() {
        const validation = await licenseService.validateLicense();
        return validation.valid;
    }

    /**
     * Get days until expiration
     */
    getDaysUntilExpiration() {
        return licenseService.getDaysUntilExpiration();
    }

    /**
     * Check if in grace period
     */
    isInGracePeriod() {
        return licenseService.isInGracePeriod();
    }

    /**
     * Import license
     */
    async importLicense(licenseKey) {
        const result = await licenseService.importLicense(licenseKey);

        if (result.success) {
            // Re-initialize
            await this.initialize();
        }

        return result;
    }

    /**
     * Get upgrade URL
     */
    getUpgradeUrl() {
        return licenseService.getUpgradeUrl();
    }

    /**
     * Register callback for upgrade notifications
     */
    onUpgradeNeeded(callback) {
        this.upgradeCallbacks.push(callback);
    }

    /**
     * Notify UI that upgrade is needed
     */
    notifyUpgradeNeeded(feature, requiredTier) {
        const notification = {
            feature,
            requiredTier,
            currentTier: this.getCurrentTier(),
            upgradeUrl: this.getUpgradeUrl()
        };

        // Call all registered callbacks
        for (const callback of this.upgradeCallbacks) {
            try {
                callback(notification);
            } catch (error) {
                console.error('[FeatureGates] Error in upgrade callback:', error);
            }
        }
    }

    /**
     * Show feature gate UI
     * Displays a modal/dialog when feature is not available
     */
    showFeatureGateUI(featureName, requiredTier) {
        const currentTier = this.getCurrentTier();
        const upgradeUrl = this.getUpgradeUrl();

        const featureNames = {
            cloudSync: 'Cloud Synchronization',
            enterpriseGateway: 'Enterprise Database Gateway',
            advancedAgents: 'Advanced AI Agents',
            customProfiles: 'Custom Agent Profiles',
            maxDevices: 'Multiple Devices',
            maxSessionsPerMonth: 'Unlimited Sessions'
        };

        const tierNames = {
            STARTER: 'Starter (Free)',
            PROFESSIONAL: 'Professional',
            ENTERPRISE: 'Enterprise',
            SELF_HOSTED: 'Self-Hosted'
        };

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    UPGRADE REQUIRED                           ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`  Feature: ${featureNames[featureName] || featureName}`);
        console.log(`  Current Tier: ${tierNames[currentTier] || currentTier}`);
        console.log(`  Required Tier: ${tierNames[requiredTier] || requiredTier}`);
        console.log('');
        console.log(`  Upgrade at: ${upgradeUrl}`);
        console.log('');
        console.log('═'.repeat(65));
        console.log('');

        return {
            feature: featureNames[featureName] || featureName,
            currentTier,
            requiredTier,
            upgradeUrl
        };
    }

    /**
     * Get all available features for current tier
     */
    getAvailableFeatures() {
        const license = licenseService.getLicenseInfo();
        return license.features;
    }

    /**
     * Get feature comparison between tiers
     */
    getTierComparison() {
        return {
            STARTER: {
                name: 'Starter',
                price: 'Free',
                features: [
                    'Basic AI assistants',
                    '1 device',
                    'Local storage only',
                    '100 sessions/month',
                    'Community support'
                ]
            },
            PROFESSIONAL: {
                name: 'Professional',
                price: '$29/month',
                features: [
                    'All Starter features',
                    'Advanced AI agents',
                    '5 devices with sync',
                    'Cloud backup',
                    'Custom agent profiles',
                    '1,000 sessions/month',
                    'Email support'
                ]
            },
            ENTERPRISE: {
                name: 'Enterprise',
                price: '$299/month',
                features: [
                    'All Professional features',
                    'Unlimited devices',
                    'Enterprise database gateway',
                    'Unlimited sessions',
                    'Priority support',
                    'SLA guarantee',
                    'Team management'
                ]
            },
            SELF_HOSTED: {
                name: 'Self-Hosted',
                price: 'Custom',
                features: [
                    'All Enterprise features',
                    'On-premise deployment',
                    'Custom domain',
                    'White label option',
                    'Full data control',
                    'Dedicated support',
                    'Custom integrations'
                ]
            }
        };
    }
}

// Singleton instance
const featureGates = new FeatureGates();

module.exports = featureGates;
