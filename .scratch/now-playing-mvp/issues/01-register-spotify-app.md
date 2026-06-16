# Register Spotify app & configure credentials

Status: done
Type: HITL

## What to build

Register a Spotify Developer application and wire its credentials into the app so the OAuth flow has somewhere to point. This is a one-time human setup task — an agent cannot create a Spotify developer account or app.

- Create an app in the Spotify Developer Dashboard.
- Capture the **Client ID** (no client secret is needed — see ADR-0003, PKCE).
- Register the **redirect URIs**: the production URL including the GitHub Pages base path (e.g. `https://<user>.github.io/now-playing/`) and a local dev URI (`http://127.0.0.1:5173/now-playing/`).
- Make the Client ID and redirect URI available to the app as build-time config (e.g. Vite env vars), without committing secrets.

## Acceptance criteria

- [ ] A Spotify app exists and its Client ID is recorded somewhere the build can read
- [ ] Production and localhost redirect URIs are registered on the Spotify app, both including the `/now-playing/` base path
- [ ] The Client ID and redirect URI are exposed to the app via config (not hard-coded, not a secret in git)
- [ ] No client secret is stored anywhere (PKCE flow per ADR-0003)

## Blocked by

- None - can start immediately

## Comments

**Completed.** Spotify app created (user-side); Web API enabled. Client ID and redirect URIs wired into the build:

- Client ID stored in git-ignored `.env.local` (and `.env.example` committed as a template).
- Config read via `src/lib/config.ts` (`readSpotifyConfig`, pure/testable) with `src/vite-env.d.ts` typing the vars.
- Dev server bound to `127.0.0.1:5173` (`vite.config.ts`) so the dev URL matches the registered redirect URI. Spotify bans `localhost`.
- Redirect URIs (must be registered on the Spotify app): `http://127.0.0.1:5173/now-playing/` (dev) and `https://dgloeckner.github.io/now-playing/` (prod).

Verified: `.env.local` is git-ignored, Vite `loadEnv` resolves both vars, dev server serves 200 at the dev redirect URI base. Unblocks #02.
