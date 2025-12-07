/**
 * Export Service - Phase 5: Document Export
 *
 * Provides export functionality for conversations, summaries, and sessions
 * Supports: JSON, Markdown, PDF, DOCX formats
 *
 * FIX-C1: Dependencies loaded dynamically to prevent crash if not installed
 * FIX-C2: Timeout protection (60s) on exports to prevent hanging
 * OPT-M3: Session data cache to avoid repeated DB calls
 * OPT-L1: Structured logging for better debugging
 */

const fs = require('fs').promises;
const path = require('path');
const conversationHistoryService = require('./conversationHistoryService');

// FIX-C1: Dynamic dependency loading with graceful fallback
let PDFDocument = null;
let docxModule = null;

// OPT-M3: Session data cache (TTL: 30 seconds)
const sessionCache = new Map();
const CACHE_TTL_MS = 30000;

/**
 * OPT-L1: Structured logger for export operations
 */
const exportLogger = {
    info: (operation, data = {}) => {
        console.log(`[ExportService] ${operation}`, JSON.stringify({ timestamp: Date.now(), ...data }));
    },
    warn: (operation, data = {}) => {
        console.warn(`[ExportService] ⚠️ ${operation}`, JSON.stringify({ timestamp: Date.now(), ...data }));
    },
    error: (operation, error, data = {}) => {
        console.error(`[ExportService] ❌ ${operation}`, JSON.stringify({
            timestamp: Date.now(),
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join(' | '),
            ...data
        }));
    },
    success: (operation, data = {}) => {
        console.log(`[ExportService] ✅ ${operation}`, JSON.stringify({ timestamp: Date.now(), ...data }));
    }
};

/**
 * OPT-M3: Get cached session data or fetch from DB
 * @param {string} sessionId - Session ID
 * @returns {Promise<{session: Object, messages: Array}>} Cached or fresh data
 */
async function getCachedSessionData(sessionId) {
    const cacheKey = `session_${sessionId}`;
    const cached = sessionCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        exportLogger.info('CACHE_HIT', { sessionId, age_ms: Date.now() - cached.timestamp });
        return cached.data;
    }

    // Fetch fresh data
    exportLogger.info('CACHE_MISS', { sessionId });
    const session = await conversationHistoryService.getSession(sessionId);
    const messages = await conversationHistoryService.getSessionMessages(sessionId);

    // Store in cache
    sessionCache.set(cacheKey, {
        timestamp: Date.now(),
        data: { session, messages }
    });

    // OPT-M5: Clean old cache entries
    cleanExpiredCache();

    return { session, messages };
}

/**
 * OPT-M5: Clean expired cache entries
 */
function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of sessionCache.entries()) {
        if (now - value.timestamp > CACHE_TTL_MS * 2) {
            sessionCache.delete(key);
            exportLogger.info('CACHE_CLEANUP', { key });
        }
    }
}

/**
 * Load pdfkit dynamically
 * @returns {Object|null} PDFDocument class or null if not available
 */
function loadPDFKit() {
    if (PDFDocument) return PDFDocument;
    try {
        PDFDocument = require('pdfkit');
        console.log('[ExportService] pdfkit loaded successfully');
        return PDFDocument;
    } catch (error) {
        console.warn('[ExportService] pdfkit not available:', error.message);
        return null;
    }
}

/**
 * Load docx dynamically
 * @returns {Object|null} docx module or null if not available
 */
function loadDocx() {
    if (docxModule) return docxModule;
    try {
        docxModule = require('docx');
        console.log('[ExportService] docx loaded successfully');
        return docxModule;
    } catch (error) {
        console.warn('[ExportService] docx not available:', error.message);
        return null;
    }
}

/**
 * FIX-C2: Wrap async operation with timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default: 60000)
 * @param {string} operationName - Name of operation for error message
 * @returns {Promise} Promise that rejects on timeout
 */
