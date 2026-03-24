import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { createWindow } from './helpers/create-window.js';
import { resolveUrl, isProd, registerAppProtocol } from './helpers/resolve-path.js';
import { registerIpcHandlers } from './ipc/handlers.js';
import { IPC_CHANNELS } from './ipc/channels.js';
import { initializeLogger } from './services/logger.js';
import log from './services/logger.js';
import { appUpdater } from './services/auto-updater.js';
import { createTray, destroyTray } from './services/tray.js';
import { createMenu } from './services/menu.js';
import { applySecurityRestrictions } from './services/security.js';
import { installDevToolsExtensions } from './services/devtools.js';
import { registerProtocol, setupDeepLinkHandlers } from './services/deep-link.js';

const isDebug = !isProd || process.env.DEBUG_PROD === 'true';
const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

// ── Single instance lock ──────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Set userData path for dev BEFORE app ready to avoid conflicts
if (!isProd) {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

// Register custom protocol for deep linking (must be before app.whenReady)
registerProtocol();

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Splash screen ─────────────────────────────────────────────────────
function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 300,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splash.loadFile(path.join(app.getAppPath(), 'electron/splash/index.html'));
  return splash;
}

// ── Main window ───────────────────────────────────────────────────────
async function createMainWindow(): Promise<void> {
  splashWindow = createSplash();

  mainWindow = createWindow('main', {
    minWidth: 800,
    minHeight: 600,
    // Frameless title bar: macOS uses hidden inset (native traffic lights),
    // Windows/Linux use completely frameless (custom TitleBar component).
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 12, y: 12 } }
      : { frame: false }),
  });

  createMenu();
  createTray(mainWindow);

  // Notify renderer when maximize state changes (for title bar button icon)
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.MAXIMIZED_CHANGED, true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.MAXIMIZED_CHANGED, false);
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow?.show();

    if (isDebug) {
      mainWindow?.webContents.openDevTools();
    }
  });

  const url = resolveUrl();
  await mainWindow.loadURL(url);

  if (isProd) {
    appUpdater.setWindow(mainWindow);
    appUpdater.checkForUpdates();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Updater IPC (prod only) ───────────────────────────────────────────
function registerUpdaterHandlers(): void {
  if (!isProd) return;

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, () => {
    appUpdater.checkForUpdates();
  });

  ipcMain.handle(IPC_CHANNELS.INSTALL_UPDATE, () => {
    appUpdater.installUpdate();
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initializeLogger();
  log.info('App starting...');

  registerAppProtocol();
  applySecurityRestrictions();
  setupDeepLinkHandlers(() => mainWindow);

  if (!isProd) {
    await installDevToolsExtensions();
  }

  registerIpcHandlers();
  registerUpdaterHandlers();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray();
    app.quit();
  }
});

app.on('before-quit', () => {
  destroyTray();
});
