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
        // Precache the app shell only. API calls (cross-origin /admin/*) are
        // NOT handled by the SW — they always go straight to the network, so
        // admin data is never stale or served from cache.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/admin\//],
      },
      // Enable the service worker in `npm run dev` too, so the install prompt
      // works while developing (Chrome needs an active SW to offer install).
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  server: { port: 5173 },
});
