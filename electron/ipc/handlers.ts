import { app, BrowserWindow, clipboard, dialog, Menu, nativeImage, Notification, globalShortcut } from 'electron';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { IPC_CHANNELS } from './channels.js';
import { handle, sendTo } from './typed-ipc.js';
import type { FileMetadata } from './schema.js';
import { appStore } from '../services/store.js';
import { resolveUrl } from '../helpers/resolve-path.js';
import { createWindow, getWindow } from '../helpers/create-window.js';
import { secureStore } from '../services/secure-store.js';
import { menuItemRegistry } from '../services/menu.js';
import { workerManager } from '../services/worker-manager.js';
import { dbQuery, dbRun } from '../services/database.js';
import { handleCrashReport } from '../services/crash-reporter.js';
import { getSpellCheckerConfig, setSpellCheckerEnabled, setSpellCheckerLanguages, addWordToSpellChecker } from '../services/spell-checker.js';
import log from '../services/logger.js';

/**
 * Last directory the user picked in a file dialog.
 *
 * Electron 43 stopped letting the OS track the last-used directory between
 * dialog invocations, and an absent `defaultPath` now resolves to the Downloads
 * folder every time. We remember it ourselves so repeated dialogs reopen where
 * the user left off. The OS also used to remember this across restarts, so it
 * is persisted rather than kept purely in memory.
 */
function getLastDialogDir(): string | undefined {
  const stored = appStore.get('lastDialogDir');
  return typeof stored === 'string' ? stored : undefined;
}

function rememberDialogDir(selectedPath: string, isDirectory: boolean): void {
  // For a directory picker the selection *is* the directory the user wants to
  // return to; for a file picker it is the containing folder.
  appStore.set('lastDialogDir', isDirectory ? selectedPath : path.dirname(selectedPath));
}

