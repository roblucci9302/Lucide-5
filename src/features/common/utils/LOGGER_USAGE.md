# Structured Logger Usage Guide

## Overview

The application has a structured logger (`logger.js`) that provides consistent logging with:
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Colored Output**: Easy visual scanning in console
- **Timestamps**: ISO format timestamps for every log
- **Context**: Identify which service/module is logging
- **Child Loggers**: Hierarchical context (e.g., `Service:Method`)
- **Error Handling**: Automatic stack trace extraction

## Basic Usage

### Import Logger

```javascript
const { createLogger } = require('../common/utils/logger');

// Create logger with context
const logger = createLogger('MyService');
```

### Log Levels

```javascript
// DEBUG - Detailed diagnostic information
logger.debug('Processing item', { itemId: '123', step: 1 });

// INFO - General informational messages
logger.info('Service started successfully');

// WARN - Warning conditions
logger.warn('Deprecated method used', { method: 'oldFunction' });

// ERROR - Error conditions
logger.error('Failed to connect', error);
```

### Example Output

```
2025-11-10T17:30:15.123Z INFO [MyService] Service started successfully
2025-11-10T17:30:16.456Z DEBUG [MyService] Processing item {"itemId":"123","step":1}
2025-11-10T17:30:17.789Z WARN [MyService] Deprecated method used {"method":"oldFunction"}
2025-11-10T17:30:18.012Z ERROR [MyService] Failed to connect {"message":"ECONNREFUSED","stack":"..."}
```

## Environment Configuration

Set log level via environment variable:

```bash
# Show all logs including DEBUG
LOG_LEVEL=DEBUG npm start

# Show only INFO and above (default)
LOG_LEVEL=INFO npm start

# Show only WARN and ERROR
LOG_LEVEL=WARN npm start

# Show only ERROR
LOG_LEVEL=ERROR npm start
```

## Child Loggers

Create hierarchical context:

```javascript
const { createLogger } = require('../common/utils/logger');

class DocumentService {
    constructor() {
        this.logger = createLogger('DocumentService');
    }

    async uploadDocument(userId, file) {
        // Create child logger for this method
        const log = this.logger.child('uploadDocument');

        log.info('Starting upload', { userId, filename: file.name });

        try {
            // Process upload
            log.debug('Validating file', { size: file.size });
            // ...
            log.info('Upload successful', { documentId: 'doc-123' });
        } catch (error) {
            log.error('Upload failed', error);
            throw error;
        }
    }
}
```

Output:
```
2025-11-10T17:30:15.123Z INFO [DocumentService:uploadDocument] Starting upload {"userId":"user-1","filename":"report.pdf"}
2025-11-10T17:30:15.456Z DEBUG [DocumentService:uploadDocument] Validating file {"size":1048576}
2025-11-10T17:30:16.789Z INFO [DocumentService:uploadDocument] Upload successful {"documentId":"doc-123"}
```

## Common Patterns

### Service Initialization

```javascript
class MyService {
    constructor() {
        this.logger = createLogger('MyService');
        this.logger.info('Service initialized');
    }

    async initialize() {
        this.logger.info('Initializing service...');
        try {
            // ... initialization code
            this.logger.info('Service ready');
        } catch (error) {
            this.logger.error('Initialization failed', error);
            throw error;
        }
    }
}
```

### API Requests

```javascript
async makeRequest(endpoint) {
    const log = this.logger.child('makeRequest');

    log.debug('Making request', { endpoint });

    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            log.warn('Request failed', {
                endpoint,
                status: response.status,
                statusText: response.statusText
            });
        } else {
            log.info('Request successful', { endpoint });
        }

        return response;
    } catch (error) {
        log.error('Request error', error);
        throw error;
    }
}
```

### Long Operations

```javascript
async processLargeDataset(data) {
    const log = this.logger.child('processLargeDataset');

    log.info('Starting processing', { itemCount: data.length });

    let processed = 0;
    for (const item of data) {
        // Process item
        processed++;

        // Log progress every 100 items
        if (processed % 100 === 0) {
            log.debug('Progress update', {
                processed,
                total: data.length,
                percent: Math.round((processed / data.length) * 100)
            });
        }
    }

    log.info('Processing complete', { processed });
}
```

### Conditional Logging

```javascript
// Only log if DEBUG is enabled
if (process.env.DEBUG === 'true') {
    logger.debug('Detailed state', {
        internalState: this.state,
        cache: Array.from(this.cache.entries())
    });
}
```

## Migration Guide

### Before (console.log)

```javascript
console.log('[DocumentService] Starting upload...');
console.error('[DocumentService] Upload failed:', error);
```

### After (structured logger)

```javascript
const logger = createLogger('DocumentService');

logger.info('Starting upload');
logger.error('Upload failed', error);
```

### Benefits

1. **Consistent Format**: All logs follow same structure
2. **Filterable**: Control verbosity with LOG_LEVEL
3. **Searchable**: Easy to grep/filter by context
4. **Traceable**: Timestamps help with debugging
5. **Error Context**: Stack traces automatically included

## Best Practices

### ✅ Do

```javascript
// Create one logger per service/class
class MyService {
    constructor() {
        this.logger = createLogger('MyService');
    }
}

// Use child loggers for methods
const log = this.logger.child('methodName');

// Include relevant context
logger.info('Operation complete', { itemId, duration });

// Use appropriate levels
logger.debug('Verbose details', data);  // Development
logger.info('Normal operations');        // Production
logger.warn('Potential issues', issue);  // Warnings
logger.error('Failures', error);         // Errors
```

### ❌ Don't

```javascript
// Don't create logger per method call
function doSomething() {
    const logger = createLogger('Service'); // ❌ Creates new instance each time
}

// Don't log sensitive data
logger.info('User logged in', { password: '...' }); // ❌ Security risk

// Don't use wrong level
logger.error('User clicked button'); // ❌ Not an error
logger.debug('Database connection failed'); // ❌ Should be ERROR

// Don't log in hot loops without throttling
for (let i = 0; i < 1000000; i++) {
    logger.debug('Processing', { i }); // ❌ Too many logs
}
```

## Existing Usage in Codebase

The logger is already used in several services:

- `documentService.js` - Document operations
- `indexingService.js` - Document indexing
- `ragService.js` - RAG operations

### Example from documentService.js

```javascript
const { createLogger } = require('../utils/logger');

class DocumentService {
    constructor() {
        this.logger = createLogger('DocumentService');
    }

    async uploadDocument(userId, fileData) {
        const log = this.logger.child('uploadDocument');

        log.info('Processing document upload', {
            userId,
            filename: fileData.filename,
            size: fileData.buffer.length
        });

        // ... implementation
    }
}
```

## Next Steps

To fully adopt structured logging:

1. **Gradually migrate** `console.log` to `logger.*` in services
2. **Add loggers** to services that don't have them yet
3. **Use child loggers** for method-level context
4. **Set LOG_LEVEL** appropriately (DEBUG in dev, INFO in prod)
5. **Document** logging conventions in code reviews
