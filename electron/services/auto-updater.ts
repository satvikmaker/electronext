import electronUpdater, { type UpdateInfo } from 'electron-updater';

const { autoUpdater } = electronUpdater;
import { BrowserWindow } from 'electron';
import log from './logger.js';
import { IPC_CHANNELS } from '../ipc/channels.js';

export class AppUpdater {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      log.info('Update available:', info.version);
      this.sendToRenderer(IPC_CHANNELS.UPDATE_AVAILABLE, {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(progress.percent / 100);
      }
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      log.info('Update downloaded:', info.version);
      this.sendToRenderer(IPC_CHANNELS.UPDATE_DOWNLOADED, {
        version: info.version,
        releaseDate: info.releaseDate,
      });
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(-1);
      }
    });

    autoUpdater.on('error', (error) => {
      log.error('Auto-updater error:', error);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(-1);
      }
    });
  }

  /** Safe send — guards against destroyed window. */
  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  setWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  clearWindow(): void {
    this.mainWindow = null;
  }

  checkForUpdates(): void {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      log.error('Failed to check for updates:', error);
    });
  }

  installUpdate(): void {
    autoUpdater.quitAndInstall();
  }
}

export const appUpdater = new AppUpdater();
