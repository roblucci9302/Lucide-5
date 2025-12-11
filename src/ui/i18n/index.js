/**
 * I18n Service - Internationalization for Lucidi
 * @module i18n
 */

import fr from './locales/fr.js';
import en from './locales/en.js';

class I18nService {
  constructor() {
    this.currentLocale = 'fr'; // Français par défaut
    this.translations = { fr, en };
    this.fallbackLocale = 'en';

    // Forcer le français par défaut
    localStorage.setItem('selectedLanguage', 'fr');
    this.currentLocale = 'fr';

    console.log(`[I18n] Initialized with locale: ${this.currentLocale}`);
  }

  /**
   * Set the current locale
   * @param {string} locale - Locale code (e.g., 'fr', 'en')
   */
  setLocale(locale) {
    if (this.translations[locale]) {
      this.currentLocale = locale;
      localStorage.setItem('selectedLanguage', locale);
      console.log(`[I18n] Locale changed to: ${locale}`);

      // Emit event for components to update
      window.dispatchEvent(new CustomEvent('locale-changed', {
        detail: { locale }
      }));
    } else {
      console.warn(`[I18n] Locale "${locale}" not found. Available locales:`, Object.keys(this.translations));
    }
  }

  /**
   * Get the current locale
   * @returns {string} Current locale code
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Translate a key with optional parameters
   * @param {string} key - Translation key (dot-separated path, e.g., 'header.question')
   * @param {Object} params - Optional parameters for string interpolation
   * @returns {string} Translated string
   *
   * @example
   * i18n.t('header.question')  // → 'Question'
   * i18n.t('apiKey.enterYourKey', { provider: 'OpenAI' })  // → 'Entrez votre clé API OpenAI'
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.currentLocale];

    // Navigate through the translation object
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    // Fallback to default locale if not found
    if (value === undefined) {
      value = this.translations[this.fallbackLocale];
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }

      if (value !== undefined) {
        console.warn(`[I18n] Translation missing for key "${key}" in ${this.currentLocale}, using ${this.fallbackLocale}`);
      }
    }

    // If still not found, return the key itself
    if (value === undefined) {
      console.warn(`[I18n] Translation missing for key: ${key}`);
      return key;
    }

    // Replace parameters (e.g., ${provider})
    if (typeof value === 'string') {
      return value.replace(/\${(\w+)}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  }

  /**
   * Check if a translation key exists
   * @param {string} key - Translation key
   * @returns {boolean} True if key exists
   */
  has(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLocale];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return false;
    }

    return true;
  }

  /**
   * Get all available locales
   * @returns {string[]} Array of locale codes
   */
  getAvailableLocales() {
    return Object.keys(this.translations);
  }
}

// Create singleton instance
export const i18n = new I18nService();

// Export convenience function for translation
export const t = (key, params) => i18n.t(key, params);

// Export for debugging
if (typeof window !== 'undefined') {
  window.__i18n__ = i18n;
}

export default i18n;
