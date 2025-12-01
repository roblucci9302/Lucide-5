/**
 * OCR Service - Phase 2 Day 2
 *
 * Service for extracting text from images using Tesseract.js
 * Supports screenshots, photos, and scanned documents
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * @class OCRService
 * @description Service for optical character recognition
 */
class OCRService {
    constructor() {
        this.tesseract = null;
        this.initialized = false;
        this.supported = false;
        console.log('[OCRService] Service initialized');
    }

    /**
     * Initialize Tesseract.js
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        if (this.initialized) return this.supported;

        try {
            // Try to load Tesseract.js
            // Note: tesseract.js needs to be installed: npm install tesseract.js
            this.tesseract = require('tesseract.js');
            this.supported = true;
            this.initialized = true;
            console.log('[OCRService] Tesseract.js loaded successfully');
            return true;
        } catch (error) {
            console.warn('[OCRService] Tesseract.js not available:', error.message);
            console.warn('[OCRService] To enable OCR, install: npm install tesseract.js');
            this.supported = false;
            this.initialized = true;
            return false;
        }
    }

    /**
     * Extract text from an image file
     * @param {string} imagePath - Path to image file
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} Extraction result
     */
    async extractTextFromImage(imagePath, options = {}) {
        const {
            language = 'eng', // English by default, supports: eng, fra, spa, deu, etc.
            oem = 1, // OCR Engine Mode: 0=Legacy, 1=Neural nets LSTM, 2=Legacy+LSTM, 3=Default
            psm = 3 // Page Segmentation Mode: 3=Fully automatic
        } = options;

        console.log(`[OCRService] Extracting text from: ${imagePath}`);

        try {
            // Initialize if not already done
            await this.initialize();

            if (!this.supported) {
                return {
                    success: false,
                    error: 'Tesseract.js not installed',
                    text: '',
                    confidence: 0,
                    message: 'To enable OCR, run: npm install tesseract.js'
                };
            }

            // Check if file exists
            try {
                await fs.access(imagePath);
            } catch (error) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            // Get file size
            const stats = await fs.stat(imagePath);
            const fileSizeMB = stats.size / (1024 * 1024);

            console.log(`[OCRService] Image size: ${fileSizeMB.toFixed(2)} MB`);

            if (fileSizeMB > 10) {
                console.warn('[OCRService] Large image, processing may take time...');
            }

            // Perform OCR
            const startTime = Date.now();

            const result = await this.tesseract.recognize(
                imagePath,
                language,
                {
                    logger: (progress) => {
                        if (progress.status === 'recognizing text') {
                            console.log(`[OCRService] Progress: ${(progress.progress * 100).toFixed(0)}%`);
                        }
                    }
                }
            );

            const duration = Date.now() - startTime;

            const extractedText = result.data.text.trim();
            const confidence = result.data.confidence;

            console.log(`[OCRService] ✅ Text extracted in ${duration}ms`);
            console.log(`[OCRService] Confidence: ${confidence.toFixed(2)}%`);
            console.log(`[OCRService] Text length: ${extractedText.length} chars`);

            // Extract additional metadata
            const metadata = {
                confidence: confidence,
                words: result.data.words?.length || 0,
                lines: result.data.lines?.length || 0,
                paragraphs: result.data.paragraphs?.length || 0,
                duration: duration,
                language: language
            };

            return {
                success: true,
                text: extractedText,
                confidence: confidence,
                metadata: metadata,
                raw: result.data
            };

        } catch (error) {
            console.error('[OCRService] Error extracting text:', error);
            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0
            };
        }
    }

    /**
     * Extract text from a base64 encoded image
     * @param {string} base64Data - Base64 image data
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} Extraction result
     */
    async extractTextFromBase64(base64Data, options = {}) {
        console.log('[OCRService] Extracting text from base64 image');

        try {
            await this.initialize();

            if (!this.supported) {
                return {
                    success: false,
                    error: 'Tesseract.js not installed',
                    text: '',
                    confidence: 0
                };
            }

            const { language = 'eng' } = options;

            const result = await this.tesseract.recognize(
                base64Data,
                language
            );

            const extractedText = result.data.text.trim();
            const confidence = result.data.confidence;

            console.log(`[OCRService] ✅ Text extracted from base64`);
            console.log(`[OCRService] Confidence: ${confidence.toFixed(2)}%`);

            return {
                success: true,
                text: extractedText,
                confidence: confidence,
                metadata: {
                    words: result.data.words?.length || 0,
                    lines: result.data.lines?.length || 0,
                    language: language
                }
            };

        } catch (error) {
            console.error('[OCRService] Error extracting text from base64:', error);
            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0
            };
        }
    }

    /**
     * Extract text from multiple images (batch processing)
     * @param {Array<string>} imagePaths - Array of image paths
     * @param {Object} options - OCR options
     * @returns {Promise<Array>} Array of extraction results
     */
    async extractTextFromImages(imagePaths, options = {}) {
        console.log(`[OCRService] Batch extracting text from ${imagePaths.length} images`);

        const results = [];

        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            console.log(`[OCRService] Processing ${i + 1}/${imagePaths.length}: ${path.basename(imagePath)}`);

            const result = await this.extractTextFromImage(imagePath, options);
            results.push({
                imagePath: imagePath,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`[OCRService] ✅ Batch complete: ${successCount}/${imagePaths.length} successful`);

        return results;
    }

    /**
     * Check if OCR is supported/available
     * @returns {Promise<boolean>} Support status
     */
    async isSupported() {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.supported;
    }

    /**
     * Get supported languages
     * @returns {Array<string>} List of supported language codes
     */
    getSupportedLanguages() {
        // Common Tesseract.js languages
        return [
            'eng', // English
            'fra', // French
            'spa', // Spanish
            'deu', // German
            'ita', // Italian
            'por', // Portuguese
            'rus', // Russian
            'chi_sim', // Chinese Simplified
            'chi_tra', // Chinese Traditional
            'jpn', // Japanese
            'kor', // Korean
            'ara', // Arabic
            'hin', // Hindi
            'ben', // Bengali
            'tha', // Thai
            'vie', // Vietnamese
            'pol', // Polish
            'ukr', // Ukrainian
            'ron', // Romanian
            'tur', // Turkish
            'nld', // Dutch
            'swe', // Swedish
            'nor', // Norwegian
            'dan', // Danish
            'fin', // Finnish
            'ces', // Czech
            'hun', // Hungarian
            'heb', // Hebrew
            'ind', // Indonesian
            'msa', // Malay
            'tgl', // Tagalog
        ];
    }

    /**
     * Preprocess image for better OCR results
     * @param {string} imagePath - Path to image
     * @returns {Promise<string>} Path to preprocessed image
     */
    async preprocessImage(imagePath) {
        // TODO: Implement image preprocessing
        // - Resize if too large
        // - Convert to grayscale
        // - Increase contrast
        // - Denoise
        // - Deskew

        // For now, return original path
        return imagePath;
    }

    /**
     * Detect language in image
     * @param {string} imagePath - Path to image
     * @returns {Promise<string>} Detected language code
     */
    async detectLanguage(imagePath) {
        // Simple heuristic: try English first, then check confidence
        const resultEng = await this.extractTextFromImage(imagePath, { language: 'eng' });

        if (resultEng.success && resultEng.confidence > 70) {
            return 'eng';
        }

        // Could add more sophisticated language detection here
        // For now, default to English
        return 'eng';
    }

    /**
     * Extract structured data from image (e.g., emails, URLs, dates)
     * @param {string} imagePath - Path to image
     * @returns {Promise<Object>} Structured data
     */
    async extractStructuredData(imagePath) {
        const result = await this.extractTextFromImage(imagePath);

        if (!result.success) {
            return { success: false, data: {} };
        }

        const text = result.text;

        // Extract emails
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];

        // Extract URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];

        // Extract phone numbers (basic pattern)
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const phones = text.match(phoneRegex) || [];

        // Extract dates (basic patterns)
        const dateRegex = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g;
        const dates = text.match(dateRegex) || [];

        // Extract numbers (amounts, IDs, etc.)
        const numberRegex = /\b\d+(\.\d+)?\b/g;
        const numbers = text.match(numberRegex) || [];

        return {
            success: true,
            data: {
                emails: [...new Set(emails)], // Remove duplicates
                urls: [...new Set(urls)],
                phones: [...new Set(phones)],
                dates: [...new Set(dates)],
                numbers: numbers.slice(0, 20) // Limit to first 20
            },
            text: result.text,
            confidence: result.confidence
        };
    }
}

// Singleton instance
const ocrService = new OCRService();

module.exports = ocrService;
