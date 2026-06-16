import { describe, it, expect } from 'vitest'
import {
  parsePlayback,
  interpolateProgress,
  fetchPlayback,
  nextPollDelay,
  parseComingUp,
  fetchComingUp,
} from './playback'
import type { PlaybackState } from './playback'

function res(status: number, opts: { json?: unknown; retryAfter?: string } = {}): Response {
  return {
    status,
    json: async () => opts.json,
    headers: {
      get: (h: string) => (h.toLowerCase() === 'retry-after' ? (opts.retryAfter ?? null) : null),
    },
  } as unknown as Response
}

const playingBody = {
  is_playing: true,
  progress_ms: 12_345,
  item: {
    name: 'Song Title',
    duration_ms: 200_000,
    artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
    album: {
      images: [
        { url: 'https://img/300', width: 300, height: 300 },
        { url: 'https://img/640', width: 640, height: 640 },
        { url: 'https://img/64', width: 64, height: 64 },
      ],
    },
  },
}

describe('parsePlayback', () => {
  it('parses a playing track into Now Playing state', () => {
    const state = parsePlayback(playingBody, 1_000)

    expect(state).toEqual({
      status: 'playing',
      track: {
        title: 'Song Title',
        artist: 'Artist One, Artist Two',
        albumArtUrl: 'https://img/640', // the largest image
        durationMs: 200_000,
      },
      progressMs: 12_345,
      fetchedAt: 1_000,
    })
  })

  it('parses a response with no active item as idle', () => {
    const state = parsePlayback({ is_playing: false, progress_ms: 0, item: null }, 1_000)
    expect(state).toEqual({ status: 'idle' })
  })
})

describe('interpolateProgress', () => {
  const track = { title: 't', artist: 'a', albumArtUrl: null, durationMs: 200_000 }

  it('advances a playing track by the time elapsed since it was fetched', () => {
    const state: PlaybackState = { status: 'playing', track, progressMs: 10_000, fetchedAt: 1_000 }
    expect(interpolateProgress(state, 6_000)).toBe(15_000) // 5s elapsed
  })

  it('clamps a playing track at its duration', () => {
    const state: PlaybackState = { status: 'playing', track, progressMs: 10_000, fetchedAt: 1_000 }
    expect(interpolateProgress(state, 1_000_000)).toBe(200_000)
  })

  it('holds steady for a paused track', () => {
    const state: PlaybackState = { status: 'paused', track, progressMs: 10_000, fetchedAt: 1_000 }
    expect(interpolateProgress(state, 6_000)).toBe(10_000)
  })

  it('is zero when idle', () => {
    expect(interpolateProgress({ status: 'idle' }, 6_000)).toBe(0)
  })
})

