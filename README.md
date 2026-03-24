# ElectroNext

A modern, production-ready Electron boilerplate powered by Next.js.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop | Electron | 41 (Node 24, Chromium 146) |
| Framework | Next.js | 16 (App Router, Turbopack) |
| Styling | Tailwind CSS | v4 (CSS-first config) |
| State | Redux Toolkit | 2.x with typed hooks |
| Language | TypeScript | 6 |
| Build | electron-builder | 26.x |

## Features

- **Typed IPC** — invoke/handle pattern with channel constants shared between main and renderer
- **Auto-updater** — electron-updater with GitHub Releases publish target
- **Window state persistence** — position, size, and maximized state saved via electron-store
- **System tray** — show/hide/quit with double-click to focus
- **Splash screen** — animated loading screen while the app initializes
- **Security hardened** — CSP headers, navigation restrictions, external URL handler, context isolation, webview disabled
- **Dark/light/system theme** — toggle with Redux + Tailwind CSS dark variant
- **Error boundary** — catches and displays renderer errors gracefully
- **Deep linking** — `electronext://` custom protocol with macOS + Windows + Linux support
- **DevTools extensions** — React DevTools + Redux DevTools installed automatically in dev
- **Source map stripping** — removed from production builds to prevent reverse engineering
- **DEBUG_PROD** — env flag to open DevTools in production for field debugging
- **macOS notarization** — afterSign hook with @electron/notarize
- **Pre-commit hooks** — husky + lint-staged runs ESLint on staged files
- **Port conflict detection** — fails fast if dev port is occupied
- **CI/CD** — GitHub Actions workflows for build/lint and tagged releases

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Next.js + Electron with HMR) |
| `npm run build` | Build renderer (Turbopack) + electron (tsc) |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run pack` | Package app (unpacked, for testing) |
| `npm run dist` | Build + strip source maps + package for distribution |
| `npm run dist:mac` | Distribute for macOS (DMG + ZIP) |
| `npm run dist:win` | Distribute for Windows (NSIS installer) |
| `npm run dist:linux` | Distribute for Linux (AppImage + DEB) |

## Project Structure

```
electronext/
├── electron/               # Main process (TypeScript, compiled to dist/electron/)
│   ├── main.ts             # App entry point
│   ├── preload.ts          # Preload script (contextBridge)
│   ├── helpers/
│   │   ├── create-window.ts  # Window factory with state persistence
│   │   └── resolve-path.ts   # URL resolver (app:// in prod, localhost in dev)
│   ├── ipc/
│   │   ├── channels.ts      # IPC channel constants + types
│   │   └── handlers.ts      # IPC handler registrations
│   ├── services/
│   │   ├── auto-updater.ts   # electron-updater wrapper
│   │   ├── deep-link.ts      # Custom protocol handling
│   │   ├── devtools.ts       # DevTools extension installer
│   │   ├── logger.ts         # electron-log setup
│   │   ├── menu.ts           # Application menu
│   │   ├── security.ts       # CSP, navigation, window-open restrictions
│   │   ├── store.ts          # electron-store for app settings
│   │   └── tray.ts           # System tray
│   └── splash/
│       └── index.html        # Splash screen
├── renderer/               # Renderer process (Next.js App Router)
│   ├── app/                # Pages
│   ├── components/         # React components
│   ├── lib/                # Redux store, hooks, slices
│   └── types/              # TypeScript declarations
├── scripts/                # Build scripts
├── tests/                  # E2E tests
├── docs/                   # Documentation
├── resources/              # App icons and entitlements
└── .github/workflows/      # CI/CD
```

## Adding IPC Channels

1. Add channel name to `electron/ipc/channels.ts`
2. Add handler in `electron/ipc/handlers.ts`
3. Call from renderer: `window.electron.ipc.invoke('your:channel', ...args)`

## Production

See [docs/production-readiness.md](docs/production-readiness.md) for the full checklist.

## License

MIT
