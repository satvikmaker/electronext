import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';

let tray: Tray | null = null;

/** Show and focus the window if it's not destroyed. */
function showWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.show();
  win.focus();
}

export function createTray(mainWindow: BrowserWindow): Tray {
  if (tray) {
    tray.destroy();
    tray = null;
  }

  const iconPath = path.join(app.getAppPath(), 'resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => showWindow(mainWindow),
    },
    {
      label: 'Hide App',
      click: () => {
        if (!mainWindow.isDestroyed()) mainWindow.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setToolTip(app.getName());
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => showWindow(mainWindow));

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
