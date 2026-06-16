<script lang="ts">
  import { interpolateProgress, type PlaybackState } from './lib/playback/playback'
  import { dominantColor, type Rgb } from './lib/display/color'

  let { playback }: { playback: PlaybackState } = $props()

  // rAF clock for smooth progress between polls.
  let now = $state(Date.now())
  $effect(() => {
    let raf = 0
    const loop = () => {
      now = Date.now()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  })

  const progressMs = $derived(interpolateProgress(playback, now))
  const pct = $derived(
    playback.status === 'idle' || playback.track.durationMs === 0
      ? 0
      : (progressMs / playback.track.durationMs) * 100,
  )

  const artUrl = $derived(playback.status === 'idle' ? null : playback.track.albumArtUrl)

  // Derive the wash color from the current album art (Spotify green as fallback).
  let accent = $state<Rgb>({ r: 30, g: 185, b: 84 })
  $effect(() => {
    const url = artUrl
    if (!url) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        accent = dominantColor(ctx.getImageData(0, 0, size, size).data)
      } catch {
        // Tainted canvas (CORS) — keep the fallback accent.
      }
    }
    img.src = url
    return () => {
      cancelled = true
    }
  })

  const accentCss = $derived(`rgb(${accent.r}, ${accent.g}, ${accent.b})`)
</script>

{#if playback.status === 'idle'}
  <section class="idle">
    <p>Nothing playing</p>
  </section>
{:else}
  <section
    class="party"
    class:paused={playback.status === 'paused'}
    style="--accent: {accentCss}"
  >
    <div class="wash"></div>
    {#if playback.track.albumArtUrl}
      <div class="art-bg" style="background-image: url({playback.track.albumArtUrl})"></div>
      <img class="art" src={playback.track.albumArtUrl} alt="" />
    {/if}
    <div class="meta">
      <h1 class="title">{playback.track.title}</h1>
      <p class="artist">{playback.track.artist}</p>
      <div class="progress">
        <div class="progress-fill" style="width: {pct}%"></div>
      </div>
    </div>
  </section>
{/if}

<style>
  .idle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .idle p {
    font-size: clamp(1.5rem, 4vmin, 2.5rem);
    color: var(--text-dim);
  }

  .party {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3vmin;
    overflow: hidden;
    /* Extra bottom room so the progress bar isn't flush against Coming Up. */
    padding: 4vmin 4vmin 8vmin;
    /* Art is capped so a 2-line title + artist + progress always fit. */
    --size: min(42vh, 82vw);
  }

  /* Animated color wash derived from the album art. */
  .wash {
    position: absolute;
    inset: -25%;
    z-index: 0;
    background: radial-gradient(circle at 30% 30%, var(--accent), transparent 60%),
      radial-gradient(circle at 70% 70%, var(--accent), transparent 55%);
    opacity: 0.55;
    filter: saturate(1.4);
    animation: swirl 18s ease-in-out infinite alternate;
  }

  @keyframes swirl {
    from {
      transform: rotate(0deg) scale(1.1);
    }
    to {
      transform: rotate(25deg) scale(1.35);
    }
  }

  .art-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-size: cover;
    background-position: center;
    filter: blur(80px) brightness(0.35);
    transform: scale(1.3);
    animation: pulse 6s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      transform: scale(1.25);
    }
    to {
      transform: scale(1.45);
    }
  }

  .art {
    position: relative;
    z-index: 1;
    width: var(--size);
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 2vmin;
    box-shadow:
      0 0 8vmin var(--accent),
      0 2vmin 6vmin rgba(0, 0, 0, 0.7);
    animation: bob 5s ease-in-out infinite alternate;
  }

  @keyframes bob {
    from {
      transform: translateY(-0.6vmin);
    }
    to {
      transform: translateY(0.6vmin);
    }
  }

  .meta {
    position: relative;
    z-index: 1;
    width: var(--size);
    text-align: center;
  }

  .title {
    font-size: clamp(2rem, 5.5vmin, 4.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 0.2em;
    /* Wrap to at most two lines; ellipsis only if it still overflows. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-shadow: 0 0.4vmin 2vmin rgba(0, 0, 0, 0.6);
  }

  .artist {
    font-size: clamp(1.1rem, 3vmin, 2rem);
    color: #fff;
    opacity: 0.85;
    margin: 0 0 1em;
  }

  .progress {
    height: 0.8vmin;
    min-height: 5px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
    box-shadow: 0 0 2vmin var(--accent);
  }

  .party.paused .art {
    animation-play-state: paused;
    opacity: 0.6;
  }

  @media (prefers-reduced-motion: reduce) {
    .wash,
    .art-bg,
    .art {
      animation: none;
    }
  }
</style>
