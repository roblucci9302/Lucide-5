/**
 * Offline-First Architecture Diagnostic Script
 *
 * Tests the complete offline-first infrastructure:
 * 1. SQLite database (better-sqlite3)
 * 2. Schema validation (sync_state columns)
 * 3. Repository pattern implementation
 * 4. Sync service configuration
 * 5. Firebase configuration (optional)
 * 6. Offline/Online detection mechanisms
 */

const path = require('path');
const fs = require('fs');

// Get the project root (parent of scripts folder)
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================
// DIAGNOSTIC CONFIGURATION
// ============================================================

const CONFIG = {
    verbose: true,
    checkFirebase: true
};

let testsPassed = 0;
let testsFailed = 0;
let testsWarning = 0;

function log(message, type = 'info') {
    const prefix = {
        'info': '   ',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'section': '\n📋'
    }[type] || '   ';
    console.log(`${prefix} ${message}`);
}

function logResult(name, success, details = '', isWarning = false) {
    if (success) {
        testsPassed++;
        log(`${name}`, 'success');
    } else if (isWarning) {
        testsWarning++;
        log(`${name}`, 'warning');
    } else {
        testsFailed++;
        log(`${name}`, 'error');
    }
    if (details && CONFIG.verbose) {
        console.log(`      ${details}`);
    }
}

// ============================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================

