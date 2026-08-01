import { app, protocol, session } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

// A packaged app is launched by the OS, so NODE_ENV is simply not set — relying
// on it alone made every shipped build fall into development mode and try to
// load http://localhost:3000. `app.isPackaged` is the authoritative signal.
// We normalise the variable itself so that other processes which inherit this
// environment (notably the preload, which derives the userData path from it)
// agree on the mode. The e2e suite still forces NODE_ENV=production while
// running unpackaged, so the explicit override is honoured too.
if (app.isPackaged && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const isProd = process.env.NODE_ENV === 'production';
const SCHEME = 'app';

// ── Nonce management ──────────────────────────────────────────────────

let currentNonce = '';

/** Returns the nonce currently in effect (set when the last HTML page was served). */
export function getCurrentNonce(): string {
  return currentNonce;
}

// ── Register privileged scheme (must run before app.whenReady) ────────

if (isProd) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

// ── MIME type map ─────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};

// ── Protocol handler (called inside app.whenReady) ────────────────────

/**
 * Register the `app://` protocol handler that serves static files from
 * `dist/renderer/` and injects a CSP nonce into every `<script>` tag.
 *
 * Must be called inside `app.whenReady()`.
 */
export function registerAppProtocol(): void {
  if (!isProd) return;

  const distDir = path.join(app.getAppPath(), 'dist', 'renderer');

  session.defaultSession.protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    // Resolve file path
    let filePath = path.join(distDir, pathname);

    // Directory → index.html
    try {
      const s = await stat(filePath);
      if (s.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
    } catch {
      // Not a directory — try as-is or with .html fallback
    }

    // `trailingSlash: true` in next.config.mjs means every route is exported as
    // `route/index.html`, which the directory branch above already resolved — so
    // a single read is enough. Extension fallbacks here would be unreachable.
    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch (err) {
      // A missing file is a 404; anything else (EACCES, a corrupt asar) is a real
      // fault and must not masquerade as one.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }

    const ext = path.extname(filePath);
    if (ext === '.html') {
      // Fresh nonce per page load, injected into every <script> and <style>.
      currentNonce = randomBytes(16).toString('base64');
      const html = data
        .toString('utf-8')
        .replace(/<script(?=[\s>])/g, `<script nonce="${currentNonce}"`)
        .replace(/<style(?=[\s>])/g, `<style nonce="${currentNonce}"`);
      return new Response(html, { headers: { 'Content-Type': MIME['.html'] } });
    }

    return new Response(data, {
      headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' },
    });
  });
}

// ── URL resolver ──────────────────────────────────────────────────────

export function resolveUrl(urlPath: string = ''): string {
  if (isProd) {
    return `${SCHEME}://./${urlPath}`;
  }
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}/${urlPath}`;
}

export { isProd };
