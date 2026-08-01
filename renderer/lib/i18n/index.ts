import type { Locale } from '../features/localeSlice';
import en from './messages/en.json';
import es from './messages/es.json';

type Messages = Record<string, string>;

// Add a language by importing its JSON here and adding it to both this record
// and AVAILABLE_LOCALES below. `Record<Locale, …>` makes a missing one a
// compile error rather than a silent fall-through to English.
const messagesByLocale: Record<Locale, Messages> = {
  en,
  es,
};

/**
 * Get a translation function for the given locale.
 *
 * Supports simple interpolation: `t('update.available', { version: '2.0' })`
 * replaces `{version}` in the message string.
 *
 * Falls back to English if the key is missing in the requested locale,
 * and to the raw key if not found in English either.
 */
export function getTranslator(locale: Locale) {
  const messages = messagesByLocale[locale];

  return function t(key: string, params?: Record<string, string | number>): string {
    let message = messages[key] ?? en[key as keyof typeof en] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        message = message.replace(`{${k}}`, String(v));
      }
    }
    return message;
  };
}

/** Available locales with display names. */
export const AVAILABLE_LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espanol' },
];
