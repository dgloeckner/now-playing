# Party DJ Mode (display-mode shell)

Status: ready-for-agent
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
