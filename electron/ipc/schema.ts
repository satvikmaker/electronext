/**
 * End-to-end typed IPC schema.
 *
 * Every IPC channel is defined here with its argument tuple and return type.
 * Both the main process handlers and the renderer preload are typed against
 * this single source of truth — a type mismatch is caught at compile time.
 */

// ── Shared types ─────────────────────────────────────────────────────

export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateInfoSummary {
  version: string;
  releaseDate?: string;
}

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  type?: 'normal' | 'separator';
  enabled?: boolean;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiSelect?: boolean;
  directory?: boolean;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface MenuItemUpdate {
  id: string;
  enabled?: boolean;
  checked?: boolean;
  label?: string;
  visible?: boolean;
}

export interface LoginItemSettings {
  openAtLogin: boolean;
}

export type PowerEvent = 'suspend' | 'resume' | 'lock-screen' | 'unlock-screen' | 'on-ac' | 'on-battery';

export interface WorkerResult {
  workerId: string;
  data: unknown;
  error?: string;
}

export interface DbQueryResult {
  rows: Record<string, unknown>[];
  changes?: number;
}

export interface SpellCheckerConfig {
  enabled: boolean;
  languages: string[];
  availableLanguages: string[];
}

export interface CrashReport {
  message: string;
  stack?: string;
  componentStack?: string;
  appVersion: string;
  platform: string;
  timestamp: string;
}

// ── Invoke / Handle (renderer → main, request/response) ─────────────

export interface IpcSchema {
  // App info
  'app:get-version': { args: []; return: string };
  'app:get-path': { args: [name: string]; return: string };
  'app:report-error': { args: [error: { message: string; stack?: string; componentStack?: string }]; return: void };
  'app:get-locale': { args: []; return: string };
  'app:set-progress': { args: [progress: number]; return: void };
  'app:set-badge-count': { args: [count: number]; return: void };
  'app:get-login-settings': { args: []; return: LoginItemSettings };
  'app:set-login-settings': { args: [openAtLogin: boolean]; return: void };

  // Settings
  'settings:get': { args: [key: string]; return: unknown };
  'settings:set': { args: [key: string, value: unknown]; return: void };

  // Window
  'window:minimize': { args: []; return: void };
  'window:maximize': { args: []; return: void };
  'window:close': { args: []; return: void };
  'window:is-maximized': { args: []; return: boolean };
  'window:open': { args: [name: string, route: string]; return: void };

  // Auto-update
  'updater:check': { args: []; return: void };
  'updater:install': { args: []; return: void };

  // Files
  'file:get-metadata': { args: [paths: string[]]; return: FileMetadata[] };

  // Notifications
  'notification:show': { args: [options: NotificationOptions]; return: void };

  // Shortcuts
  'shortcuts:register-global': { args: [accelerator: string, id: string]; return: boolean };
  'shortcuts:unregister-global': { args: [accelerator: string]; return: void };

  // Context menu
  'context-menu:show': { args: [items: ContextMenuItem[]]; return: string | null };

  // Secure storage
  'secure:set': { args: [key: string, value: string]; return: void };
  'secure:get': { args: [key: string]; return: string | null };
  'secure:delete': { args: [key: string]; return: void };

  // File dialogs
  'dialog:open-file': { args: [options?: OpenDialogOptions]; return: string[] };
  'dialog:save-file': { args: [options?: SaveDialogOptions]; return: string | null };

  // Menu
  'menu:update-item': { args: [update: MenuItemUpdate]; return: void };

  // Clipboard
  'clipboard:read-text': { args: []; return: string };
  'clipboard:write-text': { args: [text: string]; return: void };
  'clipboard:has-text': { args: []; return: boolean };
  'clipboard:read-image': { args: []; return: string | null };
  'clipboard:write-image': { args: [dataUrl: string]; return: void };

  // Workers
  'worker:start': { args: [taskName: string, data: unknown]; return: string };
  'worker:cancel': { args: [workerId: string]; return: void };

  // Database (#2)
  'db:query': { args: [sql: string, params?: unknown[]]; return: DbQueryResult };
  'db:run': { args: [sql: string, params?: unknown[]]; return: { changes: number; lastInsertRowid: number } };

  // Spell checker (#7)
  'spellcheck:get-config': { args: []; return: SpellCheckerConfig };
  'spellcheck:set-enabled': { args: [enabled: boolean]; return: void };
  'spellcheck:set-languages': { args: [languages: string[]]; return: void };
  'spellcheck:add-word': { args: [word: string]; return: void };

  // Crash reporter (#6)
  'crash:send-report': { args: [report: CrashReport]; return: void };

  // Example
  'example:ping': { args: []; return: string };
}

// ── Push events (main → renderer, one-way) ───────────────────────────

export interface IpcPushEvents {
  'updater:available': UpdateInfoSummary;
  'updater:downloaded': UpdateInfoSummary;
  'updater:progress': UpdateProgress;
  'window:maximized-changed': boolean;
  'shortcut:triggered': string;
  'file:opened': string;
  'system:power-event': PowerEvent;
  'worker:progress': { workerId: string; percent: number; message?: string };
  'worker:complete': WorkerResult;
  'worker:error': WorkerResult;
}

// ── Helper types ─────────────────────────────────────────────────────

export type IpcChannel = keyof IpcSchema;
export type IpcPushChannel = keyof IpcPushEvents;
