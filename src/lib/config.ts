// Spotify app configuration, read from Vite env at build time.
//
// The Client ID is public in the PKCE flow (ADR-0003) — there is no secret here.
// `readSpotifyConfig` is a pure function of an env-like object so it can be unit
// tested without touching `import.meta.env`.

export interface SpotifyConfig {
  clientId: string
  redirectUri: string
}

interface RawEnv {
  VITE_SPOTIFY_CLIENT_ID?: string
  VITE_SPOTIFY_REDIRECT_URI?: string
}

export function readSpotifyConfig(env: RawEnv): SpotifyConfig {
  const clientId = env.VITE_SPOTIFY_CLIENT_ID?.trim()
  const redirectUri = env.VITE_SPOTIFY_REDIRECT_URI?.trim()

  if (!clientId) {
    throw new Error(
      'VITE_SPOTIFY_CLIENT_ID is not set. Copy .env.example to .env.local and fill it in (see issue 01).',
    )
  }
  if (!redirectUri) {
    throw new Error(
      'VITE_SPOTIFY_REDIRECT_URI is not set. Copy .env.example to .env.local and fill it in (see issue 01).',
    )
  }

  return { clientId, redirectUri }
}

export const spotifyConfig: SpotifyConfig = readSpotifyConfig(import.meta.env)
