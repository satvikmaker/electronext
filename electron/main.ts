import { app, BrowserWindow, dialog, globalShortcut } from 'electron';
import path from 'node:path';
import { createWindow, getWindow } from './helpers/create-window.js';
import { resolveUrl, isProd, registerAppProtocol } from './helpers/resolve-path.js';
import { registerIpcHandlers } from './ipc/handlers.js';
import { IPC_CHANNELS } from './ipc/channels.js';
import { handle, sendTo } from './ipc/typed-ipc.js';
import { initializeLogger } from './services/logger.js';
import log from './services/logger.js';
import { appUpdater } from './services/auto-updater.js';
import { createTray, destroyTray } from './services/tray.js';
import { createMenu } from './services/menu.js';
import { applySecurityRestrictions } from './services/security.js';
import { installDevToolsExtensions } from './services/devtools.js';
import { registerProtocol, setupDeepLinkHandlers, handleDeepLink, DEEP_LINK_PROTOCOL } from './services/deep-link.js';
import { setupPowerMonitor } from './services/power-monitor.js';
import { workerManager } from './services/worker-manager.js';
import { initDatabase, closeDatabase } from './services/database.js';
import { initSpellChecker } from './services/spell-checker.js';

const isDebug = !isProd || process.env.DEBUG_PROD === 'true';
const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

// Store file path opened via OS file association (before app is ready)
let pendingFilePath: string | null = null;

// ── Single instance lock ──────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

if (!isProd) {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

registerProtocol();

app.on('second-instance', (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  // Check for deep link URL first (electronext://...)
  const deepLinkUrl = argv.find((arg) => arg.startsWith(`${DEEP_LINK_PROTOCOL}://`));
  if (deepLinkUrl) {
    handleDeepLink(deepLinkUrl, mainWindow);
    return;
  }

  // Otherwise check for file path (Windows/Linux file association)
  const filePath = argv.find((arg) => !arg.startsWith('-') && arg !== process.execPath && arg !== '.');
  if (filePath && mainWindow) {
    sendTo(mainWindow, IPC_CHANNELS.FILE_OPENED, filePath);
  }
});

// macOS: file opened via Finder / file association
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    sendTo(mainWindow, IPC_CHANNELS.FILE_OPENED, filePath);
  } else {
    pendingFilePath = filePath;
  }
});

// ── Splash screen ─────────────────────────────────────────────────────
function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 300, height: 300,
    frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splash.loadFile(path.join(app.getAppPath(), 'resources/splash.html'));
  return splash;
}

// ── Main window ───────────────────────────────────────────────────────
async function createMainWindow(): Promise<void> {
  // createWindow returns the existing window for a name already in use. Bail
  // out before creating a splash, otherwise it would wait on a `ready-to-show`
  // that already fired and hang around forever.
  const existing = getWindow('main');
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
    return;
  }

  splashWindow = createSplash();

  mainWindow = createWindow('main', {
    minWidth: 800,
    minHeight: 600,
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 12, y: 12 } }
      : { frame: false }),
  });

  createMenu();
  createTray(mainWindow);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow?.show();

    if (isDebug) {
      mainWindow?.webContents.openDevTools();
    }

    // Send any pending file that was opened before the window was ready
    if (pendingFilePath && mainWindow) {
      sendTo(mainWindow, IPC_CHANNELS.FILE_OPENED, pendingFilePath);
      pendingFilePath = null;
    }
  });

  const url = resolveUrl();
  await mainWindow.loadURL(url);

  if (isProd) {
    appUpdater.setWindow(mainWindow);
    appUpdater.checkForUpdates();
  }

  mainWindow.on('closed', () => {
    appUpdater.clearWindow();
    mainWindow = null;
  });
}

// ── Updater IPC (prod only) ───────────────────────────────────────────
function registerUpdaterHandlers(): void {
  if (!isProd) return;
  handle(IPC_CHANNELS.CHECK_FOR_UPDATES, () => appUpdater.checkForUpdates());
  handle(IPC_CHANNELS.INSTALL_UPDATE, () => appUpdater.installUpdate());
}

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initializeLogger();
  log.info('App starting...');

  registerAppProtocol();
  applySecurityRestrictions();
  setupDeepLinkHandlers(() => mainWindow);
  setupPowerMonitor();
  await initDatabase();
  initSpellChecker();

  if (!isProd) {
    await installDevToolsExtensions();
  }

  registerIpcHandlers();
  registerUpdaterHandlers();
  await createMainWindow();

  // Keyed on the main window rather than a zero-window count: with a secondary
  // window (say Settings) still open, clicking the dock icon previously did
  // nothing at all, leaving no way back to the app's main view.
  app.on('activate', () => {
    void createMainWindow().catch((err: unknown) => log.error('Failed to reopen main window:', err));
  });
}).catch((err: unknown) => {
  // Without this, a failure in database/protocol/spell-checker setup surfaces as
  // an unhandled rejection: splash screen on screen, no window, no explanation.
  log.error('Fatal startup failure:', err);
  dialog.showErrorBox('ElectroNext failed to start', err instanceof Error ? (err.stack ?? err.message) : String(err));
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray();
    app.quit();
  }
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  workerManager.terminateAll();
  closeDatabase();
  destroyTray();
});
