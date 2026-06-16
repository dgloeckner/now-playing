<script lang="ts">
  // Auth (issue 02) + Now Playing display (issue 03).
  import { createBrowserSpotifyAuth } from './lib/auth/browser'
  import { createNowPlayingPoller } from './lib/playback/poller'
  import type { PlaybackState, Track } from './lib/playback/playback'
  import NowPlaying from './NowPlaying.svelte'
  import ComingUp from './ComingUp.svelte'

  const auth = createBrowserSpotifyAuth()
  let status = $state(auth.getStatus())
  let error = $state<string | null>(null)
  let playback = $state<PlaybackState>({ status: 'idle' })
  let comingUp = $state<Track[]>([])

  // While connected, poll Spotify and feed the latest state to the display.
  $effect(() => {
    if (status !== 'connected') return
    const poller = createNowPlayingPoller({
      getAccessToken: () => auth.getAccessToken(),
      fetchFn: window.fetch.bind(window),
      now: () => Date.now(),
      onState: (s) => {
        playback = s
      },
      onComingUp: (tracks) => {
        comingUp = tracks
      },
      comingUpLimit: 3,
    })
    poller.start()
    return () => poller.stop()
  })

  // If we've returned from the Spotify authorize redirect, finish the login,
  // then strip the query string so a reload doesn't re-run the exchange.
  async function handleRedirectCallback() {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('code') && !url.searchParams.has('error')) return

    if (url.searchParams.has('error')) {
      error = url.searchParams.get('error')
    } else {
      try {
        await auth.completeLogin(window.location.href)
        status = auth.getStatus()
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      }
    }
    window.history.replaceState({}, '', url.pathname)
  }
  handleRedirectCallback()

  async function connect() {
    error = null
    await auth.login()
  }
</script>

{#if status === 'connected'}
  <main class="display display--connected">
    <NowPlaying {playback} />
    <ComingUp tracks={comingUp} />
  </main>
{:else}
  <main class="display">
    <section class="placeholder">
      <h1>Now Playing</h1>
      <p>Not connected to Spotify yet.</p>
      {#if error}
        <p class="error">Couldn't connect: {error}</p>
      {/if}
      <button class="connect" onclick={connect}>Connect Spotify</button>
    </section>
  </main>
{/if}

<style>
  .display {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 5vmin;
  }

  /* Connected: Now Playing fills the upper area, Coming Up sits below it. */
  .display--connected {
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    padding: 0 0 4vmin;
  }

  .placeholder h1 {
    font-size: clamp(2.5rem, 8vmin, 6rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    margin: 0 0 0.5em;
  }

  .placeholder p {
    margin: 0.25em 0;
    font-size: clamp(1rem, 2.5vmin, 1.5rem);
    color: var(--text-dim);
  }

  .placeholder .error {
    color: #ff6b6b;
  }

  .connect {
    margin-top: 1.5em;
    font: inherit;
    font-size: clamp(1rem, 2.5vmin, 1.4rem);
    color: #000;
    background: #1db954;
    border: none;
    border-radius: 999px;
    padding: 0.6em 1.6em;
    cursor: pointer;
  }

  .connect:active {
    transform: scale(0.97);
  }
</style>
