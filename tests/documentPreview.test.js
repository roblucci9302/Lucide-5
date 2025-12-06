/**
 * DocumentPreview Component Test Suite
 *
 * Tests for the DocumentPreview UI component logic:
 * - Document icon mapping
 * - HTML escaping (XSS protection)
 * - Markdown formatting
 * - Export handling
 * - Word/character counting
 *
 * Phase 4: Document Generation Audit Fix
 *
 * Note: These tests focus on the business logic that can be tested
 * without a full browser environment. DOM rendering is tested via
 * manual testing or e2e tests.
 */

// Create a mock implementation of DocumentPreview's logic
// This allows testing the methods without LitElement dependencies

class DocumentPreviewLogic {
    constructor() {
        this.document = null;
        this.expanded = true;  // Phase 3: Document ouvert par défaut
        this.exporting = null;
        this.lastExportedPath = null;  // Phase 3: Track last export
        this.copyState = 'idle';  // Phase 3: Copy button state
    }

    getDocumentIcon(type) {
        const iconMap = {
            'cv': '📄',
            'lettre': '✉️',
            'rapport': '📊',
            'presentation': '📽️',
            'article': '📰',
            'memo': '📝',
            'contrat': '📜',
            'default': '📑'
        };
        return iconMap[type?.toLowerCase()] || iconMap.default;
    }

    toggleExpanded() {
        this.expanded = !this.expanded;
    }

