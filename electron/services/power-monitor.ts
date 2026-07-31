import { powerMonitor, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels.js';
import type { PowerEvent } from '../ipc/schema.js';
import log from './logger.js';

/**
 * Set up power monitor event forwarding.
 * Sends 'system:power-event' push events to all renderer windows.
 *
 * Must be called after app.whenReady().
 */
export function setupPowerMonitor(): void {
  const events: PowerEvent[] = [
    'suspend',
    'resume',
    'lock-screen',
    'unlock-screen',
    'on-ac',
    'on-battery',
  ];

  for (const eventName of events) {
    // Each event name is a valid Electron powerMonitor event
    powerMonitor.on(eventName as 'suspend', () => {
      log.info(`Power event: ${eventName}`);
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.POWER_EVENT, eventName);
        }
      }
    });
  }
}
