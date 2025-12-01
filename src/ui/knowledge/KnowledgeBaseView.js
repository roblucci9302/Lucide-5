import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class KnowledgeBaseView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            color: white;
            background: var(--color-gray-900);
        }

        .kb-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
            box-sizing: border-box;
        }

        /* Header */
        .kb-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .kb-title {
            font-size: 24px;
            font-weight: 600;
            color: white;
            margin: 0;
        }

        .kb-close-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 6px;
            color: white;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .kb-close-btn:hover {
            background: var(--color-white-15);
            border-color: var(--scrollbar-thumb-hover);
        }

        /* Search Bar */
        .search-section {
            margin-bottom: 20px;
            display: flex;
            gap: 12px;
        }

        .search-input {
            flex: 1;
            background: var(--color-black-20);
            border: 1px solid var(--color-white-20);
            color: white;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.15s ease;
        }

        .search-input::placeholder {
            color: var(--color-white-40);
        }

        .search-input:focus {
            outline: none;
            border-color: rgba(0, 122, 255, 0.6);
        }

        .upload-btn {
            background: rgba(0, 122, 255, 0.2);
            border: 1px solid rgba(0, 122, 255, 0.4);
            border-radius: 8px;
            color: rgba(0, 122, 255, 0.9);
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .upload-btn:hover {
            background: rgba(0, 122, 255, 0.3);
            border-color: rgba(0, 122, 255, 0.6);
        }

        .upload-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Stats Section */
        .stats-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--color-gray-800);
            border: 1px solid var(--color-white-10);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .stat-label {
            font-size: 12px;
            color: var(--color-white-60);
            font-weight: 400;
        }

        .stat-value {
            font-size: 24px;
            color: white;
            font-weight: 600;
        }

        .stat-icon {
            font-size: 20px;
            opacity: 0.6;
        }

        /* Document List */
        .document-list-container {
            flex: 1;
            overflow-y: auto;
            background: var(--color-gray-800);
            border: 1px solid var(--color-white-10);
            border-radius: 12px;
            padding: 16px;
        }

        .document-list-container::-webkit-scrollbar {
            width: 8px;
        }

        .document-list-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .document-list-container::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 4px;
        }

        .document-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .document-item {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 10px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.15s ease;
        }

        .document-item:hover {
            background: var(--color-white-05);
            border-color: var(--color-white-15);
        }

        .doc-icon {
            font-size: 32px;
            min-width: 32px;
        }

        .doc-info {
            flex: 1;
            min-width: 0;
        }

        .doc-title {
            font-size: 15px;
            font-weight: 500;
            color: white;
            margin: 0 0 6px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .doc-meta {
            font-size: 12px;
            color: var(--color-white-60);
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .doc-meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .doc-tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 8px;
        }

        .tag {
            background: rgba(0, 122, 255, 0.15);
            border: 1px solid rgba(0, 122, 255, 0.3);
            border-radius: 6px;
            padding: 3px 10px;
            font-size: 11px;
            color: rgba(0, 122, 255, 0.9);
            font-weight: 500;
        }

        .doc-actions {
            display: flex;
            gap: 8px;
        }

        .doc-action-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: white;
            padding: 8px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            min-width: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .doc-action-btn:hover {
            background: var(--color-white-15);
            border-color: var(--color-white-25);
        }

        .doc-action-btn.danger:hover {
            background: rgba(255, 59, 48, 0.2);
            border-color: rgba(255, 59, 48, 0.4);
            color: rgba(255, 59, 48, 0.9);
        }

        /* Empty State */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
        }

        .empty-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.3;
        }

        .empty-title {
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin: 0 0 8px 0;
        }

        .empty-message {
            font-size: 14px;
            color: var(--color-white-60);
            max-width: 400px;
        }

        /* Loading State */
        .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 12px;
            color: var(--color-white-70);
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--color-white-20);
            border-top: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Filter Section */
        .filter-section {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .filter-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: var(--color-white-70);
            padding: 6px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .filter-btn:hover {
            background: var(--color-white-15);
            color: white;
        }

        .filter-btn.active {
            background: rgba(0, 122, 255, 0.2);
            border-color: rgba(0, 122, 255, 0.4);
            color: rgba(0, 122, 255, 0.9);
        }
    `;

    static properties = {
        documents: { type: Array, state: true },
        filteredDocuments: { type: Array, state: true },
        stats: { type: Object, state: true },
        isLoading: { type: Boolean, state: true },
        searchQuery: { type: String, state: true },
        selectedFilter: { type: String, state: true },
        uploading: { type: Boolean, state: true }
    };

    constructor() {
        super();
        this.documents = [];
        this.filteredDocuments = [];
        this.stats = {
            totalDocuments: 0,
            totalSize: 0,
            indexed: 0
        };
        this.isLoading = true;
        this.searchQuery = '';
        this.selectedFilter = 'all';
        this.uploading = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadDocuments();
        this.loadStats();
    }

    async loadDocuments() {
        this.isLoading = true;
        try {
            const result = await window.api.documents.getAllDocuments();
            this.documents = result || [];
            this.filteredDocuments = this.documents;
            console.log('[KnowledgeBaseView] Loaded documents:', this.documents.length);
        } catch (error) {
            console.error('[KnowledgeBaseView] Error loading documents:', error);
            this.documents = [];
            this.filteredDocuments = [];
        } finally {
            this.isLoading = false;
        }
    }

    async loadStats() {
        try {
            const result = await window.api.documents.getStats();
            if (result) {
                this.stats = result;
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error loading stats:', error);
        }
    }

    handleSearch(e) {
        this.searchQuery = e.target.value.toLowerCase();
        this.filterDocuments();
    }

    handleFilterChange(filter) {
        this.selectedFilter = filter;
        this.filterDocuments();
    }

    filterDocuments() {
        let filtered = this.documents;

        // Apply search query
        if (this.searchQuery) {
            filtered = filtered.filter(doc =>
                doc.title?.toLowerCase().includes(this.searchQuery) ||
                doc.filename?.toLowerCase().includes(this.searchQuery) ||
                doc.description?.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply type filter
        if (this.selectedFilter !== 'all') {
            filtered = filtered.filter(doc => doc.file_type === this.selectedFilter);
        }

        this.filteredDocuments = filtered;
    }

    async handleUpload() {
        if (this.uploading) return;

        try {
            this.uploading = true;
            console.log('[KnowledgeBaseView] Starting document upload...');

            const result = await window.api.documents.uploadDocument();

            if (result.success) {
                console.log('[KnowledgeBaseView] Document uploaded successfully');
                // Reload documents
                await this.loadDocuments();
                await this.loadStats();
                alert(`Document "${result.document.title}" uploadé avec succès !`);
            } else if (!result.cancelled) {
                console.error('[KnowledgeBaseView] Upload failed:', result.error);
                alert(`Échec de l'upload : ${result.error}`);
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error uploading document:', error);
            alert(`Erreur : ${error.message}`);
        } finally {
            this.uploading = false;
        }
    }

    async handleDeleteDocument(documentId, title) {
        if (!confirm(`Voulez-vous vraiment supprimer "${title}" ?`)) {
            return;
        }

        try {
            await window.api.documents.deleteDocument(documentId);
            console.log('[KnowledgeBaseView] Document deleted:', documentId);

            // Reload documents
            await this.loadDocuments();
            await this.loadStats();
            alert('Document supprimé avec succès');
        } catch (error) {
            console.error('[KnowledgeBaseView] Error deleting document:', error);
            alert(`Erreur lors de la suppression : ${error.message}`);
        }
    }

    handleViewDocument(documentId) {
        console.log('[KnowledgeBaseView] View document:', documentId);
        // TODO: Implement document viewer
        alert('Visualisation de document : fonctionnalité à venir');
    }

    handleEditDocument(documentId) {
        console.log('[KnowledgeBaseView] Edit document:', documentId);
        // TODO: Implement document editor
        alert('Édition de document : fonctionnalité à venir');
    }

    handleClose() {
        if (window.api && window.api.knowledgeBase && window.api.knowledgeBase.closeWindow) {
            window.api.knowledgeBase.closeWindow();
        }
    }

    getFileIcon(fileType) {
        const icons = {
            'txt': '📄',
            'md': '📝',
            'pdf': '📕',
            'docx': '📘',
            'doc': '📘'
        };
        return icons[fileType] || '📄';
    }

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    getUniqueFileTypes() {
        const types = new Set(this.documents.map(doc => doc.file_type));
        return Array.from(types);
    }

    render() {
        return html`
            <div class="kb-container">
                <!-- Header -->
                <div class="kb-header">
                    <h1 class="kb-title">📚 Base de Connaissances</h1>
                    <button class="kb-close-btn" @click=${this.handleClose}>
                        Fermer
                    </button>
                </div>

                <!-- Stats -->
                <div class="stats-section">
                    <div class="stat-card">
                        <span class="stat-icon">📄</span>
                        <div class="stat-label">Documents</div>
                        <div class="stat-value">${this.stats.totalDocuments || 0}</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon">💾</span>
                        <div class="stat-label">Taille totale</div>
                        <div class="stat-value">${this.formatSize(this.stats.totalSize)}</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon">🔍</span>
                        <div class="stat-label">Indexés</div>
                        <div class="stat-value">${this.stats.indexed || 0}</div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="search-section">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Rechercher dans vos documents..."
                        @input=${this.handleSearch}
                        .value=${this.searchQuery}
                    />
                    <button
                        class="upload-btn"
                        @click=${this.handleUpload}
                        ?disabled=${this.uploading}
                    >
                        ${this.uploading ? '⏳ Upload en cours...' : '📤 Ajouter un Document'}
                    </button>
                </div>

                <!-- Filters -->
                ${this.getUniqueFileTypes().length > 0 ? html`
                    <div class="filter-section">
                        <button
                            class="filter-btn ${this.selectedFilter === 'all' ? 'active' : ''}"
                            @click=${() => this.handleFilterChange('all')}
                        >
                            Tous
                        </button>
                        ${this.getUniqueFileTypes().map(type => html`
                            <button
                                class="filter-btn ${this.selectedFilter === type ? 'active' : ''}"
                                @click=${() => this.handleFilterChange(type)}
                            >
                                ${type.toUpperCase()}
                            </button>
                        `)}
                    </div>
                ` : ''}

                <!-- Document List -->
                <div class="document-list-container">
                    ${this.isLoading ? html`
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <span>Chargement des documents...</span>
                        </div>
                    ` : this.filteredDocuments.length === 0 ? html`
                        <div class="empty-state">
                            <div class="empty-icon">📚</div>
                            <h2 class="empty-title">
                                ${this.searchQuery ? 'Aucun résultat' : 'Aucun document'}
                            </h2>
                            <p class="empty-message">
                                ${this.searchQuery
                                    ? 'Essayez une autre recherche'
                                    : 'Commencez par ajouter des documents à votre base de connaissances'}
                            </p>
                        </div>
                    ` : html`
                        <div class="document-list">
                            ${this.filteredDocuments.map(doc => html`
                                <div class="document-item">
                                    <div class="doc-icon">${this.getFileIcon(doc.file_type)}</div>
                                    <div class="doc-info">
                                        <h3 class="doc-title">${doc.title || doc.filename}</h3>
                                        <div class="doc-meta">
                                            <span class="doc-meta-item">
                                                📁 ${doc.filename}
                                            </span>
                                            <span class="doc-meta-item">
                                                💾 ${this.formatSize(doc.file_size)}
                                            </span>
                                            <span class="doc-meta-item">
                                                📅 ${this.formatDate(doc.created_at)}
                                            </span>
                                            ${doc.chunk_count ? html`
                                                <span class="doc-meta-item">
                                                    🔢 ${doc.chunk_count} chunks
                                                </span>
                                            ` : ''}
                                            ${doc.indexed ? html`
                                                <span class="doc-meta-item" style="color: rgba(0,255,0,0.7);">
                                                    ✓ Indexé
                                                </span>
                                            ` : ''}
                                        </div>
                                        ${doc.tags && doc.tags.length > 0 ? html`
                                            <div class="doc-tags">
                                                ${doc.tags.map(tag => html`
                                                    <span class="tag">${tag}</span>
                                                `)}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="doc-actions">
                                        <button
                                            class="doc-action-btn"
                                            @click=${() => this.handleViewDocument(doc.id)}
                                            title="Voir le document"
                                        >
                                            👁️
                                        </button>
                                        <button
                                            class="doc-action-btn"
                                            @click=${() => this.handleEditDocument(doc.id)}
                                            title="Éditer les métadonnées"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            class="doc-action-btn danger"
                                            @click=${() => this.handleDeleteDocument(doc.id, doc.title || doc.filename)}
                                            title="Supprimer"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            `)}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}

customElements.define('knowledge-base-view', KnowledgeBaseView);
