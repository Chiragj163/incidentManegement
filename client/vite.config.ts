import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "images.svg",
      ],

      manifest: {
        name: "Incident Management",
        short_name: "Incidents",
        description: "Incident Management System",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "/images.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },

      workbox: {
        navigateFallback: "/index.html",
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],
});
