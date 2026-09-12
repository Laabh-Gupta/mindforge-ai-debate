import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: "frontend",
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend/src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3001,
    strictPort: true,
    headers: { "X-Content-Type-Options": "nosniff" },
    proxy: {
      "/api": {
        target: process.env["API_PROXY_TARGET"] || "http://127.0.0.1:4000",
        changeOrigin: false,
      },
    },
  },
  preview: {
    headers: { "X-Content-Type-Options": "nosniff" },
    proxy: {
      "/api": {
        target: process.env["API_PROXY_TARGET"] || "http://127.0.0.1:4000",
        changeOrigin: false,
      },
    },
  },
  build: { outDir: "dist", sourcemap: false },
});
