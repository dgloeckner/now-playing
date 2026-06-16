# Party DJ Mode (display-mode shell)

Status: done
Type: AFK

## What to build

Introduce the concept of a **Display Mode** (see CONTEXT.md) and implement the first one beyond the default: **Party DJ Mode** — a bold, animated, club-style treatment of the Now Playing view. This is aesthetic only; it implies no interactive control (ADR-0002).

Establish a small structure so the display can render one Display Mode at a time and more can be added later. Party DJ Mode should derive its palette/effects from the current album art (e.g. dominant-color wash, blurred art background, motion) and animate smoothly on the iPad.

## Acceptance criteria

- [ ] A Display Mode abstraction exists; the app renders exactly one at a time and can switch
- [ ] Party DJ Mode renders the Now Playing content with album-art-derived color/effects and animation
- [ ] Animations are smooth on the target iPad (no jank at the chosen poll cadence)
- [ ] No playback-control affordances are introduced (display-only stays display-only)
- [ ] Display Mode selection/rendering logic is covered by tests where practical

## Blocked by

- #03 Render Now Playing

## Comments

**Completed (TDD).** Default mode is `minimal`; tapping the screen cycles to `party-dj` (display concern, not playback control — ADR-0002 intact).

- `src/lib/display/color.ts` — `dominantColor(pixels)`: quantized-histogram dominant color from RGBA data, for the album-art color wash.
- `src/lib/display/displayMode.ts` — Display Mode abstraction as pure functions: `MODE_IDS`/`DEFAULT_MODE_ID`, `nextModeId` (cycle+wrap), `loadModeId`/`saveModeId` (persist, ignore unknown stored values).
- `src/PartyDjMode.svelte` — immersive treatment of the playing track: animated album-art color wash + blurred pulsing backdrop + glow, bold type; extracts the accent via canvas + `dominantColor` with a CORS-safe fallback; honors `prefers-reduced-motion`.
- `src/App.svelte` — renders `NowPlaying` (minimal) or `PartyDjMode` (party-dj) by mode id; transparent full-screen `<button>` overlay cycles the mode (keyboard-accessible).

Tests: **38 total** (4 new) — dominantColor, mode default/unknown fallback, cycle+wrap, save→load round-trip.

Verified: `npm test` 38/38, `npm run check` 0 errors/0 warnings, `npm run build` succeeds. Real-browser smoke (Playwright): starts minimal → tap switches to Party DJ → persists across reload → tap returns to minimal; exactly one mode rendered at a time; no page errors. Only #06 (PWA install & keep-awake) remains.
