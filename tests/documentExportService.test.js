/**
 * Document Export Service Test Suite
 *
 * Tests for the document export functionality:
 * - PDF export with pdfkit
 * - DOCX export with docx library
 * - Markdown export
 * - Utility functions (sanitize, filename generation)
 * - Table parsing and rendering
 *
 * Phase 1: Document Generation Audit Fix
 */

// Mock electron before importing (virtual: true allows mocking non-existent modules)
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn().mockReturnValue('/mock/documents')
    },
    dialog: {
        showSaveDialog: jest.fn()
    },
    shell: {
        openPath: jest.fn().mockResolvedValue('')
    }
}), { virtual: true });

// Mock fs.promises
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockAccess = jest.fn().mockResolvedValue(undefined);

jest.mock('fs', () => ({
    promises: {
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
        access: mockAccess
    },
    createWriteStream: jest.fn().mockReturnValue({
        on: jest.fn((event, callback) => {
            if (event === 'finish') {
                setTimeout(callback, 10);
            }
            return this;
        }),
        pipe: jest.fn()
    })
}));

// Mock pdfkit
const mockPDFDoc = {
    pipe: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    fillAndStroke: jest.fn().mockReturnThis(),
    switchToPage: jest.fn().mockReturnThis(),
    end: jest.fn(),
    bufferedPageRange: jest.fn().mockReturnValue({ count: 1 }),
    page: { width: 595, height: 842 },
    x: 50,
    y: 100
};

jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => mockPDFDoc);
}, { virtual: true });

// Mock docx
const mockTextRun = jest.fn().mockImplementation((opts) => ({ type: 'TextRun', ...opts }));
const mockParagraph = jest.fn().mockImplementation((opts) => ({ type: 'Paragraph', ...opts }));
const mockDocument = jest.fn().mockImplementation((opts) => ({ type: 'Document', ...opts }));
const mockTableRow = jest.fn().mockImplementation((opts) => ({ type: 'TableRow', ...opts }));
const mockTableCell = jest.fn().mockImplementation((opts) => ({ type: 'TableCell', ...opts }));
const mockTable = jest.fn().mockImplementation((opts) => ({ type: 'Table', ...opts }));
const mockPacker = {
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock docx content'))
};

jest.mock('docx', () => ({
    Document: mockDocument,
    Packer: mockPacker,
    Paragraph: mockParagraph,
    TextRun: mockTextRun,
    HeadingLevel: {
        TITLE: 'TITLE',
        HEADING_1: 'HEADING_1',
        HEADING_2: 'HEADING_2',
        HEADING_3: 'HEADING_3'
    },
    AlignmentType: {
        CENTER: 'CENTER',
        LEFT: 'LEFT',
        JUSTIFY: 'JUSTIFY'
    },
    Table: mockTable,
    TableRow: mockTableRow,
    TableCell: mockTableCell,
    WidthType: {
        PERCENTAGE: 'PERCENTAGE'
    },
    BorderStyle: {
        SINGLE: 'SINGLE'
    },
    ExternalHyperlink: jest.fn().mockImplementation((opts) => ({ type: 'ExternalHyperlink', ...opts }))
}), { virtual: true });

// Import service after mocking
const documentExportService = require('../src/features/common/services/documentExportService');

