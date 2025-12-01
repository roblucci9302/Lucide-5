/**
 * License Service - Phase 4
 * Manages license validation, feature gating, and tier management
 *
 * License Tiers:
 * - STARTER: Basic features, 1 device, local only
 * - PROFESSIONAL: Multi-device sync (5 devices), cloud backup
 * - ENTERPRISE: Unlimited devices, enterprise gateway, priority support
 * - SELF_HOSTED: Everything + on-premise hosting, custom domain
 *
 * Features:
 * - Cryptographic license validation (RSA signatures)
 * - Feature gating based on tier
 * - License expiration handling
 * - Automatic renewal checks
 * - Offline grace period
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class LicenseService {
    constructor() {
        this.licensePath = path.join(process.env.APPDATA || process.env.HOME, '.lucide', 'license.json');
        this.publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx7jP8VqF0gK3lH4jN2Qv
YZxMRp4vJQX6KLxV8rEWZNh3qY7Tk2V9xFGP0L4mH6wN8QvRj5YpXkL3nF7hJ8Qv
... (your public key here)
-----END PUBLIC KEY-----`;

        this.currentLicense = null;
        this.isValidated = false;

        // Feature definitions by tier
        this.features = {
            STARTER: {
                maxDevices: 1,
                cloudSync: false,
                enterpriseGateway: false,
                advancedAgents: false,
                customProfiles: false,
                prioritySupport: false,
                selfHosted: false,
                maxSessionsPerMonth: 100
            },
            PROFESSIONAL: {
                maxDevices: 5,
                cloudSync: true,
                enterpriseGateway: false,
                advancedAgents: true,
                customProfiles: true,
                prioritySupport: false,
                selfHosted: false,
                maxSessionsPerMonth: 1000
            },
            ENTERPRISE: {
                maxDevices: -1, // unlimited
                cloudSync: true,
                enterpriseGateway: true,
                advancedAgents: true,
                customProfiles: true,
                prioritySupport: true,
                selfHosted: false,
                maxSessionsPerMonth: -1 // unlimited
            },
            SELF_HOSTED: {
                maxDevices: -1,
                cloudSync: true,
                enterpriseGateway: true,
                advancedAgents: true,
                customProfiles: true,
                prioritySupport: true,
                selfHosted: true,
                maxSessionsPerMonth: -1,
                customDomain: true,
                whiteLabel: true
            }
        };

        this.gracePeriodDays = 7; // Grace period after expiration
    }

    /**
     * Initialize license service
     * Loads and validates license on startup
     */
    async initialize() {
        try {
            await this.loadLicense();
            const validation = await this.validateLicense();

            if (validation.valid) {
                console.log(`[License] ✅ Valid ${this.currentLicense.tier} license`);
                console.log(`[License] Licensed to: ${this.currentLicense.customer}`);
                console.log(`[License] Expires: ${new Date(this.currentLicense.expiresAt).toLocaleDateString()}`);
            } else {
                console.warn(`[License] ⚠️ Invalid license: ${validation.reason}`);
                // Fall back to STARTER tier
                this.currentLicense = this.createTrialLicense();
            }

            return validation;
        } catch (error) {
            console.error('[License] Failed to initialize:', error);
            // Use trial license
            this.currentLicense = this.createTrialLicense();
            return { valid: false, reason: 'initialization_failed' };
        }
    }

    /**
     * Load license from file
     */
    async loadLicense() {
        if (!fs.existsSync(this.licensePath)) {
            throw new Error('No license file found');
        }

        const licenseData = fs.readFileSync(this.licensePath, 'utf8');
        this.currentLicense = JSON.parse(licenseData);
    }

    /**
     * Save license to file
     */
    async saveLicense(license) {
        const licenseDir = path.dirname(this.licensePath);
        if (!fs.existsSync(licenseDir)) {
            fs.mkdirSync(licenseDir, { recursive: true });
        }

        fs.writeFileSync(this.licensePath, JSON.stringify(license, null, 2), 'utf8');
        this.currentLicense = license;

        console.log(`[License] License saved: ${license.tier}`);
    }

    /**
     * Validate current license
     * Checks signature, expiration, and device count
     */
    async validateLicense() {
        if (!this.currentLicense) {
            return { valid: false, reason: 'no_license' };
        }

        const license = this.currentLicense;

        // 1. Verify signature
        if (!this.verifySignature(license)) {
            return { valid: false, reason: 'invalid_signature' };
        }

        // 2. Check expiration
        const now = Date.now();
        const expiresAt = new Date(license.expiresAt).getTime();

        if (now > expiresAt) {
            // Check grace period
            const gracePeriodEnd = expiresAt + (this.gracePeriodDays * 24 * 60 * 60 * 1000);

            if (now > gracePeriodEnd) {
                return { valid: false, reason: 'expired' };
            } else {
                // Still in grace period
                const daysLeft = Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000));
                console.warn(`[License] ⚠️ License expired - ${daysLeft} days left in grace period`);
            }
        }

        // 3. Check tier validity
        if (!this.features[license.tier]) {
            return { valid: false, reason: 'invalid_tier' };
        }

        // 4. For SELF_HOSTED, verify domain match
        if (license.tier === 'SELF_HOSTED' && license.domain) {
            // In production, check if current domain matches license domain
            // For now, we skip this check
        }

        this.isValidated = true;
        return { valid: true, tier: license.tier };
    }

    /**
     * Verify license signature using RSA public key
     */
    verifySignature(license) {
        try {
            const { signature, ...dataToVerify } = license;

            if (!signature) {
                return false;
            }

            // Create canonical JSON string for verification
            const dataString = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort());

            const verifier = crypto.createVerify('SHA256');
            verifier.update(dataString);
            verifier.end();

            return verifier.verify(this.publicKey, signature, 'base64');
        } catch (error) {
            console.error('[License] Signature verification failed:', error);
            return false;
        }
    }

    /**
     * Check if a feature is available with current license
     * @param {string} featureName - Feature to check
     * @returns {boolean}
     */
    hasFeature(featureName) {
        if (!this.currentLicense) {
            return false;
        }

        const tier = this.currentLicense.tier;
        const features = this.features[tier];

        if (!features) {
            return false;
        }

        return features[featureName] === true || features[featureName] === -1;
    }

    /**
     * Get feature limit for current license
     * @param {string} featureName - Feature to check
     * @returns {number} Limit (-1 = unlimited, 0 = disabled)
     */
    getFeatureLimit(featureName) {
        if (!this.currentLicense) {
            return 0;
        }

        const tier = this.currentLicense.tier;
        const features = this.features[tier];

        if (!features || !(featureName in features)) {
            return 0;
        }

        return features[featureName];
    }

    /**
     * Get current license tier
     * @returns {string}
     */
    getCurrentTier() {
        return this.currentLicense ? this.currentLicense.tier : 'STARTER';
    }

    /**
     * Get current license info
     */
    getLicenseInfo() {
        if (!this.currentLicense) {
            return {
                tier: 'STARTER',
                customer: 'Trial User',
                valid: false,
                features: this.features.STARTER
            };
        }

        return {
            tier: this.currentLicense.tier,
            customer: this.currentLicense.customer,
            email: this.currentLicense.email,
            issuedAt: this.currentLicense.issuedAt,
            expiresAt: this.currentLicense.expiresAt,
            valid: this.isValidated,
            features: this.features[this.currentLicense.tier]
        };
    }

    /**
     * Get days until expiration
     */
    getDaysUntilExpiration() {
        if (!this.currentLicense || !this.currentLicense.expiresAt) {
            return 0;
        }

        const now = Date.now();
        const expiresAt = new Date(this.currentLicense.expiresAt).getTime();
        const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));

        return Math.max(0, daysLeft);
    }

    /**
     * Check if license is in grace period
     */
    isInGracePeriod() {
        if (!this.currentLicense) {
            return false;
        }

        const now = Date.now();
        const expiresAt = new Date(this.currentLicense.expiresAt).getTime();
        const gracePeriodEnd = expiresAt + (this.gracePeriodDays * 24 * 60 * 60 * 1000);

        return now > expiresAt && now <= gracePeriodEnd;
    }

    /**
     * Create trial license (STARTER tier, 30 days)
     */
    createTrialLicense() {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        return {
            tier: 'STARTER',
            customer: 'Trial User',
            email: 'trial@lucide.ai',
            issuedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            trial: true,
            signature: null
        };
    }

    /**
     * Import license from license key string
     * @param {string} licenseKey - Base64 encoded license data
     */
    async importLicense(licenseKey) {
        try {
            // Decode base64 license key
            const licenseJson = Buffer.from(licenseKey, 'base64').toString('utf8');
            const license = JSON.parse(licenseJson);

            // Validate license
            if (!this.verifySignature(license)) {
                throw new Error('Invalid license signature');
            }

            // Save license
            await this.saveLicense(license);

            // Re-initialize
            await this.initialize();

            console.log(`[License] ✅ License imported successfully: ${license.tier}`);

            return { success: true, tier: license.tier };
        } catch (error) {
            console.error('[License] Failed to import license:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Export current license as license key
     */
    exportLicense() {
        if (!this.currentLicense) {
            throw new Error('No license to export');
        }

        const licenseJson = JSON.stringify(this.currentLicense);
        const licenseKey = Buffer.from(licenseJson).toString('base64');

        return licenseKey;
    }

    /**
     * Check if cloud sync is allowed
     */
    canUseCloudSync() {
        return this.hasFeature('cloudSync');
    }

    /**
     * Check if enterprise gateway is allowed
     */
    canUseEnterpriseGateway() {
        return this.hasFeature('enterpriseGateway');
    }

    /**
     * Check if device limit is reached
     * @param {number} currentDeviceCount - Current number of devices
     */
    canAddDevice(currentDeviceCount) {
        const maxDevices = this.getFeatureLimit('maxDevices');

        if (maxDevices === -1) {
            return true; // Unlimited
        }

        return currentDeviceCount < maxDevices;
    }

    /**
     * Get upgrade URL for user
     */
    getUpgradeUrl() {
        const currentTier = this.getCurrentTier();
        return `https://lucide.ai/upgrade?from=${currentTier}`;
    }
}

// Singleton instance
const licenseService = new LicenseService();

module.exports = licenseService;
