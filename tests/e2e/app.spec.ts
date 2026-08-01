import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';
import { findMainWindow, invoke } from './helpers';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let app: ElectronApplication;
let page: Page;

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
  const hasElectron = await page.evaluate(() => typeof window.electron !== 'undefined');
  expect(hasElectron).toBe(true);
});

test('preload exposes expected ipc methods', async () => {
  const methods = await page.evaluate(() => {
    const bridge = window.electron;
    return {
      hasInvoke: typeof bridge?.ipc.invoke === 'function',
      hasOn: typeof bridge?.ipc.on === 'function',
      hasOnce: typeof bridge?.ipc.once === 'function',
      hasPlatform: typeof bridge?.platform === 'string',
    };
  });

  expect(methods.hasInvoke).toBe(true);
  expect(methods.hasOn).toBe(true);
  expect(methods.hasOnce).toBe(true);
  expect(methods.hasPlatform).toBe(true);
});

test('IPC ping returns pong', async () => {
  expect(await invoke(page, 'example:ping')).toBe('pong');
});

test('IPC get-version returns a semver string', async () => {
  expect(await invoke(page, 'app:get-version')).toMatch(/^\d+\.\d+\.\d+/);
});

test('page renders the Redux counter', async () => {
  const counter = page.locator('text=Redux Counter');
  await expect(counter).toBeVisible();
});

test('page renders the IPC demo section', async () => {
  const ipcSection = page.locator('text=IPC Communication');
  await expect(ipcSection).toBeVisible();
});
