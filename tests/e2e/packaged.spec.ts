import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.join(__dirname, '..', '..', 'release');

/**
 * Locate the binary produced by `npm run pack` for the current platform.
 * Returns null when the app has not been packaged, so this suite can skip
 * instead of failing during a plain `npm run test:e2e`.
 */
function findPackagedBinary(): string | null {
  const candidates = process.platform === 'darwin'
    ? ['mac-arm64', 'mac', 'mac-universal'].map((d) =>
        path.join(releaseDir, d, 'ElectroNext.app', 'Contents', 'MacOS', 'ElectroNext'))
    : process.platform === 'win32'
      ? [path.join(releaseDir, 'win-unpacked', 'ElectroNext.exe')]
      : [path.join(releaseDir, 'linux-unpacked', 'electronext')];

  return candidates.find(existsSync) ?? null;
}

const binary = findPackagedBinary();

/**
 * These tests exercise the *packaged* app, which behaves differently from the
 * unpackaged one in ways the main suite cannot see: it has no NODE_ENV, it only
 * contains `dependencies` (not devDependencies), and its resources live inside
 * an asar archive. Regressions here ship to users but are invisible locally.
 */
test.describe('packaged app', () => {
  test.skip(binary === null, 'App is not packaged — run `npm run pack` first.');

  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Deliberately launch WITHOUT NODE_ENV: that is how the OS starts a real
    // installed app, and relying on it is what previously made shipped builds
    // fall back to development mode and try to load http://localhost:3000.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== 'NODE_ENV'),
    ) as Record<string, string>;

    app = await electron.launch({ executablePath: binary!, env });

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      for (const candidate of app.windows()) {
        try {
          await candidate.waitForLoadState('domcontentloaded');
          if ((await candidate.title()).includes('ElectroNext')) {
            page = candidate;
            break;
          }
        } catch {
          // Splash window closed while being inspected — keep looking.
        }
      }
      if (page) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!page) throw new Error('Timed out waiting for the packaged main window');
    await page.waitForLoadState('load');
  });

  test.afterAll(async () => {
    await app?.close();
  });

  test('serves the renderer over the app:// protocol, not a dev server', async () => {
    expect(page.url()).toMatch(/^app:\/\//);
  });

  test('renders the real UI', async () => {
    await expect(page.locator('text=Redux Counter')).toBeVisible();
    await expect(page.locator('text=IPC Communication')).toBeVisible();
  });

  test('main-process IPC works inside the asar', async () => {
    const pong = await page.evaluate(() => {
      const e = (window as Record<string, unknown>).electron as Record<string, unknown>;
      const ipc = e.ipc as Record<string, (...args: unknown[]) => Promise<unknown>>;
      return ipc.invoke('example:ping');
    });
    expect(pong).toBe('pong');
  });

  test('the native better-sqlite3 binding loads from asar.unpacked', async () => {
    const result = await page.evaluate(() => {
      const e = (window as Record<string, unknown>).electron as Record<string, unknown>;
      const ipc = e.ipc as Record<string, (...args: unknown[]) => Promise<unknown>>;
      return ipc.invoke('db:query', 'SELECT 1 as ok', []);
    });
    expect(result).toEqual({ rows: [{ ok: 1 }] });
  });
});
