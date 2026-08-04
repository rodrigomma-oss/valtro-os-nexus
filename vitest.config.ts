import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Sprint 13.9 (P2-2) — escopo explícito do runner de unidade.
 *
 * Os specs de `tests/e2e` são do Playwright e importam `@playwright/test`;
 * sem este `include` restrito o Vitest os coleta e falha por engano.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    environment: "node",
  },
});
