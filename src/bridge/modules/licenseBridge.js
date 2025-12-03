/**
 * License Bridge - IPC handlers for license and feature gating
 *
 * Provides secure communication between renderer and main process
 * for license validation and feature availability checks.
 */

const { ipcMain } = require('electron');
const licenseService = require('../../features/common/services/licenseService');
const featureGates = require('../../features/common/services/featureGates');

module.exports = {
    initialize() {
        console.log('[LicenseBridge] Initializing IPC handlers...');

        // ═══════════════════════════════════════════════════════════════════════
        // LICENSE MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Get current license information
         */
        ipcMain.handle('license:get-info', async () => {
            try {
                await featureGates.initialize();
                const tier = licenseService.getCurrentTier();
                const features = licenseService.getFeatures();
                const isValid = licenseService.isLicenseValid();
                const expiresAt = licenseService.getExpirationDate();

                return {
                    success: true,
                    license: {
                        tier,
                        features,
                        isValid,
                        expiresAt
                    }
                };
            } catch (error) {
                console.error('[LicenseBridge] Error getting license info:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Activate a license key
         */
        ipcMain.handle('license:activate', async (event, licenseKey) => {
            try {
                if (!licenseKey || typeof licenseKey !== 'string') {
                    return { success: false, error: 'Invalid license key' };
                }

                const result = await licenseService.activateLicense(licenseKey);
                return { success: true, license: result };
            } catch (error) {
                console.error('[LicenseBridge] Error activating license:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Deactivate current license
         */
        ipcMain.handle('license:deactivate', async () => {
            try {
                await licenseService.deactivateLicense();
                return { success: true };
            } catch (error) {
                console.error('[LicenseBridge] Error deactivating license:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Refresh license from server
         */
        ipcMain.handle('license:refresh', async () => {
            try {
                const result = await licenseService.refreshLicense();
                return { success: true, license: result };
            } catch (error) {
                console.error('[LicenseBridge] Error refreshing license:', error);
                return { success: false, error: error.message };
            }
        });

        // ═══════════════════════════════════════════════════════════════════════
        // FEATURE GATES
        // ═══════════════════════════════════════════════════════════════════════

        /**
         * Check if a specific feature is available
         */
        ipcMain.handle('license:check-feature', async (event, featureName) => {
            try {
                await featureGates.initialize();
                const hasFeature = licenseService.hasFeature(featureName);
                return { success: true, hasFeature };
            } catch (error) {
                console.error('[LicenseBridge] Error checking feature:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Check cloud sync availability
         */
        ipcMain.handle('license:can-use-cloud-sync', async () => {
            try {
                const canUse = await featureGates.canUseCloudSync();
                return { success: true, canUse };
            } catch (error) {
                console.error('[LicenseBridge] Error checking cloud sync:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Check enterprise gateway availability
         */
        ipcMain.handle('license:can-use-enterprise-gateway', async () => {
            try {
                const canUse = await featureGates.canUseEnterpriseGateway();
                return { success: true, canUse };
            } catch (error) {
                console.error('[LicenseBridge] Error checking enterprise gateway:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Check advanced agents availability
         */
        ipcMain.handle('license:can-use-advanced-agents', async () => {
            try {
                const canUse = await featureGates.canUseAdvancedAgents();
                return { success: true, canUse };
            } catch (error) {
                console.error('[LicenseBridge] Error checking advanced agents:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Get all feature availability at once
         */
        ipcMain.handle('license:get-all-features', async () => {
            try {
                await featureGates.initialize();

                const [cloudSync, enterpriseGateway, advancedAgents, customProfiles] = await Promise.all([
                    featureGates.canUseCloudSync().catch(() => false),
                    featureGates.canUseEnterpriseGateway().catch(() => false),
                    featureGates.canUseAdvancedAgents().catch(() => false),
                    featureGates.canUseCustomProfiles().catch(() => false)
                ]);

                return {
                    success: true,
                    features: {
                        cloudSync,
                        enterpriseGateway,
                        advancedAgents,
                        customProfiles
                    }
                };
            } catch (error) {
                console.error('[LicenseBridge] Error getting all features:', error);
                return { success: false, error: error.message };
            }
        });

        /**
         * Register for upgrade notifications
         */
        ipcMain.handle('license:on-upgrade-needed', async (event) => {
            try {
                featureGates.onUpgradeNeeded((feature, requiredTier) => {
                    event.sender.send('license:upgrade-needed', { feature, requiredTier });
                });
                return { success: true };
            } catch (error) {
                console.error('[LicenseBridge] Error registering upgrade callback:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[LicenseBridge] Initialized');
    }
};
