/**
 * Sprint 14.1 (etapa final) — Endpoint chamado pelo pg_cron a cada 2 min.
 *
 * Fica sob `/api/public/*` porque o chamador é externo ao app (o banco),
 * e por isso toda a segurança vive aqui dentro:
 *   1. Bearer obrigatório, comparado em tempo constante;
 *   2. lease atômico para impedir execuções sobrepostas;
 *   3. resposta contendo apenas contadores — nenhum token, segredo,
 *      identificador de evento ou corpo bruto do Google.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google-calendar/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // process.env é injetado por requisição no runtime serverless.
        const expected = process.env.GOOGLE_CALENDAR_CRON_SECRET;

        const { readBearer, secretMatches, runScheduledSync } = await import(
          "@/lib/google-calendar/cron.server"
        );

        const token = readBearer(request.headers.get("authorization"));
        if (!secretMatches(token, expected)) {
          // Nenhum detalhe: não confirmamos sequer se o segredo existe.
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const origin = new URL(request.url).origin;
        const result = await runScheduledSync(origin);

        return Response.json({
          ok: true,
          lease: result.lease,
          processed: result.processed,
          synced: result.synced,
          removed: result.removed,
          failed: result.failed,
          skipped: result.skipped,
        });
      },
    },
  },
});
