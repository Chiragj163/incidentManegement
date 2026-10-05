import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    base: "/incidentManagement/",
    server: {
        host: "0.0.0.0",
    },

    plugins: [
        react(),

        VitePWA({
            registerType: "prompt",

            strategies: "injectManifest",

            srcDir: "src",

            filename: "sw.ts",
            devOptions: {
                enabled: true,
            },

            manifest: {
                name: "Incident Management",
                short_name: "Incidents",
                description: "Incident Management System",
                theme_color: "#2563eb",
                background_color: "#ffffff",
                display: "standalone",
                orientation: "portrait",
                scope: "/incidentManagement/",
                start_url: "/incidentManagement/",

                icons: [
                    {
                        src: "/incidentManagement/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/incidentManagement/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "/incidentManagement/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
        }),
    ],
});