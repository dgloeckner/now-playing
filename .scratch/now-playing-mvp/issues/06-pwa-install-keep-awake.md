# PWA install & keep-awake

Status: ready-for-agent
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
