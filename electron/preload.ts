import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isTheme, USER_DATA_ARG, type IpcSchema, type IpcPushEvents, type IpcChannel, type IpcPushChannel, type Theme } from './ipc/schema.js';

/**
 * Read the persisted theme synchronously so the inline script in layout.tsx can
 * apply it before React hydrates. An async IPC round-trip would flash the wrong
 * colour scheme on every launch.
 *
 * The userData directory is supplied by the main process via `additionalArguments`
 * (see helpers/create-window.ts); deriving it here would duplicate the app name
 * and dev-suffix and break silently whenever either changed.
 */
function readInitialTheme(): Theme {
  const userDataPath = process.argv.find((arg) => arg.startsWith(USER_DATA_ARG))?.slice(USER_DATA_ARG.length);
  if (!userDataPath) return 'system';

  let contents: string;
  try {
    contents = readFileSync(join(userDataPath, 'settings.json'), 'utf-8');
  } catch {
    return 'system'; // No settings file yet — first launch.
  }

  // settings.json is user-editable, so the stored value is untrusted.
  const parsed: unknown = JSON.parse(contents);
  const stored = (parsed as { theme?: unknown } | null)?.theme;
  return isTheme(stored) ? stored : 'system';
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
      ipcRenderer.once(channel, (_event: IpcRendererEvent, data: IpcPushEvents[K]) => callback(data));
    },
  },

  platform: process.platform,

  /**
   * Resolve the absolute path of a dropped or picked File.
   *
   * Electron 32 removed the `File.path` augmentation; this is its replacement
   * and must be called from the preload, where `webUtils` is available.
   */
  getPathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },

  /** Synchronous initial theme value — available before React hydrates. */
  initialTheme: readInitialTheme(),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
