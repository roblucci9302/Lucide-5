/**
 * Export Service - Phase 5: Document Export
 *
 * Provides export functionality for conversations, summaries, and sessions
 * Supports: JSON, Markdown, PDF, DOCX formats
 */

const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const conversationHistoryService = require('./conversationHistoryService');

/**
 * @class ExportService
 * @description Service for exporting conversations and summaries to various formats
 */
class ExportService {
    constructor() {
        console.log('[ExportService] Service initialized');
    }

    /**
     * Export conversation to JSON format
     * @param {string} sessionId - Session ID
     * @param {string} filePath - Output file path
     * @returns {Promise<Object>} Export result
     */
    async exportToJSON(sessionId, filePath) {
        console.log(`[ExportService] Exporting session ${sessionId} to JSON`);

        try {
            // Get session data
            const session = await conversationHistoryService.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Get messages
            const messages = await conversationHistoryService.getSessionMessages(sessionId);

            // Build export data
            const exportData = {
                version: '1.0',
                exported_at: new Date().toISOString(),
                export_timestamp: Date.now(),
                session: {
                    id: session.id,
                    title: session.title,
                    session_type: session.session_type,
                    agent_profile: session.agent_profile,
                    started_at: session.started_at,
                    ended_at: session.ended_at,
                    message_count: session.message_count,
                    tags: session.tags || [],
                    description: session.description
                },
                messages: messages.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    sent_at: msg.sent_at,
                    model: msg.model,
                    tokens: msg.tokens
                })),
                statistics: {
                    total_messages: messages.length,
                    user_messages: messages.filter(m => m.role === 'user').length,
                    assistant_messages: messages.filter(m => m.role === 'assistant').length,
                    total_tokens: messages.reduce((sum, m) => sum + (m.tokens || 0), 0)
                }
            };

            // Write to file
            await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

            console.log(`[ExportService] JSON export successful: ${filePath}`);
            return {
                success: true,
                filePath,
                format: 'json',
                size: Buffer.byteLength(JSON.stringify(exportData))
            };
        } catch (error) {
            console.error('[ExportService] Error exporting to JSON:', error);
            throw new Error(`Failed to export to JSON: ${error.message}`);
        }
    }

    /**
     * Export conversation to Markdown format
     * @param {string} sessionId - Session ID
     * @param {string} filePath - Output file path
     * @returns {Promise<Object>} Export result
     */
    async exportToMarkdown(sessionId, filePath) {
        console.log(`[ExportService] Exporting session ${sessionId} to Markdown`);

        try {
            // Get session data
            const session = await conversationHistoryService.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Get messages
            const messages = await conversationHistoryService.getSessionMessages(sessionId);

            // Build Markdown content
            let markdown = '';

            // Header
            markdown += `# ${session.title || 'Conversation'}\n\n`;

            // Metadata
            markdown += `## Metadata\n\n`;
            markdown += `- **Session ID:** ${session.id}\n`;
            markdown += `- **Type:** ${session.session_type || 'ask'}\n`;
            markdown += `- **Agent Profile:** ${session.agent_profile || 'lucide_assistant'}\n`;
            markdown += `- **Started:** ${new Date(session.started_at).toLocaleString('fr-FR')}\n`;
            if (session.ended_at) {
                markdown += `- **Ended:** ${new Date(session.ended_at).toLocaleString('fr-FR')}\n`;
            }
            markdown += `- **Messages:** ${messages.length}\n`;
            if (session.tags && session.tags.length > 0) {
                markdown += `- **Tags:** ${session.tags.join(', ')}\n`;
            }
            if (session.description) {
                markdown += `- **Description:** ${session.description}\n`;
            }
            markdown += `- **Exported:** ${new Date().toLocaleString('fr-FR')}\n\n`;

            markdown += `---\n\n`;

            // Conversation
            markdown += `## Conversation\n\n`;

            messages.forEach((msg, index) => {
                const role = msg.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
                const timestamp = new Date(msg.sent_at).toLocaleTimeString('fr-FR');

                markdown += `### ${role} _(${timestamp})_\n\n`;
                markdown += `${msg.content}\n\n`;

                // Add model info for assistant messages
                if (msg.role === 'assistant' && msg.model) {
                    markdown += `_Model: ${msg.model}`;
                    if (msg.tokens) {
                        markdown += ` • Tokens: ${msg.tokens}`;
                    }
                    markdown += `_\n\n`;
                }

                markdown += `---\n\n`;
            });

            // Footer
            markdown += `## Statistics\n\n`;
            markdown += `- **Total Messages:** ${messages.length}\n`;
            markdown += `- **User Messages:** ${messages.filter(m => m.role === 'user').length}\n`;
            markdown += `- **Assistant Messages:** ${messages.filter(m => m.role === 'assistant').length}\n`;
            const totalTokens = messages.reduce((sum, m) => sum + (m.tokens || 0), 0);
            if (totalTokens > 0) {
                markdown += `- **Total Tokens:** ${totalTokens.toLocaleString()}\n`;
            }

            // Write to file
            await fs.writeFile(filePath, markdown, 'utf-8');

            console.log(`[ExportService] Markdown export successful: ${filePath}`);
            return {
                success: true,
                filePath,
                format: 'markdown',
                size: Buffer.byteLength(markdown)
            };
        } catch (error) {
            console.error('[ExportService] Error exporting to Markdown:', error);
            throw new Error(`Failed to export to Markdown: ${error.message}`);
        }
    }

    /**
     * Export conversation to PDF format
     * @param {string} sessionId - Session ID
     * @param {string} filePath - Output file path
     * @returns {Promise<Object>} Export result
     */
    async exportToPDF(sessionId, filePath) {
        console.log(`[ExportService] Exporting session ${sessionId} to PDF`);

        try {
            // Get session data
            const session = await conversationHistoryService.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Get messages
            const messages = await conversationHistoryService.getSessionMessages(sessionId);

            return new Promise(async (resolve, reject) => {
                try {
                    // Create PDF document
                    const doc = new PDFDocument({
                        size: 'A4',
                        margins: { top: 50, bottom: 50, left: 50, right: 50 },
                        info: {
                            Title: session.title || 'Conversation',
                            Author: 'Lucide AI Assistant',
                            Subject: 'Conversation Export',
                            CreationDate: new Date()
                        }
                    });

                    // Create write stream
                    const stream = require('fs').createWriteStream(filePath);
                    doc.pipe(stream);

                    // Header
                    doc.fontSize(20)
                        .fillColor('#2563EB')
                        .text(session.title || 'Conversation', { align: 'center' });

                    doc.moveDown(0.5);

                    // Metadata box
                    doc.fontSize(10)
                        .fillColor('#666666')
                        .text(`Session ID: ${session.id}`, { align: 'center' })
                        .text(`Date: ${new Date(session.started_at).toLocaleString('fr-FR')}`, { align: 'center' })
                        .text(`Agent: ${session.agent_profile || 'lucide_assistant'} • Messages: ${messages.length}`, { align: 'center' });

                    doc.moveDown(1);

                    // Separator line
                    doc.strokeColor('#CCCCCC')
                        .lineWidth(1)
                        .moveTo(50, doc.y)
                        .lineTo(545, doc.y)
                        .stroke();

                    doc.moveDown(1);

                    // Messages
                    messages.forEach((msg, index) => {
                        // Check if we need a new page
                        if (doc.y > 700) {
                            doc.addPage();
                        }

                        // Role header
                        const isUser = msg.role === 'user';
                        const roleColor = isUser ? '#059669' : '#2563EB';
                        const roleText = isUser ? '👤 User' : '🤖 Assistant';
                        const timestamp = new Date(msg.sent_at).toLocaleTimeString('fr-FR');

                        doc.fontSize(12)
                            .fillColor(roleColor)
                            .font('Helvetica-Bold')
                            .text(`${roleText} (${timestamp})`, { continued: false });

                        doc.moveDown(0.3);

                        // Message content
                        doc.fontSize(10)
                            .fillColor('#000000')
                            .font('Helvetica')
                            .text(msg.content, {
                                align: 'left',
                                lineGap: 2
                            });

                        // Model info for assistant
                        if (!isUser && msg.model) {
                            doc.moveDown(0.2);
                            doc.fontSize(8)
                                .fillColor('#999999')
                                .font('Helvetica-Oblique')
                                .text(`Model: ${msg.model}${msg.tokens ? ` • ${msg.tokens} tokens` : ''}`, { align: 'left' });
                        }

                        doc.moveDown(0.8);

                        // Separator
                        if (index < messages.length - 1) {
                            doc.strokeColor('#EEEEEE')
                                .lineWidth(0.5)
                                .moveTo(50, doc.y)
                                .lineTo(545, doc.y)
                                .stroke();

                            doc.moveDown(0.8);
                        }
                    });

                    // Footer on last page
                    doc.moveDown(1);
                    doc.strokeColor('#CCCCCC')
                        .lineWidth(1)
                        .moveTo(50, doc.y)
                        .lineTo(545, doc.y)
                        .stroke();

                    doc.moveDown(0.5);

                    doc.fontSize(9)
                        .fillColor('#666666')
                        .font('Helvetica-Oblique')
                        .text(`Exported from Lucide AI Assistant on ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });

                    // Finalize PDF
                    doc.end();

                    stream.on('finish', () => {
                        console.log(`[ExportService] PDF export successful: ${filePath}`);
                        resolve({
                            success: true,
                            filePath,
                            format: 'pdf'
                        });
                    });

                    stream.on('error', (error) => {
                        reject(new Error(`Failed to write PDF: ${error.message}`));
                    });

                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            console.error('[ExportService] Error exporting to PDF:', error);
            throw new Error(`Failed to export to PDF: ${error.message}`);
        }
    }

    /**
     * Export conversation to DOCX format
     * @param {string} sessionId - Session ID
     * @param {string} filePath - Output file path
     * @returns {Promise<Object>} Export result
     */
    async exportToDOCX(sessionId, filePath) {
        console.log(`[ExportService] Exporting session ${sessionId} to DOCX`);

        try {
            // Get session data
            const session = await conversationHistoryService.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Get messages
            const messages = await conversationHistoryService.getSessionMessages(sessionId);

            // Build document sections
            const docSections = [];

            // Title
            docSections.push(
                new Paragraph({
                    text: session.title || 'Conversation',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );

            // Metadata
            docSections.push(
                new Paragraph({
                    text: 'Metadata',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 200, after: 100 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Session ID: ', bold: true }),
                        new TextRun(session.id)
                    ],
                    spacing: { after: 50 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Type: ', bold: true }),
                        new TextRun(session.session_type || 'ask')
                    ],
                    spacing: { after: 50 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Agent Profile: ', bold: true }),
                        new TextRun(session.agent_profile || 'lucide_assistant')
                    ],
                    spacing: { after: 50 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Started: ', bold: true }),
                        new TextRun(new Date(session.started_at).toLocaleString('fr-FR'))
                    ],
                    spacing: { after: 50 }
                })
            );

            if (session.ended_at) {
                docSections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Ended: ', bold: true }),
                            new TextRun(new Date(session.ended_at).toLocaleString('fr-FR'))
                        ],
                        spacing: { after: 50 }
                    })
                );
            }

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Messages: ', bold: true }),
                        new TextRun(messages.length.toString())
                    ],
                    spacing: { after: 50 }
                })
            );

            if (session.description) {
                docSections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Description: ', bold: true }),
                            new TextRun(session.description)
                        ],
                        spacing: { after: 50 }
                    })
                );
            }

            // Conversation section
            docSections.push(
                new Paragraph({
                    text: 'Conversation',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Messages
            messages.forEach((msg, index) => {
                const isUser = msg.role === 'user';
                const roleText = isUser ? '👤 User' : '🤖 Assistant';
                const timestamp = new Date(msg.sent_at).toLocaleTimeString('fr-FR');

                // Role header
                docSections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${roleText} (${timestamp})`,
                                bold: true,
                                color: isUser ? '059669' : '2563EB'
                            })
                        ],
                        spacing: { before: 200, after: 100 }
                    })
                );

                // Message content (split by newlines for proper formatting)
                const contentLines = msg.content.split('\n');
                contentLines.forEach(line => {
                    docSections.push(
                        new Paragraph({
                            text: line || ' ',
                            spacing: { after: 50 }
                        })
                    );
                });

                // Model info
                if (!isUser && msg.model) {
                    docSections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Model: ${msg.model}${msg.tokens ? ` • ${msg.tokens} tokens` : ''}`,
                                    italics: true,
                                    size: 18,
                                    color: '999999'
                                })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                }
            });

            // Statistics section
            docSections.push(
                new Paragraph({
                    text: 'Statistics',
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Total Messages: ', bold: true }),
                        new TextRun(messages.length.toString())
                    ],
                    spacing: { after: 50 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'User Messages: ', bold: true }),
                        new TextRun(messages.filter(m => m.role === 'user').length.toString())
                    ],
                    spacing: { after: 50 }
                })
            );

            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Assistant Messages: ', bold: true }),
                        new TextRun(messages.filter(m => m.role === 'assistant').length.toString())
                    ],
                    spacing: { after: 50 }
                })
            );

            const totalTokens = messages.reduce((sum, m) => sum + (m.tokens || 0), 0);
            if (totalTokens > 0) {
                docSections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Total Tokens: ', bold: true }),
                            new TextRun(totalTokens.toLocaleString())
                        ],
                        spacing: { after: 50 }
                    })
                );
            }

            // Footer
            docSections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Exported from Lucide AI Assistant on ${new Date().toLocaleString('fr-FR')}`,
                            italics: true,
                            size: 18,
                            color: '666666'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 }
                })
            );

            // Create document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: docSections
                }]
            });

            // Generate buffer and save
            const buffer = await Packer.toBuffer(doc);
            await fs.writeFile(filePath, buffer);

            console.log(`[ExportService] DOCX export successful: ${filePath}`);
            return {
                success: true,
                filePath,
                format: 'docx',
                size: buffer.length
            };
        } catch (error) {
            console.error('[ExportService] Error exporting to DOCX:', error);
            throw new Error(`Failed to export to DOCX: ${error.message}`);
        }
    }

    /**
     * Get suggested filename for export
     * @param {Object} session - Session object
     * @param {string} format - Export format (json, md, pdf, docx)
     * @returns {string} Suggested filename
     */
    getSuggestedFilename(session, format) {
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const sanitizedTitle = (session.title || 'conversation')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);

        const extensions = {
            json: 'json',
            markdown: 'md',
            pdf: 'pdf',
            docx: 'docx'
        };

        return `lucide-${sanitizedTitle}-${timestamp}.${extensions[format] || 'txt'}`;
    }
}

// Singleton instance
const exportService = new ExportService();

module.exports = exportService;
