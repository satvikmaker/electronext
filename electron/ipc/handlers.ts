import { app, BrowserWindow, clipboard, dialog, Menu, nativeImage, Notification, ipcMain, globalShortcut } from 'electron';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { IPC_CHANNELS } from './channels.js';
import type { ContextMenuItem, CrashReport, FileMetadata, MenuItemUpdate, NotificationOptions, OpenDialogOptions, SaveDialogOptions } from './schema.js';
import { appStore } from '../services/store.js';
import { resolveUrl } from '../helpers/resolve-path.js';
import { createWindow } from '../helpers/create-window.js';
import { secureStore } from '../services/secure-store.js';
import { menuItemRegistry } from '../services/menu.js';
import { workerManager } from '../services/worker-manager.js';
import { dbQuery, dbRun } from '../services/database.js';
import { handleCrashReport } from '../services/crash-reporter.js';
import { getSpellCheckerConfig, setSpellCheckerEnabled, setSpellCheckerLanguages, addWordToSpellChecker } from '../services/spell-checker.js';
import log from '../services/logger.js';

const windowRegistry = new Map<string, BrowserWindow>();

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
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => app.getVersion());

  ipcMain.handle(IPC_CHANNELS.GET_APP_PATH, (_event, name: string) =>
    app.getPath(name as Parameters<typeof app.getPath>[0]));

  ipcMain.handle(IPC_CHANNELS.REPORT_ERROR, (_event, error: { message: string; stack?: string; componentStack?: string }) => {
    log.error('[Renderer Error]', error.message);
    if (error.stack) log.error('[Stack]', error.stack);
    if (error.componentStack) log.error('[Component Stack]', error.componentStack);
  });

  ipcMain.handle(IPC_CHANNELS.GET_LOCALE, () => app.getLocale());

  ipcMain.handle(IPC_CHANNELS.SET_PROGRESS, (event, progress: number) => {
    BrowserWindow.fromWebContents(event.sender)?.setProgressBar(progress < 0 ? -1 : progress);
  });

  ipcMain.handle(IPC_CHANNELS.SET_BADGE_COUNT, (_event, count: number) => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      app.setBadgeCount(count);
    }
    if (process.platform === 'win32') {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) win.flashFrame(count > 0);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_LOGIN_SETTINGS, () => {
    return { openAtLogin: app.getLoginItemSettings().openAtLogin };
  });

  ipcMain.handle(IPC_CHANNELS.SET_LOGIN_SETTINGS, (_event, openAtLogin: boolean) => {
    app.setLoginItemSettings({ openAtLogin });
  });

  // ── Settings ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, (_event, key: string) => appStore.get(key));
  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (_event, key: string, value: unknown) => { appStore.set(key, value); });

  // ── Window controls ─────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, (event) => { BrowserWindow.fromWebContents(event.sender)?.minimize(); });

  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, (event) => { BrowserWindow.fromWebContents(event.sender)?.close(); });

  ipcMain.handle(IPC_CHANNELS.IS_MAXIMIZED, (event) =>
    BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false);

  // ── Multi-window ──────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.OPEN_WINDOW, (_event, name: string, route: string) => {
    const existing = windowRegistry.get(name);
    if (existing && !existing.isDestroyed()) { existing.focus(); return; }
    const win = createWindow(name, { width: 700, height: 500, minWidth: 400, minHeight: 300 });
    win.once('ready-to-show', () => win.show());
    win.loadURL(resolveUrl(route));
    win.on('closed', () => windowRegistry.delete(name));
    windowRegistry.set(name, win);
  });

  // ── File metadata ──────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.FILE_GET_METADATA, async (_event, paths: string[]) => {
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
  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SHOW, (_event, options: NotificationOptions) => {
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
  ipcMain.handle(IPC_CHANNELS.SHORTCUTS_REGISTER, (event, accelerator: string, id: string) => {
    try {
      return globalShortcut.register(accelerator, () => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) win.webContents.send(IPC_CHANNELS.SHORTCUT_TRIGGERED, id);
      });
    } catch (err) {
      log.warn(`Failed to register shortcut "${accelerator}":`, err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SHORTCUTS_UNREGISTER, (_event, accelerator: string) => { globalShortcut.unregister(accelerator); });

  // ── Context menu ───────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.CONTEXT_MENU_SHOW, (event, items: ContextMenuItem[]) => {
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
  ipcMain.handle(IPC_CHANNELS.SECURE_SET, (_event, key: string, value: string) => secureStore.set(key, value));
  ipcMain.handle(IPC_CHANNELS.SECURE_GET, (_event, key: string) => secureStore.get(key));
  ipcMain.handle(IPC_CHANNELS.SECURE_DELETE, (_event, key: string) => secureStore.delete(key));

  // ── File dialogs ───────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async (event, options?: OpenDialogOptions) => {
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

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (event, options?: SaveDialogOptions) => {
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
  ipcMain.handle(IPC_CHANNELS.MENU_UPDATE_ITEM, (_event, update: MenuItemUpdate) => {
    const item = menuItemRegistry.get(update.id);
    if (!item) { log.warn(`Menu item not found: ${update.id}`); return; }
    if (update.enabled !== undefined) item.enabled = update.enabled;
    if (update.checked !== undefined) item.checked = update.checked;
    if (update.label !== undefined) item.label = update.label;
    if (update.visible !== undefined) item.visible = update.visible;
  });

  // ── Clipboard ──────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_READ_TEXT, () => clipboard.readText());
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE_TEXT, (_event, text: string) => clipboard.writeText(text));
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_HAS_TEXT, () => clipboard.readText().length > 0);
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_READ_IMAGE, () => {
    const img = clipboard.readImage();
    return img.isEmpty() ? null : img.toDataURL();
  });
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE_IMAGE, (_event, dataUrl: string) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  });

  // ── Workers ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.WORKER_START, (event, taskName: string, data: unknown) => {
    const sender = event.sender;
    return workerManager.start(taskName, data, {
      onProgress(workerId, percent, message) {
        if (!sender.isDestroyed()) sender.send(IPC_CHANNELS.WORKER_PROGRESS, { workerId, percent, message });
      },
      onComplete(workerId, result) {
        if (!sender.isDestroyed()) sender.send(IPC_CHANNELS.WORKER_COMPLETE, { workerId, data: result });
      },
      onError(workerId, error) {
        if (!sender.isDestroyed()) sender.send(IPC_CHANNELS.WORKER_ERROR, { workerId, data: null, error });
      },
    });
  });
  ipcMain.handle(IPC_CHANNELS.WORKER_CANCEL, (_event, workerId: string) => { workerManager.cancel(workerId); });

  // ── Database (#2) ──────────────────────────────────────────────
  // Block DDL and dangerous statements from renderer — only DML allowed
  const FORBIDDEN_SQL = /^\s*(DROP|ALTER|CREATE|PRAGMA|ATTACH|DETACH|VACUUM)\b/i;

  ipcMain.handle(IPC_CHANNELS.DB_QUERY, (_event, sql: string, params?: unknown[]) => {
    if (FORBIDDEN_SQL.test(sql)) throw new Error('Forbidden SQL operation');
    return dbQuery(sql, params);
  });

  ipcMain.handle(IPC_CHANNELS.DB_RUN, (_event, sql: string, params?: unknown[]) => {
    if (FORBIDDEN_SQL.test(sql)) throw new Error('Forbidden SQL operation');
    return dbRun(sql, params);
  });

  // ── Spell checker (#7) ─────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.SPELLCHECK_GET_CONFIG, () => getSpellCheckerConfig());
  ipcMain.handle(IPC_CHANNELS.SPELLCHECK_SET_ENABLED, (_event, enabled: boolean) => { setSpellCheckerEnabled(enabled); });
  ipcMain.handle(IPC_CHANNELS.SPELLCHECK_SET_LANGUAGES, (_event, languages: string[]) => { setSpellCheckerLanguages(languages); });
  ipcMain.handle(IPC_CHANNELS.SPELLCHECK_ADD_WORD, (_event, word: string) => { addWordToSpellChecker(word); });

  // ── Crash reporter (#6) ────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.CRASH_SEND_REPORT, (_event, report: CrashReport) => {
    return handleCrashReport(report);
  });

  // ── Example ─────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.PING, () => 'pong');
}