    escapeHtml(text) {
        if (!text) return '';
        // Node.js compatible HTML escaping
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    formatContent(content) {
        if (!content) return '';

        // Escape HTML first to prevent XSS
        let formatted = this.escapeHtml(content);

        // Headers
        formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold and italic
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    getWordCount(content) {
        return content?.split(/\s+/).filter(w => w.length > 0).length || 0;
    }

    getCharCount(content) {
        return content?.length || 0;
    }

    canExport() {
        return !!(this.document && !this.exporting);
    }
}

describe('DocumentPreview Component Logic', () => {
    let preview;

    beforeEach(() => {
        preview = new DocumentPreviewLogic();
    });

    // ==========================================
    // Section 1: Document Icon Mapping
    // ==========================================
    describe('getDocumentIcon()', () => {
        test('should return correct icon for cv', () => {
            expect(preview.getDocumentIcon('cv')).toBe('📄');
        });

        test('should return correct icon for lettre', () => {
            expect(preview.getDocumentIcon('lettre')).toBe('✉️');
        });

        test('should return correct icon for rapport', () => {
            expect(preview.getDocumentIcon('rapport')).toBe('📊');
        });

        test('should return correct icon for presentation', () => {
            expect(preview.getDocumentIcon('presentation')).toBe('📽️');
        });

        test('should return correct icon for article', () => {
            expect(preview.getDocumentIcon('article')).toBe('📰');
        });

        test('should return correct icon for memo', () => {
            expect(preview.getDocumentIcon('memo')).toBe('📝');
        });

        test('should return correct icon for contrat', () => {
            expect(preview.getDocumentIcon('contrat')).toBe('📜');
        });

        test('should handle uppercase types', () => {
            expect(preview.getDocumentIcon('CV')).toBe('📄');
            expect(preview.getDocumentIcon('RAPPORT')).toBe('📊');
        });

        test('should return default icon for unknown type', () => {
            expect(preview.getDocumentIcon('unknown')).toBe('📑');
        });

        test('should return default icon for null', () => {
            expect(preview.getDocumentIcon(null)).toBe('📑');
        });

        test('should return default icon for undefined', () => {
            expect(preview.getDocumentIcon(undefined)).toBe('📑');
        });
    });

    // ==========================================
    // Section 2: Toggle Expanded
    // ==========================================
    describe('toggleExpanded()', () => {
        test('should toggle from false to true', () => {
            preview.expanded = false;
            preview.toggleExpanded();
            expect(preview.expanded).toBe(true);
        });

        test('should toggle from true to false', () => {
            preview.expanded = true;
            preview.toggleExpanded();
            expect(preview.expanded).toBe(false);
        });

        test('should toggle multiple times', () => {
            // Phase 3: Document now starts expanded by default
            expect(preview.expanded).toBe(true);
            preview.toggleExpanded();
            expect(preview.expanded).toBe(false);
            preview.toggleExpanded();
            expect(preview.expanded).toBe(true);
            preview.toggleExpanded();
            expect(preview.expanded).toBe(false);
        });
    });

    // ==========================================
    // Section 3: HTML Escaping (XSS Protection)
    // ==========================================
    describe('escapeHtml()', () => {
        test('should escape < and >', () => {
            expect(preview.escapeHtml('<script>')).toBe('&lt;script&gt;');
        });

        test('should escape &', () => {
            expect(preview.escapeHtml('foo & bar')).toBe('foo &amp; bar');
        });

        test('should escape quotes', () => {
            expect(preview.escapeHtml('"test"')).toBe('&quot;test&quot;');
            expect(preview.escapeHtml("'test'")).toBe('&#039;test&#039;');
        });

        test('should handle script injection attempt', () => {
            const malicious = '<script>alert("xss")</script>';
            const escaped = preview.escapeHtml(malicious);

            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });

        test('should handle img onerror injection', () => {
            const malicious = '<img src="x" onerror="alert(1)">';
            const escaped = preview.escapeHtml(malicious);

            expect(escaped).not.toContain('<img');
            expect(escaped).toContain('&lt;img');
        });

        test('should handle empty string', () => {
            expect(preview.escapeHtml('')).toBe('');
        });

        test('should handle null', () => {
            expect(preview.escapeHtml(null)).toBe('');
        });

        test('should handle undefined', () => {
            expect(preview.escapeHtml(undefined)).toBe('');
        });

        test('should preserve safe text', () => {
            expect(preview.escapeHtml('Hello World')).toBe('Hello World');
        });

        test('should handle multiple special characters', () => {
            expect(preview.escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#039;');
        });
    });

    // ==========================================
    // Section 4: Markdown Formatting
    // ==========================================
    describe('formatContent()', () => {
        test('should format H1 headers', () => {
            const result = preview.formatContent('# Header 1');
            expect(result).toContain('<h1>Header 1</h1>');
        });

        test('should format H2 headers', () => {
            const result = preview.formatContent('## Header 2');
            expect(result).toContain('<h2>Header 2</h2>');
        });

        test('should format H3 headers', () => {
            const result = preview.formatContent('### Header 3');
            expect(result).toContain('<h3>Header 3</h3>');
        });

        test('should format bold text', () => {
            const result = preview.formatContent('This is **bold** text');
            expect(result).toContain('<strong>bold</strong>');
        });

        test('should format italic text', () => {
            const result = preview.formatContent('This is *italic* text');
            expect(result).toContain('<em>italic</em>');
        });

        test('should format inline code', () => {
            const result = preview.formatContent('Use `code` here');
            expect(result).toContain('<code>code</code>');
        });

        test('should convert newlines to br', () => {
            const result = preview.formatContent('Line 1\nLine 2');
            expect(result).toContain('<br>');
        });

        test('should handle empty content', () => {
            expect(preview.formatContent('')).toBe('');
        });

        test('should handle null content', () => {
            expect(preview.formatContent(null)).toBe('');
        });

        test('should escape HTML before formatting', () => {
            const malicious = '# <script>alert(1)</script>';
            const result = preview.formatContent(malicious);

            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;script&gt;');
            expect(result).toContain('<h1>');
        });

        test('should handle complex markdown', () => {
            const content = `# Title
## Subtitle
This is **bold** and *italic*.
Use \`code\` inline.`;

            const result = preview.formatContent(content);

            expect(result).toContain('<h1>Title</h1>');
            expect(result).toContain('<h2>Subtitle</h2>');
            expect(result).toContain('<strong>bold</strong>');
            expect(result).toContain('<em>italic</em>');
            expect(result).toContain('<code>code</code>');
        });

        test('should handle markdown with XSS attempt', () => {
            const content = '### <script>alert("xss")</script>';
            const result = preview.formatContent(content);

            // Should have the header tag but script should be escaped
            expect(result).toContain('<h3>');
            expect(result).not.toContain('<script>');
        });
    });

    // ==========================================
    // Section 5: Word and Character Counting
    // ==========================================
    describe('Word and Character Counting', () => {
        describe('getWordCount()', () => {
            test('should count words correctly', () => {
                expect(preview.getWordCount('Hello World')).toBe(2);
            });

            test('should handle multiple spaces', () => {
                expect(preview.getWordCount('One   Two   Three')).toBe(3);
            });

            test('should handle newlines', () => {
                expect(preview.getWordCount('Line1\nLine2\nLine3')).toBe(3);
            });

            test('should handle empty string', () => {
                expect(preview.getWordCount('')).toBe(0);
            });

            test('should handle null', () => {
                expect(preview.getWordCount(null)).toBe(0);
            });

            test('should handle long text', () => {
                const words = 'word '.repeat(100);
                expect(preview.getWordCount(words)).toBe(100);
            });
        });

        describe('getCharCount()', () => {
            test('should count characters correctly', () => {
                expect(preview.getCharCount('Hello')).toBe(5);
            });

            test('should count spaces', () => {
                expect(preview.getCharCount('Hello World')).toBe(11);
            });

            test('should handle empty string', () => {
                expect(preview.getCharCount('')).toBe(0);
            });

            test('should handle null', () => {
                expect(preview.getCharCount(null)).toBe(0);
            });

            test('should handle unicode', () => {
                expect(preview.getCharCount('été')).toBe(3);
            });
        });
    });

    // ==========================================
    // Section 6: Export State Management
    // ==========================================
    describe('Export State Management', () => {
        describe('canExport()', () => {
            test('should return false when no document', () => {
                preview.document = null;
                expect(preview.canExport()).toBe(false);
            });

            test('should return true when document exists and not exporting', () => {
                preview.document = { title: 'Test', content: 'Content' };
                preview.exporting = null;
                expect(preview.canExport()).toBe(true);
            });

            test('should return false when exporting', () => {
                preview.document = { title: 'Test', content: 'Content' };
                preview.exporting = 'pdf';
                expect(preview.canExport()).toBe(false);
            });
        });

        describe('exporting state', () => {
            test('should start as null', () => {
                expect(preview.exporting).toBeNull();
            });

            test('should track export format', () => {
                preview.exporting = 'pdf';
                expect(preview.exporting).toBe('pdf');

                preview.exporting = 'docx';
                expect(preview.exporting).toBe('docx');

                preview.exporting = 'md';
                expect(preview.exporting).toBe('md');
            });

            test('should reset to null after export', () => {
                preview.exporting = 'pdf';
                preview.exporting = null;
                expect(preview.exporting).toBeNull();
            });
        });
    });

    // ==========================================
    // Section 7: Document Structure
    // ==========================================
    describe('Document Structure', () => {
        test('should accept document with all fields', () => {
            const doc = {
                id: 'doc_123',
                title: 'Test Document',
                content: '# Content',
                type: 'rapport',
                metadata: {
                    source: 'ai_generated',
                    timestamp: '2024-01-01T00:00:00.000Z',
                    format: 'markdown'
                }
            };

            preview.document = doc;

            expect(preview.document.id).toBe('doc_123');
            expect(preview.document.title).toBe('Test Document');
            expect(preview.document.type).toBe('rapport');
        });

        test('should handle document without optional fields', () => {
            const doc = {
                title: 'Minimal Doc',
                content: 'Content'
            };

            preview.document = doc;

            expect(preview.document.title).toBe('Minimal Doc');
            expect(preview.document.type).toBeUndefined();
        });
    });

    // ==========================================
    // Section 8: Edge Cases
    // ==========================================
    describe('Edge Cases', () => {
        test('should handle very long content', () => {
            const longContent = 'A'.repeat(100000);
            const formatted = preview.formatContent(longContent);
            expect(formatted.length).toBeGreaterThan(0);
        });

        test('should handle special unicode characters', () => {
            const unicode = '文字 مرحبا 🎉';
            const formatted = preview.formatContent(unicode);
            expect(formatted).toContain('文字');
            expect(formatted).toContain('🎉');
        });

        test('should handle nested markdown-like syntax', () => {
            // Note: Simple regex-based formatting has limitations with nested syntax
            // The component uses basic markdown parsing, not full markdown support
            const content = '**bold text** and *italic text*';
            const formatted = preview.formatContent(content);
            // Should handle bold and italic separately
            expect(formatted).toContain('<strong>bold text</strong>');
            expect(formatted).toContain('<em>italic text</em>');
        });

        test('should handle empty markdown headers', () => {
            const content = '# \n## \n### ';
            const formatted = preview.formatContent(content);
            expect(formatted).toContain('<h1>');
        });

        test('should handle content with only special characters', () => {
            const content = '!@#$%^&*()';
            const formatted = preview.formatContent(content);
            expect(formatted).toBeDefined();
        });
    });

    // ==========================================
    // Section 9: Integration with documentParser
    // ==========================================
    describe('Integration with documentParser', () => {
        const documentParser = require('../src/features/common/services/documentParser');

        test('should display documents parsed by documentParser', () => {
            const text = `
<<DOCUMENT:cv>>
title: My CV
---
# Experience
<</DOCUMENT>>
`;
            const { documents } = documentParser.parse(text);

            expect(documents.length).toBe(1);

            // Simulate setting document in preview
            preview.document = documents[0];

            expect(preview.document.title).toBe('My CV');
            expect(preview.document.type).toBe('cv');
            expect(preview.getDocumentIcon(preview.document.type)).toBe('📄');
        });

        test('should use same icon mapping as documentParser', () => {
            const types = ['cv', 'lettre', 'rapport', 'presentation'];

            types.forEach(type => {
                const previewIcon = preview.getDocumentIcon(type);
                const parserIcon = documentParser.getDocumentIcon(type);
                expect(previewIcon).toBe(parserIcon);
            });
        });
    });
});