export function registerIpcHandlers(): void {
  // ── App info ────────────────────────────────────────────────────
  handle(IPC_CHANNELS.GET_APP_VERSION, () => app.getVersion());

  handle(IPC_CHANNELS.GET_APP_PATH, (_event, name) =>
    app.getPath(name));

  // Enriched here rather than in the renderer: the version, platform and clock
  // all belong to main, and the renderer should not be trusted to report them.
  handle(IPC_CHANNELS.REPORT_ERROR, (_event, error) =>
    handleCrashReport({
      ...error,
      appVersion: app.getVersion(),
      platform: process.platform,
      timestamp: new Date().toISOString(),
    }));

  handle(IPC_CHANNELS.GET_LOCALE, () => app.getLocale());

  handle(IPC_CHANNELS.SET_PROGRESS, (event, progress) => {
    BrowserWindow.fromWebContents(event.sender)?.setProgressBar(progress < 0 ? -1 : progress);
  });

  handle(IPC_CHANNELS.SET_BADGE_COUNT, (_event, count) => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      app.setBadgeCount(count);
    }
    if (process.platform === 'win32') {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) win.flashFrame(count > 0);
    }
  });

  handle(IPC_CHANNELS.GET_LOGIN_SETTINGS, () => {
    return { openAtLogin: app.getLoginItemSettings().openAtLogin };
  });

  handle(IPC_CHANNELS.SET_LOGIN_SETTINGS, (_event, openAtLogin) => {
    app.setLoginItemSettings({ openAtLogin });
  });

  // ── Settings ────────────────────────────────────────────────────
  handle(IPC_CHANNELS.GET_SETTINGS, (_event, key) => appStore.get(key));
  handle(IPC_CHANNELS.SET_SETTINGS, (_event, key, value) => { appStore.set(key, value); });

  // ── Window controls ─────────────────────────────────────────────
  handle(IPC_CHANNELS.MINIMIZE_WINDOW, (event) => { BrowserWindow.fromWebContents(event.sender)?.minimize(); });

  handle(IPC_CHANNELS.MAXIMIZE_WINDOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
  });

  handle(IPC_CHANNELS.CLOSE_WINDOW, (event) => { BrowserWindow.fromWebContents(event.sender)?.close(); });

  handle(IPC_CHANNELS.IS_MAXIMIZED, (event) =>
    BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false);

  handle(IPC_CHANNELS.TOGGLE_DEVTOOLS, (event) => {
    const contents = event.sender;
    if (contents.isDevToolsOpened()) contents.closeDevTools(); else contents.openDevTools();
  });

  // ── Multi-window ──────────────────────────────────────────────
  handle(IPC_CHANNELS.OPEN_WINDOW, (_event, name, route) => {
    const existing = getWindow(name);
    if (existing) { existing.focus(); return; }
    const win = createWindow(name, { width: 700, height: 500, minWidth: 400, minHeight: 300 });
    win.once('ready-to-show', () => win.show());
    void win.loadURL(resolveUrl(route));
  });

  // ── File metadata ──────────────────────────────────────────────
  handle(IPC_CHANNELS.FILE_GET_METADATA, async (_event, paths) => {
    const results: FileMetadata[] = [];
    for (const filePath of paths) {
      try {
        const s = await stat(filePath);
        results.push({ name: path.basename(filePath), path: filePath, size: s.size, isDirectory: s.isDirectory() });
      } catch { /* skip inaccessible */ }
    }
    return results;
  });

  // ── Notifications ──────────────────────────────────────────────
  handle(IPC_CHANNELS.NOTIFICATION_SHOW, (_event, options) => {
    if (!Notification.isSupported()) { log.warn('Notifications not supported'); return; }
    const notification = new Notification({
      title: options.title, body: options.body, silent: options.silent ?? false,
      icon: path.join(app.getAppPath(), 'resources/icon.png'),
    });
    // Electron 42 moved macOS notifications to the UNNotification API, which
    // only delivers for code-signed apps. Unsigned builds (i.e. local dev)
    // silently emit `failed` instead of showing anything — surface it.
    notification.on('failed', (_event, error) => {
      log.warn('Notification failed to display (macOS requires a code-signed app):', error);
    });
    notification.show();
  });

  // ── Global shortcuts ───────────────────────────────────────────
  handle(IPC_CHANNELS.SHORTCUTS_REGISTER, (event, accelerator, id) => {
    try {
      return globalShortcut.register(accelerator, () => {
        const win = BrowserWindow.fromWebContents(event.sender);
        sendTo(win, IPC_CHANNELS.SHORTCUT_TRIGGERED, id);
      });
    } catch (err) {
      log.warn(`Failed to register shortcut "${accelerator}":`, err);
      return false;
    }
  });

  handle(IPC_CHANNELS.SHORTCUTS_UNREGISTER, (_event, accelerator) => { globalShortcut.unregister(accelerator); });

  // ── Context menu ───────────────────────────────────────────────
  handle(IPC_CHANNELS.CONTEXT_MENU_SHOW, (event, items) => {
    return new Promise<string | null>((resolve) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) { resolve(null); return; }
      const template = items.map((item) =>
        item.type === 'separator'
          ? { type: 'separator' as const }
          : { label: item.label, enabled: item.enabled !== false, click: () => resolve(item.id) }
      );
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: win, callback: () => setImmediate(() => resolve(null)) });
    });
  });

  // ── Secure storage ─────────────────────────────────────────────
  handle(IPC_CHANNELS.SECURE_SET, (_event, key, value) => secureStore.set(key, value));
  handle(IPC_CHANNELS.SECURE_GET, (_event, key) => secureStore.get(key));
  handle(IPC_CHANNELS.SECURE_DELETE, (_event, key) => secureStore.delete(key));

  // ── File dialogs ───────────────────────────────────────────────
  handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return [];
    const properties: Electron.OpenDialogOptions['properties'] = ['openFile'];
    if (options?.multiSelect) properties.push('multiSelections');
    if (options?.directory) { properties.length = 0; properties.push('openDirectory'); }
    const result = await dialog.showOpenDialog(win, {
      title: options?.title, defaultPath: options?.defaultPath ?? getLastDialogDir(), filters: options?.filters, properties,
    });
    if (result.canceled) return [];
    if (result.filePaths[0]) rememberDialogDir(result.filePaths[0], options?.directory === true);
    return result.filePaths;
  });

  handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      title: options?.title, defaultPath: options?.defaultPath ?? getLastDialogDir(), filters: options?.filters,
    });
    if (result.canceled || !result.filePath) return null;
    rememberDialogDir(result.filePath, false);
    return result.filePath;
  });

  // ── Menu update ────────────────────────────────────────────────
  handle(IPC_CHANNELS.MENU_UPDATE_ITEM, (_event, update) => {
    const item = menuItemRegistry.get(update.id);
    if (!item) { log.warn(`Menu item not found: ${update.id}`); return; }
    if (update.enabled !== undefined) item.enabled = update.enabled;
    if (update.checked !== undefined) item.checked = update.checked;
    if (update.label !== undefined) item.label = update.label;
    if (update.visible !== undefined) item.visible = update.visible;
  });

  // ── Clipboard ──────────────────────────────────────────────────
  handle(IPC_CHANNELS.CLIPBOARD_READ_TEXT, () => clipboard.readText());
  handle(IPC_CHANNELS.CLIPBOARD_WRITE_TEXT, (_event, text) => clipboard.writeText(text));
  handle(IPC_CHANNELS.CLIPBOARD_HAS_TEXT, () => clipboard.readText().length > 0);
  handle(IPC_CHANNELS.CLIPBOARD_READ_IMAGE, () => {
    const img = clipboard.readImage();
    return img.isEmpty() ? null : img.toDataURL();
  });
  handle(IPC_CHANNELS.CLIPBOARD_WRITE_IMAGE, (_event, dataUrl) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  });

  // ── Workers ────────────────────────────────────────────────────
  handle(IPC_CHANNELS.WORKER_START, (event, taskName, data) => {
    const sender = event.sender;
    return workerManager.start(taskName, data, {
      onProgress(workerId, percent, message) {
        sendTo(sender, IPC_CHANNELS.WORKER_PROGRESS, { workerId, percent, message });
      },
      onComplete(workerId, result) {
        sendTo(sender, IPC_CHANNELS.WORKER_COMPLETE, { workerId, data: result });
      },
      onError(workerId, error) {
        sendTo(sender, IPC_CHANNELS.WORKER_ERROR, { workerId, data: null, error });
      },
    });
  });
  handle(IPC_CHANNELS.WORKER_CANCEL, (_event, workerId) => { workerManager.cancel(workerId); });

  // ── Database ───────────────────────────────────────────────────
  // Statement-kind enforcement lives in services/database.ts so a channel
  // added later cannot forget it.
  handle(IPC_CHANNELS.DB_QUERY, (_event, sql, params) => dbQuery(sql, params));
  handle(IPC_CHANNELS.DB_RUN, (_event, sql, params) => dbRun(sql, params));

  // ── Spell checker ──────────────────────────────────────────────
  handle(IPC_CHANNELS.SPELLCHECK_GET_CONFIG, () => getSpellCheckerConfig());
  handle(IPC_CHANNELS.SPELLCHECK_SET_ENABLED, (_event, enabled) => { setSpellCheckerEnabled(enabled); });
  handle(IPC_CHANNELS.SPELLCHECK_SET_LANGUAGES, (_event, languages) => { setSpellCheckerLanguages(languages); });
  handle(IPC_CHANNELS.SPELLCHECK_ADD_WORD, (_event, word) => { addWordToSpellChecker(word); });

  // ── Example ─────────────────────────────────────────────────────
  handle(IPC_CHANNELS.PING, () => 'pong');
}
