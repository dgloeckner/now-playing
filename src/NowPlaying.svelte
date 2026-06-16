<script lang="ts">
  import { interpolateProgress, type PlaybackState } from './lib/playback/playback'

  let { playback }: { playback: PlaybackState } = $props()

  // A rAF clock so the progress bar advances smoothly between polls.
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
</script>

{#if playback.status === 'idle'}
  <section class="idle">
    <p>Nothing playing</p>
  </section>
{:else}
  <section class="now-playing" class:paused={playback.status === 'paused'}>
    {#if playback.track.albumArtUrl}
      <div class="art-bg" style="background-image: url({playback.track.albumArtUrl})"></div>
      <img class="art" src={playback.track.albumArtUrl} alt="" />
    {/if}
    <div class="meta">
      <h1 class="title">{playback.track.title}</h1>
      <p class="artist">{playback.track.artist}</p>
      <div class="progress" role="presentation">
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

  .now-playing {
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
    --size: min(42vh, 80vw);
  }

  /* Blurred, dimmed album art as an ambient backdrop. */
  .art-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(60px) brightness(0.4);
    transform: scale(1.2);
    z-index: 0;
  }

  .art {
    position: relative;
    z-index: 1;
    width: var(--size);
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 1.5vmin;
    box-shadow: 0 2vmin 6vmin rgba(0, 0, 0, 0.6);
    transition: opacity 0.4s ease;
  }

  .meta {
    position: relative;
    z-index: 1;
    width: var(--size);
    text-align: center;
  }

  .title {
    font-size: clamp(1.8rem, 4.5vmin, 3.5rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 0.2em;
    /* Wrap to at most two lines; ellipsis only if it still overflows. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .artist {
    font-size: clamp(1rem, 2.8vmin, 1.8rem);
    color: var(--text-dim);
    margin: 0 0 1em;
  }

  .progress {
    height: 0.6vmin;
    min-height: 4px;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #1db954;
    border-radius: 999px;
  }

  .now-playing.paused .art {
    opacity: 0.6;
  }
</style>
