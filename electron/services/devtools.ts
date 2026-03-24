import electronDevtoolsInstaller, { REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer';
import log from './logger.js';

// electron-devtools-installer exports default as a CJS module
const installExtension = electronDevtoolsInstaller.default ?? electronDevtoolsInstaller;

/**
 * Install React DevTools and Redux DevTools extensions.
 * Call only in development — fails silently in production.
 */
export async function installDevToolsExtensions(): Promise<void> {
  try {
    const extensions = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];
    for (const ext of extensions) {
      const result = await installExtension(ext, { loadExtensionOptions: { allowFileAccess: true } });
      const name = typeof result === 'string' ? result : result.name;
      log.info(`Installed DevTools extension: ${name}`);
    }
  } catch (err) {
    log.warn('Failed to install DevTools extensions:', err);
  }
}
