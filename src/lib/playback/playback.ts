// Domain model and pure logic for the Now Playing display (CONTEXT.md).

export interface Track {
  title: string
  artist: string
  albumArtUrl: string | null
  durationMs: number
}

export type PlaybackState =
  | { status: 'playing'; track: Track; progressMs: number; fetchedAt: number }
  | { status: 'paused'; track: Track; progressMs: number; fetchedAt: number }
  | { status: 'idle' }

/** The result of one poll: a fresh state, a rate-limit signal, or a failure. */
export type PollOutcome =
  | { kind: 'state'; state: PlaybackState }
  | { kind: 'rateLimited'; retryAfterMs: number }
  | { kind: 'error' }

/** The result of one queue poll: fresh tracks, a rate-limit signal, or a failure. */
export type ComingUpOutcome =
  | { kind: 'tracks'; tracks: Track[] }
  | { kind: 'rateLimited'; retryAfterMs: number }
  | { kind: 'error' }

const CURRENTLY_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing'
const QUEUE_ENDPOINT = 'https://api.spotify.com/v1/me/player/queue'
const ERROR_BACKOFF_MS = 5_000

/** How long to wait before the next poll, given the last outcome. */
export function nextPollDelay(outcome: PollOutcome, baseIntervalMs: number): number {
  if (outcome.kind === 'rateLimited') return outcome.retryAfterMs
  if (outcome.kind === 'error') return Math.max(baseIntervalMs, ERROR_BACKOFF_MS)
  return baseIntervalMs
}

interface SpotifyImage {
  url: string
  width: number
}

interface SpotifyItem {
  name: string
  duration_ms: number
  artists: { name: string }[]
  album: { images: SpotifyImage[] }
}

interface CurrentlyPlayingBody {
  is_playing: boolean
  progress_ms: number
  item: SpotifyItem | null
}

function largestImageUrl(images: SpotifyImage[]): string | null {
  if (images.length === 0) return null
  return images.reduce((best, img) => (img.width > best.width ? img : best)).url
}

function parseTrack(item: SpotifyItem): Track {
  return {
    title: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    albumArtUrl: largestImageUrl(item.album.images),
    durationMs: item.duration_ms,
  }
}

// Shared HTTP envelope for authenticated Spotify GETs. Rate-limit and transient
// errors become results, never throws, so the polling loop can decide how long
// to wait (ADR-0003).
type HttpResult =
  | { kind: 'ok'; json: unknown }
  | { kind: 'noContent' }
  | { kind: 'rateLimited'; retryAfterMs: number }
  | { kind: 'error' }

async function requestSpotify(
  endpoint: string,
  accessToken: string,
  fetchFn: typeof fetch,
): Promise<HttpResult> {
  try {
    const res = await fetchFn(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 204) return { kind: 'noContent' }
    if (res.status === 200) return { kind: 'ok', json: await res.json() }
    if (res.status === 429) {
      const retryAfterSec = Number(res.headers.get('Retry-After') ?? '1')
      return { kind: 'rateLimited', retryAfterMs: retryAfterSec * 1000 }
    }
    return { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}

/** Poll Spotify's currently-playing endpoint once and classify the response. */
export async function fetchPlayback(
  accessToken: string,
  fetchFn: typeof fetch,
  now: number,
): Promise<PollOutcome> {
  const result = await requestSpotify(CURRENTLY_PLAYING_ENDPOINT, accessToken, fetchFn)
  switch (result.kind) {
    case 'noContent':
      return { kind: 'state', state: { status: 'idle' } }
    case 'ok':
      return { kind: 'state', state: parsePlayback(result.json, now) }
    case 'rateLimited':
      return { kind: 'rateLimited', retryAfterMs: result.retryAfterMs }
    case 'error':
      return { kind: 'error' }
  }
}

/**
 * The progress to display right now. A playing track advances locally by the
 * time elapsed since it was fetched (clamped to its duration) so the bar moves
 * smoothly between polls; a paused track holds; idle is zero.
 */
export function interpolateProgress(state: PlaybackState, now: number): number {
  if (state.status === 'idle') return 0
  if (state.status === 'paused') return state.progressMs
  const elapsed = now - state.fetchedAt
  return Math.min(state.track.durationMs, Math.max(0, state.progressMs + elapsed))
}

interface QueueBody {
  queue?: SpotifyItem[]
}

/** The upcoming tracks ("Coming Up"), parsed from the Spotify queue response. */
export function parseComingUp(body: unknown, limit: number): Track[] {
  const data = body as QueueBody
  return (data.queue ?? []).slice(0, limit).map(parseTrack)
}

/** Poll Spotify's queue endpoint once and classify the response (cf. fetchPlayback). */
export async function fetchComingUp(
  accessToken: string,
  fetchFn: typeof fetch,
  limit: number,
): Promise<ComingUpOutcome> {
  const result = await requestSpotify(QUEUE_ENDPOINT, accessToken, fetchFn)
  switch (result.kind) {
    case 'noContent':
      return { kind: 'tracks', tracks: [] }
    case 'ok':
      return { kind: 'tracks', tracks: parseComingUp(result.json, limit) }
    case 'rateLimited':
      return { kind: 'rateLimited', retryAfterMs: result.retryAfterMs }
    case 'error':
      return { kind: 'error' }
  }
}

export function parsePlayback(body: unknown, fetchedAt: number): PlaybackState {
  const data = body as CurrentlyPlayingBody
  const item = data.item
  if (!item) return { status: 'idle' }

  return {
    status: data.is_playing ? 'playing' : 'paused',
    track: parseTrack(item),
    progressMs: data.progress_ms,
    fetchedAt,
  }
}
