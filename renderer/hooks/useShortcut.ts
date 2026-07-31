'use client';

import { useEffect } from 'react';

/**
 * In-app keyboard shortcut hook.
 *
 * Listens for keydown events matching the given accelerator string
 * (Electron-style format: 'CmdOrCtrl+K', 'Shift+Alt+P', etc.)
 * and calls the handler when matched.
 *
 * This is for in-app shortcuts only (when the window is focused).
 * For global shortcuts (work even when app is not focused), use the
 * 'shortcuts:register-global' IPC channel instead.
 *
 * @example
 * useShortcut('CmdOrCtrl+K', () => openCommandPalette());
 * useShortcut('Escape', () => closeModal());
 */
export function useShortcut(accelerator: string, handler: () => void): void {
  useEffect(() => {
    const parts = accelerator.toLowerCase().split('+');
    const key = parts.pop()!;
    const modifiers = new Set(parts);

    const isMac = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');

    function onKeyDown(e: KeyboardEvent) {
      const pressedKey = e.key.toLowerCase();

      // Map 'cmdorctrl' to the correct platform modifier
      const needsMeta = modifiers.has('cmdorctrl') ? isMac : modifiers.has('cmd') || modifiers.has('meta');
      const needsCtrl = modifiers.has('cmdorctrl') ? !isMac : modifiers.has('ctrl');
      const needsShift = modifiers.has('shift');
      const needsAlt = modifiers.has('alt');

      if (needsMeta && !e.metaKey) return;
      if (needsCtrl && !e.ctrlKey) return;
      if (needsShift && !e.shiftKey) return;
      if (needsAlt && !e.altKey) return;
      if (!needsMeta && e.metaKey) return;
      if (!needsCtrl && e.ctrlKey) return;
      if (!needsShift && e.shiftKey) return;
      if (!needsAlt && e.altKey) return;

      if (pressedKey === key) {
        e.preventDefault();
        handler();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [accelerator, handler]);
}
