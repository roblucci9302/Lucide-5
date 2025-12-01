/**
 * Firebase Knowledge Base Sync Service
 *
 * Manages synchronization between local SQLite knowledge base and Firebase Firestore.
 * Provides bidirectional sync, real-time updates, and external database connections.
 */

const { getFirestoreInstance } = require('../../common/services/firebaseClient');
const { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } = require('firebase/firestore');
const { loaders } = require('../../common/utils/dependencyLoader');
const uuid = loaders.loadUuid();
const uuidv4 = uuid.v4;
const sqliteClient = require('../../common/services/sqliteClient');
const authService = require('../../common/services/authService');
const documentService = require('../../common/services/documentService');
const Store = require('electron-store');

/**
 * @class FirebaseKnowledgeSync
 * @description Service for syncing knowledge base with Firebase Firestore
 */
class FirebaseKnowledgeSync {
    constructor() {
        this.db = null;
        this.firestore = null;
        this.syncListeners = new Map(); // uid -> unsubscribe function
        this.syncInProgress = false;
        this.externalConfig = null;
        // Use electron-store instead of app_config SQLite table
        this.configStore = new Store({
            name: 'knowledge-sync-config',
            defaults: {
                syncEnabled: false,
                knowledgeBaseName: 'Base Locale',
                lastSyncTime: null
            }
        });
        console.log('[FirebaseKnowledgeSync] Service initialized');
    }

    /**
     * Initialize the service
     */
    async initialize() {
        this.db = sqliteClient.getDb();
        this.firestore = getFirestoreInstance();

        if (!this.firestore) {
            console.warn('[FirebaseKnowledgeSync] Firestore not available');
            return false;
        }

        console.log('[FirebaseKnowledgeSync] Service ready');
        return true;
    }

    /**
     * Get current knowledge base status for user
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Status object
     */
    async getStatus(uid) {
        try {
            if (!this.db) await this.initialize();

            // Count local documents
            const localCount = this.db.prepare(`
                SELECT COUNT(*) as count FROM documents WHERE uid = ?
            `).get(uid);

            // Use electron-store instead of app_config table
            const syncEnabled = this.configStore.get('syncEnabled', false);
            const name = this.configStore.get('knowledgeBaseName', 'Base Locale');

            return {
                status: syncEnabled ? 'active' : 'inactive',
                name,
                documentCount: localCount.count || 0,
                syncEnabled,
                lastSync: this._getLastSyncTime()
            };
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error getting status:', error);
            return {
                status: 'inactive',
                name: '',
                documentCount: 0,
                syncEnabled: false
            };
        }
    }

