import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import log from './logger.js';
import { isProd } from '../helpers/resolve-path.js';

/**
 * Custom protocol scheme for deep linking.
 * Change this to match your app (e.g. 'myapp').
 * URLs will look like: electronext://some/path?key=value
 */
export const DEEP_LINK_PROTOCOL = 'electronext';

/**
 * Register the app as the handler for the custom protocol.
 * Must be called before app.whenReady().
 */
export function registerProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
  }
}

/**
 * Handle an incoming deep link URL.
 * Override this function body with your app's routing logic.
 */
export function handleDeepLink(url: string, _mainWindow: BrowserWindow | null): void {
  log.info(`Deep link received: ${url}`);

  // Example: parse the URL and navigate or dispatch an action
  // const parsed = new URL(url);
  // const route = parsed.pathname;
  // mainWindow?.webContents.send('deep-link', { route, params: Object.fromEntries(parsed.searchParams) });
}

/**
 * Set up deep link event listeners.
 * Call once inside app.whenReady(), passing a getter for the main window.
 *
 * Note: the `second-instance` event is handled in main.ts to avoid duplicate
 * listeners. This module only handles macOS `open-url` and cold-start argv.
 */
export function setupDeepLinkHandlers(getMainWindow: () => BrowserWindow | null): void {
  // macOS: the OS sends open-url events
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url, getMainWindow());
  });

  // Handle the URL that launched the app (cold start on Windows/Linux)
  if (!isProd) return;
  const launchUrl = process.argv.find((arg) => arg.startsWith(`${DEEP_LINK_PROTOCOL}://`));
  if (launchUrl) {
    handleDeepLink(launchUrl, getMainWindow());
  }
}
