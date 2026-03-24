import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import log from './logger.js';
import { isProd } from '../helpers/resolve-path.js';

/**
 * Custom protocol scheme for deep linking.
 * Change this to match your app (e.g. 'myapp').
 * URLs will look like: electronext://some/path?key=value
 */
const PROTOCOL = 'electronext';

/**
 * Register the app as the handler for the custom protocol.
 * Must be called before app.whenReady().
 *
 * In development, pass the Electron executable path explicitly
 * so the OS routes the protocol to the dev instance.
 */
export function registerProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

/**
 * Handle an incoming deep link URL.
 * Override this function body with your app's routing logic.
 */
function handleDeepLink(url: string, mainWindow: BrowserWindow | null): void {
  log.info(`Deep link received: ${url}`);

  // Example: parse the URL and navigate or dispatch an action
  // const parsed = new URL(url);
  // const route = parsed.pathname;
  // mainWindow?.webContents.send('deep-link', { route, params: Object.fromEntries(parsed.searchParams) });

  void mainWindow; // placeholder — remove when implementing
}

/**
 * Set up deep link event listeners.
 * Call once inside app.whenReady(), passing a getter for the main window.
 *
 * Note: the main window focus/restore on second-instance is handled in main.ts.
 * This module only processes the protocol URL from the argv.
 */
export function setupDeepLinkHandlers(getMainWindow: () => BrowserWindow | null): void {
  // macOS: the OS sends open-url events
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url, getMainWindow());
  });

  // Windows/Linux: the URL arrives via process.argv on the second instance
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url, getMainWindow());
    }
  });

  // Handle the URL that launched the app (cold start on Windows/Linux)
  if (!isProd) return;
  const launchUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (launchUrl) {
    handleDeepLink(launchUrl, getMainWindow());
  }
}
