const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// P3-3: Timeout constants for export operations
const EXPORT_TIMEOUT_MS = 30000;      // 30 seconds for simple exports (MD, TXT, HTML)
const EXPORT_TIMEOUT_HEAVY_MS = 60000; // 60 seconds for heavy exports (PDF, Word, Excel)

/**
 * Export Service
 * Gère l'export des notes de réunion dans différents formats
 * Formats supportés: Markdown, Text, HTML, SRT, VTT
 */
class ExportService {
    constructor() {
        this.defaultExportPath = path.join(app.getPath('documents'), 'Lucide', 'Meetings');
        this._ensureExportDirectoryExists();
    }

    /**
     * P3-3: Execute async function with timeout protection
     * @private
     */
    _withTimeout(asyncFn, timeoutMs, operationName) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Export ${operationName} timeout après ${timeoutMs / 1000}s. Vérifiez votre espace disque et réessayez.`));
            }, timeoutMs);

            asyncFn()
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * P3-5: Validate meeting notes data before export
     * @param {Object} meetingNotes - Meeting notes to validate
     * @param {string} format - Export format
     * @throws {Error} If data is invalid
     * @private
     */
    _validateExportData(meetingNotes, format) {
        if (!meetingNotes) {
            throw new Error('Aucune note de réunion à exporter.');
        }

        if (!meetingNotes.id && !meetingNotes.session_id) {
            throw new Error('Données de notes invalides (ID manquant).');
        }

        // Check if there's any meaningful content
        const data = this._parseNoteData(meetingNotes);
        const hasContent = !!(
            data.executiveSummary ||
            (data.keyPoints && data.keyPoints.length > 0) ||
            (data.decisions && data.decisions.length > 0) ||
            (data.actionItems && data.actionItems.length > 0)
        );

        if (!hasContent) {
            throw new Error('Les notes ne contiennent pas de contenu significatif à exporter. Générez d\'abord un compte-rendu.');
        }

        // Validate file path accessibility
        if (!this.defaultExportPath) {
            throw new Error('Chemin d\'export non configuré. Vérifiez vos paramètres.');
        }

        console.log(`[ExportService] P3-5: Data validated for ${format} export`);
    }

    /**
     * Export meeting notes to Markdown format
     * @param {Object} meetingNotes - Meeting notes object from database
     * @param {Array<Object>} tasks - Array of tasks
     * @param {Array<Object>} transcripts - Original transcripts
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToMarkdown(meetingNotes, tasks, transcripts, customPath = null) {
        console.log('[ExportService] Exporting to Markdown...');

        // P3-5: Validate data before export
        this._validateExportData(meetingNotes, 'Markdown');

        const markdown = this._generateMarkdownContent(meetingNotes, tasks, transcripts);
        const fileName = this._generateFileName(meetingNotes, 'md');
        const filePath = customPath || path.join(this.defaultExportPath, fileName);

        await fs.promises.writeFile(filePath, markdown, 'utf8');
        console.log(`[ExportService] ✅ Markdown exported to: ${filePath}`);

        return filePath;
    }

    /**
     * Export to plain text format
     * @param {Object} meetingNotes - Meeting notes object
     * @param {Array<Object>} tasks - Array of tasks
     * @param {Array<Object>} transcripts - Original transcripts
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToText(meetingNotes, tasks, transcripts, customPath = null) {
        console.log('[ExportService] Exporting to Text...');

        const text = this._generateTextContent(meetingNotes, tasks, transcripts);
        const fileName = this._generateFileName(meetingNotes, 'txt');
        const filePath = customPath || path.join(this.defaultExportPath, fileName);

        await fs.promises.writeFile(filePath, text, 'utf8');
        console.log(`[ExportService] ✅ Text exported to: ${filePath}`);

        return filePath;
    }

    /**
     * Export to HTML format (for email)
     * @param {Object} meetingNotes - Meeting notes object
     * @param {Array<Object>} tasks - Array of tasks
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToHTML(meetingNotes, tasks, customPath = null) {
        console.log('[ExportService] Exporting to HTML...');

        const html = this._generateHTMLContent(meetingNotes, tasks);
        const fileName = this._generateFileName(meetingNotes, 'html');
        const filePath = customPath || path.join(this.defaultExportPath, fileName);

        await fs.promises.writeFile(filePath, html, 'utf8');
        console.log(`[ExportService] ✅ HTML exported to: ${filePath}`);

        return filePath;
    }

    /**
     * Export transcripts to SRT (SubRip subtitle format)
     * @param {Array<Object>} transcripts - Array of transcripts with timestamps
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToSRT(transcripts, sessionId, customPath = null) {
        console.log('[ExportService] Exporting to SRT...');

        const srt = this._generateSRTContent(transcripts);
        const fileName = `meeting_${sessionId}_subtitles.srt`;
        const filePath = customPath || path.join(this.defaultExportPath, fileName);

        await fs.promises.writeFile(filePath, srt, 'utf8');
        console.log(`[ExportService] ✅ SRT exported to: ${filePath}`);

        return filePath;
    }

    /**
     * Export transcripts to VTT (WebVTT subtitle format)
     * @param {Array<Object>} transcripts - Array of transcripts with timestamps
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToVTT(transcripts, sessionId, customPath = null) {
        console.log('[ExportService] Exporting to VTT...');

        const vtt = this._generateVTTContent(transcripts);
        const fileName = `meeting_${sessionId}_subtitles.vtt`;
        const filePath = customPath || path.join(this.defaultExportPath, fileName);

        await fs.promises.writeFile(filePath, vtt, 'utf8');
        console.log(`[ExportService] ✅ VTT exported to: ${filePath}`);

        return filePath;
    }

    /**
     * Generate Markdown content
     * @private
     */
    _generateMarkdownContent(meetingNotes, tasks, transcripts) {
        const data = this._parseNoteData(meetingNotes);

        let md = `# COMPTE-RENDU DE RÉUNION\n\n`;

