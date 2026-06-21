import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Kaamhai Admin Console",
        short_name: "Kaamhai Admin",
        description: "Manage the Kaamhai platform — users, employers, verifications, payroll and more.",
        theme_color: "#101426",
        background_color: "#101426",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell precache. API calls are network-first so data stays fresh.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/admin\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/admin/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "kh-admin-api",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      // Enable the service worker in `npm run dev` too, so the install prompt
      // works while developing (Chrome needs an active SW to offer install).
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  server: { port: 5173 },
});
