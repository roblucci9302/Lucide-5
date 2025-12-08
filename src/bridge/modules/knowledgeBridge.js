/**
 * Knowledge Bridge - IPC handlers for workflows, documents, and RAG (Phase 3 & 4)
 *
 * KB-P0-1: Added embedding provider status notifications
 */
const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const authService = require('../../features/common/services/authService');
const workflowService = require('../../features/common/services/workflowService');
const documentService = require('../../features/common/services/documentService');
const indexingService = require('../../features/common/services/indexingService');
const ragService = require('../../features/common/services/ragService');
const { firebaseKnowledgeSync, syncEvents } = require('../../features/knowledge/services/firebaseKnowledgeSync');
const { DOCUMENTS } = require('../../features/common/config/constants');
const { loaders } = require('../../features/common/utils/dependencyLoader');
// KB-P2-3: Import knowledgeBaseService for Knowledge Manager
const knowledgeBaseService = require('../../features/knowledge/knowledgeBaseService');
// KB-P0-1: Import embedding provider status system
const { embeddingEvents, getProviderStatus } = require('../../features/common/services/embeddingProvider');

module.exports = {
    initialize() {
        // Workflows (Phase 3)
        ipcMain.handle('workflows:get-current-profile-workflows', () => {
            return workflowService.getCurrentProfileWorkflows();
        });
        ipcMain.handle('workflows:get-workflows-metadata', (event, profileId) => {
            return workflowService.getProfileWorkflowsMetadata(profileId);
        });
        ipcMain.handle('workflows:get-workflow', (event, profileId, workflowId) => {
            return workflowService.getWorkflow(profileId, workflowId);
        });
        ipcMain.handle('workflows:build-prompt', (event, profileId, workflowId, formData) => {
            return workflowService.buildPrompt(profileId, workflowId, formData);
        });
        ipcMain.handle('workflows:get-form-fields', (event, profileId, workflowId) => {
            return workflowService.getWorkflowFormFields(profileId, workflowId);
        });
        ipcMain.handle('workflows:validate-form', (event, profileId, workflowId, formData) => {
            return workflowService.validateFormData(profileId, workflowId, formData);
        });

        // Knowledge Base - Documents (Phase 4)
        ipcMain.handle('documents:get-all', async () => {
            const userId = authService.getCurrentUserId();
            return await documentService.getAllDocuments(userId);
        });
        ipcMain.handle('documents:search', async (event, query, filters) => {
            const userId = authService.getCurrentUserId();
            return await documentService.searchDocuments(userId, query, filters);
        });
        ipcMain.handle('documents:get-stats', async () => {
            const userId = authService.getCurrentUserId();
            return await documentService.getDocumentStats(userId);
        });
        ipcMain.handle('documents:delete', async (event, documentId) => {
            return await documentService.deleteDocument(documentId);
        });

        // Get single document with optional content
        ipcMain.handle('documents:get', async (event, documentId, includeContent = true) => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const document = await documentService.getDocument(documentId, includeContent);
                if (!document) {
                    return { success: false, error: 'Document not found' };
                }
                // Verify document belongs to user
                if (document.uid !== userId) {
                    return { success: false, error: 'Access denied' };
                }
                return { success: true, document };
            } catch (error) {
                console.error('[KnowledgeBridge] Error getting document:', error);
                return { success: false, error: error.message };
            }
        });

        // Update document metadata
        ipcMain.handle('documents:update', async (event, documentId, updates) => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const document = await documentService.getDocument(documentId, false);
                if (!document || document.uid !== userId) {
                    return { success: false, error: 'Document not found or access denied' };
                }
                const result = await documentService.updateDocument(documentId, updates);
                return { success: true, document: result };
            } catch (error) {
                console.error('[KnowledgeBridge] Error updating document:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('documents:upload', async (event) => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                // Open file picker dialog
                const result = await dialog.showOpenDialog({
                    title: 'Upload Document',
                    properties: ['openFile'],
                    filters: [
                        { name: 'All Supported', extensions: ['txt', 'md', 'pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif'] },
                        { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'docx'] },
                        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
                        { name: 'Text Files', extensions: ['txt', 'md'] },
                        { name: 'PDF Files', extensions: ['pdf'] },
                        { name: 'Word Documents', extensions: ['docx'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || result.filePaths.length === 0) {
                    return { success: false, cancelled: true };
                }

                const filePath = result.filePaths[0];
                const filename = path.basename(filePath);

                // Check file size before reading (prevent DoS)
                const stats = await fs.stat(filePath);

                if (stats.size > DOCUMENTS.MAX_FILE_SIZE_BYTES) {
                    console.warn(`[KnowledgeBridge] File too large: ${stats.size} bytes (max: ${DOCUMENTS.MAX_FILE_SIZE_BYTES})`);
                    return {
                        success: false,
                        error: `File too large. Maximum size is ${DOCUMENTS.MAX_FILE_SIZE_MB}MB`
                    };
                }

                // Read file buffer
                const buffer = await fs.readFile(filePath);

                console.log(`[KnowledgeBridge] Uploading document: ${filename} (${buffer.length} bytes)`);

                // Upload document
                const document = await documentService.uploadDocument(userId, {
                    filename,
                    filepath: filePath,
                    buffer
                });

                // KB-P1-3: Make indexing non-blocking - start async indexing and return immediately
                // Get sender window for progress updates
                const senderWindow = BrowserWindow.fromWebContents(event.sender);

                // Start indexing in background with progress updates
                setImmediate(async () => {
                    try {
                        console.log(`[KnowledgeBridge] Starting background indexing: ${document.id}`);

                        // KB-P1-3 & KB-UX-1: Progress callback for real-time updates
                        const onProgress = (progress) => {
                            if (senderWindow && !senderWindow.isDestroyed()) {
                                senderWindow.webContents.send('documents:indexing-progress', {
                                    documentId: document.id,
                                    documentTitle: document.title,
                                    ...progress
                                });
                            }
                        };

                        const indexResult = await indexingService.indexDocument(
                            document.id,
                            document.content,
                            {
                                generateEmbeddings: true,
                                onProgress
                            }
                        );

                        // Update document indexed status
                        await documentService.updateDocument(document.id, {
                            chunk_count: indexResult.chunk_count,
                            indexed: 1
                        });

                        console.log(`[KnowledgeBridge] Background indexing complete: ${indexResult.chunk_count} chunks`);

                        // Notify UI of completion
                        if (senderWindow && !senderWindow.isDestroyed()) {
                            senderWindow.webContents.send('documents:indexing-complete', {
                                documentId: document.id,
                                documentTitle: document.title,
                                chunkCount: indexResult.chunk_count
                            });
                        }
                    } catch (indexError) {
                        console.error('[KnowledgeBridge] Background indexing error:', indexError);
                        // Notify UI of error
                        if (senderWindow && !senderWindow.isDestroyed()) {
                            senderWindow.webContents.send('documents:indexing-error', {
                                documentId: document.id,
                                documentTitle: document.title,
                                error: indexError.message
                            });
                        }
                    }
                });

                // Return immediately with pending indexing status
                return {
                    success: true,
                    document: {
                        id: document.id,
                        title: document.title,
                        filename: document.filename
                    },
                    indexing: 'pending' // KB-P1-3: Indicate indexing is in progress
                };
            } catch (error) {
                console.error('[KnowledgeBridge] Error uploading document:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Document analysis for conversation (Phase: Document Upload in Chat)
        // Modified: Now also saves to knowledge base for future RAG queries
        ipcMain.handle('documents:analyze-file', async (event, fileData) => {
            try {
                const { filename, buffer } = fileData;

                if (!filename || !buffer) {
                    throw new Error('Missing filename or buffer');
                }

                console.log(`[KnowledgeBridge] Analyzing file for conversation: ${filename}`);

                // Check file size
                if (buffer.length > DOCUMENTS.MAX_FILE_SIZE_BYTES) {
                    throw new Error(`File too large. Maximum size is ${DOCUMENTS.MAX_FILE_SIZE_MB}MB`);
                }

                // Extract text content
                const bufferObj = Buffer.from(buffer);
                const fileType = filename.split('.').pop().toLowerCase();

                let extractedText = '';

                if (fileType === 'txt' || fileType === 'md') {
                    extractedText = bufferObj.toString('utf-8');
                } else if (fileType === 'pdf') {
                    const pdfParse = loaders.loadPdfParse();
                    if (!pdfParse) {
                        throw new Error('PDF support not available. Please run: npm install pdf-parse');
                    }
                    const data = await pdfParse(bufferObj);
                    extractedText = data.text;
                } else if (fileType === 'docx') {
                    const mammoth = loaders.loadMammoth();
                    if (!mammoth) {
                        throw new Error('DOCX support not available. Please run: npm install mammoth');
                    }
                    const result = await mammoth.extractRawText({ buffer: bufferObj });
                    extractedText = result.value;
                } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
                    // OCR for images (Phase 3)
                    // KB-P1-1: Added 60-second timeout to prevent indefinite processing
                    const OCR_TIMEOUT_MS = 60000; // 60 seconds

                    try {
                        const { createWorker } = require('tesseract.js');

                        console.log(`[KnowledgeBridge] Starting OCR for ${filename} (timeout: ${OCR_TIMEOUT_MS / 1000}s)...`);

                        let worker = null;
                        let isTimedOut = false;

                        // KB-P1-1: Create promise with timeout
                        const ocrPromise = (async () => {
                            worker = await createWorker('fra+eng', 1, {
                                logger: (m) => {
                                    if (m.status === 'recognizing text') {
                                        console.log(`[KnowledgeBridge] OCR Progress: ${Math.round(m.progress * 100)}%`);
                                    }
                                }
                            });

                            const { data: { text } } = await worker.recognize(bufferObj);
                            return text;
                        })();

                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => {
                                isTimedOut = true;
                                reject(new Error(`OCR timeout: L'extraction de texte a dépassé ${OCR_TIMEOUT_MS / 1000} secondes. L'image est peut-être trop complexe ou volumineuse.`));
                            }, OCR_TIMEOUT_MS);
                        });

                        try {
                            extractedText = await Promise.race([ocrPromise, timeoutPromise]);
                        } finally {
                            // KB-P1-1: Always clean up worker, even on timeout
                            if (worker) {
                                try {
                                    await worker.terminate();
                                } catch (terminateError) {
                                    console.warn('[KnowledgeBridge] Error terminating OCR worker:', terminateError.message);
                                }
                            }
                        }

                        console.log(`[KnowledgeBridge] OCR completed: ${extractedText.length} characters extracted`);

                        if (!extractedText || extractedText.trim().length === 0) {
                            throw new Error('No text could be extracted from the image. The image may be blank or contain no readable text.');
                        }
                    } catch (ocrError) {
                        console.error('[KnowledgeBridge] OCR Error:', ocrError);

                        // Check if tesseract.js is not installed
                        if (ocrError.code === 'MODULE_NOT_FOUND') {
                            throw new Error('OCR support not available. Please ensure tesseract.js is installed (npm install).');
                        }

                        // KB-P1-1: Provide user-friendly timeout message
                        if (ocrError.message.includes('OCR timeout')) {
                            throw ocrError; // Already has user-friendly message
                        }

                        throw new Error(`OCR failed: ${ocrError.message}`);
                    }
                } else {
                    throw new Error(`Unsupported file type: ${fileType}`);
                }

                console.log(`[KnowledgeBridge] Text extracted: ${extractedText.length} characters`);

                // === NEW: Save to knowledge base for future RAG queries ===
                let documentId = null;
                let indexed = false;

                // Only save if we have meaningful content (> 50 chars)
                if (extractedText && extractedText.trim().length > 50) {
                    try {
                        const userId = authService.getCurrentUserId();
                        if (userId) {
                            console.log(`[KnowledgeBridge] Saving document to knowledge base: ${filename}`);

                            // Check if document with same filename already exists for this user
                            const existingDocs = await documentService.searchDocuments(userId, filename, {});
                            const alreadyExists = existingDocs && existingDocs.some(doc => doc.filename === filename);

                            if (alreadyExists) {
                                console.log(`[KnowledgeBridge] Document "${filename}" already exists in knowledge base, skipping save`);
                            } else {
                                // Save document to database
                                const document = await documentService.uploadDocument(userId, {
                                    filename,
                                    buffer: bufferObj,
                                    content: extractedText // Pass extracted text directly to avoid re-extraction
                                });

                                documentId = document.id;
                                console.log(`[KnowledgeBridge] Document saved with ID: ${documentId}`);

                                // Index document for semantic search (non-blocking)
                                try {
                                    console.log(`[KnowledgeBridge] Indexing document for RAG: ${documentId}`);
                                    const indexResult = await indexingService.indexDocument(
                                        documentId,
                                        extractedText,
                                        { generateEmbeddings: true }
                                    );

                                    // Update document indexed status
                                    await documentService.updateDocument(documentId, {
                                        chunk_count: indexResult.chunk_count,
                                        indexed: 1
                                    });

                                    indexed = true;
                                    console.log(`[KnowledgeBridge] Document indexed: ${indexResult.chunk_count} chunks created`);
                                } catch (indexError) {
                                    // Log but don't fail - document is still saved
                                    console.error('[KnowledgeBridge] Error indexing document (non-critical):', indexError);
                                }
                            }
                        } else {
                            console.warn('[KnowledgeBridge] No user ID available, skipping knowledge base save');
                        }
                    } catch (saveError) {
                        // Log but don't fail - extraction succeeded, we can still use the text
                        console.error('[KnowledgeBridge] Error saving to knowledge base (non-critical):', saveError);
                    }
                } else {
                    console.log('[KnowledgeBridge] Content too short (<50 chars), skipping knowledge base save');
                }
                // === END NEW ===

                return {
                    success: true,
                    filename,
                    fileType,
                    extractedText,
                    size: buffer.length,
                    // New fields to inform UI about KB save status
                    savedToKnowledgeBase: documentId !== null,
                    documentId,
                    indexed
                };
            } catch (error) {
                console.error('[KnowledgeBridge] Error analyzing file:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // RAG (Phase 4)
        ipcMain.handle('rag:retrieve-context', async (event, query, options) => {
            return await ragService.retrieveContext(query, options);
        });
        ipcMain.handle('rag:get-session-citations', async (event, sessionId) => {
            return await ragService.getSessionCitations(sessionId);
        });

        // Knowledge Base Sync (Firebase or Local)
        ipcMain.handle('knowledge:get-status', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    return { status: 'inactive', name: '', documentCount: 0 };
                }

                // Check if user is in local mode
                const userMode = authService.getCurrentUserMode ? authService.getCurrentUserMode() : 'local';
                const isLocalMode = userMode === 'local' || userId === 'default_user';

                if (isLocalMode) {
                    // Local mode: Get document count from SQLite
                    try {
                        const stats = await documentService.getDocumentStats(userId);
                        return {
                            status: stats.total > 0 ? 'active' : 'inactive',
                            name: 'Base Locale',
                            documentCount: stats.total || 0,
                            mode: 'local'
                        };
                    } catch (localError) {
                        console.log('[KnowledgeBridge] No local documents yet');
                        return { status: 'inactive', name: '', documentCount: 0, mode: 'local' };
                    }
                }

                // Firebase mode
                await firebaseKnowledgeSync.initialize();
                const status = await firebaseKnowledgeSync.getStatus(userId);
                return status;
            } catch (error) {
                console.error('[KnowledgeBridge] Error getting knowledge base status:', error);
                return { status: 'inactive', name: '', documentCount: 0, error: error.message };
            }
        });

        ipcMain.handle('knowledge:create-personal-db', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                // Check if user is in local mode (default_user) or Firebase mode
                const userMode = authService.getCurrentUserMode ? authService.getCurrentUserMode() : 'local';
                const isLocalMode = userMode === 'local' || userId === 'default_user';

                console.log(`[KnowledgeBridge] Creating personal knowledge base for user: ${userId} (mode: ${userMode})`);

                if (isLocalMode) {
                    // Local mode: Create knowledge base using SQLite only
                    console.log('[KnowledgeBridge] Creating local-only knowledge base (no Firebase sync)');

                    // The documents table already exists in SQLite schema
                    // Just mark the knowledge base as active for this user
                    return {
                        success: true,
                        name: 'Base Locale',
                        documentCount: 0,
                        mode: 'local',
                        message: 'Base de données locale créée. Les documents seront stockés localement.'
                    };
                }

                // Firebase mode: Use Firebase sync
                await firebaseKnowledgeSync.initialize();
                const result = await firebaseKnowledgeSync.createPersonalKnowledgeBase(userId);

                if (result.success) {
                    // Setup real-time sync
                    firebaseKnowledgeSync.setupRealtimeSync(userId);
                }

                return result;
            } catch (error) {
                console.error('[KnowledgeBridge] Error creating personal knowledge base:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('knowledge:connect-external-db', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                console.log('[KnowledgeBridge] Connecting to external knowledge base');

                // Show dialog to get Firebase config
                const result = await dialog.showMessageBox({
                    type: 'question',
                    title: 'Connecter une Base Externe',
                    message: 'Voulez-vous entrer la configuration Firebase manuellement ?',
                    buttons: ['Annuler', 'Entrer la Configuration'],
                    defaultId: 1,
                    cancelId: 0
                });

                if (result.response === 0) {
                    return { success: false, cancelled: true };
                }

                // For now, return success with placeholder
                // In a full implementation, you'd show a custom dialog to collect Firebase config
                console.log('[KnowledgeBridge] External database connection not fully implemented yet');

                return {
                    success: true,
                    name: 'Base Externe',
                    documentCount: 0,
                    message: 'Fonctionnalité en cours de développement'
                };
            } catch (error) {
                console.error('[KnowledgeBridge] Error connecting to external database:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('knowledge:sync-now', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                console.log('[KnowledgeBridge] Starting knowledge base sync');

                await firebaseKnowledgeSync.initialize();
                const result = await firebaseKnowledgeSync.syncToFirebase(userId);

                return result;
            } catch (error) {
                console.error('[KnowledgeBridge] Error syncing knowledge base:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // KB-P2-3: Fully implemented Knowledge Manager
        ipcMain.handle('knowledge:open-manager', async () => {
            try {
                console.log('[KnowledgeBridge] Opening knowledge base manager');
                await knowledgeBaseService.showKnowledgeBase();
                return { success: true };
            } catch (error) {
                console.error('[KnowledgeBridge] Error opening knowledge base manager:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // External Database Connection - Test connection
        ipcMain.handle('knowledge:test-external-connection', async (event, config) => {
            try {
                console.log('[KnowledgeBridge] Testing external database connection');

                if (!config || !config.apiKey || !config.projectId || !config.appId) {
                    throw new Error('Configuration Firebase incomplète');
                }

                // Initialize a temporary Firebase app to test the connection
                const { initializeApp, deleteApp } = require('firebase/app');
                const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

                const testAppName = `test-external-${Date.now()}`;
                let testApp = null;

                try {
                    // Create temporary Firebase app
                    testApp = initializeApp({
                        apiKey: config.apiKey,
                        authDomain: config.authDomain,
                        projectId: config.projectId,
                        storageBucket: config.storageBucket,
                        messagingSenderId: config.messagingSenderId,
                        appId: config.appId
                    }, testAppName);

                    const testFirestore = getFirestore(testApp);

                    // Try to access a collection to verify connection
                    const testQuery = query(collection(testFirestore, 'documents'), limit(100));
                    const snapshot = await getDocs(testQuery);

                    console.log(`[KnowledgeBridge] External connection test successful: ${snapshot.size} documents found`);

                    return {
                        success: true,
                        documentsCount: snapshot.size,
                        projectId: config.projectId
                    };
                } finally {
                    // Clean up test app
                    if (testApp) {
                        try {
                            await deleteApp(testApp);
                        } catch (cleanupError) {
                            console.warn('[KnowledgeBridge] Error cleaning up test app:', cleanupError);
                        }
                    }
                }
            } catch (error) {
                console.error('[KnowledgeBridge] External connection test failed:', error);
                return {
                    success: false,
                    error: error.message || 'Échec de la connexion'
                };
            }
        });

        // External Database Connection - Connect and save
        ipcMain.handle('knowledge:connect-external', async (event, config) => {
            try {
                console.log('[KnowledgeBridge] Connecting to external database');

                if (!config || !config.apiKey || !config.projectId || !config.appId) {
                    throw new Error('Configuration Firebase incomplète');
                }

                // Store external database configuration
                await firebaseKnowledgeSync.initialize();
                const result = await firebaseKnowledgeSync.connectExternalDatabase(config);

                if (result.success) {
                    const connectionName = config.name || `Base ${config.projectId}`;
                    console.log(`[KnowledgeBridge] Connected to external database: ${connectionName}`);
                }

                return result;
            } catch (error) {
                console.error('[KnowledgeBridge] Error connecting to external database:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Close external database dialog
        ipcMain.handle('knowledge:close-external-dialog', async () => {
            try {
                const { BrowserWindow } = require('electron');
                const windows = BrowserWindow.getAllWindows();
                const dialogWindow = windows.find(w =>
                    w.getTitle().includes('Base Externe') ||
                    w.getTitle().includes('External')
                );
                if (dialogWindow) {
                    dialogWindow.close();
                }
                return { success: true };
            } catch (error) {
                console.error('[KnowledgeBridge] Error closing external dialog:', error);
                return { success: false, error: error.message };
            }
        });

        // Get all connected databases
        ipcMain.handle('knowledge:get-all-databases', async () => {
            try {
                const userId = authService.getCurrentUserId();
                if (!userId) {
                    return { databases: [] };
                }

                const stats = await documentService.getDocumentStats(userId);

                return {
                    databases: [
                        {
                            id: 'local',
                            name: 'Base Locale',
                            type: 'local',
                            documentCount: stats.total || 0,
                            isActive: true
                        }
                    ]
                };
            } catch (error) {
                console.error('[KnowledgeBridge] Error getting databases:', error);
                return { databases: [], error: error.message };
            }
        });

        // Switch active database
        ipcMain.handle('knowledge:switch-database', async (event, dbId) => {
            try {
                console.log(`[KnowledgeBridge] Switching to database: ${dbId}`);
                return { success: true, activeDatabase: dbId };
            } catch (error) {
                console.error('[KnowledgeBridge] Error switching database:', error);
                return { success: false, error: error.message };
            }
        });

        // Document Export (Phase 4)
        const documentExportService = require('../../features/common/services/documentExportService');

        ipcMain.handle('documents:export', async (event, documentData) => {
            try {
                const { title, content, type, format } = documentData;

                if (!title || !content || !format) {
                    throw new Error('Missing required fields: title, content, or format');
                }

                console.log(`[KnowledgeBridge] Exporting document "${title}" to ${format.toUpperCase()}`);

                const result = await documentExportService.exportDocument({
                    title,
                    content,
                    type: type || 'document'
                }, format);

                return result;
            } catch (error) {
                console.error('[KnowledgeBridge] Error exporting document:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        ipcMain.handle('documents:open-export-folder', async () => {
            try {
                return await documentExportService.openExportDirectory();
            } catch (error) {
                console.error('[KnowledgeBridge] Error opening export folder:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // KB-P0-1: Embedding provider status handlers
        ipcMain.handle('embedding:get-status', async () => {
            try {
                return {
                    success: true,
                    status: getProviderStatus()
                };
            } catch (error) {
                console.error('[KnowledgeBridge] Error getting embedding status:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // KB-P0-1: Setup event listeners to broadcast embedding status changes to all windows
        embeddingEvents.on('fallback-activated', (data) => {
            console.warn('[KnowledgeBridge] Broadcasting embedding fallback notification to UI');
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('embedding:fallback-activated', {
                        type: 'warning',
                        title: 'Recherche sémantique dégradée',
                        message: `Mode de secours activé: ${data.reason}`,
                        details: 'La recherche dans vos documents utilisera une méthode simplifiée. Vérifiez votre clé API OpenAI.',
                        timestamp: data.timestamp
                    });
                }
            });
        });

        embeddingEvents.on('provider-restored', (data) => {
            console.log('[KnowledgeBridge] Broadcasting embedding provider restored notification');
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('embedding:provider-restored', {
                        type: 'success',
                        title: 'Recherche sémantique rétablie',
                        message: 'La connexion au service OpenAI est rétablie.',
                        timestamp: Date.now()
                    });
                }
            });
        });

        // KB-P2-4: Setup event listeners for Firebase connectivity status
        syncEvents.on('connectivity-lost', (status) => {
            console.warn('[KnowledgeBridge] Broadcasting Firebase connectivity lost notification');
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('firebase:connectivity-lost', {
                        type: 'warning',
                        title: 'Connexion Firebase perdue',
                        message: status.lastError || 'Impossible de se connecter à Firebase',
                        details: 'Les modifications seront sauvegardées localement et synchronisées quand la connexion sera rétablie.',
                        timestamp: status.lastCheck
                    });
                }
            });
        });

        syncEvents.on('connectivity-restored', (status) => {
            console.log('[KnowledgeBridge] Broadcasting Firebase connectivity restored notification');
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('firebase:connectivity-restored', {
                        type: 'success',
                        title: 'Connexion Firebase rétablie',
                        message: 'La synchronisation avec Firebase est de nouveau active.',
                        timestamp: status.lastCheck
                    });
                }
            });
        });

        // KB-P2-4: Handler for checking Firebase connectivity on demand
        ipcMain.handle('knowledge:check-connectivity', async () => {
            try {
                await firebaseKnowledgeSync.initialize();
                const status = await firebaseKnowledgeSync.checkConnectivity();
                return status;
            } catch (error) {
                console.error('[KnowledgeBridge] Error checking connectivity:', error);
                return {
                    isOnline: false,
                    lastCheck: Date.now(),
                    lastError: error.message,
                    consecutiveFailures: 1
                };
            }
        });

        // KB-P2-4: Handler for getting current connectivity status without checking
        ipcMain.handle('knowledge:get-connectivity-status', async () => {
            try {
                return firebaseKnowledgeSync.getConnectivityStatus();
            } catch (error) {
                console.error('[KnowledgeBridge] Error getting connectivity status:', error);
                return {
                    isOnline: false,
                    lastCheck: null,
                    lastError: error.message,
                    consecutiveFailures: 0
                };
            }
        });

        // KB-UX-5: Handler for getting embedding provider status
        ipcMain.handle('knowledge:get-embedding-status', async () => {
            try {
                return getProviderStatus();
            } catch (error) {
                console.error('[KnowledgeBridge] Error getting embedding status:', error);
                return {
                    provider: 'unknown',
                    quality: 'unknown',
                    isFallback: false
                };
            }
        });

        console.log('[KnowledgeBridge] Initialized');
    }
};
