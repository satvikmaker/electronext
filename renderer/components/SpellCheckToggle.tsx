'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};
const getHasElectron = () => typeof window !== 'undefined' && !!window.electron;
const getServerHasElectron = () => false;

export default function SpellCheckToggle() {
  const hasElectron = useSyncExternalStore(noopSubscribe, getHasElectron, getServerHasElectron);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hasElectron) return;
    window.electron.ipc.invoke('spellcheck:get-config').then((config) => {
      setEnabled(config.enabled);
      setLoaded(true);
    }).catch(() => {});
  }, [hasElectron]);

  const toggle = async () => {
    if (!window.electron) return;
    const next = !enabled;
    await window.electron.ipc.invoke('spellcheck:set-enabled', next);
    setEnabled(next);
  };

  if (!hasElectron || !loaded) return null;

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={enabled}
      aria-label="Toggle spell checking"
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-surface-light'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
