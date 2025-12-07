/**
 * Document Parser ES Module
 *
 * ES Module version of the document parser for use in UI components.
 * Parses AI responses to detect and extract structured documents.
 *
 * Format:
 * <<DOCUMENT:type>>
 * title: Document Title
 * ---
 * # Content in markdown
 * ...
 * <</DOCUMENT>>
 *
 * Phase 3: Refactoring - Shared parsing logic
 *
 * Note: This file uses ES module syntax for browser imports.
 * The core logic is duplicated in documentParser.js for Node.js usage.
 * Tests use documentParser.js directly (see tests/documentParser.test.js)
 */

// Regex patterns for document parsing
const FULL_FORMAT_REGEX = /<<DOCUMENT:(\w+)>>\s*title:\s*(.+?)\s*---\s*([\s\S]+?)<<\/DOCUMENT>>/gi;
const SIMPLE_FORMAT_REGEX = /<<DOC:(\w+):(.+?)>>\s*([\s\S]+?)<<\/DOC>>/gi;

/**
 * Generate a unique document ID
 * @returns {string} Unique document ID
 */
function generateDocumentId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse AI response and extract documents
 * @param {string} text - AI response text
 * @returns {Object} - { documents: Array, cleanText: string }
 */
export function parseDocuments(text) {
    if (!text || typeof text !== 'string') {
        return { documents: [], cleanText: text || '' };
    }

    const documents = [];
    let cleanText = text;

    // Parse full format documents: <<DOCUMENT:type>>
    const fullRegex = new RegExp(FULL_FORMAT_REGEX);
    let match;

    while ((match = fullRegex.exec(text)) !== null) {
        const [fullMatch, type, title, content] = match;

        documents.push({
            id: generateDocumentId(),
            type: type.toLowerCase(),
            title: title.trim(),
            content: content.trim(),
            metadata: {
                source: 'ai_generated',
                timestamp: new Date().toISOString(),
                format: 'markdown'
            }
        });

        // Replace with placeholder in clean text
        cleanText = cleanText.replace(
            fullMatch,
            `\n\n📄 **Document généré**: ${title.trim()} (${type})\n\n`
        );
    }

    // Parse simple format documents: <<DOC:type:title>>
    const simpleRegex = new RegExp(SIMPLE_FORMAT_REGEX);

    while ((match = simpleRegex.exec(text)) !== null) {
        const [fullMatch, type, title, content] = match;

        documents.push({
            id: generateDocumentId(),
            type: type.toLowerCase(),
            title: title.trim(),
            content: content.trim(),
            metadata: {
                source: 'ai_generated',
                timestamp: new Date().toISOString(),
                format: 'markdown'
            }
        });

        cleanText = cleanText.replace(
            fullMatch,
            `\n\n📄 **Document généré**: ${title.trim()} (${type})\n\n`
        );
    }

    return {
        documents,
        cleanText: cleanText.trim()
    };
}

/**
 * Detect if text contains document markers
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export function hasDocuments(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    return FULL_FORMAT_REGEX.test(text) || SIMPLE_FORMAT_REGEX.test(text);
}

/**
 * Get document type icon
 * @param {string} type - Document type
 * @returns {string} - Emoji icon
 */
export function getDocumentIcon(type) {
    const icons = {
        cv: '📄',
        lettre: '✉️',
        letter: '✉️',
        rapport: '📊',
        report: '📊',
        presentation: '📽️',
        article: '📰',
        memo: '📝',
        note: '📝',
        contrat: '📜',
        contract: '📜',
        plan: '📋',
        analyse: '🔍',
        analysis: '🔍',
        guide: '📚',
        procedure: '📑',
        offre: '💼',
        proposition: '📋',
        strategie: '🎯',
        default: '📑'
    };

    return icons[type?.toLowerCase()] || icons.default;
}

/**
 * Validate document structure
 * @param {Object} document - Document object
 * @returns {boolean}
 */
export function validateDocument(document) {
    return !!(
        document &&
        document.id &&
        document.type &&
        document.title &&
        document.content &&
        typeof document.content === 'string' &&
        document.content.length > 0
    );
}

/**
 * Format document for DocumentPreview component
 * @param {Object} document - Document object
 * @returns {Object|null} - Formatted document or null if invalid
 */
export function formatForPreview(document) {
    if (!validateDocument(document)) {
        console.warn('[DocumentParser] Invalid document structure:', document);
        return null;
    }

    return {
        id: document.id,
        title: document.title,
        content: document.content,
        type: document.type,
        metadata: {
            source: document.metadata?.source || 'ai_generated',
            timestamp: document.metadata?.timestamp || new Date().toISOString(),
            format: document.metadata?.format || 'markdown'
        }
    };
}

// Default export with all functions
export default {
    parseDocuments,
    hasDocuments,
    getDocumentIcon,
    validateDocument,
    formatForPreview
};
