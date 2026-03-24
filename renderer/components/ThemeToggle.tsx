'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { setTheme } from '@/lib/features/themeSlice';

const themes = ['light', 'dark', 'system'] as const;
type Theme = (typeof themes)[number];

const labels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function ThemeToggle() {
  const theme = useAppSelector((state) => state.theme.theme);
  const dispatch = useAppDispatch();

  // Load persisted theme from electron-store on mount
  useEffect(() => {
    if (!window.electron) return;
    window.electron.ipc.invoke('settings:get', 'theme').then((saved) => {
      if (saved && saved !== theme) {
        dispatch(setTheme(saved as Theme));
      }
    });
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme class + persist to electron-store
  useEffect(() => {
    const root = document.documentElement;

    function apply(resolved: 'light' | 'dark') {
      root.classList.toggle('dark', resolved === 'dark');
    }

    // Persist to electron-store
    window.electron?.ipc.invoke('settings:set', 'theme', theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    apply(theme);
  }, [theme]);

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-surface-light p-1">
      {themes.map((t) => (
        <button
          key={t}
          onClick={() => dispatch(setTheme(t))}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            theme === t
              ? 'bg-primary text-white'
              : 'text-text-muted hover:text-text'
          }`}
        >
          {labels[t]}
        </button>
      ))}
    </div>
  );
}
