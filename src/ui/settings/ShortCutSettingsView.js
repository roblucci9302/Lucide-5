import { html, css, LitElement } from '../../ui/assets/lit-core-2.7.4.min.js';
import { TranslationMixin } from '../i18n/useTranslation.js';

const commonSystemShortcuts = new Set([
    'Cmd+Q', 'Cmd+W', 'Cmd+A', 'Cmd+S', 'Cmd+Z', 'Cmd+X', 'Cmd+C', 'Cmd+V', 'Cmd+P', 'Cmd+F', 'Cmd+G', 'Cmd+H', 'Cmd+M', 'Cmd+N', 'Cmd+O', 'Cmd+T',
    'Ctrl+Q', 'Ctrl+W', 'Ctrl+A', 'Ctrl+S', 'Ctrl+Z', 'Ctrl+X', 'Ctrl+C', 'Ctrl+V', 'Ctrl+P', 'Ctrl+F', 'Ctrl+G', 'Ctrl+H', 'Ctrl+M', 'Ctrl+N', 'Ctrl+O', 'Ctrl+T'
]);

const displayNameMap = {
    nextStep: 'Ask Anything',
    moveUp: 'Move Up Window',
    moveDown: 'Move Down Window',
    scrollUp: 'Scroll Up Response',
    scrollDown: 'Scroll Down Response',
    openBrowser: 'Open Browser',
  };

export class ShortcutSettingsView extends TranslationMixin(LitElement) {
    static styles = css`
        * { font-family:var(--font-family-primary);
            cursor:default; user-select:none; box-sizing:border-box; }

        :host { display:flex; width:100%; height:100%; color:white; }

        .container { display:flex; flex-direction:column; height:100%;
            background:color-mix(in srgb, var(--color-gray-900) 90%, transparent); border-radius:var(--radius-lg);
            outline:.5px var(--color-white-20) solid; outline-offset:-1px;
            position:relative; overflow:hidden; padding:12px; }

        .close-button{position:absolute;top:10px;right:10px;inline-size:14px;block-size:14px;
            background:var(--color-white-10);border:none;border-radius:var(--radius-sm);
            color:var(--color-white-70);display:grid;place-items:center;
            font-size:14px;line-height:0;cursor:pointer;transition:var(--transition-fast);z-index:10;}
        .close-button:hover{background:var(--color-white-20);color:var(--color-white-90);}

        .title{font-size:14px;font-weight:500;margin:0 0 8px;padding-bottom:8px;
            border-bottom:1px solid var(--color-white-10);text-align:center;}

        .scroll-area{flex:1 1 auto;overflow-y:auto;margin:0 -4px;padding:4px;}

        .shortcut-entry{display:flex;align-items:center;width:100%;gap:8px;
            margin-bottom:8px;font-size:12px;padding:4px;}
        .shortcut-name{flex:1 1 auto;color:var(--color-white-90);font-weight:300;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

        .action-btn{background:none;border:none;color:color-mix(in srgb, var(--color-primary-500) 80%, transparent);
            font-size:11px;padding:0 4px;cursor:pointer;transition:var(--transition-fast);}
        .action-btn:hover{color:var(--color-primary-400);text-decoration:underline;}

        .shortcut-input{inline-size:120px;background:var(--color-black-20);
            border:1px solid var(--color-white-20);border-radius:var(--radius-sm);
            padding:4px 6px;font:11px var(--font-family-mono);
            color:white;text-align:right;cursor:text;margin-left:auto;}
        .shortcut-input:focus,.shortcut-input.capturing{
            outline:none;border-color:color-mix(in srgb, var(--color-primary-500) 60%, transparent);
            box-shadow:0 0 0 1px color-mix(in srgb, var(--color-primary-500) 30%, transparent);}

        .feedback{font-size:10px;margin-top:2px;min-height:12px;}
        .feedback.error{color:var(--color-error-500);}
        .feedback.success{color:var(--color-success-500);}

        .actions{display:flex;gap:4px;padding-top:8px;border-top:1px solid var(--color-white-10);}
        .settings-button{flex:1;background:var(--color-white-10);
            border:1px solid var(--color-white-20);border-radius:var(--radius-sm);
            color:white;padding:5px 10px;font-size:11px;cursor:pointer;transition:var(--transition-fast);}
        .settings-button:hover{background:var(--color-white-15);}
        .settings-button.primary{background:color-mix(in srgb, var(--color-primary-500) 25%, transparent);border-color:color-mix(in srgb, var(--color-primary-500) 60%, transparent);}
        .settings-button.primary:hover{background:color-mix(in srgb, var(--color-primary-500) 35%, transparent);}
        .settings-button.danger{background:color-mix(in srgb, var(--color-error-500) 10%, transparent);border-color:color-mix(in srgb, var(--color-error-500) 30%, transparent);
            color:color-mix(in srgb, var(--color-error-500) 90%, transparent);}
        .settings-button.danger:hover{background:color-mix(in srgb, var(--color-error-500) 15%, transparent);
        }

        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) {
          animation: none !important;
          transition: none !important;
          transform: none !important;
          will-change: auto !important;
        }
        :host-context(body.has-glass) * {
          background: transparent !important;   /* Transparence demandée */
          filter: none !important;
          backdrop-filter: none !important;
          box-shadow: none !important;
          outline: none !important;
          border: none !important;
          border-radius: 0 !important;
          transition: none !important;
          animation: none !important;
        }
    `;

    static properties = {
        shortcuts: { type: Object, state: true },
        isLoading: { type: Boolean, state: true },
        capturingKey: { type: String, state: true },
        feedback:   { type:Object, state:true }
    };

