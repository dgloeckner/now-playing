import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this repo under /now-playing/. This base also applies in
// dev, so the local app lives at http://localhost:5173/now-playing/ (the root
// 302-redirects there). If you deploy to a custom domain or a differently-named
// repo, update this — and the Spotify redirect URI must include the same path.
const base = '/now-playing/'

// https://vite.dev/config/
export default defineConfig({
  base,
  // Serve on the loopback IP so the dev URL matches Spotify's required redirect
  // URI (http://127.0.0.1:5173/now-playing/). Spotify rejects `localhost`.
  server: { host: '127.0.0.1', port: 5173 },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      // The display is read-only; cache the app shell so a flaky party Wi-Fi
      // connection can't blank the screen on reload.
      manifest: {
        name: 'Now Playing',
        short_name: 'Now Playing',
        description: 'Full-screen Spotify now-playing display for iPad.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#000000',
        theme_color: '#000000',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
