import type { Preview } from '@storybook/react';
import '../renderer/app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f172a' },
        { name: 'light', value: '#f8fafc' },
      ],
    },
  },
  // Mock window.electron for components that use IPC
  decorators: [
    (Story) => {
      if (typeof window !== 'undefined' && !window.electron) {
        (window as any).electron = {
          ipc: {
            invoke: async (channel: string, ...args: unknown[]) => {
              console.log('[Storybook Mock IPC]', channel, args);
              if (channel === 'example:ping') return 'pong (mock)';
              if (channel === 'app:get-version') return '0.0.0-storybook';
              if (channel === 'settings:get') return null;
              return undefined;
            },
            on: () => () => {},
            once: () => {},
          },
          platform: 'darwin' as const,
        };
      }
      return Story();
    },
  ],
};

export default preview;
