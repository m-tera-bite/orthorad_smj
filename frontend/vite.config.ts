import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command }) => ({
  // Django serves built assets under STATIC_URL ("/static/"), so the
  // built index.html must reference them at /static/react/... . The
  // standalone dev server (npm run dev) still serves from "/".
  base: command === "build" ? "/static/react/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../backend/static/react",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
}));
