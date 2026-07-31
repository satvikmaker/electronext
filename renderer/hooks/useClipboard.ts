'use client';

import { useCallback } from 'react';

/**
 * Hook for native clipboard operations via IPC.
 *
 * @example
 * const { readText, writeText, readImage, writeImage } = useClipboard();
 * const text = await readText();
 * await writeText('Hello');
 */
export function useClipboard() {
  const readText = useCallback(async (): Promise<string> => {
    if (!window.electron) return '';
    return window.electron.ipc.invoke('clipboard:read-text');
  }, []);

  const writeText = useCallback(async (text: string): Promise<void> => {
    if (!window.electron) return;
    await window.electron.ipc.invoke('clipboard:write-text', text);
  }, []);

  const hasText = useCallback(async (): Promise<boolean> => {
    if (!window.electron) return false;
    return window.electron.ipc.invoke('clipboard:has-text');
  }, []);

  const readImage = useCallback(async (): Promise<string | null> => {
    if (!window.electron) return null;
    return window.electron.ipc.invoke('clipboard:read-image');
  }, []);

  const writeImage = useCallback(async (dataUrl: string): Promise<void> => {
    if (!window.electron) return;
    await window.electron.ipc.invoke('clipboard:write-image', dataUrl);
  }, []);

  return { readText, writeText, hasText, readImage, writeImage };
}
