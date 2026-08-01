import { app, BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { USER_DATA_ARG } from '../ipc/schema.js';

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

export function createWindow(
  windowName: string,
  options: Partial<BrowserWindowConstructorOptions> = {}
): BrowserWindow {
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

  // NOTE: no ready-to-show handler here — the caller (main.ts) owns window
  // visibility to coordinate splash screen dismissal.

  return win;
}
