/**
 * Translation Mixin for Lit Element
 * @module i18n/useTranslation
 */

import { i18n } from './index.js';

/**
 * Mixin to add i18n capabilities to Lit Element components
 * @param {*} superClass - The Lit Element class to extend
 * @returns {*} Extended class with i18n methods
 *
 * @example
 * import { TranslationMixin } from '../i18n/useTranslation.js';
 * import { LitElement } from '../assets/lit-core-2.7.4.min.js';
 *
 * export class MyComponent extends TranslationMixin(LitElement) {
 *   render() {
 *     return html`<h1>${this.t('header.question')}</h1>`;
 *   }
 * }
 */
export const TranslationMixin = (superClass) => class extends superClass {
  constructor() {
    super();
    this._handleLocaleChange = this._handleLocaleChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    // Listen for locale changes
    window.addEventListener('locale-changed', this._handleLocaleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up listener
    window.removeEventListener('locale-changed', this._handleLocaleChange);
  }

  /**
   * Handle locale change event
   * @private
   */
  _handleLocaleChange() {
    console.log(`[${this.constructor.name}] Locale changed, requesting update`);
    this.requestUpdate();
  }

  /**
   * Translate a key with optional parameters
   * @param {string} key - Translation key
   * @param {Object} params - Optional parameters for interpolation
   * @returns {string} Translated string
   */
  t(key, params) {
    return i18n.t(key, params);
  }

  /**
   * Get current locale
   * @returns {string} Current locale code
   */
  getLocale() {
    return i18n.getLocale();
  }

  /**
   * Check if translation key exists
   * @param {string} key - Translation key
   * @returns {boolean} True if key exists
   */
  hasTranslation(key) {
    return i18n.has(key);
  }
};

export default TranslationMixin;
