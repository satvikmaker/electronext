import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { IpcSchema, IpcPushEvents, IpcChannel, IpcPushChannel } from './ipc/schema.js';

const electronHandler = {
  ipc: {
    /** Type-safe invoke (renderer → main, returns a promise). */
    invoke<K extends IpcChannel>(
      channel: K,
      ...args: IpcSchema[K]['args']
    ): Promise<IpcSchema[K]['return']> {
      return ipcRenderer.invoke(channel, ...args);
    },

    /** Type-safe listener for push events (main → renderer). Returns unsubscribe fn. */
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

    /** Listen once for a push event. */
    once<K extends IpcPushChannel>(
      channel: K,
      callback: (data: IpcPushEvents[K]) => void
    ): void {
      ipcRenderer.once(channel, (_event, data) => callback(data));
    },
  },

  platform: process.platform as NodeJS.Platform,
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
