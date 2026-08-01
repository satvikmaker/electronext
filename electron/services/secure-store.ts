import { safeStorage } from 'electron';
import Store from 'electron-store';

/**
 * Secure credential storage backed by the OS keychain via Electron's
 * safeStorage API — macOS Keychain, Windows DPAPI, Linux libsecret.
 *
 * Failures throw rather than degrading. A store that silently falls back to
 * reversible encoding is worse than one that refuses, because the caller has
 * no way to learn the secret was never protected.
 */

interface SecureStoreData {
  [key: string]: string;
}

// See services/store.ts for why clearInvalidConfig matters. Credentials in a
// corrupt file are unrecoverable regardless, so resetting loses nothing that
// was still readable.
const store = new Store<SecureStoreData>({ name: 'secure-credentials', clearInvalidConfig: true });

function assertEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Secure storage unavailable: the OS keychain (Keychain/DPAPI/libsecret) is not accessible. ' +
        'On Linux this usually means no libsecret provider is running.',
    );
  }
}

export const secureStore = {
  set(key: string, value: string): void {
    assertEncryptionAvailable();
    store.set(key, safeStorage.encryptString(value).toString('base64'));
  },

  get(key: string): string | null {
    const raw = store.get(key);
    if (raw === undefined) return null;

    assertEncryptionAvailable();
    // A decrypt failure means the entry is corrupt or was written under a
    // different keychain. Returning the raw bytes would hand the caller
    // plausible-looking garbage to use as a credential.
    return safeStorage.decryptString(Buffer.from(raw, 'base64'));
  },

  delete(key: string): void {
    store.delete(key);
  },
};
