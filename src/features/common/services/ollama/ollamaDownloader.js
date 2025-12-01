/**
 * OllamaDownloader - Ollama-specific download wrapper
 * Extends the generic DownloadService
 */
const DownloadService = require('../downloadService');

class OllamaDownloader extends DownloadService {
    constructor() {
        super('OllamaDownloader');
    }

    // All download functionality is inherited from DownloadService
    // This class exists for:
    // 1. Ollama-specific service naming
    // 2. Future Ollama-specific download customizations if needed
    // 3. Maintaining backward compatibility with existing code
}

module.exports = OllamaDownloader;
