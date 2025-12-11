# Lucide Licensing Guide 📜

Complete guide to Lucide licensing, tiers, and feature gates.

---

## Table of Contents

1. [Overview](#overview)
2. [License Tiers](#license-tiers)
3. [Feature Comparison](#feature-comparison)
4. [How Licensing Works](#how-licensing-works)
5. [License Management](#license-management)
6. [For Administrators](#for-administrators)
7. [For Developers](#for-developers)
8. [FAQ](#faq)

---

## Overview

Lucide uses a tiered licensing system with cryptographic validation. Each tier unlocks specific features, from basic local AI assistants to full enterprise deployment.

**Key Points:**
- ✅ **Starter tier is free** - no credit card required
- 🔐 **Cryptographically signed** - tamper-proof licenses
- 📱 **Device-based** - license per user, not per device
- 🔄 **Automatic validation** - validates on startup and periodically
- 🌐 **Works offline** - 7-day grace period without internet

---

## License Tiers

### 🆓 STARTER (Free Forever)

Perfect for individuals and personal use.

**Price**: Free
**Best For**: Personal projects, learning, individual use

**Includes:**
- ✅ Basic AI assistants (HR, IT, Marketing)
- ✅ 1 device
- ✅ Local storage only
- ✅ 100 conversations/month
- ✅ Community support

**Limitations:**
- ❌ No cloud synchronization
- ❌ No multi-device support
- ❌ No enterprise gateway
- ❌ Basic agents only

---

### 💼 PROFESSIONAL ($29/month)

For professionals who need advanced features and sync.

**Price**: $29/month or $290/year (2 months free)
**Best For**: Professionals, consultants, small teams

**Everything in Starter, plus:**
- ✅ **Advanced AI agents** - More sophisticated responses
- ✅ **5 devices with sync** - Work from anywhere
- ✅ **Cloud backup** - Never lose your data
- ✅ **Custom agent profiles** - Create specialized assistants
- ✅ **1,000 conversations/month** - 10x more capacity
- ✅ **Email support** - Get help when you need it

**New Features:**
- Multi-device synchronization
- Cloud storage and backup
- Advanced agent routing
- Custom profiles
- Priority response times

---

### 🏢 ENTERPRISE ($299/month)

For organizations that need database access and unlimited scale.

**Price**: $299/month or $2,990/year
**Best For**: Companies, departments, teams

**Everything in Professional, plus:**
- ✅ **Unlimited devices** - Scale to your whole team
- ✅ **Enterprise database gateway** - Connect to company databases
- ✅ **Unlimited conversations** - No monthly limits
- ✅ **Priority support** - < 4 hour response time
- ✅ **SLA guarantee** - 99.9% uptime commitment
- ✅ **Team management** - Manage users and permissions
- ✅ **Advanced security** - Audit logs, compliance reports

**Enterprise Features:**
- PostgreSQL/MySQL database connections
- Natural language to SQL queries
- Query validation and audit logging
- Role-based access control
- Compliance reporting

---

### 🏛️ SELF-HOSTED (Custom Pricing)

For organizations that need complete control and on-premise deployment.

**Price**: Custom (contact sales)
**Best For**: Large enterprises, regulated industries, government

**Everything in Enterprise, plus:**
- ✅ **On-premise deployment** - Full control over infrastructure
- ✅ **Custom domain** - lucide.your-company.com
- ✅ **White label option** - Remove Lucide branding
- ✅ **Full data control** - Data never leaves your network
- ✅ **Air-gapped support** - Works without internet
- ✅ **Dedicated support** - Phone, video, on-site options
- ✅ **Custom integrations** - Integrate with your tools
- ✅ **Source code access** - (Premium option)

**Self-Hosted Benefits:**
- Complete infrastructure control
- Meet compliance requirements (HIPAA, SOC2, etc.)
- Custom SLA agreements
- Dedicated account manager
- Priority feature requests

---

## Feature Comparison

| Feature | Starter | Professional | Enterprise | Self-Hosted |
|---------|---------|--------------|------------|-------------|
| **Pricing** |
| Monthly Cost | Free | $29 | $299 | Custom |
| Annual Cost | Free | $290 | $2,990 | Custom |
| **Devices & Access** |
| Max Devices | 1 | 5 | Unlimited | Unlimited |
| Cloud Sync | ❌ | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ |
| **AI Features** |
| Basic Agents | ✅ | ✅ | ✅ | ✅ |
| Advanced Agents | ❌ | ✅ | ✅ | ✅ |
| Custom Profiles | ❌ | ✅ | ✅ | ✅ |
| Agent Router | ✅ | ✅ | ✅ | ✅ |
| **Conversations** |
| Monthly Limit | 100 | 1,000 | Unlimited | Unlimited |
| History | 30 days | 1 year | Forever | Forever |
| **Enterprise Features** |
| Database Gateway | ❌ | ❌ | ✅ | ✅ |
| SQL Queries | ❌ | ❌ | ✅ | ✅ |
| Audit Logging | ❌ | ❌ | ✅ | ✅ |
| Team Management | ❌ | ❌ | ✅ | ✅ |
| **Deployment** |
| Cloud Hosted | ✅ | ✅ | ✅ | ✅ |
| Self-Hosted | ❌ | ❌ | ❌ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ |
| **Support** |
| Community Forum | ✅ | ✅ | ✅ | ✅ |
| Email Support | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |
| Phone Support | ❌ | ❌ | ❌ | ✅ |
| Response Time | - | 24h | 4h | 1h |
| **Security & Compliance** |
| End-to-End Encryption | ✅ | ✅ | ✅ | ✅ |
| SOC 2 Compliance | ❌ | ❌ | ✅ | ✅ |
| HIPAA Compliance | ❌ | ❌ | ❌ | ✅ |
| Custom Security | ❌ | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ❌ | ✅ | ✅ |

---

## How Licensing Works

### Validation Process

1. **Installation**: App generates unique device ID
2. **License Import**: User imports license key (Base64)
3. **Signature Verification**: Cryptographic validation using RSA public key
4. **Feature Unlock**: Features enabled based on tier
5. **Periodic Check**: License revalidated every 24 hours

### Cryptographic Security

Licenses are signed with RSA-2048 private key:
- **Tamper-proof**: Any modification invalidates signature
- **Offline validation**: Works without internet (public key embedded)
- **Secure generation**: Only Lucide can generate valid licenses

### Grace Period

If license expires or validation fails:
- **7-day grace period** - All features continue working
- **Warning notifications** - Daily reminders to renew
- **After grace period** - Downgrade to STARTER tier features

### Offline Mode

License works offline indefinitely if:
- Last validation succeeded
- Not past expiration date + grace period
- License file not corrupted

---

## License Management

### For End Users

#### Viewing License Info

1. Open Lucide
2. Go to **Settings** → **License**
3. View:
   - Current tier
   - Expiration date
   - Days remaining
   - Available features

#### Importing License

**Method 1: Via UI**
1. Settings → License → Import License
2. Paste license key (Base64 string)
3. Click "Activate"
4. Restart app

**Method 2: Via File**
```bash
# Save license key to file
echo "YOUR_LICENSE_KEY" | base64 -d > ~/.lucide/license.json
```

#### Upgrading

1. Purchase higher tier
2. Receive new license key via email
3. Import new license (replaces old one)
4. Features unlock immediately (no restart needed)

#### Renewing

Before expiration:
1. Renew subscription
2. Receive new license key
3. Import new license
4. No data loss or downtime

---

## For Administrators

### License Generation

**Requirements:**
- Admin access to license-generator tool
- RSA private key (keep secure!)
- Customer information

**Generate License:**

```bash
cd tools

# Generate Professional license (1 year)
node license-generator.js generate \
  --tier PROFESSIONAL \
  --customer "John Doe" \
  --email john@example.com \
  --duration 365

# Generate Enterprise license (3 years)
node license-generator.js generate \
  --tier ENTERPRISE \
  --customer "Acme Corporation" \
  --email admin@acme.com \
  --duration 1095

# Generate Self-Hosted license with domain
node license-generator.js generate \
  --tier SELF_HOSTED \
  --customer "BigCorp Inc" \
  --email it@bigcorp.com \
  --domain "lucide.bigcorp.internal" \
  --duration 3650
```

**Output:**
- License JSON file
- Base64 license key
- Send license key to customer via secure channel

### Verify License

```bash
node license-generator.js verify --license <base64-key>
```

Checks:
- Signature validity
- Expiration status
- Tier information
- Customer details

### Key Management

**First Time Setup:**

```bash
# Generate RSA key pair
node license-generator.js keygen

# Outputs:
# - private.key (keep secure!)
# - public.key (embed in app)
```

**Security:**
- ⚠️ **Never commit private.key to git**
- Store in secure location (vault, HSM)
- Rotate keys annually
- Update public key in app when rotating

---

## For Developers

### Integration

See [FEATURE_GATES_INTEGRATION.md](./FEATURE_GATES_INTEGRATION.md) for complete guide.

**Quick Example:**

```javascript
const featureGates = require('./featureGates');

// Check feature availability
if (await featureGates.canUseCloudSync()) {
    // Enable cloud sync
    await syncService.enableSync();
} else {
    // Show upgrade prompt
    featureGates.showFeatureGateUI('cloudSync', 'PROFESSIONAL');
}
```

### Adding New Features

1. **Define feature** in `licenseService.js`:
```javascript
this.features = {
    PROFESSIONAL: {
        // ... existing features
        newFeature: true
    }
};
```

2. **Add gate check** in `featureGates.js`:
```javascript
async canUseNewFeature() {
    return licenseService.hasFeature('newFeature');
}
```

3. **Check before using**:
```javascript
if (await featureGates.canUseNewFeature()) {
    // Use feature
}
```

### Testing

```javascript
// Test with different tiers
await featureGates.importLicense(starterLicense);
console.log(await featureGates.canUseCloudSync()); // false

await featureGates.importLicense(proLicense);
console.log(await featureGates.canUseCloudSync()); // true
```

---

## FAQ

### General

**Q: Is STARTER tier really free forever?**
A: Yes! No credit card required, no trials, no expiration.

**Q: Can I change tiers anytime?**
A: Yes, upgrade or downgrade anytime. Prorated refunds available.

**Q: What happens when my license expires?**
A: 7-day grace period, then downgrade to STARTER features. Data is preserved.

**Q: Do I need internet for licensing?**
A: Only for initial validation. Works offline after that (with grace period).

### Technical

**Q: How secure are licenses?**
A: RSA-2048 cryptographic signatures. Impossible to forge or modify.

**Q: Can licenses be transferred?**
A: Yes, contact support to transfer between users/companies.

**Q: What if I lose my license key?**
A: Contact support with purchase email. We can resend or regenerate.

**Q: Can I use one license on multiple devices?**
A: Depends on tier. Professional: 5 devices, Enterprise/Self-Hosted: unlimited.

### Enterprise

**Q: Can we deploy air-gapped?**
A: Yes, with SELF_HOSTED tier. No internet required after installation.

**Q: Do you offer trial licenses?**
A: Yes! 30-day trial for Enterprise and Self-Hosted. Contact sales.

**Q: Can we get source code access?**
A: Available with SELF_HOSTED tier (additional fee).

**Q: What about compliance (HIPAA, SOC2)?**
A: Self-Hosted tier supports full compliance. We provide documentation and support.

---

## Pricing

### Standard Pricing

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Starter | Free | Free | - |
| Professional | $29 | $290 | 17% ($58) |
| Enterprise | $299 | $2,990 | 17% ($598) |
| Self-Hosted | Custom | Custom | Negotiable |

### Volume Discounts

**Enterprise Tier:**
- 10-49 users: 10% off
- 50-99 users: 20% off
- 100-499 users: 30% off
- 500+ users: Contact sales

**Self-Hosted:**
- Custom pricing based on:
  - Number of users
  - Support level required
  - Deployment complexity
  - Contract length

### Education & Non-Profit

- **50% discount** on Professional tier
- **30% discount** on Enterprise tier
- Verification required
- Contact: education@lucide.ai

---

## Getting Started

### Start for Free

1. Download Lucide
2. Install and launch
3. Start using immediately (STARTER tier)
4. No registration required

### Upgrade

1. **Professional**:
   - Visit: https://lucide.ai/upgrade
   - Click "Go Professional"
   - Enter payment info
   - Receive license key immediately

2. **Enterprise**:
   - Visit: https://lucide.ai/enterprise
   - Fill contact form
   - Sales will contact within 24h
   - Custom demo and onboarding

3. **Self-Hosted**:
   - Contact: enterprise@lucide.ai
   - Schedule consultation
   - Custom proposal
   - White-glove deployment

---

## Support

### Community (All Tiers)
- Forum: https://community.lucide.ai
- Discord: https://discord.gg/lucide
- GitHub Issues: https://github.com/lucide/lucide

### Paid Support
- **Professional**: support@lucide.ai (24h response)
- **Enterprise**: priority@lucide.ai (4h response)
- **Self-Hosted**: enterprise@lucide.ai (1h response, phone available)

---

**Questions?** Contact us at sales@lucide.ai

**Last Updated**: 2024-11-11
