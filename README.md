Goal: build a easy to install full screen app for iPad which shows "now playing" with nice album art.

Party DJ, Spotify, Coming up track...

Clean, modern, miniimal UI. Animations, special effects...

---

## Running as a kiosk (iPad)

The app is a static PWA. Audio is played by the **native Spotify app**; this is a
passive full-screen display that reads the now-playing state (see `docs/adr/`).

1. Open the deployed URL in Safari, then **Share → Add to Home Screen**. Launch it
   from the home-screen icon — it opens full-screen (no Safari chrome).
2. Tap **Connect Spotify** once and approve. The session persists across reloads.
3. Start playing music in the Spotify app on any device; the display follows it.
4. Tap anywhere on the screen to switch Display Mode (minimal ↔ Party DJ).

### Keeping the screen on

The app requests a **Screen Wake Lock** to stop the display sleeping while it's
open, and re-acquires it after the iPad is unlocked. The Wake Lock API can't
override the system in every case, so for an unattended party screen also:

- **Settings → Display & Brightness → Auto-Lock → Never**, and
- optionally enable **Guided Access** (Settings → Accessibility → Guided Access)
  and triple-click to lock the iPad into the app.

## Development

```sh
npm install
npm run dev      # http://127.0.0.1:5173/now-playing/  (use 127.0.0.1, not localhost)
npm test         # unit tests (Vitest)
npm run check    # type-check
npm run build    # static production build
```

Spotify config lives in `.env.local` (copy from `.env.example`). See
`.scratch/now-playing-mvp/issues/01-register-spotify-app.md` for setup.