        // Metadata
        md += `Date: ${new Date(meetingNotes.created_at * 1000).toLocaleString('fr-FR')}\n`;
        if (data.meetingMetadata?.duration) {
            md += `Durée: ${data.meetingMetadata.duration}\n`;
        }
        md += `\n---\n\n`;

        // Executive Summary
        if (data.executiveSummary) {
            md += `## RÉSUMÉ EXÉCUTIF\n\n${data.executiveSummary}\n\n`;
        }

        // Participants
        if (data.participants && data.participants.length > 0) {
            md += `## PARTICIPANTS\n\n`;
            data.participants.forEach(p => {
                const name = typeof p === 'string' ? p : (p.name || p.participant_name || 'Participant');
                const role = (typeof p === 'object' && p.role) ? ` (${p.role})` : '';
                md += `- ${name}${role}\n`;
            });
            md += `\n`;
        }

        // Key Points
        if (data.keyPoints && data.keyPoints.length > 0) {
            md += `## POINTS CLÉS\n\n`;
            data.keyPoints.forEach(point => md += `- ${point}\n`);
            md += `\n`;
        }

        // Decisions
        if (data.decisions && data.decisions.length > 0) {
            md += `## DÉCISIONS PRISES\n\n`;
            data.decisions.forEach((decision, i) => {
                md += `### Décision ${i + 1}: ${decision.decision || decision.title || 'Décision'}\n`;
                md += `${decision.description || decision.rationale || ''}\n\n`;
            });
        }

        // Action Items / Tasks
        if (tasks && tasks.length > 0) {
            md += `## ACTIONS À SUIVRE\n\n`;
            tasks.forEach((task, i) => {
                md += `${i + 1}. ${task.task_description}\n`;
                md += `   Assigné à: ${task.assigned_to}\n`;
                md += `   Deadline: ${task.deadline}\n`;
                md += `   Priorité: ${task.priority}\n`;
                if (task.context) {
                    md += `   Contexte: ${task.context}\n`;
                }
                md += `\n`;
            });
        }

