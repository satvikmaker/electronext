import type { ElectronApplication, Page } from '@playwright/test';
import type { ElectronHandler } from '../../electron/preload';
import type { IpcSchema, IpcChannel } from '../../electron/ipc/schema';

/**
 * Wait for the main window.
 *
 * The app opens a splash window before the main one and either may be reported
 * first, so this polls the open windows rather than awaiting a future 'window'
 * event — that deadlocks whenever the main window opened before we started
 * listening.
 */
export async function findMainWindow(app: ElectronApplication, timeoutMs = 30_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const candidate of app.windows()) {
      try {
        await candidate.waitForLoadState('domcontentloaded');
        if ((await candidate.title()).includes('ElectroNext')) return candidate;
      } catch {
        // The splash window closes while being inspected — keep looking.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for the ElectroNext main window');
}

/** Invoke an IPC channel from inside the page, typed against the real schema. */
export function invoke<K extends IpcChannel>(
  page: Page,
  channel: K,
  ...args: IpcSchema[K]['args']
): Promise<IpcSchema[K]['return']> {
  return page.evaluate(
    ([ch, a]) =>
      (window as unknown as { electron: ElectronHandler }).electron.ipc.invoke(
        ch as IpcChannel,
        ...(a as never),
      ),
    [channel, args] as const,
  ) as Promise<IpcSchema[K]['return']>;
}
