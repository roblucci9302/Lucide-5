/**
 * Document Export Service
 *
 * Handles exporting generated documents to various formats:
 * - PDF: Using pdfkit (already installed)
 * - DOCX: Using docx (already installed)
 * - MD: Native markdown export
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { app, dialog } = require('electron');

class DocumentExportService {
    constructor() {
        this.exportDir = path.join(app.getPath('documents'), 'Lucide', 'Exports');
    }

    /**
     * Ensure export directory exists
     */
    async ensureExportDirectory() {
        try {
            await fs.mkdir(this.exportDir, { recursive: true });
            return this.exportDir;
        } catch (error) {
            console.error('[DocumentExportService] Error creating export directory:', error);
            throw error;
        }
    }

    /**
     * Sanitize filename to remove invalid characters
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, '_')
            .substring(0, 200); // Limit length
    }

    /**
     * Generate unique filename with timestamp
     */
    generateFilename(title, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const sanitized = this.sanitizeFilename(title || 'document');
        return `${sanitized}_${timestamp}.${extension}`;
    }

    /**
     * Export document to PDF using pdfkit
     */
    async exportToPDF(documentData) {
        try {
            const PDFDocument = require('pdfkit');
            const { title, content, type } = documentData;

            await this.ensureExportDirectory();
            const filename = this.generateFilename(title, 'pdf');
            const filePath = path.join(this.exportDir, filename);

            console.log(`[DocumentExportService] Exporting to PDF: ${filePath}`);

            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            // Create write stream
            const writeStream = require('fs').createWriteStream(filePath);
            doc.pipe(writeStream);

            // Add title
            doc.fontSize(20)
                .font('Helvetica-Bold')
                .text(title || 'Document', {
                    align: 'center'
                });

            doc.moveDown();

            // Add document type
            if (type) {
                doc.fontSize(12)
                    .font('Helvetica-Oblique')
                    .text(`Type: ${type}`, {
                        align: 'center'
                    });
                doc.moveDown(2);
            }

            // Add content with advanced formatting
            const lines = content.split('\n');
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];

                if (!line.trim()) {
                    doc.moveDown(0.5);
                    i++;
                    continue;
                }

                // Check for markdown table
                if (this.isTableLine(line)) {
                    const { table, endIndex } = this.parseMarkdownTable(lines, i);
                    if (table) {
                        this.drawPDFTable(doc, table);
                        doc.moveDown();
                        i = endIndex;
                        continue;
                    }
                }

                // Images: ![alt](url)
                const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                if (imageMatch) {
                    const [, altText, imageUrl] = imageMatch;
                    doc.fontSize(10)
                        .font('Helvetica-Oblique')
                        .fillColor('#666666')
                        .text(`[Image: ${altText || imageUrl}]`, {
                            align: 'center'
                        })
                        .fillColor('#000000');
                    doc.moveDown();
                    i++;
                    continue;
                }

                // Blockquote: > text
                if (line.startsWith('> ')) {
                    const quoteText = line.substring(2);
                    doc.fontSize(11)
                        .font('Helvetica-Oblique')
                        .fillColor('#555555')
                        .text(quoteText, {
                            indent: 30,
                            align: 'left'
                        })
                        .fillColor('#000000');
                    doc.moveDown(0.5);
                    i++;
                    continue;
                }

                // Code block: ```
                if (line.trim().startsWith('```')) {
                    const codeLines = [];
                    i++; // Skip opening ```
                    while (i < lines.length && !lines[i].trim().startsWith('```')) {
                        codeLines.push(lines[i]);
                        i++;
                    }
                    i++; // Skip closing ```

                    doc.fontSize(9)
                        .font('Courier')
                        .fillColor('#000000')
                        .rect(doc.x - 5, doc.y - 5, doc.page.width - 100, codeLines.length * 12 + 10)
                        .fillAndStroke('#F5F5F5', '#CCCCCC')
                        .fillColor('#000000')
                        .text(codeLines.join('\n'), {
                            continued: false
                        });
                    doc.moveDown();
                    continue;
                }

                // Headers
                if (line.startsWith('# ')) {
                    doc.fontSize(18)
                        .font('Helvetica-Bold')
                        .text(line.substring(2), { align: 'left' });
                    doc.moveDown();
                } else if (line.startsWith('## ')) {
                    doc.fontSize(16)
                        .font('Helvetica-Bold')
                        .text(line.substring(3), { align: 'left' });
                    doc.moveDown(0.5);
                } else if (line.startsWith('### ')) {
                    doc.fontSize(14)
                        .font('Helvetica-Bold')
                        .text(line.substring(4), { align: 'left' });
                    doc.moveDown(0.3);
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    // Bullet points with inline formatting
                    this.writePDFLineWithFormatting(doc, `• ${line.substring(2)}`, { indent: 20 });
                } else if (/^\d+\.\s/.test(line)) {
                    // Numbered lists with inline formatting
                    this.writePDFLineWithFormatting(doc, line, { indent: 20 });
                } else {
                    // Regular paragraph with inline formatting
                    this.writePDFLineWithFormatting(doc, line, { align: 'justify' });
                }

                i++;
            }

            // Add footer with generation date
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fontSize(9)
                    .font('Helvetica-Oblique')
                    .text(
                        `Généré par Lucide - ${new Date().toLocaleDateString('fr-FR')}`,
                        50,
                        doc.page.height - 30,
                        {
                            align: 'center',
                            width: doc.page.width - 100
                        }
                    );
            }

            // Finalize PDF
            doc.end();

            // Wait for write to complete
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            console.log(`[DocumentExportService] PDF exported successfully: ${filePath}`);

            return {
                success: true,
                filePath,
                filename,
                format: 'pdf'
            };
        } catch (error) {
            console.error('[DocumentExportService] Error exporting to PDF:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export document to DOCX using docx library
     */
    async exportToDOCX(documentData) {
        try {
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
            const { title, content, type } = documentData;

            await this.ensureExportDirectory();
            const filename = this.generateFilename(title, 'docx');
            const filePath = path.join(this.exportDir, filename);

            console.log(`[DocumentExportService] Exporting to DOCX: ${filePath}`);

            // Create document structure
            const sections = [];

            // Add title
            sections.push(
                new Paragraph({
                    text: title || 'Document',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER
                })
            );

            // Add type
            if (type) {
                sections.push(
                    new Paragraph({
                        text: `Type: ${type}`,
                        alignment: AlignmentType.CENTER,
                        italics: true
                    })
                );
                sections.push(new Paragraph({ text: '' })); // Spacer
            }

            // Process content lines
            const lines = content.split('\n');
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];

                if (!line.trim()) {
                    sections.push(new Paragraph({ text: '' }));
                    i++;
                    continue;
                }

                // Check for markdown table
                if (this.isTableLine(line)) {
                    const { table, endIndex } = this.parseMarkdownTable(lines, i);
                    if (table) {
                        const tableElement = this.createDOCXTable(table);
                        sections.push(tableElement);
                        i = endIndex;
                        continue;
                    }
                }

                // Images: ![alt](url)
                const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                if (imageMatch) {
                    const [, altText, imageUrl] = imageMatch;
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `[Image: ${altText || imageUrl}]`,
                                    italics: true,
                                    color: '666666'
                                })
                            ]
                        })
                    );
                    i++;
                    continue;
                }

                // Blockquote: > text
                if (line.startsWith('> ')) {
                    const runs = this.parseInlineFormatting(line.substring(2));
                    sections.push(
                        new Paragraph({
                            children: runs,
                            shading: { fill: 'F0F0F0' },
                            indent: { left: 720 }, // 0.5 inch
                            spacing: { before: 100, after: 100 }
                        })
                    );
                    i++;
                    continue;
                }

                // Code block: ```
                if (line.trim().startsWith('```')) {
                    const codeLines = [];
                    i++; // Skip opening ```
                    while (i < lines.length && !lines[i].trim().startsWith('```')) {
                        codeLines.push(lines[i]);
                        i++;
                    }
                    i++; // Skip closing ```

                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: codeLines.join('\n'),
                                    font: 'Courier New',
                                    size: 20
                                })
                            ],
                            shading: { fill: 'F5F5F5' },
                            spacing: { before: 100, after: 100 }
                        })
                    );
                    continue;
                }

                // Headers
                if (line.startsWith('# ')) {
                    sections.push(
                        new Paragraph({
                            text: line.substring(2),
                            heading: HeadingLevel.HEADING_1
                        })
                    );
                } else if (line.startsWith('## ')) {
                    sections.push(
                        new Paragraph({
                            text: line.substring(3),
                            heading: HeadingLevel.HEADING_2
                        })
                    );
                } else if (line.startsWith('### ')) {
                    sections.push(
                        new Paragraph({
                            text: line.substring(4),
                            heading: HeadingLevel.HEADING_3
                        })
                    );
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    // Bullet points with inline formatting
                    const runs = this.parseInlineFormatting(line.substring(2));
                    sections.push(
                        new Paragraph({
                            children: runs,
                            bullet: {
                                level: 0
                            }
                        })
                    );
                } else if (/^\d+\.\s/.test(line)) {
                    // Numbered lists with inline formatting
                    const text = line.replace(/^\d+\.\s/, '');
                    const runs = this.parseInlineFormatting(text);
                    sections.push(
                        new Paragraph({
                            children: runs,
                            numbering: {
                                reference: 'default-numbering',
                                level: 0
                            }
                        })
                    );
                } else {
                    // Parse inline formatting (bold, italic, links, code)
                    const runs = this.parseInlineFormatting(line);
                    sections.push(new Paragraph({ children: runs }));
                }

                i++;
            }

            // Add footer
            sections.push(new Paragraph({ text: '' }));
            sections.push(
                new Paragraph({
                    text: `Généré par Lucide - ${new Date().toLocaleDateString('fr-FR')}`,
                    alignment: AlignmentType.CENTER,
                    italics: true
                })
            );

            // Create document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: sections
                }]
            });

            // Generate buffer
            const buffer = await Packer.toBuffer(doc);

            // Write to file
            await fs.writeFile(filePath, buffer);

            console.log(`[DocumentExportService] DOCX exported successfully: ${filePath}`);

            return {
                success: true,
                filePath,
                filename,
                format: 'docx'
            };
        } catch (error) {
            console.error('[DocumentExportService] Error exporting to DOCX:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Draw table in PDF
     */
    drawPDFTable(doc, tableData) {
        const { headers, rows } = tableData;
        const tableTop = doc.y;
        const cellPadding = 5;
        const rowHeight = 25;
        const tableWidth = doc.page.width - 100;
        const colWidth = tableWidth / headers.length;

        // Draw header row
        let currentX = 50;
        let currentY = tableTop;

        // Header background
        doc.rect(50, currentY, tableWidth, rowHeight)
            .fillAndStroke('#E0E0E0', '#000000');

        // Header text
        headers.forEach((header, i) => {
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .fillColor('#000000')
                .text(
                    header,
                    currentX + cellPadding,
                    currentY + cellPadding,
                    {
                        width: colWidth - cellPadding * 2,
                        align: 'left'
                    }
                );
            currentX += colWidth;
        });

        currentY += rowHeight;

        // Draw data rows
        rows.forEach((row, rowIndex) => {
            currentX = 50;

            // Alternate row colors
            const fillColor = rowIndex % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
            doc.rect(50, currentY, tableWidth, rowHeight)
                .fillAndStroke(fillColor, '#CCCCCC');

            row.forEach((cell, i) => {
                doc.fontSize(10)
                    .font('Helvetica')
                    .fillColor('#000000')
                    .text(
                        cell,
                        currentX + cellPadding,
                        currentY + cellPadding,
                        {
                            width: colWidth - cellPadding * 2,
                            align: 'left'
                        }
                    );
                currentX += colWidth;
            });

            currentY += rowHeight;
        });

        // Move document cursor after table
        doc.y = currentY;
    }

    /**
     * Write PDF line with inline formatting (bold, italic, links, code)
     */
    writePDFLineWithFormatting(doc, text, options = {}) {
        const defaultOptions = {
            fontSize: 11,
            align: 'left',
            indent: 0
        };
        const opts = { ...defaultOptions, ...options };

        let i = 0;
        let currentText = '';
        let startX = doc.x;
        let startY = doc.y;

        // Start with default font
        doc.fontSize(opts.fontSize).font('Helvetica');

        // Simple inline parsing for PDF
        while (i < text.length) {
            // Links: [text](url) - just show text in blue
            if (text[i] === '[') {
                const closeBracket = text.indexOf(']', i);
                if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
                    const closeParen = text.indexOf(')', closeBracket + 2);
                    if (closeParen !== -1) {
                        if (currentText) {
                            doc.text(currentText, { continued: true });
                            currentText = '';
                        }
                        const linkText = text.substring(i + 1, closeBracket);
                        doc.fillColor('#0563C1')
                            .text(linkText, { continued: true, underline: true })
                            .fillColor('#000000');
                        i = closeParen + 1;
                        continue;
                    }
                }
            }

            // Bold: **text**
            if (text.substring(i, i + 2) === '**') {
                if (currentText) {
                    doc.text(currentText, { continued: true });
                    currentText = '';
                }
                const endIndex = text.indexOf('**', i + 2);
                if (endIndex !== -1) {
                    const boldText = text.substring(i + 2, endIndex);
                    doc.font('Helvetica-Bold')
                        .text(boldText, { continued: true })
                        .font('Helvetica');
                    i = endIndex + 2;
                    continue;
                }
            }

            // Italic: *text*
            if (text[i] === '*' && text[i + 1] !== '*') {
                if (currentText) {
                    doc.text(currentText, { continued: true });
                    currentText = '';
                }
                const endIndex = text.indexOf('*', i + 1);
                if (endIndex !== -1) {
                    const italicText = text.substring(i + 1, endIndex);
                    doc.font('Helvetica-Oblique')
                        .text(italicText, { continued: true })
                        .font('Helvetica');
                    i = endIndex + 1;
                    continue;
                }
            }

            // Code: `text`
            if (text[i] === '`') {
                if (currentText) {
                    doc.text(currentText, { continued: true });
                    currentText = '';
                }
                const endIndex = text.indexOf('`', i + 1);
                if (endIndex !== -1) {
                    const codeText = text.substring(i + 1, endIndex);
                    doc.font('Courier')
                        .fontSize(opts.fontSize - 1)
                        .fillColor('#666666')
                        .text(codeText, { continued: true })
                        .fillColor('#000000')
                        .font('Helvetica')
                        .fontSize(opts.fontSize);
                    i = endIndex + 1;
                    continue;
                }
            }

            currentText += text[i];
            i++;
        }

        // Write remaining text
        if (currentText) {
            doc.text(currentText, { ...opts, continued: false });
        } else {
            doc.text('', { ...opts, continued: false });
        }
    }

    /**
     * Parse inline formatting (bold, italic, links) for DOCX
     */
    parseInlineFormatting(text) {
        const { TextRun, ExternalHyperlink } = require('docx');
        const runs = [];
        let currentText = '';
        let i = 0;

        while (i < text.length) {
            // Links: [text](url)
            if (text[i] === '[') {
                const closeBracket = text.indexOf(']', i);
                if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
                    const closeParen = text.indexOf(')', closeBracket + 2);
                    if (closeParen !== -1) {
                        if (currentText) {
                            runs.push(new TextRun({ text: currentText }));
                            currentText = '';
                        }
                        const linkText = text.substring(i + 1, closeBracket);
                        const linkUrl = text.substring(closeBracket + 2, closeParen);
                        runs.push(
                            new TextRun({
                                text: linkText,
                                style: 'Hyperlink',
                                color: '0563C1',
                                underline: {}
                            })
                        );
                        i = closeParen + 1;
                        continue;
                    }
                }
            }

            // Bold: **text**
            if (text.substring(i, i + 2) === '**') {
                if (currentText) {
                    runs.push(new TextRun({ text: currentText }));
                    currentText = '';
                }
                const endIndex = text.indexOf('**', i + 2);
                if (endIndex !== -1) {
                    const boldText = text.substring(i + 2, endIndex);
                    runs.push(new TextRun({ text: boldText, bold: true }));
                    i = endIndex + 2;
                    continue;
                }
            }

            // Italic: *text*
            if (text[i] === '*' && text[i + 1] !== '*') {
                if (currentText) {
                    runs.push(new TextRun({ text: currentText }));
                    currentText = '';
                }
                const endIndex = text.indexOf('*', i + 1);
                if (endIndex !== -1) {
                    const italicText = text.substring(i + 1, endIndex);
                    runs.push(new TextRun({ text: italicText, italics: true }));
                    i = endIndex + 1;
                    continue;
                }
            }

            // Code: `text`
            if (text[i] === '`') {
                if (currentText) {
                    runs.push(new TextRun({ text: currentText }));
                    currentText = '';
                }
                const endIndex = text.indexOf('`', i + 1);
                if (endIndex !== -1) {
                    const codeText = text.substring(i + 1, endIndex);
                    runs.push(new TextRun({
                        text: codeText,
                        font: 'Courier New',
                        shading: { fill: 'F0F0F0' }
                    }));
                    i = endIndex + 1;
                    continue;
                }
            }

            currentText += text[i];
            i++;
        }

        if (currentText) {
            runs.push(new TextRun({ text: currentText }));
        }

        return runs.length > 0 ? runs : [new TextRun({ text })];
    }

    /**
     * Check if line is a markdown table
     */
    isTableLine(line) {
        return line.trim().startsWith('|') && line.trim().endsWith('|');
    }

    /**
     * Parse markdown table
     */
    parseMarkdownTable(lines, startIndex) {
        const tableLines = [];
        let i = startIndex;

        // Collect all table lines
        while (i < lines.length && this.isTableLine(lines[i])) {
            tableLines.push(lines[i]);
            i++;
        }

        if (tableLines.length < 2) {
            return { table: null, endIndex: startIndex };
        }

        // Parse header
        const headerCells = tableLines[0]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell);

        // Skip separator line (|---|---|)
        const dataRows = tableLines.slice(2).map(line =>
            line.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell)
        );

        return {
            table: {
                headers: headerCells,
                rows: dataRows
            },
            endIndex: i
        };
    }

    /**
     * Create DOCX table from parsed markdown table
     */
    createDOCXTable(tableData) {
        const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle } = require('docx');

        const { headers, rows } = tableData;

        // Create header row
        const headerRow = new TableRow({
            children: headers.map(header =>
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: header,
                                    bold: true
                                })
                            ]
                        })
                    ],
                    shading: { fill: 'E0E0E0' }
                })
            )
        });

        // Create data rows
        const dataTableRows = rows.map(row =>
            new TableRow({
                children: row.map(cell =>
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: this.parseInlineFormatting(cell)
                            })
                        ]
                    })
                )
            })
        );

        // Create table
        return new Table({
            rows: [headerRow, ...dataTableRows],
            width: {
                size: 100,
                type: WidthType.PERCENTAGE
            },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 }
            }
        });
    }

    /**
     * Export document to Markdown (native)
     */
    async exportToMarkdown(documentData) {
        try {
            const { title, content, type } = documentData;

            await this.ensureExportDirectory();
            const filename = this.generateFilename(title, 'md');
            const filePath = path.join(this.exportDir, filename);

            console.log(`[DocumentExportService] Exporting to Markdown: ${filePath}`);

            // Build markdown content
            let markdown = '';

            // Add title
            markdown += `# ${title || 'Document'}\n\n`;

            // Add metadata
            if (type) {
                markdown += `**Type:** ${type}\n\n`;
            }
            markdown += `**Généré le:** ${new Date().toLocaleDateString('fr-FR')}\n\n`;
            markdown += `---\n\n`;

            // Add content (already in markdown format)
            markdown += content;

            // Add footer
            markdown += `\n\n---\n\n`;
            markdown += `*Généré par Lucide*\n`;

            // Write to file
            await fs.writeFile(filePath, markdown, 'utf-8');

            console.log(`[DocumentExportService] Markdown exported successfully: ${filePath}`);

            return {
                success: true,
                filePath,
                filename,
                format: 'md'
            };
        } catch (error) {
            console.error('[DocumentExportService] Error exporting to Markdown:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Main export function - routes to appropriate export method
     */
    async exportDocument(documentData, format) {
        console.log(`[DocumentExportService] Exporting document to ${format.toUpperCase()}`);

        try {
            let result;

            switch (format.toLowerCase()) {
                case 'pdf':
                    result = await this.exportToPDF(documentData);
                    break;
                case 'docx':
                    result = await this.exportToDOCX(documentData);
                    break;
                case 'md':
                case 'markdown':
                    result = await this.exportToMarkdown(documentData);
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            return result;
        } catch (error) {
            console.error('[DocumentExportService] Export error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Open export directory in file explorer
     */
    async openExportDirectory() {
        try {
            await this.ensureExportDirectory();
            const { shell } = require('electron');
            await shell.openPath(this.exportDir);
            return { success: true, path: this.exportDir };
        } catch (error) {
            console.error('[DocumentExportService] Error opening export directory:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new DocumentExportService();
