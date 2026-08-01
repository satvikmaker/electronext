import { powerMonitor } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels.js';
import { broadcast } from '../ipc/typed-ipc.js';
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
    // powerMonitor.on is overloaded per event name rather than taking a union,
    // so one of them stands in for all — every PowerEvent has an identical
    // zero-argument listener signature.
    powerMonitor.on(eventName as 'suspend', () => {
      log.info(`Power event: ${eventName}`);
      broadcast(IPC_CHANNELS.POWER_EVENT, eventName);
    });
  }
}
