import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import './ParticipantModal.js';
import './EmailPreviewModal.js';

/**
 * Post-Meeting Panel Component
 * Affiche les notes de réunion, les tâches et les options d'export
 * Visible uniquement après avoir cliqué "Terminé" dans le mode écoute
 */
export class PostMeetingPanel extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family-primary);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: white;
        }

        /* Phase 3: Glassmorphism Panel Container */
        .panel-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(20, 20, 30, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow:
                0 8px 32px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            z-index: 1000;
        }

        .panel-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.15) 50%,
                transparent 100%);
            z-index: 1;
        }

        /* Phase 3: Glassmorphism Header */
        .panel-header {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.02);
        }

        .panel-title {
            font-size: 14px;
            font-weight: 600;
            color: white;
            margin: 0;
            letter-spacing: 0.3px;
        }

        .close-button {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            padding: 6px 8px;
            font-size: 14px;
            line-height: 1;
            transition: all 0.2s ease;
        }

        .close-button:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            transform: scale(1.05);
        }

        /* Phase 3: Glassmorphism Tabs */
        .tabs {
            display: flex;
            padding: 8px 12px;
            gap: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(0, 0, 0, 0.2);
        }

        .tab {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            padding: 10px 16px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 8px;
            position: relative;
        }

        .tab:hover {
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.05);
        }

        .tab.active {
            color: white;
            background: rgba(102, 126, 234, 0.2);
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.15);
        }

        .tab.active::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 2px;
        }

        /* Phase 3: Glassmorphism Content */
        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            background: rgba(0, 0, 0, 0.1);
        }

        .panel-content::-webkit-scrollbar {
            width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 3px;
        }

        .panel-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
        }

        .panel-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25);
        }

        /* Phase 3: Glass Empty State */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            text-align: center;
            padding: 32px;
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.4;
        }

        /* Phase 3: Glass Loading State */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
        }

        .spinner {
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top-color: #667eea;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 0.8s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Phase 3: Glassmorphism Summary Section */
        .summary-section {
            margin-bottom: 20px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .section-title {
            font-size: 13px;
            font-weight: 600;
            color: white;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            letter-spacing: 0.3px;
        }

        .summary-text {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 12px 14px;
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.9);
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            font-size: 10px;
            color: var(--color-white-60);
        }

        .info-label {
            font-weight: 500;
        }

        /* Phase 3: Glassmorphism List Styles */
        .item-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .list-item {
            background: rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 8px;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .list-item:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .item-title {
            font-weight: 500;
            color: white;
            margin-bottom: 6px;
        }

        .item-meta {
            display: flex;
            gap: 14px;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 6px;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        /* Tasks */
        .task-item {
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }

        .task-checkbox {
            margin-top: 2px;
            cursor: pointer;
        }

        .task-content {
            flex: 1;
        }

        .task-description {
            font-weight: 400;
            color: white;
            margin-bottom: 4px;
        }

        .task-completed .task-description {
            text-decoration: line-through;
            opacity: 0.6;
        }

        .priority-high {
            color: var(--color-error-400);
        }

        .priority-medium {
            color: var(--color-warning-400);
        }

        .priority-low {
            color: var(--color-white-60);
        }

        /* Phase 4: Quality Score Badge */
        .quality-score {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .quality-score.excellent {
            background: color-mix(in srgb, var(--color-success-500) 20%, transparent);
            color: var(--color-success-400);
            border: 1px solid var(--color-success-500);
        }

        .quality-score.good {
            background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
            color: var(--color-primary-400);
            border: 1px solid var(--color-primary-500);
        }

        .quality-score.fair {
            background: color-mix(in srgb, var(--color-warning-500) 20%, transparent);
            color: var(--color-warning-400);
            border: 1px solid var(--color-warning-500);
        }

        .quality-score.poor {
            background: color-mix(in srgb, var(--color-error-500) 20%, transparent);
            color: var(--color-error-400);
            border: 1px solid var(--color-error-500);
        }

        /* Phase 4: Meeting Type Badge */
        .meeting-type-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            background: var(--color-white-10);
            color: var(--color-white-80);
            border: 1px solid var(--color-white-20);
        }

        /* Phase 4: Severity Badges for Risks */
        .severity-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .severity-badge.high {
            background: color-mix(in srgb, var(--color-error-500) 20%, transparent);
            color: var(--color-error-400);
        }

        .severity-badge.medium {
            background: color-mix(in srgb, var(--color-warning-500) 20%, transparent);
            color: var(--color-warning-400);
        }

        .severity-badge.low {
            background: color-mix(in srgb, var(--color-success-500) 20%, transparent);
            color: var(--color-success-400);
        }

        /* Phase 4: Enhanced Action Item Card */
        .action-item-card {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
        }

        .action-item-card.priority-high {
            border-left: 3px solid var(--color-error-400);
        }

        .action-item-card.priority-medium {
            border-left: 3px solid var(--color-warning-400);
        }

        .action-item-card.priority-low {
            border-left: 3px solid var(--color-success-400);
        }

        .action-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
        }

        .action-details {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            font-size: 10px;
            color: var(--color-white-60);
        }

        .action-detail {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Phase 4: Risk Card */
        .risk-card {
            background: var(--color-black-20);
            border: 1px solid var(--color-white-10);
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 8px;
        }

        .risk-card.severity-high {
            border-left: 3px solid var(--color-error-400);
            background: color-mix(in srgb, var(--color-error-500) 5%, var(--color-black-20));
        }

        .risk-card.severity-medium {
            border-left: 3px solid var(--color-warning-400);
        }

        .risk-card.severity-low {
            border-left: 3px solid var(--color-success-400);
        }

        /* Phase 3: Glassmorphism Export Section */
        .export-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .export-button {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: white;
            padding: 16px 12px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }

        .export-button:hover {
            background: rgba(102, 126, 234, 0.15);
            border-color: rgba(102, 126, 234, 0.3);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
        }

        .export-button:active {
            transform: translateY(-1px);
        }

        .export-icon {
            font-size: 24px;
        }

        .export-label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
        }

        /* IMP-U6: Save As Section Styles */
        .save-as-section {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--color-white-10);
        }

        .save-as-select {
            flex: 1;
            background: var(--color-white-08);
            border: 1px solid var(--color-white-20);
            border-radius: 4px;
            color: white;
            padding: 8px 12px;
            font-size: 11px;
            cursor: pointer;
        }

        .save-as-select:focus {
            outline: none;
            border-color: var(--color-primary-500);
        }

        .save-as-select option {
            background: var(--color-gray-800);
            color: white;
        }

        .save-as-btn {
            background: var(--color-primary-500);
            border: none;
            border-radius: 4px;
            color: white;
            padding: 8px 16px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .save-as-btn:hover {
            background: var(--color-primary-400);
        }

        .save-as-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Success/Error Messages - P3-4: Enhanced with animations */
        .message {
            padding: 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-bottom: 12px;
            animation: slideIn 0.3s ease-out;
        }

        .message.success {
            background: color-mix(in srgb, var(--color-success-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-success-500) 30%, transparent);
            color: var(--color-success-400);
            animation: slideIn 0.3s ease-out, pulse 0.5s ease-out 0.3s;
        }

        .message.error {
            background: color-mix(in srgb, var(--color-error-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--color-error-500) 30%, transparent);
            color: var(--color-error-400);
            animation: slideIn 0.3s ease-out, shake 0.4s ease-out 0.3s;
        }

        /* FIX-U2: Message with action buttons */
        .message-with-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .message-text {
            flex: 1;
        }

        /* IMP-U3: Full path display in success message */
        .message-path {
            font-size: 10px;
            color: var(--color-white-60);
            word-break: break-all;
            margin-top: 4px;
            cursor: pointer;
        }

        .message-path:hover {
            color: var(--color-white-80);
            text-decoration: underline;
        }

        .message-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .open-folder-btn {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.4);
            color: rgba(34, 197, 94, 0.9);
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }

        .open-folder-btn:hover {
            background: rgba(34, 197, 94, 0.3);
            border-color: rgba(34, 197, 94, 0.6);
        }

        .dismiss-btn {
            background: transparent;
            border: none;
            color: var(--color-white-40);
            font-size: 14px;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
            line-height: 1;
        }

        .dismiss-btn:hover {
            color: var(--color-white-70);
            background: rgba(255, 255, 255, 0.1);
        }

        /* P3-4: Animation keyframes */
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }

        /* Phase 3: Glassmorphism Generate Button */
        .generate-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 12px;
            color: white;
            padding: 14px 24px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            letter-spacing: 0.3px;
        }

        .generate-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .generate-button:active {
            transform: translateY(0);
        }

        .generate-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        /* Phase 3: Glassmorphism Session Selector */
        .session-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .session-selector label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            white-space: nowrap;
        }

        .session-dropdown {
            flex: 1;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: white;
            padding: 8px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .session-dropdown:hover {
            border-color: rgba(255, 255, 255, 0.2);
            background: rgba(0, 0, 0, 0.4);
        }

        .session-dropdown:focus {
            outline: none;
            border-color: rgba(102, 126, 234, 0.5);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        /* Phase 2.2: Progress Indicator */
        .progress-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
        }

        .progress-steps {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .progress-step {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-white-20);
            transition: all 0.3s ease;
        }

        .progress-step.active {
            background: var(--color-primary-500);
            transform: scale(1.2);
        }

        .progress-step.completed {
            background: var(--color-success-500);
        }

        .progress-message {
            font-size: 12px;
            color: var(--color-white-80);
            text-align: center;
            margin-top: 8px;
        }

        .progress-spinner {
            border: 3px solid var(--color-white-20);
            border-top-color: var(--color-primary-500);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        /* Phase 2.3: Error State with Retry */
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
            text-align: center;
        }

        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .error-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-error-400);
            margin-bottom: 8px;
        }

        .error-message {
            font-size: 11px;
            color: var(--color-white-60);
            margin-bottom: 16px;
            max-width: 280px;
        }

        .retry-button {
            background: var(--color-primary-500);
            border: none;
            border-radius: 4px;
            color: white;
            padding: 8px 20px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .retry-button:hover {
            background: var(--color-primary-600);
        }

        /* Phase 3: Glassmorphism Edit Mode */
        .edit-toolbar {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-bottom: 16px;
        }

        .edit-button {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: white;
            padding: 8px 14px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }

        .edit-button:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
        }

        .edit-button.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-color: transparent;
        }

        .edit-button.primary:hover {
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .editable-field {
            position: relative;
        }

        .editable-field.editing .summary-text {
            border-color: rgba(102, 126, 234, 0.5);
            background: rgba(0, 0, 0, 0.3);
        }

        .edit-textarea {
            width: 100%;
            min-height: 100px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(102, 126, 234, 0.4);
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 12px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.9);
            resize: vertical;
            font-family: inherit;
            transition: all 0.2s ease;
        }

        .edit-textarea:focus {
            outline: none;
            border-color: rgba(102, 126, 234, 0.7);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .char-count {
            position: absolute;
            bottom: 4px;
            right: 8px;
            font-size: 9px;
            color: var(--color-white-40);
        }

        /* Phase 4: Search Bar Styles */
        .search-container {
            position: relative;
            margin-bottom: 16px;
        }

        .search-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 12px 40px 12px 14px;
            font-size: 12px;
            color: white;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }

        .search-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .search-input:focus {
            outline: none;
            border-color: rgba(102, 126, 234, 0.5);
            background: rgba(0, 0, 0, 0.4);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-icon {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 14px;
            color: rgba(255, 255, 255, 0.4);
            pointer-events: none;
        }

        .search-clear {
            position: absolute;
            right: 38px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .search-clear:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .search-results-count {
            position: absolute;
            right: 60px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 10px;
            color: rgba(102, 126, 234, 0.8);
            background: rgba(102, 126, 234, 0.15);
            padding: 2px 8px;
            border-radius: 10px;
        }

        /* Phase 4: Highlight Search Matches */
        .search-highlight {
            background: rgba(102, 126, 234, 0.4);
            color: white;
            padding: 1px 2px;
            border-radius: 2px;
        }

        /* Phase 4: Copy Section Button */
        .copy-section-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 6px;
            color: rgba(255, 255, 255, 0.7);
            padding: 4px 10px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .copy-section-btn:hover {
            background: rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.3);
            color: white;
        }

        .copy-section-btn.copied {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.3);
            color: rgba(34, 197, 94, 0.9);
        }

        /* Phase 4: No Results State */
        .no-search-results {
            text-align: center;
            padding: 32px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
        }

        .no-search-results .icon {
            font-size: 32px;
            margin-bottom: 12px;
            opacity: 0.5;
        }
    `;

    static properties = {
        sessionId: { type: String },
        activeTab: { type: String },
        meetingNotes: { type: Object },
        tasks: { type: Array },
        isLoading: { type: Boolean },
        isGenerating: { type: Boolean },
        message: { type: Object }, // { type: 'success' | 'error', text: string }
        showParticipantModal: { type: Boolean },
        showEmailModal: { type: Boolean },
        currentEmailData: { type: Object },
        isGeneratingEmail: { type: Boolean },
        suggestions: { type: Array },
        isLoadingSuggestions: { type: Boolean },
        // Phase 2 UX Improvements
        allSessions: { type: Array },        // Phase 2.1: Session history
        generationProgress: { type: Object }, // Phase 2.2: Progress indicator { step, total, message }
        lastError: { type: Object },          // Phase 2.3: Error with retry capability
        isEditing: { type: Boolean },         // Phase 2.4: Edit mode
        editedFields: { type: Object },       // Phase 2.4: Fields being edited
        // Sprint 3 improvements
        exportingFormat: { type: String },    // P3-1: Track which format is currently exporting
        // FIX-U2: Track last export for "Open folder" button
        lastExportPath: { type: String },
        lastExportFormat: { type: String },
        showOpenFolderButton: { type: Boolean },
        // Phase 5: Transcript tab
        transcripts: { type: Array },         // Full transcript entries
        isLoadingTranscripts: { type: Boolean },
        // Phase 4: Search functionality
        transcriptSearchQuery: { type: String },   // Search query for transcripts
        overviewSearchQuery: { type: String },     // Search query for overview
        searchResultsCount: { type: Number },      // Number of search matches
    };

    constructor() {
        super();
        this.sessionId = null;
        this.activeTab = 'overview'; // Changed from 'summary' to 'overview'
        this.meetingNotes = null;
        this.tasks = [];
        this.isLoading = false;
        this.isGenerating = false;
        this.message = null;
        this.showParticipantModal = false;
        this.showEmailModal = false;
        this.currentEmailData = null;
        this.isGeneratingEmail = false;
        this.suggestions = [];
        this.isLoadingSuggestions = false;

        // Phase 2 UX Improvements
        this.allSessions = [];              // Phase 2.1: All sessions with notes
        this.generationProgress = null;     // Phase 2.2: { step: 1, total: 4, message: 'Étape...' }
        this.lastError = null;              // Phase 2.3: { message, canRetry, retryAction }
        this.isEditing = false;             // Phase 2.4: Edit mode toggle
        this.editedFields = {};             // Phase 2.4: Edited field values

        // Sprint 3 improvements
        this.exportingFormat = null;        // P3-1: null or 'markdown'/'pdf'/etc.

        // FIX-U2: Export tracking for "Open folder" button
        this.lastExportPath = null;
        this.lastExportFormat = null;
        this.showOpenFolderButton = false;

        // Phase 5: Transcript tab
        this.transcripts = [];
        this.isLoadingTranscripts = false;

        // Phase 4: Search functionality
        this.transcriptSearchQuery = '';
        this.overviewSearchQuery = '';
        this.searchResultsCount = 0;

        // P3-2: Bind keyboard handler for cleanup
        this._handleKeyDown = this._handleKeyDown.bind(this);

        // FIX MEDIUM: Store callback references for cleanup
        this._ipcCallbacks = {
            onSetSession: null,
            onNotesGenerated: null,
            onExportComplete: null,
            onError: null,
            onProgress: null  // P1-4: Real progress updates via IPC
        };

        // Setup IPC listeners
        this._setupListeners();
    }

    connectedCallback() {
        super.connectedCallback();
        // Phase 2.1: Load all sessions with notes for history navigation
        this.loadAllSessions();

        // Load meeting notes if sessionId is provided
        if (this.sessionId) {
            this.loadMeetingNotes();
        }

        // P3-2: Add keyboard shortcuts listener
        document.addEventListener('keydown', this._handleKeyDown);
    }

    /**
     * P3-2: Handle keyboard shortcuts
     * - Escape: Close panel (with unsaved changes check)
     * - Ctrl/Cmd+S: Save when editing
     * - Ctrl/Cmd+Enter: Save when editing
     * - Ctrl/Cmd+F: Focus search (Phase 4)
     */
    _handleKeyDown(event) {
        // Escape to close
        if (event.key === 'Escape') {
            // If searching, clear search first
            if (this.transcriptSearchQuery && this.activeTab === 'transcript') {
                event.preventDefault();
                this.transcriptSearchQuery = '';
                return;
            }
            event.preventDefault();
            this.handleClose();
            return;
        }

        // Ctrl/Cmd+F to focus search (Phase 4)
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            // Switch to transcript tab and focus search
            if (this.activeTab !== 'transcript') {
                this.activeTab = 'transcript';
                this.loadTranscripts();
            }
            // Focus search input after render
            setTimeout(() => {
                const searchInput = this.shadowRoot?.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }, 100);
            return;
        }

        // Ctrl/Cmd+S or Ctrl/Cmd+Enter to save when editing
        if (this.isEditing && (event.ctrlKey || event.metaKey)) {
            if (event.key === 's' || event.key === 'Enter') {
                event.preventDefault();
                this.handleSaveEdits();
                return;
            }
        }
    }

    /**
     * FIX MEDIUM: Clean up IPC listeners to prevent memory leaks
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // P3-2: Remove keyboard shortcuts listener
        document.removeEventListener('keydown', this._handleKeyDown);
        this._cleanupListeners();
    }

    _cleanupListeners() {
        // Remove all IPC listeners to prevent memory leaks
        if (window.api?.postMeeting) {
            if (this._ipcCallbacks.onSetSession) {
                window.api.postMeeting.removeOnSetSession?.(this._ipcCallbacks.onSetSession);
            }
            if (this._ipcCallbacks.onNotesGenerated) {
                window.api.postMeeting.removeOnNotesGenerated?.(this._ipcCallbacks.onNotesGenerated);
            }
            if (this._ipcCallbacks.onExportComplete) {
                window.api.postMeeting.removeOnExportComplete?.(this._ipcCallbacks.onExportComplete);
            }
            if (this._ipcCallbacks.onError) {
                window.api.postMeeting.removeOnError?.(this._ipcCallbacks.onError);
            }
            // P1-4: Cleanup progress listener
            if (this._ipcCallbacks.onProgress) {
                window.api.postMeeting.removeOnProgress?.(this._ipcCallbacks.onProgress);
            }
        }
        console.log('[PostMeetingPanel] IPC listeners cleaned up');
    }

    _setupListeners() {
        // FIX MEDIUM: Store callback references for proper cleanup
        // Listen for session ID from main process (when window opens)
        this._ipcCallbacks.onSetSession = (sessionId) => {
            console.log('[PostMeetingPanel] Session ID received:', sessionId);
            this.sessionId = sessionId;
            // Automatically load meeting notes for this session
            this.loadMeetingNotes();
        };
        window.api?.postMeeting?.onSetSession?.(this._ipcCallbacks.onSetSession);

        // Listen for meeting notes updates from main process
        this._ipcCallbacks.onNotesGenerated = ({ notes, tasks }) => {
            console.log('[PostMeetingPanel] Notes generated:', notes);
            this.meetingNotes = notes;
            this.tasks = tasks || [];
            this.isGenerating = false;
            this.isLoading = false;
            this.message = { type: 'success', text: '✅ Notes générées avec succès' };
            setTimeout(() => { this.message = null; }, 3000);
        };
        window.api?.postMeeting?.onNotesGenerated?.(this._ipcCallbacks.onNotesGenerated);

        this._ipcCallbacks.onExportComplete = ({ format, filePath }) => {
            console.log(`[PostMeetingPanel] Export ${format} complete:`, filePath);
            // P3-1: Clear loading state when export completes
            this.exportingFormat = null;

            // FIX-U2: Store export path and show "Open folder" button
            this.lastExportPath = filePath;
            this.lastExportFormat = format.toUpperCase();
            this.showOpenFolderButton = true;

            // Extract filename from path
            const filename = filePath ? filePath.split(/[\\/]/).pop() : '';
            this.message = { type: 'success', text: `✅ Export ${format.toUpperCase()} réussi: ${filename}` };

            // Don't auto-hide - let user dismiss or it clears on next export
        };
        window.api?.postMeeting?.onExportComplete?.(this._ipcCallbacks.onExportComplete);

        this._ipcCallbacks.onError = ({ error }) => {
            console.error('[PostMeetingPanel] Error:', error);
            this.isGenerating = false;
            this.isLoading = false;
            // P3-1: Clear export loading state on error
            this.exportingFormat = null;
            // P2-4: Use user-friendly error message
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error)}` };
        };
        window.api?.postMeeting?.onError?.(this._ipcCallbacks.onError);

        // P1-4: Listen for real progress updates from main process
        this._ipcCallbacks.onProgress = ({ step, totalSteps, message }) => {
            console.log(`[PostMeetingPanel] P1-4 Progress: ${step}/${totalSteps} - ${message}`);
            this._updateProgress(step, message);
        };
        window.api?.postMeeting?.onProgress?.(this._ipcCallbacks.onProgress);
    }

    async loadMeetingNotes() {
        if (!this.sessionId) return;

        this.isLoading = true;
        try {
            const result = await window.api.postMeeting.getMeetingNotes(this.sessionId);
            if (result) {
                this.meetingNotes = result.notes;
                this.tasks = result.tasks || [];

                // Load suggestions if notes exist
                if (this.meetingNotes) {
                    this.loadSuggestions();
                }
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading notes:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadSuggestions() {
        if (!this.sessionId || !this.meetingNotes) return;

        this.isLoadingSuggestions = true;
        try {
            const suggestions = await window.api.tasks.generateSuggestions(this.sessionId, {
                useAI: true // Enable AI suggestions
            });
            this.suggestions = suggestions || [];
            console.log(`[PostMeetingPanel] Loaded ${this.suggestions.length} suggestions`);
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading suggestions:', error);
            this.suggestions = [];
        } finally {
            this.isLoadingSuggestions = false;
        }
    }

    // ==================== Phase 2 UX Methods ====================

    /**
     * Phase 2.1: Load all sessions with meeting notes for history navigation
     */
    async loadAllSessions() {
        try {
            const result = await window.api?.postMeeting?.getAllNotes?.();
            if (result?.success && result.notes) {
                // Sort by creation date descending (most recent first)
                this.allSessions = result.notes.sort((a, b) =>
                    (b.created_at || 0) - (a.created_at || 0)
                );
                console.log(`[PostMeetingPanel] Loaded ${this.allSessions.length} sessions with notes`);
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading all sessions:', error);
            this.allSessions = [];
        }
    }

    /**
     * Phase 2.1: Handle session change from dropdown
     */
    async handleSessionChange(event) {
        const newSessionId = event.target.value;
        if (newSessionId && newSessionId !== this.sessionId) {
            this.sessionId = newSessionId;
            this.meetingNotes = null;
            this.tasks = [];
            this.transcripts = []; // Phase 5: Reset transcripts for new session
            this.transcriptSearchQuery = ''; // Phase 4: Reset search query on session change
            this.isEditing = false;
            this.editedFields = {};
            this.lastError = null;
            await this.loadMeetingNotes();
        }
    }

    /**
     * Phase 2.2: Update generation progress
     */
    _updateProgress(step, message) {
        const progressSteps = [
            'Récupération de la transcription...',
            'Analyse par l\'IA...',
            'Extraction des actions...',
            'Sauvegarde des notes...'
        ];
        this.generationProgress = {
            step,
            total: progressSteps.length,
            message: message || progressSteps[step - 1] || 'Traitement...'
        };
    }

    /**
     * Phase 2.3: Handle retry after error
     */
    async handleRetry() {
        this.lastError = null;
        this.message = null;
        await this.handleGenerateNotes();
    }

    /**
     * Phase 2.4: Toggle edit mode
     */
    handleToggleEdit() {
        if (this.isEditing) {
            // Cancel editing - reset edited fields
            this.editedFields = {};
        } else {
            // Start editing - initialize with current values
            const data = this._parseNoteData(this.meetingNotes);
            this.editedFields = {
                executiveSummary: data.executiveSummary || ''
            };
        }
        this.isEditing = !this.isEditing;
    }

    /**
     * Phase 2.4: Update edited field value
     */
    handleFieldEdit(field, value) {
        this.editedFields = {
            ...this.editedFields,
            [field]: value
        };
    }

    /**
     * Phase 2.4: Save edited notes
     */
    async handleSaveEdits() {
        if (!this.sessionId || !this.meetingNotes) return;

        this.isLoading = true;
        try {
            // Update the meeting notes with edited fields
            const updates = {};
            if (this.editedFields.executiveSummary !== undefined) {
                updates.executive_summary = this.editedFields.executiveSummary;
            }

            const result = await window.api?.postMeeting?.updateNotes?.(
                this.meetingNotes.id,
                updates
            );

            if (result?.success) {
                this.message = { type: 'success', text: '✅ Notes mises à jour' };
                this.isEditing = false;
                this.editedFields = {};
                await this.loadMeetingNotes();
            } else {
                throw new Error(result?.error || 'Échec de la mise à jour');
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error saving edits:', error);
            // P2-4: Use user-friendly error message
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error)}` };
        } finally {
            this.isLoading = false;
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    /**
     * Phase 2.2/2.3: Format session date for display
     */
    _formatSessionDate(timestamp) {
        if (!timestamp) return 'Date inconnue';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ==================== End Phase 2 UX Methods ====================

    async handleAcceptSuggestion(suggestion) {
        if (!this.sessionId) return;

        try {
            const result = await window.api.tasks.acceptSuggestion(this.sessionId, suggestion);

            if (result.success) {
                // Remove from suggestions list
                this.suggestions = this.suggestions.filter(s => s.type !== suggestion.type);

                // Handle specific actions
                if (result.action === 'open_task_assignment') {
                    // Could open task modal here
                    this.message = { type: 'success', text: '✅ Action appliquée' };
                } else if (result.action === 'filter_upcoming_tasks') {
                    this.activeTab = 'tasks';
                    this.message = { type: 'success', text: '✅ Affichage des tâches à échéance' };
                } else {
                    this.message = { type: 'success', text: `✅ ${result.message}` };
                }

                // Reload if auto-assign was done
                if (suggestion.action === 'auto_assign_emails') {
                    await this.loadMeetingNotes();
                }

                setTimeout(() => { this.message = null; }, 3000);
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error accepting suggestion:', error);
            // P2-4: Use user-friendly error message
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error)}` };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    async handleDismissSuggestion(suggestion) {
        if (!this.sessionId) return;

        try {
            await window.api.tasks.dismissSuggestion(this.sessionId, suggestion.type);

            // Remove from list
            this.suggestions = this.suggestions.filter(s => s.type !== suggestion.type);
        } catch (error) {
            console.error('[PostMeetingPanel] Error dismissing suggestion:', error);
        }
    }

    async handleGenerateNotes() {
        if (!this.sessionId || this.isGenerating) return;

        this.isGenerating = true;
        this.lastError = null;
        this.message = null;

        // P1-4: Initialize progress - real updates will come from IPC events
        this._updateProgress(1, 'Démarrage...');

        try {
            // P1-4: No more simulated progress - real progress comes from IPC events
            await window.api.postMeeting.generateNotes(this.sessionId);

            this.generationProgress = null;

            // Reload all sessions to update the dropdown
            await this.loadAllSessions();

        } catch (error) {
            console.error('[PostMeetingPanel] Error generating notes:', error);
            this.isGenerating = false;
            this.generationProgress = null;

            // Phase 2.3: Set error with retry capability
            this.lastError = {
                message: this._getErrorMessage(error),
                canRetry: this._canRetryError(error),
                originalError: error.message
            };
        }
    }

    /**
     * P2-4: Get user-friendly error message (enhanced)
     * Converts technical errors to user-friendly French messages
     */
    _getErrorMessage(error, context = 'general') {
        const msg = (error?.message || error || '').toString().toLowerCase();

        // Generation errors
        if (msg.includes('no transcripts') || msg.includes('aucune transcription')) {
            return 'Aucune transcription trouvée. Assurez-vous d\'avoir parlé pendant l\'enregistrement.';
        }
        if (msg.includes('api key') || msg.includes('not configured') || msg.includes('clé api')) {
            return 'Clé API non configurée. Vérifiez vos paramètres dans les réglages.';
        }
        if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset') || msg.includes('etimedout')) {
            return 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
        }
        if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
            return 'Trop de requêtes. Veuillez patienter quelques minutes avant de réessayer.';
        }
        if (msg.includes('session') && msg.includes('not found')) {
            return 'Session introuvable. Essayez de relancer une nouvelle écoute.';
        }

        // Export errors
        if (msg.includes('pdf') && (msg.includes('disponible') || msg.includes('available'))) {
            return 'L\'export PDF n\'est pas disponible. Installez la dépendance pdfkit.';
        }
        if (msg.includes('word') || msg.includes('docx')) {
            return 'L\'export Word n\'est pas disponible. Installez la dépendance docx.';
        }
        if (msg.includes('excel') || msg.includes('xlsx')) {
            return 'L\'export Excel n\'est pas disponible. Installez la dépendance exceljs.';
        }
        if (msg.includes('permission') || msg.includes('eacces') || msg.includes('eperm')) {
            return 'Erreur de permission. Vérifiez les droits d\'accès au dossier de destination.';
        }
        if (msg.includes('no space') || msg.includes('enospc')) {
            return 'Espace disque insuffisant pour l\'export.';
        }

        // Email errors
        if (msg.includes('meeting notes not found') || msg.includes('no meeting notes')) {
            return 'Aucune note de réunion trouvée. Générez d\'abord le compte-rendu.';
        }

        // Task errors
        if (msg.includes('task') && msg.includes('not found')) {
            return 'Tâche introuvable. Elle a peut-être été supprimée.';
        }

        // Database errors
        if (msg.includes('sqlite') || msg.includes('database')) {
            return 'Erreur de base de données. Essayez de redémarrer l\'application.';
        }

        // AI errors
        if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
            return 'Service IA temporairement indisponible. Réessayez dans quelques instants.';
        }
        if (msg.includes('invalid response') || msg.includes('parse')) {
            return 'Réponse invalide du service IA. Réessayez.';
        }

        // Context-specific fallbacks
        if (context === 'export') {
            return 'Échec de l\'export. Vérifiez que le dossier de destination existe et est accessible.';
        }
        if (context === 'email') {
            return 'Échec de la génération de l\'email. Vérifiez que les notes existent.';
        }
        if (context === 'task') {
            return 'Échec de la mise à jour de la tâche. Réessayez.';
        }

        // Generic fallback - keep it simple
        return 'Une erreur s\'est produite. Veuillez réessayer.';
    }

    /**
     * Phase 2.3: Determine if error is retryable
     */
    _canRetryError(error) {
        const msg = error.message?.toLowerCase() || '';

        // Non-retryable errors
        if (msg.includes('no transcripts') || msg.includes('aucune transcription')) return false;
        if (msg.includes('api key') || msg.includes('not configured')) return false;
        if (msg.includes('session') && msg.includes('not found')) return false;

        // Retryable errors
        return true;
    }

    async handleExport(format, withDialog = false) {
        if (!this.meetingNotes) {
            this.message = { type: 'error', text: '❌ Aucune note à exporter' };
            return;
        }

        // P3-1: Prevent double-click by checking if already exporting this format
        if (this.exportingFormat) {
            console.log(`[PostMeetingPanel] Export already in progress: ${this.exportingFormat}`);
            return;
        }

        // P3-1: Set loading state for this specific format
        this.exportingFormat = format;
        this.message = { type: 'success', text: `⏳ Export ${format.toUpperCase()} en cours...` };

        try {
            // FIX-U2: Hide previous "Open folder" button on new export
            this.showOpenFolderButton = false;

            // IMP-U6: Use dialog-based export if requested
            if (withDialog) {
                const result = await window.api.postMeeting.exportNotesWithDialog(this.sessionId, format);
                // Handle cancellation
                if (result.cancelled) {
                    this.exportingFormat = null;
                    this.message = null;
                    return;
                }
            } else {
                await window.api.postMeeting.exportNotes(this.sessionId, format);
            }
            // Note: exportingFormat will be cleared by onExportComplete callback
        } catch (error) {
            console.error('[PostMeetingPanel] Export error:', error);
            // P3-1: Clear loading state on error
            this.exportingFormat = null;
            // P2-4: Use user-friendly error message with export context
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error, 'export')}` };
        }
    }

    /**
     * FIX-U2: Open the export folder in file explorer
     */
    async handleOpenExportFolder() {
        if (!this.lastExportPath) {
            console.warn('[PostMeetingPanel] No export path to open');
            return;
        }

        try {
            console.log('[PostMeetingPanel] Opening export folder...');
            // Use the post-meeting export folder opening via IPC
            const result = await window.api?.postMeeting?.openExportFolder?.();
            if (result && !result.success) {
                console.error('[PostMeetingPanel] Failed to open folder:', result.error);
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error opening folder:', error);
        }
    }

    /**
     * FIX-U2: Dismiss the export success message
     */
    dismissExportMessage() {
        this.message = null;
        this.showOpenFolderButton = false;
        this.requestUpdate();
    }

    async handleTaskToggle(taskId, completed) {
        try {
            await window.api.postMeeting.updateTask(taskId, {
                status: completed ? 'completed' : 'pending',
                completed_at: completed ? Math.floor(Date.now() / 1000) : null
            });

            // Update local state
            this.tasks = this.tasks.map(t =>
                t.id === taskId ? { ...t, status: completed ? 'completed' : 'pending' } : t
            );
        } catch (error) {
            console.error('[PostMeetingPanel] Error updating task:', error);
        }
    }

    /**
     * P2-3: Check if there are unsaved changes
     */
    _hasUnsavedChanges() {
        // Check if we're in edit mode with modified fields
        if (this.isEditing && Object.keys(this.editedFields).length > 0) {
            const data = this._parseNoteData(this.meetingNotes);
            // Check if any field has actually been modified
            if (this.editedFields.executiveSummary !== undefined &&
                this.editedFields.executiveSummary !== (data.executiveSummary || '')) {
                return true;
            }
        }
        return false;
    }

    handleClose() {
        // P2-3: Show confirmation dialog if there are unsaved changes
        if (this._hasUnsavedChanges()) {
            const confirmed = window.confirm(
                'Vous avez des modifications non sauvegardées.\n\nÊtes-vous sûr de vouloir fermer sans enregistrer ?'
            );
            if (!confirmed) {
                return; // User cancelled - don't close
            }
        }

        // FIX: Close the window directly via IPC instead of dispatching unused event
        if (window.api?.postMeeting?.closeWindow) {
            window.api.postMeeting.closeWindow();
        } else if (window.api?.window?.close) {
            window.api.window.close();
        } else {
            // Fallback: try to close via standard web API
            window.close();
        }
    }

    handleOpenParticipantModal() {
        this.showParticipantModal = true;
    }

    handleCloseParticipantModal() {
        this.showParticipantModal = false;
    }

    async handleParticipantsSaved(event) {
        const { sessionId } = event.detail;

        this.message = { type: 'success', text: '✅ Participants enregistrés avec succès' };
        setTimeout(() => { this.message = null; }, 3000);

        // Reload meeting notes if they exist to update with participant names
        if (this.meetingNotes) {
            try {
                await window.api.participants.updateNotesWithParticipants(sessionId, this.meetingNotes.id);
                await this.loadMeetingNotes();
                this.message = { type: 'success', text: '✅ Notes mises à jour avec les participants' };
                setTimeout(() => { this.message = null; }, 3000);
            } catch (error) {
                console.error('[PostMeetingPanel] Error updating notes with participants:', error);
            }
        }

        this.showParticipantModal = false;
    }

    async handleGenerateEmail(templateType = 'brief') {
        if (!this.sessionId || this.isGeneratingEmail) return;

        this.isGeneratingEmail = true;
        this.message = { type: 'success', text: '⏳ Génération de l\'email en cours...' };

        try {
            let emailData;

            if (templateType === 'ai') {
                // Use AI to generate email
                emailData = await window.api.email.generateFollowUp(this.sessionId, {
                    template: 'standard',
                    tone: 'professional',
                    includeActionItems: true,
                    includeDecisions: true
                });
            } else {
                // Use quick template
                emailData = await window.api.email.generateTemplate(this.sessionId, templateType);
            }

            this.currentEmailData = emailData;
            this.showEmailModal = true;
            this.message = null;
        } catch (error) {
            console.error('[PostMeetingPanel] Error generating email:', error);
            // P2-4: Use user-friendly error message with email context
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error, 'email')}` };
            setTimeout(() => { this.message = null; }, 5000);
        } finally {
            this.isGeneratingEmail = false;
        }
    }

    handleCloseEmailModal() {
        this.showEmailModal = false;
        this.currentEmailData = null;
    }

    renderOverviewTab() {
        if (!this.meetingNotes) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>Aucune note de réunion disponible</p>
                    <button class="generate-button" @click=${this.handleGenerateNotes} ?disabled=${this.isGenerating}>
                        ${this.isGenerating ? '⏳ Génération...' : '📝 Générer le compte-rendu'}
                    </button>
                </div>
            `;
        }

        const data = this._parseNoteData(this.meetingNotes);

        // Count items for quick stats
        const actionCount = data.actionItems?.length || 0;
        const riskCount = data.risks?.length || 0;
        const unresolvedCount = data.unresolvedItems?.length || 0;
        const hasTasksData = actionCount > 0 || riskCount > 0 || unresolvedCount > 0;

        return html`
            <!-- Phase 5: Simplified Overview Header -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--color-white-10);
            ">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    ${data.meetingType && data.meetingType !== 'general' ? html`
                        <span class="meeting-type-badge">
                            ${this._getMeetingTypeIcon(data.meetingType)} ${this._getMeetingTypeLabel(data.meetingType)}
                        </span>
                    ` : ''}
                    ${data.metadata?.qualityScore != null ? html`
                        <span class="quality-score ${this._getQualityScoreClass(data.metadata.qualityScore)}">
                            ${this._getQualityScoreIcon(data.metadata.qualityScore)} ${data.metadata.qualityScore}/100
                        </span>
                    ` : ''}
                    ${data.participants?.length > 0 ? html`
                        <span style="font-size: 11px; color: var(--color-white-60);">
                            👥 ${data.participants.length} participant${data.participants.length > 1 ? 's' : ''}
                        </span>
                    ` : ''}
                </div>
                <div style="display: flex; gap: 6px;">
                    ${this.isEditing ? html`
                        <button class="edit-button" @click=${this.handleToggleEdit}>✕</button>
                        <button class="edit-button primary" @click=${this.handleSaveEdits}>💾</button>
                    ` : html`
                        <button class="edit-button" @click=${this.handleToggleEdit} title="Modifier">✏️</button>
                        <button class="edit-button" @click=${this.handleOpenParticipantModal} title="Assigner participants">👥</button>
                    `}
                </div>
            </div>

            <!-- Executive Summary -->
            <div class="summary-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 class="section-title" style="font-size: 14px; margin: 0;">📝 Résumé</h3>
                    ${!this.isEditing && data.executiveSummary ? html`
                        <button class="copy-section-btn" @click=${(e) => this.copySectionToClipboard('Résumé', data.executiveSummary, e)}>
                            📋 Copier
                        </button>
                    ` : ''}
                </div>
                ${this.isEditing ? html`
                    <div class="editable-field editing">
                        <textarea
                            class="edit-textarea"
                            .value=${this.editedFields.executiveSummary || ''}
                            @input=${(e) => this.handleFieldEdit('executiveSummary', e.target.value)}
                            placeholder="Résumé exécutif de la réunion..."
                            rows="4"
                        ></textarea>
                        <span class="char-count">${(this.editedFields.executiveSummary || '').length}</span>
                    </div>
                ` : html`
                    <div class="summary-text" style="font-size: 13px; line-height: 1.6;">
                        ${data.executiveSummary || 'Aucun résumé disponible'}
                    </div>
                `}
            </div>

            <!-- Key Points (max 5) -->
            ${data.keyPoints && data.keyPoints.length > 0 ? html`
                <div class="summary-section">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 class="section-title" style="font-size: 14px; margin: 0;">🎯 Points clés</h3>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="copy-section-btn" @click=${(e) => this.copySectionToClipboard('Points clés', data.keyPoints, e)}>
                                📋 Copier
                            </button>
                            ${data.keyPoints.length > 5 ? html`
                                <span style="font-size: 10px; color: var(--color-primary-400); cursor: pointer;"
                                    @click=${() => this._showAllItems('keyPoints')}>
                                    Voir tout (${data.keyPoints.length}) →
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; list-style: disc;">
                        ${data.keyPoints.slice(0, 5).map(point => html`
                            <li style="font-size: 12px; color: var(--color-white-85); margin-bottom: 6px; line-height: 1.4;">
                                ${point}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            <!-- Decisions (max 3, simplified) -->
            ${data.decisions && data.decisions.length > 0 ? html`
                <div class="summary-section">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 class="section-title" style="font-size: 14px; margin: 0;">
                            🔍 Décisions (${data.decisions.length})
                        </h3>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="copy-section-btn" @click=${(e) => this.copySectionToClipboard('Décisions', data.decisions, e)}>
                                📋 Copier
                            </button>
                            ${data.decisions.length > 3 ? html`
                                <span style="font-size: 10px; color: var(--color-primary-400); cursor: pointer;"
                                    @click=${() => this._showAllItems('decisions')}>
                                    Voir tout →
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                        ${data.decisions.slice(0, 3).map(decision => html`
                            <div style="
                                background: var(--color-black-20);
                                border-left: 3px solid var(--color-primary-500);
                                padding: 10px 12px;
                                border-radius: 4px;
                            ">
                                <div style="font-size: 12px; font-weight: 500; color: var(--color-white-90);">
                                    ✓ ${decision.decision || decision.title || decision}
                                </div>
                                ${decision.rationale ? html`
                                    <div style="font-size: 10px; color: var(--color-white-60); margin-top: 4px;">
                                        ${decision.rationale}
                                    </div>
                                ` : ''}
                            </div>
                        `)}
                    </div>
                </div>
            ` : ''}

            <!-- Important Quotes (max 2) -->
            ${data.importantQuotes && data.importantQuotes.length > 0 ? html`
                <div class="summary-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 class="section-title" style="font-size: 14px; margin: 0;">💬 Citations clés</h3>
                        <button class="copy-section-btn" @click=${(e) => this.copySectionToClipboard('Citations clés', data.importantQuotes, e)}>
                            📋 Copier
                        </button>
                    </div>
                    ${data.importantQuotes.slice(0, 2).map(quote => html`
                        <div style="
                            border-left: 3px solid var(--color-white-30);
                            padding: 8px 12px;
                            margin-bottom: 8px;
                            font-style: italic;
                            font-size: 12px;
                            color: var(--color-white-80);
                        ">
                            "${quote.quote || quote.text || quote}"
                            ${quote.speaker ? html`
                                <span style="font-style: normal; color: var(--color-white-50);"> — ${quote.speaker}</span>
                            ` : ''}
                        </div>
                    `)}
                </div>
            ` : ''}

            <!-- Quick Stats / Link to Tasks Tab -->
            ${hasTasksData ? html`
                <div style="
                    background: linear-gradient(135deg, var(--color-black-30) 0%, var(--color-black-20) 100%);
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 16px;
                    cursor: pointer;
                " @click=${() => this.activeTab = 'tasks'}>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 13px; font-weight: 600; color: var(--color-white-90);">
                            📋 Éléments à traiter
                        </span>
                        <span style="font-size: 10px; color: var(--color-primary-400);">
                            Voir dans Tasks →
                        </span>
                    </div>
                    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                        ${actionCount > 0 ? html`
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 20px; font-weight: 700; color: var(--color-primary-400);">
                                    ${actionCount}
                                </span>
                                <span style="font-size: 11px; color: var(--color-white-60);">
                                    action${actionCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        ` : ''}
                        ${riskCount > 0 ? html`
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 20px; font-weight: 700; color: var(--color-warning-400);">
                                    ${riskCount}
                                </span>
                                <span style="font-size: 11px; color: var(--color-white-60);">
                                    risque${riskCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        ` : ''}
                        ${unresolvedCount > 0 ? html`
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 20px; font-weight: 700; color: var(--color-error-400);">
                                    ${unresolvedCount}
                                </span>
                                <span style="font-size: 11px; color: var(--color-white-60);">
                                    non résolu${unresolvedCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Generation Info (collapsed) -->
            ${data.metadata?.generatedAt ? html`
                <div style="
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid var(--color-white-10);
                    font-size: 10px;
                    color: var(--color-white-40);
                    display: flex;
                    justify-content: space-between;
                ">
                    <span>Généré le ${new Date(data.metadata.generatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span>${data.metadata.model || ''}</span>
                </div>
            ` : ''}
        `;
    }

    /**
     * Phase 5: Show all items in a modal or expand section
     * For now, just switch to the appropriate tab
     */
    _showAllItems(type) {
        // For now, this could open a modal or expand the section
        // Switching to tasks tab for action-related items
        if (type === 'decisions') {
            this.message = { type: 'success', text: '💡 Toutes les décisions sont affichées ci-dessus' };
            setTimeout(() => { this.message = null; }, 2000);
        }
    }

    async handleAutoAssignEmails() {
        if (!this.sessionId) return;

        try {
            this.message = { type: 'success', text: '⏳ Attribution des emails en cours...' };
            const result = await window.api.tasks.autoAssignEmails(this.sessionId);

            if (result.success) {
                this.message = { type: 'success', text: `✅ ${result.assigned} emails attribués sur ${result.total} tâches` };
                await this.loadMeetingNotes(); // Reload to get updated tasks
            } else {
                this.message = { type: 'error', text: `❌ ${result.message}` };
            }

            setTimeout(() => { this.message = null; }, 3000);
        } catch (error) {
            console.error('[PostMeetingPanel] Error auto-assigning emails:', error);
            // P2-4: Use user-friendly error message with task context
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error, 'task')}` };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    async handleExportTasksCSV() {
        if (!this.sessionId) return;

        try {
            this.message = { type: 'success', text: '⏳ Export des tâches en cours...' };
            const result = await window.api.tasks.exportToCSV(this.sessionId);

            this.message = { type: 'success', text: `✅ Export réussi: ${result.fileName}` };
            setTimeout(() => { this.message = null; }, 5000);
        } catch (error) {
            console.error('[PostMeetingPanel] Error exporting tasks:', error);
            // P2-4: Use user-friendly error message with export context
            this.message = { type: 'error', text: `❌ ${this._getErrorMessage(error, 'export')}` };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    renderTasksTab() {
        const data = this.meetingNotes ? this._parseNoteData(this.meetingNotes) : {};
        const hasAnyContent = this.tasks.length > 0 ||
            data.actionItems?.length > 0 ||
            data.risks?.length > 0 ||
            data.unresolvedItems?.length > 0 ||
            data.nextSteps?.length > 0 ||
            this.suggestions?.length > 0;

        if (!hasAnyContent) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <p>Aucune tâche ou action à afficher</p>
                    <p style="font-size: 10px; color: var(--color-white-40); margin-top: 8px;">
                        Les actions seront extraites lors de la génération du compte-rendu
                    </p>
                </div>
            `;
        }

        return html`
            <!-- Follow-up Suggestions -->
            ${this.suggestions?.length > 0 ? html`
                <div class="summary-section" style="
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 16px;
                ">
                    <h3 class="section-title" style="font-size: 13px; margin-bottom: 10px;">💡 Suggestions IA</h3>
                    ${this.suggestions.slice(0, 3).map(suggestion => html`
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 8px 0;
                            border-bottom: 1px solid var(--color-white-10);
                        ">
                            <div style="flex: 1;">
                                <span style="font-size: 11px; color: var(--color-white-85);">
                                    ${suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'low' ? '🟢' : '🟡'}
                                    ${suggestion.title}
                                </span>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button class="export-button" style="padding: 4px 8px; font-size: 9px;"
                                    @click=${() => this.handleAcceptSuggestion(suggestion)}>✓</button>
                                <button class="export-button" style="padding: 4px 8px; font-size: 9px; background: var(--color-white-5);"
                                    @click=${() => this.handleDismissSuggestion(suggestion)}>✕</button>
                            </div>
                        </div>
                    `)}
                </div>
            ` : ''}

            <!-- Action Items / Tasks -->
            ${this.tasks.length > 0 ? html`
                <div class="summary-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 class="section-title" style="font-size: 14px; margin: 0;">
                            ✅ Actions (${this.tasks.length})
                        </h3>
                        <div style="display: flex; gap: 6px;">
                            <button class="export-button" style="padding: 5px 10px; font-size: 10px;"
                                @click=${this.handleAutoAssignEmails}>📧 Emails</button>
                            <button class="export-button" style="padding: 5px 10px; font-size: 10px;"
                                @click=${this.handleExportTasksCSV}>📊 CSV</button>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${this.tasks.map(task => html`
                            <div style="
                                display: flex;
                                align-items: flex-start;
                                gap: 10px;
                                padding: 10px;
                                background: var(--color-black-20);
                                border-radius: 6px;
                                border-left: 3px solid ${task.priority === 'high' ? 'var(--color-error-400)' : task.priority === 'low' ? 'var(--color-success-400)' : 'var(--color-warning-400)'};
                            ">
                                <input type="checkbox" class="task-checkbox"
                                    ?checked=${task.status === 'completed'}
                                    @change=${(e) => this.handleTaskToggle(task.id, e.target.checked)}
                                    style="margin-top: 2px;" />
                                <div style="flex: 1;">
                                    <div style="font-size: 12px; color: var(--color-white-90); ${task.status === 'completed' ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                                        ${task.task_description}
                                    </div>
                                    <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 10px; color: var(--color-white-50);">
                                        ${task.assigned_to ? html`<span>👤 ${task.assigned_to}</span>` : ''}
                                        ${task.deadline ? html`<span>📅 ${task.deadline}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
            ` : ''}

            <!-- Risks -->
            ${data.risks?.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title" style="font-size: 14px; margin-bottom: 10px;">
                        ⚠️ Risques identifiés (${data.risks.length})
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${data.risks.map(risk => html`
                            <div style="
                                padding: 10px 12px;
                                background: var(--color-black-20);
                                border-radius: 6px;
                                border-left: 3px solid ${risk.severity === 'high' ? 'var(--color-error-400)' : risk.severity === 'low' ? 'var(--color-success-400)' : 'var(--color-warning-400)'};
                            ">
                                <div style="font-size: 12px; font-weight: 500; color: var(--color-white-90);">
                                    ${risk.risk || risk.description || risk}
                                </div>
                                ${risk.mitigation ? html`
                                    <div style="font-size: 10px; color: var(--color-success-400); margin-top: 6px;">
                                        💡 ${risk.mitigation}
                                    </div>
                                ` : ''}
                            </div>
                        `)}
                    </div>
                </div>
            ` : ''}

            <!-- Unresolved Items -->
            ${data.unresolvedItems?.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title" style="font-size: 14px; margin-bottom: 10px;">
                        ❓ Points non résolus (${data.unresolvedItems.length})
                    </h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${data.unresolvedItems.map(item => html`
                            <li style="
                                font-size: 12px;
                                color: var(--color-warning-300);
                                margin-bottom: 8px;
                                line-height: 1.4;
                            ">
                                ${typeof item === 'string' ? item : item.issue || item.description || JSON.stringify(item)}
                            </li>
                        `)}
                    </ul>
                </div>
            ` : ''}

            <!-- Next Steps -->
            ${data.nextSteps?.length > 0 ? html`
                <div class="summary-section">
                    <h3 class="section-title" style="font-size: 14px; margin-bottom: 10px;">
                        ➡️ Prochaines étapes
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${data.nextSteps.map((step, index) => html`
                            <div style="
                                display: flex;
                                align-items: flex-start;
                                gap: 10px;
                                padding: 8px 10px;
                                background: var(--color-black-15);
                                border-radius: 4px;
                            ">
                                <span style="
                                    min-width: 20px;
                                    height: 20px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    background: var(--color-primary-500);
                                    border-radius: 50%;
                                    font-size: 10px;
                                    font-weight: 600;
                                    color: white;
                                ">${index + 1}</span>
                                <span style="font-size: 12px; color: var(--color-white-85); line-height: 1.4;">
                                    ${typeof step === 'string' ? step : step.action || step.description || JSON.stringify(step)}
                                </span>
                            </div>
                        `)}
                    </div>
                </div>
            ` : ''}

            <!-- Timeline (collapsed by default) -->
            ${data.timeline?.length > 0 ? html`
                <details style="margin-top: 12px;">
                    <summary style="
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        color: var(--color-white-70);
                        padding: 8px 0;
                        border-top: 1px solid var(--color-white-10);
                    ">
                        📅 Chronologie de la réunion (${data.timeline.length} points)
                    </summary>
                    <div style="padding-top: 10px;">
                        ${data.timeline.map(item => html`
                            <div style="
                                display: flex;
                                gap: 12px;
                                padding: 6px 0;
                                border-bottom: 1px solid var(--color-white-5);
                            ">
                                <span style="
                                    min-width: 50px;
                                    font-size: 10px;
                                    font-family: monospace;
                                    color: var(--color-primary-400);
                                ">${item.time || item.timestamp || 'N/A'}</span>
                                <span style="font-size: 11px; color: var(--color-white-70);">
                                    ${item.topic || item.subject || 'N/A'}
                                </span>
                            </div>
                        `)}
                    </div>
                </details>
            ` : ''}
        `;
    }

    renderExportTab() {
        if (!this.meetingNotes) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">💾</div>
                    <p>Générez d'abord les notes pour pouvoir les exporter</p>
                </div>
            `;
        }

        return html`
            <div class="summary-section">
                <h3 class="section-title">📧 Générer email de suivi</h3>
                <div class="export-grid">
                    <button class="export-button" @click=${() => this.handleGenerateEmail('brief')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">📝</div>
                        <div class="export-label">Email bref</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleGenerateEmail('detailed')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">📋</div>
                        <div class="export-label">Email détaillé</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleGenerateEmail('action-only')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">✅</div>
                        <div class="export-label">Actions seulement</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleGenerateEmail('ai')} ?disabled=${this.isGeneratingEmail}>
                        <div class="export-icon">🤖</div>
                        <div class="export-label">Email IA (Claude)</div>
                    </button>
                </div>
            </div>

            <div class="summary-section">
                <h3 class="section-title">💾 Exporter le compte-rendu</h3>
                <div class="export-grid">
                    <!-- P3-1: Export buttons with individual loading states -->
                    <button class="export-button" @click=${() => this.handleExport('markdown')} ?disabled=${this.exportingFormat !== null}>
                        <div class="export-icon">${this.exportingFormat === 'markdown' ? '⏳' : '📝'}</div>
                        <div class="export-label">${this.exportingFormat === 'markdown' ? 'Export...' : 'Markdown'}</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('pdf')} ?disabled=${this.exportingFormat !== null}>
                        <div class="export-icon">${this.exportingFormat === 'pdf' ? '⏳' : '📄'}</div>
                        <div class="export-label">${this.exportingFormat === 'pdf' ? 'Export...' : 'PDF'}</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('word')} ?disabled=${this.exportingFormat !== null}>
                        <div class="export-icon">${this.exportingFormat === 'word' ? '⏳' : '📘'}</div>
                        <div class="export-label">${this.exportingFormat === 'word' ? 'Export...' : 'Word'}</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('excel')} ?disabled=${this.exportingFormat !== null}>
                        <div class="export-icon">${this.exportingFormat === 'excel' ? '⏳' : '📊'}</div>
                        <div class="export-label">${this.exportingFormat === 'excel' ? 'Export...' : 'Excel'}</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('html')} ?disabled=${this.exportingFormat !== null}>
                        <div class="export-icon">${this.exportingFormat === 'html' ? '⏳' : '📧'}</div>
                        <div class="export-label">${this.exportingFormat === 'html' ? 'Export...' : 'Email (HTML)'}</div>
                    </button>
                    <button class="export-button" @click=${() => this.handleExport('srt')} ?disabled=${this.exportingFormat !== null}>
                        <div class="export-icon">${this.exportingFormat === 'srt' ? '⏳' : '🎬'}</div>
                        <div class="export-label">${this.exportingFormat === 'srt' ? 'Export...' : 'Sous-titres (SRT)'}</div>
                    </button>
                </div>
                <!-- IMP-U6: Save As section with format selector -->
                <div class="save-as-section">
                    <select class="save-as-select" id="saveAsFormat" ?disabled=${this.exportingFormat !== null}>
                        <option value="markdown">Markdown (.md)</option>
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="word">Word (.docx)</option>
                        <option value="excel">Excel (.xlsx)</option>
                        <option value="html">HTML (.html)</option>
                        <option value="text">Texte (.txt)</option>
                        <option value="srt">Sous-titres SRT (.srt)</option>
                        <option value="vtt">Sous-titres VTT (.vtt)</option>
                    </select>
                    <button class="save-as-btn" @click=${() => this.handleExport(this.shadowRoot.getElementById('saveAsFormat').value, true)} ?disabled=${this.exportingFormat !== null}>
                        📁 Enregistrer sous...
                    </button>
                </div>
            </div>

            <!-- P2-5: Show export destination info -->
            <div class="summary-section" style="background: var(--color-black-10); border-radius: 6px; padding: 12px; margin-top: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--color-white-60);">
                    <span>📁</span>
                    <span>Les fichiers seront exportés dans votre dossier <strong style="color: var(--color-white-80);">Téléchargements</strong></span>
                </div>
                <div style="font-size: 10px; color: var(--color-white-40); margin-top: 6px; padding-left: 24px;">
                    Le chemin complet sera affiché après l'export.
                </div>
            </div>
        `;
    }

    /**
     * Phase 5: Load transcripts from session
     */
    async loadTranscripts() {
        if (!this.sessionId || this.transcripts.length > 0) return; // Already loaded

        this.isLoadingTranscripts = true;
        try {
            // Get transcripts via the postMeeting API
            const result = await window.api?.postMeeting?.getTranscripts?.(this.sessionId);
            if (result && result.success && result.transcripts) {
                this.transcripts = result.transcripts;
                console.log(`[PostMeetingPanel] Loaded ${this.transcripts.length} transcript entries`);
            } else {
                console.warn('[PostMeetingPanel] No transcripts found for session:', this.sessionId);
                this.transcripts = [];
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error loading transcripts:', error);
            this.transcripts = [];
        } finally {
            this.isLoadingTranscripts = false;
        }
    }

    /**
     * Phase 5: Copy transcript to clipboard
     */
    async copyTranscriptToClipboard() {
        if (this.transcripts.length === 0) return;

        // Format transcript as text
        const transcriptText = this.transcripts.map(entry => {
            const speaker = entry.speaker_name || entry.speaker || `Speaker ${entry.speaker_id || '?'}`;
            const time = entry.timestamp ? this._formatTranscriptTime(entry.timestamp) : '';
            return `[${time}] ${speaker}: ${entry.text || entry.transcript || ''}`;
        }).join('\n\n');

        try {
            await navigator.clipboard.writeText(transcriptText);
            this.message = { type: 'success', text: '📋 Transcript copié dans le presse-papiers' };
            setTimeout(() => { this.message = null; }, 3000);
        } catch (error) {
            console.error('[PostMeetingPanel] Error copying transcript:', error);
            this.message = { type: 'error', text: '❌ Erreur lors de la copie' };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    /**
     * Phase 4: Copy a specific section to clipboard
     * @param {string} sectionName - Name of the section
     * @param {string|Array} content - Content to copy
     */
    async copySectionToClipboard(sectionName, content, event) {
        if (!content) return;

        // Format content based on type
        let textToCopy = '';
        if (Array.isArray(content)) {
            textToCopy = content.map((item, i) => {
                if (typeof item === 'string') return `${i + 1}. ${item}`;
                if (item.decision || item.title) return `• ${item.decision || item.title}${item.rationale ? ` (${item.rationale})` : ''}`;
                if (item.quote || item.text) return `"${item.quote || item.text}"${item.speaker ? ` — ${item.speaker}` : ''}`;
                return `• ${JSON.stringify(item)}`;
            }).join('\n');
        } else {
            textToCopy = content;
        }

        // Add section header
        textToCopy = `${sectionName}\n${'─'.repeat(sectionName.length)}\n${textToCopy}`;

        try {
            await navigator.clipboard.writeText(textToCopy);

            // Visual feedback on button
            if (event?.target) {
                const btn = event.target.closest('.copy-section-btn');
                if (btn) {
                    btn.classList.add('copied');
                    btn.textContent = '✓ Copié';
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        btn.textContent = '📋 Copier';
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('[PostMeetingPanel] Error copying section:', error);
            this.message = { type: 'error', text: '❌ Erreur lors de la copie' };
            setTimeout(() => { this.message = null; }, 3000);
        }
    }

    /**
     * Phase 5: Format timestamp for transcript display
     */
    _formatTranscriptTime(timestamp) {
        if (!timestamp) return '00:00';

        // If timestamp is in seconds
        const totalSeconds = typeof timestamp === 'number' ? timestamp : parseFloat(timestamp);
        if (isNaN(totalSeconds)) return '00:00';

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Phase 5: Get speaker color based on speaker ID
     */
    _getSpeakerColor(speakerId) {
        const colors = [
            '#667eea', // Purple-blue
            '#f093fb', // Pink
            '#4facfe', // Blue
            '#43e97b', // Green
            '#fa709a', // Rose
            '#fee140', // Yellow
            '#30cfd0', // Cyan
            '#a8edea', // Mint
            '#ff9a9e', // Salmon
            '#fbc2eb', // Light pink
        ];
        const id = typeof speakerId === 'number' ? speakerId : parseInt(speakerId) || 0;
        return colors[id % colors.length];
    }

    /**
     * Phase 5: Render Transcript Tab (with Phase 4 Search)
     */
    renderTranscriptTab() {
        // Loading state
        if (this.isLoadingTranscripts) {
            return html`
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Chargement du transcript...</p>
                </div>
            `;
        }

        // Empty state
        if (this.transcripts.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-icon">📜</div>
                    <p>Aucun transcript disponible pour cette session</p>
                    <p style="font-size: 10px; color: var(--color-white-40); margin-top: 8px;">
                        Le transcript est généré pendant l'écoute en temps réel
                    </p>
                </div>
            `;
        }

        // Phase 4: Filter transcripts by search query
        const query = this.transcriptSearchQuery?.toLowerCase() || '';
        const filteredTranscripts = query
            ? this.transcripts.filter(entry => {
                const text = (entry.text || entry.transcript || '').toLowerCase();
                const speaker = (entry.speaker_name || entry.speaker || '').toLowerCase();
                return text.includes(query) || speaker.includes(query);
            })
            : this.transcripts;

        return html`
            <!-- Phase 4: Search Bar -->
            <div class="search-container">
                <input
                    type="text"
                    class="search-input"
                    placeholder="🔍 Rechercher dans le transcript..."
                    .value=${this.transcriptSearchQuery || ''}
                    @input=${(e) => { this.transcriptSearchQuery = e.target.value; }}
                />
                ${this.transcriptSearchQuery ? html`
                    <span class="search-results-count">${filteredTranscripts.length} résultat${filteredTranscripts.length !== 1 ? 's' : ''}</span>
                    <button class="search-clear" @click=${() => { this.transcriptSearchQuery = ''; }}>✕</button>
                ` : ''}
                <span class="search-icon">🔍</span>
            </div>

            <!-- Transcript Header with Copy Button -->
            <div class="summary-section" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 class="section-title" style="margin: 0;">
                    📜 Transcript ${query ? `(${filteredTranscripts.length}/${this.transcripts.length})` : `(${this.transcripts.length} entrées)`}
                </h3>
                <button
                    class="export-button"
                    style="padding: 8px 16px; font-size: 11px;"
                    @click=${this.copyTranscriptToClipboard}
                >
                    📋 Copier tout
                </button>
            </div>

            <!-- No Search Results -->
            ${query && filteredTranscripts.length === 0 ? html`
                <div class="no-search-results">
                    <div class="icon">🔍</div>
                    <p>Aucun résultat pour "${this.transcriptSearchQuery}"</p>
                    <button class="copy-section-btn" @click=${() => { this.transcriptSearchQuery = ''; }}>
                        Effacer la recherche
                    </button>
                </div>
            ` : html`
                <!-- Transcript Content -->
                <div class="transcript-list" style="
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: 500px;
                    overflow-y: auto;
                    padding-right: 8px;
                ">
                    ${filteredTranscripts.map((entry, index) => {
                        const speaker = entry.speaker_name || entry.speaker || `Speaker ${entry.speaker_id ?? index}`;
                        const speakerId = entry.speaker_id ?? index;
                        const speakerColor = this._getSpeakerColor(speakerId);
                        const time = this._formatTranscriptTime(entry.timestamp || entry.start_time);
                        const text = entry.text || entry.transcript || '';

                        return html`
                            <div class="transcript-entry" style="
                                background: var(--color-black-20);
                                border-radius: 8px;
                                padding: 12px;
                                border-left: 3px solid ${speakerColor};
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <span style="
                                        font-weight: 600;
                                        font-size: 12px;
                                        color: ${speakerColor};
                                    ">
                                        👤 ${this._highlightSearchMatch(speaker, query)}
                                    </span>
                                    <span style="
                                        font-size: 10px;
                                        color: var(--color-white-50);
                                        font-family: monospace;
                                    ">
                                        ${time}
                                    </span>
                                </div>
                                <p style="
                                    margin: 0;
                                    font-size: 12px;
                                    line-height: 1.5;
                                    color: var(--color-white-85);
                                ">
                                    ${this._highlightSearchMatch(text, query)}
                                </p>
                            </div>
                        `;
                    })}
                </div>
            `}

            <!-- Transcript Stats -->
            <div class="summary-section" style="
                background: var(--color-black-10);
                border-radius: 6px;
                padding: 12px;
                margin-top: 16px;
                display: flex;
                justify-content: space-around;
            ">
                <div style="text-align: center;">
                    <div style="font-size: 18px; font-weight: 600; color: var(--color-white-90);">
                        ${this.transcripts.length}
                    </div>
                    <div style="font-size: 10px; color: var(--color-white-50);">Entrées</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 18px; font-weight: 600; color: var(--color-white-90);">
                        ${this._getUniqueSpeakersCount()}
                    </div>
                    <div style="font-size: 10px; color: var(--color-white-50);">Speakers</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 18px; font-weight: 600; color: var(--color-white-90);">
                        ${this._getTotalWordCount()}
                    </div>
                    <div style="font-size: 10px; color: var(--color-white-50);">Mots</div>
                </div>
            </div>
        `;
    }

    /**
     * Phase 4: Highlight search matches in text
     */
    _highlightSearchMatch(text, query) {
        if (!query || !text) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        // Split text into parts: before, match, after
        const before = text.slice(0, index);
        const match = text.slice(index, index + query.length);
        const after = text.slice(index + query.length);

        return html`${before}<span class="search-highlight">${match}</span>${this._highlightSearchMatch(after, query)}`;
    }

    /**
     * Phase 5: Get unique speakers count from transcripts
     */
    _getUniqueSpeakersCount() {
        const speakers = new Set(this.transcripts.map(t => t.speaker_id ?? t.speaker ?? 'unknown'));
        return speakers.size;
    }

    /**
     * Phase 5: Get total word count from transcripts
     */
    _getTotalWordCount() {
        return this.transcripts.reduce((count, entry) => {
            const text = entry.text || entry.transcript || '';
            return count + text.split(/\s+/).filter(w => w.length > 0).length;
        }, 0);
    }

    _parseNoteData(meetingNotes) {
        // Phase 4: Enhanced data parsing with all Phase 2/3 fields
        const data = {
            executiveSummary: '',
            meetingType: 'general',
            objectives: [],
            participants: [],
            keyPoints: [],
            decisions: [],
            actionItems: [],
            risks: [],
            timeline: [],
            unresolvedItems: [],
            nextSteps: [],
            importantQuotes: [],
            metadata: null
        };

        try {
            data.executiveSummary = meetingNotes.executive_summary || '';
            data.meetingType = meetingNotes.meeting_type || 'general';

            // Parse JSON fields safely
            const safeJsonParse = (field, fallback = []) => {
                if (!field) return fallback;
                if (Array.isArray(field)) return field;
                try {
                    return JSON.parse(field);
                } catch {
                    return fallback;
                }
            };

            data.objectives = safeJsonParse(meetingNotes.objectives);
            data.participants = safeJsonParse(meetingNotes.participants);
            data.keyPoints = safeJsonParse(meetingNotes.key_points);
            data.decisions = safeJsonParse(meetingNotes.decisions);
            data.actionItems = safeJsonParse(meetingNotes.action_items);
            data.risks = safeJsonParse(meetingNotes.risks);
            data.timeline = safeJsonParse(meetingNotes.timeline);
            data.unresolvedItems = safeJsonParse(meetingNotes.unresolved_items);
            data.nextSteps = safeJsonParse(meetingNotes.next_steps);
            data.importantQuotes = safeJsonParse(meetingNotes.important_quotes);

            // Phase 4: Enhanced metadata with quality score
            data.metadata = {
                model: meetingNotes.model_used,
                tokensUsed: meetingNotes.tokens_used,
                qualityScore: meetingNotes.quality_score || null,
                generatedAt: meetingNotes.generated_at || meetingNotes.created_at,
                preprocessedCount: meetingNotes.preprocessed_count,
                transcriptCount: meetingNotes.transcript_count
            };
        } catch (error) {
            console.error('[PostMeetingPanel] Error parsing note data:', error);
        }

        return data;
    }

    /**
     * Phase 4: Get quality score CSS class
     */
    _getQualityScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    /**
     * Phase 4: Get quality score icon
     */
    _getQualityScoreIcon(score) {
        if (score >= 80) return '⭐';
        if (score >= 60) return '✓';
        if (score >= 40) return '○';
        return '△';
    }

    /**
     * Phase 4: Get meeting type icon
     */
    _getMeetingTypeIcon(type) {
        const icons = {
            'standup': '🧍',
            'brainstorming': '💡',
            'planning': '📋',
            'review': '🔍',
            'retrospective': '🔄',
            'one-on-one': '👥',
            'interview': '🎤',
            'presentation': '📊',
            'workshop': '🛠️',
            'training': '📚',
            'general': '📝'
        };
        return icons[type] || icons['general'];
    }

    /**
     * Phase 4: Get meeting type label in French
     */
    _getMeetingTypeLabel(type) {
        const labels = {
            'standup': 'Daily/Standup',
            'brainstorming': 'Brainstorming',
            'planning': 'Planification',
            'review': 'Revue',
            'retrospective': 'Rétrospective',
            'one-on-one': 'One-on-One',
            'interview': 'Entretien',
            'presentation': 'Présentation',
            'workshop': 'Atelier',
            'training': 'Formation',
            'general': 'Général'
        };
        return labels[type] || type;
    }

    render() {
        return html`
            <div class="panel-container">
                <div class="panel-header">
                    <h2 class="panel-title">📋 Compte-rendu de réunion</h2>
                    <button class="close-button" @click=${this.handleClose}>✕</button>
                </div>

                <!-- Phase 2.1: Session History Selector -->
                ${this.allSessions.length > 1 ? html`
                    <div class="session-selector">
                        <label>📂 Session:</label>
                        <select class="session-dropdown" @change=${this.handleSessionChange}>
                            ${this.allSessions.map(session => html`
                                <option
                                    value=${session.session_id}
                                    ?selected=${session.session_id === this.sessionId}
                                >
                                    ${this._formatSessionDate(session.created_at)}
                                    ${session.meeting_type && session.meeting_type !== 'general'
                                        ? ` - ${this._getMeetingTypeLabel(session.meeting_type)}`
                                        : ''}
                                </option>
                            `)}
                        </select>
                    </div>
                ` : ''}

                <div class="tabs">
                    <button
                        class="tab ${this.activeTab === 'overview' ? 'active' : ''}"
                        @click=${() => this.activeTab = 'overview'}
                    >
                        📋 Overview
                    </button>
                    <button
                        class="tab ${this.activeTab === 'transcript' ? 'active' : ''}"
                        @click=${() => { this.activeTab = 'transcript'; this.loadTranscripts(); }}
                    >
                        📜 Transcript
                    </button>
                    <button
                        class="tab ${this.activeTab === 'tasks' ? 'active' : ''}"
                        @click=${() => this.activeTab = 'tasks'}
                    >
                        ✅ Tasks${this.tasks.length > 0 ? ` (${this.tasks.length})` : ''}
                    </button>
                    <button
                        class="tab ${this.activeTab === 'export' ? 'active' : ''}"
                        @click=${() => this.activeTab = 'export'}
                    >
                        💾 Export
                    </button>
                </div>

                <div class="panel-content">
                    <!-- FIX-U2: Message with optional "Open folder" button -->
                    ${this.message ? html`
                        <div class="message ${this.message.type}">
                            ${this.showOpenFolderButton && this.message.type === 'success' ? html`
                                <div class="message-with-actions">
                                    <div>
                                        <span class="message-text">${this.message.text}</span>
                                        <!-- IMP-U3: Display full path -->
                                        ${this.lastExportPath ? html`
                                            <div class="message-path" @click=${this.handleOpenExportFolder}>
                                                ${this.lastExportPath}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="message-actions">
                                        <button
                                            class="open-folder-btn"
                                            @click=${this.handleOpenExportFolder}
                                            title="Ouvrir le dossier contenant le fichier"
                                        >
                                            📂 Ouvrir dossier
                                        </button>
                                        <button
                                            class="dismiss-btn"
                                            @click=${this.dismissExportMessage}
                                            title="Fermer"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ` : this.message.text}
                        </div>
                    ` : ''}

                    <!-- Phase 2.2: Progress Indicator during generation -->
                    ${this.isGenerating && this.generationProgress ? html`
                        <div class="progress-container">
                            <div class="progress-spinner"></div>
                            <div class="progress-steps">
                                ${[1, 2, 3, 4].map(step => html`
                                    <div class="progress-step ${
                                        step < this.generationProgress.step ? 'completed' :
                                        step === this.generationProgress.step ? 'active' : ''
                                    }"></div>
                                `)}
                            </div>
                            <div class="progress-message">
                                ${this.generationProgress.message}
                            </div>
                            <div style="font-size: 10px; color: var(--color-white-40); margin-top: 8px;">
                                Étape ${this.generationProgress.step} / ${this.generationProgress.total}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Phase 2.3: Error State with Retry -->
                    ${this.lastError ? html`
                        <div class="error-container">
                            <div class="error-icon">❌</div>
                            <div class="error-title">Échec de la génération</div>
                            <div class="error-message">${this.lastError.message}</div>
                            ${this.lastError.canRetry ? html`
                                <button class="retry-button" @click=${this.handleRetry}>
                                    🔄 Réessayer
                                </button>
                            ` : html`
                                <button class="retry-button" @click=${this.handleClose} style="background: var(--color-white-20);">
                                    Fermer
                                </button>
                            `}
                        </div>
                    ` : ''}

                    ${this.isLoading && !this.isGenerating ? html`
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <p>Chargement...</p>
                        </div>
                    ` : ''}

                    ${!this.isLoading && !this.isGenerating && !this.lastError ? html`
                        ${this.activeTab === 'overview' ? this.renderOverviewTab() : ''}
                        ${this.activeTab === 'transcript' ? this.renderTranscriptTab() : ''}
                        ${this.activeTab === 'tasks' ? this.renderTasksTab() : ''}
                        ${this.activeTab === 'export' ? this.renderExportTab() : ''}
                    ` : ''}
                </div>
            </div>

            ${this.showParticipantModal ? html`
                <participant-modal
                    .sessionId=${this.sessionId}
                    @close=${this.handleCloseParticipantModal}
                    @save=${this.handleParticipantsSaved}
                ></participant-modal>
            ` : ''}

            ${this.showEmailModal ? html`
                <email-preview-modal
                    .sessionId=${this.sessionId}
                    .emailData=${this.currentEmailData}
                    .isLoading=${this.isGeneratingEmail}
                    @close=${this.handleCloseEmailModal}
                ></email-preview-modal>
            ` : ''}
        `;
    }
}

customElements.define('post-meeting-panel', PostMeetingPanel);
