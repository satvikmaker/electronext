import type { ElectronHandler } from '../../electron/preload';

declare global {
  interface Window {
    electron: ElectronHandler;
  }
}

export type { ElectronHandler };
