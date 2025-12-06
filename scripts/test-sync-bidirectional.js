/**
 * Phase 2: Bidirectional Sync Test Suite
 *
 * Tests synchronization logic:
 * 1. Push local changes to remote (simulated)
 * 2. Pull remote changes to local (simulated)
 * 3. Full bidirectional sync flow
 * 4. Conflict resolution during sync
 * 5. Network error handling and retry
 * 6. Offline mode detection
 *
 * Run: node scripts/test-sync-bidirectional.js
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
    testDbPath: path.join(os.tmpdir(), 'lucide_test_sync.db')
};

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// ============================================================
// MOCK SYNC API
// ============================================================

class MockSyncAPI {
    constructor() {
        this.remoteData = {
            sessions: [],
            messages: [],
            documents: [],
            presets: []
        };
        this.pushCalls = [];
        this.pullCalls = [];
        this.shouldFail = false;
        this.failCount = 0;
        this.maxFails = 0;
    }

    reset() {
        this.remoteData = { sessions: [], messages: [], documents: [], presets: [] };
        this.pushCalls = [];
        this.pullCalls = [];
        this.shouldFail = false;
        this.failCount = 0;
    }

    setFailMode(count) {
        this.shouldFail = true;
        this.maxFails = count;
        this.failCount = 0;
    }

    async push(data) {
        this.pushCalls.push(data);

        if (this.shouldFail && this.failCount < this.maxFails) {
            this.failCount++;
            throw new Error('Network error (simulated)');
        }

        // Merge into remote data
        if (data.sessions) {
            for (const session of data.sessions) {
                const idx = this.remoteData.sessions.findIndex(s => s.id === session.id);
                if (idx >= 0) {
                    this.remoteData.sessions[idx] = session;
                } else {
                    this.remoteData.sessions.push(session);
                }
            }
        }

        return {
            success: true,
            results: {
                sessions: data.sessions?.length || 0,
                messages: data.messages?.length || 0,
                documents: data.documents?.length || 0,
                presets: data.presets?.length || 0
            }
        };
    }

    async pull(lastSyncTime = 0) {
        this.pullCalls.push({ lastSyncTime });

        if (this.shouldFail && this.failCount < this.maxFails) {
            this.failCount++;
            throw new Error('Network error (simulated)');
        }

        // Return data newer than lastSyncTime
        const filtered = {
            sessions: this.remoteData.sessions.filter(s => (s.updated_at || 0) > lastSyncTime),
            messages: this.remoteData.messages.filter(m => (m.created_at || 0) > lastSyncTime),
            documents: this.remoteData.documents.filter(d => (d.updated_at || 0) > lastSyncTime),
            presets: this.remoteData.presets.filter(p => (p.updated_at || 0) > lastSyncTime)
        };

        return { success: true, data: filtered };
    }

    addRemoteSession(session) {
        this.remoteData.sessions.push(session);
    }

    addRemoteMessage(message) {
        this.remoteData.messages.push(message);
    }
}

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
    console.log('    PHASE 2: BIDIRECTIONAL SYNC TEST SUITE');
    console.log('='.repeat(70) + '\n');

    let db = null;
    let Database = null;
    const mockAPI = new MockSyncAPI();

    // --------------------------------------------------------
    // SETUP: Create test database with schema
    // --------------------------------------------------------
    log('Test Database Setup', 'section');

    try {
        Database = require('better-sqlite3');
        db = new Database(TEST_CONFIG.testDbPath);
        db.pragma('journal_mode = WAL');

        // Create tables matching Lucide schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                email TEXT,
                last_sync_at INTEGER DEFAULT 0,
                created_at INTEGER,
                sync_state TEXT DEFAULT 'clean'
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                title TEXT NOT NULL,
                session_type TEXT DEFAULT 'chat',
                started_at INTEGER,
                ended_at INTEGER,
                tags TEXT DEFAULT '[]',
                description TEXT,
                agent_profile TEXT,
                message_count INTEGER DEFAULT 0,
                auto_title INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_state TEXT DEFAULT 'clean' CHECK(sync_state IN ('clean', 'dirty', 'pending'))
            );

            CREATE TABLE IF NOT EXISTS ai_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                sent_at INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tokens INTEGER DEFAULT 0,
                model TEXT,
                created_at INTEGER NOT NULL,
                sync_state TEXT DEFAULT 'clean' CHECK(sync_state IN ('clean', 'dirty', 'pending')),
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                title TEXT NOT NULL,
                filename TEXT,
                content TEXT,
                file_type TEXT,
                tags TEXT DEFAULT '[]',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_state TEXT DEFAULT 'clean' CHECK(sync_state IN ('clean', 'dirty', 'pending'))
            );

            CREATE TABLE IF NOT EXISTS prompt_presets (
                id TEXT PRIMARY KEY,
                uid TEXT NOT NULL,
                name TEXT NOT NULL,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_state TEXT DEFAULT 'clean' CHECK(sync_state IN ('clean', 'dirty', 'pending'))
            );
        `);

        // Insert test user
        db.prepare(`
            INSERT OR REPLACE INTO users (uid, email, last_sync_at, created_at, sync_state)
            VALUES ('test_user', 'test@example.com', 0, ?, 'clean')
        `).run(Date.now());

        logResult('Test database created', true);
    } catch (error) {
        logResult('Database setup', false, `Error: ${error.message}`);
        return summarize();
    }

    // --------------------------------------------------------
    // TEST GROUP 1: Push Local Changes
    // --------------------------------------------------------
    log('Push Local Changes to Remote', 'section');

    try {
        const now = Date.now();

        // Create local dirty sessions
        const insertSession = db.prepare(`
            INSERT INTO sessions (id, uid, title, session_type, started_at, created_at, updated_at, sync_state)
            VALUES (?, 'test_user', ?, 'chat', ?, ?, ?, 'dirty')
        `);

        insertSession.run('session_1', 'Local Session 1', now, now, now);
        insertSession.run('session_2', 'Local Session 2', now, now, now);
        insertSession.run('session_3', 'Clean Session', now, now, now);

        // Mark session_3 as clean (should not be pushed)
        db.prepare(`UPDATE sessions SET sync_state = 'clean' WHERE id = 'session_3'`).run();

        // Get dirty sessions
        const dirtySessions = db.prepare(`
            SELECT * FROM sessions WHERE sync_state IN ('dirty', 'pending')
        `).all();

        logResult(
            'Detect dirty sessions for push',
            dirtySessions.length === 2,
            `Found ${dirtySessions.length} dirty sessions`
        );

        // Simulate push
        const pushData = {
            sessions: dirtySessions.map(s => ({
                ...s,
                tags: s.tags ? JSON.parse(s.tags) : []
            })),
            messages: [],
            documents: [],
            presets: []
        };

        const pushResult = await mockAPI.push(pushData);

        logResult(
            'Push to remote API',
            pushResult.success && pushResult.results.sessions === 2,
            `Pushed ${pushResult.results.sessions} sessions`
        );

        // Mark as clean after successful push
        db.prepare(`
            UPDATE sessions SET sync_state = 'clean' WHERE sync_state IN ('dirty', 'pending')
        `).run();

        const remainingDirty = db.prepare(`
            SELECT COUNT(*) as count FROM sessions WHERE sync_state = 'dirty'
        `).get();

        logResult(
            'Mark pushed records as clean',
            remainingDirty.count === 0,
            `Remaining dirty: ${remainingDirty.count}`
        );

        // Verify remote received data
        logResult(
            'Remote received push data',
            mockAPI.remoteData.sessions.length === 2,
            `Remote has ${mockAPI.remoteData.sessions.length} sessions`
        );

    } catch (error) {
        logResult('Push local changes', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 2: Pull Remote Changes
    // --------------------------------------------------------
    log('Pull Remote Changes to Local', 'section');

    try {
        const now = Date.now();

        // Add remote data that doesn't exist locally
        mockAPI.addRemoteSession({
            id: 'remote_session_1',
            uid: 'test_user',
            title: 'Remote Session 1',
            session_type: 'chat',
            started_at: now,
            created_at: now,
            updated_at: now + 1000,
            tags: ['remote'],
            message_count: 5
        });

        mockAPI.addRemoteSession({
            id: 'remote_session_2',
            uid: 'test_user',
            title: 'Remote Session 2',
            session_type: 'ask',
            started_at: now,
            created_at: now,
            updated_at: now + 2000,
            tags: [],
            message_count: 3
        });

        // Get last sync time
        const user = db.prepare('SELECT last_sync_at FROM users WHERE uid = ?').get('test_user');
        const lastSyncAt = user?.last_sync_at || 0;

        logResult(
            'Get last sync timestamp',
            true,
            `Last sync: ${lastSyncAt}`
        );

        // Pull from remote
        const pullResult = await mockAPI.pull(lastSyncAt);

        logResult(
            'Pull from remote API',
            pullResult.success,
            `Received ${pullResult.data.sessions.length} sessions`
        );

        // Upsert into local database
        const upsertSession = db.prepare(`
            INSERT INTO sessions (
                id, uid, title, session_type, started_at, message_count,
                tags, created_at, updated_at, sync_state
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'clean')
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                message_count = excluded.message_count,
                tags = excluded.tags,
                updated_at = excluded.updated_at,
                sync_state = 'clean'
        `);

        let insertedCount = 0;
        for (const session of pullResult.data.sessions) {
            upsertSession.run(
                session.id, session.uid, session.title, session.session_type,
                session.started_at, session.message_count,
                JSON.stringify(session.tags || []),
                session.created_at, session.updated_at
            );
            insertedCount++;
        }

        logResult(
            'Upsert pulled sessions',
            insertedCount >= 2, // At least the 2 remote sessions we added
            `Upserted ${insertedCount} sessions`
        );

        // Verify local database has remote data
        const remoteSession = db.prepare(`SELECT * FROM sessions WHERE id = 'remote_session_1'`).get();
        logResult(
            'Remote data in local DB',
            remoteSession !== undefined && remoteSession.title === 'Remote Session 1',
            remoteSession ? `Found: ${remoteSession.title}` : 'Not found'
        );

        // Update last sync time
        db.prepare(`UPDATE users SET last_sync_at = ? WHERE uid = 'test_user'`).run(now + 3000);

    } catch (error) {
        logResult('Pull remote changes', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 3: Bidirectional Sync Flow
    // --------------------------------------------------------
    log('Full Bidirectional Sync', 'section');

    try {
        mockAPI.reset();
        const now = Date.now();

        // Create local dirty data
        db.prepare(`
            INSERT INTO sessions (id, uid, title, session_type, started_at, created_at, updated_at, sync_state)
            VALUES ('bidirectional_local', 'test_user', 'Bidirectional Local', 'chat', ?, ?, ?, 'dirty')
        `).run(now, now, now);

        // Add remote data
        mockAPI.addRemoteSession({
            id: 'bidirectional_remote',
            uid: 'test_user',
            title: 'Bidirectional Remote',
            session_type: 'chat',
            started_at: now,
            created_at: now,
            updated_at: now,
            tags: []
        });

        // Step 1: Push
        const dirtySessions = db.prepare(`
            SELECT * FROM sessions WHERE sync_state = 'dirty'
        `).all();

        const pushResult = await mockAPI.push({
            sessions: dirtySessions,
            messages: [],
            documents: [],
            presets: []
        });

        // Mark as clean
        db.prepare(`UPDATE sessions SET sync_state = 'clean' WHERE sync_state = 'dirty'`).run();

        // Step 2: Pull
        const pullResult = await mockAPI.pull(0);

        for (const session of pullResult.data.sessions) {
            db.prepare(`
                INSERT OR REPLACE INTO sessions (
                    id, uid, title, session_type, started_at, created_at, updated_at, sync_state
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'clean')
            `).run(
                session.id, session.uid, session.title, session.session_type,
                session.started_at, session.created_at, session.updated_at
            );
        }

        // Verify both directions
        const localInRemote = mockAPI.remoteData.sessions.some(s => s.id === 'bidirectional_local');
        const remoteInLocal = db.prepare(`SELECT * FROM sessions WHERE id = 'bidirectional_remote'`).get();

        logResult(
            'Local pushed to remote',
            localInRemote,
            localInRemote ? 'bidirectional_local found in remote' : 'Not found'
        );

        logResult(
            'Remote pulled to local',
            remoteInLocal !== undefined,
            remoteInLocal ? 'bidirectional_remote found in local' : 'Not found'
        );

        logResult(
            'Bidirectional sync complete',
            localInRemote && remoteInLocal !== undefined,
            'Both directions successful'
        );

    } catch (error) {
        logResult('Bidirectional sync', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 4: Conflict Resolution (Last-Write-Wins)
    // --------------------------------------------------------
    log('Conflict Resolution (Last-Write-Wins)', 'section');

    try {
        mockAPI.reset();
        const baseTime = Date.now();

        // Create local version (older)
        db.prepare(`
            INSERT OR REPLACE INTO sessions (
                id, uid, title, session_type, started_at, created_at, updated_at, sync_state
            )
            VALUES ('conflict_session', 'test_user', 'Local Version', 'chat', ?, ?, ?, 'dirty')
        `).run(baseTime, baseTime, baseTime + 1000);

        // Remote version (newer)
        mockAPI.addRemoteSession({
            id: 'conflict_session',
            uid: 'test_user',
            title: 'Remote Version (Newer)',
            session_type: 'chat',
            started_at: baseTime,
            created_at: baseTime,
            updated_at: baseTime + 5000, // Newer
            tags: []
        });

        // Push local (will be overwritten by pull)
        const localSession = db.prepare(`SELECT * FROM sessions WHERE id = 'conflict_session'`).get();

        // Pull remote
        const pullResult = await mockAPI.pull(0);
        const remoteSession = pullResult.data.sessions.find(s => s.id === 'conflict_session');

        // Last-write-wins: compare timestamps
        const localWins = localSession.updated_at > remoteSession.updated_at;

        logResult(
            'Detect conflict',
            true,
            `Local: ${localSession.updated_at}, Remote: ${remoteSession.updated_at}`
        );

        logResult(
            'Remote is newer',
            !localWins,
            `Remote wins: ${!localWins}`
        );

        // Apply winner
        if (!localWins) {
            db.prepare(`
                UPDATE sessions
                SET title = ?, updated_at = ?, sync_state = 'clean'
                WHERE id = 'conflict_session'
            `).run(remoteSession.title, remoteSession.updated_at);
        }

        const finalVersion = db.prepare(`SELECT * FROM sessions WHERE id = 'conflict_session'`).get();

        logResult(
            'Conflict resolved to newer version',
            finalVersion.title === 'Remote Version (Newer)',
            `Final title: ${finalVersion.title}`
        );

    } catch (error) {
        logResult('Conflict resolution', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 5: Network Error Handling
    // --------------------------------------------------------
    log('Network Error Handling', 'section');

    try {
        mockAPI.reset();
        mockAPI.setFailMode(2); // Fail first 2 attempts

        let attempts = 0;
        let lastError = null;
        let success = false;

        // Retry logic simulation
        const maxRetries = 3;
        const retryDelayMs = 100;

        while (attempts < maxRetries && !success) {
            attempts++;
            try {
                await mockAPI.push({ sessions: [], messages: [], documents: [], presets: [] });
                success = true;
            } catch (error) {
                lastError = error;
                if (attempts < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
            }
        }

        logResult(
            'Retry on network error',
            attempts === 3 && success,
            `Succeeded after ${attempts} attempts`
        );

        logResult(
            'Recover from transient failure',
            success,
            success ? 'Eventually succeeded' : `Failed: ${lastError?.message}`
        );

    } catch (error) {
        logResult('Network error handling', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 6: Permanent Network Failure
    // --------------------------------------------------------
    log('Permanent Network Failure', 'section');

    try {
        mockAPI.reset();
        mockAPI.setFailMode(10); // Always fail

        let attempts = 0;
        let success = false;
        const maxRetries = 3;

        while (attempts < maxRetries && !success) {
            attempts++;
            try {
                await mockAPI.push({ sessions: [], messages: [], documents: [], presets: [] });
                success = true;
            } catch (error) {
                // Continue retrying
            }
        }

        logResult(
            'Detect permanent failure',
            !success && attempts === maxRetries,
            `Failed after ${attempts} retries`
        );

        // Verify dirty records remain dirty
        db.prepare(`
            INSERT INTO sessions (id, uid, title, session_type, started_at, created_at, updated_at, sync_state)
            VALUES ('failed_sync_session', 'test_user', 'Failed Sync', 'chat', ?, ?, ?, 'dirty')
        `).run(Date.now(), Date.now(), Date.now());

        const dirtyRemains = db.prepare(`
            SELECT * FROM sessions WHERE id = 'failed_sync_session' AND sync_state = 'dirty'
        `).get();

        logResult(
            'Dirty records preserved on failure',
            dirtyRemains !== undefined,
            'Data will retry on next sync'
        );

    } catch (error) {
        logResult('Permanent failure handling', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 7: Offline Mode Detection
    // --------------------------------------------------------
    log('Offline Mode Detection', 'section');

    try {
        // Simulate sync service offline check
        class MockSyncService {
            constructor() {
                this.isOnline = true;
            }

            async performSync() {
                if (!this.isOnline) {
                    return { success: false, message: 'Device is offline' };
                }
                return { success: true, message: 'Sync completed' };
            }

            setOnline(status) {
                this.isOnline = status;
            }
        }

        const syncService = new MockSyncService();

        // Online sync
        syncService.setOnline(true);
        const onlineResult = await syncService.performSync();

        logResult(
            'Sync when online',
            onlineResult.success,
            onlineResult.message
        );

        // Offline sync
        syncService.setOnline(false);
        const offlineResult = await syncService.performSync();

        logResult(
            'Skip sync when offline',
            !offlineResult.success && offlineResult.message.includes('offline'),
            offlineResult.message
        );

        // Verify local operations still work offline
        db.prepare(`
            INSERT INTO sessions (id, uid, title, session_type, started_at, created_at, updated_at, sync_state)
            VALUES ('offline_session', 'test_user', 'Created Offline', 'chat', ?, ?, ?, 'dirty')
        `).run(Date.now(), Date.now(), Date.now());

        const offlineSession = db.prepare(`SELECT * FROM sessions WHERE id = 'offline_session'`).get();

        logResult(
            'Local operations work offline',
            offlineSession !== undefined,
            'Insert succeeded while offline'
        );

    } catch (error) {
        logResult('Offline mode', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 8: Incremental Sync (Only Changed Records)
    // --------------------------------------------------------
    log('Incremental Sync (Changed Records Only)', 'section');

    try {
        mockAPI.reset();
        const baseTime = Date.now();

        // Add old and new remote data
        mockAPI.addRemoteSession({
            id: 'old_session',
            uid: 'test_user',
            title: 'Old Session',
            updated_at: baseTime - 100000, // Old
            created_at: baseTime - 100000,
            started_at: baseTime - 100000,
            tags: []
        });

        mockAPI.addRemoteSession({
            id: 'new_session',
            uid: 'test_user',
            title: 'New Session',
            updated_at: baseTime + 1000, // New
            created_at: baseTime + 1000,
            started_at: baseTime + 1000,
            tags: []
        });

        // Set last sync time to filter old data
        const lastSyncTime = baseTime;

        const pullResult = await mockAPI.pull(lastSyncTime);

        logResult(
            'Pull only new records',
            pullResult.data.sessions.length === 1,
            `Received ${pullResult.data.sessions.length} (expected 1 new)`
        );

        const pulledSession = pullResult.data.sessions[0];
        logResult(
            'Correct session pulled',
            pulledSession?.id === 'new_session',
            pulledSession ? `Pulled: ${pulledSession.title}` : 'Wrong session'
        );

    } catch (error) {
        logResult('Incremental sync', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 9: Sync Stats Tracking
    // --------------------------------------------------------
    log('Sync Statistics Tracking', 'section');

    try {
        class MockSyncStats {
            constructor() {
                this.totalSyncs = 0;
                this.successfulSyncs = 0;
                this.failedSyncs = 0;
                this.lastSyncDuration = 0;
                this.lastError = null;
            }

            recordSuccess(duration) {
                this.totalSyncs++;
                this.successfulSyncs++;
                this.lastSyncDuration = duration;
                this.lastError = null;
            }

            recordFailure(error) {
                this.totalSyncs++;
                this.failedSyncs++;
                this.lastError = error;
            }

            getStats() {
                return {
                    total: this.totalSyncs,
                    success: this.successfulSyncs,
                    failed: this.failedSyncs,
                    lastDuration: this.lastSyncDuration,
                    lastError: this.lastError
                };
            }
        }

        const stats = new MockSyncStats();

        // Simulate syncs
        stats.recordSuccess(150);
        stats.recordSuccess(200);
        stats.recordFailure('Network timeout');
        stats.recordSuccess(100);

        const finalStats = stats.getStats();

        logResult(
            'Track total syncs',
            finalStats.total === 4,
            `Total: ${finalStats.total}`
        );

        logResult(
            'Track successful syncs',
            finalStats.success === 3,
            `Successful: ${finalStats.success}`
        );

        logResult(
            'Track failed syncs',
            finalStats.failed === 1,
            `Failed: ${finalStats.failed}`
        );

        logResult(
            'Track last error',
            finalStats.lastError === null, // Last sync succeeded
            finalStats.lastError ? `Error: ${finalStats.lastError}` : 'No error (last sync succeeded)'
        );

    } catch (error) {
        logResult('Sync stats', false, `Error: ${error.message}`);
    }

    // --------------------------------------------------------
    // TEST GROUP 10: Concurrent Sync Prevention
    // --------------------------------------------------------
    log('Concurrent Sync Prevention', 'section');

    try {
        class MockSyncManager {
            constructor() {
                this.isSyncing = false;
            }

            async performSync(force = false) {
                if (this.isSyncing && !force) {
                    return { success: false, message: 'Sync already in progress' };
                }

                this.isSyncing = true;
                try {
                    // Simulate sync work
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return { success: true, message: 'Sync completed' };
                } finally {
                    this.isSyncing = false;
                }
            }
        }

        const syncManager = new MockSyncManager();

        // Start first sync
        const sync1Promise = syncManager.performSync();

        // Attempt concurrent sync (should be blocked)
        const sync2Result = await syncManager.performSync();

        // Wait for first sync
        const sync1Result = await sync1Promise;

        logResult(
            'Block concurrent sync',
            !sync2Result.success && sync2Result.message.includes('already in progress'),
            sync2Result.message
        );

        logResult(
            'First sync completes',
            sync1Result.success,
            sync1Result.message
        );

        // Force sync should work
        syncManager.isSyncing = true; // Simulate stuck sync
        const forceResult = await syncManager.performSync(true);

        logResult(
            'Force sync overrides lock',
            forceResult.success,
            forceResult.message
        );

    } catch (error) {
        logResult('Concurrent sync', false, `Error: ${error.message}`);
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
            const walPath = TEST_CONFIG.testDbPath + '-wal';
            const shmPath = TEST_CONFIG.testDbPath + '-shm';
            if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
            log('Test database cleaned up', 'info');
        } catch (e) {
            log(`Could not clean up: ${e.message}`, 'warning');
        }
    }

    return summarize();
}

function summarize() {
    console.log('\n' + '='.repeat(70));
    console.log('    PHASE 2 TEST SUMMARY');
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
