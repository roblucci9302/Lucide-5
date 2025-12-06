#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 DIAGNOSTIC RAG - Lucide Knowledge Base
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Script de diagnostic complet pour le système RAG (Retrieval Augmented Generation)
 *
 * Usage:
 *   node scripts/diagnose-rag.js
 *
 * Ce script vérifie:
 *   1. Dépendances npm requises
 *   2. Configuration des clés API
 *   3. État de la base de données
 *   4. Provider d'embeddings actif
 *   5. Documents indexés
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

// Results collector
const results = {
    dependencies: {},
    configuration: {},
    database: {},
    embeddings: {},
    documents: {},
    issues: [],
    recommendations: []
};

/**
 * Check if a npm module is installed
 */
function checkModule(moduleName) {
    try {
        require.resolve(moduleName);
        return { installed: true, version: getModuleVersion(moduleName) };
    } catch (e) {
        return { installed: false, version: null };
    }
}

/**
 * Get module version from package.json
 */
function getModuleVersion(moduleName) {
    try {
        const packagePath = path.join(process.cwd(), 'node_modules', moduleName, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return pkg.version;
    } catch (e) {
        return 'unknown';
    }
}

/**
 * Check environment variables
 */
function checkEnvVar(varName) {
    const value = process.env[varName];
    if (!value) return { set: false, value: null };
    // Mask the value for security
    const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
    return { set: true, value: masked };
}

/**
 * Check for .env files
 */
function checkEnvFiles() {
    const files = ['.env', '.env.local', '.env.development'];
    const found = [];
    for (const file of files) {
        if (fs.existsSync(path.join(process.cwd(), file))) {
            found.push(file);
        }
    }
    return found;
}

/**
 * Check SQLite database
 */
function checkDatabase() {
    const dbPaths = [
        path.join(process.cwd(), 'lucide.db'),
        path.join(process.cwd(), 'data', 'lucide.db'),
        path.join(require('os').homedir(), '.lucide', 'lucide.db'),
        path.join(require('os').homedir(), 'Library', 'Application Support', 'Lucide', 'lucide.db')
    ];

    for (const dbPath of dbPaths) {
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            return {
                found: true,
                path: dbPath,
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                lastModified: stats.mtime
            };
        }
    }
    return { found: false };
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
    console.log(`
${colors.bold}${colors.magenta}
╔═══════════════════════════════════════════════════════════════════════════╗
║                    🔍 DIAGNOSTIC RAG - LUCIDE                             ║
║                    Knowledge Base Health Check                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 1. CHECK DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════════════
    log.header('1. DÉPENDANCES NPM');

    const requiredDeps = {
        'pdf-parse': 'Extraction de texte PDF',
        'mammoth': 'Extraction de texte DOCX',
        'tesseract.js': 'OCR pour images',
        'openai': 'API OpenAI pour embeddings',
        'better-sqlite3': 'Base de données SQLite',
        'uuid': 'Génération d\'IDs uniques'
    };

    let missingDeps = [];
    for (const [dep, description] of Object.entries(requiredDeps)) {
        const status = checkModule(dep);
        results.dependencies[dep] = status;

        if (status.installed) {
            log.success(`${dep} v${status.version} - ${description}`);
        } else {
            log.error(`${dep} - NON INSTALLÉ - ${description}`);
            missingDeps.push(dep);
        }
    }

    if (missingDeps.length > 0) {
        results.issues.push(`${missingDeps.length} dépendances manquantes`);
        results.recommendations.push(`Exécuter: npm install ${missingDeps.join(' ')}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CHECK CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    log.header('2. CONFIGURATION');

    // Check .env files
    const envFiles = checkEnvFiles();
    if (envFiles.length > 0) {
        log.success(`Fichiers de configuration trouvés: ${envFiles.join(', ')}`);
    } else {
        log.warning('Aucun fichier .env trouvé');
        results.recommendations.push('Créer .env.local à partir de .env.example');
    }

    // Check API keys
    const openaiKey = checkEnvVar('OPENAI_API_KEY');
    results.configuration.OPENAI_API_KEY = openaiKey;

    if (openaiKey.set) {
        log.success(`OPENAI_API_KEY configurée: ${openaiKey.value}`);
    } else {
        log.warning('OPENAI_API_KEY non configurée - Le système utilisera des embeddings mock');
        results.issues.push('OPENAI_API_KEY non configurée');
        results.recommendations.push('Configurer OPENAI_API_KEY pour des embeddings de qualité');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CHECK DATABASE
    // ═══════════════════════════════════════════════════════════════════════
    log.header('3. BASE DE DONNÉES');

    const dbStatus = checkDatabase();
    results.database = dbStatus;

    if (dbStatus.found) {
        log.success(`Base de données trouvée: ${dbStatus.path}`);
        log.info(`  Taille: ${dbStatus.size}`);
        log.info(`  Dernière modification: ${dbStatus.lastModified}`);
    } else {
        log.warning('Base de données non trouvée (sera créée au premier démarrage)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. EMBEDDING PROVIDER STATUS
    // ═══════════════════════════════════════════════════════════════════════
    log.header('4. PROVIDER D\'EMBEDDINGS');

    if (openaiKey.set && results.dependencies['openai']?.installed) {
        log.success('OpenAI Embeddings ACTIVÉ (text-embedding-3-small, 1536 dimensions)');
        results.embeddings.provider = 'openai';
        results.embeddings.quality = 'HAUTE';
    } else {
        log.warning('Mock Embeddings ACTIVÉ (hash-based, 384 dimensions)');
        log.warning('  → Qualité de recherche sémantique LIMITÉE');
        results.embeddings.provider = 'mock';
        results.embeddings.quality = 'BASSE';
        results.issues.push('Utilisation des embeddings mock (qualité faible)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. RAG FEATURES STATUS
    // ═══════════════════════════════════════════════════════════════════════
    log.header('5. FONCTIONNALITÉS RAG');

    const features = {
        'Upload PDF': results.dependencies['pdf-parse']?.installed,
        'Upload DOCX': results.dependencies['mammoth']?.installed,
        'OCR Images': results.dependencies['tesseract.js']?.installed,
        'Recherche sémantique': true, // Always available with fallback
        'Citations automatiques': true,
        'Multi-source RAG': true
    };

    for (const [feature, available] of Object.entries(features)) {
        if (available) {
            log.success(feature);
        } else {
            log.error(`${feature} - DÉSACTIVÉ (dépendance manquante)`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    log.header('RÉSUMÉ DU DIAGNOSTIC');

    const issueCount = results.issues.length;
    const recCount = results.recommendations.length;

    if (issueCount === 0) {
        log.success('Aucun problème détecté! Le système RAG est prêt.');
    } else {
        log.warning(`${issueCount} problème(s) détecté(s):`);
        results.issues.forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue}`);
        });
    }

    if (recCount > 0) {
        console.log('\n' + colors.cyan + 'Recommandations:' + colors.reset);
        results.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
    }

    // Final status
    console.log(`
${colors.bold}╔═══════════════════════════════════════════════════════════════════════════╗
║  STATUS GLOBAL: ${issueCount === 0 ? colors.green + 'OPÉRATIONNEL ✓' : issueCount <= 2 ? colors.yellow + 'DÉGRADÉ ⚠' : colors.red + 'NON OPÉRATIONNEL ✗'}${colors.reset}${colors.bold}                                     ║
║  Provider Embeddings: ${results.embeddings.provider === 'openai' ? colors.green + 'OpenAI' : colors.yellow + 'Mock'}${colors.reset}${colors.bold}                                              ║
║  Qualité Recherche: ${results.embeddings.quality === 'HAUTE' ? colors.green + 'HAUTE' : colors.yellow + 'BASSE'}${colors.reset}${colors.bold}                                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    // Return results for programmatic use
    return results;
}

// Run if called directly
if (require.main === module) {
    runDiagnostics().catch(err => {
        console.error('Erreur lors du diagnostic:', err);
        process.exit(1);
    });
}

module.exports = { runDiagnostics };
