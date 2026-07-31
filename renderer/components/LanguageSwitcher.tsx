'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { setLocale, type Locale } from '@/lib/features/localeSlice';
import { AVAILABLE_LOCALES } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const locale = useAppSelector((state) => state.locale.locale);
  const dispatch = useAppDispatch();

  // Load persisted locale on mount
  useEffect(() => {
    if (!window.electron) return;
    window.electron.ipc.invoke('settings:get', 'locale').then((saved) => {
      if (saved && saved !== locale) {
        dispatch(setLocale(saved as Locale));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change
  useEffect(() => {
    window.electron?.ipc.invoke('settings:set', 'locale', locale);
  }, [locale]);

  return (
    <select
      value={locale}
      onChange={(e) => dispatch(setLocale(e.target.value as Locale))}
      className="rounded-md bg-surface-light px-3 py-1 text-xs font-medium text-text transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {AVAILABLE_LOCALES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
