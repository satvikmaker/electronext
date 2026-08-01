# ElectroNext

A production-ready Electron boilerplate powered by Next.js — typed IPC end to end,
SQLite with migrations, secure credential storage, auto-updates, and signed/notarized
release pipelines already wired up.

The renderer is a **statically exported** Next.js app served over a custom `app://`
protocol. No Node server ships with the app.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop | Electron | 43 (Node 24, Chromium 150) |
| Framework | Next.js | 16 (App Router, Turbopack, `output: 'export'`) |
| Styling | Tailwind CSS | 4 (CSS-first config) |
| State | Redux Toolkit | 2 with typed hooks |
| Database | better-sqlite3 | 13 (N-API) |
| Language | TypeScript | 6 |
| Packaging | electron-builder | 26 |
| Tests | Playwright | 1.62 |

## Features

**Core** — typed IPC (single source of truth in `electron/ipc/schema.ts`), window state
persistence, system tray, splash screen, application menu, deep links (`electronext://`),
file associations (`.enx`), custom frameless title bar.

**Data** — SQLite via better-sqlite3 with automatic SQL migrations, secure credential
storage encrypted through the OS keychain (`safeStorage`), settings via electron-store.

**Platform** — background worker threads, native notifications, clipboard (text + image),
global shortcuts, native context menus, file dialogs with last-directory memory, spell
checker, power monitor events, launch-at-login toggle.

**Shipping** — auto-updates via GitHub Releases, macOS notarization, source-map stripping,
crash reporting, security hardening (CSP with per-load nonces, navigation restrictions,
context isolation), i18n, dark/light/system theming, error boundaries.

**Developer experience** — Storybook, Playwright e2e for both unpackaged *and packaged*
builds, ESLint, husky + lint-staged, GitHub Actions for CI and releases.

## Prerequisites

