/**
 * PostgreSQL Integration Tests - Connection & Queries
 *
 * These tests require Docker to be running with:
 * npm run docker:start
 *
 * Run with: node tests/integration/postgres/connection.test.js
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
    console.log('🧪 POSTGRESQL INTEGRATION TESTS - Sprint 1');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const dbManager = new TestDatabaseManager();
    let pool;

    try {
        // Setup
        console.log('⚙️  Setting up PostgreSQL connection...\n');
        pool = await dbManager.setupPostgres();

        if (!pool) {
            console.log('⚠️  PostgreSQL not available. Skipping tests.');
            console.log('   Start Docker with: npm run docker:start\n');
            process.exit(0);
        }

        await dbManager.cleanPostgres();

        // Test 1: Basic connection
        await runTest('Test 1: Should connect to PostgreSQL successfully', async () => {
            const result = await pool.query('SELECT NOW() as current_time');
            if (!result.rows || result.rows.length === 0) {
                throw new Error('No rows returned from SELECT NOW()');
            }
            if (!result.rows[0].current_time) {
                throw new Error('No current_time in result');
            }
        });

        // Test 2: Database version
        await runTest('Test 2: Should retrieve PostgreSQL version', async () => {
            const result = await pool.query('SELECT version() as version');
            if (!result.rows[0].version.includes('PostgreSQL')) {
                throw new Error('Version string does not include "PostgreSQL"');
            }
        });

        // Test 3: Insert data
        await runTest('Test 3: Should insert data into test_external_sources', async () => {
            const id = uuidv4();
            const result = await pool.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [id, 'test_user_1', 'postgres', 'Test Source', JSON.stringify({ host: 'localhost' })]
            );
            if (result.rows.length !== 1) {
                throw new Error('Insert did not return exactly 1 row');
            }
            if (result.rows[0].id !== id) {
                throw new Error('Returned ID does not match inserted ID');
            }
        });

        // Test 4: Query data
        await runTest('Test 4: Should query inserted data', async () => {
            const result = await pool.query(
                'SELECT * FROM test_external_sources WHERE user_id = $1',
                ['test_user_1']
            );
            if (result.rows.length === 0) {
                throw new Error('No rows found for test_user_1');
            }
            if (result.rows[0].source_type !== 'postgres') {
                throw new Error('Source type mismatch');
            }
        });

        // Test 5: Update data
        await runTest('Test 5: Should update existing data', async () => {
            const result = await pool.query(
                'UPDATE test_external_sources SET status = $1 WHERE user_id = $2 RETURNING *',
                ['inactive', 'test_user_1']
            );
            if (result.rows.length === 0) {
                throw new Error('Update did not return any rows');
            }
            if (result.rows[0].status !== 'inactive') {
                throw new Error('Status was not updated correctly');
            }
        });

        // Test 6: JSON queries
        await runTest('Test 6: Should query JSONB fields', async () => {
            const id = uuidv4();
            await pool.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ($1, $2, $3, $4, $5)',
                [id, 'test_user_2', 'postgres', 'JSON Test', JSON.stringify({ host: 'localhost', port: 5432, ssl: true })]
            );

            const result = await pool.query(
                "SELECT connection_config->>'host' as host, connection_config->>'port' as port FROM test_external_sources WHERE id = $1",
                [id]
            );

            if (result.rows[0].host !== 'localhost') {
                throw new Error('JSON host extraction failed');
            }
            if (result.rows[0].port !== '5432') {
                throw new Error('JSON port extraction failed');
            }
        });

        // Test 7: Transactions
        await runTest('Test 7: Should handle transactions correctly', async () => {
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                const id1 = uuidv4();
                await client.query(
                    'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ($1, $2, $3, $4, $5)',
                    [id1, 'tx_user', 'postgres', 'TX Source 1', '{}']
                );

                const id2 = uuidv4();
                await client.query(
                    'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ($1, $2, $3, $4, $5)',
                    [id2, 'tx_user', 'mysql', 'TX Source 2', '{}']
                );

                await client.query('COMMIT');

                // Verify both inserted
                const result = await pool.query('SELECT COUNT(*) FROM test_external_sources WHERE user_id = $1', ['tx_user']);
                if (parseInt(result.rows[0].count) !== 2) {
                    throw new Error('Transaction did not commit both records');
                }
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        });

        // Test 8: Delete data
        await runTest('Test 8: Should delete data with CASCADE', async () => {
            const sourceId = uuidv4();
            await pool.query(
                'INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ($1, $2, $3, $4, $5)',
                [sourceId, 'delete_user', 'postgres', 'To Delete', '{}']
            );

            // Insert related data
            await pool.query(
                'INSERT INTO test_external_data (id, source_id, data_type, content) VALUES ($1, $2, $3, $4)',
                [uuidv4(), sourceId, 'test', 'Test content']
            );

            // Delete source (should cascade to data)
            await pool.query('DELETE FROM test_external_sources WHERE id = $1', [sourceId]);

            // Verify cascade
            const result = await pool.query('SELECT COUNT(*) FROM test_external_data WHERE source_id = $1', [sourceId]);
            if (parseInt(result.rows[0].count) !== 0) {
                throw new Error('CASCADE delete did not work');
            }
        });

        // Test 9: Parameterized queries (SQL injection protection)
        await runTest('Test 9: Should handle parameterized queries safely', async () => {
            const maliciousInput = "'; DROP TABLE test_external_sources; --";

            // This should NOT drop the table
            await pool.query(
                'SELECT * FROM test_external_sources WHERE source_name = $1',
                [maliciousInput]
            );

            // Verify table still exists
            const result = await pool.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_external_sources') as exists"
            );
            if (!result.rows[0].exists) {
                throw new Error('Table was dropped - SQL injection vulnerability!');
            }
        });

        // Test 10: Performance - Bulk insert
        await runTest('Test 10: Should handle bulk insert efficiently', async () => {
            const startTime = Date.now();
            const values = [];

            for (let i = 0; i < 100; i++) {
                values.push(`('${uuidv4()}', 'bulk_user', 'postgres', 'Bulk ${i}', '{}')`);
            }

            await pool.query(
                `INSERT INTO test_external_sources (id, user_id, source_type, source_name, connection_config) VALUES ${values.join(',')}`
            );

            const duration = Date.now() - startTime;

            if (duration > 5000) {
                throw new Error(`Bulk insert too slow: ${duration}ms (expected < 5000ms)`);
            }

            // Verify count
            const result = await pool.query("SELECT COUNT(*) FROM test_external_sources WHERE user_id = 'bulk_user'");
            if (parseInt(result.rows[0].count) !== 100) {
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
        console.log('✅ PostgreSQL integration is working correctly.\n');
        process.exit(0);
    }
}

// Run tests
main().catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
});
