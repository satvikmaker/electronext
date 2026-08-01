import type { IpcChannel, IpcPushChannel } from './schema.js';

/**
 * IPC channel constants.
 * String values match the keys in IpcSchema exactly.
 */
export const IPC_CHANNELS = {
  // App info
  GET_APP_VERSION: 'app:get-version',
  GET_APP_PATH: 'app:get-path',
  REPORT_ERROR: 'app:report-error',
  GET_LOCALE: 'app:get-locale',
  SET_PROGRESS: 'app:set-progress',
  SET_BADGE_COUNT: 'app:set-badge-count',
  GET_LOGIN_SETTINGS: 'app:get-login-settings',
  SET_LOGIN_SETTINGS: 'app:set-login-settings',

  // Settings
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',

  // Window
  MINIMIZE_WINDOW: 'window:minimize',
  MAXIMIZE_WINDOW: 'window:maximize',
  CLOSE_WINDOW: 'window:close',
  IS_MAXIMIZED: 'window:is-maximized',
  OPEN_WINDOW: 'window:open',
  TOGGLE_DEVTOOLS: 'window:toggle-devtools',

  // Auto-update
  CHECK_FOR_UPDATES: 'updater:check',
  UPDATE_AVAILABLE: 'updater:available',
  UPDATE_DOWNLOADED: 'updater:downloaded',
  UPDATE_PROGRESS: 'updater:progress',
  INSTALL_UPDATE: 'updater:install',

  // Files
  FILE_GET_METADATA: 'file:get-metadata',
  FILE_OPENED: 'file:opened',

  // Notifications
  NOTIFICATION_SHOW: 'notification:show',

  // Shortcuts
  SHORTCUTS_REGISTER: 'shortcuts:register-global',
  SHORTCUTS_UNREGISTER: 'shortcuts:unregister-global',
  SHORTCUT_TRIGGERED: 'shortcut:triggered',

  // Context menu
  CONTEXT_MENU_SHOW: 'context-menu:show',

  // Secure storage
  SECURE_SET: 'secure:set',
  SECURE_GET: 'secure:get',
  SECURE_DELETE: 'secure:delete',

  // File dialogs
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',

  // Menu
  MENU_UPDATE_ITEM: 'menu:update-item',

  // Clipboard
  CLIPBOARD_READ_TEXT: 'clipboard:read-text',
  CLIPBOARD_WRITE_TEXT: 'clipboard:write-text',
  CLIPBOARD_HAS_TEXT: 'clipboard:has-text',
  CLIPBOARD_READ_IMAGE: 'clipboard:read-image',
  CLIPBOARD_WRITE_IMAGE: 'clipboard:write-image',

  // Power monitor
  POWER_EVENT: 'system:power-event',

  // Workers
  WORKER_START: 'worker:start',
  WORKER_CANCEL: 'worker:cancel',
  WORKER_PROGRESS: 'worker:progress',
  WORKER_COMPLETE: 'worker:complete',
  WORKER_ERROR: 'worker:error',

  // Window push events
  MAXIMIZED_CHANGED: 'window:maximized-changed',

  // Database
  DB_QUERY: 'db:query',
  DB_RUN: 'db:run',

  // Spell checker
  SPELLCHECK_GET_CONFIG: 'spellcheck:get-config',
  SPELLCHECK_SET_ENABLED: 'spellcheck:set-enabled',
  SPELLCHECK_SET_LANGUAGES: 'spellcheck:set-languages',
  SPELLCHECK_ADD_WORD: 'spellcheck:add-word',


  // Example
  PING: 'example:ping',
  // `satisfies` makes a constant that does not name a real channel a compile
  // error here, so these stay in step with schema.ts.
} as const satisfies Record<string, IpcChannel | IpcPushChannel>;

export type { IpcChannel, IpcPushChannel } from './schema.js';
