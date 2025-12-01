# Dependency Management - Graceful Degradation System

## Overview

Lucidi uses a graceful degradation system for optional dependencies, allowing the application to run even when certain npm packages are not installed. This is particularly useful for development environments where some dependencies (like PostgreSQL or MySQL drivers) may not be needed.

## Architecture

### Dependency Loader (`src/features/common/utils/dependencyLoader.js`)

The central dependency loading system that provides:
- **Automatic fallback to mocks** when dependencies are unavailable
- **Environment-aware warnings** (silent in test mode, verbose in production)
- **Type-compatible mocks** that match the API of real modules

## Optional Dependencies

### 1. UUID (`uuid`)

**Used by:** Document services, indexing services, knowledge organizer

**Mock behavior:** Generates simple UUID v4 strings using Math.random()

**Installation (optional):**
```bash
npm install uuid
```

**Without installation:** Mock UUIDs will be generated, suitable for testing and development.

---

### 2. SQLite (`better-sqlite3`)

**Used by:** Core database client (sqliteClient.js)

**Mock behavior:** Provides a MockDatabase class with stub methods

**Installation (optional):**
```bash
npm install better-sqlite3
```

**Note:** better-sqlite3 is a native module that may require build tools on some systems.

**Without installation:** Mock database will return empty results. Real data persistence requires this module.

---

### 3. PostgreSQL (`pg`)

**Used by:** External data service for PostgreSQL connections

**Mock behavior:** Returns helpful error messages when connection attempts are made

**Installation (optional):**
```bash
npm install pg
```

**Without installation:** PostgreSQL connection features will be disabled with clear error messages.

---

### 4. MySQL (`mysql2`)

**Used by:** External data service for MySQL connections

**Mock behavior:** Returns promise-compatible error messages

**Installation (optional):**
```bash
npm install mysql2
```

**Without installation:** MySQL connection features will be disabled with clear error messages.

---

## Usage Examples

### Loading Dependencies

All services should use the dependency loader instead of direct `require()`:

```javascript
// ❌ Old way (hard dependency):
const { v4: uuidv4 } = require('uuid');

// ✅ New way (graceful degradation):
const { loaders } = require('../utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
```

### Detecting Mocks

For external database services, detect mock implementations:

```javascript
const pg = loaders.loadPostgres();

// Check if it's a mock
if (pg.Pool && pg.Pool.name === 'MockPool') {
  return {
    success: false,
    error: 'PostgreSQL driver not installed. Run: npm install pg',
    needsInstall: true
  };
}
```

## Test Coverage

The dependency management system maintains high test coverage:

| Test Suite | Status | Coverage |
|------------|--------|----------|
| Phase 2 Integration | ✅ 10/10 | 100% |
| Day 5 (RAG Multi-source) | ✅ 20/20 | 100% |
| Day 6 (Dashboard) | ✅ 15/15 | 100% |
| Day 3 (Knowledge Graph) | ⚠️ 23/24 | 95.8% |
| Day 4 (External DB) | ⚠️ 21/23 | 91.3% |
| **Total** | **89/92** | **96.7%** |

*Note: Remaining failures are related to firebase modules (separate issue)*

## Development Workflow

### For Core Development (No External Databases)

No additional installation needed! The mocks will handle:
- UUID generation
- SQLite operations (limited)
- Document processing

### For External Database Features

Install only what you need:

```bash
# PostgreSQL support
npm install pg

# MySQL support
npm install mysql2

# Both
npm install pg mysql2
```

### For Production

Install all dependencies:

```bash
npm install uuid better-sqlite3 pg mysql2
```

## Mock Implementations

### MockUuid

```javascript
const mockUuid = {
  v4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
```

### MockDatabase (SQLite)

```javascript
class MockDatabase {
  constructor(filename, options) {
    this.filename = filename;
    this.open = false;
  }

  prepare(sql) {
    return {
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      get: () => null,
      all: () => []
    };
  }

  exec(sql) { return this; }
  pragma(pragma, options) { return []; }
  close() { this.open = false; }
}
```

### MockPostgres

```javascript
const mockPostgres = {
  Pool: class MockPool {
    async query() {
      throw new Error('PostgreSQL not available. Install with: npm install pg');
    }
    async end() {}
  }
};
```

### MockMySQL

```javascript
const mockMySQL = {
  createConnection: () => {
    return Promise.reject(new Error('MySQL not available. Install with: npm install mysql2'));
  },
  createPool: () => {
    return Promise.reject(new Error('MySQL not available. Install with: npm install mysql2'));
  }
};
```

## Troubleshooting

### Warning Messages

If you see warnings like:
```
[DependencyLoader] Optional dependency 'uuid' not found. Using fallback.
[DependencyLoader] To install: npm install uuid
```

This is informational - the application will continue working with mocks. Install the dependency if you need the full functionality.

### Suppressing Warnings in Tests

Warnings are automatically suppressed when:
- `NODE_ENV=test`
- Running under Jest
- `global.it` is defined (Mocha/Jest)

### Build Failures (better-sqlite3)

If `npm install better-sqlite3` fails with build errors:

**On Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3
npm install better-sqlite3
```

**On macOS:**
```bash
xcode-select --install
npm install better-sqlite3
```

**On Windows:**
```bash
npm install --global windows-build-tools
npm install better-sqlite3
```

## Future Enhancements (Phase 3)

Planned improvements:
1. Docker Compose setup with PostgreSQL and MySQL containers for integration testing
2. Separate npm scripts: `test:unit` (with mocks) and `test:integration` (with real databases)
3. Dependency status dashboard showing which modules are installed
4. Automatic dependency installation prompts in development mode

## Related Files

- `src/features/common/utils/dependencyLoader.js` - Core loader implementation
- `src/features/common/services/sqliteClient.js` - SQLite client with graceful degradation
- `src/features/common/services/externalDataService.js` - External DB service with mocks
- `fix_uuid_imports.sh` - Script to update uuid imports across the codebase

## Support

For issues or questions about dependency management:
1. Check if the warning/error is from a mock (informational only)
2. Install the optional dependency if you need the real functionality
3. Review test results to ensure core functionality is working
4. Contact the development team if you encounter crashes or data loss
