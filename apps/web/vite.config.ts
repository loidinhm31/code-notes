import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@code-notes/ui/styles": path.resolve(
        __dirname,
        "../../packages/ui/src/styles/globals.css",
      ),
      "@code-notes/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  server: {
    port: 3000,
  },
});
