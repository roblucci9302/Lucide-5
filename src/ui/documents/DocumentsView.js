import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import { TranslationMixin } from '../i18n/useTranslation.js';

/**
 * Documents View Component - Phase 4: Knowledge Base
 * Manages document upload, search, and organization
 */
export class DocumentsView extends TranslationMixin(LitElement) {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100%;
            background: var(--glass-bg);
            border-radius: var(--radius-lg);
            overflow: hidden;
        }

        .documents-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 16px;
            gap: 16px;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-title {
            font-size: 18px;
            font-weight: 600;
            color: white;
        }

        .upload-btn {
            background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-primary-500) 40%, transparent);
            color: white;
            padding: 8px 16px;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 13px;
        }

        .upload-btn:hover {
            background: color-mix(in srgb, var(--color-primary-500) 30%, transparent);
        }

        .search-bar {
            display: flex;
            gap: 8px;
        }

        .search-input {
            flex: 1;
            padding: 10px 14px;
            background: var(--color-white-5);
            border: 1px solid var(--color-white-10);
            border-radius: var(--radius-md);
            color: white;
            font-size: 13px;
        }

        .documents-list {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .document-card {
            background: var(--color-white-5);
            border: 1px solid var(--color-white-10);
            border-radius: var(--radius-md);
            padding: 12px;
            cursor: pointer;
            transition: all var(--transition-base) var(--easing-standard);
        }

        .document-card:hover {
            background: var(--color-white-8);
            transform: translateX(4px);
        }

        .doc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        }

        .doc-title {
            font-size: 14px;
            font-weight: 500;
            color: white;
        }

        .doc-meta {
            font-size: 11px;
            color: var(--color-white-50);
        }

        .no-documents {
            text-align: center;
            padding: 60px 20px;
            color: var(--color-white-50);
        }

        .stats {
            display: flex;
            gap: 16px;
            padding: 12px;
            background: var(--color-white-3);
            border-radius: var(--radius-md);
        }

        .stat-item {
            flex: 1;
            text-align: center;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 600;
            color: white;
        }

        .stat-label {
            font-size: 11px;
            color: var(--color-white-50);
            margin-top: 4px;
        }

        /* NEW-4: Document Detail Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-content {
            background: var(--color-gray-800);
            border-radius: var(--radius-lg);
            border: 1px solid var(--color-white-15);
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            border-bottom: 1px solid var(--color-white-10);
            background: var(--color-white-05);
        }

        .modal-title {
            font-size: 16px;
            font-weight: 600;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .modal-close-btn {
            background: transparent;
            border: none;
            color: var(--color-white-50);
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
        }

        .modal-close-btn:hover {
            color: white;
        }

        .modal-body {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
        }

        .detail-section {
            margin-bottom: 16px;
        }

        .detail-label {
            font-size: 11px;
            color: var(--color-white-40);
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .detail-value {
            font-size: 14px;
            color: white;
        }

        .detail-content {
            background: var(--color-white-05);
            border-radius: var(--radius-sm);
            padding: 12px;
            font-size: 13px;
            color: var(--color-white-80);
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-family: monospace;
        }

        .modal-footer {
            display: flex;
            gap: 8px;
            padding: 16px;
            border-top: 1px solid var(--color-white-10);
            background: var(--color-white-05);
        }

        .modal-btn {
            padding: 8px 16px;
            border-radius: var(--radius-md);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .modal-btn-primary {
            background: var(--color-primary-500);
            border: none;
            color: white;
        }

        .modal-btn-primary:hover {
            background: var(--color-primary-400);
        }

        .modal-btn-danger {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: rgb(239, 68, 68);
        }

        .modal-btn-danger:hover {
            background: rgba(239, 68, 68, 0.3);
        }
    `;

    static properties = {
        documents: { type: Array, state: true },
        stats: { type: Object, state: true },
        searchQuery: { type: String, state: true },
        isLoading: { type: Boolean, state: true },
        // NEW-4: Document detail modal
        selectedDocument: { type: Object, state: true },
        showDetailModal: { type: Boolean, state: true }
    };

    constructor() {
        super();
        this.documents = [];
        this.stats = { total_documents: 0, total_size: 0, indexed_documents: 0 };
        this.searchQuery = '';
        this.isLoading = false;
        // NEW-4: Initialize modal state
        this.selectedDocument = null;
        this.showDetailModal = false;

        this.loadDocuments();
        this.loadStats();
    }

    async loadDocuments() {
        if (!window.api) return;

        this.isLoading = true;

        try {
            this.documents = await window.api.documents.getAllDocuments();
            console.log(`[DocumentsView] Loaded ${this.documents.length} documents`);
        } catch (error) {
            console.error('[DocumentsView] Error loading documents:', error);
            this.documents = [];
        }

        this.isLoading = false;
    }

    async loadStats() {
        if (!window.api) return;

        try {
            this.stats = await window.api.documents.getStats();
        } catch (error) {
            console.error('[DocumentsView] Error loading stats:', error);
        }
    }

    async handleUpload() {
        if (!window.api) return;

        // This would trigger a file picker in the main process
        const result = await window.api.documents.uploadDocument();

        if (result) {
            await this.loadDocuments();
            await this.loadStats();
        }
    }

    async handleSearch(e) {
        this.searchQuery = e.target.value;

        if (this.searchQuery.length < 2) {
            await this.loadDocuments();
            return;
        }

        try {
            this.documents = await window.api.documents.searchDocuments(this.searchQuery);
        } catch (error) {
            console.error('[DocumentsView] Error searching:', error);
        }
    }

    async handleDelete(documentId) {
        if (!window.api || !confirm('Delete this document?')) return;

        try {
            await window.api.documents.deleteDocument(documentId);
            await this.loadDocuments();
            await this.loadStats();
        } catch (error) {
            console.error('[DocumentsView] Error deleting:', error);
        }
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    render() {
        return html`
            <div class="documents-container">
                <div class="header">
                    <div class="header-title">📚 Base de Connaissances</div>
                    <button class="upload-btn" @click=${this.handleUpload}>
                        + Upload Document
                    </button>
                </div>

                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">${this.stats.total_documents || 0}</div>
                        <div class="stat-label">Documents</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.formatFileSize(this.stats.total_size || 0)}</div>
                        <div class="stat-label">Storage</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.stats.indexed_documents || 0}</div>
                        <div class="stat-label">Indexed</div>
                    </div>
                </div>

                <div class="search-bar">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="${this.t('documents.searchPlaceholder')}"
                        @input=${this.handleSearch}
                        .value=${this.searchQuery}
                    />
                </div>

                <div class="documents-list">
                    ${this.documents.length === 0 ? html`
                        <div class="no-documents">
                            <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                            <div>No documents yet</div>
                            <div style="margin-top: 8px; font-size: 12px;">
                                Upload documents to build your knowledge base
                            </div>
                        </div>
                    ` : this.documents.map(doc => html`
                        <div class="document-card" @click=${() => this.handleDocumentClick(doc)}>
                            <div class="doc-header">
                                <div class="doc-title">
                                    ${this.getFileIcon(doc.file_type)} ${doc.title}
                                </div>
                                <button
                                    @click=${(e) => { e.stopPropagation(); this.handleDelete(doc.id); }}
                                    style="background: rgba(255,100,100,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;"
                                >
                                    Delete
                                </button>
                            </div>
                            <div class="doc-meta">
                                ${doc.filename} • ${this.formatFileSize(doc.file_size)} •
                                ${this.formatDate(doc.created_at)} •
                                ${doc.chunk_count} chunks
                            </div>
                        </div>
                    `)}
                </div>
            </div>

            ${this.renderDetailModal()}
        `;
    }

    getFileIcon(fileType) {
        const icons = {
            'pdf': '📕',
            'docx': '📘',
            'txt': '📄',
            'md': '📝'
        };
        return icons[fileType] || '📄';
    }

    // NEW-4: Open document detail modal
    handleDocumentClick(doc) {
        console.log('[DocumentsView] Document clicked:', doc.id);
        this.selectedDocument = doc;
        this.showDetailModal = true;
    }

    // NEW-4: Close document detail modal
    closeDetailModal() {
        this.showDetailModal = false;
        this.selectedDocument = null;
    }

    // NEW-4: Render document detail modal
    renderDetailModal() {
        if (!this.showDetailModal || !this.selectedDocument) {
            return '';
        }

        const doc = this.selectedDocument;

        return html`
            <div class="modal-overlay" @click=${(e) => e.target === e.currentTarget && this.closeDetailModal()}>
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">
                            ${this.getFileIcon(doc.file_type)} ${doc.title || doc.filename}
                        </div>
                        <button class="modal-close-btn" @click=${this.closeDetailModal}>&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-section">
                            <div class="detail-label">Nom du fichier</div>
                            <div class="detail-value">${doc.filename}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Type</div>
                            <div class="detail-value">${doc.file_type?.toUpperCase() || 'Inconnu'}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Taille</div>
                            <div class="detail-value">${this.formatFileSize(doc.file_size)}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Date d'ajout</div>
                            <div class="detail-value">${this.formatDate(doc.created_at)}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Chunks indexés</div>
                            <div class="detail-value">${doc.chunk_count || 0} segments</div>
                        </div>
                        ${doc.content_preview ? html`
                            <div class="detail-section">
                                <div class="detail-label">Aperçu du contenu</div>
                                <div class="detail-content">${doc.content_preview}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-danger" @click=${() => { this.handleDelete(doc.id); this.closeDetailModal(); }}>
                            Supprimer
                        </button>
                        <button class="modal-btn modal-btn-primary" @click=${this.closeDetailModal}>
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('documents-view', DocumentsView);
