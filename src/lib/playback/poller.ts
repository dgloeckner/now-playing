// Thin polling loop that drives the Now Playing display. All the decisions
// (parsing, classifying outcomes, choosing the next delay) live in playback.ts
// and are unit-tested; this just wires them to a token source and a timer.

import {
  fetchPlayback,
  fetchComingUp,
  nextPollDelay,
  type PlaybackState,
  type PollOutcome,
  type Track,
} from './playback'

export interface NowPlayingPollerDeps {
  getAccessToken: () => Promise<string>
  fetchFn: typeof fetch
  now: () => number
  onState: (state: PlaybackState) => void
  onComingUp?: (tracks: Track[]) => void
  baseIntervalMs?: number
  comingUpLimit?: number
}

export interface NowPlayingPoller {
  start(): void
  stop(): void
}

export function createNowPlayingPoller(deps: NowPlayingPollerDeps): NowPlayingPoller {
  const baseIntervalMs = deps.baseIntervalMs ?? 2_000
  const comingUpLimit = deps.comingUpLimit ?? 3
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false

  async function tick() {
    // The poll cadence is governed by the Now Playing fetch; Coming Up rides
    // along on the same tick (its own endpoint, fetched in parallel).
    let outcome: PollOutcome = { kind: 'error' }
    try {
      const token = await deps.getAccessToken()
      const [playback, comingUp] = await Promise.all([
        fetchPlayback(token, deps.fetchFn, deps.now()),
        fetchComingUp(token, deps.fetchFn, comingUpLimit),
      ])
      outcome = playback
      if (playback.kind === 'state') deps.onState(playback.state)
      if (comingUp.kind === 'tracks') deps.onComingUp?.(comingUp.tracks)
    } catch {
      // Token refresh failed or no session — treat like a transient error.
      outcome = { kind: 'error' }
    }

    if (running) timer = setTimeout(tick, nextPollDelay(outcome, baseIntervalMs))
  }

  return {
    start() {
      if (running) return
      running = true
      void tick()
    },
    stop() {
      running = false
      if (timer) clearTimeout(timer)
    },
  }
}
