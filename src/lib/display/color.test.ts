import { describe, it, expect } from 'vitest'
import { dominantColor } from './color'

describe('dominantColor', () => {
  it('returns the most common color from RGBA pixel data', () => {
    // 3 red pixels, 1 blue — red dominates.
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255,
    ])
    expect(dominantColor(pixels)).toEqual({ r: 255, g: 0, b: 0 })
  })
})