    /**
     * Create personal knowledge base on Firestore
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Result object
     */
    async createPersonalKnowledgeBase(uid) {
        console.log(`[FirebaseKnowledgeSync] Creating personal knowledge base for user: ${uid}`);

        try {
            if (!this.firestore) {
                throw new Error('Firestore not initialized');
            }

            // Create metadata document (4 segments for valid doc() path)
            const metadataRef = doc(this.firestore, `users/${uid}/knowledge_config/metadata`);

            await setDoc(metadataRef, {
                total_documents: 0,
                total_size: 0,
                last_sync: Date.now(),
                sync_enabled: true,
                created_at: Date.now(),
                version: '1.0'
            });

            // Enable sync in local config
            this._setSyncEnabled(true);
            this._setKnowledgeBaseName('Base Personnelle');

            console.log('[FirebaseKnowledgeSync] Personal knowledge base created');

            // Sync existing local documents to Firebase
            const syncResult = await this.syncToFirebase(uid);

            return {
                success: true,
                name: 'Base Personnelle',
                documentCount: syncResult.syncedCount || 0
            };
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error creating personal knowledge base:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sync local documents to Firestore
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Sync result
     */
    async syncToFirebase(uid) {
        console.log(`[FirebaseKnowledgeSync] Syncing to Firebase for user: ${uid}`);

        if (this.syncInProgress) {
            console.warn('[FirebaseKnowledgeSync] Sync already in progress');
            return { success: false, error: 'Sync already in progress' };
        }

        try {
            this.syncInProgress = true;

            if (!this.firestore) {
                throw new Error('Firestore not initialized');
            }

            // Get all local documents for user
            const documents = this.db.prepare(`
                SELECT * FROM documents WHERE uid = ?
            `).all(uid);

            console.log(`[FirebaseKnowledgeSync] Found ${documents.length} local documents to sync`);

            let syncedCount = 0;

            for (const document of documents) {
                try {
                    // Create document reference (4 segments for valid doc() path)
                    const docRef = doc(this.firestore, `users/${uid}/documents/${document.id}`);

                    // Prepare document data
                    const docData = {
                        id: document.id,
                        title: document.title,
                        filename: document.filename,
                        file_type: document.file_type,
                        file_size: document.file_size,
                        content: document.content,
                        tags: document.tags ? JSON.parse(document.tags) : [],
                        description: document.description,
                        chunk_count: document.chunk_count,
                        indexed: document.indexed === 1,
                        created_at: document.created_at,
                        updated_at: document.updated_at,
                        synced_at: Date.now()
                    };

                    await setDoc(docRef, docData);

                    // Get chunks for this document
                    const chunks = this.db.prepare(`
                        SELECT * FROM document_chunks WHERE document_id = ?
                    `).all(document.id);

                    // Sync chunks (4 segments for valid doc() path)
                    for (const chunk of chunks) {
                        const chunkRef = doc(this.firestore, `users/${uid}/chunks/${chunk.id}`);

                        const chunkData = {
                            id: chunk.id,
                            document_id: chunk.document_id,
                            chunk_index: chunk.chunk_index,
                            content: chunk.content,
                            token_count: chunk.token_count,
                            embedding: chunk.embedding ? JSON.parse(chunk.embedding) : null,
                            created_at: chunk.created_at
                        };

                        await setDoc(chunkRef, chunkData);
                    }

                    syncedCount++;
                    console.log(`[FirebaseKnowledgeSync] Synced document: ${document.title} (${chunks.length} chunks)`);
                } catch (error) {
                    console.error(`[FirebaseKnowledgeSync] Error syncing document ${document.id}:`, error);
                }
            }

            // Update metadata (4 segments for valid doc() path)
            const metadataRef = doc(this.firestore, `users/${uid}/knowledge_config/metadata`);
            await setDoc(metadataRef, {
                total_documents: syncedCount,
                last_sync: Date.now(),
                sync_enabled: true
            }, { merge: true });

            this._setLastSyncTime(Date.now());

            console.log(`[FirebaseKnowledgeSync] Sync completed: ${syncedCount} documents synced`);

            return {
                success: true,
                syncedCount
            };
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error syncing to Firebase:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync from Firestore to local SQLite
     * @param {string} uid - User ID
     * @returns {Promise<Object>} Sync result
     */
    async syncFromFirebase(uid) {
        console.log(`[FirebaseKnowledgeSync] Syncing from Firebase for user: ${uid}`);

        try {
            if (!this.firestore) {
                throw new Error('Firestore not initialized');
            }

            // Get all documents from Firestore (3 segments for valid collection() path)
            const documentsRef = collection(this.firestore, `users/${uid}/documents`);
            const snapshot = await getDocs(documentsRef);

            console.log(`[FirebaseKnowledgeSync] Found ${snapshot.size} Firebase documents`);

            let syncedCount = 0;

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();

                try {
                    // Check if document exists locally
                    const existing = this.db.prepare(`
                        SELECT id FROM documents WHERE id = ?
                    `).get(data.id);

                    if (existing) {
                        // Update existing document
                        this.db.prepare(`
                            UPDATE documents
                            SET title = ?, content = ?, tags = ?, description = ?,
                                chunk_count = ?, indexed = ?, updated_at = ?
                            WHERE id = ?
                        `).run(
                            data.title,
                            data.content,
                            JSON.stringify(data.tags || []),
                            data.description,
                            data.chunk_count,
                            data.indexed ? 1 : 0,
                            Date.now(),
                            data.id
                        );
                    } else {
                        // Insert new document
                        this.db.prepare(`
                            INSERT INTO documents (
                                id, uid, title, filename, file_type, file_size,
                                content, tags, description, chunk_count, indexed,
                                created_at, updated_at, sync_state
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            data.id,
                            uid,
                            data.title,
                            data.filename,
                            data.file_type,
                            data.file_size,
                            data.content,
                            JSON.stringify(data.tags || []),
                            data.description,
                            data.chunk_count,
                            data.indexed ? 1 : 0,
                            data.created_at,
                            Date.now(),
                            'clean'
                        );
                    }

                    syncedCount++;
                } catch (error) {
                    console.error(`[FirebaseKnowledgeSync] Error syncing document ${data.id}:`, error);
                }
            }

            this._setLastSyncTime(Date.now());

            console.log(`[FirebaseKnowledgeSync] Sync from Firebase completed: ${syncedCount} documents`);

            return {
                success: true,
                syncedCount
            };
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error syncing from Firebase:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Connect to external Firestore database
     * @param {Object} config - Firebase config
     * @returns {Promise<Object>} Result
     */
    async connectExternalDatabase(config) {
        console.log('[FirebaseKnowledgeSync] Connecting to external database');

        try {
            // Validate config
            if (!config.apiKey || !config.projectId || !config.appId) {
                throw new Error('Invalid Firebase configuration');
            }

            // Store external config
            this.externalConfig = config;

            // TODO: Initialize secondary Firebase app for external database
            // For now, we'll use the main Firestore instance
            // In a full implementation, you'd use initializeApp(config, 'external')

            // Enable sync
            this._setSyncEnabled(true);
            this._setKnowledgeBaseName('Base Externe');

            console.log('[FirebaseKnowledgeSync] Connected to external database');

            return {
                success: true,
                name: 'Base Externe',
                documentCount: 0
            };
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error connecting to external database:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Setup real-time sync listener
     * @param {string} uid - User ID
     */
    setupRealtimeSync(uid) {
        console.log(`[FirebaseKnowledgeSync] Setting up real-time sync for user: ${uid}`);

        if (!this.firestore) {
            console.warn('[FirebaseKnowledgeSync] Firestore not available');
            return;
        }

        // Clean up existing listener
        if (this.syncListeners.has(uid)) {
            this.syncListeners.get(uid)();
        }

        // Create new listener (3 segments for valid collection() path)
        const documentsRef = collection(this.firestore, `users/${uid}/documents`);

        const unsubscribe = onSnapshot(documentsRef, (snapshot) => {
            console.log(`[FirebaseKnowledgeSync] Received ${snapshot.docChanges().length} changes from Firebase`);

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();

                if (change.type === 'added' || change.type === 'modified') {
                    // Update local database
                    this._upsertLocalDocument(uid, data);
                } else if (change.type === 'removed') {
                    // Delete from local database
                    this._deleteLocalDocument(data.id);
                }
            });
        }, (error) => {
            console.error('[FirebaseKnowledgeSync] Real-time sync error:', error);
        });

        this.syncListeners.set(uid, unsubscribe);
        console.log('[FirebaseKnowledgeSync] Real-time sync active');
    }

    /**
     * Stop real-time sync
     * @param {string} uid - User ID
     */
    stopRealtimeSync(uid) {
        if (this.syncListeners.has(uid)) {
            this.syncListeners.get(uid)();
            this.syncListeners.delete(uid);
            console.log(`[FirebaseKnowledgeSync] Real-time sync stopped for user: ${uid}`);
        }
    }

    // ====== Private Helper Methods ======

    _upsertLocalDocument(uid, data) {
        try {
            const existing = this.db.prepare(`SELECT id FROM documents WHERE id = ?`).get(data.id);

            if (existing) {
                this.db.prepare(`
                    UPDATE documents
                    SET title = ?, content = ?, tags = ?, description = ?,
                        chunk_count = ?, indexed = ?, updated_at = ?
                    WHERE id = ?
                `).run(
                    data.title,
                    data.content,
                    JSON.stringify(data.tags || []),
                    data.description,
                    data.chunk_count,
                    data.indexed ? 1 : 0,
                    Date.now(),
                    data.id
                );
            } else {
                this.db.prepare(`
                    INSERT INTO documents (
                        id, uid, title, filename, file_type, file_size,
                        content, tags, description, chunk_count, indexed,
                        created_at, updated_at, sync_state
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    data.id,
                    uid,
                    data.title,
                    data.filename,
                    data.file_type,
                    data.file_size,
                    data.content,
                    JSON.stringify(data.tags || []),
                    data.description,
                    data.chunk_count,
                    data.indexed ? 1 : 0,
                    data.created_at,
                    Date.now(),
                    'clean'
                );
            }

            console.log(`[FirebaseKnowledgeSync] Upserted local document: ${data.title}`);
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error upserting local document:', error);
        }
    }

    _deleteLocalDocument(documentId) {
        try {
            this.db.prepare(`DELETE FROM documents WHERE id = ?`).run(documentId);
            this.db.prepare(`DELETE FROM document_chunks WHERE document_id = ?`).run(documentId);
            console.log(`[FirebaseKnowledgeSync] Deleted local document: ${documentId}`);
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error deleting local document:', error);
        }
    }

    _setSyncEnabled(enabled) {
        try {
            this.configStore.set('syncEnabled', enabled);
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error setting sync enabled:', error);
        }
    }

    _setKnowledgeBaseName(name) {
        try {
            this.configStore.set('knowledgeBaseName', name);
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error setting knowledge base name:', error);
        }
    }

    _setLastSyncTime(timestamp) {
        try {
            this.configStore.set('lastSyncTime', timestamp);
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error setting last sync time:', error);
        }
    }

    _getLastSyncTime() {
        try {
            return this.configStore.get('lastSyncTime', null);
        } catch (error) {
            console.error('[FirebaseKnowledgeSync] Error getting last sync time:', error);
            return null;
        }
    }
}

// Export singleton instance
const firebaseKnowledgeSync = new FirebaseKnowledgeSync();
module.exports = firebaseKnowledgeSync;
