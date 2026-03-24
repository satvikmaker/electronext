import { app, BrowserWindow, ipcMain } from 'electron';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { IPC_CHANNELS } from './channels.js';
import type { FileMetadata } from './schema.js';
import { appStore } from '../services/store.js';
import { resolveUrl } from '../helpers/resolve-path.js';
import { createWindow } from '../helpers/create-window.js';
import log from '../services/logger.js';

/** Registry of named secondary windows. */
const windowRegistry = new Map<string, BrowserWindow>();

export function registerIpcHandlers(): void {
  // ── App info ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_APP_PATH, (_event, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });

  // ── Error reporting (#4) ────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.REPORT_ERROR,
    (_event, error: { message: string; stack?: string; componentStack?: string }) => {
      log.error('[Renderer Error]', error.message);
      if (error.stack) log.error('[Stack]', error.stack);
      if (error.componentStack) log.error('[Component Stack]', error.componentStack);
    }
  );

  // ── Settings ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, (_event, key: string) => {
    return appStore.get(key);
  });

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (_event, key: string, value: unknown) => {
    appStore.set(key, value);
  });

  // ── Window controls ─────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle(IPC_CHANNELS.IS_MAXIMIZED, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  // ── Multi-window (#8) ──────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.OPEN_WINDOW, (_event, name: string, route: string) => {
    const existing = windowRegistry.get(name);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return;
    }

    const win = createWindow(name, {
      width: 700,
      height: 500,
      minWidth: 400,
      minHeight: 300,
    });

    win.once('ready-to-show', () => win.show());
    win.loadURL(resolveUrl(route));
    win.on('closed', () => windowRegistry.delete(name));
    windowRegistry.set(name, win);
  });

  // ── File metadata (#9) ─────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.FILE_GET_METADATA, async (_event, paths: string[]) => {
    const results: FileMetadata[] = [];
    for (const filePath of paths) {
      try {
        const s = await stat(filePath);
        results.push({
          name: path.basename(filePath),
          path: filePath,
          size: s.size,
          isDirectory: s.isDirectory(),
        });
      } catch {
        // Skip inaccessible files
      }
    }
    return results;
  });

  // ── Example ─────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.PING, () => {
    return 'pong';
  });
}
