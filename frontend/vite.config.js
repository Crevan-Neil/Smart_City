// ─────────────────────────────────────────────
//  vite.config.js
// ─────────────────────────────────────────────

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,        // required for Docker
    port: 5173,
    strictPort: true,

    // Proxy API calls to backend during dev
    // so no CORS issues when running outside Docker
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react:    ["react", "react-dom"],
          three:    ["three", "@react-three/fiber", "@react-three/drei"],
          charts:   ["recharts"],
          zustand:  ["zustand"],
          socket:   ["socket.io-client"],
        },
      },
    },
  },

  // Optimise large 3D deps
  optimizeDeps: {
    include: ["three", "@react-three/fiber", "@react-three/drei"],
  },
});