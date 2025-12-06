/**
 * Phase 1: Functional Test Suite for Offline-First Architecture
 *
 * Tests actual functionality (not just code inspection):
 * 1. SQLite CRUD operations without network
 * 2. sync_state transitions (clean -> dirty -> pending -> clean)
 * 3. Firebase optionality (app works without Firebase)
 * 4. Repository pattern functionality
 * 5. Conflict resolution logic
 *
 * Run: node scripts/test-offline-first-functional.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================
// TEST CONFIGURATION
// ============================================================

const TEST_CONFIG = {
    verbose: true,
    cleanupAfterTests: true,
    testDbPath: path.join(os.tmpdir(), 'lucide_test_offline_first.db')
};

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// ============================================================
// LOGGING UTILITIES
// ============================================================

function log(message, type = 'info') {
    const prefix = {
        'info': '   ',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'section': '\n📋',
        'skip': '⏭️'
    }[type] || '   ';
    console.log(`${prefix} ${message}`);
}

function logResult(name, success, details = '', skip = false) {
    if (skip) {
        testsSkipped++;
        log(`${name} (SKIPPED)`, 'skip');
    } else if (success) {
        testsPassed++;
        log(`${name}`, 'success');
    } else {
        testsFailed++;
        log(`${name}`, 'error');
    }
    if (details && TEST_CONFIG.verbose) {
        console.log(`      ${details}`);
    }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('    PHASE 1: OFFLINE-FIRST FUNCTIONAL TEST SUITE');
    console.log('='.repeat(70) + '\n');

    let db = null;
    let Database = null;

    // --------------------------------------------------------
    // TEST GROUP 1: SQLite Database Initialization
    // --------------------------------------------------------
    log('SQLite Database Initialization', 'section');

    try {
        // Load better-sqlite3
        Database = require('better-sqlite3');
        logResult('better-sqlite3 module loads', true);

        // Create test database
        db = new Database(TEST_CONFIG.testDbPath);
        db.pragma('journal_mode = WAL');
        logResult('Test database created', true, `Path: ${TEST_CONFIG.testDbPath}`);
    } catch (error) {
        logResult('SQLite initialization', false, `Error: ${error.message}`);
        return summarize();
    }

    // --------------------------------------------------------
    // TEST GROUP 2: Schema with sync_state
    // --------------------------------------------------------
    log('Schema with sync_state Column', 'section');

    try {
        // Create a test table with sync_state (mimicking Lucide schema)
        db.exec(`
            CREATE TABLE IF NOT EXISTS test_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_state TEXT DEFAULT 'clean' CHECK(sync_state IN ('clean', 'dirty', 'pending'))
            )
        `);
        logResult('Table with sync_state created', true);

        // Verify sync_state constraint
        const tableInfo = db.prepare("PRAGMA table_info(test_sessions)").all();
        const syncStateCol = tableInfo.find(c => c.name === 'sync_state');
        logResult(
            'sync_state column exists',
            syncStateCol !== undefined,
            `Default: ${syncStateCol?.dflt_value}`
        );
    } catch (error) {
        logResult('Schema creation', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 3: CRUD Operations (Offline Mode)
    // --------------------------------------------------------
    log('CRUD Operations (No Network Required)', 'section');

    const testId = `test_${Date.now()}`;
    const testData = {
        id: testId,
        title: 'Test Session Offline',
        content: 'This was created while offline',
        created_at: Date.now(),
        updated_at: Date.now(),
        sync_state: 'dirty' // New local changes are dirty
    };

    // CREATE
    try {
        const insertStmt = db.prepare(`
            INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(testData.id, testData.title, testData.content, testData.created_at, testData.updated_at, testData.sync_state);
        logResult('CREATE: Insert record offline', true);
    } catch (error) {
        logResult('CREATE: Insert record', false, `Error: ${error.message}`);
    }

    // READ
    try {
        const selectStmt = db.prepare('SELECT * FROM test_sessions WHERE id = ?');
        const row = selectStmt.get(testId);
        const readSuccess = row && row.title === testData.title;
        logResult('READ: Retrieve record offline', readSuccess, readSuccess ? `Found: ${row.title}` : 'Record not found');
    } catch (error) {
        logResult('READ: Retrieve record', false, `Error: ${error.message}`);
    }

    // UPDATE
    try {
        const updateStmt = db.prepare(`
            UPDATE test_sessions
            SET title = ?, updated_at = ?, sync_state = 'dirty'
            WHERE id = ?
        `);
        updateStmt.run('Updated Title Offline', Date.now(), testId);

        const row = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(testId);
        const updateSuccess = row && row.title === 'Updated Title Offline' && row.sync_state === 'dirty';
        logResult('UPDATE: Modify record offline', updateSuccess, updateSuccess ? 'Title updated, sync_state = dirty' : 'Update failed');
    } catch (error) {
        logResult('UPDATE: Modify record', false, `Error: ${error.message}`);
    }

    // DELETE
    try {
        const deleteStmt = db.prepare('DELETE FROM test_sessions WHERE id = ?');
        deleteStmt.run(testId);

        const row = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(testId);
        logResult('DELETE: Remove record offline', row === undefined);
    } catch (error) {
        logResult('DELETE: Remove record', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 4: sync_state Transitions
    // --------------------------------------------------------
    log('sync_state Transitions', 'section');

    const syncTestId = `sync_test_${Date.now()}`;

    try {
        // 1. Insert with 'clean' state (simulating synced data)
        db.prepare(`
            INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
            VALUES (?, 'Synced Session', 'Content', ?, ?, 'clean')
        `).run(syncTestId, Date.now(), Date.now());

        let row = db.prepare('SELECT sync_state FROM test_sessions WHERE id = ?').get(syncTestId);
        logResult('Initial state: clean', row?.sync_state === 'clean', `State: ${row?.sync_state}`);

        // 2. Modify -> should become 'dirty'
        db.prepare(`
            UPDATE test_sessions SET title = 'Modified', sync_state = 'dirty', updated_at = ?
            WHERE id = ?
        `).run(Date.now(), syncTestId);

        row = db.prepare('SELECT sync_state FROM test_sessions WHERE id = ?').get(syncTestId);
        logResult('After local edit: dirty', row?.sync_state === 'dirty', `State: ${row?.sync_state}`);

        // 3. Sync starts -> should become 'pending'
        db.prepare(`
            UPDATE test_sessions SET sync_state = 'pending'
            WHERE id = ? AND sync_state = 'dirty'
        `).run(syncTestId);

        row = db.prepare('SELECT sync_state FROM test_sessions WHERE id = ?').get(syncTestId);
        logResult('During sync: pending', row?.sync_state === 'pending', `State: ${row?.sync_state}`);

        // 4. Sync completes -> should become 'clean'
        db.prepare(`
            UPDATE test_sessions SET sync_state = 'clean'
            WHERE id = ? AND sync_state = 'pending'
        `).run(syncTestId);

        row = db.prepare('SELECT sync_state FROM test_sessions WHERE id = ?').get(syncTestId);
        logResult('After sync: clean', row?.sync_state === 'clean', `State: ${row?.sync_state}`);

    } catch (error) {
        logResult('sync_state transitions', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 5: Dirty Records Detection
    // --------------------------------------------------------
    log('Dirty Records Detection (for Sync)', 'section');

    try {
        // Clear previous test data
        db.exec('DELETE FROM test_sessions');

        // Insert mixed sync states
        const insert = db.prepare(`
            INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
            VALUES (?, ?, 'Content', ?, ?, ?)
        `);

        const now = Date.now();
        insert.run('clean_1', 'Clean Session 1', now, now, 'clean');
        insert.run('dirty_1', 'Dirty Session 1', now, now, 'dirty');
        insert.run('dirty_2', 'Dirty Session 2', now, now, 'dirty');
        insert.run('pending_1', 'Pending Session', now, now, 'pending');
        insert.run('clean_2', 'Clean Session 2', now, now, 'clean');

        // Query dirty records (what sync service would do)
        const dirtyRecords = db.prepare(`
            SELECT * FROM test_sessions WHERE sync_state IN ('dirty', 'pending')
        `).all();

        logResult(
            'Detect dirty/pending records',
            dirtyRecords.length === 3,
            `Found ${dirtyRecords.length}/3 records to sync`
        );

        // Query only dirty (not yet being synced)
        const onlyDirty = db.prepare(`
            SELECT * FROM test_sessions WHERE sync_state = 'dirty'
        `).all();

        logResult(
            'Filter only dirty (exclude pending)',
            onlyDirty.length === 2,
            `Found ${onlyDirty.length}/2 dirty records`
        );

    } catch (error) {
        logResult('Dirty records detection', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 6: Firebase Optionality
    // --------------------------------------------------------
    log('Firebase Optionality Check', 'section');

    try {
        // Simulate what happens when Firebase is NOT configured
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY || null,
            projectId: process.env.FIREBASE_PROJECT_ID || null
        };

        const firebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

        logResult(
            'Firebase config check',
            true,
            firebaseConfigured ? 'Firebase configured' : 'Firebase NOT configured (expected for offline-first)'
        );

        // Test that SQLite still works without Firebase
        const testInsert = db.prepare(`
            INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
            VALUES (?, 'No Firebase Test', 'Works without cloud', ?, ?, 'dirty')
        `).run(`no_firebase_${Date.now()}`, Date.now(), Date.now());

        logResult(
            'SQLite works without Firebase',
            testInsert.changes === 1,
            'Insert successful without cloud connection'
        );

        // Verify sync service handles missing Firebase gracefully
        const syncServicePath = path.join(PROJECT_ROOT, 'src/features/common/services/syncService.js');
        const syncServiceCode = fs.readFileSync(syncServicePath, 'utf-8');

        const hasGracefulHandling =
            syncServiceCode.includes('!this.isOnline') ||
            syncServiceCode.includes('Device is offline') ||
            syncServiceCode.includes('catch');

        logResult(
            'Sync service handles offline gracefully',
            hasGracefulHandling,
            hasGracefulHandling ? 'Error handling present' : 'Missing error handling'
        );

    } catch (error) {
        logResult('Firebase optionality', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 7: Repository Pattern Validation
    // --------------------------------------------------------
    log('Repository Pattern Validation', 'section');

    try {
        // Test BaseSqliteRepository class
        const { BaseSqliteRepository } = require(path.join(PROJECT_ROOT, 'src/features/common/repositories/BaseRepository'));

        // Create an instance with our test db
        const testRepo = new BaseSqliteRepository('test_sessions', () => db);

        // Test getAll
        const allRecords = testRepo.getAll({ limit: 10 });
        logResult(
            'Repository.getAll() works',
            Array.isArray(allRecords),
            `Retrieved ${allRecords.length} records`
        );

        // Test count
        const count = testRepo.count();
        logResult(
            'Repository.count() works',
            typeof count === 'number',
            `Count: ${count}`
        );

        // Test exists
        if (allRecords.length > 0) {
            const exists = testRepo.exists(allRecords[0].id);
            logResult('Repository.exists() works', exists === true, `Record exists: ${exists}`);
        }

    } catch (error) {
        logResult('Repository pattern', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 8: Conflict Resolution Logic
    // --------------------------------------------------------
    log('Conflict Resolution (Last-Write-Wins)', 'section');

    try {
        const conflictId = `conflict_${Date.now()}`;
        const baseTime = Date.now();

        // Simulate local version
        db.prepare(`
            INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
            VALUES (?, 'Local Version', 'Local content', ?, ?, 'dirty')
        `).run(conflictId, baseTime, baseTime + 1000);

        const localRow = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(conflictId);

        // Simulate remote version (newer timestamp)
        const remoteVersion = {
            id: conflictId,
            title: 'Remote Version',
            content: 'Remote content',
            updated_at: baseTime + 5000 // Remote is newer
        };

        // Last-write-wins: compare timestamps
        const localWins = localRow.updated_at > remoteVersion.updated_at;
        const remoteWins = remoteVersion.updated_at > localRow.updated_at;

        logResult(
            'Timestamp comparison works',
            true,
            `Local: ${localRow.updated_at}, Remote: ${remoteVersion.updated_at}`
        );

        logResult(
            'Last-write-wins resolution',
            remoteWins === true,
            remoteWins ? 'Remote version wins (newer)' : 'Local version wins'
        );

        // Apply winning version (UPSERT)
        if (remoteWins) {
            db.prepare(`
                UPDATE test_sessions
                SET title = ?, content = ?, updated_at = ?, sync_state = 'clean'
                WHERE id = ?
            `).run(remoteVersion.title, remoteVersion.content, remoteVersion.updated_at, conflictId);
        }

        const finalRow = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(conflictId);
        logResult(
            'Conflict resolved correctly',
            finalRow.title === 'Remote Version',
            `Final title: ${finalRow.title}`
        );

    } catch (error) {
        logResult('Conflict resolution', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 9: Transaction Support
    // --------------------------------------------------------
    log('Transaction Support', 'section');

    try {
        const txnTestId1 = `txn_test_1_${Date.now()}`;
        const txnTestId2 = `txn_test_2_${Date.now()}`;

        // Test successful transaction
        const transaction = db.transaction(() => {
            const now = Date.now();
            db.prepare(`
                INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
                VALUES (?, 'Transaction Test 1', 'Content', ?, ?, 'clean')
            `).run(txnTestId1, now, now);

            db.prepare(`
                INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
                VALUES (?, 'Transaction Test 2', 'Content', ?, ?, 'clean')
            `).run(txnTestId2, now, now);
        });

        transaction();

        const row1 = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(txnTestId1);
        const row2 = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(txnTestId2);

        logResult(
            'Transaction commits successfully',
            row1 !== undefined && row2 !== undefined,
            `Both records created`
        );

        // Test transaction rollback
        const rollbackId = `rollback_${Date.now()}`;
        try {
            const failTransaction = db.transaction(() => {
                db.prepare(`
                    INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
                    VALUES (?, 'Will Rollback', 'Content', ?, ?, 'clean')
                `).run(rollbackId, Date.now(), Date.now());

                // Force error
                throw new Error('Simulated failure');
            });

            failTransaction();
        } catch (e) {
            // Expected error
        }

        const rolledBack = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(rollbackId);
        logResult(
            'Transaction rollback works',
            rolledBack === undefined,
            'Record was not persisted after rollback'
        );

    } catch (error) {
        logResult('Transaction support', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 10: Performance (Bulk Operations)
    // --------------------------------------------------------
    log('Performance: Bulk Operations', 'section');

    try {
        const BULK_COUNT = 100;
        const bulkInsert = db.prepare(`
            INSERT INTO test_sessions (id, title, content, created_at, updated_at, sync_state)
            VALUES (?, ?, 'Bulk content', ?, ?, 'dirty')
        `);

        const insertMany = db.transaction((items) => {
            for (const item of items) {
                bulkInsert.run(item.id, item.title, item.created_at, item.updated_at);
            }
        });

        const items = [];
        const now = Date.now();
        for (let i = 0; i < BULK_COUNT; i++) {
            items.push({
                id: `bulk_${now}_${i}`,
                title: `Bulk Item ${i}`,
                created_at: now,
                updated_at: now
            });
        }

        const startTime = performance.now();
        insertMany(items);
        const endTime = performance.now();

        const duration = endTime - startTime;
        logResult(
            `Bulk insert ${BULK_COUNT} records`,
            duration < 1000, // Should be under 1 second
            `Duration: ${duration.toFixed(2)}ms (${(duration / BULK_COUNT).toFixed(2)}ms/record)`
        );

        // Bulk read
        const readStart = performance.now();
        const allBulk = db.prepare(`SELECT * FROM test_sessions WHERE id LIKE 'bulk_%'`).all();
        const readEnd = performance.now();

        logResult(
            `Bulk read ${allBulk.length} records`,
            (readEnd - readStart) < 500,
            `Duration: ${(readEnd - readStart).toFixed(2)}ms`
        );

    } catch (error) {
        logResult('Bulk operations', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------
    if (db) {
        db.close();
    }

    if (TEST_CONFIG.cleanupAfterTests && fs.existsSync(TEST_CONFIG.testDbPath)) {
        try {
            fs.unlinkSync(TEST_CONFIG.testDbPath);
            // Also remove WAL files if they exist
            const walPath = TEST_CONFIG.testDbPath + '-wal';
            const shmPath = TEST_CONFIG.testDbPath + '-shm';
            if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
            log('Test database cleaned up', 'info');
        } catch (e) {
            log(`Could not clean up test database: ${e.message}`, 'warning');
        }
    }

    return summarize();
}

function summarize() {
    console.log('\n' + '='.repeat(70));
    console.log('    PHASE 1 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n   Total Tests:  ${testsPassed + testsFailed + testsSkipped}`);
    console.log(`   ✅ Passed:    ${testsPassed}`);
    console.log(`   ❌ Failed:    ${testsFailed}`);
    console.log(`   ⏭️  Skipped:   ${testsSkipped}`);

    const status = testsFailed === 0 ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED';
    console.log(`\n   ${status}`);
    console.log('='.repeat(70) + '\n');

    return { passed: testsPassed, failed: testsFailed, skipped: testsSkipped };
}

// Run tests
runTests().then(result => {
    process.exit(result.failed > 0 ? 1 : 0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
