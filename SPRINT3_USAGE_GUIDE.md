# Sprint 3: Usage Guide - Logger, Constants & Repositories

**Date**: 2025-11-10
**Purpose**: Guide for using new Sprint 3 components

---

## 📚 Table of Contents

1. [Structured Logger](#structured-logger)
2. [Constants Configuration](#constants-configuration)
3. [New Repositories](#new-repositories)
4. [Migration Guide](#migration-guide)

---

## 🔍 Structured Logger

### Location
`src/features/common/utils/logger.js`

### Features
- Log levels: DEBUG, INFO, WARN, ERROR
- Contextual logging (service name)
- Colored console output
- Environment-based log level control
- Child loggers for nested contexts

### Basic Usage

```javascript
const { createLogger } = require('../utils/logger');

// Create logger for your service
const logger = createLogger('DocumentService');

// Log at different levels
logger.debug('Detailed debug information');
logger.info('Service initialized successfully');
logger.warn('File size approaching limit', { size: 48 });
logger.error('Failed to upload document', error);
```

### With Data

```javascript
// Log with structured data
logger.info('Document uploaded', {
    documentId: 'abc123',
    filename: 'report.pdf',
    size: 1024000
});

// Log errors with stack traces
try {
    await uploadDocument();
} catch (error) {
    logger.error('Upload failed', error);
}
```

### Child Loggers

```javascript
const serviceLogger = createLogger('RAGService');
const retrievalLogger = serviceLogger.child('retrieval');

retrievalLogger.info('Searching for chunks');
// Output: [RAGService:retrieval] Searching for chunks
```

### Environment Control

```bash
# Set log level via environment variable
export LOG_LEVEL=DEBUG  # Shows all logs
export LOG_LEVEL=INFO   # Shows INFO, WARN, ERROR (default)
export LOG_LEVEL=WARN   # Shows only WARN, ERROR
export LOG_LEVEL=ERROR  # Shows only ERROR
```

### Output Example

```
2025-11-10T10:30:45.123Z INFO [DocumentService] Uploading document: report.pdf (pdf)
2025-11-10T10:30:45.456Z DEBUG [DocumentService] File validation passed
2025-11-10T10:30:46.789Z WARN [DocumentService] Large file detected {"size": 45000000}
2025-11-10T10:30:47.012Z ERROR [DocumentService] Extraction failed {"message": "..."}
```

---

## ⚙️ Constants Configuration

### Location
`src/features/common/config/constants.js`

### Available Constants

#### Query & Pagination

```javascript
const { QUERY } = require('../config/constants');

const limit = options.limit || QUERY.DEFAULT_LIMIT;     // 50
const maxLimit = Math.min(limit, QUERY.MAX_LIMIT);       // 100
const offset = options.offset || QUERY.DEFAULT_OFFSET;   // 0
```

#### Documents

```javascript
const { DOCUMENTS } = require('../config/constants');

// File validation
if (fileSize > DOCUMENTS.MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Max: ${DOCUMENTS.MAX_FILE_SIZE_MB}MB`);
}

// Title validation
if (title.length > DOCUMENTS.MAX_TITLE_LENGTH) {  // 200
    throw new Error('Title too long');
}

// Sort column validation
if (!DOCUMENTS.ALLOWED_SORT_COLUMNS.includes(sortBy)) {
    sortBy = 'created_at';
}
```

#### Sessions

```javascript
const { SESSIONS } = require('../config/constants');

// Validate agent profile
if (!SESSIONS.VALID_PROFILES.includes(profileId)) {
    throw new Error('Invalid profile');
}

// Sort validation
if (!SESSIONS.ALLOWED_SORT_COLUMNS.includes(sortBy)) {
    sortBy = 'updated_at';
}
```

#### RAG Configuration

```javascript
const { RAG } = require('../config/constants');

// Configure RAG retrieval
const maxChunks = Math.min(
    options.maxChunks || RAG.DEFAULT_MAX_CHUNKS,  // 5
    RAG.MAX_MAX_CHUNKS                             // 20
);

const minScore = options.minScore || RAG.MIN_RELEVANCE_SCORE;  // 0.7
const maxTokens = RAG.MAX_CONTEXT_TOKENS;  // 4000
```

#### Indexing

```javascript
const { INDEXING } = require('../config/constants');

// Chunking configuration
const chunkSize = INDEXING.CHUNK_SIZE;        // 500 chars
const overlap = INDEXING.CHUNK_OVERLAP;       // 100 chars
const searchLimit = INDEXING.MAX_CHUNKS_SEARCH;  // 1000
```

#### Tokens

```javascript
const { TOKENS } = require('../config/constants');

function estimateTokens(text) {
    return Math.ceil(text.length / TOKENS.CHARS_PER_TOKEN);  // 4
}
```

### All Constants

```javascript
const { getAllConstants } = require('../config/constants');

const config = getAllConstants();
console.log(config.DOCUMENTS.MAX_FILE_SIZE_MB);  // 50
console.log(config.RAG.MIN_RELEVANCE_SCORE);     // 0.7
```

---

## 🗂️ New Repositories

### Agent Profile Repository

**Location**: `src/features/common/repositories/agentProfile/index.js`

#### Usage

```javascript
const agentProfileRepo = require('../repositories/agentProfile');

// Get active profile
const profileId = await agentProfileRepo.getActiveProfile(userId);

// Set active profile
const success = await agentProfileRepo.setActiveProfile(userId, 'hr_specialist');

// Check if user exists
const exists = await agentProfileRepo.userExists(userId);
```

#### Migration from Service

**Before** (Direct DB access):
```javascript
const db = sqliteClient.getDatabase();
const user = db.prepare('SELECT active_agent_profile FROM users WHERE uid = ?').get(uid);
```

**After** (Repository):
```javascript
const profileId = await agentProfileRepo.getActiveProfile(uid);
```

---

### Conversation History Repository

**Location**: `src/features/common/repositories/conversationHistory/index.js`

#### Usage

```javascript
const conversationHistoryRepo = require('../repositories/conversationHistory');

// Get all sessions
const sessions = await conversationHistoryRepo.getAllSessions(userId, {
    limit: 50,
    offset: 0,
    sortBy: 'updated_at',
    order: 'DESC'
});

// Search sessions
const results = await conversationHistoryRepo.searchSessions(userId, 'meeting notes', {
    tags: ['important'],
    startDate: '2025-01-01',
    agentProfile: 'hr_specialist'
});

// Get messages
const messages = await conversationHistoryRepo.getSessionMessages(sessionId);

// Update metadata
const success = await conversationHistoryRepo.updateMetadata(sessionId, {
    title: 'Updated Title',
    tags: JSON.stringify(['tag1', 'tag2']),
    updated_at: Date.now()
});

// Get statistics
const stats = await conversationHistoryRepo.getSessionStats(userId);
// { total_sessions, active_sessions, total_messages, ... }
```

#### Migration from Service

**Before** (Direct DB access):
```javascript
const db = sqliteClient.getDatabase();
const query = `SELECT * FROM sessions WHERE uid = ?`;
const sessions = db.prepare(query).all(uid);
```

**After** (Repository):
```javascript
const sessions = await conversationHistoryRepo.getAllSessions(uid, options);
```

---

## 🚀 Migration Guide

### Step 1: Add Logger to Service

```javascript
// Before
class DocumentService {
    constructor() {
        console.log('[DocumentService] Service initialized');
    }

    async uploadDocument(uid, fileData) {
        console.log(`Uploading: ${fileData.filename}`);
        console.error('Error:', error);
    }
}

// After
const { createLogger } = require('../utils/logger');

class DocumentService {
    constructor() {
        this.logger = createLogger('DocumentService');
        this.logger.info('Service initialized');
    }

    async uploadDocument(uid, fileData) {
        this.logger.info('Uploading document', { filename: fileData.filename });
        this.logger.error('Upload failed', error);
    }
}
```

### Step 2: Replace Magic Numbers

```javascript
// Before
const limit = options.limit || 50;
if (title.length > 200) throw new Error('Title too long');

// After
const { QUERY, DOCUMENTS } = require('../config/constants');

const limit = options.limit || QUERY.DEFAULT_LIMIT;
if (title.length > DOCUMENTS.MAX_TITLE_LENGTH) {
    throw new Error('Title too long');
}
```

### Step 3: Use Repositories

```javascript
// Before (in agentProfileService.js)
const db = sqliteClient.getDatabase();
const user = db.prepare('SELECT active_agent_profile FROM users WHERE uid = ?').get(uid);

// After
const agentProfileRepo = require('../repositories/agentProfile');
const profileId = await agentProfileRepo.getActiveProfile(uid);
```

---

## 📋 Best Practices

### Logger

1. **Create once, use everywhere**
   ```javascript
   class MyService {
       constructor() {
           this.logger = createLogger('MyService');
       }
   }
   ```

2. **Use appropriate levels**
   - DEBUG: Detailed debugging info (disabled in production)
   - INFO: Important events (service start, operations)
   - WARN: Warnings that don't stop execution
   - ERROR: Errors that need attention

3. **Include context data**
   ```javascript
   logger.info('Operation completed', {
       duration: 1234,
       itemsProcessed: 50
   });
   ```

### Constants

1. **Import only what you need**
   ```javascript
   const { RAG, INDEXING } = require('../config/constants');
   ```

2. **Use descriptive names**
   ```javascript
   // Good
   const maxFileSize = DOCUMENTS.MAX_FILE_SIZE_BYTES;

   // Avoid
   const max = 52428800;  // What is this?
   ```

3. **Document overrides**
   ```javascript
   // When you need to override a constant, document why
   const customChunkSize = 1000;  // Larger chunks for PDF documents
   ```

### Repositories

1. **Always use async/await**
   ```javascript
   const sessions = await conversationHistoryRepo.getAllSessions(uid, options);
   ```

2. **Handle errors gracefully**
   ```javascript
   try {
       const profileId = await agentProfileRepo.getActiveProfile(uid);
   } catch (error) {
       logger.error('Failed to get profile', error);
       return 'lucide_assistant';  // Default fallback
   }
   ```

3. **Prefer repositories over direct DB access**
   - Better testability (can mock repositories)
   - Centralized query logic
   - Easier to maintain

---

## 🧪 Testing

### Testing with Logger

```javascript
// Mock logger in tests
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

service.logger = mockLogger;

// Assert logging
expect(mockLogger.info).toHaveBeenCalledWith('Document uploaded', expect.any(Object));
```

### Testing with Constants

```javascript
const { DOCUMENTS } = require('../config/constants');

test('validates file size', () => {
    const fileSize = 100 * 1024 * 1024;  // 100MB
    expect(fileSize).toBeGreaterThan(DOCUMENTS.MAX_FILE_SIZE_BYTES);
});
```

### Testing with Repositories

```javascript
// Mock repository
jest.mock('../repositories/agentProfile');

const mockRepo = require('../repositories/agentProfile');
mockRepo.getActiveProfile.mockResolvedValue('hr_specialist');

// Test
const profile = await service.getProfile(userId);
expect(profile).toBe('hr_specialist');
```

---

## 📝 Examples

### Complete Service Migration

```javascript
// Before
const sqliteClient = require('./sqliteClient');

class MyService {
    constructor() {
        console.log('[MyService] Initialized');
    }

    async getData(uid) {
        try {
            const limit = 50;  // Magic number
            const db = sqliteClient.getDatabase();  // Direct access
            const data = db.prepare('SELECT * FROM table WHERE uid = ? LIMIT ?').all(uid, limit);
            console.log(`Found ${data.length} items`);
            return data;
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }
}

// After
const { createLogger } = require('../utils/logger');
const { QUERY } = require('../config/constants');
const myRepository = require('../repositories/myRepository');

class MyService {
    constructor() {
        this.logger = createLogger('MyService');
        this.logger.info('Service initialized');
    }

    async getData(uid) {
        try {
            const limit = QUERY.DEFAULT_LIMIT;
            const data = await myRepository.getAllData(uid, { limit });
            this.logger.info('Data retrieved', { count: data.length });
            return data;
        } catch (error) {
            this.logger.error('Failed to retrieve data', error);
            return [];
        }
    }
}
```

---

## 🎯 Summary

Sprint 3 provides:
- ✅ **Structured Logger**: Consistent, contextual logging
- ✅ **Constants**: No more magic numbers
- ✅ **Repositories**: Clean database access layer

**Benefits**:
- Better debugging with structured logs
- Easier maintenance with constants
- Cleaner code with repositories
- More testable architecture

**Next Steps**:
1. Use logger in new code immediately
2. Use constants for all new features
3. Gradually migrate existing code to repositories

---

*End of Sprint 3 Usage Guide*
