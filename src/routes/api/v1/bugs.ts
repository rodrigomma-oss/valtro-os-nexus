import { createFileRoute } from "@tanstack/react-router";
import { createApiHandler } from "@/lib/os/api/pipeline.server";
import { BugApiSchema, createBugFromApi } from "@/lib/os/api/bugs.server";
import { ApiPipelineError } from "@/lib/os/api/pipeline.server";

export const Route = createFileRoute("/api/v1/bugs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const handler = createApiHandler({
          version: "v1",
          authentication: "required",
          requiredScopes: ["support:bugs:create"],
          bodySchema: BugApiSchema,
          audit: true,
          handler: async (context) => {
            const { auth, body, requestId } = context;

            // 1. Validar Contexto de Produto
            if (!auth?.saasProductId) {
              throw new ApiPipelineError(
                "INVALID_PRODUCT_CONTEXT",
                422,
                "A API Application não possui um saas_product_id associado."
              );
            }

            // 2. Criar o Bug no domínio
            const bug = await createBugFromApi({
              input: body,
              applicationId: auth.applicationId,
              saasProductId: auth.saasProductId,
              requestId,
            });

            return {
              data: {
                id: bug.id,
                code: bug.code,
                status: bug.status,
                external_reference: bug.external_reference,
                created_at: bug.created_at,
              },
              status: 201,
            };
          },
        });

        return handler({ request });
      },
    },
  },
});
