import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../renderer/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: '../renderer/next.config.mjs',
    },
  },
  staticDirs: ['../renderer/public'],
};

export default config;
