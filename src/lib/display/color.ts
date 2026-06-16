// Derive a dominant color from album art for the Party DJ Mode color wash.

export interface Rgb {
  r: number
  g: number
  b: number
}

// Quantize each channel to 4 bits so near-identical shades fall in one bucket.
function bucketKey(r: number, g: number, b: number): number {
  return ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
}

/**
 * The most prominent color in RGBA pixel data: pixels are grouped into coarse
 * color buckets, and the average of the most populated bucket is returned.
 */
export function dominantColor(pixels: Uint8ClampedArray): Rgb {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const key = bucketKey(r, g, b)
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bucket.count++
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
  }

  let best = { count: 0, r: 0, g: 0, b: 0 }
  for (const bucket of buckets.values()) {
    if (bucket.count > best.count) best = bucket
  }
  if (best.count === 0) return { r: 0, g: 0, b: 0 }

  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count),
  }
}
