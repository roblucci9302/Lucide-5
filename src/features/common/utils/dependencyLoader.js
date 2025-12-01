/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔧 DEPENDENCY LOADER - Graceful Degradation
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Gère le chargement des dépendances optionnelles avec fallbacks.
 *
 * DÉPENDANCES GÉRÉES:
 * - uuid : Génération d'IDs uniques
 * - better-sqlite3 : Base de données SQLite
 * - pg : PostgreSQL client
 * - mysql2 : MySQL client
 * - tesseract.js : OCR
 *
 * USAGE:
 * const { loadOptionalDependency } = require('./dependencyLoader');
 * const uuid = loadOptionalDependency('uuid', mockUuid);
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Load an optional dependency with graceful fallback
 * @param {string} moduleName - Name of the module to load
 * @param {*} fallback - Fallback value if module not available
 * @param {boolean} warnOnMissing - Whether to log warning if missing (default: true)
 * @returns {*} The loaded module or fallback
 */
function loadOptionalDependency(moduleName, fallback = null, warnOnMissing = true) {
  try {
    return require(moduleName);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      if (warnOnMissing) {
        console.warn(`[DependencyLoader] Optional dependency '${moduleName}' not found. Using fallback.`);
        console.warn(`[DependencyLoader] To install: npm install ${moduleName}`);
      }
      return fallback;
    }
    // Re-throw other errors (not MODULE_NOT_FOUND)
    throw error;
  }
}

/**
 * Mock UUID module for testing environments
 */
const mockUuid = {
  v4: () => {
    // Simple UUID v4 generator for testing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

/**
 * Mock SQLite Database class for testing environments
 */
class MockDatabase {
  constructor(filename, options) {
    console.warn('[MockSQLite] Using mock database. Install better-sqlite3 for real database support.');
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

  exec(sql) {
    return this;
  }

  pragma(pragma, options) {
    return [];
  }

  close() {
    this.open = false;
  }
}

const mockSqlite = MockDatabase;

/**
 * Mock PostgreSQL client
 */
const mockPostgres = {
  Pool: class MockPool {
    async query() {
      throw new Error('PostgreSQL not available. Install with: npm install pg');
    }
    async end() {}
  }
};

/**
 * Mock MySQL client (promise-compatible)
 */
const mockMySQL = {
  createConnection: () => {
    return Promise.reject(new Error('MySQL not available. Install with: npm install mysql2'));
  },
  createPool: () => {
    return Promise.reject(new Error('MySQL not available. Install with: npm install mysql2'));
  }
};

/**
 * Mock MongoDB client
 */
const mockMongoDB = {
  MongoClient: class MockMongoClient {
    constructor() {
      throw new Error('MongoDB not available. Install with: npm install mongodb');
    }
  }
};

/**
 * Check if running in test environment
 */
function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' ||
         typeof jest !== 'undefined' ||
         typeof global.it !== 'undefined';
}

/**
 * Load dependency with automatic fallback to mock
 * @param {string} moduleName - Module name
 * @param {*} mockFallback - Mock fallback when module not found
 */
function loadDependency(moduleName, mockFallback) {
  const isTest = isTestEnvironment();
  const warnOnMissing = !isTest; // Don't warn in test environment

  return loadOptionalDependency(moduleName, mockFallback, warnOnMissing);
}

/**
 * Pre-configured loaders for common dependencies
 */
const loaders = {
  /**
   * Load UUID module
   */
  loadUuid: () => loadDependency('uuid', mockUuid),

  /**
   * Load SQLite module
   */
  loadSqlite: () => loadDependency('better-sqlite3', mockSqlite),

  /**
   * Load PostgreSQL module
   */
  loadPostgres: () => loadDependency('pg', mockPostgres),

  /**
   * Load MySQL module
   */
  loadMySQL: () => loadDependency('mysql2', mockMySQL),

  /**
   * Load MongoDB module
   */
  loadMongoDB: () => loadDependency('mongodb', mockMongoDB),

  /**
   * Load Tesseract.js module (OCR)
   */
  loadTesseract: () => loadDependency('tesseract.js', null),

  /**
   * Load pdf-parse module (PDF text extraction)
   */
  loadPdfParse: () => loadDependency('pdf-parse', null),

  /**
   * Load mammoth module (DOCX text extraction)
   */
  loadMammoth: () => loadDependency('mammoth', null)
};

module.exports = {
  loadOptionalDependency,
  loadDependency,
  loaders,
  mockUuid,
  mockSqlite,
  mockPostgres,
  mockMySQL,
  mockMongoDB,
  isTestEnvironment
};
