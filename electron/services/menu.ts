import { app, Menu, MenuItem, MenuItemConstructorOptions, shell } from 'electron';

const isMac = process.platform === 'darwin';

/**
 * Registry of menu items by ID.
 * The renderer can update properties (enabled, checked, label, visible)
 * via the 'menu:update-item' IPC channel.
 *
 * Items are registered by adding `id` to their template.
 * After updating, changes take effect immediately (MenuItem is mutable).
 */
export const menuItemRegistry = new Map<string, MenuItem>();

/**
 * Build and set the application menu.
 * Call once on app startup. Menu items with an `id` field are
 * added to the registry for dynamic updates from the renderer.
 */
export function createMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.getName(),
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        { id: 'file-save', label: 'Save', accelerator: 'CmdOrCtrl+S', enabled: false, click: () => { /* wired by renderer */ } },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { id: 'edit-undo', role: 'undo' },
        { id: 'edit-redo', role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Learn More', click: () => { shell.openExternal('https://github.com'); } },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Populate registry with all items that have an id
  menuItemRegistry.clear();
  function walk(items: MenuItem[]) {
    for (const item of items) {
      if (item.id) menuItemRegistry.set(item.id, item);
      if (item.submenu) walk((item.submenu as Menu).items);
    }
  }
  walk(menu.items);

  return menu;
}

