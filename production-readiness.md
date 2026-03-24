# Production Readiness Checklist

A step-by-step guide to ship your ElectroNext app to production.

---

## 1. App Identity

- [ ] Update `appId` in `electron-builder.yml` (e.g. `com.yourcompany.yourapp`)
- [ ] Update `productName` in `electron-builder.yml`
- [ ] Update `name` and `description` in `package.json`
- [ ] Update `version` in `package.json` (follow semver)
- [ ] Update `copyright` in `electron-builder.yml`
- [ ] Set `author` in `package.json`
- [ ] Update the `publish` section in `electron-builder.yml` with your GitHub `owner` and `repo`

## 2. Icons & Branding

- [ ] Replace `resources/icon.png` (1024x1024 PNG, used for Linux + tray)
- [ ] Generate and replace `resources/icon.icns` (macOS — use `iconutil` or an online converter)
- [ ] Generate and replace `resources/icon.ico` (Windows — 256x256 multi-resolution ICO)
- [ ] Update the splash screen in `electron/splash/index.html` with your logo and brand colors

## 3. Code Signing (required for distribution)

### macOS

- [ ] Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [ ] Create a "Developer ID Application" certificate in Xcode or the Apple Developer portal
- [ ] Set these environment variables in your CI:
  ```
  CSC_LINK=path/to/certificate.p12
  CSC_KEY_PASSWORD=your-certificate-password
  APPLE_ID=your@apple-id.email
  APPLE_ID_PASS=app-specific-password
  APPLE_TEAM_ID=your-team-id
  ```
- [ ] The `afterSign` hook in `electron-builder.yml` will automatically notarize via `scripts/notarize.mjs`
- [ ] Test: build with `npm run dist:mac` in CI, verify the DMG opens without Gatekeeper warnings

### Windows

- [ ] Obtain an EV or OV code signing certificate (DigiCert, Sectigo, etc.)
- [ ] Set these environment variables in your CI:
  ```
  CSC_LINK=path/to/certificate.pfx
  CSC_KEY_PASSWORD=your-certificate-password
  ```
- [ ] Update `publisherName` in `electron-builder.yml` to match your certificate's CN
- [ ] Test: build with `npm run dist:win`, verify SmartScreen does not block installation

### Linux

- [ ] Linux does not require code signing, but consider GPG-signing your AppImage for trust

## 4. Auto-Update Configuration

- [ ] Set `publish.owner` and `publish.repo` in `electron-builder.yml`
- [ ] Create a GitHub release with the packaged artifacts (electron-builder handles this in CI)
- [ ] Verify the update flow: install an older version, publish a new release, confirm the app prompts to update
- [ ] For private repos, set `GH_TOKEN` in CI and configure `electron-updater` to use it

## 5. Security Review

All of the following are already implemented in this boilerplate. Verify they're still in place:

- [x] Context isolation enabled (`contextIsolation: true`)
- [x] Node integration disabled (`nodeIntegration: false`)
- [x] Webview tag disabled (`webviewTag: false`)
- [x] Navigation restricted to allowed origins (`will-navigate` handler in `security.ts`)
- [x] New windows blocked; external links open in system browser (`setWindowOpenHandler`)
- [x] CSP headers applied to all responses (`onHeadersReceived` in `security.ts`)
- [x] Source maps stripped from production builds (`npm run clean:sourcemaps`)

Additional checks for your app:

- [ ] Review `ALLOWED_ORIGINS` in `electron/services/security.ts` — add only what you need
- [ ] Review `ALLOWED_EXTERNAL_ORIGINS` — whitelist OAuth providers, docs sites, etc.
- [ ] Tighten CSP directives in `buildCsp()` as your app's requirements stabilize
- [ ] If adding `<webview>`, set a `will-attach-webview` handler to restrict preloads and URLs
- [ ] Run `npx electron --inspect` and audit for any Node.js API leaks to the renderer

## 6. Performance

- [ ] Test startup time — the splash screen should dismiss in under 3 seconds on target hardware
- [ ] Profile memory usage with Electron's built-in `process.getProcessMemoryInfo()`
- [ ] If targeting older hardware or VMs, consider adding a `--disable-gpu` flag or electron-store toggle

## 7. Testing

- [ ] Run `npm run lint` — zero errors
- [ ] Run `npm run build` — compiles cleanly
- [ ] If Playwright E2E tests are set up, run `npx playwright test` and ensure all pass
- [ ] Manually test on all target platforms (macOS, Windows, Linux)
- [ ] Test the auto-update flow end-to-end
- [ ] Test deep links if implemented (`yourapp://` protocol)

## 8. CI/CD

- [ ] Set up GitHub Actions (see `.github/workflows/build.yml` if present)
- [ ] Configure secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_ID_PASS`, `APPLE_TEAM_ID`, `GH_TOKEN`
- [ ] Verify builds pass on all platforms (macOS, Windows, Linux runners)
- [ ] Set up release automation: push a tag → CI builds + signs + publishes to GitHub Releases

## 9. Environment Variables Reference

| Variable | Purpose | When |
|---|---|---|
| `NODE_ENV` | Set to `production` by electron-builder at package time | Build |
| `DEBUG_PROD` | Set to `true` to open DevTools in production builds | Runtime |
| `PORT` | Override the Next.js dev server port (default: 3000) | Dev |
| `CSC_LINK` | Path to code signing certificate (.p12 / .pfx) | CI |
| `CSC_KEY_PASSWORD` | Code signing certificate password | CI |
| `APPLE_ID` | Apple ID for notarization | CI (macOS) |
| `APPLE_ID_PASS` | App-specific password for notarization | CI (macOS) |
| `APPLE_TEAM_ID` | Apple Developer Team ID for notarization | CI (macOS) |
| `GH_TOKEN` | GitHub token for publishing releases and private repo updates | CI |

## 10. Pre-Release Final Check

- [ ] Bump `version` in `package.json`
- [ ] Update changelog / release notes
- [ ] Run `npm run dist` locally and install the packaged app
- [ ] Verify all features work in the packaged app (not just dev mode)
- [ ] Verify the app icon, name, and version are correct in the system
- [ ] Push a git tag to trigger CI release
