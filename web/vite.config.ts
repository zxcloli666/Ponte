import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";
import fs from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "fonts/*.woff2"],
      manifest: {
        name: "Ponte",
        short_name: "Ponte",
        description: "Bridge your Android phone to iOS",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#007AFF",
        orientation: "portrait",
        icons: [
          { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router"],
          state: ["zustand", "socket.io-client"],
          ui: ["framer-motion", "qrcode.react"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync('./cert/key.pem'),
      cert: fs.readFileSync('./cert/cert.pem'),
    },
    proxy: {
      // Proxy all requests starting with /v1 to your backend
      '/v1': {
        target: 'http://192.168.31.84:3000',
        changeOrigin: true,
        // Optional: rewrite path if needed, but here it's just '/v1' -> '/v1'
      },
      '/socket.io': {
        target: 'ws://192.168.31.84:3000', // можно использовать http://, http-proxy сам поймёт
        ws: true,          // включает поддержку WebSocket
        changeOrigin: true,
      },
    }
  },
});
