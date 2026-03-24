/**
 * IPC channel constants.
 *
 * These string constants match the keys in IpcSchema exactly.
 * Use them in main-process code that registers handlers.
 */
export const IPC_CHANNELS = {
  // App info
  GET_APP_VERSION: 'app:get-version',
  GET_APP_PATH: 'app:get-path',
  REPORT_ERROR: 'app:report-error',

  // Settings
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',

  // Window
  MINIMIZE_WINDOW: 'window:minimize',
  MAXIMIZE_WINDOW: 'window:maximize',
  CLOSE_WINDOW: 'window:close',
  IS_MAXIMIZED: 'window:is-maximized',
  OPEN_WINDOW: 'window:open',

  // Auto-update
  CHECK_FOR_UPDATES: 'updater:check',
  UPDATE_AVAILABLE: 'updater:available',
  UPDATE_DOWNLOADED: 'updater:downloaded',
  UPDATE_PROGRESS: 'updater:progress',
  INSTALL_UPDATE: 'updater:install',

  // Files
  FILE_GET_METADATA: 'file:get-metadata',

  // Window push events
  MAXIMIZED_CHANGED: 'window:maximized-changed',

  // Example
  PING: 'example:ping',
} as const;

export type { IpcChannel, IpcPushChannel } from './schema.js';
