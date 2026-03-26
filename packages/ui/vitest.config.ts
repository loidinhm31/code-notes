import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@code-notes/ui": resolve(__dirname, "./src"),
      "@code-notes/shared": resolve(__dirname, "../shared/src"),
      "@/*": resolve(__dirname, "./src"),
    },
  },
});
