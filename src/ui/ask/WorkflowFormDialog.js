import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Workflow Form Dialog Component
 * Displays a guided form for workflows that require user input
 * Phase 1: Structured Workflows Audit Fix
 */
export class WorkflowFormDialog extends LitElement {
    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-sizing: border-box;
        }

        :host {
            display: block;
        }

        .overlay {
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
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .dialog {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease-out;
        }

        .dialog-header {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .workflow-icon {
            font-size: 28px;
        }

        .header-content {
            flex: 1;
        }

        .dialog-title {
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin: 0;
        }

        .dialog-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 4px;
        }

        .close-button {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 8px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.7);
            font-size: 18px;
            transition: all 0.2s;
        }

        .close-button:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .dialog-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        .form-intro {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 20px;
            line-height: 1.5;
        }

        .form-field {
            margin-bottom: 20px;
        }

        .field-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
        }

        .field-label .required {
            color: #ff6b6b;
            margin-left: 4px;
        }

        .field-input,
        .field-select,
        .field-textarea {
            width: 100%;
            padding: 12px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            transition: all 0.2s;
        }

        .field-input:focus,
        .field-select:focus,
        .field-textarea:focus {
            outline: none;
            border-color: rgba(100, 150, 255, 0.5);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.1);
        }

        .field-input::placeholder,
        .field-textarea::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .field-select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.5)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
        }

        .field-select option {
            background: #1a1a2e;
            color: white;
        }

        .field-textarea {
            min-height: 100px;
            resize: vertical;
            line-height: 1.5;
        }

        /* Multiselect styles */
        .multiselect-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .multiselect-option {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
        }

        .multiselect-option:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.25);
        }

        .multiselect-option.selected {
            background: rgba(100, 150, 255, 0.2);
            border-color: rgba(100, 150, 255, 0.5);
            color: white;
        }

        .multiselect-option .checkmark {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            transition: all 0.2s;
        }

        .multiselect-option.selected .checkmark {
            background: rgba(100, 150, 255, 0.8);
            border-color: rgba(100, 150, 255, 0.8);
        }

        .field-error {
            font-size: 12px;
            color: #ff6b6b;
            margin-top: 6px;
        }

        .dialog-footer {
            padding: 16px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        .btn-cancel {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }

        .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.15);
            color: white;
        }

        .btn-submit {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .estimated-time {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-right: auto;
        }
    `;

    static properties = {
        workflow: { type: Object },
        formFields: { type: Array },
        formData: { type: Object, state: true },
        errors: { type: Object, state: true },
        isVisible: { type: Boolean }
    };

    constructor() {
        super();
        this.workflow = null;
        this.formFields = [];
        this.formData = {};
        this.errors = {};
        this.isVisible = false;
    }

    /**
     * Open the dialog with a workflow
     * @param {Object} workflow - Workflow object with formFields
     * @param {Array} formFields - Form fields array
     */
    open(workflow, formFields) {
        this.workflow = workflow;
        this.formFields = formFields || [];
        this.formData = {};
        this.errors = {};
        this.isVisible = true;

        // Initialize formData with empty values
        this.formFields.forEach(field => {
            if (field.type === 'multiselect') {
                this.formData[field.name] = [];
            } else {
                this.formData[field.name] = '';
            }
        });

        console.log('[WorkflowFormDialog] Opened for workflow:', workflow.id, 'with', formFields.length, 'fields');
    }

    /**
     * Close the dialog
     */
    close() {
        this.isVisible = false;
        this.dispatchEvent(new CustomEvent('dialog-closed', {
            bubbles: true,
            composed: true
        }));
    }

    /**
     * Handle input change
     */
    handleInputChange(fieldName, value) {
        this.formData = { ...this.formData, [fieldName]: value };
        // Clear error when user types
        if (this.errors[fieldName]) {
            this.errors = { ...this.errors, [fieldName]: null };
        }
    }

    /**
     * Handle multiselect toggle
     */
    handleMultiselectToggle(fieldName, option) {
        const currentValues = this.formData[fieldName] || [];
        const newValues = currentValues.includes(option)
            ? currentValues.filter(v => v !== option)
            : [...currentValues, option];

        this.formData = { ...this.formData, [fieldName]: newValues };

        // Clear error when user selects
        if (this.errors[fieldName]) {
            this.errors = { ...this.errors, [fieldName]: null };
        }
    }

    /**
     * Validate form data
     * @returns {boolean} True if valid
     */
    validateForm() {
        const newErrors = {};
        let isValid = true;

        this.formFields.forEach(field => {
            if (field.required) {
                const value = this.formData[field.name];

                if (field.type === 'multiselect') {
                    if (!value || value.length === 0) {
                        newErrors[field.name] = 'Veuillez sélectionner au moins une option';
                        isValid = false;
                    }
                } else if (!value || value.trim() === '') {
                    newErrors[field.name] = 'Ce champ est requis';
                    isValid = false;
                }
            }
        });

        this.errors = newErrors;
        return isValid;
    }

    /**
     * Handle form submission
     */
    handleSubmit() {
        if (!this.validateForm()) {
            console.log('[WorkflowFormDialog] Validation failed:', this.errors);
            return;
        }

        // Format multiselect values as comma-separated strings for the prompt
        const formattedData = {};
        for (const [key, value] of Object.entries(this.formData)) {
            if (Array.isArray(value)) {
                formattedData[key] = value.join(', ');
            } else {
                formattedData[key] = value;
            }
        }

        console.log('[WorkflowFormDialog] Submitting form data:', formattedData);

        this.dispatchEvent(new CustomEvent('form-submitted', {
            detail: {
                workflow: this.workflow,
                formData: formattedData
            },
            bubbles: true,
            composed: true
        }));

        this.close();
    }

    /**
     * Handle overlay click (close on outside click)
     */
    handleOverlayClick(e) {
        if (e.target.classList.contains('overlay')) {
            this.close();
        }
    }

    /**
     * Render a form field based on its type
     */
    renderField(field) {
        const error = this.errors[field.name];

        switch (field.type) {
            case 'text':
                return html`
                    <div class="form-field">
                        <label class="field-label">
                            ${field.label}
                            ${field.required ? html`<span class="required">*</span>` : ''}
                        </label>
                        <input
                            type="text"
                            class="field-input"
                            placeholder="${field.placeholder || ''}"
                            .value="${this.formData[field.name] || ''}"
                            @input="${(e) => this.handleInputChange(field.name, e.target.value)}"
                        />
                        ${error ? html`<div class="field-error">${error}</div>` : ''}
                    </div>
                `;

            case 'number':
                return html`
                    <div class="form-field">
                        <label class="field-label">
                            ${field.label}
                            ${field.required ? html`<span class="required">*</span>` : ''}
                        </label>
                        <input
                            type="number"
                            class="field-input"
                            placeholder="${field.placeholder || ''}"
                            .value="${this.formData[field.name] || ''}"
                            @input="${(e) => this.handleInputChange(field.name, e.target.value)}"
                        />
                        ${error ? html`<div class="field-error">${error}</div>` : ''}
                    </div>
                `;

            case 'select':
                return html`
                    <div class="form-field">
                        <label class="field-label">
                            ${field.label}
                            ${field.required ? html`<span class="required">*</span>` : ''}
                        </label>
                        <select
                            class="field-select"
                            .value="${this.formData[field.name] || ''}"
                            @change="${(e) => this.handleInputChange(field.name, e.target.value)}"
                        >
                            <option value="">Sélectionnez...</option>
                            ${field.options?.map(option => html`
                                <option value="${option}" ?selected="${this.formData[field.name] === option}">
                                    ${option}
                                </option>
                            `)}
                        </select>
                        ${error ? html`<div class="field-error">${error}</div>` : ''}
                    </div>
                `;

            case 'multiselect':
                const selectedValues = this.formData[field.name] || [];
                return html`
                    <div class="form-field">
                        <label class="field-label">
                            ${field.label}
                            ${field.required ? html`<span class="required">*</span>` : ''}
                        </label>
                        <div class="multiselect-container">
                            ${field.options?.map(option => html`
                                <div
                                    class="multiselect-option ${selectedValues.includes(option) ? 'selected' : ''}"
                                    @click="${() => this.handleMultiselectToggle(field.name, option)}"
                                >
                                    <span class="checkmark">${selectedValues.includes(option) ? '✓' : ''}</span>
                                    ${option}
                                </div>
                            `)}
                        </div>
                        ${error ? html`<div class="field-error">${error}</div>` : ''}
                    </div>
                `;

            case 'textarea':
                return html`
                    <div class="form-field">
                        <label class="field-label">
                            ${field.label}
                            ${field.required ? html`<span class="required">*</span>` : ''}
                        </label>
                        <textarea
                            class="field-textarea"
                            placeholder="${field.placeholder || ''}"
                            .value="${this.formData[field.name] || ''}"
                            @input="${(e) => this.handleInputChange(field.name, e.target.value)}"
                        ></textarea>
                        ${error ? html`<div class="field-error">${error}</div>` : ''}
                    </div>
                `;

            default:
                // Default to text input
                return html`
                    <div class="form-field">
                        <label class="field-label">
                            ${field.label}
                            ${field.required ? html`<span class="required">*</span>` : ''}
                        </label>
                        <input
                            type="text"
                            class="field-input"
                            placeholder="${field.placeholder || ''}"
                            .value="${this.formData[field.name] || ''}"
                            @input="${(e) => this.handleInputChange(field.name, e.target.value)}"
                        />
                        ${error ? html`<div class="field-error">${error}</div>` : ''}
                    </div>
                `;
        }
    }

    render() {
        if (!this.isVisible || !this.workflow) {
            return html``;
        }

        return html`
            <div class="overlay" @click="${this.handleOverlayClick}">
                <div class="dialog">
                    <div class="dialog-header">
                        <span class="workflow-icon">${this.workflow.icon || '📋'}</span>
                        <div class="header-content">
                            <h2 class="dialog-title">${this.workflow.title}</h2>
                            <div class="dialog-subtitle">${this.workflow.description}</div>
                        </div>
                        <button class="close-button" @click="${this.close}" title="Fermer">✕</button>
                    </div>

                    <div class="dialog-body">
                        <div class="form-intro">
                            Remplissez les informations ci-dessous pour personnaliser votre document.
                            Les champs marqués d'un <span style="color: #ff6b6b;">*</span> sont obligatoires.
                        </div>

                        ${this.formFields.map(field => this.renderField(field))}
                    </div>

                    <div class="dialog-footer">
                        ${this.workflow.estimatedTime ? html`
                            <div class="estimated-time">
                                <span>⏱️</span>
                                <span>${this.workflow.estimatedTime}</span>
                            </div>
                        ` : ''}
                        <button class="btn btn-cancel" @click="${this.close}">Annuler</button>
                        <button class="btn btn-submit" @click="${this.handleSubmit}">
                            Générer le document
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('workflow-form-dialog', WorkflowFormDialog);
