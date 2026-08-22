import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "wouter",
      "@tanstack/react-query",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "sonner",
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("lucide-react") ||
              id.includes("sonner") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")
            ) {
              return "ui";
            }
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    // Forward /api, /ws, /uploads, /metrics directly to IPv4 127.0.0.1:8000
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        ws: true,
      },
      "/ws": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/metrics": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
