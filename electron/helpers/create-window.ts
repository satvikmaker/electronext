import { app, BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { USER_DATA_ARG } from '../ipc/schema.js';
import { IPC_CHANNELS } from '../ipc/channels.js';
import { sendTo } from '../ipc/typed-ipc.js';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;

function isWindowWithinDisplay(state: WindowState): boolean {
  const displays = screen.getAllDisplays();
  return displays.some((display) => {
    const { x, y, width, height } = display.bounds;
    return (
      state.x !== undefined &&
      state.y !== undefined &&
      state.x >= x &&
      state.y >= y &&
      state.x + state.width <= x + width &&
      state.y + state.height <= y + height
    );
  });
}

/**
 * Every live window, keyed by the name its persisted bounds are stored under.
 *
 * Single registry on purpose: two of them meant secondary windows never received
 * `window:maximized-changed` (so their title bars showed a stale state), and
 * `window:open('main', …)` would create a second window fighting the real main
 * window over the same `window-state-main` file.
 */
const windows = new Map<string, BrowserWindow>();

/** The live window registered under `name`, if any. */
export function getWindow(name: string): BrowserWindow | undefined {
  const win = windows.get(name);
  return win && !win.isDestroyed() ? win : undefined;
}

export function createWindow(
  windowName: string,
  options: Partial<BrowserWindowConstructorOptions> = {}
): BrowserWindow {
  const existing = getWindow(windowName);
  if (existing) return existing;

  const store = new Store<WindowState>({ name: `window-state-${windowName}` });
  const storeData = store.store;

  const savedState: WindowState = {
    width: storeData.width || DEFAULT_WIDTH,
    height: storeData.height || DEFAULT_HEIGHT,
    x: storeData.x,
    y: storeData.y,
    isMaximized: storeData.isMaximized,
  };

  const state = isWindowWithinDisplay(savedState)
    ? savedState
    : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

  // Destructure webPreferences out of options so we can merge (not replace)
  const { webPreferences: extraWebPrefs, ...restOptions } = options;

  const win = new BrowserWindow({
    ...state,
    show: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, '..', 'preload.js'),
      // The preload reads settings.json synchronously to avoid a theme flash,
      // and cannot call app.getPath(). Hand it the resolved directory rather
      // than letting it re-derive one from platform guesswork.
      additionalArguments: [`${USER_DATA_ARG}${app.getPath('userData')}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      ...extraWebPrefs,
    },
    ...restOptions,
  });

  if (savedState.isMaximized) {
    win.maximize();
  }

  win.on('close', () => {
    const bounds = win.getBounds();
    store.set({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: win.isMaximized(),
    });
  });

  // Registered here so every window gets it, not just the main one.
  win.on('maximize', () => sendTo(win, IPC_CHANNELS.MAXIMIZED_CHANGED, true));
  win.on('unmaximize', () => sendTo(win, IPC_CHANNELS.MAXIMIZED_CHANGED, false));

  windows.set(windowName, win);
  win.on('closed', () => {
    if (windows.get(windowName) === win) windows.delete(windowName);
  });

  // NOTE: no ready-to-show handler here — the caller (main.ts) owns window
  // visibility to coordinate splash screen dismissal.

  return win;
}
