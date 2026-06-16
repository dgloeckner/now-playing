# Render Coming Up

Status: done
Type: AFK

## What to build

Show what's next. Fetch the Spotify playback queue and render the upcoming track(s) ahead of Now Playing, within the established full-screen layout. Keep it in sync with the same polling cadence as Now Playing.

Use the glossary term **Coming Up** (see CONTEXT.md), not "up next" or "queue" — the queue is the Spotify-side mechanism; Coming Up is what we render from it.

## Acceptance criteria

- [ ] The next track(s) from the queue render alongside/ahead of Now Playing
- [ ] Coming Up updates as the queue changes and as tracks advance
- [ ] An empty queue renders gracefully (no broken/empty slots)
- [ ] Layout integrates with the Now Playing view rather than overlapping it
- [ ] Queue-fetch/transform logic is covered by tests

## Blocked by

- #03 Render Now Playing

## Comments

**Completed (TDD).** Shows the next 3 upcoming tracks (configurable via `comingUpLimit`).

- `src/lib/playback/playback.ts` — `parseComingUp(body, limit)` (queue items → `Track[]`, capped at limit, empty/missing queue → `[]`) and `fetchComingUp` (queue endpoint, same 200/204/429/error mapping). Refactor: extracted shared `parseTrack` (reused by `parsePlayback`) and a shared `requestSpotify` HTTP envelope behind which both fetchers now sit — both guarded by the existing suite.
- `src/lib/playback/poller.ts` — fetches currently-playing + queue in parallel each tick (same cadence, governed by the Now Playing fetch); emits `onComingUp`.
- `src/ComingUp.svelte` — strip of upcoming tracks (thumb + title + artist); renders nothing when empty.
- `src/App.svelte` — Coming Up stacked below Now Playing in a connected column layout (no overlap).

Tests: **33 total** (4 new) — parse mapping, limit cap, empty/missing queue, fetch status mapping incl. network failure.

Verified: `npm test` 33/33, `npm run check` 0 errors, `npm run build` succeeds. Real-browser smoke (Playwright, both endpoints mocked): renders Now Playing + "Coming Up" with exactly 3 items from a 4-item queue (limit holds), no page errors.
