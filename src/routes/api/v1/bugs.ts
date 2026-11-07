import { createFileRoute } from "@tanstack/react-router";
import { createApiHandler } from "@/lib/os/api/pipeline.server";
import { BugApiSchema, createBugFromApi } from "@/lib/os/api/bugs.server";
import { ApiPipelineError } from "@/lib/os/api/pipeline.server";

export const Route = createFileRoute("/api/v1/bugs")({
  server: {
    handlers: {
      POST: async (invocation) => {
        const handler = createApiHandler({
          version: "v1",
          authentication: "required",
          requiredScopes: ["support:bugs:create"],
          bodySchema: BugApiSchema,
          handler: async (context) => {
            if (!context.auth?.saasProductId) {
              throw new ApiPipelineError(
                "INVALID_PRODUCT_CONTEXT",
                422,
                "API Application must have an associated SaaS Product."
              );
            }

            const bug = await createBugFromApi({
              input: context.body,
              applicationId: context.auth.applicationId,
              saasProductId: context.auth.saasProductId,
              requestId: context.requestId,
            });

            return {
              status: 201,
              data: {
                id: bug.id,
                code: bug.code,
                status: bug.status,
                external_reference: context.body.external_reference,
                created_at: bug.created_at,
              },
            };
          },
        });
        return handler(invocation);
      },
    },
  },
});
