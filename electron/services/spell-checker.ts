import { session } from 'electron';
import { appStore } from './store.js';
import log from './logger.js';

/**
 * Spell checker configuration using Electron's built-in Chromium spell checker.
 *
 * Persists settings (enabled, languages) to electron-store.
 * Available languages depend on the OS and Chromium dictionaries.
 */

const STORE_KEY_ENABLED = 'spellcheck.enabled';
const STORE_KEY_LANGUAGES = 'spellcheck.languages';

export function initSpellChecker(): void {
  const enabled = appStore.get(STORE_KEY_ENABLED) as boolean | undefined;
  const languages = appStore.get(STORE_KEY_LANGUAGES) as string[] | undefined;

  if (enabled === false) {
    session.defaultSession.setSpellCheckerEnabled(false);
  } else {
    session.defaultSession.setSpellCheckerEnabled(true);
    if (languages && languages.length > 0) {
      session.defaultSession.setSpellCheckerLanguages(languages);
    }
  }

  log.info('Spell checker initialized');
}

export function getSpellCheckerConfig() {
  return {
    enabled: session.defaultSession.isSpellCheckerEnabled(),
    languages: session.defaultSession.getSpellCheckerLanguages(),
    availableLanguages: session.defaultSession.availableSpellCheckerLanguages,
  };
}

export function setSpellCheckerEnabled(enabled: boolean): void {
  session.defaultSession.setSpellCheckerEnabled(enabled);
  appStore.set(STORE_KEY_ENABLED, enabled);
}

export function setSpellCheckerLanguages(languages: string[]): void {
  session.defaultSession.setSpellCheckerLanguages(languages);
  appStore.set(STORE_KEY_LANGUAGES, languages);
}

export function addWordToSpellChecker(word: string): void {
  session.defaultSession.addWordToSpellCheckerDictionary(word);
}
