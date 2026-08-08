import { createFileRoute } from "@tanstack/react-router";
import { createApiHandler } from "@/lib/os/api/pipeline.server";
import { FeedbackApiSchema, createFeedbackFromApi } from "@/lib/os/api/feedback.server";
import { ApiPipelineError } from "@/lib/os/api/pipeline.server";

export const Route = createFileRoute("/api/v1/feedback")({
  server: {
    handlers: {
      POST: async (invocation) => {
        const handler = createApiHandler({
          version: "v1",
          authentication: "required",
          requiredScopes: ["support:feedback:create"],
          bodySchema: FeedbackApiSchema,
          handler: async (context) => {
            if (!context.auth?.saasProductId) {
              throw new ApiPipelineError(
                "INVALID_PRODUCT_CONTEXT",
                422,
                "API Application must have an associated SaaS Product."
              );
            }

            const feedback = await createFeedbackFromApi({
              input: context.body,
              applicationId: context.auth.applicationId,
              saasProductId: context.auth.saasProductId,
              requestId: context.requestId,
            });

            return {
              status: 201,
              data: {
                id: feedback.id,
                code: feedback.code,
                status: feedback.status,
                external_reference: context.body.external_reference,
                created_at: feedback.created_at,
              },
            };
          },
        });
        return handler(invocation);
      },
    },
  },
});

