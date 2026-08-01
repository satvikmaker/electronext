import log from './logger.js';

/**
 * Install React and Redux DevTools extensions. Development only.
 *
 * `electron-devtools-installer` is a devDependency and is deliberately absent
 * from packaged builds, so it must be imported lazily — a top-level import
 * would be resolved when the packaged main bundle loads and crash the app.
 */
export async function installDevToolsExtensions(): Promise<void> {
  try {
    const { installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = await import('electron-devtools-installer');

    for (const extension of [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS]) {
      const installed = await installExtension(extension, {
        loadExtensionOptions: { allowFileAccess: true },
      });
      log.info(`Installed DevTools extension: ${installed.name}`);
    }
  } catch (err) {
    log.warn('Failed to install DevTools extensions:', err);
  }
}
