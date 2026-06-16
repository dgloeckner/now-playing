// Browser composition root: wires the pure SpotifyAuth deep module to real
// browser capabilities (localStorage, fetch, location, Web Crypto). Kept
// separate from spotifyAuth.ts so the core logic stays testable without a DOM.

import { spotifyConfig } from '../config'
import { createSpotifyAuth, type SpotifyAuth } from './spotifyAuth'
import { generateCodeVerifier, generateState } from './pkce'

export function createBrowserSpotifyAuth(): SpotifyAuth {
  return createSpotifyAuth({
    config: spotifyConfig,
    storage: window.localStorage,
    fetchFn: window.fetch.bind(window),
    now: () => Date.now(),
    redirect: (url) => {
      window.location.href = url
    },
    createVerifier: generateCodeVerifier,
    createState: generateState,
  })
}
