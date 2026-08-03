import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Intervallum Edzes",
        short_name: "Intervallum",
        description: "Mobilbarat intervallumos edzestervezo es lejatszo.",
        theme_color: "#0f766e",
        background_color: "#f8f7f2",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pictograms/jumping_jack.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pictograms/jumping_jack.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        runtimeCaching: [
          {
            urlPattern: /\/pictograms\/.*\.png$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pictograms-runtime-cache",
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\/exercise_database\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "exercise-data-cache",
              networkTimeoutSeconds: 2,
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],
});
