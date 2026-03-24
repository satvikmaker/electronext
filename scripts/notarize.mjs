#!/usr/bin/env node

/**
 * macOS notarization hook for electron-builder.
 * Runs automatically after code signing via the `afterSign` hook in electron-builder.yml.
 *
 * Required environment variables (set in CI):
 *   APPLE_ID           — Your Apple ID email
 *   APPLE_ID_PASS      — App-specific password (NOT your Apple ID password)
 *   APPLE_TEAM_ID      — Your Apple Developer Team ID
 *
 * Skips notarization when:
 *   - Not building for macOS
 *   - Not running in CI (to avoid blocking local development)
 *   - Required env vars are missing
 */

import { notarize } from '@electron/notarize';

/** @param {import('electron-builder').AfterPackContext} context */
export default async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  if (process.env.CI !== 'true') {
    console.log('Skipping notarization — not running in CI.');
    return;
  }

  const { APPLE_ID, APPLE_ID_PASS, APPLE_TEAM_ID } = process.env;
  if (!APPLE_ID || !APPLE_ID_PASS || !APPLE_TEAM_ID) {
    console.warn(
      'Skipping notarization — APPLE_ID, APPLE_ID_PASS, and APPLE_TEAM_ID must all be set.'
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  await notarize({
    tool: 'notarytool',
    appBundleId: 'com.electronext.app',
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_ID_PASS,
    teamId: APPLE_TEAM_ID,
  });

  console.log('Notarization complete.');
}
