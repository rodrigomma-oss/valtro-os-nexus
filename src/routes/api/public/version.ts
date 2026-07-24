import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público de versão — usado pelo workflow E2E para garantir que a
 * URL de preview alvo (`PLAYWRIGHT_BASE_URL`) corresponde ao commit que o
 * GitHub Actions acabou de fazer push. Sem essa verificação o CI poderia
 * rodar contra uma build antiga, mascarando regressões.
 *
 * Responde com JSON contendo o commit SHA que a build empacotou. A fonte é
 * `process.env.APP_COMMIT` (definida no build) com fallback para
 * `VERCEL_GIT_COMMIT_SHA` / `GITHUB_SHA` quando aplicável. Nunca expõe
 * segredos — somente metadados de build.
 */
export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () => {
        const commit =
          process.env.APP_COMMIT ||
          process.env.VITE_APP_COMMIT ||
          process.env.GITHUB_SHA ||
          "unknown";

        const environment = process.env.APP_ENV || "unknown";
        const builtAt = process.env.APP_BUILT_AT || null;

        return new Response(
          JSON.stringify({
            commit,
            environment,
            builtAt,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
