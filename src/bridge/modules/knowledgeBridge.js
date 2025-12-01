/**
 * Knowledge Bridge - IPC handlers for workflows, documents, and RAG (Phase 3 & 4)
 */
const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const authService = require('../../features/common/services/authService');
const workflowService = require('../../features/common/services/workflowService');
const documentService = require('../../features/common/services/documentService');
const indexingService = require('../../features/common/services/indexingService');
const ragService = require('../../features/common/services/ragService');
const firebaseKnowledgeSync = require('../../features/knowledge/services/firebaseKnowledgeSync');
const { DOCUMENTS } = require('../../features/common/config/constants');
const { loaders } = require('../../features/common/utils/dependencyLoader');

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
        ipcMain.handle('documents:upload', async () => {
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

                // Index document for semantic search
                try {
                    console.log(`[KnowledgeBridge] Indexing document: ${document.id}`);
                    const indexResult = await indexingService.indexDocument(
                        document.id,
                        document.content,
                        { generateEmbeddings: true }
                    );

                    // Update document indexed status
                    await documentService.updateDocument(document.id, {
                        chunk_count: indexResult.chunk_count,
                        indexed: 1
                    });

                    console.log(`[KnowledgeBridge] Document indexed: ${indexResult.chunk_count} chunks`);
                } catch (indexError) {
                    console.error('[KnowledgeBridge] Error indexing document:', indexError);
                    // Continue even if indexing fails
                }

                return {
                    success: true,
                    document: {
                        id: document.id,
                        title: document.title,
                        filename: document.filename
                    }
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
                    try {
                        const { createWorker } = require('tesseract.js');

                        console.log(`[KnowledgeBridge] Starting OCR for ${filename}...`);

                        const worker = await createWorker('fra+eng', 1, {
                            logger: (m) => {
                                if (m.status === 'recognizing text') {
                                    console.log(`[KnowledgeBridge] OCR Progress: ${Math.round(m.progress * 100)}%`);
                                }
                            }
                        });

                        const { data: { text } } = await worker.recognize(bufferObj);
                        await worker.terminate();

                        extractedText = text;
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

        ipcMain.handle('knowledge:open-manager', async () => {
            try {
                console.log('[KnowledgeBridge] Opening knowledge base manager');

                // For now, just show a message
                // In a full implementation, you'd open a new window or navigate to the KB manager view
                await dialog.showMessageBox({
                    type: 'info',
                    title: 'Gestionnaire de Knowledge Base',
                    message: 'Le gestionnaire de documents sera bientôt disponible dans une future mise à jour.',
                    buttons: ['OK']
                });

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

        console.log('[KnowledgeBridge] Initialized');
    }
};
