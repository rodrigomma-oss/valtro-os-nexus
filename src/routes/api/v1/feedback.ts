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

            const result = await createFeedbackFromApi({
              input: context.body,
              applicationId: context.auth.applicationId,
              saasProductId: context.auth.saasProductId,
              requestId: context.requestId,
            });

            return {
              status: 201,
              data: result,
            };
          },
        });
        return handler(invocation);
      },
    },
  },
});