    constructor() {
        super();
        this.shortcuts = {};
        this.feedback = {};
        this.isLoading = true;
        this.capturingKey = null;
    }

    connectedCallback() {
        super.connectedCallback();
        if (!window.api) return;
        this.loadShortcutsHandler = (event, keybinds) => {
            this.shortcuts = keybinds;
            this.isLoading = false;
        };
        window.api.shortcutSettingsView.onLoadShortcuts(this.loadShortcutsHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api && this.loadShortcutsHandler) {
            window.api.shortcutSettingsView.removeOnLoadShortcuts(this.loadShortcutsHandler);
        }
    }

    handleKeydown(e, shortcutKey){
        e.preventDefault(); e.stopPropagation();
        const result = this._parseAccelerator(e);
        if(!result) return;          // Seulement une touche modificateur pressée
    
        const {accel, error} = result;
        if(error){
          this.feedback = {...this.feedback, [shortcutKey]:{type:'error',msg:error}};
          return;
        }
        // Succès
        this.shortcuts = {...this.shortcuts, [shortcutKey]:accel};
        this.feedback = {...this.feedback, [shortcutKey]:{type:'success',msg:this.t('shortcuts.shortcutSet')}};
        this.stopCapture();
      }
    
      _parseAccelerator(e){
        /* returns {accel?, error?} */
        const parts=[]; if(e.metaKey) parts.push('Cmd');
        if(e.ctrlKey) parts.push('Ctrl');
        if(e.altKey) parts.push('Alt');
        if(e.shiftKey) parts.push('Shift');
    
        const isModifier=['Meta','Control','Alt','Shift'].includes(e.key);
        if(isModifier) return null;
    
        const map={ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',' ':'Space'};
        parts.push(e.key.length===1? e.key.toUpperCase() : (map[e.key]||e.key));
        const accel=parts.join('+');
    
        /* ---- validation ---- */
        if(parts.length===1)   return {error:this.t('shortcuts.errors.needsModifier')};
        if(parts.length>4)     return {error:this.t('shortcuts.errors.maxKeys')};
        if(commonSystemShortcuts.has(accel)) return {error:this.t('shortcuts.errors.systemReserved')};
        return {accel};
      }

    startCapture(key){ this.capturingKey = key; this.feedback = {...this.feedback, [key]:undefined}; }

    disableShortcut(key){
        this.shortcuts = {...this.shortcuts, [key]:''};         // Vide => désactivé
        this.feedback   = {...this.feedback, [key]:{type:'success',msg:this.t('shortcuts.shortcutDisabled')}};
      }

    stopCapture() {
        this.capturingKey = null;
    }

    async handleSave() {
        if (!window.api) return;
        this.feedback = {};
        const result = await window.api.shortcutSettingsView.saveShortcuts(this.shortcuts);
        if (!result.success) {
            alert(this.t('shortcuts.failedToSave') + result.error);
        }
    }

    handleClose() {
        if (!window.api) return;
        this.feedback = {};
        window.api.shortcutSettingsView.closeShortcutSettingsWindow();
    }

    async handleResetToDefault() {
        if (!window.api) return;
        const confirmation = confirm(this.t('shortcuts.confirmReset'));
        if (!confirmation) return;

        try {
            const defaultShortcuts = await window.api.shortcutSettingsView.getDefaultShortcuts();
            this.shortcuts = defaultShortcuts;
        } catch (error) {
            alert(this.t('shortcuts.failedToLoad'));
        }
    }

    formatShortcutName(name) {
        if (displayNameMap[name]) {
            return displayNameMap[name];
        }
        const result = name.replace(/([A-Z])/g, " $1");
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    render(){
        if(this.isLoading){
          return html`<div class="container"><div class="loading-state">${this.t('shortcuts.loading')}</div></div>`;
        }
        return html`
          <div class="container">
            <button class="close-button" @click=${this.handleClose} title="Close">&times;</button>
            <h1 class="title">${this.t('shortcuts.title')}</h1>
    
            <div class="scroll-area">
              ${Object.keys(this.shortcuts).map(key=>html`
                <div>
                  <div class="shortcut-entry">
                    <span class="shortcut-name">${this.formatShortcutName(key)}</span>
    
                    <!-- Boutons Modifier & Désactiver -->
                    <button class="action-btn" @click=${()=>this.startCapture(key)}>${this.t('shortcuts.edit')}</button>
                    <button class="action-btn" @click=${()=>this.disableShortcut(key)}>${this.t('shortcuts.disable')}</button>

                    <input readonly
                      class="shortcut-input ${this.capturingKey===key?'capturing':''}"
                      .value=${this.shortcuts[key]||''}
                      placeholder=${this.capturingKey===key?this.t('shortcuts.pressNew'):this.t('shortcuts.clickToEdit')}
                      @click=${()=>this.startCapture(key)}
                      @keydown=${e=>this.handleKeydown(e,key)}
                      @blur=${()=>this.stopCapture()}
                    />
                  </div>
    
                  ${this.feedback[key] ? html`
                    <div class="feedback ${this.feedback[key].type}">
                      ${this.feedback[key].msg}
                    </div>` : html`<div class="feedback"></div>`
                  }
                </div>
              `)}
            </div>
    
            <div class="actions">
              <button class="settings-button" @click=${this.handleClose}>${this.t('shortcuts.cancel')}</button>
              <button class="settings-button danger" @click=${this.handleResetToDefault}>${this.t('shortcuts.resetToDefault')}</button>
              <button class="settings-button primary" @click=${this.handleSave}>${this.t('shortcuts.save')}</button>
            </div>
          </div>
        `;
      }
    }

customElements.define('shortcut-settings-view', ShortcutSettingsView);