import Store from 'electron-store';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  [key: string]: unknown;
}

export const appStore = new Store<AppSettings>({
  name: 'settings',
  defaults: {
    theme: 'system',
  },
});
