# Svelte + Vite over React

We build the PWA with Svelte (on Vite + TypeScript) rather than the more obvious React default. Now Playing is essentially one animation-heavy screen with little state, running on a constrained always-on iPad. Svelte's compile-time approach gives a smaller runtime/bundle and smoother animation on that hardware, and its built-in motion/transition primitives fit the animation-heavy brief without an extra library (React would need Framer Motion or similar).

The trade-off is ecosystem size and familiarity: React is more widely known. We accepted that because the perf/bundle profile and built-in motion matter more for this specific app than ecosystem breadth.

## Consequences

- Framework choice is sticky — switching later is a rewrite of the UI layer.
- Contributors must know (or learn) Svelte rather than React.
