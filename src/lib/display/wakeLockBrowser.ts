// Browser composition for the wake lock: wires createWakeLock to the real
// Screen Wake Lock API + document visibility. Returns a no-op if unsupported.

import { createWakeLock, type WakeLock } from './wakeLock'

export function createBrowserWakeLock(): WakeLock {
  if (!('wakeLock' in navigator)) {
    return { async start() {}, async stop() {} }
  }

  return createWakeLock({
    request: () => navigator.wakeLock.request('screen'),
    isVisible: () => document.visibilityState === 'visible',
    onVisibilityChange: (cb) => {
      document.addEventListener('visibilitychange', cb)
      return () => document.removeEventListener('visibilitychange', cb)
    },
  })
}
