# PWA install & keep-awake

Status: done
Type: AFK

## What to build

Make the display behave like a proper always-on kiosk when installed to the iPad home screen (ADR-0001).

- Replace the scaffold's SVG icon with real raster icons: PWA `192x192` and `512x512` (incl. a maskable variant) and an `apple-touch-icon` PNG, since iOS home-screen icons want PNG.
- Use the Screen Wake Lock API to keep the display awake while it's foregrounded, re-acquiring the lock after visibility changes; document the Guided Access / auto-lock fallback for cases the API can't cover.
- Verify the app installs from Safari and launches full-screen (`display: fullscreen`) from the home screen.

## Acceptance criteria

- [ ] Real PNG icons present (192, 512, maskable, apple-touch-icon) and referenced by the manifest + index.html
- [ ] App is installable from iPad Safari and launches full-screen from the home screen
- [ ] Screen Wake Lock keeps the display on while foregrounded and re-acquires after backgrounding/visibility change
- [ ] Guided Access / disable-auto-lock fallback is documented for the operator
- [ ] Build still produces a valid manifest + service worker

## Blocked by

- None - builds on the existing scaffold and can run in parallel with #02–#05

## Comments

**Completed (TDD for the wake-lock logic; assets/manifest verified in-browser).**

- `src/lib/display/wakeLock.ts` — `createWakeLock(deps)` with injected seams: acquires on start, re-acquires on visibility→visible (the iOS background/lock case), releases + stops re-acquiring on stop, and swallows a denied request.
- `src/lib/display/wakeLockBrowser.ts` — wires it to `navigator.wakeLock` + `document` visibility; no-op when unsupported. Started in `App.svelte` for the whole time the app is open.
- Real PNG icons generated from SVG via headless Chromium (ImageMagick mangled the SVG): `pwa-192x192`, `pwa-512x512`, `pwa-maskable-512x512` (full-bleed, safe-zone), `apple-touch-icon` (180, opaque). `public/icon-maskable.svg` added as the maskable source.
- `vite.config.ts` manifest icons updated to the PNGs (+ maskable purpose); `index.html` apple-touch-icon → PNG.
- README: "Running as a kiosk" section with Auto-Lock=Never / Guided Access fallback.

Tests: **42 total** (4 new). Verified: `npm test` 42/42, `npm run check` 0 errors/0 warnings, `npm run build` valid manifest + service worker (8 precache entries). Real-browser (Playwright): app calls `wakeLock.request('screen')` once on load; all icons + manifest return 200 under the `/now-playing/` base; built manifest is `display: fullscreen` with scope/start_url `/now-playing/`.

Note: actual home-screen install + full-screen launch can only be confirmed on a real iPad against the deployed HTTPS URL (GitHub Pages). Structurally the manifest is installable. **All 6 MVP slices done.**
