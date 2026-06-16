# Deliver as a static web PWA, not a native iPadOS app

We deliver Now Playing as a full-screen web PWA (installed via Safari "Add to Home Screen") rather than a native iPadOS app. The README's core requirement is that it be "easy to install"; a native app would require an Apple Developer account, Xcode, and App Store review or sideloading, whereas a PWA installs from a URL with no account and lets us iterate instantly. Modern CSS/Canvas/WebGL covers the animation and effects we need.

## Consequences

- We're bound by Safari/iOS web constraints (autoplay rules, partial Wake Lock support, background suspension) — acceptable because the PWA never plays audio (see ADR-0002).
- Distribution is a URL, not a binary; there is no App Store presence.
