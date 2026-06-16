import { describe, it, expect } from 'vitest'
import { buildAuthorizeUrl, shouldRefresh, createSpotifyAuth } from './spotifyAuth'
import type { KeyValueStore } from './spotifyAuth'
import { deriveCodeChallenge } from './pkce'

const config = {
  clientId: 'client-123',
  redirectUri: 'http://127.0.0.1:5173/now-playing/',
}

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

// A fetch double that records the last call and returns a canned token response.
function tokenFetch(payload: Record<string, unknown>) {
  const calls: { url: string; body: URLSearchParams }[] = []
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: new URLSearchParams(String(init.body)) })
    return { ok: true, json: async () => payload } as Response
  }) as unknown as typeof fetch
  return { fetchFn, calls }
}

describe('buildAuthorizeUrl', () => {
  it('builds a PKCE authorize URL with the expected parameters', () => {
    const url = new URL(buildAuthorizeUrl(config, { codeChallenge: 'chal', state: 'st8' }))

    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:5173/now-playing/')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('chal')
    expect(url.searchParams.get('state')).toBe('st8')
  })

  // ADR-0002: display-only. Exactly the two read scopes, nothing that can control playback.
  it('requests exactly the two read-only scopes', () => {
    const url = new URL(buildAuthorizeUrl(config, { codeChallenge: 'chal', state: 'st8' }))
    expect(url.searchParams.get('scope')).toBe(
      'user-read-currently-playing user-read-playback-state',
    )
  })
})

describe('shouldRefresh', () => {
  const token = { accessToken: 'a', refreshToken: 'r', expiresAt: 1_000_000 }
  const marginMs = 60_000

  it('refreshes a token within the expiry safety margin', () => {
    // 30s before expiry, inside the 60s margin
    expect(shouldRefresh(token, token.expiresAt - 30_000, marginMs)).toBe(true)
  })

  it('does not refresh a token comfortably before expiry', () => {
    // 120s before expiry, outside the 60s margin
    expect(shouldRefresh(token, token.expiresAt - 120_000, marginMs)).toBe(false)
  })
})

describe('completeLogin', () => {
  it('exchanges the authorization code for tokens and becomes connected', async () => {
    const storage = memoryStore({
      np_auth_verifier: 'verifier-xyz',
      np_auth_state: 'state-abc',
    })
    const { fetchFn, calls } = tokenFetch({
      access_token: 'AT',
      refresh_token: 'RT',
      expires_in: 3600,
    })
    const auth = createSpotifyAuth({
      config,
      storage,
      fetchFn,
      now: () => 1_000_000,
      redirect: () => {},
      createVerifier: () => 'v',
      createState: () => 's',
    })

    await auth.completeLogin('http://127.0.0.1:5173/now-playing/?code=CODE&state=state-abc')

    expect(auth.getStatus()).toBe('connected')
    expect(calls[0].url).toBe('https://accounts.spotify.com/api/token')
    const body = calls[0].body
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('CODE')
    expect(body.get('code_verifier')).toBe('verifier-xyz')
    expect(body.get('redirect_uri')).toBe(config.redirectUri)
    expect(body.get('client_id')).toBe(config.clientId)
  })

  it('rejects a callback whose state does not match the stored state', async () => {
    const storage = memoryStore({
      np_auth_verifier: 'verifier-xyz',
      np_auth_state: 'state-abc',
    })
    const { fetchFn, calls } = tokenFetch({
      access_token: 'AT',
      refresh_token: 'RT',
      expires_in: 3600,
    })
    const auth = createSpotifyAuth({
      config,
      storage,
      fetchFn,
      now: () => 1_000_000,
      redirect: () => {},
      createVerifier: () => 'v',
      createState: () => 's',
    })

    await expect(
      auth.completeLogin('http://127.0.0.1:5173/now-playing/?code=CODE&state=WRONG'),
    ).rejects.toThrow()
    expect(auth.getStatus()).toBe('disconnected')
    expect(calls.length).toBe(0) // never exchanged the code
  })
})

describe('login', () => {
  it('persists a verifier and state, then redirects to the authorize URL with the derived challenge', async () => {
    const storage = memoryStore()
    let redirectedTo = ''
    const { fetchFn } = tokenFetch({})
    const auth = createSpotifyAuth({
      config,
      storage,
      fetchFn,
      now: () => 1_000_000,
      redirect: (url) => {
        redirectedTo = url
      },
      createVerifier: () => 'verifier-xyz',
      createState: () => 'state-abc',
    })

    await auth.login()

    expect(storage.getItem('np_auth_verifier')).toBe('verifier-xyz')
    expect(storage.getItem('np_auth_state')).toBe('state-abc')

    const url = new URL(redirectedTo)
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('state')).toBe('state-abc')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe(await deriveCodeChallenge('verifier-xyz'))
  })
})

describe('session restore', () => {
  it('loads a persisted token on init so a reload stays connected', () => {
    const stored = { accessToken: 'AT', refreshToken: 'RT', expiresAt: 2_000_000 }
    const storage = memoryStore({ np_auth_token: JSON.stringify(stored) })
    const { fetchFn } = tokenFetch({})
    const auth = createSpotifyAuth({
      config,
      storage,
      fetchFn,
      now: () => 1_000_000,
      redirect: () => {},
      createVerifier: () => 'v',
      createState: () => 's',
    })

    expect(auth.getStatus()).toBe('connected')
  })
})

describe('getAccessToken', () => {
  it('refreshes silently when the stored token is near expiry', async () => {
    const stored = { accessToken: 'OLD', refreshToken: 'RT', expiresAt: 1_000_000 }
    const storage = memoryStore({ np_auth_token: JSON.stringify(stored) })
    const { fetchFn, calls } = tokenFetch({
      access_token: 'NEW',
      refresh_token: 'RT2',
      expires_in: 3600,
    })
    const auth = createSpotifyAuth({
      config,
      storage,
      fetchFn,
      now: () => stored.expiresAt - 10_000, // 10s before expiry, inside the margin
      redirect: () => {},
      createVerifier: () => 'v',
      createState: () => 's',
    })

    expect(await auth.getAccessToken()).toBe('NEW')
    expect(calls[0].url).toBe('https://accounts.spotify.com/api/token')
    expect(calls[0].body.get('grant_type')).toBe('refresh_token')
    expect(calls[0].body.get('refresh_token')).toBe('RT')
    expect(calls[0].body.get('client_id')).toBe(config.clientId)
  })

  it('returns the stored token without a network call when still fresh', async () => {
    const stored = { accessToken: 'FRESH', refreshToken: 'RT', expiresAt: 1_000_000 }
    const storage = memoryStore({ np_auth_token: JSON.stringify(stored) })
    const { fetchFn, calls } = tokenFetch({})
    const auth = createSpotifyAuth({
      config,
      storage,
      fetchFn,
      now: () => stored.expiresAt - 600_000, // 10min before expiry, well clear
      redirect: () => {},
      createVerifier: () => 'v',
      createState: () => 's',
    })

    expect(await auth.getAccessToken()).toBe('FRESH')
    expect(calls.length).toBe(0)
  })
})
