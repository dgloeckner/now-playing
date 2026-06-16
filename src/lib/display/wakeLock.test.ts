import { describe, it, expect } from 'vitest'
import { createWakeLock } from './wakeLock'

function fakeSentinel() {
  return {
    released: false,
    async release() {
      this.released = true
    },
  }
}

describe('createWakeLock', () => {
  it('acquires a wake lock on start when the page is visible', async () => {
    let requests = 0
    const wl = createWakeLock({
      request: async () => {
        requests++
        return fakeSentinel()
      },
      isVisible: () => true,
      onVisibilityChange: () => () => {},
    })

    await wl.start()
    expect(requests).toBe(1)
  })

  it('re-acquires the lock when the page becomes visible again', async () => {
    let requests = 0
    let visible = true
    let fireVisibilityChange = () => {}
    const wl = createWakeLock({
      request: async () => {
        requests++
        return fakeSentinel()
      },
      isVisible: () => visible,
      onVisibilityChange: (cb) => {
        fireVisibilityChange = cb
        return () => {}
      },
    })

    await wl.start() // request #1 while visible

    // Backgrounded: browser releases the lock.
    visible = false
    await fireVisibilityChange()

    // Foregrounded again: must re-acquire.
    visible = true
    await fireVisibilityChange()

    expect(requests).toBe(2)
  })

  it('releases the lock and stops re-acquiring after stop', async () => {
    let requests = 0
    let visible = true
    let fireVisibilityChange = () => {}
    let unsubscribed = false
    const sentinel = fakeSentinel()
    const wl = createWakeLock({
      request: async () => {
        requests++
        return sentinel
      },
      isVisible: () => visible,
      onVisibilityChange: (cb) => {
        fireVisibilityChange = cb
        return () => {
          unsubscribed = true
        }
      },
    })

    await wl.start() // request #1
    await wl.stop()

    expect(sentinel.released).toBe(true)
    expect(unsubscribed).toBe(true)

    // Visibility changes after stop must not re-acquire.
    visible = false
    await fireVisibilityChange()
    visible = true
    await fireVisibilityChange()
    expect(requests).toBe(1)
  })

  it('swallows a failed wake lock request so start does not reject', async () => {
    const wl = createWakeLock({
      request: async () => {
        throw new Error('NotAllowedError')
      },
      isVisible: () => true,
      onVisibilityChange: () => () => {},
    })
    await expect(wl.start()).resolves.toBeUndefined()
  })
})
