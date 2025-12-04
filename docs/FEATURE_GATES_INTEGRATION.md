# Feature Gates Integration Guide

This guide shows how to integrate license-based feature gating into existing services.

## Overview

The Feature Gates system provides centralized license checking across the application. Services should check feature availability before enabling premium features.

## Integration Pattern

```javascript
const featureGates = require('./featureGates');

// Check feature availability
if (await featureGates.canUseCloudSync()) {
    // Enable cloud sync
} else {
    // Show upgrade prompt
    featureGates.showFeatureGateUI('cloudSync', 'PROFESSIONAL');
}
```

## Service Integration Examples

### 1. Sync Service Integration

**File:** `src/features/common/services/syncService.js`

Add license check before enabling sync:

```javascript
/**
 * Enable automatic syncing
 */
async enableSync(authToken) {
    // PHASE 4: Check if cloud sync is available
    const featureGates = require('./featureGates');

    if (!await featureGates.canUseCloudSync()) {
        console.warn('[Sync] Cloud sync not available in current tier');

        // Show upgrade UI
        featureGates.showFeatureGateUI('cloudSync', 'PROFESSIONAL');

        return {
            success: false,
            error: 'FEATURE_NOT_AVAILABLE',
            message: 'Cloud sync requires Professional tier or higher',
            upgradeUrl: featureGates.getUpgradeUrl()
        };
    }

    this.authToken = authToken;
    this.syncEnabled = true;

    // ... rest of sync logic
}
```

### 2. Enterprise Data Service Integration

**File:** `src/features/common/services/enterpriseDataService.js`

Add license check before connecting to gateway:

```javascript
/**
 * Connect to Enterprise Gateway
 */
async connect(gatewayToken) {
    // PHASE 4: Check if enterprise gateway is available
    const featureGates = require('./featureGates');

    if (!await featureGates.canUseEnterpriseGateway()) {
        console.warn('[EnterpriseData] Enterprise Gateway not available in current tier');

        // Show upgrade UI
        featureGates.showFeatureGateUI('enterpriseGateway', 'ENTERPRISE');

        return {
            success: false,
            error: 'FEATURE_NOT_AVAILABLE',
            message: 'Enterprise Gateway requires Enterprise tier',
            upgradeUrl: featureGates.getUpgradeUrl()
        };
    }

    this.authToken = gatewayToken;

    // ... rest of connection logic
}
```

### 3. Ask Service Integration (Session Limits)

**File:** `src/features/ask/askService.js`

Add session limit checking:

```javascript
/**
 * Handle user question
 */
async askQuestion(userId, sessionId, question) {
    // PHASE 4: Check session limit
    const featureGates = require('../common/services/featureGates');

    // Get current month's session count
    const sessionCount = await this.getMonthlySessionCount(userId);
    const limitCheck = await featureGates.checkSessionLimit(sessionCount);

    if (!limitCheck.allowed) {
        console.warn(`[AskService] Monthly session limit reached`);

        return {
            success: false,
            error: 'SESSION_LIMIT_REACHED',
            message: `You've reached your monthly limit of ${limitCheck.max} sessions`,
            upgradeUrl: featureGates.getUpgradeUrl()
        };
    }

    // Warn if approaching limit
    if (limitCheck.remaining > 0 && limitCheck.remaining <= 10) {
        console.warn(`[AskService] Approaching session limit: ${limitCheck.remaining} remaining`);
    }

    // ... rest of ask logic
}
```

### 4. Device Management Integration

**File:** `src/features/devices/deviceService.js` (if exists)

Add device limit checking:

```javascript
/**
 * Register new device
 */
async registerDevice(userId, deviceInfo) {
    const featureGates = require('../common/services/featureGates');

    // Get current device count
    const currentDevices = await this.getDeviceCount(userId);

    // Check device limit
    if (!await featureGates.canAddDevice(currentDevices)) {
        const maxDevices = featureGates.getLicenseInfo().features.maxDevices;

        console.warn(`[DeviceService] Device limit reached (${maxDevices})`);

        return {
            success: false,
            error: 'DEVICE_LIMIT_REACHED',
            message: `Maximum ${maxDevices} device(s) allowed on your plan`,
            currentDevices,
            maxDevices,
            upgradeUrl: featureGates.getUpgradeUrl()
        };
    }

    // ... register device
}
```

## UI Integration

### Electron Main Process

Initialize feature gates on app startup:

**File:** `src/main/main.js`

```javascript
const featureGates = require('../features/common/services/featureGates');

app.on('ready', async () => {
    // Initialize license system
    await featureGates.initialize();

    // Show license info
    const licenseInfo = featureGates.getLicenseInfo();
    console.log(`License Tier: ${licenseInfo.tier}`);

    // Check expiration warning
    const daysLeft = featureGates.getDaysUntilExpiration();
    if (daysLeft <= 30) {
        console.warn(`⚠️ License expires in ${daysLeft} days`);
        // Show notification to user
    }

    // Create windows...
});
```

### Renderer Process (UI)

Listen for upgrade notifications:

**File:** `src/renderer/app.js`

```javascript
const featureGates = require('../features/common/services/featureGates');

