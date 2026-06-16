// Thin polling loop that drives the Now Playing display. All the decisions
// (parsing, classifying outcomes, choosing the next delay) live in playback.ts
// and are unit-tested; this just wires them to a token source and a timer.

import { fetchPlayback, nextPollDelay, type PlaybackState, type PollOutcome } from './playback'

export interface NowPlayingPollerDeps {
  getAccessToken: () => Promise<string>
  fetchFn: typeof fetch
  now: () => number
  onState: (state: PlaybackState) => void
  baseIntervalMs?: number
}

export interface NowPlayingPoller {
  start(): void
  stop(): void
}

export function createNowPlayingPoller(deps: NowPlayingPollerDeps): NowPlayingPoller {
  const baseIntervalMs = deps.baseIntervalMs ?? 2_000
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false

  async function tick() {
    let outcome: PollOutcome
    try {
      const token = await deps.getAccessToken()
      outcome = await fetchPlayback(token, deps.fetchFn, deps.now())
    } catch {
      // Token refresh failed or no session — treat like a transient error.
      outcome = { kind: 'error' }
    }

    if (outcome.kind === 'state') deps.onState(outcome.state)
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
