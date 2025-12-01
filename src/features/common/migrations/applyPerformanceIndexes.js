/**
 * Apply Performance Indexes Migration
 *
 * Run this script to add database indexes for improved query performance.
 * Can be run multiple times safely (CREATE INDEX IF NOT EXISTS).
 */

const fs = require('fs');
const path = require('path');
const sqliteClient = require('../services/sqliteClient');

async function applyPerformanceIndexes() {
    console.log('[Migration] Applying performance indexes...');

    try {
        // Read SQL file
        const sqlFile = path.join(__dirname, 'add_performance_indexes.sql');
        const sql = fs.readFileSync(sqlFile, 'utf-8');

        // Split by semicolons to get individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        const db = sqliteClient.getDatabase();
        let successCount = 0;

        // Execute each statement
        for (const statement of statements) {
            try {
                db.prepare(statement).run();
                successCount++;

                // Extract index name for logging
                const match = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i);
                if (match) {
                    console.log(`[Migration] ✅ Created index: ${match[1]}`);
                }
            } catch (error) {
                console.error('[Migration] ⚠️ Error creating index:', error.message);
                // Continue with other indexes
            }
        }

        console.log(`[Migration] ✅ Applied ${successCount}/${statements.length} indexes`);
        return { success: true, count: successCount };
    } catch (error) {
        console.error('[Migration] ❌ Error applying indexes:', error);
        return { success: false, error: error.message };
    }
}

// Run if called directly
if (require.main === module) {
    applyPerformanceIndexes()
        .then(result => {
            if (result.success) {
                console.log('[Migration] Migration completed successfully');
                process.exit(0);
            } else {
                console.error('[Migration] Migration failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('[Migration] Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { applyPerformanceIndexes };
