# Lucidi Integration Tests

Comprehensive integration test suite for Lucidi's database functionality.

## Overview

This test suite validates real database operations using:
- **PostgreSQL** - Via Docker container
- **MySQL** - Via Docker container
- **SQLite** - Local file database

## Quick Start

```bash
# 1. Start Docker services
npm run docker:start

# 2. Run all integration tests
npm run test:integration

# 3. Stop services when done
npm run docker:stop
```

## Test Suites

### PostgreSQL Tests (10 tests)
**File:** `tests/integration/postgres/connection.test.js`

Tests:
1. Basic connection
2. Version check
3. INSERT operations
4. SELECT queries
5. UPDATE operations
6. JSONB field queries
7. Transactions (BEGIN/COMMIT/ROLLBACK)
8. CASCADE delete
9. SQL injection protection
10. Bulk insert performance

**Run:** `npm run test:integration:postgres`

---

### MySQL Tests (10 tests)
**File:** `tests/integration/mysql/connection.test.js`

Tests:
1. Basic connection
2. Version check
3. INSERT operations
4. SELECT queries
5. UPDATE operations
6. JSON field extraction
7. Transactions
8. CASCADE delete
9. SQL injection protection
10. Bulk insert performance

**Run:** `npm run test:integration:mysql`

---

### SQLite Tests (10 tests)
**File:** `tests/integration/sqlite/operations.test.js`

Tests:
1. INSERT operations
2. SELECT queries
3. UPDATE operations
4. DELETE with foreign key cascade
5. Transaction handling
6. Prepared statements performance
7. Text search (LIKE)
8. Indexed flag updates
9. Bulk operations in transaction
10. Database pragmas and info

**Run:** `npm run test:integration:sqlite`

## Helpers

### TestDatabaseManager
**File:** `tests/helpers/db-setup.js`

Manages database connections for testing:
- `setupPostgres()` - Connect to PostgreSQL
- `setupMySQL()` - Connect to MySQL
- `setupSQLite()` - Create SQLite database
- `cleanAll()` - Clear all test data
- `closeAll()` - Close all connections

### FixturesLoader
**File:** `tests/helpers/fixtures-loader.js`

Load test data from JSON files:
- `loadExternalSources()` - Load external source fixtures
- `loadDocuments()` - Load document fixtures
- `createDocument()` - Generate test document
- `createExternalSource()` - Generate test source

## Fixtures

**Location:** `tests/fixtures/`

- `external-sources.json` - Sample external data sources
- `documents.json` - Sample documents

## Utility Scripts

### Check Dependencies
```bash
npm run deps:check
```
Shows which optional dependencies are installed.

### Database Status
```bash
npm run deps:status
```
Checks health of Docker database services.

## Requirements

### For Docker Tests (PostgreSQL, MySQL)
- Docker Desktop installed and running
- Ports 5432, 3306, 6379 available
- Optional: `npm install pg mysql2`

### For SQLite Tests
- Optional: `npm install better-sqlite3`
- No Docker required

## Troubleshooting

### Services not starting
```bash
# Check Docker status
npm run deps:status

# View logs
cd docker && docker-compose logs -f

# Reset environment
npm run docker:reset
```

### Tests failing
```bash
# Verify dependencies
npm run deps:check

# Check service health
npm run docker:health

# Restart services
npm run docker:stop && npm run docker:start
```

### Port conflicts
If ports 5432, 3306, or 6379 are in use:

1. Edit `docker/docker-compose.yml`
2. Change port mappings (e.g., `"5433:5432"`)
3. Update test connection configs in `tests/helpers/db-setup.js`

## CI/CD

These tests can run in GitHub Actions with Docker services.
See `.github/workflows/integration-tests.yml` (Sprint 3).

## Documentation

- Complete Phase 3 plan: `PHASE_3_PLAN_AND_ROADMAP.md`
- Docker setup: `docker/scripts/start.sh`
- Dependency management: `DEPENDENCY_MANAGEMENT.md`
