/**
 * WhisperDownloader - Whisper-specific download wrapper
 * Extends the generic DownloadService
 */
const DownloadService = require('../downloadService');

class WhisperDownloader extends DownloadService {
    constructor() {
        super('WhisperDownloader');
    }

    // All download functionality is inherited from DownloadService
    // This class exists for:
    // 1. Whisper-specific service naming
    // 2. Future Whisper-specific download customizations if needed
    // 3. Maintaining backward compatibility with existing code
}

module.exports = WhisperDownloader;
