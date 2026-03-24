'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';

// ── Platform detection via useSyncExternalStore ───────────────────────
// Avoids both hydration mismatch (server snapshot = null) and the
// react-hooks/set-state-in-effect lint rule.
const noopSubscribe = () => () => {};
const getIsMacClient = (): boolean | null =>
  typeof window !== 'undefined' && window.electron
    ? window.electron.platform === 'darwin'
    : null;
const getIsMacServer = (): null => null;

/**
 * Custom title bar with drag region and window controls.
 *
 * - macOS: native traffic lights via `titleBarStyle: 'hiddenInset'`.
 *   This component only provides the drag region.
 * - Windows / Linux: `frame: false` — custom minimize/maximize/close buttons.
 */
export default function TitleBar() {
  const isMac = useSyncExternalStore(noopSubscribe, getIsMacClient, getIsMacServer);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const electron = window.electron;
    if (!electron) return;

    electron.ipc.invoke('window:is-maximized').then(setIsMaximized);
    const unsub = electron.ipc.on('window:maximized-changed', setIsMaximized);
    return unsub;
  }, []);

  const minimize = useCallback(() => window.electron?.ipc.invoke('window:minimize'), []);
  const maximize = useCallback(() => window.electron?.ipc.invoke('window:maximize'), []);
  const close = useCallback(() => window.electron?.ipc.invoke('window:close'), []);

  // Placeholder until platform is known (SSR / non-Electron browser)
  if (isMac === null) {
    return <div className="h-9 border-b border-surface-light bg-surface" />;
  }

  return (
    <div className="flex h-9 items-center justify-between border-b border-surface-light bg-surface">
      {/* Drag region — fills available space */}
      <div
        className="flex-1 h-full"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span
          className="inline-flex items-center h-full text-xs font-medium text-text-muted select-none"
          style={{ paddingLeft: isMac ? 76 : 12 }}
        >
          ElectroNext
        </span>
      </div>

      {/* Window controls — only on Windows/Linux */}
      {!isMac && (
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={minimize}
            className="flex h-full w-11 items-center justify-center text-text-muted transition-colors hover:bg-surface-light"
            aria-label="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1"><rect fill="currentColor" width="10" height="1" /></svg>
          </button>
          <button
            onClick={maximize}
            className="flex h-full w-11 items-center justify-center text-text-muted transition-colors hover:bg-surface-light"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10"><path fill="none" stroke="currentColor" strokeWidth="1" d="M3 0.5h6.5v6.5M0.5 3h6.5v6.5H0.5z" /></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10"><rect fill="none" stroke="currentColor" strokeWidth="1" x="0.5" y="0.5" width="9" height="9" /></svg>
            )}
          </button>
          <button
            onClick={close}
            className="flex h-full w-11 items-center justify-center text-text-muted transition-colors hover:bg-red-500 hover:text-white"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path stroke="currentColor" strokeWidth="1.2" d="M1 1l8 8M9 1l-8 8" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
