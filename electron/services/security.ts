import { app, session, shell } from 'electron';
import log from './logger.js';
import { isProd, getCurrentNonce } from '../helpers/resolve-path.js';

/**
 * Allowed origins for in-app navigation.
 * Any navigation attempt to an origin NOT in this set is blocked.
 */
const ALLOWED_ORIGINS = new Set<string>(
  isProd
    ? ['app://.']
    : [`http://localhost:${process.env.PORT || 3000}`]
);

/**
 * Allowed external origins that may be opened in the system browser.
 * Links to origins NOT in this set are silently blocked.
 * Add domains as needed (e.g. OAuth providers, documentation sites).
 */
const ALLOWED_EXTERNAL_ORIGINS = new Set<string>([
  'https://github.com',
]);

/**
 * Build a Content Security Policy string.
 *
 * Production: uses a per-page nonce for script-src (injected by the custom
 * protocol handler in resolve-path.ts). This avoids `unsafe-inline` and
 * prevents injected script execution.
 *
 * Development: uses `unsafe-inline` + `unsafe-eval` because Next.js HMR
 * and Turbopack require them for hot reloading.
 */
function buildCsp(): string {
  const nonce = getCurrentNonce();
  const useNonce = isProd && nonce;

  const scriptSrc = useNonce
    ? `script-src 'self' 'nonce-${nonce}'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const styleSrc = useNonce
    ? `style-src 'self' 'nonce-${nonce}'`
    : "style-src 'self' 'unsafe-inline'";

  const directives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'" + (isProd ? '' : ' ws://localhost:* http://localhost:*'),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join('; ');
}

/**
 * Apply all security restrictions.
 * Must be called inside app.whenReady() — after session is available.
 */
export function applySecurityRestrictions(): void {
  // ── CSP Headers ────────────────────────────────────────────────
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [buildCsp()],
      },
    });
  });

  // ── Per-webContents restrictions ───────────────────────────────
  app.on('web-contents-created', (_event, contents) => {

    // Block navigation to disallowed origins
    contents.on('will-navigate', (event, url) => {
      try {
        const { origin } = new URL(url);
        if (!ALLOWED_ORIGINS.has(origin)) {
          event.preventDefault();
          log.warn(`Blocked navigation to disallowed origin: ${url}`);
        }
      } catch {
        event.preventDefault();
        log.warn(`Blocked navigation to malformed URL: ${url}`);
      }
    });

    // Handle window.open() and target="_blank" links
    contents.setWindowOpenHandler(({ url }) => {
      try {
        const { origin } = new URL(url);
        if (ALLOWED_EXTERNAL_ORIGINS.has(origin)) {
          shell.openExternal(url).catch((err) => {
            log.error(`Failed to open external URL: ${url}`, err);
          });
        } else {
          log.warn(`Blocked external URL from disallowed origin: ${url}`);
        }
      } catch {
        log.warn(`Blocked window.open with malformed URL: ${url}`);
      }
      return { action: 'deny' };
    });
  });
}