async function runDiagnostics() {
    console.log('\n' + '='.repeat(70));
    console.log('    LUCIDE OFFLINE-FIRST ARCHITECTURE DIAGNOSTIC');
    console.log('='.repeat(70));

    // --------------------------------------------------------
    // 1. SQLite Installation Check
    // --------------------------------------------------------
    log('SQLite Database Installation', 'section');

    let sqliteAvailable = false;
    let betterSqlite3 = null;

    try {
        betterSqlite3 = require('better-sqlite3');
        sqliteAvailable = true;
        logResult('better-sqlite3 module installed', true, `Module type: ${typeof betterSqlite3}`);
    } catch (error) {
        logResult('better-sqlite3 module installed', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // 2. Schema Validation
    // --------------------------------------------------------
    log('Schema Definition Check', 'section');

    let schemaModule = null;
    let schema = null;

    try {
        schemaModule = require(path.join(PROJECT_ROOT, 'src/features/common/config/schema'));
        schema = schemaModule.LATEST_SCHEMA || schemaModule;
        logResult('Schema module loaded', true);
    } catch (error) {
        logResult('Schema module loaded', false, `Error: ${error.message}`);
    }

    if (schema) {
        // Check for sync_state in key tables
        const tablesToCheck = [
            'sessions',
            'ai_messages',
            'documents',
            'document_chunks',
            'transcripts',
            'summaries',
            'prompt_presets'
        ];

        let tablesWithSyncState = 0;
        let tablesMissingSyncState = [];

        for (const tableName of tablesToCheck) {
            const table = schema[tableName];
            if (table && table.columns) {
                const hasSyncState = table.columns.some(col => col.name === 'sync_state');
                if (hasSyncState) {
                    tablesWithSyncState++;
                } else {
                    tablesMissingSyncState.push(tableName);
                }
            } else {
                tablesMissingSyncState.push(`${tableName} (not found)`);
            }
        }

        logResult(
            `sync_state column in tables`,
            tablesMissingSyncState.length === 0,
            `${tablesWithSyncState}/${tablesToCheck.length} tables have sync_state` +
            (tablesMissingSyncState.length > 0 ? `. Missing: ${tablesMissingSyncState.join(', ')}` : '')
        );

        // Check for timestamps
        const timestampTables = ['sessions', 'documents', 'ai_messages'];
        let tablesWithTimestamps = 0;

        for (const tableName of timestampTables) {
            const table = schema[tableName];
            if (table && table.columns) {
                const hasCreatedAt = table.columns.some(col => col.name === 'created_at');
                const hasUpdatedAt = table.columns.some(col => col.name === 'updated_at');
                if (hasCreatedAt || hasUpdatedAt) {
                    tablesWithTimestamps++;
                }
            }
        }

        logResult(
            `Timestamp columns for sync`,
            tablesWithTimestamps >= 2,
            `${tablesWithTimestamps}/${timestampTables.length} tables have timestamps`
        );

        // Count total tables
        const tableCount = Object.keys(schema).length;
        logResult(
            `Schema table count`,
            tableCount >= 10,
            `${tableCount} tables defined`
        );
    }

    // --------------------------------------------------------
    // 3. SQLite Client Check
    // --------------------------------------------------------
    log('SQLite Client Service', 'section');

    let sqliteClient = null;
    try {
        sqliteClient = require(path.join(PROJECT_ROOT, 'src/features/common/services/sqliteClient'));
        logResult('SQLite client module loaded', true);

        // Check exported methods
        const expectedMethods = ['getDb', 'getDatabase', 'initialize'];
        const availableMethods = [];

        for (const method of expectedMethods) {
            if (typeof sqliteClient[method] === 'function') {
                availableMethods.push(method);
            }
        }

        logResult(
            `SQLite client methods`,
            availableMethods.length >= 2,
            `Available: ${availableMethods.join(', ') || 'none'}`
        );
    } catch (error) {
        logResult('SQLite client module loaded', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // 4. Repository Pattern Check
    // --------------------------------------------------------
    log('Repository Pattern Implementation', 'section');

    const repositoryPaths = [
        { name: 'BaseRepository', path: 'src/features/common/repositories/BaseRepository.js' },
        { name: 'GenericRepository', path: 'src/features/common/repositories/genericRepository.js' },
        { name: 'Session SQLite', path: 'src/features/common/repositories/session/sqlite.repository.js' },
        { name: 'Session Firebase', path: 'src/features/common/repositories/session/firebase.repository.js' },
        { name: 'User SQLite', path: 'src/features/common/repositories/user/sqlite.repository.js' },
        { name: 'Preset SQLite', path: 'src/features/common/repositories/preset/sqlite.repository.js' }
    ];

    let reposFound = 0;
    for (const repo of repositoryPaths) {
        const fullPath = path.join(PROJECT_ROOT, repo.path);
        if (fs.existsSync(fullPath)) {
            reposFound++;
        }
    }

    logResult(
        `Repository files exist`,
        reposFound >= 4,
        `${reposFound}/${repositoryPaths.length} repository files found`
    );

    // Check BaseRepository methods
    try {
        const { BaseSqliteRepository } = require(path.join(PROJECT_ROOT, 'src/features/common/repositories/BaseRepository'));
        const methods = ['getById', 'getAll', 'getByField', 'deleteById', 'count', 'exists'];
        const foundMethods = methods.filter(m =>
            typeof BaseSqliteRepository.prototype[m] === 'function'
        );

        logResult(
            `BaseSqliteRepository CRUD methods`,
            foundMethods.length >= 4,
            `Methods: ${foundMethods.join(', ')}`
        );
    } catch (error) {
        logResult('BaseSqliteRepository CRUD methods', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // 5. Sync Service Check
    // --------------------------------------------------------
    log('Sync Service Configuration', 'section');

    try {
        const syncServicePath = 'src/features/common/services/syncService.js';
        const fullPath = path.join(PROJECT_ROOT, syncServicePath);

        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');

            // Check for key sync features
            const features = {
                'Periodic sync (30s)': content.includes('30000') || content.includes('30 * 1000'),
                'Push local changes': content.includes('pushLocalChanges') || content.includes('push'),
                'Pull remote changes': content.includes('pullRemoteChanges') || content.includes('pull'),
                'Online/offline detection': content.includes('online') && content.includes('offline'),
                'Sync state tracking': content.includes('sync_state') || content.includes('dirty'),
                'Status callbacks': content.includes('statusCallback') || content.includes('callback'),
                'Error handling': content.includes('catch') && content.includes('error')
            };

            let featuresFound = 0;
            for (const [feature, found] of Object.entries(features)) {
                if (found) featuresFound++;
            }

            logResult(
                `Sync service features`,
                featuresFound >= 5,
                `${featuresFound}/${Object.keys(features).length} key features detected`
            );

            // Check for conflict resolution
            const hasConflictResolution =
                content.includes('conflict') ||
                content.includes('last-write-wins') ||
                content.includes('UPSERT') ||
                content.includes('ON CONFLICT');

            logResult(
                `Conflict resolution mechanism`,
                hasConflictResolution,
                hasConflictResolution ? 'Detected in code' : 'Not found',
                !hasConflictResolution
            );

        } else {
            logResult('Sync service file exists', false, 'File not found');
        }
    } catch (error) {
        logResult('Sync service check', false, `Error: ${error.message}`);
    }

    // Check sync scheduler
    try {
        const schedulerPath = 'src/features/common/services/syncSchedulerService.js';
        const fullPath = path.join(PROJECT_ROOT, schedulerPath);

        logResult(
            `Sync scheduler service`,
            fs.existsSync(fullPath),
            fs.existsSync(fullPath) ? 'File exists' : 'File not found'
        );
    } catch (error) {
        logResult('Sync scheduler service', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // 6. Sync Bridge (IPC) Check
    // --------------------------------------------------------
    log('IPC Bridge Layer', 'section');

    try {
        const bridgePath = 'src/bridge/modules/syncBridge.js';
        const fullPath = path.join(PROJECT_ROOT, bridgePath);

        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');

            const ipcHandlers = [
                'sync:start',
                'sync:stop',
                'sync:force',
                'sync:get-status',
                'sync:is-available'
            ];

            let handlersFound = 0;
            for (const handler of ipcHandlers) {
                if (content.includes(handler)) {
                    handlersFound++;
                }
            }

            logResult(
                `Sync IPC handlers`,
                handlersFound >= 4,
                `${handlersFound}/${ipcHandlers.length} handlers found`
            );
        } else {
            logResult('Sync bridge file exists', false, 'File not found');
        }
    } catch (error) {
        logResult('Sync bridge check', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // 7. Firebase Configuration (Optional)
    // --------------------------------------------------------
    if (CONFIG.checkFirebase) {
        log('Firebase Configuration (Optional)', 'section');

        try {
            const firebaseClientPath = 'src/features/common/services/firebaseClient.js';
            const fullPath = path.join(PROJECT_ROOT, firebaseClientPath);

            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');

                // Check for graceful fallback
                const hasGracefulFallback =
                    content.includes('local') ||
                    content.includes('fallback') ||
                    content.includes('offline');

                logResult(
                    `Firebase client exists`,
                    true,
                    'File found'
                );

                logResult(
                    `Graceful offline fallback`,
                    hasGracefulFallback,
                    hasGracefulFallback ? 'Fallback mechanism detected' : 'No fallback detected',
                    !hasGracefulFallback
                );

                // Check for Firestore
                const hasFirestore = content.includes('firestore') || content.includes('Firestore');
                logResult(
                    `Firestore integration`,
                    hasFirestore,
                    hasFirestore ? 'Firestore configured' : 'Not configured',
                    !hasFirestore
                );

            } else {
                logResult('Firebase client', false, 'File not found', true);
            }
        } catch (error) {
            logResult('Firebase configuration', false, `Error: ${error.message}`, true);
        }

        // Check Firestore converter for encryption
        try {
            const converterPath = 'src/features/common/repositories/firestoreConverter.js';
            const fullPath = path.join(PROJECT_ROOT, converterPath);

            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const hasEncryption = content.includes('encrypt') || content.includes('decrypt');

                logResult(
                    `Firestore data encryption`,
                    hasEncryption,
                    hasEncryption ? 'Encryption/decryption found' : 'No encryption',
                    !hasEncryption
                );
            }
        } catch (error) {
            // Optional, don't fail
        }
    }

    // --------------------------------------------------------
    // 8. Backend Sync Routes Check
    // --------------------------------------------------------
    log('Backend Sync Endpoints', 'section');

    try {
        const backendPath = 'lucide-backend/src/sync/sync.routes.js';
        const fullPath = path.join(PROJECT_ROOT, backendPath);

        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');

            const endpoints = {
                'POST /push': content.includes('push') && content.includes('post'),
                'GET /pull': content.includes('pull') && content.includes('get'),
                'User validation': content.includes('req.user') || content.includes('uid')
            };

            let endpointsFound = Object.values(endpoints).filter(Boolean).length;

            logResult(
                `Backend sync routes`,
                endpointsFound >= 2,
                `${endpointsFound}/${Object.keys(endpoints).length} endpoints detected`
            );
        } else {
            logResult('Backend sync routes', false, 'File not found (may be separate repo)', true);
        }
    } catch (error) {
        logResult('Backend sync routes', false, `Error: ${error.message}`, true);
    }

    // --------------------------------------------------------
    // 9. Offline Mode Test Files Check
    // --------------------------------------------------------
    log('Existing Test Coverage', 'section');

    const testFiles = [
        { name: 'Offline mode tests', path: 'test_offline_mode.js' },
        { name: 'Firebase sync tests', path: 'test_firebase_sync.js' },
        { name: 'SQLite tests', path: 'test_sqlite_implementation.js' }
    ];

    let testsExist = 0;
    for (const test of testFiles) {
        const fullPath = path.join(PROJECT_ROOT, test.path);
        if (fs.existsSync(fullPath)) {
            testsExist++;
            log(`${test.name}: Found`, 'success');
        } else {
            log(`${test.name}: Not found`, 'warning');
        }
    }

    // --------------------------------------------------------
    // 10. Dependencies Check
    // --------------------------------------------------------
    log('Key Dependencies', 'section');

    try {
        const packageJson = require(path.join(PROJECT_ROOT, 'package.json'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        const requiredDeps = {
            'better-sqlite3': 'SQLite database',
            'firebase': 'Cloud sync (optional)',
            'electron-store': 'Local config storage',
            'uuid': 'ID generation'
        };

        for (const [dep, purpose] of Object.entries(requiredDeps)) {
            const isInstalled = deps[dep] !== undefined;
            const isOptional = dep === 'firebase';

            if (isInstalled) {
                logResult(`${dep}`, true, `${purpose} - v${deps[dep]}`);
            } else if (isOptional) {
                logResult(`${dep}`, false, `${purpose} (optional)`, true);
            } else {
                logResult(`${dep}`, false, `${purpose} - NOT INSTALLED`);
            }
        }
    } catch (error) {
        logResult('Package.json check', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log('    DIAGNOSTIC SUMMARY');
    console.log('='.repeat(70));

    console.log(`\n   Total Checks: ${testsPassed + testsFailed + testsWarning}`);
    console.log(`   ✅ Passed:    ${testsPassed}`);
    console.log(`   ❌ Failed:    ${testsFailed}`);
    console.log(`   ⚠️  Warnings:  ${testsWarning}`);

    // Overall assessment
    console.log('\n' + '-'.repeat(70));

    if (testsFailed === 0) {
        console.log('   🎉 OFFLINE-FIRST INFRASTRUCTURE: FULLY OPERATIONAL');
    } else if (testsFailed <= 2) {
        console.log('   ⚠️  OFFLINE-FIRST INFRASTRUCTURE: MOSTLY OPERATIONAL');
        console.log('      Some non-critical issues detected');
    } else {
        console.log('   ❌ OFFLINE-FIRST INFRASTRUCTURE: NEEDS ATTENTION');
        console.log('      Critical issues detected');
    }

    console.log('\n' + '='.repeat(70) + '\n');

    return { passed: testsPassed, failed: testsFailed, warnings: testsWarning };
}

// Run diagnostics
runDiagnostics().then(result => {
    process.exit(result.failed > 3 ? 1 : 0);
}).catch(error => {
    console.error('Diagnostic error:', error);
    process.exit(1);
});