        // Timeline
        if (data.timeline && data.timeline.length > 0) {
            md += `## TIMELINE DE LA RÉUNION\n\n`;
            data.timeline.forEach(segment => {
                md += `- ${segment.time}: ${segment.topic}`;
                if (segment.duration) {
                    md += ` (${segment.duration})`;
                }
                md += `\n`;
            });
            md += `\n`;
        }

        // Unresolved Items
        if (data.unresolvedItems && data.unresolvedItems.length > 0) {
            md += `## POINTS EN SUSPENS\n\n`;
            data.unresolvedItems.forEach(item => md += `- ${item}\n`);
            md += `\n`;
        }

        // Next Steps
        if (data.nextSteps && data.nextSteps.length > 0) {
            md += `## PROCHAINES ÉTAPES\n\n`;
            data.nextSteps.forEach(step => md += `- ${step}\n`);
            md += `\n`;
        }

        // Important Quotes
        if (data.importantQuotes && data.importantQuotes.length > 0) {
            md += `## CITATIONS IMPORTANTES\n\n`;
            data.importantQuotes.forEach(quote => {
                md += `"${quote.quote}"\n— ${quote.speaker}\n`;
                if (quote.context) {
                    md += `Contexte: ${quote.context}\n`;
                }
                md += `\n`;
            });
        }

        // Transcript
        if (transcripts && transcripts.length > 0) {
            md += `\n---\n\n## TRANSCRIPTION COMPLÈTE\n\n`;
            transcripts.forEach(t => {
                const time = t.created_at ? new Date(t.created_at * 1000).toLocaleTimeString('fr-FR') : '';
                md += `[${time}] ${t.speaker}: ${t.text}\n\n`;
            });
        }

        md += `\n---\n\nGénéré par Lucide Meeting Assistant\n`;

