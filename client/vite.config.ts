import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.resolve(__dirname, "../certs");

export default defineConfig({
    server: {
        host: "0.0.0.0",
        https: {
            key: fs.readFileSync(
                path.join(
                    certDir,
                    "192.168.100.186+2-key.pem"
                )
            ),
            cert: fs.readFileSync(
                path.join(
                    certDir,
                    "192.168.100.186+2.pem"
                )
            ),
        },
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
                scope: "/",
                start_url: "/",

                icons: [
                    {
                        src: "/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
        }),
    ],
});