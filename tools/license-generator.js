#!/usr/bin/env node

/**
 * Lucide License Generator
 * Admin tool to generate signed licenses
 *
 * Usage:
 *   node license-generator.js generate --tier PROFESSIONAL --customer "Acme Corp" --email admin@acme.com --duration 365
 *   node license-generator.js verify --license <base64-license-key>
 *   node license-generator.js keygen
 *
 * SECURITY NOTE: Keep private key secure! Never commit to git.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class LicenseGenerator {
    constructor() {
        this.privateKeyPath = path.join(__dirname, 'private.key');
        this.publicKeyPath = path.join(__dirname, 'public.key');

        // Try to load existing keys
        this.privateKey = null;
        this.publicKey = null;

        if (fs.existsSync(this.privateKeyPath)) {
            this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
        }
        if (fs.existsSync(this.publicKeyPath)) {
            this.publicKey = fs.readFileSync(this.publicKeyPath, 'utf8');
        }
    }

    /**
     * Generate RSA key pair
     */
    generateKeyPair() {
        console.log('🔑 Generating RSA key pair (2048 bits)...');

        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        // Save keys to files
        fs.writeFileSync(this.privateKeyPath, privateKey, { mode: 0o600 });
        fs.writeFileSync(this.publicKeyPath, publicKey);

        this.privateKey = privateKey;
        this.publicKey = publicKey;

        console.log('✅ Keys generated successfully!');
        console.log(`   Private key: ${this.privateKeyPath}`);
        console.log(`   Public key: ${this.publicKeyPath}`);
        console.log('');
        console.log('⚠️  IMPORTANT: Keep private.key secure! Never commit to git.');
        console.log('   Add "private.key" to .gitignore');
        console.log('');
        console.log('📋 Copy the public key to licenseService.js:');
        console.log('─'.repeat(60));
        console.log(publicKey);
        console.log('─'.repeat(60));
    }

    /**
     * Generate a license
     */
    generateLicense(options) {
        if (!this.privateKey) {
            console.error('❌ Private key not found. Run "keygen" first.');
            process.exit(1);
        }

        const {
            tier = 'PROFESSIONAL',
            customer,
            email,
            duration = 365, // days
            domain = null,
            maxDevices = null
        } = options;

        // Validate tier
        const validTiers = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'SELF_HOSTED'];
        if (!validTiers.includes(tier)) {
            console.error(`❌ Invalid tier. Must be one of: ${validTiers.join(', ')}`);
            process.exit(1);
        }

        // Validate required fields
        if (!customer || !email) {
            console.error('❌ Customer name and email are required');
            process.exit(1);
        }

        // Create license object
        const now = new Date();
        const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

        const license = {
            tier,
            customer,
            email,
            issuedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            licenseId: this.generateLicenseId(),
            trial: false
        };

        // Add optional fields
        if (domain) {
            license.domain = domain;
        }
        if (maxDevices) {
            license.maxDevices = maxDevices;
        }

        // Sign license
        license.signature = this.signLicense(license);

        // Generate license key (base64 encoded)
        const licenseJson = JSON.stringify(license, null, 2);
        const licenseKey = Buffer.from(licenseJson).toString('base64');

        // Display results
        console.log('');
        console.log('✅ License generated successfully!');
        console.log('═'.repeat(70));
        console.log('');
        console.log('📄 License Details:');
        console.log('─'.repeat(70));
        console.log(`   Tier:        ${license.tier}`);
        console.log(`   Customer:    ${license.customer}`);
        console.log(`   Email:       ${license.email}`);
        console.log(`   License ID:  ${license.licenseId}`);
        console.log(`   Issued:      ${now.toLocaleDateString()}`);
        console.log(`   Expires:     ${expiresAt.toLocaleDateString()} (${duration} days)`);
        if (domain) {
            console.log(`   Domain:      ${domain}`);
        }
        console.log('');
        console.log('🔑 License Key (Base64):');
        console.log('─'.repeat(70));
        console.log(licenseKey);
        console.log('─'.repeat(70));
        console.log('');
        console.log('📋 License JSON:');
        console.log('─'.repeat(70));
        console.log(licenseJson);
        console.log('─'.repeat(70));
        console.log('');
        console.log('💾 Save to file:');
        const filename = `license_${customer.replace(/\s+/g, '_')}_${license.licenseId}.json`;
        fs.writeFileSync(filename, licenseJson);
        console.log(`   ✅ Saved to: ${filename}`);
        console.log('');

        return license;
    }

    /**
     * Sign license with private key
     */
    signLicense(license) {
        const { signature, ...dataToSign } = license;

        // Create canonical JSON string
        const dataString = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());

        const signer = crypto.createSign('SHA256');
        signer.update(dataString);
        signer.end();

        return signer.sign(this.privateKey, 'base64');
    }

    /**
     * Verify a license
     */
    verifyLicense(licenseKey) {
        if (!this.publicKey) {
            console.error('❌ Public key not found.');
            process.exit(1);
        }

        try {
            // Decode license
            const licenseJson = Buffer.from(licenseKey, 'base64').toString('utf8');
            const license = JSON.parse(licenseJson);

            const { signature, ...dataToVerify } = license;

            // Verify signature
            const dataString = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort());

            const verifier = crypto.createVerify('SHA256');
            verifier.update(dataString);
            verifier.end();

            const isValid = verifier.verify(this.publicKey, signature, 'base64');

            // Display results
            console.log('');
            console.log('🔍 License Verification');
            console.log('═'.repeat(70));
            console.log('');
            console.log('📄 License Details:');
            console.log('─'.repeat(70));
            console.log(`   Tier:        ${license.tier}`);
            console.log(`   Customer:    ${license.customer}`);
            console.log(`   Email:       ${license.email}`);
            console.log(`   License ID:  ${license.licenseId}`);
            console.log(`   Issued:      ${new Date(license.issuedAt).toLocaleDateString()}`);
            console.log(`   Expires:     ${new Date(license.expiresAt).toLocaleDateString()}`);
            if (license.domain) {
                console.log(`   Domain:      ${license.domain}`);
            }
            console.log('');
            console.log('🔐 Signature Verification:');
            console.log('─'.repeat(70));
            if (isValid) {
                console.log('   ✅ VALID - Signature verified successfully');
            } else {
                console.log('   ❌ INVALID - Signature verification failed');
            }

            // Check expiration
            const now = Date.now();
            const expiresAt = new Date(license.expiresAt).getTime();
            const isExpired = now > expiresAt;

            console.log('');
            console.log('📅 Expiration Check:');
            console.log('─'.repeat(70));
            if (isExpired) {
                const daysAgo = Math.floor((now - expiresAt) / (24 * 60 * 60 * 1000));
                console.log(`   ⚠️  EXPIRED - ${daysAgo} days ago`);
            } else {
                const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
                console.log(`   ✅ VALID - ${daysLeft} days remaining`);
            }
            console.log('');

            return isValid && !isExpired;
        } catch (error) {
            console.error('❌ Failed to verify license:', error.message);
            return false;
        }
    }

    /**
     * Generate unique license ID
     */
    generateLicenseId() {
        return crypto.randomBytes(8).toString('hex').toUpperCase();
    }
}

