# Render Coming Up

Status: ready-for-agent
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
