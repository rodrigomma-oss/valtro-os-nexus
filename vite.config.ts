// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { execSync } from "node:child_process";

/**
 * Resolve the commit SHA that identifies this build.
 * Order:
 *   1. Explicit env var (APP_COMMIT / GITHUB_SHA / COMMIT_SHA) set by CI or host.
 *   2. `git rev-parse HEAD` from the working tree.
 *   3. Safe fallback "unknown" — never throws.
 *
 * Only bare metadata is returned; no secrets are read here.
 */
function resolveCommit(): string {
  const environmentCommit =
    process.env.APP_COMMIT ||
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA;

  if (environmentCommit && /^[0-9a-f]{40}$/i.test(environmentCommit)) {
    return environmentCommit.toLowerCase();
  }
  if (environmentCommit) {
    // Non-40-char value provided (e.g. short SHA) — keep as-is but the
    // endpoint validator will still enforce the 40-hex/"unknown" contract.
    return environmentCommit;
  }

  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : "unknown";
  } catch {
    return "unknown";
  }
}

const appCommit = resolveCommit();
const appEnvironment =
  process.env.APP_ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown";
// Frozen at build time — every request served by this bundle reports the
// same builtAt, which is exactly what the CI version guard needs.
const appBuiltAt = new Date().toISOString();

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __APP_COMMIT__: JSON.stringify(appCommit),
      __APP_ENVIRONMENT__: JSON.stringify(appEnvironment),
      __APP_BUILT_AT__: JSON.stringify(appBuiltAt),
    },
  },
});
