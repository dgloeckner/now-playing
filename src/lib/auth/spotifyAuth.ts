import type { SpotifyConfig } from '../config'
import { deriveCodeChallenge } from './pkce'

// Read-only scopes (ADR-0002): the display never controls playback.
export const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'] as const

const AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize'

export interface StoredToken {
  accessToken: string
  refreshToken: string
  /** Epoch milliseconds at which the access token expires. */
  expiresAt: number
}

/** True when the token is at or within `marginMs` of expiry and should be refreshed. */
export function shouldRefresh(token: StoredToken, now: number, marginMs: number): boolean {
  return now >= token.expiresAt - marginMs
}

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
const STORAGE_KEYS = {
  token: 'np_auth_token',
  verifier: 'np_auth_verifier',
  state: 'np_auth_state',
} as const

/** Minimal key-value persistence. `window.localStorage` satisfies this directly. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SpotifyAuthDeps {
  config: SpotifyConfig
  storage: KeyValueStore
  fetchFn: typeof fetch
  now: () => number
  redirect: (url: string) => void
  createVerifier: () => string
  createState: () => string
}

export interface SpotifyAuth {
  getStatus(): 'connected' | 'disconnected'
  login(): Promise<void>
  completeLogin(callbackUrl: string): Promise<void>
  getAccessToken(): Promise<string>
}

/** Refresh a token once it's within this many ms of expiry. */
const REFRESH_MARGIN_MS = 60_000

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export function createSpotifyAuth(deps: SpotifyAuthDeps): SpotifyAuth {
  let token: StoredToken | null = loadToken(deps.storage)

  function loadToken(storage: KeyValueStore): StoredToken | null {
    const raw = storage.getItem(STORAGE_KEYS.token)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredToken
    } catch {
      return null
    }
  }

  function getStatus() {
    return token ? ('connected' as const) : ('disconnected' as const)
  }

  // Shared token-endpoint call for both the initial exchange and refresh:
  // POST the form, build a StoredToken, persist it. Falls back to the previous
  // refresh token since Spotify may omit one on refresh.
  async function requestAndStoreToken(
    body: URLSearchParams,
    previousRefreshToken?: string,
  ): Promise<StoredToken> {
    const res = await deps.fetchFn(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json()) as TokenResponse
    const next: StoredToken = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? previousRefreshToken ?? '',
      expiresAt: deps.now() + json.expires_in * 1000,
    }
    deps.storage.setItem(STORAGE_KEYS.token, JSON.stringify(next))
    return next
  }

  async function login(): Promise<void> {
    const verifier = deps.createVerifier()
    const state = deps.createState()
    deps.storage.setItem(STORAGE_KEYS.verifier, verifier)
    deps.storage.setItem(STORAGE_KEYS.state, state)
    const codeChallenge = await deriveCodeChallenge(verifier)
    deps.redirect(buildAuthorizeUrl(deps.config, { codeChallenge, state }))
  }

  async function completeLogin(callbackUrl: string): Promise<void> {
    const params = new URL(callbackUrl).searchParams
    const code = params.get('code')
    const verifier = deps.storage.getItem(STORAGE_KEYS.verifier)
    if (!code || !verifier) {
      throw new Error('Missing authorization code or PKCE verifier')
    }

    // CSRF guard: the returned state must match the one we stored at login.
    const expectedState = deps.storage.getItem(STORAGE_KEYS.state)
    if (!expectedState || params.get('state') !== expectedState) {
      throw new Error('OAuth state mismatch')
    }

    token = await requestAndStoreToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: deps.config.redirectUri,
        client_id: deps.config.clientId,
        code_verifier: verifier,
      }),
    )
    deps.storage.removeItem(STORAGE_KEYS.verifier)
    deps.storage.removeItem(STORAGE_KEYS.state)
  }

  async function getAccessToken(): Promise<string> {
    if (!token) throw new Error('Not connected')

    if (shouldRefresh(token, deps.now(), REFRESH_MARGIN_MS)) {
      token = await requestAndStoreToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: deps.config.clientId,
        }),
        token.refreshToken,
      )
    }

    return token.accessToken
  }

  return { getStatus, login, completeLogin, getAccessToken }
}

export function buildAuthorizeUrl(
  config: SpotifyConfig,
  params: { codeChallenge: string; state: string },
): string {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: params.codeChallenge,
    state: params.state,
    scope: SCOPES.join(' '),
  })
  return `${AUTHORIZE_ENDPOINT}?${query.toString()}`
}
