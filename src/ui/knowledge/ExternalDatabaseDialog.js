import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class ExternalDatabaseDialog extends LitElement {
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

        .dialog-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 32px;
            box-sizing: border-box;
        }

        .dialog-header {
            margin-bottom: 24px;
        }

        .dialog-title {
            font-size: 24px;
            font-weight: 600;
            color: white;
            margin: 0 0 8px 0;
        }

        .dialog-subtitle {
            font-size: 14px;
            color: var(--color-white-60);
            margin: 0;
        }

        .form-container {
            flex: 1;
            overflow-y: auto;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--color-white-80);
            margin-bottom: 8px;
        }

        .form-label .required {
            color: rgba(255, 59, 48, 0.8);
            margin-left: 4px;
        }

        .form-input {
            width: 100%;
            background: var(--color-black-20);
            border: 1px solid var(--color-white-20);
            color: white;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.15s ease;
        }

        .form-input::placeholder {
            color: var(--color-white-40);
        }

        .form-input:focus {
            outline: none;
            border-color: rgba(0, 122, 255, 0.6);
        }

        .form-input.error {
            border-color: rgba(255, 59, 48, 0.6);
        }

        .form-help {
            font-size: 11px;
            color: var(--color-white-50);
            margin-top: 4px;
        }

        .form-error {
            font-size: 12px;
            color: rgba(255, 59, 48, 0.9);
            margin-top: 6px;
        }

        .test-result {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .test-result.success {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid rgba(0, 255, 0, 0.3);
            color: rgba(0, 255, 0, 0.9);
        }

        .test-result.error {
            background: rgba(255, 59, 48, 0.1);
            border: 1px solid rgba(255, 59, 48, 0.3);
            color: rgba(255, 59, 48, 0.9);
        }

        .test-result.testing {
            background: rgba(255, 200, 0, 0.1);
            border: 1px solid rgba(255, 200, 0, 0.3);
            color: rgba(255, 200, 0, 0.9);
        }

        .test-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 200, 0, 0.3);
            border-top: 2px solid rgba(255, 200, 0, 0.9);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid var(--color-white-10);
        }

        .btn {
            flex: 1;
            background: var(--color-white-10);
            border: 1px solid var(--color-white-20);
            border-radius: 8px;
            color: white;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn:hover {
            background: var(--color-white-15);
            border-color: var(--color-white-30);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn.primary {
            background: rgba(0, 122, 255, 0.2);
            border-color: rgba(0, 122, 255, 0.4);
            color: rgba(0, 122, 255, 0.9);
        }

        .btn.primary:hover {
            background: rgba(0, 122, 255, 0.3);
            border-color: rgba(0, 122, 255, 0.6);
        }

        .btn.success {
            background: rgba(0, 255, 0, 0.2);
            border-color: rgba(0, 255, 0, 0.4);
            color: rgba(0, 255, 0, 0.9);
        }

        .btn.success:hover {
            background: rgba(0, 255, 0, 0.3);
            border-color: rgba(0, 255, 0, 0.6);
        }

        .preset-buttons {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
        }

        .preset-btn {
            padding: 8px 16px;
            background: var(--color-white-05);
            border: 1px solid var(--color-white-15);
            border-radius: 6px;
            color: var(--color-white-70);
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .preset-btn:hover {
            background: var(--color-white-10);
            color: white;
        }
    `;

    static properties = {
        config: { type: Object, state: true },
        errors: { type: Object, state: true },
        testResult: { type: Object, state: true },
        testing: { type: Boolean, state: true },
        connectionName: { type: String, state: true }
    };

    constructor() {
        super();
        this.config = {
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: ''
        };
        this.errors = {};
        this.testResult = null;
        this.testing = false;
        this.connectionName = '';
    }

    handleInputChange(field, value) {
        this.config = { ...this.config, [field]: value };
        // Clear error for this field
        if (this.errors[field]) {
            this.errors = { ...this.errors, [field]: null };
        }
        // Clear test result when config changes
        this.testResult = null;
    }

    validateForm() {
        const errors = {};
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];

        requiredFields.forEach(field => {
            if (!this.config[field] || this.config[field].trim() === '') {
                errors[field] = 'Ce champ est requis';
            }
        });

        // Validate projectId format
        if (this.config.projectId && !/^[a-z0-9-]+$/.test(this.config.projectId)) {
            errors.projectId = 'Format invalide (lettres minuscules, chiffres et tirets uniquement)';
        }

        this.errors = errors;
        return Object.keys(errors).length === 0;
    }

    async handleTest() {
        console.log('[ExternalDatabaseDialog] Testing connection...');

        if (!this.validateForm()) {
            return;
        }

        this.testing = true;
        this.testResult = null;

        try {
            const result = await window.api.knowledge.testExternalConnection(this.config);

            if (result.success) {
                this.testResult = {
                    type: 'success',
                    message: `✓ Connexion réussie ! ${result.documentsCount || 0} documents trouvés.`
                };
            } else {
                this.testResult = {
                    type: 'error',
                    message: `✗ Échec : ${result.error}`
                };
            }
        } catch (error) {
            console.error('[ExternalDatabaseDialog] Test error:', error);
            this.testResult = {
                type: 'error',
                message: `✗ Erreur : ${error.message}`
            };
        } finally {
            this.testing = false;
        }
    }

    async handleConnect() {
        console.log('[ExternalDatabaseDialog] Connecting to external database...');

        if (!this.validateForm()) {
            return;
        }

        // If not tested yet, test first
        if (!this.testResult || this.testResult.type !== 'success') {
            await this.handleTest();
            if (this.testResult.type !== 'success') {
                return;
            }
        }

        try {
            const configWithName = {
                ...this.config,
                name: this.connectionName || `Base ${this.config.projectId}`
            };

            const result = await window.api.knowledge.connectExternal(configWithName);

            if (result.success) {
                alert('Connexion établie avec succès !');
                this.handleCancel();
            } else {
                this.testResult = {
                    type: 'error',
                    message: `✗ Échec : ${result.error}`
                };
            }
        } catch (error) {
            console.error('[ExternalDatabaseDialog] Connection error:', error);
            this.testResult = {
                type: 'error',
                message: `✗ Erreur : ${error.message}`
            };
        }
    }

    handleCancel() {
        if (window.api && window.api.knowledge && window.api.knowledge.closeExternalDialog) {
            window.api.knowledge.closeExternalDialog();
        }
    }

    loadPreset(presetName) {
        // Example preset for lucide-dream (from user's config)
        const presets = {
            'lucide-dream': {
                apiKey: 'AIzaSyCx3PsRdL_E4YkL9eK_DdN7FVaE8VxLjgE',
                authDomain: 'lucide-dream.firebaseapp.com',
                projectId: 'lucide-dream',
                storageBucket: 'lucide-dream.firebasestorage.app',
                messagingSenderId: '498743095028',
                appId: '1:498743095028:web:81d25fbe37e06e82d2f7de'
            }
        };

        if (presets[presetName]) {
            this.config = { ...presets[presetName] };
            this.testResult = null;
        }
    }

    render() {
        return html`
            <div class="dialog-container">
                <div class="dialog-header">
                    <h1 class="dialog-title">🔗 Connecter une Base Externe</h1>
                    <p class="dialog-subtitle">
                        Entrez la configuration Firebase pour vous connecter à une base de données externe
                    </p>
                </div>

                ${this.testResult ? html`
                    <div class="test-result ${this.testResult.type}">
                        ${this.testResult.type === 'testing' ? html`
                            <div class="test-spinner"></div>
                        ` : ''}
                        <span>${this.testResult.message}</span>
                    </div>
                ` : ''}

                <div class="preset-buttons">
                    <button class="preset-btn" @click=${() => this.loadPreset('lucide-dream')}>
                        Charger config Lucide Dream
                    </button>
                </div>

                <div class="form-container">
                    <div class="form-group">
                        <label class="form-label">
                            Nom de la connexion
                        </label>
                        <input
                            type="text"
                            class="form-input"
                            placeholder="Ex: Base Externe, Projet X..."
                            .value=${this.connectionName}
                            @input=${(e) => this.connectionName = e.target.value}
                        />
                        <div class="form-help">Nom pour identifier cette connexion</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            API Key <span class="required">*</span>
                        </label>
                        <input
                            type="password"
                            class="form-input ${this.errors.apiKey ? 'error' : ''}"
                            placeholder="AIzaSy..."
                            .value=${this.config.apiKey}
                            @input=${(e) => this.handleInputChange('apiKey', e.target.value)}
                        />
                        ${this.errors.apiKey ? html`
                            <div class="form-error">${this.errors.apiKey}</div>
                        ` : ''}
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            Auth Domain <span class="required">*</span>
                        </label>
                        <input
                            type="text"
                            class="form-input ${this.errors.authDomain ? 'error' : ''}"
                            placeholder="projet.firebaseapp.com"
                            .value=${this.config.authDomain}
                            @input=${(e) => this.handleInputChange('authDomain', e.target.value)}
                        />
                        ${this.errors.authDomain ? html`
                            <div class="form-error">${this.errors.authDomain}</div>
                        ` : ''}
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            Project ID <span class="required">*</span>
                        </label>
                        <input
                            type="text"
                            class="form-input ${this.errors.projectId ? 'error' : ''}"
                            placeholder="mon-projet"
                            .value=${this.config.projectId}
                            @input=${(e) => this.handleInputChange('projectId', e.target.value)}
                        />
                        ${this.errors.projectId ? html`
                            <div class="form-error">${this.errors.projectId}</div>
                        ` : html`
                            <div class="form-help">Lettres minuscules, chiffres et tirets uniquement</div>
                        `}
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            Storage Bucket
                        </label>
                        <input
                            type="text"
                            class="form-input"
                            placeholder="projet.firebasestorage.app"
                            .value=${this.config.storageBucket}
                            @input=${(e) => this.handleInputChange('storageBucket', e.target.value)}
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            Messaging Sender ID
                        </label>
                        <input
                            type="text"
                            class="form-input"
                            placeholder="1234567890"
                            .value=${this.config.messagingSenderId}
                            @input=${(e) => this.handleInputChange('messagingSenderId', e.target.value)}
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            App ID <span class="required">*</span>
                        </label>
                        <input
                            type="text"
                            class="form-input ${this.errors.appId ? 'error' : ''}"
                            placeholder="1:123456:web:abc123"
                            .value=${this.config.appId}
                            @input=${(e) => this.handleInputChange('appId', e.target.value)}
                        />
                        ${this.errors.appId ? html`
                            <div class="form-error">${this.errors.appId}</div>
                        ` : ''}
                    </div>
                </div>

                <div class="actions">
                    <button class="btn" @click=${this.handleCancel}>
                        Annuler
                    </button>
                    <button
                        class="btn primary"
                        @click=${this.handleTest}
                        ?disabled=${this.testing}
                    >
                        ${this.testing ? 'Test en cours...' : 'Tester la Connexion'}
                    </button>
                    <button
                        class="btn success"
                        @click=${this.handleConnect}
                        ?disabled=${this.testing || !this.testResult || this.testResult.type !== 'success'}
                    >
                        Connecter
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('external-database-dialog', ExternalDatabaseDialog);
