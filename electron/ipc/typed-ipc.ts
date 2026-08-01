import { ipcMain, BrowserWindow, type IpcMainInvokeEvent, type WebContents } from 'electron';
import type { IpcSchema, IpcChannel, IpcPushEvents, IpcPushChannel } from './schema.js';

/**
 * Schema-bound wrappers over Electron's IPC primitives.
 *
 * Electron types `ipcMain.handle` as `(channel: string, listener: (event, ...args: any[]) => any)`
 * and `webContents.send` as `(channel: string, ...args: any[])`, so neither side of
 * the wire is checked. These wrappers reattach `IpcSchema`/`IpcPushEvents`, making
 * the schema the single definition a mismatch is caught against — which is what
 * the header of schema.ts claims. Each contains exactly one assertion, at the
 * point where the untyped Electron signature is unavoidable.
 */

type InvokeHandler<K extends IpcChannel> = (
  event: IpcMainInvokeEvent,
  ...args: IpcSchema[K]['args']
) => IpcSchema[K]['return'] | Promise<IpcSchema[K]['return']>;

/** Register a handler whose parameters and return type derive from the schema. */
export function handle<K extends IpcChannel>(channel: K, listener: InvokeHandler<K>): void {
  ipcMain.handle(channel, listener as Parameters<typeof ipcMain.handle>[1]);
}

/**
 * Push an event to one renderer, skipping destroyed targets.
 *
 * Guarding here means every call site gets it, rather than each remembering.
 */
export function sendTo<K extends IpcPushChannel>(
  target: BrowserWindow | WebContents | null | undefined,
  channel: K,
  data: IpcPushEvents[K],
): void {
  if (!target) return;
  const contents = target instanceof BrowserWindow ? target.webContents : target;
  if (contents.isDestroyed()) return;
  contents.send(channel, data);
}

/** Push an event to every open window. */
export function broadcast<K extends IpcPushChannel>(channel: K, data: IpcPushEvents[K]): void {
  for (const win of BrowserWindow.getAllWindows()) sendTo(win, channel, data);
}
