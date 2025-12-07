/**
 * Token Estimation Utilities
 *
 * Common functions for estimating token counts in text.
 * Uses improved heuristics based on GPT tokenization patterns.
 */

/**
 * Estimate token count for text using improved word-based heuristics
 *
 * GPT tokenization patterns:
 * - Common English words: ~1 token per word
 * - Long/uncommon words: split into subword tokens (~4 chars each)
 * - Punctuation: often merged with adjacent text
 * - Numbers: ~1 token per 1-3 digits
 * - Whitespace: usually merged, newlines add fractional tokens
 * - Code/special chars: higher token density
 *
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }

    // Handle empty or whitespace-only strings
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return 0;
    }

    let tokenCount = 0;

    // Split into words and process each
    const words = text.split(/\s+/).filter(w => w.length > 0);

    for (const word of words) {
        // Extract pure word (letters) vs non-letters
        const letters = word.replace(/[^a-zA-Z]/g, '');
        const nonLetters = word.replace(/[a-zA-Z]/g, '');

        // Estimate tokens for alphabetic part
        if (letters.length > 0) {
            if (letters.length <= 4) {
                // Short common words: usually 1 token
                tokenCount += 1;
            } else if (letters.length <= 8) {
                // Medium words: 1-2 tokens
                tokenCount += Math.ceil(letters.length / 5);
            } else {
                // Long words: split into subword tokens (~4 chars each)
                tokenCount += Math.ceil(letters.length / 4);
            }
        }

        // Estimate tokens for non-alphabetic characters
        if (nonLetters.length > 0) {
            // Numbers: ~1 token per 1-3 digits
            const numbers = nonLetters.match(/\d+/g) || [];
            for (const num of numbers) {
                tokenCount += Math.ceil(num.length / 3);
            }

            // Punctuation: usually merged, but some standalone
            const punctuation = nonLetters.replace(/\d/g, '');
            // Most punctuation shares tokens, estimate ~0.3 per character
            tokenCount += punctuation.length * 0.3;
        }
    }

    // Account for newlines (each adds ~0.5 tokens on average)
    const newlineCount = (text.match(/\n/g) || []).length;
    tokenCount += newlineCount * 0.5;

    // Special adjustment for code-like content (higher token density)
    const codeIndicators = (text.match(/[{}[\]()<>=;:]/g) || []).length;
    if (codeIndicators > 5) {
        // Code tends to have ~20% more tokens due to symbols
        tokenCount *= 1.1;
    }

    // Ensure minimum of 1 token for non-empty text
    return Math.max(1, Math.ceil(tokenCount));
}

/**
 * Estimate token count for multiple texts
 *
 * @param {Array<string>} texts - Array of texts
 * @returns {number} Total estimated token count
 */
function estimateTokensForArray(texts) {
    if (!Array.isArray(texts)) {
        return 0;
    }
    return texts.reduce((sum, text) => sum + estimateTokens(text), 0);
}

/**
 * Check if text exceeds token limit
 *
 * @param {string} text - Text to check
 * @param {number} limit - Token limit
 * @returns {boolean} True if text exceeds limit
 */
function exceedsTokenLimit(text, limit) {
    return estimateTokens(text) > limit;
}

/**
 * Truncate text to fit within token limit using word boundaries
 *
 * @param {string} text - Text to truncate
 * @param {number} limit - Token limit
 * @returns {string} Truncated text
 */
function truncateToTokenLimit(text, limit) {
    if (!text || typeof text !== 'string' || limit <= 0) {
        return text || '';
    }

    const estimatedTokens = estimateTokens(text);

    if (estimatedTokens <= limit) {
        return text;
    }

    // Binary search for the right truncation point
    // This is more accurate than simple character-based truncation
    const words = text.split(/(\s+)/); // Keep whitespace in result
    let left = 0;
    let right = words.length;
    let bestResult = '';

    while (left < right) {
        const mid = Math.floor((left + right + 1) / 2);
        const candidate = words.slice(0, mid).join('');
        const candidateTokens = estimateTokens(candidate);

        if (candidateTokens <= limit) {
            bestResult = candidate;
            left = mid;
        } else {
            right = mid - 1;
        }
    }

    // If we couldn't fit any words, fall back to character truncation
    if (!bestResult && limit > 0) {
        // Estimate ~3.5 chars per token for truncation (conservative)
        const targetChars = Math.floor(limit * 3.5);
        bestResult = text.substring(0, targetChars);
    }

    // Add ellipsis if we actually truncated
    if (bestResult.length < text.length) {
        return bestResult.trimEnd() + '...';
    }

    return bestResult;
}

module.exports = {
    estimateTokens,
    estimateTokensForArray,
    exceedsTokenLimit,
    truncateToTokenLimit
};
