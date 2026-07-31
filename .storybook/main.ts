import type { StorybookConfig } from '@storybook/nextjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rendererDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer');

const config: StorybookConfig = {
  stories: ['../renderer/**/*.stories.@(ts|tsx)'],
  // Storybook 9+ moved backgrounds/controls/actions/viewport/measure/outline
  // into core, so `@storybook/addon-essentials` is no longer needed or published.
  // Add `@storybook/addon-docs` here if you want autodocs.
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: '../renderer/next.config.mjs',
    },
  },
  staticDirs: ['../renderer/public'],
  // The root tsconfig.json is only a project-references stub, so Storybook
  // cannot discover the `@/*` -> `renderer/*` alias that renderer/tsconfig.json
  // declares. Wire it up explicitly or the stories fail to resolve their imports.
  webpackFinal: (webpackConfig) => {
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@': rendererDir,
    };
    return webpackConfig;
  },
};

export default config;
