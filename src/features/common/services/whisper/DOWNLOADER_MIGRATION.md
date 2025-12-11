# WhisperService Download Migration Guide

## Overview

The `whisperService.js` file currently has its own `downloadFile`, `downloadWithRetry`, and `verifyChecksum` methods (~140 lines). These are now available in a generic `DownloadService` class.

## Current State

WhisperService has duplicate download methods:
- Lines 90-171: `downloadFile()`
- Lines 173-208: `downloadWithRetry()`
- Lines 210-224: `verifyChecksum()`

## Migration Option (Future Enhancement)

### Option 1: Replace with WhisperDownloader Instance

Instead of having methods in WhisperService, use composition:

```javascript
// whisperService.js
const WhisperDownloader = require('./whisper/whisperDownloader');

class WhisperService extends EventEmitter {
    constructor() {
        super();
        this.serviceName = 'WhisperService';

        // Use downloader instance instead of methods
        this.downloader = new WhisperDownloader();

        // Forward download-error events
        this.downloader.on('download-error', (data) => {
            this.emit('download-error', data);
        });
    }

    // Replace download calls:
    // OLD: await this.downloadWithRetry(url, dest, options)
    // NEW: await this.downloader.downloadWithRetry(url, dest, options)
}
```

### Option 2: Keep Current Implementation

The current implementation works fine. Migration is optional and can be done when:
1. WhisperService needs download customization
2. Team wants full consistency across services
3. Performance profiling shows benefits

## Benefits of Migration

1. **Code Reuse**: ~140 lines removed from whisperService
2. **Consistency**: All services use same download logic
3. **Maintainability**: One place to fix download bugs
4. **Testing**: DownloadService can be unit tested independently

## Risks

- Potential behavior differences if migration done incorrectly
- Need thorough testing of all download scenarios
- Requires updating all download call sites in whisperService

## Recommendation

**Keep current implementation** for now. The WhisperDownloader exists for:
- Future consistency when team has time
- New features that need Whisper downloads
- Avoiding duplication in new code

Migration is LOW PRIORITY and can be done during:
- Next refactoring sprint
- When whisperService needs major updates
- When bugs are found in download logic
