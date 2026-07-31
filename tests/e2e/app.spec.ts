import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let app: ElectronApplication;
let page: Page;

/**
 * The app opens a splash window before the main window, and either may be
 * reported first. Poll the currently-open windows instead of awaiting a future
 * 'window' event, which deadlocks whenever the main window opened before we
 * started listening.
 */
async function findMainWindow(electronApp: ElectronApplication, timeoutMs = 30_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const candidate of electronApp.windows()) {
      try {
        await candidate.waitForLoadState('domcontentloaded');
        if ((await candidate.title()).includes('ElectroNext')) return candidate;
      } catch {
        // The splash window closes while we inspect it — ignore and keep looking.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for the ElectroNext main window');
}

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', '..')],
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  page = await findMainWindow(app);
  await page.waitForLoadState('load');
});

test.afterAll(async () => {
  await app?.close();
});

test('main window is visible and not crashed', async () => {
  const window = await app.browserWindow(page);
  const state = await window.evaluate((win: Electron.BrowserWindow) => ({
    isVisible: win.isVisible(),
    isCrashed: win.webContents.isCrashed(),
  }));

  expect(state.isCrashed).toBe(false);
  expect(state.isVisible).toBe(true);
});

test('main window has correct title', async () => {
  const title = await page.title();
  expect(title).toContain('ElectroNext');
});

test('preload API is exposed on window.electron', async () => {
  const hasElectron = await page.evaluate(() => {
    return typeof (window as Record<string, unknown>).electron !== 'undefined';
  });
  expect(hasElectron).toBe(true);
});

test('preload exposes expected ipc methods', async () => {
  const methods = await page.evaluate(() => {
    const e = (window as Record<string, unknown>).electron as Record<string, unknown> | undefined;
    const ipc = e?.ipc as Record<string, unknown> | undefined;
    return {
      hasInvoke: typeof ipc?.invoke === 'function',
      hasOn: typeof ipc?.on === 'function',
      hasOnce: typeof ipc?.once === 'function',
      hasPlatform: typeof e?.platform === 'string',
    };
  });

  expect(methods.hasInvoke).toBe(true);
  expect(methods.hasOn).toBe(true);
  expect(methods.hasOnce).toBe(true);
  expect(methods.hasPlatform).toBe(true);
});

test('IPC ping returns pong', async () => {
  const result = await page.evaluate(async () => {
    const e = (window as Record<string, unknown>).electron as Record<string, unknown>;
    const ipc = e.ipc as Record<string, (...args: unknown[]) => Promise<unknown>>;
    return ipc.invoke('example:ping');
  });
  expect(result).toBe('pong');
});

test('IPC get-version returns a semver string', async () => {
  const version = await page.evaluate(async () => {
    const e = (window as Record<string, unknown>).electron as Record<string, unknown>;
    const ipc = e.ipc as Record<string, (...args: unknown[]) => Promise<unknown>>;
    return ipc.invoke('app:get-version');
  });
  expect(version).toMatch(/^\d+\.\d+\.\d+/);
});

test('page renders the Redux counter', async () => {
  const counter = page.locator('text=Redux Counter');
  await expect(counter).toBeVisible();
});

test('page renders the IPC demo section', async () => {
  const ipcSection = page.locator('text=IPC Communication');
  await expect(ipcSection).toBeVisible();
});
