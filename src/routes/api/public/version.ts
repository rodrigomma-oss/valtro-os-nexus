import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público de versão — usado pelo workflow E2E para garantir que a
 * URL de preview alvo (`PLAYWRIGHT_BASE_URL`) corresponde ao commit que o
 * GitHub Actions acabou de publicar. Sem essa verificação o CI poderia
 * rodar contra uma build antiga, mascarando regressões.
 *
 * Contrato de resposta (estrito — não adicionar campos):
 *   { commit: string, environment: string, builtAt: string }
 *
 * - `commit` é 40 hex chars (SHA completo do git) ou "unknown".
 * - `builtAt` é fixado no momento do build (via `vite.config.ts` → define),
 *   não no momento da requisição.
 * - `environment` é o rótulo declarado no build.
 *
 * NÃO retorna: variáveis de ambiente, URLs internas, chaves, dados do
 * banco, headers, ou qualquer informação de filesystem/sistema.
 */

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function normalizeCommit(raw: string): string {
  return FULL_SHA_PATTERN.test(raw) ? raw.toLowerCase() : "unknown";
}

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () => {
        const body = {
          commit: normalizeCommit(__APP_COMMIT__),
          environment: __APP_ENVIRONMENT__,
          builtAt: __APP_BUILT_AT__,
        };

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
