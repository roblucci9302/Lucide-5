/**
 * MySQL Integration Tests - Connection & Queries
 *
 * These tests require Docker to be running with:
 * npm run docker:start
 *
 * Run with: node tests/integration/mysql/connection.test.js
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
    console.log('🧪 MYSQL INTEGRATION TESTS - Sprint 2');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const dbManager = new TestDatabaseManager();
    let connection;

    try {
        // Setup
        console.log('⚙️  Setting up MySQL connection...\n');
        connection = await dbManager.setupMySQL();

        if (!connection) {
            console.log('⚠️  MySQL not available. Skipping tests.');
            console.log('   Start Docker with: npm run docker:start\n');
            process.exit(0);
        }

        await dbManager.cleanMySQL();

        // Test 1: Basic connection
        await runTest('Test 1: Should connect to MySQL successfully', async () => {
            const [result] = await connection.query('SELECT NOW() as current_time');
            if (!result || result.length === 0) {
                throw new Error('No rows returned from SELECT NOW()');
            }
            if (!result[0].current_time) {
                throw new Error('No current_time in result');
            }
        });

        // Test 2: Database version
        await runTest('Test 2: Should retrieve MySQL version', async () => {
            const [result] = await connection.query('SELECT VERSION() as version');
            if (!result[0].version.includes('8.')) {
                throw new Error('Version string does not include "8."');
            }
        });

        // Test 3: Insert data
        await runTest('Test 3: Should insert data into test_external_sources', async () => {
            const id = uuidv4();
            const [result] = await connection.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES (?, ?, ?, ?, ?)',
                [id, 'test_user_1', 'mysql', 'Test Source', JSON.stringify({ host: 'localhost' })]
            );
            if (result.affectedRows !== 1) {
                throw new Error('Insert did not affect exactly 1 row');
            }

            // Verify insertion
            const [rows] = await connection.query('SELECT * FROM test_external_sources WHERE id = ?', [id]);
            if (rows.length !== 1 || rows[0].id !== id) {
                throw new Error('Inserted row not found or ID mismatch');
            }
        });

        // Test 4: Query data
        await runTest('Test 4: Should query inserted data', async () => {
            const [result] = await connection.query(
                'SELECT * FROM test_external_sources WHERE user_id = ?',
                ['test_user_1']
            );
            if (result.length === 0) {
                throw new Error('No rows found for test_user_1');
            }
            if (result[0].source_type !== 'mysql') {
                throw new Error('Source type mismatch');
            }
        });

        // Test 5: Update data
        await runTest('Test 5: Should update existing data', async () => {
            const [result] = await connection.query(
                'UPDATE test_external_sources SET status = ? WHERE user_id = ?',
                ['inactive', 'test_user_1']
            );
            if (result.affectedRows === 0) {
                throw new Error('Update did not affect any rows');
            }

            // Verify update
            const [rows] = await connection.query('SELECT status FROM test_external_sources WHERE user_id = ?', ['test_user_1']);
            if (rows[0].status !== 'inactive') {
                throw new Error('Status was not updated correctly');
            }
        });

        // Test 6: JSON queries
        await runTest('Test 6: Should query JSON fields', async () => {
            const id = uuidv4();
            await connection.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES (?, ?, ?, ?, ?)',
                [id, 'test_user_2', 'mysql', 'JSON Test', JSON.stringify({ host: 'localhost', port: 3306, ssl: true })]
            );

            const [result] = await connection.query(
                "SELECT JSON_EXTRACT(connection_config, '$.host') as host, JSON_EXTRACT(connection_config, '$.port') as port FROM test_external_sources WHERE id = ?",
                [id]
            );

            // MySQL returns JSON values with quotes, need to unquote
            const host = JSON.parse(result[0].host);
            const port = result[0].port;

            if (host !== 'localhost') {
                throw new Error('JSON host extraction failed');
            }
            if (port !== 3306) {
                throw new Error('JSON port extraction failed');
            }
        });

        // Test 7: Transactions
        await runTest('Test 7: Should handle transactions correctly', async () => {
            await connection.beginTransaction();

            try {
                const id1 = uuidv4();
                await connection.query(
                    'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES (?, ?, ?, ?, ?)',
                    [id1, 'tx_user', 'mysql', 'TX Source 1', '{}']
                );

                const id2 = uuidv4();
                await connection.query(
                    'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES (?, ?, ?, ?, ?)',
                    [id2, 'tx_user', 'postgres', 'TX Source 2', '{}']
                );

                await connection.commit();

                // Verify both inserted
                const [result] = await connection.query('SELECT COUNT(*) as count FROM test_external_sources WHERE user_id = ?', ['tx_user']);
                if (result[0].count !== 2) {
                    throw new Error('Transaction did not commit both records');
                }
            } catch (e) {
                await connection.rollback();
                throw e;
            }
        });

        // Test 8: Delete data with CASCADE
        await runTest('Test 8: Should delete data with CASCADE', async () => {
            const sourceId = uuidv4();
            await connection.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES (?, ?, ?, ?, ?)',
                [sourceId, 'delete_user', 'mysql', 'To Delete', '{}']
            );

            // Insert related data
            const dataId = uuidv4();
            await connection.query(
                'INSERT INTO test_external_data (id, source_id, data_type, content) VALUES (?, ?, ?, ?)',
                [dataId, sourceId, 'test', 'Test content']
            );

            // Delete source (should cascade to data)
            await connection.query('DELETE FROM test_external_sources WHERE id = ?', [sourceId]);

            // Verify cascade
            const [result] = await connection.query('SELECT COUNT(*) as count FROM test_external_data WHERE source_id = ?', [sourceId]);
            if (result[0].count !== 0) {
                throw new Error('CASCADE delete did not work');
            }
        });

        // Test 9: Parameterized queries (SQL injection protection)
        await runTest('Test 9: Should handle parameterized queries safely', async () => {
            const maliciousInput = "'; DROP TABLE test_external_sources; --";

            // This should NOT drop the table
            await connection.query(
                'SELECT * FROM test_external_sources WHERE source_name = ?',
                [maliciousInput]
            );

            // Verify table still exists
            const [result] = await connection.query(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'test_external_sources'"
            );
            if (result[0].count === 0) {
                throw new Error('Table was dropped - SQL injection vulnerability!');
            }
        });

        // Test 10: Performance - Bulk insert
        await runTest('Test 10: Should handle bulk insert efficiently', async () => {
            const startTime = Date.now();
            const values = [];

            for (let i = 0; i < 100; i++) {
                values.push([uuidv4(), 'bulk_user', 'mysql', `Bulk ${i}`, '{}']);
            }

            // MySQL bulk insert syntax
            await connection.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ?',
                [values]
            );

            const duration = Date.now() - startTime;

            if (duration > 5000) {
                throw new Error(`Bulk insert too slow: ${duration}ms (expected < 5000ms)`);
            }

            // Verify count
            const [result] = await connection.query("SELECT COUNT(*) as count FROM test_external_sources WHERE user_id = 'bulk_user'");
            if (result[0].count !== 100) {
                throw new Error('Not all bulk records were inserted');
            }

            console.log(`      └─ Inserted 100 rows in ${duration}ms`);
        });

    } catch (error) {
        console.error('\n❌ Setup or teardown error:', error.message);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await dbManager.closeAll();
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
        console.log('✅ MySQL integration is working correctly.\n');
        process.exit(0);
    }
}

// Run tests
main().catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
});
