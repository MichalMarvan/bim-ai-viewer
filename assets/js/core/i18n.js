/**
 * Internationalization system
 * Pattern from BIM_checker + local-ai-playground
 */
import { state } from './state.js';
import { translations } from './translations.js';

export function t(key, params) {
  let text = translations[state.lang]?.[key] || translations.cs[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('bim-ai-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  updatePageTranslations();
}

export function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.title = t('app.title');
}
