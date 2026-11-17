import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const BASE = "/Organizador-de-vida/";

export default defineConfig({
  base: BASE,
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Organizador",
        short_name: "Organizador",
        description: "Toda tu vida, un solo sistema.",
        lang: "es-AR",
        display: "standalone",
        start_url: BASE,
        scope: BASE,
        background_color: "#0b0b0f",
        theme_color: "#0b0b0f",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: `${BASE}index.html`,
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
      },
    }),
  ],
});
