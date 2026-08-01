'use client';

import { useEffect, useState } from 'react';
import { useHasElectron } from '../hooks/useHasElectron';
import Switch from './Switch';

export default function SpellCheckToggle() {
  const hasElectron = useHasElectron();
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasElectron) return;
    window.electron.ipc
      .invoke('spellcheck:get-config')
      .then((config) => {
        setEnabled(config.enabled);
        setLoaded(true);
      })
      // Render a disabled control rather than returning null: a settings row
      // that silently disappears gives the user nothing to act on.
      .catch((err: unknown) => {
        console.error('Failed to read spell checker config:', err);
        setFailed(true);
      });
  }, [hasElectron]);

  const toggle = async () => {
    const next = !enabled;
    try {
      await window.electron.ipc.invoke('spellcheck:set-enabled', next);
      setEnabled(next);
    } catch (err) {
      console.error('Failed to update spell checker:', err);
      setFailed(true);
    }
  };

  if (!hasElectron || (!loaded && !failed)) return null;

  return <Switch checked={enabled} onChange={toggle} label="Toggle spell checking" disabled={failed} />;
}
