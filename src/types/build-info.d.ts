/**
 * Ambient declarations for build-time constants injected via
 * `vite.config.ts` → `define`. These are literal string replacements
 * performed by the bundler; they never read process.env at runtime and
 * never expose secrets.
 */
declare const __APP_COMMIT__: string;
declare const __APP_ENVIRONMENT__: string;
declare const __APP_BUILT_AT__: string;
