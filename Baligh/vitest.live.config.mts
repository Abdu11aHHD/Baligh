import { defineConfig } from "vitest/config";
import path from "node:path";

/** Live tests hit the real OpenRouter API with the configured Meta Llama model. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: { environment: "node", include: ["tests/live/**/*.test.ts"], testTimeout: 90_000 },
});
