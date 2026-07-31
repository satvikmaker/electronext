'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShortcut } from '@/hooks/useShortcut';
import { useAppDispatch } from '@/lib/hooks';
import { setTheme } from '@/lib/features/themeSlice';

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

/**
 * Command Palette (Cmd+K / Ctrl+K).
 *
 * Searchable modal that indexes all app actions.
 * Register commands in the `useCommands` hook below.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const dispatch = useAppDispatch();

  // ── Command registry ───────────────────────────────────────────
  const commands: Command[] = useMemo(() => [
    { id: 'nav-home', label: 'Go to Home', category: 'Navigation', action: () => router.push('/') },
    { id: 'nav-about', label: 'Go to About', category: 'Navigation', action: () => router.push('/about') },
    { id: 'nav-settings', label: 'Go to Settings', category: 'Navigation', action: () => router.push('/settings') },
    { id: 'theme-light', label: 'Switch to Light Theme', category: 'Appearance', action: () => dispatch(setTheme('light')) },
    { id: 'theme-dark', label: 'Switch to Dark Theme', category: 'Appearance', action: () => dispatch(setTheme('dark')) },
    { id: 'theme-system', label: 'Switch to System Theme', category: 'Appearance', action: () => dispatch(setTheme('system')) },
    { id: 'dev-reload', label: 'Reload Window', category: 'Developer', shortcut: 'Ctrl+R', action: () => window.location.reload() },
    {
      id: 'dev-devtools', label: 'Toggle Developer Tools', category: 'Developer', shortcut: 'F12',
      action: () => window.electron?.ipc.invoke('window:open', 'devtools', ''),
    },
    {
      id: 'app-version', label: 'Show App Version', category: 'App',
      action: async () => {
        const v = await window.electron?.ipc.invoke('app:get-version');
        if (v) window.electron?.ipc.invoke('notification:show', { title: 'ElectroNext', body: `Version ${v}` });
      },
    },
  ], [router, dispatch]);

  // ── Fuzzy search ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) => cmd.label.toLowerCase().includes(lower) || cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // ── Keyboard shortcut to open ──────────────────────────────────
  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setQuery('');
        setSelectedIndex(0);
      }
      return !prev;
    });
  }, []);

  useShortcut('CmdOrCtrl+k', toggle);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── Execute selected command ───────────────────────────────────
  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    cmd.action();
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        execute(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [filtered, selectedIndex, execute]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-surface-light bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-surface-light px-4">
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command..."
            className="w-full bg-transparent px-3 py-3 text-sm text-text outline-none placeholder:text-text-muted"
            aria-label="Search commands"
            aria-activedescendant={filtered[selectedIndex] ? `cmd-${filtered[selectedIndex].id}` : undefined}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-autocomplete="list"
          />
          <kbd className="shrink-0 rounded border border-surface-light px-1.5 py-0.5 text-[10px] text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="max-h-72 overflow-y-auto p-2"
        >
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-text-muted">No commands found</p>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              id={`cmd-${cmd.id}`}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => execute(cmd)}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                i === selectedIndex ? 'bg-primary text-white' : 'text-text hover:bg-surface-light'
              }`}
            >
              <div>
                <span className="font-medium">{cmd.label}</span>
                <span className={`ml-2 text-xs ${i === selectedIndex ? 'text-white/70' : 'text-text-muted'}`}>
                  {cmd.category}
                </span>
              </div>
              {cmd.shortcut && (
                <kbd className={`text-[10px] ${i === selectedIndex ? 'text-white/70' : 'text-text-muted'}`}>
                  {cmd.shortcut}
                </kbd>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
