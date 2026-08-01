'use client';

import { useEffect, useState } from 'react';
import { useHasElectron } from '../hooks/useHasElectron';
import Switch from './Switch';

/** Toggle for the "Open at Login" setting, backed by app.setLoginItemSettings(). */
export default function StartupToggle() {
  const hasElectron = useHasElectron();
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasElectron) return;
    window.electron.ipc
      .invoke('app:get-login-settings')
      .then((settings) => {
        setOpenAtLogin(settings.openAtLogin);
        setLoaded(true);
      })
      // Render a disabled control rather than returning null: a settings row
      // that silently disappears gives the user nothing to act on.
      .catch((err: unknown) => {
        console.error('Failed to read login item settings:', err);
        setFailed(true);
      });
  }, [hasElectron]);

  const toggle = async () => {
    const next = !openAtLogin;
    try {
      await window.electron.ipc.invoke('app:set-login-settings', next);
      setOpenAtLogin(next);
    } catch (err) {
      console.error('Failed to update login item settings:', err);
      setFailed(true);
    }
  };

  if (!hasElectron || (!loaded && !failed)) return null;

  return <Switch checked={openAtLogin} onChange={toggle} label="Open at login" disabled={failed} />;
}