describe('Document Export Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // Section 1: Utility Functions
    // ==========================================
    describe('Utility Functions', () => {
        describe('sanitizeFilename', () => {
            test('should remove invalid characters from filename', () => {
                const result = documentExportService.sanitizeFilename('test<>:"/\\|?*file');
                // 9 invalid chars: < > : " / \ | ? *
                expect(result).toBe('test---------file');
            });

            test('should replace spaces with underscores', () => {
                const result = documentExportService.sanitizeFilename('my document name');
                expect(result).toBe('my_document_name');
            });

            test('should handle multiple spaces', () => {
                const result = documentExportService.sanitizeFilename('test   multiple   spaces');
                expect(result).toBe('test_multiple_spaces');
            });

            test('should truncate long filenames to 200 characters', () => {
                const longName = 'a'.repeat(250);
                const result = documentExportService.sanitizeFilename(longName);
                expect(result.length).toBe(200);
            });

            test('should handle empty string', () => {
                const result = documentExportService.sanitizeFilename('');
                expect(result).toBe('');
            });

            test('should handle French characters', () => {
                const result = documentExportService.sanitizeFilename('Rapport été 2024');
                expect(result).toBe('Rapport_été_2024');
            });
        });

        describe('generateFilename', () => {
            test('should generate filename with title and extension', () => {
                const result = documentExportService.generateFilename('My Document', 'pdf');
                expect(result).toMatch(/^My_Document_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.pdf$/);
            });

            test('should use "document" as default title', () => {
                const result = documentExportService.generateFilename(null, 'docx');
                expect(result).toMatch(/^document_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.docx$/);
            });

            test('should handle undefined title', () => {
                const result = documentExportService.generateFilename(undefined, 'md');
                expect(result).toMatch(/^document_.*\.md$/);
            });

            test('should include timestamp in filename', () => {
                const before = new Date().toISOString().substring(0, 10);
                const result = documentExportService.generateFilename('Test', 'pdf');
                expect(result).toContain(before);
            });
        });

        describe('ensureExportDirectory', () => {
            test('should create export directory', async () => {
                await documentExportService.ensureExportDirectory();
                expect(mockMkdir).toHaveBeenCalledWith(
                    expect.stringContaining('Lucide'),
                    { recursive: true }
                );
            });

            test('should return export directory path', async () => {
                const result = await documentExportService.ensureExportDirectory();
                expect(result).toContain('Lucide');
                expect(result).toContain('Exports');
            });
        });
    });

    // ==========================================
    // Section 2: Table Parsing
    // ==========================================
    describe('Table Parsing', () => {
        describe('isTableLine', () => {
            test('should return true for valid table line', () => {
                expect(documentExportService.isTableLine('| Header 1 | Header 2 |')).toBe(true);
            });

            test('should return true for separator line', () => {
                expect(documentExportService.isTableLine('|---|---|')).toBe(true);
            });

            test('should return false for non-table line', () => {
                expect(documentExportService.isTableLine('This is not a table')).toBe(false);
            });

            test('should return false for incomplete table line', () => {
                expect(documentExportService.isTableLine('| Only start')).toBe(false);
            });

            test('should handle whitespace', () => {
                expect(documentExportService.isTableLine('  | Header |  ')).toBe(true);
            });
        });

        describe('parseMarkdownTable', () => {
            test('should parse valid markdown table', () => {
                const lines = [
                    '| Name | Age |',
                    '|------|-----|',
                    '| John | 30 |',
                    '| Jane | 25 |'
                ];
                const result = documentExportService.parseMarkdownTable(lines, 0);

                expect(result.table).toBeDefined();
                expect(result.table.headers).toEqual(['Name', 'Age']);
                expect(result.table.rows).toEqual([
                    ['John', '30'],
                    ['Jane', '25']
                ]);
                expect(result.endIndex).toBe(4);
            });

            test('should return null for invalid table (less than 2 lines)', () => {
                const lines = ['| Only header |'];
                const result = documentExportService.parseMarkdownTable(lines, 0);

                expect(result.table).toBeNull();
                expect(result.endIndex).toBe(0);
            });

            test('should handle table with multiple columns', () => {
                const lines = [
                    '| A | B | C | D |',
                    '|---|---|---|---|',
                    '| 1 | 2 | 3 | 4 |'
                ];
                const result = documentExportService.parseMarkdownTable(lines, 0);

                expect(result.table.headers.length).toBe(4);
                expect(result.table.rows[0].length).toBe(4);
            });

            test('should stop at non-table line', () => {
                const lines = [
                    '| Header |',
                    '|--------|',
                    '| Data |',
                    'Not a table line',
                    '| Another |'
                ];
                const result = documentExportService.parseMarkdownTable(lines, 0);

                expect(result.endIndex).toBe(3);
            });
        });
    });

    // ==========================================
    // Section 3: Inline Formatting Parsing
    // ==========================================
    describe('Inline Formatting', () => {
        describe('parseInlineFormatting', () => {
            test('should parse bold text', () => {
                const runs = documentExportService.parseInlineFormatting('This is **bold** text');
                expect(runs.length).toBe(3);
                expect(runs[1].bold).toBe(true);
            });

            test('should parse italic text', () => {
                const runs = documentExportService.parseInlineFormatting('This is *italic* text');
                expect(runs.length).toBe(3);
                expect(runs[1].italics).toBe(true);
            });

            test('should parse code text', () => {
                const runs = documentExportService.parseInlineFormatting('This is `code` text');
                expect(runs.length).toBe(3);
                expect(runs[1].font).toBe('Courier New');
            });

            test('should parse links', () => {
                const runs = documentExportService.parseInlineFormatting('Click [here](http://example.com)');
                expect(runs.length).toBe(2);
                expect(runs[1].color).toBe('0563C1');
            });

            test('should handle plain text', () => {
                const runs = documentExportService.parseInlineFormatting('Just plain text');
                expect(runs.length).toBe(1);
            });

            test('should handle multiple formatting in same line', () => {
                const runs = documentExportService.parseInlineFormatting('**Bold** and *italic* and `code`');
                expect(runs.length).toBeGreaterThan(3);
            });
        });
    });

    // ==========================================
    // Section 4: PDF Export
    // ==========================================
    describe('PDF Export', () => {
        const testDocument = {
            title: 'Test Document',
            content: '# Header\n\nSome content',
            type: 'rapport'
        };

        test('should export document to PDF successfully', async () => {
            const result = await documentExportService.exportToPDF(testDocument);

            expect(result.success).toBe(true);
            expect(result.format).toBe('pdf');
            expect(result.filename).toMatch(/\.pdf$/);
            expect(result.filePath).toBeDefined();
        });

        test('should create PDF with correct title', async () => {
            await documentExportService.exportToPDF(testDocument);

            expect(mockPDFDoc.text).toHaveBeenCalledWith(
                'Test Document',
                expect.objectContaining({ align: 'center' })
            );
        });

        test('should add document type to PDF', async () => {
            await documentExportService.exportToPDF(testDocument);

            expect(mockPDFDoc.text).toHaveBeenCalledWith(
                'Type: rapport',
                expect.objectContaining({ align: 'center' })
            );
        });

        test('should handle headers in content', async () => {
            const doc = {
                title: 'Test',
                content: '# Main Header\n## Sub Header\n### Third Header',
                type: 'test'
            };

            await documentExportService.exportToPDF(doc);

            expect(mockPDFDoc.fontSize).toHaveBeenCalledWith(18); // H1
            expect(mockPDFDoc.fontSize).toHaveBeenCalledWith(16); // H2
            expect(mockPDFDoc.fontSize).toHaveBeenCalledWith(14); // H3
        });

        test('should handle bullet points', async () => {
            const doc = {
                title: 'Test',
                content: '- Item 1\n- Item 2',
                type: 'test'
            };

            await documentExportService.exportToPDF(doc);

            // Bullet points are processed with writePDFLineWithFormatting
            expect(mockPDFDoc.text).toHaveBeenCalled();
        });

        test('should handle numbered lists', async () => {
            const doc = {
                title: 'Test',
                content: '1. First\n2. Second',
                type: 'test'
            };

            await documentExportService.exportToPDF(doc);

            expect(mockPDFDoc.text).toHaveBeenCalled();
        });

        test('should handle blockquotes', async () => {
            const doc = {
                title: 'Test',
                content: '> This is a quote',
                type: 'test'
            };

            await documentExportService.exportToPDF(doc);

            expect(mockPDFDoc.fillColor).toHaveBeenCalledWith('#555555');
        });

        test('should handle code blocks', async () => {
            const doc = {
                title: 'Test',
                content: '```\nconst x = 1;\n```',
                type: 'test'
            };

            await documentExportService.exportToPDF(doc);

            expect(mockPDFDoc.font).toHaveBeenCalledWith('Courier');
        });

        test('should add footer with generation date', async () => {
            await documentExportService.exportToPDF(testDocument);

            expect(mockPDFDoc.text).toHaveBeenCalledWith(
                expect.stringContaining('Généré par Lucide'),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object)
            );
        });

        test('should handle empty content', async () => {
            const doc = {
                title: 'Empty',
                content: '',
                type: 'test'
            };

            const result = await documentExportService.exportToPDF(doc);
            expect(result.success).toBe(true);
        });

        test('should handle document without type', async () => {
            const doc = {
                title: 'No Type',
                content: 'Content here'
            };

            const result = await documentExportService.exportToPDF(doc);
            expect(result.success).toBe(true);
        });
    });

    // ==========================================
    // Section 5: DOCX Export
    // ==========================================
    describe('DOCX Export', () => {
        const testDocument = {
            title: 'Test Document',
            content: '# Header\n\nSome content',
            type: 'rapport'
        };

        test('should export document to DOCX successfully', async () => {
            const result = await documentExportService.exportToDOCX(testDocument);

            expect(result.success).toBe(true);
            expect(result.format).toBe('docx');
            expect(result.filename).toMatch(/\.docx$/);
            expect(result.filePath).toBeDefined();
        });

        test('should create Document with correct structure', async () => {
            await documentExportService.exportToDOCX(testDocument);

            expect(mockDocument).toHaveBeenCalled();
            expect(mockParagraph).toHaveBeenCalled();
        });

        test('should write buffer to file', async () => {
            await documentExportService.exportToDOCX(testDocument);

            expect(mockPacker.toBuffer).toHaveBeenCalled();
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('.docx'),
                expect.any(Buffer)
            );
        });

        test('should handle headers in content', async () => {
            const doc = {
                title: 'Test',
                content: '# Main\n## Sub\n### Third',
                type: 'test'
            };

            await documentExportService.exportToDOCX(doc);

            expect(mockParagraph).toHaveBeenCalledWith(
                expect.objectContaining({ heading: 'HEADING_1' })
            );
        });

        test('should handle bullet points', async () => {
            const doc = {
                title: 'Test',
                content: '- Item 1\n- Item 2',
                type: 'test'
            };

            await documentExportService.exportToDOCX(doc);

            expect(mockParagraph).toHaveBeenCalledWith(
                expect.objectContaining({
                    bullet: expect.objectContaining({ level: 0 })
                })
            );
        });

        test('should handle numbered lists', async () => {
            const doc = {
                title: 'Test',
                content: '1. First\n2. Second',
                type: 'test'
            };

            await documentExportService.exportToDOCX(doc);

            expect(mockParagraph).toHaveBeenCalledWith(
                expect.objectContaining({
                    numbering: expect.objectContaining({ level: 0 })
                })
            );
        });

        test('should handle blockquotes', async () => {
            const doc = {
                title: 'Test',
                content: '> Quote here',
                type: 'test'
            };

            await documentExportService.exportToDOCX(doc);

            expect(mockParagraph).toHaveBeenCalledWith(
                expect.objectContaining({
                    shading: expect.objectContaining({ fill: 'F0F0F0' })
                })
            );
        });

        test('should handle code blocks', async () => {
            const doc = {
                title: 'Test',
                content: '```\ncode here\n```',
                type: 'test'
            };

            await documentExportService.exportToDOCX(doc);

            expect(mockTextRun).toHaveBeenCalledWith(
                expect.objectContaining({ font: 'Courier New' })
            );
        });

        test('should add footer paragraph', async () => {
            await documentExportService.exportToDOCX(testDocument);

            expect(mockParagraph).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Généré par Lucide')
                })
            );
        });
    });

    // ==========================================
    // Section 6: Markdown Export
    // ==========================================
    describe('Markdown Export', () => {
        const testDocument = {
            title: 'Test Document',
            content: '# Header\n\nSome content',
            type: 'rapport'
        };

        test('should export document to Markdown successfully', async () => {
            const result = await documentExportService.exportToMarkdown(testDocument);

            expect(result.success).toBe(true);
            expect(result.format).toBe('md');
            expect(result.filename).toMatch(/\.md$/);
            expect(result.filePath).toBeDefined();
        });

        test('should include title as H1', async () => {
            await documentExportService.exportToMarkdown(testDocument);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('# Test Document'),
                'utf-8'
            );
        });

        test('should include document type', async () => {
            await documentExportService.exportToMarkdown(testDocument);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('**Type:** rapport'),
                'utf-8'
            );
        });

        test('should include generation date', async () => {
            await documentExportService.exportToMarkdown(testDocument);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('**Généré le:**'),
                'utf-8'
            );
        });

        test('should include content', async () => {
            await documentExportService.exportToMarkdown(testDocument);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('# Header'),
                'utf-8'
            );
        });

        test('should add footer', async () => {
            await documentExportService.exportToMarkdown(testDocument);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('*Généré par Lucide*'),
                'utf-8'
            );
        });

        test('should handle document without type', async () => {
            const doc = {
                title: 'No Type',
                content: 'Content'
            };

            const result = await documentExportService.exportToMarkdown(doc);
            expect(result.success).toBe(true);
        });

        test('should use default title if not provided', async () => {
            const doc = {
                content: 'Some content'
            };

            await documentExportService.exportToMarkdown(doc);

            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('# Document'),
                'utf-8'
            );
        });
    });

    // ==========================================
    // Section 7: Main Export Function
    // ==========================================
    describe('exportDocument (main function)', () => {
        const testDocument = {
            title: 'Test',
            content: 'Content',
            type: 'test'
        };

        test('should route to PDF export', async () => {
            const result = await documentExportService.exportDocument(testDocument, 'pdf');
            expect(result.format).toBe('pdf');
        });

        test('should route to DOCX export', async () => {
            const result = await documentExportService.exportDocument(testDocument, 'docx');
            expect(result.format).toBe('docx');
        });

        test('should route to Markdown export for "md"', async () => {
            const result = await documentExportService.exportDocument(testDocument, 'md');
            expect(result.format).toBe('md');
        });

        test('should route to Markdown export for "markdown"', async () => {
            const result = await documentExportService.exportDocument(testDocument, 'markdown');
            expect(result.format).toBe('md');
        });

        test('should handle case-insensitive format', async () => {
            const result = await documentExportService.exportDocument(testDocument, 'PDF');
            expect(result.format).toBe('pdf');
        });

        test('should return error for unsupported format', async () => {
            const result = await documentExportService.exportDocument(testDocument, 'xyz');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported export format');
        });
    });

    // ==========================================
    // Section 8: Open Export Directory
    // ==========================================
    describe('openExportDirectory', () => {
        test('should open export directory', async () => {
            const { shell } = require('electron');
            const result = await documentExportService.openExportDirectory();

            expect(result.success).toBe(true);
            expect(shell.openPath).toHaveBeenCalled();
        });

        test('should ensure directory exists before opening', async () => {
            await documentExportService.openExportDirectory();
            expect(mockMkdir).toHaveBeenCalled();
        });

        test('should return path in result', async () => {
            const result = await documentExportService.openExportDirectory();
            expect(result.path).toBeDefined();
        });
    });

    // ==========================================
    // Section 9: Error Handling
    // ==========================================
    describe('Error Handling', () => {
        test('should handle PDF export error gracefully', async () => {
            mockPDFDoc.end.mockImplementationOnce(() => {
                throw new Error('PDF creation failed');
            });

            const result = await documentExportService.exportToPDF({
                title: 'Test',
                content: 'Content'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle DOCX export error gracefully', async () => {
            mockPacker.toBuffer.mockRejectedValueOnce(new Error('DOCX creation failed'));

            const result = await documentExportService.exportToDOCX({
                title: 'Test',
                content: 'Content'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('DOCX creation failed');
        });

        test('should handle Markdown export error gracefully', async () => {
            mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));

            const result = await documentExportService.exportToMarkdown({
                title: 'Test',
                content: 'Content'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Write failed');
        });

        test('should handle directory creation error', async () => {
            mockMkdir.mockRejectedValueOnce(new Error('Permission denied'));

            try {
                await documentExportService.ensureExportDirectory();
            } catch (error) {
                expect(error.message).toContain('Permission denied');
            }
        });
    });

    // ==========================================
    // Section 10: DOCX Table Creation
    // ==========================================
    describe('DOCX Table Creation', () => {
        test('should create DOCX table from parsed data', () => {
            const tableData = {
                headers: ['Col1', 'Col2'],
                rows: [['A', 'B'], ['C', 'D']]
            };

            const result = documentExportService.createDOCXTable(tableData);

            expect(result.type).toBe('Table');
            expect(mockTable).toHaveBeenCalled();
            expect(mockTableRow).toHaveBeenCalled();
            expect(mockTableCell).toHaveBeenCalled();
        });

        test('should create header row with bold text', () => {
            const tableData = {
                headers: ['Header'],
                rows: [['Data']]
            };

            documentExportService.createDOCXTable(tableData);

            expect(mockTextRun).toHaveBeenCalledWith(
                expect.objectContaining({ bold: true })
            );
        });

        test('should apply shading to header cells', () => {
            const tableData = {
                headers: ['Header'],
                rows: []
            };

            documentExportService.createDOCXTable(tableData);

            expect(mockTableCell).toHaveBeenCalledWith(
                expect.objectContaining({
                    shading: expect.objectContaining({ fill: 'E0E0E0' })
                })
            );
        });
    });
});