- **Node.js >= 22.22.1** (`engines` enforces this; Node 24 recommended — it matches
  Electron 43's bundled runtime)
- **npm as pinned in `packageManager`** (currently `npm@11.5.1`)

The npm pin is load-bearing. npm releases disagree about which optional dependency
subtrees belong in a lockfile — `electron-winstaller`'s Windows-signing subtree is
one — and `npm ci` rejects a lockfile a different npm would have written, even on
the same OS. CI installs the pinned npm before `npm ci` for that reason.

If you regenerate `package-lock.json`, do it with the pinned npm, or bump
`packageManager` and the version in both workflow files together.

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` starts Next.js on port 3000, compiles the main process, and launches
Electron once the dev server is reachable. It fails fast if port 3000 is occupied.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server + Electron with hot reload |
| `npm run build` | Build renderer (Turbopack) then main process (tsc) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Typecheck all three projects (electron, renderer, tooling) |
| `npm run test:e2e` | Playwright e2e. The packaged-app suite runs only if `npm run pack` was run first, otherwise it skips |
| `npm run pack` | Package unpacked into `release/` (no installer) — use for local verification |
| `npm run dist` | Build + strip source maps + build installers for the current OS |
| `npm run dist:mac` / `:win` / `:linux` | Build installers for a specific platform |
| `npm run storybook` | Storybook on port 6006 |
| `npm run build:storybook` | Static Storybook build |

## Project structure

```
electronext/
├── electron/                    # Main process — TypeScript, compiled to dist/electron/
│   ├── main.ts                  # Entry point, app lifecycle
│   ├── preload.ts               # contextBridge — exposes window.electron
│   ├── helpers/
│   │   ├── create-window.ts     # Window factory + state persistence
│   │   └── resolve-path.ts      # app:// protocol, CSP nonces, isProd detection
│   ├── ipc/
│   │   ├── schema.ts            # ← Typed IPC contract (source of truth)
│   │   ├── channels.ts          # Channel name constants
│   │   └── handlers.ts          # Handler registrations
│   ├── migrations/              # SQL migrations, applied in filename order
│   │   └── 001_init.sql
│   ├── services/                # auto-updater, database, secure-store, tray, menu,
│   │   │                        # security, deep-link, spell-checker, power-monitor,
│   │   │                        # crash-reporter, worker-manager, logger, store, devtools
│   └── workers/
│       └── example.worker.ts    # Worker thread template
├── renderer/                    # Renderer — Next.js App Router, exported to dist/renderer/
│   ├── app/                     # Routes: /, /about, /settings
│   ├── components/              # UI components
│   ├── hooks/                   # useClipboard, useShortcut, useContextMenu, ...
│   ├── lib/
│   │   ├── store.ts             # Redux store + typed hooks
│   │   ├── features/            # Slices: counter, theme, locale
│   │   └── i18n/                # Translations (en, es)
│   ├── public/                  # Static assets
│   └── types/electron.d.ts      # window.electron typings
├── resources/                   # icons, splash.html, entitlements.mac.plist
├── scripts/                     # check-port, clean-sourcemaps, notarize
├── tests/e2e/                   # app.spec.ts (unpackaged), packaged.spec.ts (packaged)
├── electron-builder.yml         # Packaging + publishing config
└── .github/workflows/           # build.yml (CI), release.yml (tagged releases)
```

Build output: `dist/electron/` (main process JS) and `dist/renderer/` (static site).
Installers land in `release/`.

## Architecture

Three processes, strict boundaries:

1. **Main** (`electron/`) — Node runtime. Owns the database, filesystem, OS integration.
2. **Preload** (`electron/preload.ts`) — the only bridge. Exposes `window.electron` via
   `contextBridge`. Context isolation is on; the renderer has no Node access.
3. **Renderer** (`renderer/`) — plain Next.js. In dev it loads from `http://localhost:3000`;
   in production it is served from `dist/renderer` over `app://`, which injects a fresh
   CSP nonce into every `<script>` and `<style>` on each page load.

## Typed IPC

`electron/ipc/schema.ts` is the single source of truth. Both the main-process handlers and
the renderer are typed against it, so a mismatched argument or return type is a compile
error rather than a runtime surprise.

**Adding a channel:**

```ts
// 1. electron/ipc/schema.ts — declare the contract
export interface IpcSchema {
  'notes:create': { args: [title: string, body: string]; return: { id: number } };
}

// 2. electron/ipc/channels.ts — add the constant
export const IPC_CHANNELS = {
  NOTES_CREATE: 'notes:create',
} as const;

// 3. electron/ipc/handlers.ts — implement it.
// Use `handle` from ./typed-ipc.js, never ipcMain.handle directly: Electron
// types the raw API as (channel: string, ...args: any[]) => any, so nothing
// would check this against the schema. `title` and `body` are inferred, and a
// wrong return type is a compile error.
handle(IPC_CHANNELS.NOTES_CREATE, (_event, title, body) => {
  const result = dbRun('INSERT INTO notes (title, content) VALUES (?, ?)', [title, body]);
  return { id: result.lastInsertRowid };
});

// 4. Call it from the renderer — fully typed, no casts
const { id } = await window.electron.ipc.invoke('notes:create', 'Hello', 'World');
```

For **main → renderer** pushes, add the event to `IpcPushEvents` instead, send it with
`sendTo(window, channel, payload)` or `broadcast(channel, payload)` from `typed-ipc.ts`
(both skip destroyed windows for you), and subscribe with
`window.electron.ipc.on('channel', cb)`, which returns an unsubscribe function.

### Renderer API

```ts
window.electron.ipc.invoke(channel, ...args)  // Promise<Return>
window.electron.ipc.on(channel, cb)           // returns () => void (unsubscribe)
window.electron.ipc.once(channel, cb)
window.electron.platform                      // NodeJS.Platform
window.electron.initialTheme                  // read synchronously, before hydration
```

### Channel reference

| Group | Channels |
|-------|----------|
| App | `app:get-version` `app:get-path` `app:get-locale` `app:report-error` `app:set-progress` `app:set-badge-count` `app:get-login-settings` `app:set-login-settings` |
| Settings | `settings:get` `settings:set` |
| Window | `window:minimize` `window:maximize` `window:close` `window:is-maximized` `window:open` |
| Database | `db:query` `db:run` |
| Secure storage | `secure:set` `secure:get` `secure:delete` |
| Dialogs | `dialog:open-file` `dialog:save-file` |
| Clipboard | `clipboard:read-text` `clipboard:write-text` `clipboard:has-text` `clipboard:read-image` `clipboard:write-image` |
| Files | `file:get-metadata` |
| Notifications | `notification:show` |
| Shortcuts | `shortcuts:register-global` `shortcuts:unregister-global` |
| Context menu | `context-menu:show` |
| Menu | `menu:update-item` |
| Workers | `worker:start` `worker:cancel` |
| Spell check | `spellcheck:get-config` `spellcheck:set-enabled` `spellcheck:set-languages` `spellcheck:add-word` |
| Updater | `updater:check` `updater:install` |
| Crash | `crash:send-report` |
| Push events | `updater:available` `updater:downloaded` `updater:progress` `window:maximized-changed` `shortcut:triggered` `file:opened` `system:power-event` `worker:progress` `worker:complete` `worker:error` |

## Subsystems

### Database

SQLite lives at `{userData}/data.db` in WAL mode. Migrations are plain `.sql` files in
`electron/migrations/`, applied in filename order on startup and tracked in a `_migrations`
table, so each runs exactly once.

```bash
# Add a migration — numeric prefix determines order
electron/migrations/002_add_tags.sql
```

```ts
await window.electron.ipc.invoke('db:query', 'SELECT * FROM notes WHERE id = ?', [1]);
await window.electron.ipc.invoke('db:run', 'DELETE FROM notes WHERE id = ?', [1]);
```

> Migrations are packaged via the `files` entry in `electron-builder.yml`. If you move the
> directory, update that list too.

### Secure storage

`secure:*` channels encrypt values with Electron's `safeStorage` — macOS Keychain, Windows
DPAPI, Linux libsecret. Use this for tokens and credentials, never `settings:set`.

### Workers

Drop a file in `electron/workers/<name>.worker.ts`, then:

```ts
const workerId = await window.electron.ipc.invoke('worker:start', 'example', { input: 42 });
window.electron.ipc.on('worker:complete', ({ data }) => console.log(data));
```

Workers post `{ type: 'progress', percent }` or `{ type: 'complete', data }` back to main.

### i18n

Translations are JSON in `renderer/lib/i18n/messages/`. Add a locale by creating the file
and registering it in `renderer/lib/i18n/index.ts`. `en` and `es` are translated; `fr`,
`de` and `ja` are declared but currently fall back to English.

## Rebranding checklist

Everything below ships with placeholder values. Change all of them before releasing:

| What | Where | Current |
|------|-------|---------|
| Package name | `package.json` → `name` | `electronext` |
| Bundle ID | `electron-builder.yml` → `appId` | `com.electronext.app` |
| Display name | `electron-builder.yml` → `productName` | `ElectroNext` |
| **Publish target** | `electron-builder.yml` → `publish.owner` / `publish.repo` | **empty — must be set** |
| Deep link scheme | `electron/services/deep-link.ts` → `DEEP_LINK_PROTOCOL` | `electronext` |
| File association | `electron-builder.yml` → `fileAssociations` | `.enx` |
| Windows publisher | `electron-builder.yml` → `win.signtoolOptions.publisherName` | `ElectroNext` |
| Icons | `resources/icon.icns` `.ico` `.png` | placeholder art |
| userData folder name | `electron/preload.ts` → `appName` | `electronext` |

`preload.ts` reconstructs the userData path to read the theme before hydration, so its
`appName` must match `package.json` → `name`. The notarization hook reads the bundle ID
from electron-builder's resolved config, so `appId` only needs changing in one place.

## Environment variables

Copy `.env.example` to `.env`. All are optional.

| Variable | Purpose |
|----------|---------|
| `PORT` | Dev server port (default 3000) |
| `DEBUG_PROD` | `true` opens DevTools in a production build |
| `NEXT_PUBLIC_ENABLE_OFFLINE_INDICATOR` | Show the offline banner |
| `CRASH_REPORT_URL` | Crash report endpoint; logs locally when unset |

CI/signing secrets (`GH_TOKEN`, `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`,
`APPLE_ID_PASS`, `APPLE_TEAM_ID`) belong in GitHub Actions secrets, never in `.env`.

## Publishing and auto-updates

### 1. Point the app at your repository

Auto-updates will not work until this is filled in. In `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: your-github-username   # user or organization
  repo: your-repo-name
```

electron-builder bakes this into `app-update.yml` inside the packaged app. That file is how
the installed app discovers where to look for new versions — which is why `npm run pack`
(a `--dir` build) logs a harmless `app-update.yml not found` error, and why a real
`npm run dist` build does not.

### 2. Releasing

Releases are tag-driven. `.github/workflows/release.yml` builds macOS, Windows and Linux in
parallel and publishes to GitHub Releases:

```bash
npm version patch      # or minor / major — commits and tags
git push --follow-tags
```

Pushing a `v*` tag triggers the workflow. electron-builder creates a **draft** release by
default; review the artifacts, then publish it to make the update visible to users. Set
`EP_PRE_RELEASE=true` for a prerelease, or `publish.releaseType` to change the default.

See [production-readiness.md](production-readiness.md) for the full pre-launch checklist.

`GH_TOKEN` uses the automatic `secrets.GITHUB_TOKEN`, so no setup is needed for a public
repo in the same account. To publish elsewhere, supply a personal access token with `repo`
scope.

### 3. Code signing

Unsigned builds still run locally but are not distributable — and on macOS, **Electron 42+
delivers notifications only for signed apps** (unsigned builds log a warning instead).

**macOS** — set repository secrets:

| Secret | Value |
|--------|-------|
| `CSC_LINK` | Base64 of your `Developer ID Application` `.p12`, or a path/URL |
| `CSC_KEY_PASSWORD` | Password for that `.p12` |
| `APPLE_ID` | Apple ID email |
| `APPLE_ID_PASS` | App-specific password — **not** your Apple ID password |
| `APPLE_TEAM_ID` | Developer Team ID |

```bash
base64 -i certificate.p12 | pbcopy   # paste as CSC_LINK
```

Notarization runs automatically via the `afterSign` hook, and only in CI (`CI=true`) with
all three Apple variables present — otherwise it skips so local builds stay fast.
Entitlements live in `resources/entitlements.mac.plist`.

**Windows** — set `CSC_LINK` and `CSC_KEY_PASSWORD` to your Authenticode certificate, and
make `win.signtoolOptions.publisherName` match the certificate's CN exactly.

**Linux** — AppImage and deb are unsigned by convention; nothing to configure.

### 4. How updates reach users

`electron/services/auto-updater.ts` checks on startup in production, downloads in the
background, emits `updater:available` / `updater:progress` / `updater:downloaded` to the
renderer, and installs on quit. `updater:check` and `updater:install` let you drive it from
the UI. Updates only flow from a **published** (non-draft) release whose version is higher
than the installed one.

## Testing

```bash
npm run test:e2e            # unpackaged suite; packaged suite skips
npm run pack && npm run test:e2e   # runs both suites
```

Two suites, deliberately:

- **`app.spec.ts`** — launches from source. Fast; covers IPC and rendering.
- **`packaged.spec.ts`** — launches the real packaged binary **with `NODE_ENV` stripped**,
  exactly as an OS would. This catches the class of bug that only appears once packaged:
  dev/production misdetection, devDependencies imported at the top level, and native
  modules failing to load from `asar.unpacked`.

Tests run serially (`workers: 1`) because the app takes a single-instance lock — two
concurrent Electron launches would make the second quit immediately.

## CI

- **`build.yml`** — on push/PR: lint, build, package, and run both e2e suites across macOS,
  Windows and Linux (Linux uses `xvfb`).
- **`release.yml`** — on `v*` tags: build, strip source maps, package, publish.

Both pin Node 24 to match Electron's bundled runtime.

## Conventions

These are load-bearing. Breaking them produces bugs that only surface in packaged builds.

**`dependencies` vs `devDependencies`.** electron-builder packages everything in
`dependencies` into the shipped app.

- `dependencies` — only what the **main process** imports at runtime: `better-sqlite3`,
  `electron-log`, `electron-store`, `electron-updater`.
- `devDependencies` — everything else, including `next`, `react`, `react-dom` and Redux.
  The renderer is compiled to static files at build time and never runs those at runtime.

Moving a renderer package into `dependencies` adds hundreds of megabytes to every build —
the Next.js SWC and sharp binaries alone are ~130 MB.

**Import dev-only modules lazily.** Anything in `devDependencies` that main-process code
touches (for example `electron-devtools-installer`) must be imported inside a function with
`await import(...)`. A top-level import is resolved when the packaged app boots, and the
module will not be there.

**Detect production with `app.isPackaged`, never `process.env.NODE_ENV`.** A packaged app
is launched by the OS with no `NODE_ENV`. `electron/helpers/resolve-path.ts` normalises this
once at startup so the preload — which inherits the environment — agrees.

**Add IPC to `schema.ts` first.** Handlers and callers derive their types from it. Register
handlers with `handle()` and push with `sendTo()`/`broadcast()` from `electron/ipc/typed-ipc.ts`
— Electron's own `ipcMain.handle` and `webContents.send` are typed `any` on both ends, so
using them directly silently opts out of the schema.

**Database access goes through `dbQuery`/`dbRun`.** They enforce which statement kinds each
channel may run. Calling `db.prepare` directly from a new handler bypasses that.

**Never expose `ipcRenderer` directly.** Everything crosses through the preload's
`contextBridge` surface.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| Packaged app shows a blank window | Something is detecting production via `NODE_ENV`. Use `app.isPackaged`. |
| `Cannot find module` only when packaged | A `devDependencies` module is imported at the top level — make it a lazy `await import()`. |
| `app-update.yml` not found | Expected for `npm run pack`. Use `npm run dist` for a real build. |
| Auto-updates never arrive | `publish.owner` / `publish.repo` unset, or the GitHub release is still a draft. |
| macOS notifications never appear | The app is not code-signed. Electron 42+ requires signing for notifications. |
| Native module fails to load | Run `npm install` so the `postinstall` rebuild runs, or `npx electron-builder install-app-deps`. |
| Port 3000 in use | `npm run dev` fails fast by design — free the port or set `PORT`. |

## Version policy

Three packages are intentionally held back:

| Package | Held at | Reason |
|---------|---------|--------|
| `typescript` | 6.x | TypeScript 7 ships without a public compiler API until 7.1; `typescript-eslint` (a dependency of `eslint-config-next`) cannot consume it. |
| `eslint` | 9.x | `eslint-plugin-react`, `jsx-a11y` and `import` — all pinned by `eslint-config-next` — do not yet support ESLint 10. |
| `@types/node` | 24.x | Must match Electron 43's bundled Node 24. Newer types would describe APIs the runtime does not have. |

## Contributing

Pre-commit hooks run ESLint on staged files via husky + lint-staged. Before opening a PR:

```bash
npm run lint && npm run build && npm run pack && npm run test:e2e
```

## License

MIT