// Register callback for upgrade prompts
featureGates.onUpgradeNeeded((notification) => {
    // Show modal/dialog in UI
    showUpgradeDialog({
        feature: notification.feature,
        currentTier: notification.currentTier,
        requiredTier: notification.requiredTier,
        upgradeUrl: notification.upgradeUrl
    });
});
```

### Settings UI

Display license information:

```javascript
const featureGates = require('../features/common/services/featureGates');

function renderLicenseSettings() {
    const license = featureGates.getLicenseInfo();
    const daysLeft = featureGates.getDaysUntilExpiration();

    return `
        <div class="license-info">
            <h3>License Information</h3>
            <p><strong>Tier:</strong> ${license.tier}</p>
            <p><strong>Customer:</strong> ${license.customer}</p>
            <p><strong>Expires:</strong> ${new Date(license.expiresAt).toLocaleDateString()}</p>
            <p><strong>Days Remaining:</strong> ${daysLeft}</p>

            <button onclick="importLicense()">Import License</button>
            <button onclick="upgradeNow()">Upgrade</button>
        </div>

        <div class="features-list">
            <h4>Available Features:</h4>
            <ul>
                <li>Cloud Sync: ${license.features.cloudSync ? '✅' : '❌'}</li>
                <li>Enterprise Gateway: ${license.features.enterpriseGateway ? '✅' : '❌'}</li>
                <li>Max Devices: ${license.features.maxDevices === -1 ? 'Unlimited' : license.features.maxDevices}</li>
                <li>Sessions/Month: ${license.features.maxSessionsPerMonth === -1 ? 'Unlimited' : license.features.maxSessionsPerMonth}</li>
            </ul>
        </div>
    `;
}

async function importLicense() {
    const licenseKey = prompt('Enter your license key:');

    if (licenseKey) {
        const result = await featureGates.importLicense(licenseKey);

        if (result.success) {
            alert(`License activated successfully! Tier: ${result.tier}`);
            location.reload(); // Refresh UI
        } else {
            alert(`Failed to activate license: ${result.error}`);
        }
    }
}

function upgradeNow() {
    const upgradeUrl = featureGates.getUpgradeUrl();
    require('electron').shell.openExternal(upgradeUrl);
}
```

## Testing

### Test License Import

```javascript
const featureGates = require('./featureGates');

// Initialize
await featureGates.initialize();

// Import test license
const testLicenseKey = 'eyJ0aWVyIjoiUFJPRkVTU0lPTkFMIiwi...'; // from license-generator
const result = await featureGates.importLicense(testLicenseKey);

console.log('Import result:', result);
console.log('Current tier:', featureGates.getCurrentTier());
console.log('Can use cloud sync:', await featureGates.canUseCloudSync());
```

### Test Feature Gates

```javascript
// Test each feature
console.log('Cloud Sync:', await featureGates.canUseCloudSync());
console.log('Enterprise Gateway:', await featureGates.canUseEnterpriseGateway());
console.log('Advanced Agents:', await featureGates.canUseAdvancedAgents());

// Test limits
console.log('Can add device (0 devices):', await featureGates.canAddDevice(0));
console.log('Can add device (5 devices):', await featureGates.canAddDevice(5));

// Test session limits
console.log('Session limit (50 sessions):', await featureGates.checkSessionLimit(50));
console.log('Session limit (100 sessions):', await featureGates.checkSessionLimit(100));
```

## Error Handling

Always handle feature gate failures gracefully:

```javascript
try {
    if (await featureGates.canUseCloudSync()) {
        await syncService.enableSync(token);
    } else {
        // Graceful degradation - continue with local-only mode
        console.log('Running in local-only mode (no cloud sync)');
    }
} catch (error) {
    console.error('Feature gate check failed:', error);
    // Continue with degraded functionality
}
```

## Best Practices

1. **Check Early**: Check feature availability before starting long operations
2. **Graceful Degradation**: Don't crash if feature unavailable - degrade gracefully
3. **Clear Communication**: Show clear messages about why feature is blocked
4. **Easy Upgrade**: Always provide direct upgrade link
5. **Offline Handling**: Cache license validation to work offline (with grace period)
6. **Performance**: Feature gate checks are fast (<1ms) - don't over-optimize
7. **Consistency**: Use same feature gate checks across all code paths

## Migration Guide

### For Existing Services

1. Import featureGates at the top of the service
2. Add feature check before premium feature usage
3. Handle "not available" case gracefully
4. Show upgrade UI when blocked
5. Test with different license tiers

### For New Features

1. Decide which tier requires the feature
2. Add feature to `licenseService.js` features definition
3. Add convenience method to `featureGates.js`
4. Check feature availability before enabling
5. Document in tier comparison

## Troubleshooting

**Problem:** Feature gate always returns false
- **Solution:** Check license is loaded and validated. Run `await featureGates.initialize()`

**Problem:** License expires immediately
- **Solution:** Check system clock is correct. License uses local time.

**Problem:** Can't import license
- **Solution:** Verify license key is complete (no truncation). Check signature is valid.

**Problem:** Features work without license
- **Solution:** Check feature gates are initialized on app startup. Verify checks are in place.

## Support

For licensing issues:
- Email: support@lucide.ai
- Docs: https://docs.lucide.ai/licensing
- Admin Tool: `tools/license-generator.js`