function withTimeout(promise, timeoutMs = 60000, operationName = 'Export') {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${operationName} timed out after ${timeoutMs / 1000} seconds`));
            }, timeoutMs);
        })
    ]);
}

/**
 * @class ExportService
 * @description Service for exporting conversations and summaries to various formats
 */
class ExportService {
    constructor() {
        console.log('[ExportService] Service initialized');
    }

    /**
     * IMP-M2: Validate that session has content before export
     * @param {Object} session - Session object
     * @param {Array} messages - Array of messages
     * @throws {Error} If session is empty or invalid
     */
    _validateExportData(session, messages) {
        if (!session) {
            throw new Error('Session introuvable');
        }

        if (!messages || messages.length === 0) {
            throw new Error('Cette conversation est vide. Aucun message à exporter.');
        }

        // Check if there's at least one message with content
        const hasContent = messages.some(msg => msg.content && msg.content.trim().length > 0);
        if (!hasContent) {
            throw new Error('La conversation ne contient aucun message avec du contenu.');
        }
    }

    /**
     * Export conversation to JSON format
     * @param {string} sessionId - Session ID
     * @param {string} filePath - Output file path
     * @returns {Promise<Object>} Export result
     */
    async exportToJSON(sessionId, filePath) {
        const startTime = Date.now();
        exportLogger.info('EXPORT_START', { sessionId, format: 'json', filePath });

        try {
            // OPT-M3: Use cached session data
            const { session, messages } = await getCachedSessionData(sessionId);

            // IMP-M2: Validate session has content
            this._validateExportData(session, messages);

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

            const duration = Date.now() - startTime;
            const size = Buffer.byteLength(JSON.stringify(exportData));
            exportLogger.success('EXPORT_COMPLETE', { sessionId, format: 'json', filePath, size, duration_ms: duration });

            return {
                success: true,
                filePath,
                format: 'json',
                size
            };
        } catch (error) {
            exportLogger.error('EXPORT_FAILED', error, { sessionId, format: 'json' });
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
        const startTime = Date.now();
        exportLogger.info('EXPORT_START', { sessionId, format: 'markdown', filePath });

        try {
            // OPT-M3: Use cached session data
            const { session, messages } = await getCachedSessionData(sessionId);

            // IMP-M2: Validate session has content
            this._validateExportData(session, messages);

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

            const duration = Date.now() - startTime;
            const size = Buffer.byteLength(markdown);
            exportLogger.success('EXPORT_COMPLETE', { sessionId, format: 'markdown', filePath, size, duration_ms: duration });

            return {
                success: true,
                filePath,
                format: 'markdown',
                size
            };
        } catch (error) {
            exportLogger.error('EXPORT_FAILED', error, { sessionId, format: 'markdown' });
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
        const startTime = Date.now();
        exportLogger.info('EXPORT_START', { sessionId, format: 'pdf', filePath });

        // FIX-C1: Load pdfkit dynamically
        const PDFDoc = loadPDFKit();
        if (!PDFDoc) {
            exportLogger.error('DEPENDENCY_MISSING', new Error('pdfkit not installed'), { format: 'pdf' });
            throw new Error('PDF export unavailable: pdfkit module not installed. Run: npm install pdfkit');
        }

        try {
            // OPT-M3: Use cached session data
            const { session, messages } = await getCachedSessionData(sessionId);

            // IMP-M2: Validate session has content
            this._validateExportData(session, messages);

            // FIX-C2: Wrap export in timeout (60 seconds)
            const exportPromise = new Promise(async (resolve, reject) => {
                try {
                    // Create PDF document
                    const doc = new PDFDoc({
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
                        const duration = Date.now() - startTime;
                        exportLogger.success('EXPORT_COMPLETE', { sessionId, format: 'pdf', filePath, duration_ms: duration });
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

            // FIX-C2: Apply 60-second timeout
            return withTimeout(exportPromise, 60000, 'PDF export');
        } catch (error) {
            exportLogger.error('EXPORT_FAILED', error, { sessionId, format: 'pdf' });
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
        const startTime = Date.now();
        exportLogger.info('EXPORT_START', { sessionId, format: 'docx', filePath });

        // FIX-C1: Load docx dynamically
        const docx = loadDocx();
        if (!docx) {
            exportLogger.error('DEPENDENCY_MISSING', new Error('docx not installed'), { format: 'docx' });
            throw new Error('DOCX export unavailable: docx module not installed. Run: npm install docx');
        }

        // Destructure docx components
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

        // FIX-C2: Wrap export logic in timeout
        const exportLogic = async () => {
            // OPT-M3: Use cached session data
            const { session, messages } = await getCachedSessionData(sessionId);

            // IMP-M2: Validate session has content
            this._validateExportData(session, messages);

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

            const duration = Date.now() - startTime;
            exportLogger.success('EXPORT_COMPLETE', { sessionId, format: 'docx', filePath, size: buffer.length, duration_ms: duration });

            return {
                success: true,
                filePath,
                format: 'docx',
                size: buffer.length
            };
        };

        // FIX-C2: Apply 60-second timeout
        try {
            return await withTimeout(exportLogic(), 60000, 'DOCX export');
        } catch (error) {
            exportLogger.error('EXPORT_FAILED', error, { sessionId, format: 'docx' });
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

    /**
     * NEW-5: Export multiple sessions in batch
     * @param {Array<string>} sessionIds - Array of session IDs
     * @param {string} format - Export format
     * @param {string} outputDir - Output directory
     * @returns {Promise<Object>} Batch export results
     */
    async exportBatch(sessionIds, format, outputDir) {
        const startTime = Date.now();
        exportLogger.info('BATCH_EXPORT_START', { count: sessionIds.length, format, outputDir });

        const results = {
            success: true,
            total: sessionIds.length,
            exported: 0,
            failed: 0,
            files: [],
            errors: []
        };

        // Export methods mapping
        const exportMethods = {
            json: this.exportToJSON.bind(this),
            markdown: this.exportToMarkdown.bind(this),
            pdf: this.exportToPDF.bind(this),
            docx: this.exportToDOCX.bind(this)
        };

        const exportFn = exportMethods[format];
        if (!exportFn) {
            throw new Error(`Unsupported batch export format: ${format}`);
        }

        // Process sessions sequentially to avoid overwhelming system
        for (const sessionId of sessionIds) {
            try {
                // Get session for filename
                const { session } = await getCachedSessionData(sessionId);
                const filename = this.getSuggestedFilename(session, format);
                const filePath = path.join(outputDir, filename);

                // Export
                const result = await exportFn(sessionId, filePath);

                results.exported++;
                results.files.push({
                    sessionId,
                    filePath: result.filePath,
                    size: result.size
                });

            } catch (error) {
                results.failed++;
                results.errors.push({
                    sessionId,
                    error: error.message
                });
                exportLogger.warn('BATCH_EXPORT_ITEM_FAILED', { sessionId, error: error.message });
            }
        }

        results.success = results.failed === 0;
        const duration = Date.now() - startTime;

        exportLogger.info('BATCH_EXPORT_COMPLETE', {
            total: results.total,
            exported: results.exported,
            failed: results.failed,
            duration_ms: duration
        });

        return results;
    }

    /**
     * OPT-M5: Clear session cache (useful after session updates)
     * @param {string} sessionId - Optional specific session to clear, or all if not provided
     */
    clearCache(sessionId = null) {
        if (sessionId) {
            const cacheKey = `session_${sessionId}`;
            sessionCache.delete(cacheKey);
            exportLogger.info('CACHE_CLEARED', { sessionId });
        } else {
            sessionCache.clear();
            exportLogger.info('CACHE_CLEARED_ALL', { cleared: sessionCache.size });
        }
    }

    /**
     * OPT-L1: Get cache statistics for debugging
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        const entries = Array.from(sessionCache.entries());
        const stats = {
            size: sessionCache.size,
            entries: entries.map(([key, value]) => ({
                key,
                age_ms: now - value.timestamp,
                expired: (now - value.timestamp) > CACHE_TTL_MS
            }))
        };
        return stats;
    }
}

// Singleton instance
const exportService = new ExportService();

module.exports = exportService;
