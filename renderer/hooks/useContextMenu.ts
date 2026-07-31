'use client';

import { useCallback, type MouseEvent } from 'react';
import type { ContextMenuItem } from '../../electron/ipc/schema';

/**
 * Hook for native right-click context menus via IPC.
 *
 * Returns an `onContextMenu` handler to attach to any element.
 * When triggered, sends the menu items to the main process which shows
 * a native OS context menu. Returns the clicked item's ID or null.
 *
 * @example
 * const onContextMenu = useContextMenu([
 *   { id: 'copy', label: 'Copy' },
 *   { id: 'sep', label: '', type: 'separator' },
 *   { id: 'delete', label: 'Delete' },
 * ], (id) => {
 *   if (id === 'copy') handleCopy();
 *   if (id === 'delete') handleDelete();
 * });
 *
 * return <div onContextMenu={onContextMenu}>Right-click me</div>;
 */
export function useContextMenu(
  items: ContextMenuItem[],
  onSelect: (id: string) => void
): (e: MouseEvent) => void {
  return useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (!window.electron) return;

      window.electron.ipc.invoke('context-menu:show', items).then((id) => {
        if (id) onSelect(id);
      });
    },
    [items, onSelect]
  );
}
