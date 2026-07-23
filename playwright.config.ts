import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração Playwright para testes E2E autenticados.
 *
 * Pré-requisitos para rodar localmente:
 *  - Dev server em http://localhost:8080 já rodando (`bun run dev`).
 *  - Variáveis de sessão Supabase injetadas no ambiente:
 *      LOVABLE_BROWSER_SUPABASE_STORAGE_KEY
 *      LOVABLE_BROWSER_SUPABASE_SESSION_JSON
 *      LOVABLE_BROWSER_SUPABASE_COOKIES_JSON  (opcional para SSR)
 *  - Lead de teste existente no CRM; passar via TEST_LEAD_ID=<uuid>.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
