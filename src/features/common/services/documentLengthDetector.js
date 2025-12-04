/**
 * Document Length Detector Service
 *
 * Detects when users request long documents and calculates
 * the appropriate maxTokens value for the AI response.
 */

// Tokens per unit (approximate for French/English)
const TOKENS_PER_PAGE = 1000;      // ~3000 chars per page
const TOKENS_PER_WORD = 1.3;       // French averages ~1.3 tokens/word
const CHARS_PER_TOKEN = 3;         // French ~3 chars/token

// Model output limits (based on official OpenAI documentation)
const MODEL_OUTPUT_LIMITS = {
    'gpt-4o': 16384,
    'gpt-4o-lucide': 16384,
    'gpt-4-turbo': 4096,
    'gpt-4-turbo-lucide': 4096,
    'gpt-4': 8192,
    'gpt-4-lucide': 8192,
    'claude-3-haiku-20240307': 4096,
    'gemini-2.5-flash': 8192,
    'default': 4096
};

// Default token limit for normal responses
const DEFAULT_MAX_TOKENS = 2048;

// Buffer to avoid hitting exact limits
const TOKEN_BUFFER = 500;

/**
 * Detect document length requirements from user message
 * @param {string} message - User's message
 * @returns {object} - { detected: boolean, pages: number, words: number, estimatedTokens: number }
 */
function detectLengthRequirements(message) {
    if (!message || typeof message !== 'string') {
        return { detected: false, pages: 0, words: 0, estimatedTokens: DEFAULT_MAX_TOKENS };
    }

    const lowerMessage = message.toLowerCase();
    let pages = 0;
    let words = 0;
    let detected = false;

    // French patterns for pages
    const frenchPagePatterns = [
        /(\d+)\s*pages?/i,
        /document\s+de\s+(\d+)\s*pages?/i,
        /rapport\s+de\s+(\d+)\s*pages?/i,
        /environ\s+(\d+)\s*pages?/i,
        /au\s+moins\s+(\d+)\s*pages?/i,
    ];

    // English patterns for pages
    const englishPagePatterns = [
        /(\d+)\s*page(?:s)?/i,
        /(\d+)-page/i,
        /about\s+(\d+)\s*pages?/i,
        /at\s+least\s+(\d+)\s*pages?/i,
    ];

    // French patterns for words
    const frenchWordPatterns = [
        /(\d+)\s*mots?/i,
        /environ\s+(\d+)\s*mots?/i,
        /au\s+moins\s+(\d+)\s*mots?/i,
    ];

    // English patterns for words
    const englishWordPatterns = [
        /(\d+)\s*words?/i,
        /about\s+(\d+)\s*words?/i,
        /at\s+least\s+(\d+)\s*words?/i,
    ];

    // Qualitative patterns (French)
    const qualitativePatterns = [
        { pattern: /document\s+(très\s+)?long/i, pages: 5 },
        { pattern: /document\s+(très\s+)?détaillé/i, pages: 4 },
        { pattern: /document\s+complet/i, pages: 4 },
        { pattern: /rapport\s+(très\s+)?détaillé/i, pages: 5 },
        { pattern: /rapport\s+complet/i, pages: 5 },
        { pattern: /analyse\s+(très\s+)?détaillée/i, pages: 4 },
        { pattern: /analyse\s+complète/i, pages: 4 },
        { pattern: /en\s+détail/i, pages: 3 },
        { pattern: /très\s+détaillé/i, pages: 4 },
        { pattern: /exhausti[fv]/i, pages: 5 },
        { pattern: /plusieurs\s+pages/i, pages: 3 },
        { pattern: /long\s+document/i, pages: 5 },
        { pattern: /long\s+rapport/i, pages: 5 },
    ];

    // Check page patterns
    const allPagePatterns = [...frenchPagePatterns, ...englishPagePatterns];
    for (const pattern of allPagePatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            pages = Math.max(pages, parseInt(match[1], 10));
            detected = true;
        }
    }

    // Check word patterns
    const allWordPatterns = [...frenchWordPatterns, ...englishWordPatterns];
    for (const pattern of allWordPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            words = Math.max(words, parseInt(match[1], 10));
            detected = true;
        }
    }

    // Check qualitative patterns
    for (const { pattern, pages: defaultPages } of qualitativePatterns) {
        if (pattern.test(lowerMessage)) {
            pages = Math.max(pages, defaultPages);
            detected = true;
        }
    }

    // Convert words to pages if words specified but not pages
    if (words > 0 && pages === 0) {
        pages = Math.ceil(words / 500); // ~500 words per page
    }

    // Calculate estimated tokens
    let estimatedTokens = DEFAULT_MAX_TOKENS;
    if (detected) {
        if (pages > 0) {
            estimatedTokens = pages * TOKENS_PER_PAGE + TOKEN_BUFFER;
        } else if (words > 0) {
            estimatedTokens = Math.ceil(words * TOKENS_PER_WORD) + TOKEN_BUFFER;
        }
    }

    return {
        detected,
        pages,
        words,
        estimatedTokens
    };
}

/**
 * Get the maximum output tokens for a given model
 * @param {string} modelId - Model identifier
 * @returns {number} - Maximum output tokens
 */
function getModelOutputLimit(modelId) {
    return MODEL_OUTPUT_LIMITS[modelId] || MODEL_OUTPUT_LIMITS['default'];
}

/**
 * Calculate the appropriate maxTokens for a request
 * @param {string} message - User's message
 * @param {string} modelId - Current model identifier
 * @returns {object} - { maxTokens: number, isLongDocument: boolean, warning: string|null }
 */
function calculateMaxTokens(message, modelId) {
    const detection = detectLengthRequirements(message);
    const modelLimit = getModelOutputLimit(modelId);

    let maxTokens = detection.estimatedTokens;
    let warning = null;
    const isLongDocument = detection.detected && detection.pages >= 3;

    // Cap at model's limit
    if (maxTokens > modelLimit) {
        const maxPages = Math.floor(modelLimit / TOKENS_PER_PAGE);
        warning = `Document demandé (${detection.pages} pages) dépasse la capacité du modèle. ` +
                  `Limité à ~${maxPages} pages avec ${modelId}.`;
        maxTokens = modelLimit;
    }

    // Ensure minimum
    maxTokens = Math.max(maxTokens, DEFAULT_MAX_TOKENS);

    console.log(`[DocumentLengthDetector] Message analysis:`, {
        detected: detection.detected,
        pages: detection.pages,
        words: detection.words,
        estimatedTokens: detection.estimatedTokens,
        modelLimit,
        finalMaxTokens: maxTokens,
        isLongDocument
    });

    return {
        maxTokens,
        isLongDocument,
        warning,
        detection
    };
}

module.exports = {
    detectLengthRequirements,
    getModelOutputLimit,
    calculateMaxTokens,
    MODEL_OUTPUT_LIMITS,
    DEFAULT_MAX_TOKENS,
    TOKENS_PER_PAGE
};
