import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  resolve: {
    alias: { "@": "/src" },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts", "d3-scale", "d3-scale-chromatic"],
          "vendor-maps": ["react-simple-maps"],
          "vendor-motion": ["framer-motion"],
          "vendor-ui": ["lucide-react", "react-hot-toast"],
        },
      },
    },
  },
});
