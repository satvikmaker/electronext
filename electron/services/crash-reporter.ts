import { app } from 'electron';
import type { CrashReport } from '../ipc/schema.js';
import log from './logger.js';

/**
 * Crash Reporter service.
 *
 * Handles error reports from the renderer process.
 * In production, optionally sends reports to a remote endpoint.
 *
 * Configure the endpoint via CRASH_REPORT_URL environment variable,
 * or override sendToRemote() with your preferred service (Sentry, etc.).
 */

const CRASH_REPORT_URL = process.env.CRASH_REPORT_URL || '';

/**
 * Process an incoming crash report from the renderer.
 */
export async function handleCrashReport(report: CrashReport): Promise<void> {
  // Always log locally
  log.error('[Crash Report]', report.message);
  if (report.stack) log.error('[Stack]', report.stack);
  log.error('[Meta]', `v${report.appVersion} | ${report.platform} | ${report.timestamp}`);

  // Send to remote if configured
  if (CRASH_REPORT_URL) {
    await sendToRemote(report);
  }
}

/**
 * Send a crash report to a remote HTTP endpoint.
 *
 * Replace this with your preferred service (Sentry, Datadog, etc.)
 * or leave as-is for a generic POST endpoint.
 */
async function sendToRemote(report: CrashReport): Promise<void> {
  try {
    const response = await fetch(CRASH_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...report,
        appName: app.getName(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
      }),
    });

    if (!response.ok) {
      log.warn(`Crash report endpoint returned ${response.status}`);
    }
  } catch (err) {
    log.warn('Failed to send crash report:', err);
  }
}
