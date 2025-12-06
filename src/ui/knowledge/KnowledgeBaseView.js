import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import '../components/ToastNotification.js';

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

        /* Modal Overlay */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 24px;
            box-sizing: border-box;
        }

        .modal-container {
            background: var(--color-gray-900);
            border: 1px solid var(--color-white-20);
            border-radius: 12px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .modal-title {
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .modal-close-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 6px;
            color: white;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .modal-close-btn:hover {
            background: var(--color-white-15);
        }

        .modal-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }

        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 20px;
            border-top: 1px solid var(--color-white-10);
        }

        /* Document Viewer */
        .document-content {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 8px;
            padding: 20px;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.6;
            color: var(--color-white-80);
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 60vh;
            overflow-y: auto;
            user-select: text;
        }

        .document-meta-section {
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .document-meta-row {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            margin-bottom: 8px;
        }

        .document-meta-item {
            font-size: 13px;
            color: var(--color-white-60);
        }

        .document-meta-item strong {
            color: var(--color-white-80);
        }

        /* Editor Form */
        .form-group {
            margin-bottom: 16px;
        }

        .form-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--color-white-80);
            margin-bottom: 6px;
        }

        .form-input {
            width: 100%;
            background: var(--color-black-20);
            border: 1px solid var(--color-white-20);
            border-radius: 6px;
            color: white;
            padding: 10px 12px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.15s ease;
        }

        .form-input:focus {
            outline: none;
            border-color: rgba(0, 122, 255, 0.6);
        }

        .form-textarea {
            min-height: 100px;
            resize: vertical;
        }

        .form-hint {
            font-size: 11px;
            color: var(--color-white-50);
            margin-top: 4px;
        }

        .btn-primary {
            background: rgba(0, 122, 255, 0.8);
            border: 1px solid rgba(0, 122, 255, 0.9);
            border-radius: 6px;
            color: white;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-primary:hover {
            background: rgba(0, 122, 255, 0.9);
        }

        .btn-secondary {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 6px;
            color: white;
            padding: 8px 16px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-secondary:hover {
            background: var(--color-white-15);
        }

        /* Drag & Drop Zone */
        .drop-zone {
            position: relative;
            transition: all 0.2s ease;
        }

        .drop-zone.drag-over {
            background: rgba(0, 122, 255, 0.1);
            border-color: rgba(0, 122, 255, 0.5);
        }

        .drop-zone.drag-over::after {
            content: '';
            position: absolute;
            inset: 0;
            border: 2px dashed rgba(0, 122, 255, 0.6);
            border-radius: 12px;
            pointer-events: none;
            animation: pulse 1.5s ease infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .drop-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 122, 255, 0.15);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            z-index: 100;
            backdrop-filter: blur(4px);
        }

        .drop-overlay-icon {
            font-size: 48px;
            animation: bounce 0.6s ease infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }

        .drop-overlay-text {
            font-size: 16px;
            font-weight: 500;
            color: rgba(0, 122, 255, 0.9);
        }

        /* Form validation */
        .form-input.invalid {
            border-color: rgba(255, 69, 58, 0.6);
        }

        .form-input.valid {
            border-color: rgba(52, 199, 89, 0.5);
        }

        .char-counter {
            display: flex;
            justify-content: flex-end;
            margin-top: 4px;
            font-size: 11px;
            color: var(--color-white-50);
        }

        .char-counter.warning {
            color: rgba(255, 159, 10, 0.9);
        }

        .char-counter.error {
            color: rgba(255, 69, 58, 0.9);
        }

        .tag-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }

        .tag-preview .tag {
            background: rgba(0, 122, 255, 0.15);
            border: 1px solid rgba(0, 122, 255, 0.3);
            border-radius: 6px;
            padding: 3px 10px;
            font-size: 11px;
            color: rgba(0, 122, 255, 0.9);
            font-weight: 500;
        }

        .tag-preview .tag.overflow {
            opacity: 0.5;
            text-decoration: line-through;
        }

        /* Sort & Filter Bar */
        .toolbar-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .sort-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sort-label {
            font-size: 12px;
            color: var(--color-white-50);
        }

        .sort-select {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: white;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .sort-select:hover {
            border-color: var(--color-white-25);
        }

        .sort-select:focus {
            outline: none;
            border-color: rgba(0, 122, 255, 0.5);
        }

        .sort-order-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: var(--color-white-70);
            padding: 6px 10px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sort-order-btn:hover {
            background: var(--color-white-15);
            color: white;
        }

        .results-count {
            font-size: 12px;
            color: var(--color-white-50);
        }

        /* Pagination */
        .pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px 0;
            border-top: 1px solid var(--color-white-10);
            margin-top: auto;
        }

        .pagination-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: var(--color-white-70);
            padding: 8px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .pagination-btn:hover:not(:disabled) {
            background: var(--color-white-15);
            color: white;
        }

        .pagination-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .pagination-btn.active {
            background: rgba(0, 122, 255, 0.2);
            border-color: rgba(0, 122, 255, 0.4);
            color: rgba(0, 122, 255, 0.9);
        }

        .pagination-info {
            font-size: 12px;
            color: var(--color-white-50);
            padding: 0 12px;
        }

        .page-size-select {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: white;
            padding: 6px 10px;
            font-size: 12px;
            cursor: pointer;
            margin-left: 12px;
        }

        /* Markdown/Code Preview */
        .document-content.markdown {
            font-family: var(--font-family-primary);
            line-height: 1.7;
        }

        .document-content.markdown h1,
        .document-content.markdown h2,
        .document-content.markdown h3 {
            color: white;
            margin: 1em 0 0.5em 0;
        }

        .document-content.markdown h1 { font-size: 1.5em; }
        .document-content.markdown h2 { font-size: 1.3em; }
        .document-content.markdown h3 { font-size: 1.1em; }

        .document-content.markdown p {
            margin: 0.8em 0;
        }

        .document-content.markdown code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--font-family-mono, monospace);
            font-size: 0.9em;
        }

        .document-content.markdown pre {
            background: rgba(0, 0, 0, 0.4);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1em 0;
        }

        .document-content.markdown pre code {
            background: none;
            padding: 0;
        }

        .document-content.markdown ul,
        .document-content.markdown ol {
            padding-left: 1.5em;
            margin: 0.8em 0;
        }

        .document-content.markdown li {
            margin: 0.3em 0;
        }

        .document-content.markdown blockquote {
            border-left: 3px solid rgba(0, 122, 255, 0.5);
            padding-left: 16px;
            margin: 1em 0;
            color: var(--color-white-70);
        }

        .document-content.markdown a {
            color: rgba(0, 122, 255, 0.9);
            text-decoration: none;
        }

        .document-content.markdown a:hover {
            text-decoration: underline;
        }

        .document-content.markdown hr {
            border: none;
            border-top: 1px solid var(--color-white-15);
            margin: 1.5em 0;
        }

        .document-content.markdown table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }

        .document-content.markdown th,
        .document-content.markdown td {
            border: 1px solid var(--color-white-15);
            padding: 8px 12px;
            text-align: left;
        }

        .document-content.markdown th {
            background: rgba(255, 255, 255, 0.05);
        }

        .view-mode-toggle {
            display: flex;
            gap: 4px;
            margin-bottom: 12px;
        }

        .view-mode-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: var(--color-white-60);
            padding: 6px 12px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .view-mode-btn:hover {
            background: var(--color-white-15);
            color: white;
        }

        .view-mode-btn.active {
            background: rgba(0, 122, 255, 0.2);
            border-color: rgba(0, 122, 255, 0.4);
            color: rgba(0, 122, 255, 0.9);
        }
    `;

    static properties = {
        documents: { type: Array, state: true },
        filteredDocuments: { type: Array, state: true },
        paginatedDocuments: { type: Array, state: true },
        stats: { type: Object, state: true },
        isLoading: { type: Boolean, state: true },
        searchQuery: { type: String, state: true },
        selectedFilter: { type: String, state: true },
        uploading: { type: Boolean, state: true },
        uploadProgress: { type: Number, state: true },
        // Sorting
        sortBy: { type: String, state: true },
        sortOrder: { type: String, state: true },
        // Pagination
        currentPage: { type: Number, state: true },
        pageSize: { type: Number, state: true },
        // Drag & Drop
        isDragOver: { type: Boolean, state: true },
        // Modal states
        viewerOpen: { type: Boolean, state: true },
        editorOpen: { type: Boolean, state: true },
        selectedDocument: { type: Object, state: true },
        documentLoading: { type: Boolean, state: true },
        editForm: { type: Object, state: true },
        // Form validation
        formErrors: { type: Object, state: true },
        // Viewer mode
        viewerMode: { type: String, state: true }
    };

    // Validation limits
    static MAX_TITLE_LENGTH = 200;
    static MAX_DESCRIPTION_LENGTH = 1000;
    static MAX_TAGS = 20;
    static MAX_TAG_LENGTH = 50;
    static MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    constructor() {
        super();
        this.documents = [];
        this.filteredDocuments = [];
        this.paginatedDocuments = [];
        this.stats = {
            totalDocuments: 0,
            totalSize: 0,
            indexed: 0
        };
        this.isLoading = true;
        this.searchQuery = '';
        this.selectedFilter = 'all';
        this.uploading = false;
        this.uploadProgress = 0;
        // Sorting
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
        // Pagination
        this.currentPage = 1;
        this.pageSize = 20;
        // Drag & Drop
        this.isDragOver = false;
        this._dragCounter = 0;
        // Modal states
        this.viewerOpen = false;
        this.editorOpen = false;
        this.selectedDocument = null;
        this.documentLoading = false;
        this.editForm = { title: '', description: '', tags: '' };
        // Form validation
        this.formErrors = {};
        // Viewer mode
        this.viewerMode = 'rendered'; // 'rendered' or 'raw'
        // Bind drag handlers
        this._handleDragEnter = this._handleDragEnter.bind(this);
        this._handleDragLeave = this._handleDragLeave.bind(this);
        this._handleDragOver = this._handleDragOver.bind(this);
        this._handleDrop = this._handleDrop.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadDocuments();
        this.loadStats();
        // Keyboard shortcuts
        this._handleKeyDown = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._handleKeyDown);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._handleKeyDown);
    }

    _handleKeyDown(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            if (this.viewerOpen) {
                this.closeViewer();
            } else if (this.editorOpen) {
                this.closeEditor();
            }
        }
        // Ctrl+S to save in editor
        if (e.key === 's' && (e.ctrlKey || e.metaKey) && this.editorOpen) {
            e.preventDefault();
            this.saveDocumentEdits();
        }
    }

    // Drag & Drop handlers
    _handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this._dragCounter++;
        if (e.dataTransfer.types.includes('Files')) {
            this.isDragOver = true;
        }
    }

    _handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this._dragCounter--;
        if (this._dragCounter === 0) {
            this.isDragOver = false;
        }
    }

    _handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async _handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this._dragCounter = 0;
        this.isDragOver = false;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // Upload first file (can extend to multiple later)
        const file = files[0];
        await this._uploadFile(file);
    }

    _isValidFileType(filename) {
        const validExtensions = ['.txt', '.md', '.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.gif'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return validExtensions.includes(ext);
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
        this.currentPage = 1; // Reset to first page on search
        this.filterDocuments();
    }

    handleFilterChange(filter) {
        this.selectedFilter = filter;
        this.currentPage = 1; // Reset to first page on filter change
        this.filterDocuments();
    }

    handleSortChange(e) {
        this.sortBy = e.target.value;
        this.filterDocuments();
    }

    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this.filterDocuments();
    }

    handlePageChange(page) {
        this.currentPage = page;
        this._updatePaginatedDocuments();
    }

    handlePageSizeChange(e) {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this._updatePaginatedDocuments();
    }

    filterDocuments() {
        let filtered = [...this.documents];

        // Apply search query
        if (this.searchQuery) {
            filtered = filtered.filter(doc =>
                doc.title?.toLowerCase().includes(this.searchQuery) ||
                doc.filename?.toLowerCase().includes(this.searchQuery) ||
                doc.description?.toLowerCase().includes(this.searchQuery) ||
                (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)))
            );
        }

        // Apply type filter
        if (this.selectedFilter !== 'all') {
            filtered = filtered.filter(doc => doc.file_type === this.selectedFilter);
        }

        // Apply sorting
        filtered = this._sortDocuments(filtered);

        this.filteredDocuments = filtered;
        this._updatePaginatedDocuments();
    }

    _sortDocuments(docs) {
        return [...docs].sort((a, b) => {
            let valueA, valueB;

            switch (this.sortBy) {
                case 'title':
                    valueA = (a.title || a.filename || '').toLowerCase();
                    valueB = (b.title || b.filename || '').toLowerCase();
                    break;
                case 'file_size':
                    valueA = a.file_size || 0;
                    valueB = b.file_size || 0;
                    break;
                case 'file_type':
                    valueA = (a.file_type || '').toLowerCase();
                    valueB = (b.file_type || '').toLowerCase();
                    break;
                case 'created_at':
                default:
                    valueA = a.created_at || 0;
                    valueB = b.created_at || 0;
                    break;
            }

            if (typeof valueA === 'string') {
                const comparison = valueA.localeCompare(valueB);
                return this.sortOrder === 'asc' ? comparison : -comparison;
            } else {
                return this.sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
            }
        });
    }

    _updatePaginatedDocuments() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.paginatedDocuments = this.filteredDocuments.slice(startIndex, endIndex);
    }

    get totalPages() {
        return Math.ceil(this.filteredDocuments.length / this.pageSize);
    }

    get pageNumbers() {
        const total = this.totalPages;
        const current = this.currentPage;
        const pages = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push('...');
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                pages.push(i);
            }
            if (current < total - 2) pages.push('...');
            if (total > 1) pages.push(total);
        }

        return pages;
    }

    async handleUpload() {
        if (this.uploading) return;

        try {
            this.uploading = true;
            this.uploadProgress = 0;
            console.log('[KnowledgeBaseView] Starting document upload...');

            // Show progress toast
            const progressId = window.showProgress?.('Préparation de l\'upload...', 0);

            const result = await window.api.documents.uploadDocument();

            if (result.success) {
                console.log('[KnowledgeBaseView] Document uploaded successfully');
                // Dismiss progress and show success
                if (progressId) window.dismissToast?.(progressId);
                window.showToast?.(`Document "${result.document.title}" uploadé avec succès !`, 'success');
                // Reload documents
                await this.loadDocuments();
                await this.loadStats();
            } else if (!result.cancelled) {
                console.error('[KnowledgeBaseView] Upload failed:', result.error);
                if (progressId) window.dismissToast?.(progressId);
                window.showToast?.(`Échec de l'upload : ${result.error}`, 'error', 6000);
            } else {
                // Cancelled - dismiss progress silently
                if (progressId) window.dismissToast?.(progressId);
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error uploading document:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error', 6000);
        } finally {
            this.uploading = false;
            this.uploadProgress = 0;
        }
    }

    async _uploadFile(file) {
        if (this.uploading) {
            window.showToast?.('Un upload est déjà en cours', 'warning');
            return;
        }

        // Validate file type
        if (!this._isValidFileType(file.name)) {
            window.showToast?.('Type de fichier non supporté. Formats acceptés: TXT, MD, PDF, DOCX, JPG, PNG, GIF', 'error', 6000);
            return;
        }

        // Validate file size
        if (file.size > KnowledgeBaseView.MAX_FILE_SIZE) {
            window.showToast?.(`Fichier trop volumineux. Taille maximum: 100 MB`, 'error', 6000);
            return;
        }

        try {
            this.uploading = true;
            this.uploadProgress = 0;
            console.log('[KnowledgeBaseView] Starting file upload:', file.name);

            // Show progress toast
            const progressId = window.showProgress?.(`Upload de "${file.name}"...`, 0);

            // Simulate progress during file reading
            const updateProgress = (progress) => {
                this.uploadProgress = progress;
                window.updateProgress?.(progressId, progress);
            };

            // Read file as ArrayBuffer
            updateProgress(10);
            const buffer = await file.arrayBuffer();
            updateProgress(30);

            // Convert to base64 for IPC transfer
            const uint8Array = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            updateProgress(50);

            // Send to backend
            const fileData = {
                filename: file.name,
                buffer: base64,
                size: file.size,
                type: file.type
            };

            updateProgress(70);
            const result = await window.api.documents.uploadDocument(fileData);
            updateProgress(100);

            if (result.success) {
                console.log('[KnowledgeBaseView] File uploaded successfully');
                if (progressId) window.dismissToast?.(progressId);
                window.showToast?.(`Document "${result.document.title}" uploadé avec succès !`, 'success');
                await this.loadDocuments();
                await this.loadStats();
            } else {
                console.error('[KnowledgeBaseView] Upload failed:', result.error);
                if (progressId) window.dismissToast?.(progressId);
                window.showToast?.(`Échec de l'upload : ${result.error}`, 'error', 6000);
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error uploading file:', error);
            window.showToast?.(`Erreur : ${error.message}`, 'error', 6000);
        } finally {
            this.uploading = false;
            this.uploadProgress = 0;
        }
    }

    async handleDeleteDocument(documentId, title) {
        // Use custom confirm dialog
        const confirmed = await window.showConfirm?.(
            `Supprimer "${title}" ?`,
            'Cette action est irréversible. Le document et ses données d\'indexation seront supprimés.',
            { confirmText: 'Supprimer', cancelText: 'Annuler', type: 'danger' }
        );

        if (!confirmed) return;

        try {
            await window.api.documents.deleteDocument(documentId);
            console.log('[KnowledgeBaseView] Document deleted:', documentId);

            // Reload documents
            await this.loadDocuments();
            await this.loadStats();
            window.showToast?.('Document supprimé avec succès', 'success');
        } catch (error) {
            console.error('[KnowledgeBaseView] Error deleting document:', error);
            window.showToast?.(`Erreur lors de la suppression : ${error.message}`, 'error', 6000);
        }
    }

    async handleViewDocument(documentId) {
        console.log('[KnowledgeBaseView] View document:', documentId);
        this.documentLoading = true;
        this.viewerOpen = true;

        try {
            const result = await window.api.documents.getDocument(documentId, true);
            if (result?.success) {
                this.selectedDocument = result.document;
            } else {
                window.showToast?.(`Erreur: ${result?.error || 'Document non trouvé'}`, 'error');
                this.viewerOpen = false;
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error loading document:', error);
            window.showToast?.(`Erreur lors du chargement: ${error.message}`, 'error');
            this.viewerOpen = false;
        } finally {
            this.documentLoading = false;
        }
    }

    async handleEditDocument(documentId) {
        console.log('[KnowledgeBaseView] Edit document:', documentId);
        this.documentLoading = true;
        this.editorOpen = true;
        this.formErrors = {};

        try {
            const result = await window.api.documents.getDocument(documentId, false);
            if (result?.success) {
                this.selectedDocument = result.document;
                this.editForm = {
                    title: result.document.title || '',
                    description: result.document.description || '',
                    tags: Array.isArray(result.document.tags) ? result.document.tags.join(', ') : ''
                };
            } else {
                window.showToast?.(`Erreur: ${result?.error || 'Document non trouvé'}`, 'error');
                this.editorOpen = false;
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error loading document:', error);
            window.showToast?.(`Erreur lors du chargement: ${error.message}`, 'error');
            this.editorOpen = false;
        } finally {
            this.documentLoading = false;
        }
    }

    closeViewer() {
        this.viewerOpen = false;
        this.selectedDocument = null;
        this.viewerMode = 'rendered';
    }

    toggleViewerMode(mode) {
        this.viewerMode = mode;
    }

    _isMarkdownFile(fileType) {
        return ['md', 'txt'].includes(fileType?.toLowerCase());
    }

    _renderMarkdown(content) {
        if (!content) return '';

        // Simple markdown parser
        let html = content
            // Escape HTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold and Italic
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Blockquotes
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            // Horizontal rule
            .replace(/^---$/gm, '<hr>')
            .replace(/^\*\*\*$/gm, '<hr>')
            // Unordered lists
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            // Ordered lists
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Wrap in paragraph
        html = '<p>' + html + '</p>';

        // Fix consecutive list items
        html = html.replace(/<\/li><br><li>/g, '</li><li>');
        html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
        html = html.replace(/<\/ul><ul>/g, '');

        // Fix consecutive blockquotes
        html = html.replace(/<\/blockquote><br><blockquote>/g, '<br>');

        return html;
    }

    closeEditor() {
        this.editorOpen = false;
        this.selectedDocument = null;
        this.editForm = { title: '', description: '', tags: '' };
        this.formErrors = {};
    }

    handleEditFormChange(field, value) {
        this.editForm = { ...this.editForm, [field]: value };
        // Real-time validation
        this._validateField(field, value);
    }

    _validateField(field, value) {
        const errors = { ...this.formErrors };

        switch (field) {
            case 'title':
                if (value.length > KnowledgeBaseView.MAX_TITLE_LENGTH) {
                    errors.title = `Maximum ${KnowledgeBaseView.MAX_TITLE_LENGTH} caractères`;
                } else {
                    delete errors.title;
                }
                break;
            case 'description':
                if (value.length > KnowledgeBaseView.MAX_DESCRIPTION_LENGTH) {
                    errors.description = `Maximum ${KnowledgeBaseView.MAX_DESCRIPTION_LENGTH} caractères`;
                } else {
                    delete errors.description;
                }
                break;
            case 'tags':
                const tags = value.split(',').map(t => t.trim()).filter(t => t);
                if (tags.length > KnowledgeBaseView.MAX_TAGS) {
                    errors.tags = `Maximum ${KnowledgeBaseView.MAX_TAGS} tags`;
                } else if (tags.some(t => t.length > KnowledgeBaseView.MAX_TAG_LENGTH)) {
                    errors.tags = `Maximum ${KnowledgeBaseView.MAX_TAG_LENGTH} caractères par tag`;
                } else {
                    delete errors.tags;
                }
                break;
        }

        this.formErrors = errors;
    }

    _getCharCounterClass(current, max) {
        const ratio = current / max;
        if (ratio >= 1) return 'error';
        if (ratio >= 0.9) return 'warning';
        return '';
    }

    _parseTags(tagsString) {
        return tagsString
            .split(',')
            .map(t => t.trim())
            .filter(t => t);
    }

    async saveDocumentEdits() {
        if (!this.selectedDocument) return;

        // Validate all fields before saving
        this._validateField('title', this.editForm.title);
        this._validateField('description', this.editForm.description);
        this._validateField('tags', this.editForm.tags);

        // Check for errors
        if (Object.keys(this.formErrors).length > 0) {
            window.showToast?.('Veuillez corriger les erreurs avant de sauvegarder', 'warning');
            return;
        }

        try {
            // Parse and validate tags with limits
            const parsedTags = this.editForm.tags
                .split(',')
                .map(t => t.trim().substring(0, KnowledgeBaseView.MAX_TAG_LENGTH))
                .filter(t => t)
                .slice(0, KnowledgeBaseView.MAX_TAGS);

            const updates = {
                title: this.editForm.title.trim().substring(0, KnowledgeBaseView.MAX_TITLE_LENGTH),
                description: this.editForm.description.trim().substring(0, KnowledgeBaseView.MAX_DESCRIPTION_LENGTH),
                tags: parsedTags
            };

            const result = await window.api.documents.updateDocument(this.selectedDocument.id, updates);
            if (result?.success) {
                console.log('[KnowledgeBaseView] Document updated');
                this.closeEditor();
                await this.loadDocuments();
                window.showToast?.('Document mis à jour avec succès', 'success');
            } else {
                window.showToast?.(`Erreur: ${result?.error || 'Échec de la mise à jour'}`, 'error');
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error updating document:', error);
            window.showToast?.(`Erreur: ${error.message}`, 'error');
        }
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
            <toast-notification></toast-notification>
            <div class="kb-container"
                @dragenter=${this._handleDragEnter}
                @dragleave=${this._handleDragLeave}
                @dragover=${this._handleDragOver}
                @drop=${this._handleDrop}
            >
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

                <!-- Sort & Results -->
                <div class="toolbar-section">
                    <div class="sort-controls">
                        <span class="sort-label">Trier par:</span>
                        <select class="sort-select" @change=${this.handleSortChange} .value=${this.sortBy}>
                            <option value="created_at">Date</option>
                            <option value="title">Nom</option>
                            <option value="file_size">Taille</option>
                            <option value="file_type">Type</option>
                        </select>
                        <button class="sort-order-btn" @click=${this.toggleSortOrder} title="Inverser l'ordre">
                            ${this.sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                    <span class="results-count">
                        ${this.filteredDocuments.length} document${this.filteredDocuments.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <!-- Document List -->
                <div class="document-list-container drop-zone ${this.isDragOver ? 'drag-over' : ''}">
                    ${this.isDragOver ? html`
                        <div class="drop-overlay">
                            <span class="drop-overlay-icon">📥</span>
                            <span class="drop-overlay-text">Déposez votre fichier ici</span>
                        </div>
                    ` : ''}
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
                                    : 'Commencez par ajouter des documents à votre base de connaissances. Glissez-déposez un fichier ou cliquez sur "Ajouter".'}
                            </p>
                        </div>
                    ` : html`
                        <div class="document-list">
                            ${this.paginatedDocuments.map(doc => html`
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

                <!-- Pagination -->
                ${this.totalPages > 1 ? html`
                    <div class="pagination">
                        <button
                            class="pagination-btn"
                            @click=${() => this.handlePageChange(1)}
                            ?disabled=${this.currentPage === 1}
                        >
                            ««
                        </button>
                        <button
                            class="pagination-btn"
                            @click=${() => this.handlePageChange(this.currentPage - 1)}
                            ?disabled=${this.currentPage === 1}
                        >
                            «
                        </button>

                        ${this.pageNumbers.map(page =>
                            page === '...'
                                ? html`<span class="pagination-info">...</span>`
                                : html`
                                    <button
                                        class="pagination-btn ${this.currentPage === page ? 'active' : ''}"
                                        @click=${() => this.handlePageChange(page)}
                                    >
                                        ${page}
                                    </button>
                                `
                        )}

                        <button
                            class="pagination-btn"
                            @click=${() => this.handlePageChange(this.currentPage + 1)}
                            ?disabled=${this.currentPage === this.totalPages}
                        >
                            »
                        </button>
                        <button
                            class="pagination-btn"
                            @click=${() => this.handlePageChange(this.totalPages)}
                            ?disabled=${this.currentPage === this.totalPages}
                        >
                            »»
                        </button>

                        <select class="page-size-select" @change=${this.handlePageSizeChange} .value=${String(this.pageSize)}>
                            <option value="10">10 / page</option>
                            <option value="20">20 / page</option>
                            <option value="50">50 / page</option>
                            <option value="100">100 / page</option>
                        </select>
                    </div>
                ` : ''}
            </div>

            <!-- Document Viewer Modal -->
            ${this.viewerOpen ? html`
                <div class="modal-overlay" @click=${(e) => e.target === e.currentTarget && this.closeViewer()}>
                    <div class="modal-container">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                ${this.getFileIcon(this.selectedDocument?.file_type)}
                                ${this.selectedDocument?.title || this.selectedDocument?.filename || 'Document'}
                            </h2>
                            <button class="modal-close-btn" @click=${this.closeViewer}>Fermer</button>
                        </div>
                        <div class="modal-body">
                            ${this.documentLoading ? html`
                                <div class="loading-state">
                                    <div class="loading-spinner"></div>
                                    <span>Chargement du contenu...</span>
                                </div>
                            ` : this.selectedDocument ? html`
                                <div class="document-meta-section">
                                    <div class="document-meta-row">
                                        <span class="document-meta-item">
                                            <strong>Fichier:</strong> ${this.selectedDocument.filename}
                                        </span>
                                        <span class="document-meta-item">
                                            <strong>Type:</strong> ${this.selectedDocument.file_type?.toUpperCase()}
                                        </span>
                                        <span class="document-meta-item">
                                            <strong>Taille:</strong> ${this.formatSize(this.selectedDocument.file_size)}
                                        </span>
                                    </div>
                                    <div class="document-meta-row">
                                        <span class="document-meta-item">
                                            <strong>Créé:</strong> ${this.formatDate(this.selectedDocument.created_at)}
                                        </span>
                                        ${this.selectedDocument.chunk_count ? html`
                                            <span class="document-meta-item">
                                                <strong>Chunks:</strong> ${this.selectedDocument.chunk_count}
                                            </span>
                                        ` : ''}
                                    </div>
                                    ${this.selectedDocument.description ? html`
                                        <div class="document-meta-row">
                                            <span class="document-meta-item">
                                                <strong>Description:</strong> ${this.selectedDocument.description}
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                                ${this._isMarkdownFile(this.selectedDocument?.file_type) ? html`
                                    <div class="view-mode-toggle">
                                        <button
                                            class="view-mode-btn ${this.viewerMode === 'rendered' ? 'active' : ''}"
                                            @click=${() => this.toggleViewerMode('rendered')}
                                        >
                                            Aperçu
                                        </button>
                                        <button
                                            class="view-mode-btn ${this.viewerMode === 'raw' ? 'active' : ''}"
                                            @click=${() => this.toggleViewerMode('raw')}
                                        >
                                            Code source
                                        </button>
                                    </div>
                                ` : ''}
                                ${this.viewerMode === 'rendered' && this._isMarkdownFile(this.selectedDocument?.file_type) ? html`
                                    <div class="document-content markdown" .innerHTML=${this._renderMarkdown(this.selectedDocument.content)}></div>
                                ` : html`
                                    <div class="document-content">
                                        ${this.selectedDocument.content || 'Aucun contenu disponible'}
                                    </div>
                                `}
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Document Editor Modal -->
            ${this.editorOpen ? html`
                <div class="modal-overlay" @click=${(e) => e.target === e.currentTarget && this.closeEditor()}>
                    <div class="modal-container">
                        <div class="modal-header">
                            <h2 class="modal-title">
                                ✏️ Modifier le document
                            </h2>
                            <button class="modal-close-btn" @click=${this.closeEditor}>Annuler</button>
                        </div>
                        <div class="modal-body">
                            ${this.documentLoading ? html`
                                <div class="loading-state">
                                    <div class="loading-spinner"></div>
                                    <span>Chargement...</span>
                                </div>
                            ` : html`
                                <div class="form-group">
                                    <label class="form-label">Titre</label>
                                    <input
                                        type="text"
                                        class="form-input ${this.formErrors.title ? 'invalid' : this.editForm.title ? 'valid' : ''}"
                                        .value=${this.editForm.title}
                                        @input=${(e) => this.handleEditFormChange('title', e.target.value)}
                                        placeholder="Titre du document"
                                        maxlength="${KnowledgeBaseView.MAX_TITLE_LENGTH}"
                                    />
                                    <div class="char-counter ${this._getCharCounterClass(this.editForm.title.length, KnowledgeBaseView.MAX_TITLE_LENGTH)}">
                                        ${this.editForm.title.length} / ${KnowledgeBaseView.MAX_TITLE_LENGTH}
                                    </div>
                                    ${this.formErrors.title ? html`<div class="form-hint" style="color: rgba(255,69,58,0.9);">${this.formErrors.title}</div>` : ''}
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Description</label>
                                    <textarea
                                        class="form-input form-textarea ${this.formErrors.description ? 'invalid' : this.editForm.description ? 'valid' : ''}"
                                        .value=${this.editForm.description}
                                        @input=${(e) => this.handleEditFormChange('description', e.target.value)}
                                        placeholder="Description du document..."
                                        maxlength="${KnowledgeBaseView.MAX_DESCRIPTION_LENGTH}"
                                    ></textarea>
                                    <div class="char-counter ${this._getCharCounterClass(this.editForm.description.length, KnowledgeBaseView.MAX_DESCRIPTION_LENGTH)}">
                                        ${this.editForm.description.length} / ${KnowledgeBaseView.MAX_DESCRIPTION_LENGTH}
                                    </div>
                                    ${this.formErrors.description ? html`<div class="form-hint" style="color: rgba(255,69,58,0.9);">${this.formErrors.description}</div>` : ''}
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Tags</label>
                                    <input
                                        type="text"
                                        class="form-input ${this.formErrors.tags ? 'invalid' : this.editForm.tags ? 'valid' : ''}"
                                        .value=${this.editForm.tags}
                                        @input=${(e) => this.handleEditFormChange('tags', e.target.value)}
                                        placeholder="tag1, tag2, tag3"
                                    />
                                    <div class="form-hint">
                                        Séparez les tags par des virgules (max ${KnowledgeBaseView.MAX_TAGS} tags, ${KnowledgeBaseView.MAX_TAG_LENGTH} caractères chacun)
                                    </div>
                                    ${this.formErrors.tags ? html`<div class="form-hint" style="color: rgba(255,69,58,0.9);">${this.formErrors.tags}</div>` : ''}
                                    ${this.editForm.tags ? html`
                                        <div class="tag-preview">
                                            ${this._parseTags(this.editForm.tags).map((tag, i) => html`
                                                <span class="tag ${i >= KnowledgeBaseView.MAX_TAGS || tag.length > KnowledgeBaseView.MAX_TAG_LENGTH ? 'overflow' : ''}">
                                                    ${tag.length > KnowledgeBaseView.MAX_TAG_LENGTH ? tag.substring(0, KnowledgeBaseView.MAX_TAG_LENGTH) + '...' : tag}
                                                </span>
                                            `)}
                                        </div>
                                    ` : ''}
                                </div>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" @click=${this.closeEditor}>Annuler</button>
                            <button class="btn-primary" @click=${this.saveDocumentEdits}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('knowledge-base-view', KnowledgeBaseView);
