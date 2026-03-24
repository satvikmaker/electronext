import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray {
  // Destroy existing tray to prevent duplicates on macOS reactivation
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
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Hide App',
      click: () => {
        mainWindow.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip(app.getName());
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
