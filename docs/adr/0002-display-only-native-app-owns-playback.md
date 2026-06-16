# Display-only: the native Spotify app owns playback

Now Playing is a passive display. Audio is played by the **native Spotify iOS app** on the same iPad (routed to HiFi); the PWA only reads playback state from the Spotify Web API and renders it. The user starts playback in the Spotify app, then switches to the PWA for the full-screen visuals.

We verified that Spotify's Web Playback SDK *does* now work on iOS/iPadOS Safari (out of beta since 2021), so making the PWA itself the playback device was technically possible. We rejected it deliberately: the SDK on iOS can't auto-start audio (requires a user tap), has a non-functional `setVolume`, and is vulnerable to Safari backgrounding/lock suspending audio. Letting the native app own playback sidesteps all of these and keeps the PWA a pure, robust display.

## Consequences

- The PWA needs only read scopes (`user-read-currently-playing`, `user-read-playback-state`) — no playback-control scopes.
- "Party DJ" is an aesthetic Display Mode, not interactive guest control (see CONTEXT.md).
- Operating it means a manual app switch (Spotify → Safari) at party setup.
- Adding interactive control later would require new scopes and reopening this decision.
