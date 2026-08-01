import Store from 'electron-store';
import type { Theme } from '../ipc/schema.js';

interface AppSettings {
  theme: Theme;
  lastDialogDir?: string;
  [key: string]: unknown;
}

export const appStore = new Store<AppSettings>({
  name: 'settings',
  defaults: {
    theme: 'system',
  },
  // Without this, electron-store throws a SyntaxError while *constructing* if
  // the JSON is malformed — which happens after an interrupted write. Because
  // these stores are built at module load, that throw would kill the app before
  // the logger exists: no window, no dialog, no log entry, and no way for a user
  // to discover that a settings file needs deleting. Resetting to defaults loses
  // preferences, which is a far better outcome than an app that cannot start.
  clearInvalidConfig: true,
});
