/**
 * SQLite Integration Tests - Operations
 *
 * These tests use a local SQLite database file.
 * No Docker required - tests real better-sqlite3 functionality.
 *
 * Run with: node tests/integration/sqlite/operations.test.js
 */

const { TestDatabaseManager } = require('../../helpers/db-setup');
const { loaders } = require('../../../src/features/common/utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

async function runTest(name, testFn) {
    try {
        await testFn();
        console.log(`✅ PASS: ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        testsFailed++;
        failedTests.push({ name, error: error.message });
    }
}

async function main() {
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🧪 SQLITE INTEGRATION TESTS - Sprint 2');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const dbManager = new TestDatabaseManager();
    let db;

    try {
        // Setup
        console.log('⚙️  Setting up SQLite database...\n');
        db = dbManager.setupSQLite();

        if (!db || db.constructor.name === 'MockDatabase') {
            console.log('⚠️  SQLite (better-sqlite3) not available. Using mock.');
            console.log('   Install with: npm install better-sqlite3\n');
            process.exit(0);
        }

        dbManager.cleanSQLite();

        // Test 1: Basic operations - Insert
        await runTest('Test 1: Should insert document successfully', async () => {
            const id = uuidv4();
            const stmt = db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at) VALUES (?, ?, ?, ?, ?)');
            const result = stmt.run(id, 'Test Document', 'Test content here', 'txt', Date.now());

            if (result.changes !== 1) {
                throw new Error('Insert did not affect exactly 1 row');
            }

            // Verify insertion
            const row = db.prepare('SELECT * FROM test_documents WHERE id = ?').get(id);
            if (!row || row.id !== id) {
                throw new Error('Inserted row not found');
            }
        });

        // Test 2: Query data
        await runTest('Test 2: Should query inserted documents', async () => {
            const docs = db.prepare('SELECT * FROM test_documents').all();
            if (docs.length === 0) {
                throw new Error('No documents found');
            }
            if (!docs[0].title) {
                throw new Error('Document missing title field');
            }
        });

        // Test 3: Update data
        await runTest('Test 3: Should update existing document', async () => {
            const id = uuidv4();
            db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
                id, 'Original Title', 'Original content', 'md', Date.now()
            );

            const stmt = db.prepare('UPDATE test_documents SET title = ? WHERE id = ?');
            const result = stmt.run('Updated Title', id);

            if (result.changes !== 1) {
                throw new Error('Update did not affect exactly 1 row');
            }

            // Verify update
            const row = db.prepare('SELECT title FROM test_documents WHERE id = ?').get(id);
            if (row.title !== 'Updated Title') {
                throw new Error('Title was not updated correctly');
            }
        });

        // Test 4: Delete data with foreign key constraint
        await runTest('Test 4: Should delete document and cascade to chunks', async () => {
            const docId = uuidv4();
            db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
                docId, 'To Delete', 'Content to delete', 'txt', Date.now()
            );

            // Insert related chunks
            const chunkId = uuidv4();
            db.prepare('INSERT INTO test_chunks (id, document_id, chunk_index, content) VALUES (?, ?, ?, ?)').run(
                chunkId, docId, 0, 'Chunk content'
            );

            // Enable foreign keys (SQLite needs this)
            db.pragma('foreign_keys = ON');

            // Delete document
            const result = db.prepare('DELETE FROM test_documents WHERE id = ?').run(docId);
            if (result.changes !== 1) {
                throw new Error('Delete did not affect exactly 1 row');
            }

            // Verify cascade (chunk should also be deleted due to FK constraint)
            const chunk = db.prepare('SELECT * FROM test_chunks WHERE document_id = ?').get(docId);
            if (chunk) {
                throw new Error('Chunk was not deleted (FK cascade failed)');
            }
        });

        // Test 5: Transactions
        await runTest('Test 5: Should handle transactions correctly', async () => {
            const insertMany = db.transaction((docs) => {
                for (const doc of docs) {
                    db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
                        doc.id, doc.title, doc.content, doc.file_type, doc.created_at
                    );
                }
            });

            const docs = [
                { id: uuidv4(), title: 'TX Doc 1', content: 'Content 1', file_type: 'txt', created_at: Date.now() },
                { id: uuidv4(), title: 'TX Doc 2', content: 'Content 2', file_type: 'md', created_at: Date.now() },
                { id: uuidv4(), title: 'TX Doc 3', content: 'Content 3', file_type: 'pdf', created_at: Date.now() }
            ];

            insertMany(docs);

            // Verify all inserted
            const count = db.prepare("SELECT COUNT(*) as count FROM test_documents WHERE title LIKE 'TX Doc%'").get();
            if (count.count !== 3) {
                throw new Error('Transaction did not insert all documents');
            }
        });

        // Test 6: Prepared statements performance
        await runTest('Test 6: Should use prepared statements efficiently', async () => {
            const startTime = Date.now();

            const insert = db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at, indexed) VALUES (?, ?, ?, ?, ?, ?)');

            for (let i = 0; i < 100; i++) {
                insert.run(uuidv4(), `Perf Test ${i}`, 'Content', 'txt', Date.now(), 0);
            }

            const duration = Date.now() - startTime;

            if (duration > 1000) {
                throw new Error(`Prepared statements too slow: ${duration}ms (expected < 1000ms)`);
            }

            // Verify count
            const result = db.prepare("SELECT COUNT(*) as count FROM test_documents WHERE title LIKE 'Perf Test%'").get();
            if (result.count !== 100) {
                throw new Error('Not all records were inserted');
            }

            console.log(`      └─ Inserted 100 rows in ${duration}ms using prepared statements`);
        });

        // Test 7: Full-text search with LIKE
        await runTest('Test 7: Should perform text search', async () => {
            db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
                uuidv4(), 'Search Test', 'This is searchable content about databases', 'txt', Date.now()
            );

            const results = db.prepare("SELECT * FROM test_documents WHERE content LIKE ?").all('%searchable%');

            if (results.length === 0) {
                throw new Error('Search did not find any results');
            }
            if (!results[0].content.includes('searchable')) {
                throw new Error('Search result does not contain search term');
            }
        });

        // Test 8: Indexing flag update
        await runTest('Test 8: Should update indexed flag', async () => {
            const id = uuidv4();
            db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at, indexed) VALUES (?, ?, ?, ?, ?, ?)').run(
                id, 'Index Test', 'Content to index', 'txt', Date.now(), 0
            );

            // Update indexed flag
            db.prepare('UPDATE test_documents SET indexed = ? WHERE id = ?').run(1, id);

            // Verify
            const row = db.prepare('SELECT indexed FROM test_documents WHERE id = ?').get(id);
            if (row.indexed !== 1) {
                throw new Error('Indexed flag was not updated');
            }
        });

        // Test 9: Bulk operations with transaction
        await runTest('Test 9: Should handle bulk operations in transaction', async () => {
            const startTime = Date.now();

            const bulkInsert = db.transaction((count) => {
                const stmt = db.prepare('INSERT INTO test_documents (id, title, content, file_type, created_at) VALUES (?, ?, ?, ?, ?)');
                for (let i = 0; i < count; i++) {
                    stmt.run(uuidv4(), `Bulk ${i}`, 'Bulk content', 'txt', Date.now());
                }
            });

            bulkInsert(500);

            const duration = Date.now() - startTime;

            if (duration > 2000) {
                throw new Error(`Bulk transaction too slow: ${duration}ms (expected < 2000ms)`);
            }

            // Verify count
            const result = db.prepare("SELECT COUNT(*) as count FROM test_documents WHERE title LIKE 'Bulk%'").get();
            if (result.count !== 500) {
                throw new Error('Not all bulk records were inserted');
            }

            console.log(`      └─ Inserted 500 rows in transaction in ${duration}ms`);
        });

        // Test 10: Database info and pragmas
        await runTest('Test 10: Should query database pragmas and info', async () => {
            // Check foreign keys setting
            const fkResult = db.pragma('foreign_keys', { simple: true });
            if (typeof fkResult !== 'number') {
                throw new Error('Foreign keys pragma query failed');
            }

            // Check page size
            const pageSize = db.pragma('page_size', { simple: true });
            if (!pageSize || pageSize <= 0) {
                throw new Error('Page size pragma query failed');
            }

            // Check database size
            const pageCount = db.pragma('page_count', { simple: true });
            if (!pageCount || pageCount <= 0) {
                throw new Error('Page count pragma query failed');
            }

            const dbSizeBytes = pageSize * pageCount;
            console.log(`      └─ Database size: ${Math.round(dbSizeBytes / 1024)} KB`);
        });

    } catch (error) {
        console.error('\n❌ Setup or teardown error:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        dbManager.cleanSQLite();
        dbManager.closeAll();
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    console.log(`Total Tests:  ${testsPassed + testsFailed}`);
    console.log(`✅ Passed:     ${testsPassed} (${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%)`);
    console.log(`❌ Failed:     ${testsFailed} (${Math.round((testsFailed / (testsPassed + testsFailed)) * 100)}%)`);

    if (testsFailed > 0) {
        console.log('\n❌ Failed tests:');
        failedTests.forEach(({ name, error }) => {
            console.log(`   - ${name}`);
            console.log(`     Error: ${error}`);
        });
        console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
        process.exit(1);
    } else {
        console.log('\n🎉 ALL TESTS PASSED!\n');
        console.log('✅ SQLite integration is working correctly.\n');
        process.exit(0);
    }
}

// Run tests
main().catch(error => {
    console.error('\n💥 Unexpected error:', error);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});
