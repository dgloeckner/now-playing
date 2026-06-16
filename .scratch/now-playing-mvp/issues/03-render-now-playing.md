# Render Now Playing

Status: done
Type: AFK

## What to build

The core display: turn an authenticated session into a live, full-screen Now Playing view. Poll Spotify's currently-playing endpoint on an interval (~1–3s) and render the album art, track title, and artist, plus a progress bar that interpolates locally between polls so it advances smoothly without hammering the API (ADR-0003 — rate-limit handling lives in the client).

Handle the nothing-playing state (paused / no active device) gracefully — a calm idle screen rather than an error.

Use the glossary term **Now Playing** (see CONTEXT.md), not "current song".

## Acceptance criteria

- [ ] When something is playing, the screen shows full-screen album art, title, and artist
- [ ] Progress advances smoothly between polls (local interpolation), and re-syncs on each poll
- [ ] Track changes update the display promptly
- [ ] Nothing-playing / no-active-device renders a calm idle state, not an error
- [ ] Polling backs off / handles Spotify rate-limit and transient error responses
- [ ] Polling + progress-interpolation logic is covered by tests

## Blocked by

- #02 Connect to Spotify (OAuth PKCE login)

## Comments

**Completed (TDD).** Paused renders the track frozen (product decision); only truly-no-track is idle.

- `src/lib/playback/playback.ts` — pure core: `parsePlayback` (title, joined artists, largest album image, duration, playing/paused/idle), `interpolateProgress` (advances playing locally, clamps at duration, holds when paused), `fetchPlayback` (200→state, 204→idle, 429→rate-limited via Retry-After, else/network→error), `nextPollDelay` (base / Retry-After / backoff).
- `src/lib/playback/poller.ts` — thin loop wiring `getAccessToken` + the pure functions to a timer (glue).
- `src/NowPlaying.svelte` — full-screen album art (blurred ambient backdrop + foreground), title, artist, rAF-driven progress bar; calm "Nothing playing" idle screen.
- `src/App.svelte` — runs the poller via `$effect` while connected; renders `NowPlaying`.

Tests: **26 total** (13 new for this slice) covering parse playing/idle, interpolation (advance/clamp/paused/idle), HTTP status mapping incl. network failure, and poll-delay backoff.

Verified: `npm test` 26/26, `npm run check` 0 errors, `npm run build` succeeds. Real-browser smoke (Playwright, token seeded + Spotify API mocked): connected → polls → renders "Midnight City"/"M83", progress bar at 17.5% creeping to 17.74% (local interpolation advancing between polls), no idle screen while playing. Unblocks #04 (Coming Up) and #05 (Party DJ Mode).