        return md;
    }

    /**
     * Generate plain text content
     * @private
     */
    _generateTextContent(meetingNotes, tasks, transcripts) {
        const data = this._parseNoteData(meetingNotes);

        let text = `═══════════════════════════════════════════════════════════\n`;
        text += `              COMPTE-RENDU DE RÉUNION\n`;
        text += `═══════════════════════════════════════════════════════════\n\n`;

        // Metadata
        text += `Date: ${new Date(meetingNotes.created_at * 1000).toLocaleString('fr-FR')}\n`;
        if (data.meetingMetadata?.duration) {
            text += `Durée: ${data.meetingMetadata.duration}\n`;
        }
        text += `\n${'─'.repeat(60)}\n\n`;

        // Executive Summary
        if (data.executiveSummary) {
            text += `RÉSUMÉ EXÉCUTIF\n\n${data.executiveSummary}\n\n`;
        }

        // Participants
        if (data.participants && data.participants.length > 0) {
            text += `PARTICIPANTS\n\n`;
            data.participants.forEach(p => {
                const name = typeof p === 'string' ? p : (p.name || p.participant_name || 'Participant');
                const role = (typeof p === 'object' && p.role) ? ` (${p.role})` : '';
                text += `  • ${name}${role}\n`;
            });
            text += `\n`;
        }

        // Key Points
        if (data.keyPoints && data.keyPoints.length > 0) {
            text += `POINTS CLÉS\n\n`;
            data.keyPoints.forEach((point, i) => text += `  ${i + 1}. ${point}\n`);
            text += `\n`;
        }

        // Decisions
        if (data.decisions && data.decisions.length > 0) {
            text += `DÉCISIONS PRISES\n\n`;
            data.decisions.forEach((decision, i) => {
                text += `  ${i + 1}. ${decision.decision || decision.title}\n`;
                text += `     ${decision.description || decision.rationale || ''}\n\n`;
            });
        }

        // Tasks
        if (tasks && tasks.length > 0) {
            text += `ACTIONS À SUIVRE\n\n`;
            tasks.forEach((task, i) => {
                text += `  ${i + 1}. ${task.task_description}\n`;
                text += `     Assigné à: ${task.assigned_to} | Deadline: ${task.deadline} | Priorité: ${task.priority}\n`;
                if (task.context) {
                    text += `     Contexte: ${task.context}\n`;
                }
                text += `\n`;
            });
        }

        text += `${'─'.repeat(60)}\n\n`;
        text += `Généré par Lucide Meeting Assistant\n`;

        return text;
    }

    /**
     * Generate HTML content (for email)
     * @private
     */
    _generateHTMLContent(meetingNotes, tasks) {
        const data = this._parseNoteData(meetingNotes);

        let html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compte-rendu de réunion</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; }
        ul { list-style-type: none; padding-left: 0; }
        li { margin-bottom: 10px; padding-left: 20px; position: relative; }
        li:before { content: "•"; color: #3498db; font-weight: bold; position: absolute; left: 0; }
        .task { background: #fff3cd; padding: 10px; margin-bottom: 10px; border-left: 4px solid #ffc107; }
        .decision { background: #d1ecf1; padding: 10px; margin-bottom: 10px; border-left: 4px solid #17a2b8; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>COMPTE-RENDU DE RÉUNION</h1>

    <div class="metadata">
        <strong>Date:</strong> ${new Date(meetingNotes.created_at * 1000).toLocaleString('fr-FR')}<br>
        ${data.meetingMetadata?.duration ? `<strong>Durée:</strong> ${data.meetingMetadata.duration}<br>` : ''}
    </div>`;

        if (data.executiveSummary) {
            html += `\n    <div class="summary">
        <h2>RÉSUMÉ EXÉCUTIF</h2>
        <p>${data.executiveSummary}</p>
    </div>`;
        }

        if (data.participants && data.participants.length > 0) {
            html += `\n    <h2>PARTICIPANTS</h2>
    <ul>`;
            data.participants.forEach(p => {
                const name = typeof p === 'string' ? p : (p.name || p.participant_name || 'Participant');
                const role = (typeof p === 'object' && p.role) ? ` <em>(${p.role})</em>` : '';
                html += `\n        <li>${name}${role}</li>`;
            });
            html += `\n    </ul>`;
        }

        if (data.keyPoints && data.keyPoints.length > 0) {
            html += `\n    <h2>POINTS CLÉS</h2>
    <ul>`;
            data.keyPoints.forEach(point => html += `\n        <li>${point}</li>`);
            html += `\n    </ul>`;
        }

        if (data.decisions && data.decisions.length > 0) {
            html += `\n    <h2>DÉCISIONS PRISES</h2>`;
            data.decisions.forEach((decision, i) => {
                html += `\n    <div class="decision">
        <strong>${decision.decision || decision.title || `Décision ${i + 1}`}</strong><br>
        ${decision.description || decision.rationale || ''}
    </div>`;
            });
        }

        if (tasks && tasks.length > 0) {
            html += `\n    <h2>ACTIONS À SUIVRE</h2>`;
            tasks.forEach((task, i) => {
                html += `\n    <div class="task">
        <strong>${i + 1}. ${task.task_description}</strong><br>
        Assigné à: ${task.assigned_to} | Deadline: ${task.deadline} | Priorité: ${task.priority}
        ${task.context ? `<br>Contexte: ${task.context}` : ''}
    </div>`;
            });
        }

        html += `\n    <div class="footer">
        <p><em>Généré par Lucide Meeting Assistant</em></p>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Generate SRT subtitle content
     * @private
     */
    _generateSRTContent(transcripts) {
        let srt = '';
        let index = 1;

        transcripts.forEach((transcript, i) => {
            const startTime = transcript.start_at || (i * 2); // Estimate if not available
            const endTime = transcript.end_at || (startTime + 2);

            srt += `${index}\n`;
            srt += `${this._formatSRTTime(startTime)} --> ${this._formatSRTTime(endTime)}\n`;
            srt += `${transcript.speaker}: ${transcript.text}\n`;
            srt += `\n`;

            index++;
        });

        return srt;
    }

    /**
     * Generate VTT subtitle content
     * @private
     */
    _generateVTTContent(transcripts) {
        let vtt = 'WEBVTT\n\n';

        transcripts.forEach((transcript, i) => {
            const startTime = transcript.start_at || (i * 2);
            const endTime = transcript.end_at || (startTime + 2);

            vtt += `${this._formatVTTTime(startTime)} --> ${this._formatVTTTime(endTime)}\n`;
            vtt += `<v ${transcript.speaker}>${transcript.text}\n`;
            vtt += `\n`;
        });

        return vtt;
    }

    /**
     * Format time for SRT (HH:MM:SS,mmm)
     * @private
     */
    _formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
    }

    /**
     * Format time for VTT (HH:MM:SS.mmm)
     * @private
     */
    _formatVTTTime(seconds) {
        return this._formatSRTTime(seconds).replace(',', '.');
    }

    /**
     * Parse note data from JSON strings
     * @private
     */
    _parseNoteData(meetingNotes) {
        const data = {};

        try {
            data.executiveSummary = meetingNotes.executive_summary || '';
            data.participants = JSON.parse(meetingNotes.participants || '[]');
            data.meetingMetadata = JSON.parse(meetingNotes.meeting_metadata || '{}');
            data.keyPoints = JSON.parse(meetingNotes.key_points || '[]');
            data.decisions = JSON.parse(meetingNotes.decisions || '[]');
            data.timeline = JSON.parse(meetingNotes.timeline || '[]');
            data.unresolvedItems = JSON.parse(meetingNotes.unresolved_items || '[]');
            data.nextSteps = JSON.parse(meetingNotes.next_steps || '[]');
            data.importantQuotes = JSON.parse(meetingNotes.important_quotes || '[]');
        } catch (error) {
            console.error('[ExportService] Error parsing note data:', error);
        }

        return data;
    }

    /**
     * Generate filename based on meeting notes
     * @private
     */
    _generateFileName(meetingNotes, extension) {
        const date = new Date(meetingNotes.created_at * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');

        return `meeting_${dateStr}_${timeStr}.${extension}`;
    }

    /**
     * Ensure export directory exists
     * @private
     */
    _ensureExportDirectoryExists() {
        if (!fs.existsSync(this.defaultExportPath)) {
            fs.mkdirSync(this.defaultExportPath, { recursive: true });
            console.log(`[ExportService] Created export directory: ${this.defaultExportPath}`);
        }
    }

    /**
     * Export to PDF format
     * @param {Object} meetingNotes - Meeting notes object
     * @param {Array<Object>} tasks - Array of tasks
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToPDF(meetingNotes, tasks, customPath = null) {
        console.log('[ExportService] Exporting to PDF...');

        // P3-5: Validate data before export
        this._validateExportData(meetingNotes, 'PDF');

        // P1-3: Safely load optional dependency
        let PDFDocument;
        try {
            PDFDocument = require('pdfkit');
        } catch (requireError) {
            console.error('[ExportService] P1-3: pdfkit library not installed');
            throw new Error('L\'export PDF n\'est pas disponible. La bibliothèque "pdfkit" n\'est pas installée. Utilisez plutôt l\'export Markdown ou HTML.');
        }

        try {
            const data = this._parseNoteData(meetingNotes);

            const fileName = this._generateFileName(meetingNotes, 'pdf');
            const filePath = customPath || path.join(this.defaultExportPath, fileName);

            // P3-3: Wrap PDF generation with timeout
            return this._withTimeout(() => new Promise((resolve, reject) => {
                const doc = new PDFDocument({ margin: 50 });
                const stream = fs.createWriteStream(filePath);

                stream.on('finish', () => {
                    console.log(`[ExportService] ✅ PDF exported to: ${filePath}`);
                    resolve(filePath);
                });

                stream.on('error', reject);
                doc.pipe(stream);

                // Title
                doc.fontSize(20).font('Helvetica-Bold').text('COMPTE-RENDU DE RÉUNION', { align: 'center' });
                doc.moveDown();

                // Metadata
                doc.fontSize(10).font('Helvetica')
                    .text(`Date: ${new Date(meetingNotes.created_at * 1000).toLocaleString('fr-FR')}`, { align: 'center' });
                if (data.meetingMetadata?.duration) {
                    doc.text(`Durée: ${data.meetingMetadata.duration}`, { align: 'center' });
                }
                doc.moveDown(2);

                // Executive Summary
                if (data.executiveSummary) {
                    doc.fontSize(14).font('Helvetica-Bold').text('RÉSUMÉ EXÉCUTIF');
                    doc.moveDown(0.5);
                    doc.fontSize(11).font('Helvetica').text(data.executiveSummary);
                    doc.moveDown();
                }

                // Participants
                if (data.participants && data.participants.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('PARTICIPANTS');
                    doc.moveDown(0.5);
                    doc.fontSize(11).font('Helvetica');
                    data.participants.forEach(p => {
                        const name = typeof p === 'string' ? p : (p.name || p.participant_name || 'Participant');
                        const role = (typeof p === 'object' && p.role) ? ` (${p.role})` : '';
                        doc.text(`- ${name}${role}`);
                    });
                    doc.moveDown();
                }

                // Key Points
                if (data.keyPoints && data.keyPoints.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('POINTS CLÉS');
                    doc.moveDown(0.5);
                    doc.fontSize(11).font('Helvetica');
                    data.keyPoints.forEach(point => doc.text(`- ${point}`, { indent: 10 }));
                    doc.moveDown();
                }

                // Decisions
                if (data.decisions && data.decisions.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('DÉCISIONS PRISES');
                    doc.moveDown(0.5);
                    doc.fontSize(11).font('Helvetica');
                    data.decisions.forEach((decision, i) => {
                        doc.font('Helvetica-Bold').text(`${i + 1}. ${decision.decision || decision.title || 'Décision'}`);
                        doc.font('Helvetica').text(decision.description || decision.rationale || '', { indent: 15 });
                        doc.moveDown(0.5);
                    });
                }

                // Tasks
                if (tasks && tasks.length > 0) {
                    doc.fontSize(14).font('Helvetica-Bold').text('ACTIONS À SUIVRE');
                    doc.moveDown(0.5);
                    doc.fontSize(11).font('Helvetica');
                    tasks.forEach((task, i) => {
                        doc.font('Helvetica-Bold').text(`${i + 1}. ${task.task_description}`);
                        doc.font('Helvetica')
                            .text(`   Assigné à: ${task.assigned_to} | Deadline: ${task.deadline} | Priorité: ${task.priority}`);
                        if (task.context) {
                            doc.text(`   Contexte: ${task.context}`, { indent: 15 });
                        }
                        doc.moveDown(0.5);
                    });
                }

                // Footer
                doc.moveDown(2);
                doc.fontSize(9).font('Helvetica-Oblique').text('Généré par Lucide Meeting Assistant', { align: 'center' });

                doc.end();
            }), EXPORT_TIMEOUT_HEAVY_MS, 'PDF'); // P3-3: Close timeout wrapper
        } catch (error) {
            console.error('[ExportService] Error exporting to PDF:', error);
            throw error;
        }
    }

    /**
     * Export to Word (DOCX) format
     * @param {Object} meetingNotes - Meeting notes object
     * @param {Array<Object>} tasks - Array of tasks
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToWord(meetingNotes, tasks, customPath = null) {
        console.log('[ExportService] Exporting to Word...');

        // P3-5: Validate data before export
        this._validateExportData(meetingNotes, 'Word');

        // P1-3: Safely load optional dependency
        let docxLib;
        try {
            docxLib = require('docx');
        } catch (requireError) {
            console.error('[ExportService] P1-3: docx library not installed');
            throw new Error('L\'export Word n\'est pas disponible. La bibliothèque "docx" n\'est pas installée. Utilisez plutôt l\'export Markdown ou HTML.');
        }

        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docxLib;

        try {
            const data = this._parseNoteData(meetingNotes);

            const fileName = this._generateFileName(meetingNotes, 'docx');
            const filePath = customPath || path.join(this.defaultExportPath, fileName);

            const children = [];

            // Title
            children.push(
                new Paragraph({
                    text: 'COMPTE-RENDU DE RÉUNION',
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );

            // Metadata
            children.push(
                new Paragraph({
                    text: `Date: ${new Date(meetingNotes.created_at * 1000).toLocaleString('fr-FR')}`,
                    alignment: AlignmentType.CENTER
                })
            );
            if (data.meetingMetadata?.duration) {
                children.push(
                    new Paragraph({
                        text: `Durée: ${data.meetingMetadata.duration}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    })
                );
            }

            // Executive Summary
            if (data.executiveSummary) {
                children.push(
                    new Paragraph({ text: 'RÉSUMÉ EXÉCUTIF', heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }),
                    new Paragraph({ text: data.executiveSummary, spacing: { after: 200 } })
                );
            }

            // Participants
            if (data.participants && data.participants.length > 0) {
                children.push(new Paragraph({ text: 'PARTICIPANTS', heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }));
                data.participants.forEach(p => {
                    const name = typeof p === 'string' ? p : (p.name || p.participant_name || 'Participant');
                    const role = (typeof p === 'object' && p.role) ? ` (${p.role})` : '';
                    children.push(new Paragraph({ text: `- ${name}${role}`, indent: { left: 300 } }));
                });
                children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            }

            // Key Points
            if (data.keyPoints && data.keyPoints.length > 0) {
                children.push(new Paragraph({ text: 'POINTS CLÉS', heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }));
                data.keyPoints.forEach(point => {
                    children.push(new Paragraph({ text: `- ${point}`, indent: { left: 300 } }));
                });
                children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            }

            // Decisions
            if (data.decisions && data.decisions.length > 0) {
                children.push(new Paragraph({ text: 'DÉCISIONS PRISES', heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }));
                data.decisions.forEach((decision, i) => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${i + 1}. ${decision.decision || decision.title}`, bold: true })
                            ],
                            indent: { left: 300 }
                        }),
                        new Paragraph({ text: decision.description || decision.rationale || '', indent: { left: 600 } })
                    );
                });
                children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            }

            // Tasks
            if (tasks && tasks.length > 0) {
                children.push(new Paragraph({ text: 'ACTIONS À SUIVRE', heading: HeadingLevel.HEADING_1, spacing: { before: 200 } }));
                tasks.forEach((task, i) => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${i + 1}. ${task.task_description}`, bold: true })
                            ],
                            indent: { left: 300 }
                        }),
                        new Paragraph({
                            text: `Assigné à: ${task.assigned_to} | Deadline: ${task.deadline} | Priorité: ${task.priority}`,
                            indent: { left: 600 }
                        })
                    );
                    if (task.context) {
                        children.push(new Paragraph({ text: `Contexte: ${task.context}`, indent: { left: 600 } }));
                    }
                });
            }

            // Footer
            children.push(
                new Paragraph({
                    text: 'Généré par Lucide Meeting Assistant',
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 },
                    italics: true
                })
            );

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            await fs.promises.writeFile(filePath, buffer);

            console.log(`[ExportService] ✅ Word exported to: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('[ExportService] Error exporting to Word:', error);
            throw error;
        }
    }

    /**
     * Export to Excel (XLSX) format
     * @param {Object} meetingNotes - Meeting notes object
     * @param {Array<Object>} tasks - Array of tasks
     * @param {string} customPath - Optional custom export path
     * @returns {Promise<string>} Path to exported file
     */
    async exportToExcel(meetingNotes, tasks, customPath = null) {
        console.log('[ExportService] Exporting to Excel...');

        // P3-5: Validate data before export
        this._validateExportData(meetingNotes, 'Excel');

        // P1-3: Safely load optional dependency
        let ExcelJS;
        try {
            ExcelJS = require('exceljs');
        } catch (requireError) {
            console.error('[ExportService] P1-3: exceljs library not installed');
            throw new Error('L\'export Excel n\'est pas disponible. La bibliothèque "exceljs" n\'est pas installée. Utilisez plutôt l\'export Markdown ou HTML.');
        }

        try {
            const data = this._parseNoteData(meetingNotes);

            const fileName = this._generateFileName(meetingNotes, 'xlsx');
            const filePath = customPath || path.join(this.defaultExportPath, fileName);

            const workbook = new ExcelJS.Workbook();

            // Summary Sheet
            const summarySheet = workbook.addWorksheet('Résumé');

            summarySheet.columns = [
                { header: 'Champ', key: 'field', width: 30 },
                { header: 'Valeur', key: 'value', width: 70 }
            ];

            // Add summary data
            summarySheet.addRow({ field: 'Date', value: new Date(meetingNotes.created_at * 1000).toLocaleString('fr-FR') });
            if (data.meetingMetadata?.duration) {
                summarySheet.addRow({ field: 'Durée', value: data.meetingMetadata.duration });
            }
            summarySheet.addRow({ field: '', value: '' });
            summarySheet.addRow({ field: 'Résumé exécutif', value: data.executiveSummary || '' });

            // Style header row
            summarySheet.getRow(1).font = { bold: true, size: 12 };
            summarySheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

            // Tasks Sheet
            if (tasks && tasks.length > 0) {
                const tasksSheet = workbook.addWorksheet('Actions');

                tasksSheet.columns = [
                    { header: '#', key: 'index', width: 5 },
                    { header: 'Tâche', key: 'task', width: 50 },
                    { header: 'Assigné à', key: 'assigned', width: 20 },
                    { header: 'Deadline', key: 'deadline', width: 15 },
                    { header: 'Priorité', key: 'priority', width: 12 },
                    { header: 'Statut', key: 'status', width: 12 },
                    { header: 'Contexte', key: 'context', width: 40 }
                ];

                tasks.forEach((task, i) => {
                    tasksSheet.addRow({
                        index: i + 1,
                        task: task.task_description,
                        assigned: task.assigned_to,
                        deadline: task.deadline,
                        priority: task.priority,
                        status: task.status || 'pending',
                        context: task.context || ''
                    });
                });

                // Style header
                tasksSheet.getRow(1).font = { bold: true, size: 12 };
                tasksSheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF70AD47' }
                };
                tasksSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

                // Add filters
                tasksSheet.autoFilter = 'A1:G1';
            }

            // Key Points Sheet
            if (data.keyPoints && data.keyPoints.length > 0) {
                const pointsSheet = workbook.addWorksheet('Points clés');

                pointsSheet.columns = [
                    { header: '#', key: 'index', width: 5 },
                    { header: 'Point', key: 'point', width: 80 }
                ];

                data.keyPoints.forEach((point, i) => {
                    pointsSheet.addRow({ index: i + 1, point });
                });

                pointsSheet.getRow(1).font = { bold: true, size: 12 };
                pointsSheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC000' }
                };
                pointsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            }

            // Decisions Sheet
            if (data.decisions && data.decisions.length > 0) {
                const decisionsSheet = workbook.addWorksheet('Décisions');

                decisionsSheet.columns = [
                    { header: '#', key: 'index', width: 5 },
                    { header: 'Décision', key: 'decision', width: 40 },
                    { header: 'Rationale', key: 'rationale', width: 60 }
                ];

                data.decisions.forEach((decision, i) => {
                    decisionsSheet.addRow({
                        index: i + 1,
                        decision: decision.decision || decision.title || '',
                        rationale: decision.description || decision.rationale || ''
                    });
                });

                decisionsSheet.getRow(1).font = { bold: true, size: 12 };
                decisionsSheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5B9BD5' }
                };
                decisionsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            }

            await workbook.xlsx.writeFile(filePath);

            console.log(`[ExportService] ✅ Excel exported to: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('[ExportService] Error exporting to Excel:', error);
            throw error;
        }
    }

    /**
     * Get default export path
     */
    getDefaultExportPath() {
        return this.defaultExportPath;
    }

    /**
     * Set custom export path
     */
    setDefaultExportPath(newPath) {
        this.defaultExportPath = newPath;
        this._ensureExportDirectoryExists();
    }
}

// Singleton instance
const exportService = new ExportService();
module.exports = exportService;
