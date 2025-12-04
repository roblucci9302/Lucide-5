/**
 * Document Parser Service
 *
 * Parses AI responses to detect and extract structured documents.
 * Supports special document markers for automatic document preview.
 *
 * Format:
 * <<DOCUMENT:type>>
 * title: Document Title
 * ---
 * # Content in markdown
 * ...
 * <</DOCUMENT>>  (use <</ for closing tag)
 */

class DocumentParser {
    constructor() {
        // Regex to match document blocks
        // Using escaped chevrons for the closing tag
        this.documentRegex = /<<DOCUMENT:(\w+)>>\s*title:\s*(.+?)\s*---\s*([\s\S]+?)<<\/DOCUMENT>>/gi;

        // Alternative simpler format for backward compatibility
        this.simpleDocumentRegex = /<<DOC:(\w+):(.+?)>>\s*([\s\S]+?)<<\/DOC>>/gi;
    }

    /**
     * Parse AI response and extract documents
     * @param {string} text - AI response text
     * @returns {Object} - { documents: Array, cleanText: string }
     */
    parse(text) {
        if (!text || typeof text !== 'string') {
            return { documents: [], cleanText: text || '' };
        }

        const documents = [];
        let cleanText = text;

        // Parse full format documents: <<DOCUMENT:type>>
        let match;
        const fullRegex = new RegExp(this.documentRegex);

        while ((match = fullRegex.exec(text)) !== null) {
            const [fullMatch, type, title, content] = match;

            documents.push({
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: type.toLowerCase(),
                title: title.trim(),
                content: content.trim(),
                format: 'markdown',
                source: 'ai_generated',
                timestamp: new Date().toISOString()
            });

            // Remove document block from text but leave a placeholder
            cleanText = cleanText.replace(
                fullMatch,
                `\n\n📄 **Document généré**: ${title.trim()} (${type})\n\n`
            );
        }

        // Parse simple format documents: <<DOC:type:title>>
        const simpleRegex = new RegExp(this.simpleDocumentRegex);

        while ((match = simpleRegex.exec(text)) !== null) {
            const [fullMatch, type, title, content] = match;

            documents.push({
                id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: type.toLowerCase(),
                title: title.trim(),
                content: content.trim(),
                format: 'markdown',
                source: 'ai_generated',
                timestamp: new Date().toISOString()
            });

            // Remove document block from text but leave a placeholder
            cleanText = cleanText.replace(
                fullMatch,
                `\n\n📄 **Document généré**: ${title.trim()} (${type})\n\n`
            );
        }

        console.log(`[DocumentParser] Parsed ${documents.length} documents from response`);

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
    hasDocuments(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        return this.documentRegex.test(text) || this.simpleDocumentRegex.test(text);
    }

    /**
     * Extract document metadata without parsing full content
     * @param {string} text - Text to analyze
     * @returns {Array<Object>} - Array of { type, title }
     */
    getDocumentMetadata(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const metadata = [];

        // Check full format
        const fullMatches = text.matchAll(this.documentRegex);
        for (const match of fullMatches) {
            metadata.push({
                type: match[1].toLowerCase(),
                title: match[2].trim()
            });
        }

        // Check simple format
        const simpleMatches = text.matchAll(this.simpleDocumentRegex);
        for (const match of simpleMatches) {
            metadata.push({
                type: match[1].toLowerCase(),
                title: match[2].trim()
            });
        }

        return metadata;
    }

    /**
     * Validate document structure
     * @param {Object} document - Document object
     * @returns {boolean}
     */
    validateDocument(document) {
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
     * Format document for display
     * @param {Object} document - Document object
     * @returns {Object} - Formatted document ready for DocumentPreview
     */
    formatForPreview(document) {
        if (!this.validateDocument(document)) {
            console.warn('[DocumentParser] Invalid document structure:', document);
            return null;
        }

        return {
            id: document.id,
            title: document.title,
            content: document.content,
            type: document.type,
            metadata: {
                source: document.source || 'ai_generated',
                timestamp: document.timestamp || new Date().toISOString(),
                format: document.format || 'markdown'
            }
        };
    }

    /**
     * Generate document marker for AI prompts
     * @param {string} type - Document type (cv, lettre, rapport, etc.)
     * @param {string} title - Document title
     * @returns {string} - Instructions for AI
     */
    generateDocumentInstructions(type, title) {
        return `
IMPORTANT: Format your response as a structured document using the following format:

<<DOCUMENT:${type}>>
title: ${title}
---
# Your document content here in markdown

Use proper markdown formatting:
- Headers: # ## ###
- Lists: - or 1. 2. 3.
- Bold: **text**
- Italic: *text*
<</DOCUMENT>>

This will allow the document to be displayed professionally and exported to PDF/DOCX/MD.
`;
    }

    /**
     * Get document type icon
     * @param {string} type - Document type
     * @returns {string} - Emoji icon
     */
    getDocumentIcon(type) {
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
            default: '📑'
        };

        return icons[type?.toLowerCase()] || icons.default;
    }

    /**
     * Clean text by removing document markers but keeping content
     * (useful for displaying in conversation without documents)
     * @param {string} text - Text with document markers
     * @returns {string} - Clean text
     */
    cleanDocumentMarkers(text) {
        if (!text || typeof text !== 'string') {
            return text || '';
        }

        let clean = text;

        // Remove full format markers
        clean = clean.replace(this.documentRegex, (match, type, title, content) => {
            return `\n\n**${title}** (${type})\n\n${content}\n\n`;
        });

        // Remove simple format markers
        clean = clean.replace(this.simpleDocumentRegex, (match, type, title, content) => {
            return `\n\n**${title}** (${type})\n\n${content}\n\n`;
        });

        return clean.trim();
    }
}

// Export singleton instance
module.exports = new DocumentParser();
