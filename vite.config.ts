import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    target: `http://localhost:${process.env.AI_SERVER_PORT || 8787}`,
  },
};

export default defineConfig({
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Intervallum Edzés",
        short_name: "Intervallum",
        description: "Mobilbarát intervallumos edzéstervező és lejátszó.",
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
