'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function IpcDemo() {
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const t = useTranslation();

  const handlePing = async () => {
    if (typeof window !== 'undefined' && window.electron) {
      const result = await window.electron.ipc.invoke('example:ping');
      setPingResult(result);
    } else {
      setPingResult('IPC not available (running in browser)');
    }
  };

  const handleGetVersion = async () => {
    if (typeof window !== 'undefined' && window.electron) {
      const version = await window.electron.ipc.invoke('app:get-version');
      setAppVersion(version);
    } else {
      setAppVersion('Not running in Electron');
    }
  };

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-text">{t('ipc.title')}</h2>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePing}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            {t('ipc.ping')}
          </button>
          {pingResult && (
            <span className="text-sm text-text-muted">
              Response: <code className="rounded bg-surface-light px-2 py-0.5 text-primary">{pingResult}</code>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGetVersion}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            {t('ipc.version')}
          </button>
          {appVersion && (
            <span className="text-sm text-text-muted">
              Version: <code className="rounded bg-surface-light px-2 py-0.5 text-secondary">{appVersion}</code>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
