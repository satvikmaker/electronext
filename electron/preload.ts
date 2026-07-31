import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IpcSchema, IpcPushEvents, IpcChannel, IpcPushChannel } from './ipc/schema.js';

/**
 * Read the initial theme synchronously from electron-store's JSON file.
 * This runs in the preload (Node context) and avoids any async IPC round-trip,
 * so it can be consumed by an inline <script> before React hydrates.
 */
function readInitialTheme(): string {
  try {
    // electron-store saves settings to {userData}/settings.json
    const userDataPath = process.env.APPDATA
      || (process.platform === 'darwin'
        ? join(process.env.HOME || '', 'Library', 'Application Support')
        : join(process.env.HOME || '', '.config'));
    const appName = 'electronext'; // matches package.json name
    const suffix = process.env.NODE_ENV !== 'production' ? ' (development)' : '';
    const settingsPath = join(userDataPath, appName + suffix, 'settings.json');
    const data = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    return data.theme || 'system';
  } catch {
    return 'system';
  }
}

const electronHandler = {
  ipc: {
    invoke<K extends IpcChannel>(
      channel: K,
      ...args: IpcSchema[K]['args']
    ): Promise<IpcSchema[K]['return']> {
      return ipcRenderer.invoke(channel, ...args);
    },

    on<K extends IpcPushChannel>(
      channel: K,
      callback: (data: IpcPushEvents[K]) => void
    ): () => void {
      const subscription = (_event: IpcRendererEvent, data: IpcPushEvents[K]) =>
        callback(data);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

    once<K extends IpcPushChannel>(
      channel: K,
      callback: (data: IpcPushEvents[K]) => void
    ): void {
      ipcRenderer.once(channel, (_event, data) => callback(data));
    },
  },

  platform: process.platform as NodeJS.Platform,

  /** Synchronous initial theme value — available before React hydrates. */
  initialTheme: readInitialTheme(),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
