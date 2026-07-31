import log from './logger.js';

type InstallExtension = (
  extension: unknown,
  options?: { loadExtensionOptions?: { allowFileAccess?: boolean } },
) => Promise<string | { name: string }>;

/**
 * Install React DevTools and Redux DevTools extensions.
 * Call only in development — fails silently in production.
 *
 * `electron-devtools-installer` is a devDependency and is deliberately not
 * packaged, so it must be imported lazily. A top-level import would be resolved
 * eagerly when the packaged main bundle loads and would crash the shipped app.
 */
export async function installDevToolsExtensions(): Promise<void> {
  try {
    const mod = await import('electron-devtools-installer');

    // The package is CJS, so depending on interop the callable sits either at
    // `default` or at `default.default`.
    const exported = mod.default as unknown as InstallExtension & { default?: InstallExtension };
    const installExtension: InstallExtension = exported.default ?? exported;

    for (const ext of [mod.REACT_DEVELOPER_TOOLS, mod.REDUX_DEVTOOLS]) {
      const result = await installExtension(ext, { loadExtensionOptions: { allowFileAccess: true } });
      const name = typeof result === 'string' ? result : result.name;
      log.info(`Installed DevTools extension: ${name}`);
    }
  } catch (err) {
    log.warn('Failed to install DevTools extensions:', err);
  }
}