describe('fetchPlayback', () => {
  it('maps 200 to a playback state and sends the bearer token', async () => {
    let captured: { url: string; init: RequestInit } | undefined
    const fetchFn = (async (url: string, init: RequestInit) => {
      captured = { url: String(url), init }
      return res(200, { json: playingBody })
    }) as unknown as typeof fetch

    const outcome = await fetchPlayback('TOKEN', fetchFn, 1_000)

    expect(outcome.kind).toBe('state')
    expect(outcome.kind === 'state' && outcome.state.status).toBe('playing')
    expect(captured!.url).toBe('https://api.spotify.com/v1/me/player/currently-playing')
    expect((captured!.init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN')
  })

  it('maps 204 No Content to idle', async () => {
    const fetchFn = (async () => res(204)) as unknown as typeof fetch
    expect(await fetchPlayback('TOKEN', fetchFn, 1_000)).toEqual({
      kind: 'state',
      state: { status: 'idle' },
    })
  })

  it('maps 429 to rate-limited using the Retry-After header (seconds)', async () => {
    const fetchFn = (async () => res(429, { retryAfter: '3' })) as unknown as typeof fetch
    expect(await fetchPlayback('TOKEN', fetchFn, 1_000)).toEqual({
      kind: 'rateLimited',
      retryAfterMs: 3_000,
    })
  })

  it('maps other statuses to error', async () => {
    const fetchFn = (async () => res(500)) as unknown as typeof fetch
    expect(await fetchPlayback('TOKEN', fetchFn, 1_000)).toEqual({ kind: 'error' })
  })

  it('maps a network failure to error', async () => {
    const fetchFn = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await fetchPlayback('TOKEN', fetchFn, 1_000)).toEqual({ kind: 'error' })
  })
})

describe('parseComingUp', () => {
  const queueBody = {
    currently_playing: { name: 'ignored' },
    queue: [
      {
        name: 'Next One',
        duration_ms: 180_000,
        artists: [{ name: 'Artist A' }],
        album: { images: [{ url: 'https://q/640', width: 640 }, { url: 'https://q/64', width: 64 }] },
      },
      {
        name: 'Next Two',
        duration_ms: 200_000,
        artists: [{ name: 'Artist B' }, { name: 'Artist C' }],
        album: { images: [] },
      },
    ],
  }

  it('maps queue items to upcoming tracks', () => {
    expect(parseComingUp(queueBody, 3)).toEqual([
      { title: 'Next One', artist: 'Artist A', albumArtUrl: 'https://q/640', durationMs: 180_000 },
      { title: 'Next Two', artist: 'Artist B, Artist C', albumArtUrl: null, durationMs: 200_000 },
    ])
  })

  it('caps the result at the given limit', () => {
    const body = {
      queue: Array.from({ length: 5 }, (_, i) => ({
        name: `T${i}`,
        duration_ms: 1_000,
        artists: [{ name: 'A' }],
        album: { images: [] },
      })),
    }
    const tracks = parseComingUp(body, 3)
    expect(tracks).toHaveLength(3)
    expect(tracks.map((t) => t.title)).toEqual(['T0', 'T1', 'T2'])
  })

  it('returns an empty list when the queue is empty or missing', () => {
    expect(parseComingUp({ queue: [] }, 3)).toEqual([])
    expect(parseComingUp({}, 3)).toEqual([])
  })
})

describe('fetchComingUp', () => {
  const queueResponse = {
    queue: [{ name: 'Q1', duration_ms: 1_000, artists: [{ name: 'A' }], album: { images: [] } }],
  }

  it('maps 200 to upcoming tracks and sends the bearer token', async () => {
    let captured: { url: string; init: RequestInit } | undefined
    const fetchFn = (async (url: string, init: RequestInit) => {
      captured = { url: String(url), init }
      return res(200, { json: queueResponse })
    }) as unknown as typeof fetch

    expect(await fetchComingUp('TOKEN', fetchFn, 3)).toEqual({
      kind: 'tracks',
      tracks: [{ title: 'Q1', artist: 'A', albumArtUrl: null, durationMs: 1_000 }],
    })
    expect(captured!.url).toBe('https://api.spotify.com/v1/me/player/queue')
    expect((captured!.init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN')
  })

  it('maps 204 No Content to an empty Coming Up', async () => {
    const fetchFn = (async () => res(204)) as unknown as typeof fetch
    expect(await fetchComingUp('TOKEN', fetchFn, 3)).toEqual({ kind: 'tracks', tracks: [] })
  })

  it('maps 429 to rate-limited via Retry-After', async () => {
    const fetchFn = (async () => res(429, { retryAfter: '2' })) as unknown as typeof fetch
    expect(await fetchComingUp('TOKEN', fetchFn, 3)).toEqual({
      kind: 'rateLimited',
      retryAfterMs: 2_000,
    })
  })

  it('maps other statuses and network failures to error', async () => {
    const server = (async () => res(500)) as unknown as typeof fetch
    expect(await fetchComingUp('TOKEN', server, 3)).toEqual({ kind: 'error' })
    const network = (async () => {
      throw new Error('down')
    }) as unknown as typeof fetch
    expect(await fetchComingUp('TOKEN', network, 3)).toEqual({ kind: 'error' })
  })
})

describe('nextPollDelay', () => {
  const base = 2_000

  it('polls again at the base interval after a successful state', () => {
    expect(nextPollDelay({ kind: 'state', state: { status: 'idle' } }, base)).toBe(base)
  })

  it('waits the Retry-After duration when rate limited', () => {
    expect(nextPollDelay({ kind: 'rateLimited', retryAfterMs: 3_000 }, base)).toBe(3_000)
  })

  it('backs off beyond the base interval on error', () => {
    expect(nextPollDelay({ kind: 'error' }, base)).toBeGreaterThan(base)
  })
})
