# Connect to Spotify (OAuth PKCE login)

Status: done
Type: AFK

## What to build

An end-to-end browser-only login that authenticates the display against Spotify and keeps a valid token available, with no backend (ADR-0003).

When the app is not connected, it shows a "Connect" affordance. Activating it runs the Authorization Code flow with PKCE: redirect to Spotify, handle the callback, exchange the code for tokens in the browser, and persist them. Tokens are refreshed silently before expiry so the always-on display never falls back to the login state on its own. Request read-only scopes only — no playback-control scopes (ADR-0002).

Scopes: `user-read-currently-playing`, `user-read-playback-state`.

## Acceptance criteria

- [ ] Disconnected state shows a Connect affordance; connected state renders a placeholder "connected" view
- [ ] Full PKCE flow works client-side: code challenge/verifier, redirect, callback handling, token exchange — no client secret
- [ ] Tokens persist across reloads and are refreshed silently before expiry
- [ ] Only the two read scopes are requested
- [ ] Auth/token logic is covered by tests (verifier/challenge generation, expiry/refresh decision)

## Blocked by

- #01 Register Spotify app & configure credentials

## Comments

**Completed (TDD).** Browser-only PKCE auth, no backend (ADR-0003), read scopes only (ADR-0002).

- `src/lib/auth/pkce.ts` — `deriveCodeChallenge` (RFC 7636 vector), `generateCodeVerifier`, `generateState`.
- `src/lib/auth/spotifyAuth.ts` — `createSpotifyAuth(deps)` deep module with injected seams (storage/fetch/clock/redirect/crypto). Public: `getStatus`, `login`, `completeLogin`, `getAccessToken`; plus pure `buildAuthorizeUrl` and `shouldRefresh`. Shared `requestAndStoreToken` helper for exchange + refresh.
- `src/lib/auth/browser.ts` — composition root wiring `localStorage`, `fetch`, `location`, Web Crypto.
- `src/App.svelte` — disconnected (Connect button) vs connected view; handles the redirect callback and strips the query string.
- Vitest introduced (`npm test`).

Tests: **12 passing** covering challenge derivation, authorize-URL params + exact scopes, refresh decision, completeLogin happy path, state-mismatch (CSRF) rejection, session restore, login redirect, silent refresh, verifier format.

Verified: `npm test` 12/12, `npm run check` 0 errors, `npm run build` succeeds. Real-browser smoke test (Playwright): disconnected state renders Connect; clicking redirects to Spotify with a valid PKCE authorize URL (correct challenge/state/scopes), and Spotify accepted client_id + redirect_uri (forwarded to login, not an error). Unblocks #03.
