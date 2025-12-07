/**
 * Phase 4: Document Management Service
 *
 * Manages document upload, extraction, storage, and CRUD operations.
 * Supports: TXT, MD, PDF, DOCX files.
 */

const fs = require('fs').promises;
const path = require('path');
const { loaders } = require('../utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
const { DocumentValidator, QueryValidator } = require('../utils/validators');
const { DOCUMENTS } = require('../config/constants');

// Load document extraction dependencies via loaders for graceful fallback
const pdfParseModule = loaders.loadPdfParse();
const mammothModule = loaders.loadMammoth();
const tesseractModule = loaders.loadTesseract();

/**
 * @class DocumentService
 * @description Service for managing knowledge base documents
 */
class DocumentService {
    /**
     * Supported file types for document upload
     * @static
     */
    static SUPPORTED_FILE_TYPES = ['txt', 'md', 'pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif'];

    constructor() {
        this.documentsRepository = null;
        this.chunksRepository = null;
        console.log('[DocumentService] Service initialized');
    }

    /**
     * Check if a file type is supported
     * @param {string} fileType - File extension
     * @returns {boolean}
     */
    static isSupportedFileType(fileType) {
        return DocumentService.SUPPORTED_FILE_TYPES.includes(fileType.toLowerCase());
    }

    /**
     * Initialize service with repositories
     * @param {Object} documentsRepo - Documents repository
     * @param {Object} chunksRepo - Document chunks repository
     */
    initialize(documentsRepo, chunksRepo) {
        this.documentsRepository = documentsRepo;
        this.chunksRepository = chunksRepo;
        console.log('[DocumentService] Repositories connected');
    }

    /**
     * Get all documents for a user
     * @param {string} uid - User ID
     * @param {Object} options - Query options (limit, offset, sortBy, order)
     * @returns {Promise<Array>} Array of documents
     */
    async getAllDocuments(uid, options = {}) {
        const {
            limit = 50,
            offset = 0,
            sortBy = 'created_at',
            order = 'DESC'
        } = options;

        console.log(`[DocumentService] Getting documents for user: ${uid}`);

        try {
            // Validate sortBy to prevent SQL injection
            const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'title', 'filename', 'file_size', 'file_type'];
            const validSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'created_at';

            // Validate order to prevent SQL injection
            const ALLOWED_ORDERS = ['ASC', 'DESC'];
            const validOrder = ALLOWED_ORDERS.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

            // Query documents from database
            const query = `
                SELECT
                    id, uid, title, filename, file_type, file_size,
                    tags, description, chunk_count, indexed,
                    created_at, updated_at
                FROM documents
                WHERE uid = ?
                ORDER BY ${validSortBy} ${validOrder}
                LIMIT ? OFFSET ?
            `;

            const documents = await this.documentsRepository.query(query, [uid, limit, offset]);

            // Parse JSON tags
            return documents.map(doc => ({
                ...doc,
                tags: doc.tags ? JSON.parse(doc.tags) : []
            }));
        } catch (error) {
            console.error('[DocumentService] Error getting documents:', error);
            throw error;
        }
    }

    /**
     * Get a single document by ID
     * @param {string} documentId - Document ID
     * @param {boolean} includeContent - Include full text content
     * @returns {Promise<Object|null>} Document object or null
     */
    async getDocument(documentId, includeContent = false) {
        console.log(`[DocumentService] Getting document: ${documentId}`);

        try {
            const columns = includeContent
                ? '*'
                : 'id, uid, title, filename, file_type, file_size, tags, description, chunk_count, indexed, created_at, updated_at';

            const query = `SELECT ${columns} FROM documents WHERE id = ?`;
            const result = await this.documentsRepository.queryOne(query, [documentId]);

            if (!result) return null;

            return {
                ...result,
                tags: result.tags ? JSON.parse(result.tags) : []
            };
        } catch (error) {
            console.error('[DocumentService] Error getting document:', error);
            throw error;
        }
    }

    /**
     * Search documents by title, filename, or content
     * @param {string} uid - User ID
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters (file_type, tags)
     * @returns {Promise<Array>} Matching documents
     */
    async searchDocuments(uid, query, filters = {}) {
        console.log(`[DocumentService] Searching documents for "${query}"`);

        try {
            let sql = `
                SELECT
                    id, uid, title, filename, file_type, file_size,
                    tags, description, chunk_count, indexed,
                    created_at, updated_at
                FROM documents
                WHERE uid = ?
                AND (
                    title LIKE ? OR
                    filename LIKE ? OR
                    description LIKE ? OR
                    content LIKE ?
                )
            `;

            const params = [uid, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

            // Add file type filter
            if (filters.file_type) {
                sql += ' AND file_type = ?';
                params.push(filters.file_type);
            }

            // Add tags filter
            if (filters.tags && filters.tags.length > 0) {
                const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
                sql += ` AND (${tagConditions})`;
                filters.tags.forEach(tag => params.push(`%"${tag}"%`));
            }

            sql += ' ORDER BY created_at DESC';

            const documents = await this.documentsRepository.query(sql, params);

            return documents.map(doc => ({
                ...doc,
                tags: doc.tags ? JSON.parse(doc.tags) : []
            }));
        } catch (error) {
            console.error('[DocumentService] Error searching documents:', error);
            throw error;
        }
    }

    /**
     * Upload and process a new document
     * @param {string} uid - User ID
     * @param {Object} fileData - File data { filename, filepath, buffer, content? }
     * @param {string} fileData.filename - Original filename
     * @param {string} [fileData.filepath] - Path to file on disk
     * @param {Buffer} [fileData.buffer] - File buffer
     * @param {string} [fileData.content] - Pre-extracted text content (skips re-extraction if provided)
     * @param {Object} metadata - Optional metadata { title, tags, description }
     * @returns {Promise<Object>} Created document
     */
    async uploadDocument(uid, fileData, metadata = {}) {
        const { filename, filepath, buffer, content: preExtractedContent } = fileData;
        const fileType = this._getFileType(filename);

        console.log(`[DocumentService] Uploading document: ${filename} (${fileType})`);

        try {
            // Validate file type is supported
            if (!DocumentService.isSupportedFileType(fileType)) {
                throw new Error(
                    `Unsupported file type: ${fileType}. ` +
                    `Supported types: ${DocumentService.SUPPORTED_FILE_TYPES.join(', ')}`
                );
            }

            // Validate file data
            const fileValidation = DocumentValidator.validateFile(fileData);
            if (!fileValidation.valid) {
                throw new Error(`Invalid file data: ${fileValidation.errors.join(', ')}`);
            }

            // Validate metadata
            const metadataValidation = DocumentValidator.validateMetadata(metadata);
            if (!metadataValidation.valid) {
                console.warn('[DocumentService] Invalid metadata:', metadataValidation.errors);
                // Continue with sanitized metadata (non-blocking)
            }

            // Validate file size before processing
            const fileSize = buffer ? buffer.length : (await fs.stat(filepath)).size;

            if (fileSize > DOCUMENTS.MAX_FILE_SIZE_BYTES) {
                throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${DOCUMENTS.MAX_FILE_SIZE_MB}MB`);
            }

            // Fix DOC-M1 & DOC-M2: Validate file content and structure
            // Get buffer for validation (read from filepath if not provided)
            let fileBuffer = buffer;
            if (!fileBuffer && filepath) {
                fileBuffer = await fs.readFile(filepath);
            }

            if (fileBuffer) {
                const contentValidation = await this._validateFile(fileBuffer, fileType, filename);
                if (!contentValidation.valid) {
                    throw new Error(`Invalid file: ${contentValidation.errors.join('; ')}`);
                }
                console.log(`[DocumentService] File validation passed for ${filename}`);
            }

            // Extract text content (use pre-extracted if provided to avoid double extraction)
            // For PDFs, extract with page info for proper citation support
            let content;
            let pageCount = 0;
            let pageBreaks = null;

            if (preExtractedContent) {
                content = preExtractedContent;
            } else if (fileType === 'pdf') {
                const extractResult = await this._extractText(filepath || buffer, fileType, { withPageInfo: true });
                if (typeof extractResult === 'object') {
                    content = extractResult.text;
                    pageCount = extractResult.pageCount || 0;
                    pageBreaks = extractResult.pageBreaks || null;
                    console.log(`[DocumentService] PDF extracted with ${pageCount} pages`);
                } else {
                    content = extractResult;
                }
            } else {
                content = await this._extractText(filepath || buffer, fileType);
            }

            // Generate document ID
            const documentId = uuidv4();
            const now = Date.now();

            // Prepare document data
            const document = {
                id: documentId,
                uid,
                title: metadata.title || this._generateTitle(filename),
                filename,
                file_type: fileType,
                file_size: fileSize,
                file_path: filepath || null,
                content,
                tags: JSON.stringify(metadata.tags || []),
                description: metadata.description || null,
                chunk_count: 0,
                page_count: pageCount,
                indexed: 0,
                created_at: now,
                updated_at: now,
                sync_state: 'clean'
            };

            // Store page breaks for indexing (temporary, not in DB)
            document._pageBreaks = pageBreaks;

            // Insert into database
            await this.documentsRepository.create(document);

            console.log(`[DocumentService] Document uploaded: ${documentId}`);

            // Return document with parsed tags and page breaks for indexing
            const result = {
                ...document,
                tags: metadata.tags || [],
                pageBreaks // Include for indexing step
            };
            delete result._pageBreaks; // Clean up internal property

            return result;
        } catch (error) {
            console.error('[DocumentService] Error uploading document:', error);
            throw error;
        }
    }

    /**
     * Update document metadata
     * @param {string} documentId - Document ID
     * @param {Object} metadata - Updated metadata { title, tags, description }
     * @returns {Promise<boolean>} Success status
     */
    async updateDocument(documentId, metadata) {
        console.log(`[DocumentService] Updating document: ${documentId}`);

        try {
            const updates = {};

            if (metadata.title) updates.title = metadata.title;
            if (metadata.tags) updates.tags = JSON.stringify(metadata.tags);
            if (metadata.description !== undefined) updates.description = metadata.description;

            updates.updated_at = Date.now();

            const query = `
                UPDATE documents
                SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')}
                WHERE id = ?
            `;

            await this.documentsRepository.execute(query, [...Object.values(updates), documentId]);

            console.log(`[DocumentService] Document updated: ${documentId}`);
            return true;
        } catch (error) {
            console.error('[DocumentService] Error updating document:', error);
            throw error;
        }
    }

    /**
     * Delete a document and all its chunks
     * @param {string} documentId - Document ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteDocument(documentId) {
        console.log(`[DocumentService] Deleting document: ${documentId}`);

        try {
            // Delete chunks first
            await this.chunksRepository.execute(
                'DELETE FROM document_chunks WHERE document_id = ?',
                [documentId]
            );

            // Delete document
            await this.documentsRepository.execute(
                'DELETE FROM documents WHERE id = ?',
                [documentId]
            );

            console.log(`[DocumentService] Document deleted: ${documentId}`);
            return true;
        } catch (error) {
            console.error('[DocumentService] Error deleting document:', error);
            throw error;
        }
    }

    /**
     * Get document statistics for a user
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Statistics
     */
    async getDocumentStats(uid) {
        console.log(`[DocumentService] Getting document stats for user: ${uid}`);

        try {
            const query = `
                SELECT
                    COUNT(*) as total_documents,
                    SUM(file_size) as total_size,
                    SUM(chunk_count) as total_chunks,
                    SUM(CASE WHEN indexed = 1 THEN 1 ELSE 0 END) as indexed_documents,
                    COUNT(DISTINCT file_type) as file_types
                FROM documents
                WHERE uid = ?
            `;

            const stats = await this.documentsRepository.queryOne(query, [uid]);

            return {
                total_documents: stats.total_documents || 0,
                total_size: stats.total_size || 0,
                total_chunks: stats.total_chunks || 0,
                indexed_documents: stats.indexed_documents || 0,
                file_types: stats.file_types || 0
            };
        } catch (error) {
            console.error('[DocumentService] Error getting stats:', error);
            throw error;
        }
    }

    /**
     * Extract text from file based on type
     * @private
     * @param {string|Buffer} source - File path or buffer
     * @param {string} fileType - File type
     * @param {Object} options - Extraction options
     * @param {boolean} options.withPageInfo - Include page info for PDFs
     * @returns {Promise<string|Object>} Extracted text or object with text and page info
     */
    async _extractText(source, fileType, options = {}) {
        try {
            switch (fileType) {
                case 'txt':
                case 'md':
                    return await this._extractTextFile(source);

                case 'pdf':
                    return await this._extractPDF(source, { withPageInfo: options.withPageInfo });

                case 'docx':
                    return await this._extractDOCX(source);

                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                    return await this._extractImage(source);

                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
        } catch (error) {
            console.error('[DocumentService] Error extracting text:', error);
            throw error;
        }
    }

    /**
     * Extract text from TXT/MD file
     * @private
     */
    async _extractTextFile(source) {
        if (Buffer.isBuffer(source)) {
            return source.toString('utf-8');
        }
        return await fs.readFile(source, 'utf-8');
    }

    /**
     * Extract text from PDF
     * @private
     * Uses pdf-parse library to extract text content from PDF files
     * @param {Buffer|string} source - File buffer or path
     * @param {Object} options - Extraction options
     * @param {boolean} options.withPageInfo - Include page boundaries info
     * @returns {Promise<string|Object>} Text or object with text and page info
     */
    async _extractPDF(source, options = {}) {
        if (!pdfParseModule) {
            throw new Error(
                'PDF extraction library not available. ' +
                'Please install pdf-parse: npm install pdf-parse'
            );
        }
        const pdfParse = pdfParseModule;

        try {
            let dataBuffer;
            if (Buffer.isBuffer(source)) {
                dataBuffer = source;
            } else {
                dataBuffer = await fs.readFile(source);
            }

            // Track page boundaries if requested
            const pageTexts = [];
            let currentPage = 0;

            // Custom page render function to track page boundaries
            const parseOptions = options.withPageInfo ? {
                pagerender: function(pageData) {
                    return pageData.getTextContent().then(function(textContent) {
                        let pageText = '';
                        let lastY = null;

                        for (const item of textContent.items) {
                            // Add newline when Y position changes significantly
                            if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                                pageText += '\n';
                            }
                            pageText += item.str;
                            lastY = item.transform[5];
                        }

                        currentPage++;
                        pageTexts.push({
                            pageNumber: currentPage,
                            text: pageText,
                            charStart: 0, // Will be calculated after
                            charEnd: 0
                        });

                        return pageText;
                    });
                }
            } : {};

            const data = await pdfParse(dataBuffer, parseOptions);

            // Fix MEDIUM BUG-M29: Don't log document structure details that could be sensitive
            // Only log in debug/development mode, not production
            if (process.env.NODE_ENV === 'development') {
                console.log(`[DocumentService] PDF extracted: ${data.numpages} pages, ${data.text.length} characters`);
            } else {
                console.log(`[DocumentService] PDF extracted successfully`);
            }

            // Check if extraction produced meaningful content
            if (!data.text || data.text.trim().length === 0) {
                console.warn('[DocumentService] PDF extraction produced no text - file may be image-only or protected');
                const emptyText = '[Document contains no extractable text - may be image-based or protected]';
                if (options.withPageInfo) {
                    return {
                        text: emptyText,
                        pageCount: data.numpages || 0,
                        pageBreaks: []
                    };
                }
                return emptyText;
            }

            // Return with page info if requested
            if (options.withPageInfo) {
                // Calculate character positions for each page
                const pageBreaks = [];
                let charPosition = 0;

                // If we have page texts from custom render, use them
                if (pageTexts.length > 0) {
                    for (let i = 0; i < pageTexts.length; i++) {
                        const pageLen = pageTexts[i].text.length;
                        pageBreaks.push({
                            pageNumber: i + 1,
                            charStart: charPosition,
                            charEnd: charPosition + pageLen
                        });
                        charPosition += pageLen + 1; // +1 for separator
                    }
                } else {
                    // Fallback: Try to detect page breaks using form feed characters
                    // or split evenly if no markers found
                    const ffPositions = [];
                    let idx = data.text.indexOf('\f');
                    while (idx !== -1) {
                        ffPositions.push(idx);
                        idx = data.text.indexOf('\f', idx + 1);
                    }

                    if (ffPositions.length > 0 && ffPositions.length >= data.numpages - 1) {
                        // Use form feed positions as page boundaries
                        let start = 0;
                        for (let i = 0; i < ffPositions.length; i++) {
                            pageBreaks.push({
                                pageNumber: i + 1,
                                charStart: start,
                                charEnd: ffPositions[i]
                            });
                            start = ffPositions[i] + 1;
                        }
                        // Last page
                        pageBreaks.push({
                            pageNumber: ffPositions.length + 1,
                            charStart: start,
                            charEnd: data.text.length
                        });
                    } else {
                        // Estimate page boundaries by dividing evenly
                        const avgCharsPerPage = Math.ceil(data.text.length / data.numpages);
                        for (let i = 0; i < data.numpages; i++) {
                            pageBreaks.push({
                                pageNumber: i + 1,
                                charStart: i * avgCharsPerPage,
                                charEnd: Math.min((i + 1) * avgCharsPerPage, data.text.length)
                            });
                        }
                    }
                }

                return {
                    text: data.text,
                    pageCount: data.numpages || pageBreaks.length,
                    pageBreaks
                };
            }

            return data.text;
        } catch (error) {
            console.error('[DocumentService] Error extracting PDF:', error);

            // Provide more specific error messages
            if (error.message.includes('password')) {
                throw new Error('PDF is password protected. Please provide an unprotected file.');
            }
            if (error.message.includes('encrypted')) {
                throw new Error('PDF is encrypted. Please provide an unencrypted file.');
            }

            throw new Error(`Failed to extract PDF content: ${error.message}`);
        }
    }

    /**
     * Extract text from DOCX
     * @private
     * Uses mammoth library to extract text content from DOCX files
     */
    async _extractDOCX(source) {
        if (!mammothModule) {
            throw new Error(
                'DOCX extraction library not available. ' +
                'Please install mammoth: npm install mammoth'
            );
        }
        const mammoth = mammothModule;

        try {
            let result;
            if (Buffer.isBuffer(source)) {
                result = await mammoth.extractRawText({ buffer: source });
            } else {
                result = await mammoth.extractRawText({ path: source });
            }

            console.log(`[DocumentService] DOCX extracted: ${result.value.length} characters`);

            // Log warnings but don't fail
            if (result.messages && result.messages.length > 0) {
                const warnings = result.messages.filter(m => m.type === 'warning');
                const errors = result.messages.filter(m => m.type === 'error');

                if (warnings.length > 0) {
                    console.warn(`[DocumentService] DOCX extraction warnings (${warnings.length}):`,
                        warnings.slice(0, 3).map(m => m.message).join('; '));
                }
                if (errors.length > 0) {
                    console.error(`[DocumentService] DOCX extraction errors (${errors.length}):`,
                        errors.slice(0, 3).map(m => m.message).join('; '));
                }
            }

            // Check if extraction produced meaningful content
            if (!result.value || result.value.trim().length === 0) {
                console.warn('[DocumentService] DOCX extraction produced no text - file may be empty or protected');
                return '[Document contains no extractable text]';
            }

            return result.value;
        } catch (error) {
            console.error('[DocumentService] Error extracting DOCX:', error);

            // Provide more specific error messages
            if (error.message.includes('Could not find file')) {
                throw new Error('DOCX file not found or inaccessible.');
            }
            if (error.message.includes('End of data')) {
                throw new Error('DOCX file appears to be corrupted or truncated.');
            }
            if (error.message.includes('Zip')) {
                throw new Error('DOCX file has invalid ZIP structure - file may be corrupted.');
            }

            throw new Error(`Failed to extract DOCX content: ${error.message}`);
        }
    }

    /**
     * Extract text from image using OCR (tesseract.js)
     * @private
     * @param {Buffer|string} source - Image buffer or file path
     * @returns {Promise<string>} Extracted text
     */
    async _extractImage(source) {
        if (!tesseractModule) {
            throw new Error(
                'OCR library not available. ' +
                'Please install tesseract.js: npm install tesseract.js'
            );
        }
        const createWorker = tesseractModule.createWorker;

        try {
            let imageBuffer;
            if (Buffer.isBuffer(source)) {
                imageBuffer = source;
            } else {
                imageBuffer = await fs.readFile(source);
            }

            console.log('[DocumentService] Starting OCR extraction...');

            const worker = await createWorker('fra+eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`[DocumentService] OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            const { data: { text } } = await worker.recognize(imageBuffer);
            await worker.terminate();

            console.log(`[DocumentService] OCR extracted: ${text.length} characters`);

            if (!text || text.trim().length === 0) {
                console.warn('[DocumentService] OCR produced no text - image may be blank or unreadable');
                return '[Image contains no extractable text]';
            }

            return text;
        } catch (error) {
            console.error('[DocumentService] Error extracting image text:', error);
            throw new Error(`Failed to extract text from image: ${error.message}`);
        }
    }

    /**
     * Get file type from filename
     * @private
     */
    _getFileType(filename) {
        const ext = path.extname(filename).toLowerCase().slice(1);
        return ext;
    }

    /**
     * Generate title from filename
     * @private
     */
    _generateTitle(filename) {
        return path.basename(filename, path.extname(filename))
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    // ============================================================
    // FILE VALIDATION METHODS (DOC-M1, DOC-M2)
    // ============================================================

    /**
     * Magic bytes signatures for supported file types
     * @private
     */
    static FILE_SIGNATURES = {
        pdf: {
            magic: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
            offset: 0,
            description: 'PDF document'
        },
        docx: {
            magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // PK.. (ZIP archive)
            offset: 0,
            description: 'DOCX document (ZIP archive)'
        },
        jpg: {
            magic: Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG/JPG
            offset: 0,
            description: 'JPEG image'
        },
        jpeg: {
            magic: Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG/JPG
            offset: 0,
            description: 'JPEG image'
        },
        png: {
            magic: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG
            offset: 0,
            description: 'PNG image'
        },
        gif: {
            magic: Buffer.from([0x47, 0x49, 0x46, 0x38]), // GIF87a or GIF89a
            offset: 0,
            description: 'GIF image'
        },
        // TXT and MD don't have magic bytes - they're plain text
    };

    /**
     * Validate file content matches declared type using magic bytes
     * Fix DOC-M1: Validates actual file content, not just extension
     * @private
     * @param {Buffer} buffer - File buffer
     * @param {string} declaredType - Declared file type from extension
     * @returns {Object} - { valid: boolean, error: string|null, detectedType: string|null }
     */
    _validateFileContent(buffer, declaredType) {
        // Text files (txt, md) don't have specific magic bytes
        if (declaredType === 'txt' || declaredType === 'md') {
            // Check if content is valid UTF-8 text
            const isValidText = this._isValidTextContent(buffer);
            if (!isValidText) {
                return {
                    valid: false,
                    error: `File appears to be binary, not a valid ${declaredType.toUpperCase()} text file`,
                    detectedType: 'binary'
                };
            }
            return { valid: true, error: null, detectedType: declaredType };
        }

        // Check magic bytes for PDF and DOCX
        const signature = DocumentService.FILE_SIGNATURES[declaredType];
        if (!signature) {
            return {
                valid: false,
                error: `Unsupported file type: ${declaredType}`,
                detectedType: null
            };
        }

        // Verify buffer has enough bytes
        if (buffer.length < signature.offset + signature.magic.length) {
            return {
                valid: false,
                error: `File too small to be a valid ${signature.description}`,
                detectedType: null
            };
        }

        // Compare magic bytes
        const fileHeader = buffer.slice(signature.offset, signature.offset + signature.magic.length);
        const matches = fileHeader.equals(signature.magic);

        if (!matches) {
            // Try to detect what the file actually is
            const detected = this._detectFileType(buffer);
            return {
                valid: false,
                error: `File content does not match ${declaredType.toUpperCase()} format. ` +
                       `Expected ${signature.description}, but file appears to be ${detected || 'unknown format'}`,
                detectedType: detected
            };
        }

        return { valid: true, error: null, detectedType: declaredType };
    }

    /**
     * Detect file type from magic bytes
     * @private
     * @param {Buffer} buffer - File buffer
     * @returns {string|null} - Detected type or null
     */
    _detectFileType(buffer) {
        for (const [type, sig] of Object.entries(DocumentService.FILE_SIGNATURES)) {
            if (buffer.length >= sig.offset + sig.magic.length) {
                const header = buffer.slice(sig.offset, sig.offset + sig.magic.length);
                if (header.equals(sig.magic)) {
                    return type;
                }
            }
        }

        // Check if it's plain text
        if (this._isValidTextContent(buffer.slice(0, Math.min(1000, buffer.length)))) {
            return 'text';
        }

        return null;
    }

    /**
     * Check if buffer contains valid UTF-8 text content
     * @private
     * @param {Buffer} buffer - Buffer to check
     * @returns {boolean} - True if valid text
     */
    _isValidTextContent(buffer) {
        try {
            const text = buffer.toString('utf-8');
            // Check for null bytes (common in binary files)
            if (text.includes('\0')) {
                return false;
            }
            // Check for high ratio of control characters (except newlines, tabs)
            const controlChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
            const ratio = controlChars ? controlChars.length / text.length : 0;
            return ratio < 0.1; // Less than 10% control characters
        } catch {
            return false;
        }
    }

    /**
     * Validate PDF structure integrity
     * Fix DOC-M2: Detects corrupted PDF files
     * @private
     * @param {Buffer} buffer - PDF buffer
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    _validatePDFStructure(buffer) {
        try {
            const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));

            // Check PDF header
            if (!content.startsWith('%PDF-')) {
                return {
                    valid: false,
                    error: 'Invalid PDF: Missing PDF header signature'
                };
            }

            // Extract PDF version
            const versionMatch = content.match(/%PDF-(\d+\.\d+)/);
            if (!versionMatch) {
                return {
                    valid: false,
                    error: 'Invalid PDF: Cannot determine PDF version'
                };
            }

            const version = parseFloat(versionMatch[1]);
            if (version < 1.0 || version > 2.0) {
                console.warn(`[DocumentService] Unusual PDF version: ${version}`);
            }

            // Check for EOF marker (should be near the end)
            const tailContent = buffer.toString('utf-8', Math.max(0, buffer.length - 1024));
            if (!tailContent.includes('%%EOF')) {
                return {
                    valid: false,
                    error: 'Invalid PDF: Missing EOF marker - file may be truncated or corrupted'
                };
            }

            // Check for basic PDF structure elements
            const fullContent = buffer.toString('utf-8');
            const hasObjects = /\d+\s+\d+\s+obj/.test(fullContent);
            if (!hasObjects) {
                return {
                    valid: false,
                    error: 'Invalid PDF: No PDF objects found - file may be corrupted'
                };
            }

            return { valid: true, error: null };
        } catch (error) {
            return {
                valid: false,
                error: `PDF validation error: ${error.message}`
            };
        }
    }

    /**
     * Validate DOCX structure integrity
     * Fix DOC-M2: Detects corrupted DOCX files
     * @private
     * @param {Buffer} buffer - DOCX buffer
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    _validateDOCXStructure(buffer) {
        try {
            // DOCX is a ZIP archive - check ZIP signature
            const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // PK..
            const header = buffer.slice(0, 4);

            if (!header.equals(zipSignature)) {
                return {
                    valid: false,
                    error: 'Invalid DOCX: Not a valid ZIP archive'
                };
            }

            // Check minimum size (a valid DOCX is at least a few KB)
            if (buffer.length < 1000) {
                return {
                    valid: false,
                    error: 'Invalid DOCX: File too small to be a valid document'
                };
            }

            // Check for central directory end signature (should be near the end)
            // ZIP End of Central Directory signature: 0x50 0x4B 0x05 0x06
            const eocdSignature = Buffer.from([0x50, 0x4B, 0x05, 0x06]);
            const tailSearch = buffer.slice(Math.max(0, buffer.length - 1024));

            let foundEOCD = false;
            for (let i = 0; i <= tailSearch.length - 4; i++) {
                if (tailSearch.slice(i, i + 4).equals(eocdSignature)) {
                    foundEOCD = true;
                    break;
                }
            }

            if (!foundEOCD) {
                return {
                    valid: false,
                    error: 'Invalid DOCX: ZIP archive appears corrupted - missing end of central directory'
                };
            }

            // Check for [Content_Types].xml reference (DOCX-specific)
            const contentString = buffer.toString('utf-8');
            if (!contentString.includes('[Content_Types].xml') && !contentString.includes('word/document.xml')) {
                return {
                    valid: false,
                    error: 'Invalid DOCX: Missing required DOCX structure files'
                };
            }

            return { valid: true, error: null };
        } catch (error) {
            return {
                valid: false,
                error: `DOCX validation error: ${error.message}`
            };
        }
    }

    /**
     * Comprehensive file validation
     * @private
     * @param {Buffer} buffer - File buffer
     * @param {string} fileType - Declared file type
     * @param {string} filename - Original filename
     * @returns {Object} - { valid: boolean, errors: string[] }
     */
    async _validateFile(buffer, fileType, filename) {
        const errors = [];

        // Step 1: Validate magic bytes match declared type
        const contentValidation = this._validateFileContent(buffer, fileType);
        if (!contentValidation.valid) {
            errors.push(contentValidation.error);
            return { valid: false, errors };
        }

        // Step 2: Validate file structure for specific types
        if (fileType === 'pdf') {
            const pdfValidation = this._validatePDFStructure(buffer);
            if (!pdfValidation.valid) {
                errors.push(pdfValidation.error);
            }
        } else if (fileType === 'docx') {
            const docxValidation = this._validateDOCXStructure(buffer);
            if (!docxValidation.valid) {
                errors.push(docxValidation.error);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Singleton instance
const documentService = new DocumentService();

module.exports = documentService;
