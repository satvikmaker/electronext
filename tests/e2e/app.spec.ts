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

/**
 * The renderer supplies raw SQL, so these channels are a privilege boundary.
 * Each case below defeated an earlier version of the guard: leading comments
 * slipped past a `^\s*` regex, `WITH … DELETE … RETURNING` reads as a row-
 * returning statement, and SQLite reports `ATTACH` as read-only.
 */
test.describe('SQL channel guard', () => {
  const rejected = [
    ['comment-prefixed DDL', '/**/DROP TABLE notes'],
    ['line-comment-prefixed DDL', '--x\nDROP TABLE notes'],
    ['plain DDL', 'DROP TABLE notes'],
    ['CTE that writes and returns rows', 'WITH x AS (SELECT 1) DELETE FROM notes RETURNING *'],
    ['ATTACH, which SQLite calls read-only', "ATTACH DATABASE '/tmp/evil.db' AS e"],
    ['PRAGMA', 'PRAGMA journal_mode'],
  ] as const;

  for (const [label, sql] of rejected) {
    test(`db:query rejects ${label}`, async () => {
      await expect(invoke(page, 'db:query', sql, [])).rejects.toThrow();
    });
  }

  test('db:query still allows reads', async () => {
    expect(await invoke(page, 'db:query', 'SELECT 1 as ok', [])).toEqual({ rows: [{ ok: 1 }] });
    expect(await invoke(page, 'db:query', 'WITH x AS (SELECT 7 as n) SELECT n FROM x', []))
      .toEqual({ rows: [{ n: 7 }] });
  });

  test('db:run allows DML but rejects DDL', async () => {
    const inserted = await invoke(page, 'db:run', 'INSERT INTO notes (title, content) VALUES (?, ?)', ['t', 'c']);
    expect(inserted.changes).toBe(1);
    await expect(invoke(page, 'db:run', 'DROP TABLE notes', [])).rejects.toThrow();
    await invoke(page, 'db:run', 'DELETE FROM notes WHERE title = ?', ['t']);
  });
});
