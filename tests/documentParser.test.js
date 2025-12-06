/**
 * Document Parser Service Test Suite
 *
 * Tests for the document parsing functionality:
 * - Parsing full format documents <<DOCUMENT:type>>
 * - Parsing simple format documents <<DOC:type:title>>
 * - Document detection (hasDocuments)
 * - Document metadata extraction
 * - Document validation
 * - Document icons
 * - Edge cases and error handling
 *
 * Phase 2: Document Generation Audit Fix
 */

const documentParser = require('../src/features/common/services/documentParser');

describe('Document Parser Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // Section 1: Parse Full Format Documents
    // ==========================================
    describe('parse() - Full Format', () => {
        test('should parse single document with full format', () => {
            const text = `
Some intro text

<<DOCUMENT:rapport>>
title: Monthly Report
---
# Summary

This is the report content.
<</DOCUMENT>>

Some outro text
`;

            const result = documentParser.parse(text);

            expect(result.documents.length).toBe(1);
            expect(result.documents[0].type).toBe('rapport');
            expect(result.documents[0].title).toBe('Monthly Report');
            expect(result.documents[0].content).toContain('# Summary');
            expect(result.documents[0].content).toContain('This is the report content.');
        });

        test('should parse multiple documents', () => {
            const text = `
<<DOCUMENT:cv>>
title: John Doe CV
---
# Professional Experience
Content here
<</DOCUMENT>>

<<DOCUMENT:lettre>>
title: Cover Letter
---
Dear Hiring Manager,
Content here
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);

            expect(result.documents.length).toBe(2);
            expect(result.documents[0].type).toBe('cv');
            expect(result.documents[0].title).toBe('John Doe CV');
            expect(result.documents[1].type).toBe('lettre');
            expect(result.documents[1].title).toBe('Cover Letter');
        });

        test('should generate unique document IDs', () => {
            const text = `
<<DOCUMENT:rapport>>
title: Doc 1
---
Content 1
<</DOCUMENT>>

<<DOCUMENT:rapport>>
title: Doc 2
---
Content 2
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);

            expect(result.documents[0].id).not.toBe(result.documents[1].id);
            expect(result.documents[0].id).toMatch(/^doc_\d+_[a-z0-9]+$/);
        });

        test('should set correct metadata on parsed documents', () => {
            const text = `
<<DOCUMENT:presentation>>
title: Pitch Deck
---
# Slide 1
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            const doc = result.documents[0];

            expect(doc.format).toBe('markdown');
            expect(doc.source).toBe('ai_generated');
            expect(doc.timestamp).toBeDefined();
            expect(new Date(doc.timestamp)).toBeInstanceOf(Date);
        });

        test('should lowercase document type', () => {
            const text = `
<<DOCUMENT:RAPPORT>>
title: Test
---
Content
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].type).toBe('rapport');
        });

        test('should trim title whitespace', () => {
            const text = `
<<DOCUMENT:cv>>
title:    Spaced Title
---
Content
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].title).toBe('Spaced Title');
        });

        test('should trim content whitespace', () => {
            const text = `
<<DOCUMENT:note>>
title: Note
---

  Content with spaces

<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].content).toBe('Content with spaces');
        });

        test('should replace document in cleanText with placeholder', () => {
            const text = `
Before

<<DOCUMENT:rapport>>
title: My Report
---
Content here
<</DOCUMENT>>

After
`;

            const result = documentParser.parse(text);

            expect(result.cleanText).toContain('Before');
            expect(result.cleanText).toContain('After');
            expect(result.cleanText).toContain('📄 **Document généré**: My Report (rapport)');
            expect(result.cleanText).not.toContain('<<DOCUMENT');
        });
    });

    // ==========================================
    // Section 2: Parse Simple Format Documents
    // ==========================================
    describe('parse() - Simple Format', () => {
        test('should parse document with simple format', () => {
            const text = `
<<DOC:cv:John Doe CV>>
# Skills
- JavaScript
- Python
<</DOC>>
`;

            const result = documentParser.parse(text);

            expect(result.documents.length).toBe(1);
            expect(result.documents[0].type).toBe('cv');
            expect(result.documents[0].title).toBe('John Doe CV');
            expect(result.documents[0].content).toContain('# Skills');
        });

        test('should parse multiple simple format documents', () => {
            const text = `
<<DOC:memo:Meeting Notes>>
Notes content
<</DOC>>

<<DOC:plan:Action Plan>>
Plan content
<</DOC>>
`;

            const result = documentParser.parse(text);

            expect(result.documents.length).toBe(2);
            expect(result.documents[0].title).toBe('Meeting Notes');
            expect(result.documents[1].title).toBe('Action Plan');
        });

        test('should handle mixed format documents', () => {
            const text = `
<<DOCUMENT:rapport>>
title: Full Format Doc
---
Content A
<</DOCUMENT>>

<<DOC:note:Simple Note>>
Content B
<</DOC>>
`;

            const result = documentParser.parse(text);

            expect(result.documents.length).toBe(2);
            expect(result.documents[0].title).toBe('Full Format Doc');
            expect(result.documents[1].title).toBe('Simple Note');
        });
    });

    // ==========================================
    // Section 3: hasDocuments()
    // ==========================================
    describe('hasDocuments()', () => {
        test('should return true for text with full format document', () => {
            const text = `
<<DOCUMENT:cv>>
title: Test
---
Content
<</DOCUMENT>>
`;

            expect(documentParser.hasDocuments(text)).toBe(true);
        });

        test('should return true for text with simple format document', () => {
            const text = `
<<DOC:cv:Test>>
Content
<</DOC>>
`;

            expect(documentParser.hasDocuments(text)).toBe(true);
        });

        test('should return false for text without documents', () => {
            const text = 'This is just regular text without any documents.';
            expect(documentParser.hasDocuments(text)).toBe(false);
        });

        test('should return false for empty string', () => {
            expect(documentParser.hasDocuments('')).toBe(false);
        });

        test('should return false for null', () => {
            expect(documentParser.hasDocuments(null)).toBe(false);
        });

        test('should return false for undefined', () => {
            expect(documentParser.hasDocuments(undefined)).toBe(false);
        });

        test('should return false for non-string', () => {
            expect(documentParser.hasDocuments(123)).toBe(false);
            expect(documentParser.hasDocuments({})).toBe(false);
            expect(documentParser.hasDocuments([])).toBe(false);
        });

        test('should return false for incomplete document markers', () => {
            expect(documentParser.hasDocuments('<<DOCUMENT:cv>>')).toBe(false);
            expect(documentParser.hasDocuments('<</DOCUMENT>>')).toBe(false);
        });
    });

    // ==========================================
    // Section 4: getDocumentMetadata()
    // ==========================================
    describe('getDocumentMetadata()', () => {
        test('should extract metadata from full format documents', () => {
            const text = `
<<DOCUMENT:rapport>>
title: Q1 Report
---
Content
<</DOCUMENT>>
`;

            const metadata = documentParser.getDocumentMetadata(text);

            expect(metadata.length).toBe(1);
            expect(metadata[0].type).toBe('rapport');
            expect(metadata[0].title).toBe('Q1 Report');
        });

        test('should extract metadata from multiple documents', () => {
            const text = `
<<DOCUMENT:cv>>
title: Resume
---
Content
<</DOCUMENT>>

<<DOC:lettre:Cover Letter>>
Content
<</DOC>>
`;

            const metadata = documentParser.getDocumentMetadata(text);

            expect(metadata.length).toBe(2);
            expect(metadata[0].title).toBe('Resume');
            expect(metadata[1].title).toBe('Cover Letter');
        });

        test('should return empty array for text without documents', () => {
            const metadata = documentParser.getDocumentMetadata('No documents here');
            expect(metadata).toEqual([]);
        });

        test('should return empty array for null input', () => {
            const metadata = documentParser.getDocumentMetadata(null);
            expect(metadata).toEqual([]);
        });
    });

    // ==========================================
    // Section 5: validateDocument()
    // ==========================================
    describe('validateDocument()', () => {
        test('should return true for valid document', () => {
            const doc = {
                id: 'doc_123',
                type: 'cv',
                title: 'My CV',
                content: 'Some content'
            };

            expect(documentParser.validateDocument(doc)).toBe(true);
        });

        test('should return false for document without id', () => {
            const doc = {
                type: 'cv',
                title: 'My CV',
                content: 'Content'
            };

            expect(documentParser.validateDocument(doc)).toBe(false);
        });

        test('should return false for document without type', () => {
            const doc = {
                id: 'doc_123',
                title: 'My CV',
                content: 'Content'
            };

            expect(documentParser.validateDocument(doc)).toBe(false);
        });

        test('should return false for document without title', () => {
            const doc = {
                id: 'doc_123',
                type: 'cv',
                content: 'Content'
            };

            expect(documentParser.validateDocument(doc)).toBe(false);
        });

        test('should return false for document without content', () => {
            const doc = {
                id: 'doc_123',
                type: 'cv',
                title: 'My CV'
            };

            expect(documentParser.validateDocument(doc)).toBe(false);
        });

        test('should return false for document with empty content', () => {
            const doc = {
                id: 'doc_123',
                type: 'cv',
                title: 'My CV',
                content: ''
            };

            expect(documentParser.validateDocument(doc)).toBe(false);
        });

        test('should return false for null', () => {
            expect(documentParser.validateDocument(null)).toBe(false);
        });

        test('should return false for undefined', () => {
            expect(documentParser.validateDocument(undefined)).toBe(false);
        });
    });

    // ==========================================
    // Section 6: formatForPreview()
    // ==========================================
    describe('formatForPreview()', () => {
        test('should format valid document for preview', () => {
            const doc = {
                id: 'doc_123',
                type: 'cv',
                title: 'My CV',
                content: '# Skills\n- JavaScript',
                source: 'ai_generated',
                timestamp: '2024-01-01T00:00:00.000Z',
                format: 'markdown'
            };

            const preview = documentParser.formatForPreview(doc);

            expect(preview).not.toBeNull();
            expect(preview.id).toBe('doc_123');
            expect(preview.title).toBe('My CV');
            expect(preview.content).toBe('# Skills\n- JavaScript');
            expect(preview.type).toBe('cv');
            expect(preview.metadata.source).toBe('ai_generated');
            expect(preview.metadata.timestamp).toBe('2024-01-01T00:00:00.000Z');
            expect(preview.metadata.format).toBe('markdown');
        });

        test('should use defaults for missing optional fields', () => {
            const doc = {
                id: 'doc_123',
                type: 'cv',
                title: 'My CV',
                content: 'Content'
            };

            const preview = documentParser.formatForPreview(doc);

            expect(preview.metadata.source).toBe('ai_generated');
            expect(preview.metadata.format).toBe('markdown');
            expect(preview.metadata.timestamp).toBeDefined();
        });

        test('should return null for invalid document', () => {
            const doc = { id: 'doc_123' }; // Missing required fields

            const preview = documentParser.formatForPreview(doc);
            expect(preview).toBeNull();
        });
    });

    // ==========================================
    // Section 7: getDocumentIcon()
    // ==========================================
    describe('getDocumentIcon()', () => {
        test('should return correct icon for cv', () => {
            expect(documentParser.getDocumentIcon('cv')).toBe('📄');
        });

        test('should return correct icon for lettre', () => {
            expect(documentParser.getDocumentIcon('lettre')).toBe('✉️');
        });

        test('should return correct icon for letter (english)', () => {
            expect(documentParser.getDocumentIcon('letter')).toBe('✉️');
        });

        test('should return correct icon for rapport', () => {
            expect(documentParser.getDocumentIcon('rapport')).toBe('📊');
        });

        test('should return correct icon for report', () => {
            expect(documentParser.getDocumentIcon('report')).toBe('📊');
        });

        test('should return correct icon for presentation', () => {
            expect(documentParser.getDocumentIcon('presentation')).toBe('📽️');
        });

        test('should return correct icon for article', () => {
            expect(documentParser.getDocumentIcon('article')).toBe('📰');
        });

        test('should return correct icon for memo', () => {
            expect(documentParser.getDocumentIcon('memo')).toBe('📝');
        });

        test('should return correct icon for note', () => {
            expect(documentParser.getDocumentIcon('note')).toBe('📝');
        });

        test('should return correct icon for contrat', () => {
            expect(documentParser.getDocumentIcon('contrat')).toBe('📜');
        });

        test('should return correct icon for contract', () => {
            expect(documentParser.getDocumentIcon('contract')).toBe('📜');
        });

        test('should return correct icon for plan', () => {
            expect(documentParser.getDocumentIcon('plan')).toBe('📋');
        });

        test('should return correct icon for analyse', () => {
            expect(documentParser.getDocumentIcon('analyse')).toBe('🔍');
        });

        test('should return correct icon for analysis', () => {
            expect(documentParser.getDocumentIcon('analysis')).toBe('🔍');
        });

        test('should return correct icon for guide', () => {
            expect(documentParser.getDocumentIcon('guide')).toBe('📚');
        });

        test('should return correct icon for procedure', () => {
            expect(documentParser.getDocumentIcon('procedure')).toBe('📑');
        });

        test('should return default icon for unknown type', () => {
            expect(documentParser.getDocumentIcon('unknown')).toBe('📑');
        });

        test('should handle uppercase types', () => {
            expect(documentParser.getDocumentIcon('CV')).toBe('📄');
            expect(documentParser.getDocumentIcon('RAPPORT')).toBe('📊');
        });

        test('should return default for null', () => {
            expect(documentParser.getDocumentIcon(null)).toBe('📑');
        });

        test('should return default for undefined', () => {
            expect(documentParser.getDocumentIcon(undefined)).toBe('📑');
        });
    });

    // ==========================================
    // Section 8: generateDocumentInstructions()
    // ==========================================
    describe('generateDocumentInstructions()', () => {
        test('should generate instructions with type and title', () => {
            const instructions = documentParser.generateDocumentInstructions('cv', 'My Resume');

            expect(instructions).toContain('<<DOCUMENT:cv>>');
            expect(instructions).toContain('title: My Resume');
            expect(instructions).toContain('<</DOCUMENT>>');
        });

        test('should include markdown formatting hints', () => {
            const instructions = documentParser.generateDocumentInstructions('rapport', 'Test');

            expect(instructions).toContain('Headers: # ## ###');
            expect(instructions).toContain('Lists: - or 1. 2. 3.');
            expect(instructions).toContain('Bold: **text**');
            expect(instructions).toContain('Italic: *text*');
        });

        test('should mention export formats', () => {
            const instructions = documentParser.generateDocumentInstructions('note', 'Notes');

            expect(instructions).toContain('PDF');
            expect(instructions).toContain('DOCX');
            expect(instructions).toContain('MD');
        });
    });

    // ==========================================
    // Section 9: cleanDocumentMarkers()
    // ==========================================
    describe('cleanDocumentMarkers()', () => {
        test('should remove full format markers but keep content', () => {
            const text = `
<<DOCUMENT:cv>>
title: Resume
---
# Experience
Work history here
<</DOCUMENT>>
`;

            const clean = documentParser.cleanDocumentMarkers(text);

            expect(clean).toContain('**Resume** (cv)');
            expect(clean).toContain('# Experience');
            expect(clean).toContain('Work history here');
            expect(clean).not.toContain('<<DOCUMENT');
            expect(clean).not.toContain('<</DOCUMENT>>');
        });

        test('should remove simple format markers but keep content', () => {
            const text = `
<<DOC:note:Meeting Notes>>
Important points here
<</DOC>>
`;

            const clean = documentParser.cleanDocumentMarkers(text);

            expect(clean).toContain('**Meeting Notes** (note)');
            expect(clean).toContain('Important points here');
            expect(clean).not.toContain('<<DOC');
            expect(clean).not.toContain('<</DOC>>');
        });

        test('should handle text without markers', () => {
            const text = 'Regular text without markers';
            const clean = documentParser.cleanDocumentMarkers(text);
            expect(clean).toBe(text);
        });

        test('should handle empty string', () => {
            expect(documentParser.cleanDocumentMarkers('')).toBe('');
        });

        test('should handle null', () => {
            expect(documentParser.cleanDocumentMarkers(null)).toBe('');
        });

        test('should handle undefined', () => {
            expect(documentParser.cleanDocumentMarkers(undefined)).toBe('');
        });
    });

    // ==========================================
    // Section 10: Edge Cases
    // ==========================================
    describe('Edge Cases', () => {
        test('parse() should handle empty string', () => {
            const result = documentParser.parse('');
            expect(result.documents).toEqual([]);
            expect(result.cleanText).toBe('');
        });

        test('parse() should handle null', () => {
            const result = documentParser.parse(null);
            expect(result.documents).toEqual([]);
            expect(result.cleanText).toBe('');
        });

        test('parse() should handle undefined', () => {
            const result = documentParser.parse(undefined);
            expect(result.documents).toEqual([]);
            expect(result.cleanText).toBe('');
        });

        test('parse() should handle non-string input', () => {
            const result = documentParser.parse(123);
            expect(result.documents).toEqual([]);
        });

        test('should handle document with special characters in title', () => {
            const text = `
<<DOCUMENT:rapport>>
title: Report - Q1 2024 (Final)
---
Content
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].title).toBe('Report - Q1 2024 (Final)');
        });

        test('should handle document with code blocks in content', () => {
            const text = `
<<DOCUMENT:guide>>
title: Code Guide
---
\`\`\`javascript
const x = 1;
\`\`\`
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].content).toContain('```javascript');
            expect(result.documents[0].content).toContain('const x = 1;');
        });

        test('should handle document with tables in content', () => {
            const text = `
<<DOCUMENT:rapport>>
title: Data Report
---
| Name | Value |
|------|-------|
| A    | 1     |
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].content).toContain('| Name | Value |');
        });

        test('should handle document with nested markdown', () => {
            const text = `
<<DOCUMENT:guide>>
title: Complex Guide
---
# Header 1

## Header 2

### Header 3

- Item 1
  - Sub-item
- Item 2

1. First
2. Second

> Blockquote

**Bold** and *italic*
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            const content = result.documents[0].content;

            expect(content).toContain('# Header 1');
            expect(content).toContain('## Header 2');
            expect(content).toContain('- Item 1');
            expect(content).toContain('> Blockquote');
            expect(content).toContain('**Bold**');
        });

        test('should handle document with unicode content', () => {
            const text = `
<<DOCUMENT:rapport>>
title: Rapport été 2024
---
# Résumé

Données financières: €1,000,000
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].title).toBe('Rapport été 2024');
            expect(result.documents[0].content).toContain('Résumé');
            expect(result.documents[0].content).toContain('€1,000,000');
        });

        test('should handle very long document content', () => {
            const longContent = 'Lorem ipsum '.repeat(1000);
            const text = `
<<DOCUMENT:article>>
title: Long Article
---
${longContent}
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents[0].content).toContain('Lorem ipsum');
            expect(result.documents[0].content.length).toBeGreaterThan(10000);
        });
    });

    // ==========================================
    // Section 11: Regex Edge Cases
    // ==========================================
    describe('Regex Edge Cases', () => {
        test('should not match incomplete opening tag', () => {
            const text = '<<DOCUMENT:cv>> without closing';
            const result = documentParser.parse(text);
            expect(result.documents.length).toBe(0);
        });

        test('should not match mismatched tags', () => {
            const text = `
<<DOCUMENT:cv>>
title: Test
---
Content
<</DOC>>
`;

            const result = documentParser.parse(text);
            expect(result.documents.length).toBe(0);
        });

        test('should handle multiple documents in sequence', () => {
            const text = `
<<DOCUMENT:a>>
title: A
---
A content
<</DOCUMENT>><<DOCUMENT:b>>
title: B
---
B content
<</DOCUMENT>>
`;

            const result = documentParser.parse(text);
            expect(result.documents.length).toBe(2);
        });
    });
});
