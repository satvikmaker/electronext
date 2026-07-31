import { safeStorage } from 'electron';
import Store from 'electron-store';
import log from './logger.js';

/**
 * Secure credential storage using Electron's safeStorage API.
 *
 * Data is encrypted at rest using the OS keychain:
 * - macOS: Keychain
 * - Windows: DPAPI
 * - Linux: libsecret
 *
 * Entries are prefixed to distinguish encrypted vs plaintext,
 * so decryption works correctly even if encryption availability changes.
 */

interface SecureStoreData {
  [key: string]: string;
}

const ENCRYPTED_PREFIX = 'enc:';
const PLAINTEXT_PREFIX = 'raw:';

const store = new Store<SecureStoreData>({ name: 'secure-credentials' });

export const secureStore = {
  set(key: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('Encryption not available — storing credential in plaintext');
      store.set(key, PLAINTEXT_PREFIX + Buffer.from(value, 'utf-8').toString('base64'));
      return;
    }
    const encrypted = safeStorage.encryptString(value);
    store.set(key, ENCRYPTED_PREFIX + encrypted.toString('base64'));
  },

  get(key: string): string | null {
    const raw = store.get(key);
    if (!raw) return null;

    // Plaintext entry — decode regardless of encryption availability
    if (raw.startsWith(PLAINTEXT_PREFIX)) {
      return Buffer.from(raw.slice(PLAINTEXT_PREFIX.length), 'base64').toString('utf-8');
    }

    // Encrypted entry — requires encryption to be available
    if (raw.startsWith(ENCRYPTED_PREFIX)) {
      if (!safeStorage.isEncryptionAvailable()) {
        log.error(`Cannot decrypt secure key "${key}" — encryption not available`);
        return null;
      }
      try {
        return safeStorage.decryptString(Buffer.from(raw.slice(ENCRYPTED_PREFIX.length), 'base64'));
      } catch {
        log.error(`Failed to decrypt secure key: ${key}`);
        return null;
      }
    }

    // Legacy entry (no prefix) — try decrypt, fall back to base64 decode
    const buffer = Buffer.from(raw, 'base64');
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(buffer);
      } catch {
        return buffer.toString('utf-8');
      }
    }
    return buffer.toString('utf-8');
  },

  delete(key: string): void {
    store.delete(key);
  },
};
