# Fully static, no backend; OAuth via PKCE in the browser

The app is a fully static bundle with no server component. Spotify authentication uses the Authorization Code flow with PKCE entirely in the browser, including client-side token refresh — Spotify's PKCE flow issues refreshable tokens without a client secret, so there is nothing secret to protect and no need for a token-exchange server.

A future reader might expect a backend for OAuth; there deliberately isn't one. For a single-user party screen, a thin serverless backend (to hide a secret, proxy/cache, centralize rate limiting) added deployment and maintenance with no real benefit, since PKCE needs no secret and rate-limit handling can live in the client.

## Consequences

- Hosting is any static host (currently GitHub Pages); no runtime to operate.
- Rate-limit and retry logic must live in the client polling loop.
- If we later need server-side caching or a shared multi-device backend, this decision must be reopened.
