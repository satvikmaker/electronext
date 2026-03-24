/**
 * End-to-end typed IPC schema.
 *
 * Every IPC channel is defined here with its argument tuple and return type.
 * Both the main process handlers and the renderer preload are typed against
 * this single source of truth — a type mismatch is caught at compile time.
 */

// ── Invoke / Handle (renderer → main, request/response) ─────────────

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

export interface IpcSchema {
  // App info
  'app:get-version': { args: []; return: string };
  'app:get-path': { args: [name: string]; return: string };
  'app:report-error': { args: [error: { message: string; stack?: string; componentStack?: string }]; return: void };

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

  // Example
  'example:ping': { args: []; return: string };
}

// ── Push events (main → renderer, one-way) ───────────────────────────

export interface IpcPushEvents {
  'updater:available': UpdateInfoSummary;
  'updater:downloaded': UpdateInfoSummary;
  'updater:progress': UpdateProgress;
  'window:maximized-changed': boolean;
}

// ── Helper types ─────────────────────────────────────────────────────

export type IpcChannel = keyof IpcSchema;
export type IpcPushChannel = keyof IpcPushEvents;
