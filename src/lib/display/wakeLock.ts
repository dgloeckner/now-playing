// Keeps the kiosk display awake via the Screen Wake Lock API. The browser
// releases the lock when the page is backgrounded/locked, so we re-acquire it
// when the page becomes visible again (notably on iOS). Browser seams are
// injected so the lifecycle is testable without a real document.

export interface WakeLockSentinel {
  release(): Promise<void>
}

export interface WakeLockDeps {
  request: () => Promise<WakeLockSentinel>
  isVisible: () => boolean
  onVisibilityChange: (cb: () => void) => () => void
}

export interface WakeLock {
  start(): Promise<void>
  stop(): Promise<void>
}

export function createWakeLock(deps: WakeLockDeps): WakeLock {
  let sentinel: WakeLockSentinel | null = null
  let unsubscribe: (() => void) | null = null
  let running = false

  async function acquire() {
    if (!running || sentinel || !deps.isVisible()) return
    try {
      sentinel = await deps.request()
    } catch {
      // The platform may deny the lock (unsupported, not allowed, not visible).
      // Leave it unheld; a later visibility change will try again.
      sentinel = null
    }
  }

  async function onChange() {
    if (!running) return
    if (deps.isVisible()) {
      await acquire()
    } else {
      // The browser has released the lock; forget it so we re-acquire later.
      sentinel = null
    }
  }

  return {
    async start() {
      running = true
      unsubscribe = deps.onVisibilityChange(onChange)
      await acquire()
    },
    async stop() {
      running = false
      unsubscribe?.()
      unsubscribe = null
      await sentinel?.release()
      sentinel = null
    },
  }
}
