/**
 * Phase 4: Document Management Service
 *
 * Manages document upload, extraction, storage, and CRUD operations.
 * Supports: TXT, MD, PDF, DOCX files.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
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
            const content = preExtractedContent || await this._extractText(filepath || buffer, fileType);

            // KB-P2-5: Generate content hash and check for duplicates
            const contentHash = this.generateContentHash(content);
            const duplicateCheck = await this.checkForDuplicate(uid, content);

            if (duplicateCheck.isDuplicate && !metadata.allowDuplicate) {
                const existing = duplicateCheck.existingDocument;
                console.warn(`[DocumentService] Duplicate detected: "${filename}" matches "${existing.title}"`);
                return {
                    success: false,
                    isDuplicate: true,
                    existingDocument: existing,
                    message: `Ce document existe déjà dans votre base sous le nom "${existing.title}"`,
                    contentHash
                };
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
                content_hash: contentHash, // KB-P2-5: Store hash for duplicate detection
                tags: JSON.stringify(metadata.tags || []),
                description: metadata.description || null,
                chunk_count: 0,
                indexed: 0,
                created_at: now,
                updated_at: now,
                sync_state: 'clean'
            };

            // Insert into database
            await this.documentsRepository.create(document);

            console.log(`[DocumentService] Document uploaded: ${documentId}`);

            return {
                ...document,
                tags: metadata.tags || []
            };
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

    // ============================================================
    // KB-P2-5: CONTENT HASH VERIFICATION FOR DUPLICATE DETECTION
    // ============================================================

    /**
     * KB-P2-5: Generate SHA-256 hash from content
     * @param {string} content - Document text content
     * @returns {string} SHA-256 hash in hex format
     */
    generateContentHash(content) {
        if (!content || content.length === 0) {
            return null;
        }
        // Normalize whitespace to ensure consistent hashing
        const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
        return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
    }

    /**
     * KB-P2-5: Check if a document with the same content hash exists
     * @param {string} uid - User ID
     * @param {string} contentHash - Content hash to check
     * @returns {Promise<Object|null>} Existing document or null
     */
    async findDuplicateByHash(uid, contentHash) {
        if (!contentHash) return null;

        try {
            const query = `
                SELECT id, title, filename, created_at
                FROM documents
                WHERE uid = ? AND content_hash = ?
                LIMIT 1
            `;
            const existing = await this.documentsRepository.queryOne(query, [uid, contentHash]);
            return existing || null;
        } catch (error) {
            // Column might not exist yet - silently fail
            console.warn('[DocumentService] Hash column may not exist:', error.message);
            return null;
        }
    }

    /**
     * KB-P2-5: Check for potential duplicate before upload
     * Returns info about existing document if duplicate found
     * @param {string} uid - User ID
     * @param {string} content - Document content to check
     * @returns {Promise<Object>} { isDuplicate: boolean, existingDocument: Object|null }
     */
    async checkForDuplicate(uid, content) {
        const contentHash = this.generateContentHash(content);
        if (!contentHash) {
            return { isDuplicate: false, existingDocument: null, contentHash: null };
        }

        const existing = await this.findDuplicateByHash(uid, contentHash);

        if (existing) {
            console.log(`[DocumentService] ⚠️ Duplicate content detected: matches "${existing.title}"`);
            return {
                isDuplicate: true,
                existingDocument: existing,
                contentHash
            };
        }

        return { isDuplicate: false, existingDocument: null, contentHash };
    }

    /**
     * Extract text from file based on type
     * @private
     * @param {string|Buffer} source - File path or buffer
     * @param {string} fileType - File type
     * @returns {Promise<string>} Extracted text
     */
    async _extractText(source, fileType) {
        try {
            switch (fileType) {
                case 'txt':
                case 'md':
                    return await this._extractTextFile(source);

                case 'pdf':
                    return await this._extractPDF(source);

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
     */
    async _extractPDF(source) {
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

            const data = await pdfParse(dataBuffer);

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
                return '[Document contains no extractable text - may be image-based or protected]';
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
