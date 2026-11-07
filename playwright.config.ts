import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

/**
 * Configuração Playwright para testes E2E autenticados.
 *
 * Autenticação: um global-setup faz signInWithPassword do usuário E2E
 * dedicado (secrets E2E_TEST_EMAIL / E2E_TEST_PASSWORD) e grava um
 * storageState temporário em tests/e2e/.auth/state.json. Esse arquivo
 * é ignorado pelo git e nunca é enviado como artefato do CI.
 */
const STORAGE_STATE = resolve(process.cwd(), "tests/e2e/.auth/state.json");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  globalSetup: resolve(process.cwd(), "tests/e2e/global-setup.ts"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
    storageState: STORAGE_STATE,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