// CLI Interface
function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const generator = new LicenseGenerator();

    if (!command || command === 'help') {
        console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                 Lucide License Generator v1.0                     ║
╚═══════════════════════════════════════════════════════════════════╝

Usage:
  node license-generator.js <command> [options]

Commands:
  keygen                       Generate RSA key pair
  generate                     Generate a new license
  verify                       Verify a license key
  help                         Show this help message

Generate Options:
  --tier <tier>               License tier: STARTER, PROFESSIONAL, ENTERPRISE, SELF_HOSTED
  --customer <name>           Customer name (required)
  --email <email>             Customer email (required)
  --duration <days>           License duration in days (default: 365)
  --domain <domain>           Domain for self-hosted (optional)
  --max-devices <number>      Max devices (optional, overrides tier default)

Examples:
  # Generate keys
  node license-generator.js keygen

  # Generate Professional license (1 year)
  node license-generator.js generate \\
    --tier PROFESSIONAL \\
    --customer "Acme Corporation" \\
    --email admin@acme.com \\
    --duration 365

  # Generate Self-Hosted license with custom domain
  node license-generator.js generate \\
    --tier SELF_HOSTED \\
    --customer "BigCorp Inc" \\
    --email it@bigcorp.com \\
    --domain "lucide.bigcorp.internal" \\
    --duration 3650

  # Verify license
  node license-generator.js verify --license <base64-license-key>

License Tiers:
  STARTER         Basic features, 1 device, local only
  PROFESSIONAL    Multi-device sync (5 devices), cloud backup
  ENTERPRISE      Unlimited devices, enterprise gateway, priority support
  SELF_HOSTED     Everything + on-premise hosting, custom domain
        `);
        return;
    }

    switch (command) {
        case 'keygen':
            generator.generateKeyPair();
            break;

        case 'generate': {
            const options = {};

            for (let i = 1; i < args.length; i += 2) {
                const key = args[i].replace(/^--/, '');
                const value = args[i + 1];

                if (key === 'duration' || key === 'max-devices') {
                    options[key.replace('-', '')] = parseInt(value, 10);
                } else {
                    options[key] = value;
                }
            }

            generator.generateLicense(options);
            break;
        }

        case 'verify': {
            const licenseIndex = args.indexOf('--license');
            if (licenseIndex === -1 || !args[licenseIndex + 1]) {
                console.error('❌ License key is required. Use --license <key>');
                process.exit(1);
            }

            const licenseKey = args[licenseIndex + 1];
            generator.verifyLicense(licenseKey);
            break;
        }

        default:
            console.error(`❌ Unknown command: ${command}`);
            console.error('Run "node license-generator.js help" for usage');
            process.exit(1);
    }
}

// Run CLI
if (require.main === module) {
    main();
}

module.exports = LicenseGenerator;
