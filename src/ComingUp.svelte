<script lang="ts">
  import type { Track } from './lib/playback/playback'

  let { tracks }: { tracks: Track[] } = $props()
</script>

{#if tracks.length > 0}
  <aside class="coming-up" aria-label="Coming up">
    <h2 class="label">Coming Up</h2>
    <ul class="list">
      {#each tracks as track (track.title + track.artist)}
        <li class="item">
          {#if track.albumArtUrl}
            <img class="thumb" src={track.albumArtUrl} alt="" />
          {:else}
            <div class="thumb thumb--empty"></div>
          {/if}
          <div class="text">
            <span class="title">{track.title}</span>
            <span class="artist">{track.artist}</span>
          </div>
        </li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .coming-up {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: min(55vh, 80vw);
    margin: 0 auto;
  }

  .label {
    font-size: clamp(0.7rem, 1.6vmin, 1rem);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--text-dim);
    margin: 0 0 0.8em;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.2vmin;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 1.5vmin;
    min-width: 0;
  }

  .thumb {
    width: clamp(28px, 5vmin, 56px);
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 0.6vmin;
    flex-shrink: 0;
  }

  .thumb--empty {
    background: rgba(255, 255, 255, 0.12);
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .title {
    font-size: clamp(0.9rem, 2vmin, 1.3rem);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist {
    font-size: clamp(0.75rem, 1.6vmin, 1rem);
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
