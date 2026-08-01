import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      'dist/**',
      'release/**',
      '**/.next/**',
      'electron/**',
      'tests/**',
      'scripts/**',
      '.storybook/**',
      'renderer/stories/**',
      '**/next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Disable pages-dir rule — we use App Router exclusively
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default eslintConfig;
