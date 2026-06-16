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

const CURRENTLY_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing'
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

/**
 * Poll Spotify's currently-playing endpoint once and classify the response.
 * Rate-limit and transient errors are returned as outcomes, never thrown, so
 * the polling loop can decide how long to wait (ADR-0003).
 */
export async function fetchPlayback(
  accessToken: string,
  fetchFn: typeof fetch,
  now: number,
): Promise<PollOutcome> {
  try {
    const res = await fetchFn(CURRENTLY_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (res.status === 204) return { kind: 'state', state: { status: 'idle' } }
    if (res.status === 200) {
      return { kind: 'state', state: parsePlayback(await res.json(), now) }
    }
    if (res.status === 429) {
      const retryAfterSec = Number(res.headers.get('Retry-After') ?? '1')
      return { kind: 'rateLimited', retryAfterMs: retryAfterSec * 1000 }
    }
    return { kind: 'error' }
  } catch {
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

export function parsePlayback(body: unknown, fetchedAt: number): PlaybackState {
  const data = body as CurrentlyPlayingBody
  const item = data.item
  if (!item) return { status: 'idle' }

  return {
    status: data.is_playing ? 'playing' : 'paused',
    track: {
      title: item.name,
      artist: item.artists.map((a) => a.name).join(', '),
      albumArtUrl: largestImageUrl(item.album.images),
      durationMs: item.duration_ms,
    },
    progressMs: data.progress_ms,
    fetchedAt,
  }
}
