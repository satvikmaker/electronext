'use client';

import { useState, useEffect } from 'react';

type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'ready'; version: string };

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electron) return;

    const unsubs = [
      window.electron.ipc.on('updater:available', (info) => {
        setState({ status: 'available', version: (info as { version: string }).version });
        setDismissed(false);
      }),
      window.electron.ipc.on('updater:progress', (progress) => {
        const p = progress as { percent: number };
        setState((prev) =>
          prev.status !== 'idle'
            ? { status: 'downloading', version: (prev as { version: string }).version, percent: p.percent }
            : prev
        );
      }),
      window.electron.ipc.on('updater:downloaded', (info) => {
        setState({ status: 'ready', version: (info as { version: string }).version });
        setDismissed(false);
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  if (state.status === 'idle' || dismissed) return null;

  const handleInstall = () => {
    window.electron?.ipc.invoke('updater:install');
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-xs text-white">
      <div className="flex items-center gap-2">
        {state.status === 'available' && (
          <span>Update v{state.version} available — downloading...</span>
        )}
        {state.status === 'downloading' && (
          <>
            <span>Downloading v{state.version}...</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <span>{Math.round(state.percent)}%</span>
          </>
        )}
        {state.status === 'ready' && (
          <span>Update v{state.version} ready to install</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {state.status === 'ready' && (
          <button
            onClick={handleInstall}
            className="rounded bg-white px-3 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-white/90"
          >
            Restart &amp; Update
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 transition-colors hover:text-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
