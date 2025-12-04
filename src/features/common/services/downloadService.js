/**
 * DownloadService - Generic file download service with retry, checksum verification
 * Replaces duplicated download code in whisperService and ollamaDownloader
 */
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const { EventEmitter } = require('events');
const { TIME, RETRY } = require('../config/constants');

class DownloadService extends EventEmitter {
    constructor(serviceName = 'DownloadService') {
        super();
        this.serviceName = serviceName;
    }

    /**
     * Download a file from URL to destination with progress tracking
     * @param {string} url - The URL to download from
     * @param {string} destination - The local file path to save to
     * @param {Object} options - Download options
     * @returns {Promise<Object>} - Download result with size
     */
    async downloadFile(url, destination, options = {}) {
        const {
            onProgress = null,
            headers = { 'User-Agent': 'Lucide-App' },
            timeout = TIME.DOWNLOAD_TIMEOUT,
            modelId = null
        } = options;

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destination);
            let downloadedSize = 0;
            let totalSize = 0;

            const request = https.get(url, { headers }, (response) => {
                // Handle redirects
                if ([301, 302, 307, 308].includes(response.statusCode)) {
                    file.close();
                    fs.unlink(destination, () => {});

                    if (!response.headers.location) {
                        reject(new Error('Redirect without location header'));
                        return;
                    }

                    console.log(`[${this.serviceName}] Following redirect from ${url} to ${response.headers.location}`);
                    this.downloadFile(response.headers.location, destination, options)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(destination, () => {});
                    reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
                    return;
                }

                totalSize = parseInt(response.headers['content-length'], 10) || 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;

                    if (totalSize > 0) {
                        const progress = Math.round((downloadedSize / totalSize) * 100);

                        if (onProgress) {
                            onProgress(progress, downloadedSize, totalSize);
                        }
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close(() => {
                        resolve({ success: true, size: downloadedSize });
                    });
                });
            });

            request.on('timeout', () => {
                request.destroy();
                file.close();
                fs.unlink(destination, () => {});
                reject(new Error('Download timeout'));
            });

            request.on('error', (err) => {
                file.close();
                fs.unlink(destination, () => {});
                this.emit('download-error', { url, error: err, modelId });
                reject(err);
            });

            request.setTimeout(timeout);

            file.on('error', (err) => {
                fs.unlink(destination, () => {});
                reject(err);
            });
        });
    }

    /**
     * Download with retry logic and optional checksum verification
     * @param {string} url - The URL to download from
     * @param {string} destination - The local file path to save to
     * @param {Object} options - Download options with retry settings
     * @returns {Promise<Object>} - Download result
     */
    async downloadWithRetry(url, destination, options = {}) {
        const {
            maxRetries = RETRY.MAX_ATTEMPTS,
            retryDelay = RETRY.INITIAL_DELAY,
            expectedChecksum = null,
            modelId = null,
            ...downloadOptions
        } = options;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.downloadFile(url, destination, {
                    ...downloadOptions,
                    modelId
                });

                // Verify checksum if provided
                if (expectedChecksum) {
                    const isValid = await this.verifyChecksum(destination, expectedChecksum);
                    if (!isValid) {
                        fs.unlinkSync(destination);
                        throw new Error('Checksum verification failed');
                    }
                    console.log(`[${this.serviceName}] Checksum verified successfully`);
                }

                return result;
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }

                console.log(`[${this.serviceName}] Download attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }

    /**
     * Verify file checksum (SHA256)
     * @param {string} filePath - Path to the file to verify
     * @param {string} expectedChecksum - Expected SHA256 checksum
     * @returns {Promise<boolean>} - True if checksum matches
     */
    async verifyChecksum(filePath, expectedChecksum) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => {
                const fileChecksum = hash.digest('hex');
                console.log(`[${this.serviceName}] File checksum: ${fileChecksum}`);
                console.log(`[${this.serviceName}] Expected checksum: ${expectedChecksum}`);
                resolve(fileChecksum === expectedChecksum);
            });
            stream.on('error', reject);
        });
    }
}

module.exports = DownloadService;
