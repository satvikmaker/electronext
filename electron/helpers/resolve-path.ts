import { app, protocol, session } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

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

    // Try the exact path, then .html fallback
    const candidates = [filePath];
    if (!filePath.endsWith('.html')) {
      candidates.push(filePath + '.html');
      candidates.push(path.join(filePath, 'index.html'));
    }

    for (const candidate of candidates) {
      try {
        const data = await readFile(candidate);
        const ext = path.extname(candidate);

        if (ext === '.html') {
          // Generate a fresh nonce and inject into all <script> tags
          currentNonce = randomBytes(16).toString('base64');
          const html = data
            .toString('utf-8')
            .replace(/<script(?=[\s>])/g, `<script nonce="${currentNonce}"`);
          return new Response(html, { headers: { 'Content-Type': MIME['.html'] } });
        }

        return new Response(data, {
          headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' },
        });
      } catch {
        continue;
      }
    }

    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
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
