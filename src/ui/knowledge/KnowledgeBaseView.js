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
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--color-white-10);
        }

        .kb-header-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .kb-title {
            font-size: 24px;
            font-weight: 600;
            color: white;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kb-subtitle {
            font-size: 13px;
            color: var(--color-white-50);
            margin: 0;
        }

        .kb-close-btn {
            background: transparent;
            border: none;
            border-radius: 8px;
            color: var(--color-white-50);
            width: 36px;
            height: 36px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .kb-close-btn:hover {
            background: var(--color-white-10);
            color: white;
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

        /* Phase 4 Enhancement: Provider Badge */
        .stat-card.provider {
            position: relative;
        }

        .provider-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }

        .provider-badge.high {
            background: rgba(52, 199, 89, 0.15);
            color: rgba(52, 199, 89, 0.95);
            border: 1px solid rgba(52, 199, 89, 0.3);
        }

        .provider-badge.low {
            background: rgba(255, 159, 10, 0.15);
            color: rgba(255, 159, 10, 0.95);
            border: 1px solid rgba(255, 159, 10, 0.3);
        }

        .provider-badge.none {
            background: rgba(255, 69, 58, 0.15);
            color: rgba(255, 69, 58, 0.95);
            border: 1px solid rgba(255, 69, 58, 0.3);
        }

        .provider-warning {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 8px;
            padding: 8px 10px;
            background: rgba(255, 159, 10, 0.1);
            border: 1px solid rgba(255, 159, 10, 0.2);
            border-radius: 6px;
            font-size: 11px;
            color: rgba(255, 159, 10, 0.9);
        }

        .reindex-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 12px;
            padding: 8px 12px;
            background: rgba(0, 122, 255, 0.15);
            border: 1px solid rgba(0, 122, 255, 0.3);
            border-radius: 6px;
            color: rgba(0, 122, 255, 0.9);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .reindex-btn:hover:not(:disabled) {
            background: rgba(0, 122, 255, 0.25);
            border-color: rgba(0, 122, 255, 0.5);
        }

        .reindex-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .reindex-btn .icon {
            animation: none;
        }

        .reindex-btn.reindexing .icon {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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

        .doc-description {
            font-size: 12px;
            color: var(--color-white-50);
            line-height: 1.4;
            margin-top: 6px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
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
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .empty-cta {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .empty-cta-btn {
            background: rgba(0, 122, 255, 0.2);
            border: 1px solid rgba(0, 122, 255, 0.4);
            border-radius: 10px;
            color: rgba(0, 122, 255, 0.9);
            padding: 14px 28px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .empty-cta-btn:hover {
            background: rgba(0, 122, 255, 0.3);
            border-color: rgba(0, 122, 255, 0.6);
            transform: translateY(-1px);
        }

        .empty-cta-hint {
            font-size: 12px;
            color: var(--color-white-40);
        }

        .empty-features {
            display: flex;
            gap: 32px;
            margin-top: 32px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .empty-feature {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            max-width: 140px;
        }

        .empty-feature-icon {
            width: 40px;
            height: 40px;
            background: var(--color-white-05);
            border: 1px solid var(--color-white-10);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: var(--color-white-50);
        }

        .empty-feature-text {
            font-size: 11px;
            color: var(--color-white-40);
            text-align: center;
            line-height: 1.4;
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

        /* SVG Icons */
        .icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1em;
            height: 1em;
            vertical-align: middle;
        }

        .icon svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
        }

        .icon-lg {
            width: 1.5em;
            height: 1.5em;
        }

        .icon-xl {
            width: 2em;
            height: 2em;
        }

        .icon-2xl {
            width: 3em;
            height: 3em;
        }

        .stat-icon-wrapper {
            font-size: 24px;
            color: rgba(0, 122, 255, 0.7);
        }

        .doc-icon-wrapper {
            font-size: 28px;
            min-width: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .doc-icon-wrapper.txt { color: rgba(156, 163, 175, 0.9); }
        .doc-icon-wrapper.md { color: rgba(96, 165, 250, 0.9); }
        .doc-icon-wrapper.pdf { color: rgba(239, 68, 68, 0.9); }
        .doc-icon-wrapper.docx, .doc-icon-wrapper.doc { color: rgba(59, 130, 246, 0.9); }

        .empty-icon-wrapper {
            font-size: 64px;
            color: rgba(255, 255, 255, 0.15);
            margin-bottom: 16px;
        }

        .drop-icon-wrapper {
            font-size: 48px;
            color: rgba(0, 122, 255, 0.8);
            animation: bounce 0.6s ease infinite;
        }

        /* Skeleton Loading */
        .skeleton {
            background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.05) 0%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(255, 255, 255, 0.05) 100%
            );
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s ease-in-out infinite;
            border-radius: 4px;
        }

        @keyframes skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .skeleton-document {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 10px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .skeleton-icon {
            width: 32px;
            height: 40px;
            border-radius: 4px;
        }

        .skeleton-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .skeleton-title {
            height: 16px;
            width: 60%;
            border-radius: 4px;
        }

        .skeleton-meta {
            display: flex;
            gap: 16px;
        }

        .skeleton-meta-item {
            height: 12px;
            width: 80px;
            border-radius: 4px;
        }

        .skeleton-actions {
            display: flex;
            gap: 8px;
        }

        .skeleton-btn {
            width: 36px;
            height: 32px;
            border-radius: 6px;
        }

        .skeleton-stat-card {
            background: var(--color-gray-800);
            border: 1px solid var(--color-white-10);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .skeleton-stat-icon {
            width: 24px;
            height: 24px;
            border-radius: 6px;
        }

        .skeleton-stat-label {
            width: 60px;
            height: 10px;
            border-radius: 4px;
        }

        .skeleton-stat-value {
            width: 40px;
            height: 24px;
            border-radius: 4px;
        }

        /* Phase 4: Selection & Batch Actions */
        .doc-checkbox {
            appearance: none;
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border: 2px solid var(--color-white-30);
            border-radius: 4px;
            background: transparent;
            cursor: pointer;
            transition: all 0.15s ease;
            flex-shrink: 0;
        }

        .doc-checkbox:hover {
            border-color: rgba(0, 122, 255, 0.6);
        }

        .doc-checkbox:checked {
            background: rgba(0, 122, 255, 0.8);
            border-color: rgba(0, 122, 255, 0.9);
        }

        .doc-checkbox:checked::after {
            content: '';
            display: block;
            width: 5px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg) translate(-1px, -1px);
            margin: 1px 0 0 5px;
        }

        .doc-checkbox:focus-visible {
            outline: 2px solid rgba(0, 122, 255, 0.5);
            outline-offset: 2px;
        }

        .batch-actions-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(0, 122, 255, 0.1);
            border: 1px solid rgba(0, 122, 255, 0.3);
            border-radius: 10px;
            margin-bottom: 16px;
            animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .batch-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            color: rgba(0, 122, 255, 0.9);
        }

        .batch-actions {
            display: flex;
            gap: 8px;
        }

        .batch-btn {
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 6px;
            color: white;
            padding: 6px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .batch-btn:hover {
            background: var(--color-white-15);
        }

        .batch-btn.danger {
            background: rgba(255, 59, 48, 0.15);
            border-color: rgba(255, 59, 48, 0.3);
            color: rgba(255, 59, 48, 0.9);
        }

        .batch-btn.danger:hover {
            background: rgba(255, 59, 48, 0.25);
            border-color: rgba(255, 59, 48, 0.5);
        }

        .select-all-btn {
            background: transparent;
            border: none;
            color: rgba(0, 122, 255, 0.9);
            font-size: 12px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.15s ease;
        }

        .select-all-btn:hover {
            background: rgba(0, 122, 255, 0.1);
        }

        /* Phase 4: Focus States & Accessibility */
        .document-item:focus-visible {
            outline: 2px solid rgba(0, 122, 255, 0.6);
            outline-offset: 2px;
        }

        .document-item.focused {
            background: var(--color-white-05);
            border-color: rgba(0, 122, 255, 0.4);
        }

        .document-item.selected {
            background: rgba(0, 122, 255, 0.08);
            border-color: rgba(0, 122, 255, 0.3);
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        /* Phase 4: Animations */
        .document-item {
            animation: fadeInUp 0.3s ease;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .document-list .document-item:nth-child(1) { animation-delay: 0ms; }
        .document-list .document-item:nth-child(2) { animation-delay: 30ms; }
        .document-list .document-item:nth-child(3) { animation-delay: 60ms; }
        .document-list .document-item:nth-child(4) { animation-delay: 90ms; }
        .document-list .document-item:nth-child(5) { animation-delay: 120ms; }

        .modal-overlay {
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-container {
            animation: scaleIn 0.2s ease;
        }

        @keyframes scaleIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        /* Phase 4: Responsive Design */
        @media (max-width: 768px) {
            .kb-container {
                padding: 16px;
            }

            .kb-header {
                flex-direction: column;
                gap: 12px;
                align-items: flex-start;
            }

            .kb-close-btn {
                position: absolute;
                top: 16px;
                right: 16px;
            }

            .stats-section {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .search-section {
                flex-direction: column;
            }

            .upload-btn {
                width: 100%;
                justify-content: center;
            }

            .toolbar-section {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }

            .document-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }

            .doc-actions {
                width: 100%;
                justify-content: flex-end;
            }

            .doc-meta {
                flex-direction: column;
                gap: 4px;
            }

            .pagination {
                flex-wrap: wrap;
                gap: 4px;
            }

            .pagination-btn {
                padding: 6px 10px;
                font-size: 11px;
            }

            .modal-container {
                max-height: 100vh;
                border-radius: 0;
            }

            .batch-actions-bar {
                flex-direction: column;
                gap: 12px;
                align-items: flex-start;
            }

            .batch-actions {
                width: 100%;
            }

            .batch-btn {
                flex: 1;
                justify-content: center;
            }
        }

        @media (max-width: 480px) {
            .kb-title {
                font-size: 20px;
            }

            .stat-card {
                padding: 12px;
            }

            .stat-value {
                font-size: 20px;
            }

            .filter-section {
                flex-wrap: nowrap;
                overflow-x: auto;
                padding-bottom: 8px;
            }

            .filter-btn {
                flex-shrink: 0;
            }

            .empty-features {
                flex-direction: column;
                gap: 16px;
            }
        }

        /* Keyboard shortcut hints */
        .shortcut-hint {
            font-size: 10px;
            color: var(--color-white-30);
            background: var(--color-white-05);
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
            font-family: monospace;
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
        viewerMode: { type: String, state: true },
        // Phase 4: Selection
        selectedDocuments: { type: Set, state: true },
        focusedIndex: { type: Number, state: true },
        // Phase 4 Enhancement: RAG Provider
        embeddingProvider: { type: Object, state: true },
        isReindexing: { type: Boolean, state: true }
    };

    // Validation limits
    static MAX_TITLE_LENGTH = 200;
    static MAX_DESCRIPTION_LENGTH = 1000;
    static MAX_TAGS = 20;
    static MAX_TAG_LENGTH = 50;
    static MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // SVG Icon paths (using Lucide icons style)
    static icons = {
        // Files & Documents
        file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/>',
        fileText: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
        fileCode: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
        filePdf: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M10 12v5"/><path d="M8 15h4"/><circle cx="14" cy="15" r="2"/>',
        fileDoc: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
        files: '<path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
        // Actions
        upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        trash: '<polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
        edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
        eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        check: '<polyline points="20,6 9,17 4,12"/>',
        // UI Elements
        search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
        database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
        hardDrive: '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
        tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
        clock: '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>',
        loader: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
        book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
        // Phase 4: Additional icons
        checkSquare: '<polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
        square: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>',
        xCircle: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        chevronUp: '<polyline points="18,15 12,9 6,15"/>',
        chevronDown: '<polyline points="6,9 12,15 18,9"/>',
        // Phase 4 Enhancement: RAG Provider icons
        cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
        sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
        refreshCw: '<polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    };

    // Render SVG icon
    _icon(name, className = '') {
        const path = KnowledgeBaseView.icons[name];
        if (!path) return '';
        return html`<span class="icon ${className}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${this._unsafeHTML(path)}</svg></span>`;
    }

    // Helper to render unsafe HTML for SVG paths
    _unsafeHTML(str) {
        const template = document.createElement('template');
        template.innerHTML = str;
        return template.content;
    }

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
        // Phase 4: Selection
        this.selectedDocuments = new Set();
        this.focusedIndex = -1;
        // Phase 4 Enhancement: RAG Provider
        this.embeddingProvider = null;
        this.isReindexing = false;
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
        this.loadProviderInfo();
        // Keyboard shortcuts
        this._handleKeyDown = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._handleKeyDown);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._handleKeyDown);
    }

    _handleKeyDown(e) {
        // Escape to close modals or clear selection
        if (e.key === 'Escape') {
            if (this.viewerOpen) {
                this.closeViewer();
            } else if (this.editorOpen) {
                this.closeEditor();
            } else if (this.selectedDocuments.size > 0) {
                this.clearSelection();
            }
            return;
        }

        // Ctrl+S to save in editor
        if (e.key === 's' && (e.ctrlKey || e.metaKey) && this.editorOpen) {
            e.preventDefault();
            this.saveDocumentEdits();
            return;
        }

        // Skip if in modal or typing in input
        if (this.viewerOpen || this.editorOpen) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // "/" to focus search
        if (e.key === '/') {
            e.preventDefault();
            const searchInput = this.shadowRoot.querySelector('.search-input');
            searchInput?.focus();
            return;
        }

        // Ctrl+A to select all
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.selectAll();
            return;
        }

        // Delete key to delete selected
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedDocuments.size > 0) {
            e.preventDefault();
            this.handleBatchDelete();
            return;
        }

        // Arrow navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const maxIndex = this.paginatedDocuments.length - 1;
            if (e.key === 'ArrowDown') {
                this.focusedIndex = Math.min(this.focusedIndex + 1, maxIndex);
            } else {
                this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
            }
            // Scroll focused item into view
            this._scrollToFocusedItem();
            return;
        }

        // Space to toggle selection of focused item
        if (e.key === ' ' && this.focusedIndex >= 0) {
            e.preventDefault();
            const doc = this.paginatedDocuments[this.focusedIndex];
            if (doc) {
                this.toggleDocumentSelection(doc.id);
            }
            return;
        }

        // Enter to view focused item
        if (e.key === 'Enter' && this.focusedIndex >= 0) {
            e.preventDefault();
            const doc = this.paginatedDocuments[this.focusedIndex];
            if (doc) {
                this.handleViewDocument(doc.id);
            }
            return;
        }
    }

    _scrollToFocusedItem() {
        requestAnimationFrame(() => {
            const items = this.shadowRoot.querySelectorAll('.document-item');
            const focusedItem = items[this.focusedIndex];
            focusedItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
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

    async loadProviderInfo() {
        try {
            const result = await window.api.invoke('rag:get-provider-info');
            if (result) {
                this.embeddingProvider = result;
                console.log('[KnowledgeBaseView] Provider info loaded:', result);
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error loading provider info:', error);
            this.embeddingProvider = {
                name: 'error',
                displayName: 'Erreur',
                quality: 'none',
                isConfigured: false
            };
        }
    }

    async handleReindexAll() {
        if (this.isReindexing) return;

        // Show confirmation
        const confirmed = confirm(
            'Réindexer tous les documents ?\n\n' +
            'Cette opération peut prendre plusieurs minutes selon le nombre de documents.\n' +
            'Les embeddings seront régénérés avec le provider actuel.'
        );

        if (!confirmed) return;

        this.isReindexing = true;

        try {
            const result = await window.api.invoke('rag:reindex-all');

            if (result.success) {
                this._showToast(result.message, 'success');
                // Reload stats and documents
                await this.loadStats();
                await this.loadDocuments();
            } else {
                this._showToast(`Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Error reindexing:', error);
            this._showToast(`Erreur lors de la réindexation: ${error.message}`, 'error');
        } finally {
            this.isReindexing = false;
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
        const iconMap = {
            'txt': 'fileText',
            'md': 'fileCode',
            'pdf': 'file',
            'docx': 'fileDoc',
            'doc': 'fileDoc'
        };
        const iconName = iconMap[fileType] || 'file';
        return html`<span class="doc-icon-wrapper ${fileType || ''}">${this._icon(iconName, 'icon-xl')}</span>`;
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

    // Phase 4: Selection methods
    toggleDocumentSelection(docId) {
        const newSelection = new Set(this.selectedDocuments);
        if (newSelection.has(docId)) {
            newSelection.delete(docId);
        } else {
            newSelection.add(docId);
        }
        this.selectedDocuments = newSelection;
    }

    selectAll() {
        if (this.selectedDocuments.size === this.paginatedDocuments.length) {
            // If all selected, deselect all
            this.selectedDocuments = new Set();
        } else {
            // Select all paginated documents
            this.selectedDocuments = new Set(this.paginatedDocuments.map(doc => doc.id));
        }
    }

    clearSelection() {
        this.selectedDocuments = new Set();
        this.focusedIndex = -1;
    }

    isDocumentSelected(docId) {
        return this.selectedDocuments.has(docId);
    }

    async handleBatchDelete() {
        const count = this.selectedDocuments.size;
        if (count === 0) return;

        const confirmed = await window.showConfirm?.(
            `Supprimer ${count} document${count > 1 ? 's' : ''} ?`,
            'Cette action est irréversible. Les documents et leurs données d\'indexation seront supprimés.',
            { confirmText: 'Supprimer', cancelText: 'Annuler', type: 'danger' }
        );

        if (!confirmed) return;

        try {
            const idsToDelete = Array.from(this.selectedDocuments);
            let successCount = 0;
            let errorCount = 0;

            for (const docId of idsToDelete) {
                try {
                    await window.api.documents.deleteDocument(docId);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to delete document ${docId}:`, err);
                    errorCount++;
                }
            }

            // Clear selection
            this.clearSelection();

            // Reload documents
            await this.loadDocuments();
            await this.loadStats();

            // Show result
            if (errorCount === 0) {
                window.showToast?.(`${successCount} document${successCount > 1 ? 's' : ''} supprimé${successCount > 1 ? 's' : ''}`, 'success');
            } else {
                window.showToast?.(`${successCount} supprimé${successCount > 1 ? 's' : ''}, ${errorCount} échec${errorCount > 1 ? 's' : ''}`, 'warning');
            }
        } catch (error) {
            console.error('[KnowledgeBaseView] Batch delete error:', error);
            window.showToast?.(`Erreur lors de la suppression : ${error.message}`, 'error');
        }
    }

    _renderSkeletonStats() {
        return html`
            <div class="stats-section">
                ${[1, 2, 3].map(() => html`
                    <div class="skeleton-stat-card">
                        <div class="skeleton skeleton-stat-icon"></div>
                        <div class="skeleton skeleton-stat-label"></div>
                        <div class="skeleton skeleton-stat-value"></div>
                    </div>
                `)}
            </div>
        `;
    }

    _renderSkeletonDocuments(count = 5) {
        return html`
            <div class="document-list">
                ${Array(count).fill(0).map(() => html`
                    <div class="skeleton-document">
                        <div class="skeleton skeleton-icon"></div>
                        <div class="skeleton-content">
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton-meta">
                                <div class="skeleton skeleton-meta-item"></div>
                                <div class="skeleton skeleton-meta-item"></div>
                                <div class="skeleton skeleton-meta-item"></div>
                            </div>
                        </div>
                        <div class="skeleton-actions">
                            <div class="skeleton skeleton-btn"></div>
                            <div class="skeleton skeleton-btn"></div>
                            <div class="skeleton skeleton-btn"></div>
                        </div>
                    </div>
                `)}
            </div>
        `;
    }

    render() {
        return html`
            <toast-notification></toast-notification>
            <div class="kb-container"
                role="main"
                aria-label="Gestion de la base de connaissances"
                @dragenter=${this._handleDragEnter}
                @dragleave=${this._handleDragLeave}
                @dragover=${this._handleDragOver}
                @drop=${this._handleDrop}
            >
                <!-- Screen reader announcements -->
                <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    ${this.selectedDocuments.size > 0
                        ? `${this.selectedDocuments.size} document${this.selectedDocuments.size > 1 ? 's' : ''} sélectionné${this.selectedDocuments.size > 1 ? 's' : ''}`
                        : ''}
                </div>

                <!-- Header -->
                <header class="kb-header">
                    <div class="kb-header-content">
                        <h1 class="kb-title">${this._icon('book', 'icon-lg')} Base de Connaissances</h1>
                        <p class="kb-subtitle">Gérez vos documents pour enrichir les réponses de l'IA</p>
                    </div>
                    <button
                        class="kb-close-btn"
                        @click=${this.handleClose}
                        title="Fermer (Échap)"
                        aria-label="Fermer la fenêtre"
                    >
                        ${this._icon('x')}
                    </button>
                </header>

                <!-- Stats -->
                <div class="stats-section">
                    <div class="stat-card">
                        <span class="stat-icon-wrapper">${this._icon('files', 'icon-lg')}</span>
                        <div class="stat-label">Documents</div>
                        <div class="stat-value">${this.stats.totalDocuments || 0}</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon-wrapper">${this._icon('hardDrive', 'icon-lg')}</span>
                        <div class="stat-label">Taille totale</div>
                        <div class="stat-value">${this.formatSize(this.stats.totalSize)}</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-icon-wrapper">${this._icon('search', 'icon-lg')}</span>
                        <div class="stat-label">Indexés</div>
                        <div class="stat-value">${this.stats.indexed || 0}</div>
                    </div>
                    <div class="stat-card provider">
                        <span class="stat-icon-wrapper">${this._icon(this.embeddingProvider?.quality === 'high' ? 'sparkles' : 'cpu', 'icon-lg')}</span>
                        <div class="stat-label">Embeddings</div>
                        <div class="stat-value">
                            <span class="provider-badge ${this.embeddingProvider?.quality || 'none'}">
                                ${this.embeddingProvider?.displayName || 'Chargement...'}
                            </span>
                        </div>
                        ${this.embeddingProvider?.warning ? html`
                            <div class="provider-warning">
                                ${this._icon('alertTriangle')}
                                <span>${this.embeddingProvider.warning}</span>
                            </div>
                        ` : ''}
                        ${this.stats.totalDocuments > 0 ? html`
                            <button
                                class="reindex-btn ${this.isReindexing ? 'reindexing' : ''}"
                                @click=${this.handleReindexAll}
                                ?disabled=${this.isReindexing}
                                title="Régénérer tous les embeddings avec le provider actuel"
                            >
                                ${this._icon('refreshCw')}
                                ${this.isReindexing ? 'Réindexation...' : 'Réindexer tout'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="search-section" role="search">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Rechercher dans vos documents... (appuyez / pour focus)"
                        aria-label="Rechercher dans les documents"
                        @input=${this.handleSearch}
                        .value=${this.searchQuery}
                    />
                    <button
                        class="upload-btn"
                        @click=${this.handleUpload}
                        ?disabled=${this.uploading}
                        aria-label="Ajouter un nouveau document"
                    >
                        ${this.uploading
                            ? html`${this._icon('loader')} Upload en cours...`
                            : html`${this._icon('upload')} Ajouter un Document`}
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

                <!-- Batch Actions Bar -->
                ${this.selectedDocuments.size > 0 ? html`
                    <div class="batch-actions-bar" role="toolbar" aria-label="Actions sur les documents sélectionnés">
                        <div class="batch-info">
                            <span>${this._icon('checkSquare')} ${this.selectedDocuments.size} sélectionné${this.selectedDocuments.size > 1 ? 's' : ''}</span>
                            <button class="select-all-btn" @click=${this.selectAll}>
                                ${this.selectedDocuments.size === this.paginatedDocuments.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                            </button>
                        </div>
                        <div class="batch-actions">
                            <button
                                class="batch-btn danger"
                                @click=${this.handleBatchDelete}
                                aria-label="Supprimer les documents sélectionnés"
                            >
                                ${this._icon('trash')} Supprimer
                                <span class="shortcut-hint">Suppr</span>
                            </button>
                            <button
                                class="batch-btn"
                                @click=${this.clearSelection}
                                aria-label="Annuler la sélection"
                            >
                                ${this._icon('xCircle')} Annuler
                                <span class="shortcut-hint">Échap</span>
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- Document List -->
                <div
                    class="document-list-container drop-zone ${this.isDragOver ? 'drag-over' : ''}"
                    role="region"
                    aria-label="Liste des documents"
                >
                    ${this.isDragOver ? html`
                        <div class="drop-overlay" role="presentation">
                            <span class="drop-icon-wrapper">${this._icon('download', 'icon-2xl')}</span>
                            <span class="drop-overlay-text">Déposez votre fichier ici</span>
                        </div>
                    ` : ''}
                    ${this.isLoading
                        ? this._renderSkeletonDocuments(5)
                    : this.filteredDocuments.length === 0 ? html`
                        <div class="empty-state">
                            <div class="empty-icon-wrapper">${this._icon('files', 'icon-2xl')}</div>
                            <h2 class="empty-title">
                                ${this.searchQuery ? 'Aucun résultat' : 'Aucun document'}
                            </h2>
                            <p class="empty-message">
                                ${this.searchQuery
                                    ? 'Aucun document ne correspond à votre recherche. Essayez d\'autres mots-clés.'
                                    : 'Ajoutez des documents pour enrichir les réponses de l\'IA avec vos propres données.'}
                            </p>
                            ${!this.searchQuery ? html`
                                <div class="empty-cta">
                                    <button class="empty-cta-btn" @click=${this.handleUpload}>
                                        ${this._icon('upload')} Ajouter un document
                                    </button>
                                    <span class="empty-cta-hint">ou glissez-déposez un fichier ici</span>
                                </div>
                                <div class="empty-features">
                                    <div class="empty-feature">
                                        <div class="empty-feature-icon">${this._icon('fileText')}</div>
                                        <span class="empty-feature-text">TXT, MD, PDF, DOCX</span>
                                    </div>
                                    <div class="empty-feature">
                                        <div class="empty-feature-icon">${this._icon('search')}</div>
                                        <span class="empty-feature-text">Recherche sémantique</span>
                                    </div>
                                    <div class="empty-feature">
                                        <div class="empty-feature-icon">${this._icon('tag')}</div>
                                        <span class="empty-feature-text">Organisation par tags</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : html`
                        <div class="document-list" role="list" aria-label="Documents">
                            ${this.paginatedDocuments.map((doc, index) => html`
                                <div
                                    class="document-item ${this.isDocumentSelected(doc.id) ? 'selected' : ''} ${this.focusedIndex === index ? 'focused' : ''}"
                                    role="listitem"
                                    tabindex="0"
                                    aria-selected="${this.isDocumentSelected(doc.id)}"
                                    @click=${(e) => {
                                        if (e.target.type !== 'checkbox') {
                                            this.focusedIndex = index;
                                        }
                                    }}
                                    @dblclick=${() => this.handleViewDocument(doc.id)}
                                >
                                    <input
                                        type="checkbox"
                                        class="doc-checkbox"
                                        .checked=${this.isDocumentSelected(doc.id)}
                                        @change=${() => this.toggleDocumentSelection(doc.id)}
                                        @click=${(e) => e.stopPropagation()}
                                        aria-label="Sélectionner ${doc.title || doc.filename}"
                                    />
                                    ${this.getFileIcon(doc.file_type)}
                                    <div class="doc-info">
                                        <h3 class="doc-title">${doc.title || doc.filename}</h3>
                                        ${doc.description ? html`
                                            <p class="doc-description">${doc.description}</p>
                                        ` : ''}
                                        <div class="doc-meta">
                                            <span class="doc-meta-item">
                                                ${this._icon('folder')} ${doc.filename}
                                            </span>
                                            <span class="doc-meta-item">
                                                ${this._icon('hardDrive')} ${this.formatSize(doc.file_size)}
                                            </span>
                                            <span class="doc-meta-item">
                                                ${this._icon('calendar')} ${this.formatDate(doc.created_at)}
                                            </span>
                                            ${doc.chunk_count ? html`
                                                <span class="doc-meta-item">
                                                    ${this._icon('hash')} ${doc.chunk_count} chunks
                                                </span>
                                            ` : ''}
                                            ${doc.indexed ? html`
                                                <span class="doc-meta-item" style="color: rgba(52,199,89,0.9);">
                                                    ${this._icon('check')} Indexé
                                                </span>
                                            ` : ''}
                                        </div>
                                        ${doc.tags && doc.tags.length > 0 ? html`
                                            <div class="doc-tags" role="list" aria-label="Tags">
                                                ${doc.tags.map(tag => html`
                                                    <span class="tag" role="listitem">${tag}</span>
                                                `)}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="doc-actions" role="group" aria-label="Actions">
                                        <button
                                            class="doc-action-btn"
                                            @click=${(e) => { e.stopPropagation(); this.handleViewDocument(doc.id); }}
                                            title="Voir le document (Entrée)"
                                            aria-label="Voir ${doc.title || doc.filename}"
                                        >
                                            ${this._icon('eye')}
                                        </button>
                                        <button
                                            class="doc-action-btn"
                                            @click=${(e) => { e.stopPropagation(); this.handleEditDocument(doc.id); }}
                                            title="Éditer les métadonnées"
                                            aria-label="Modifier ${doc.title || doc.filename}"
                                        >
                                            ${this._icon('edit')}
                                        </button>
                                        <button
                                            class="doc-action-btn danger"
                                            @click=${(e) => { e.stopPropagation(); this.handleDeleteDocument(doc.id, doc.title || doc.filename); }}
                                            title="Supprimer"
                                            aria-label="Supprimer ${doc.title || doc.filename}"
                                        >
                                            ${this._icon('trash')}
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
                <div
                    class="modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="viewer-modal-title"
                    @click=${(e) => e.target === e.currentTarget && this.closeViewer()}
                >
                    <div class="modal-container" role="document">
                        <div class="modal-header">
                            <h2 class="modal-title" id="viewer-modal-title">
                                ${this._icon('file', 'icon-lg')}
                                ${this.selectedDocument?.title || this.selectedDocument?.filename || 'Document'}
                            </h2>
                            <button class="modal-close-btn" @click=${this.closeViewer} aria-label="Fermer">${this._icon('x')} Fermer</button>
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
                <div
                    class="modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="editor-modal-title"
                    @click=${(e) => e.target === e.currentTarget && this.closeEditor()}
                >
                    <div class="modal-container">
                        <div class="modal-header">
                            <h2 class="modal-title" id="editor-modal-title">
                                ${this._icon('edit', 'icon-lg')} Modifier le document
                            </h2>
                            <button class="modal-close-btn" @click=${this.closeEditor} aria-label="Annuler">${this._icon('x')} Annuler</button>
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
