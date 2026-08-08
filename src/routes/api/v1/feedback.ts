import { createFileRoute } from "@tanstack/react-router";
import { executePipeline } from "@/lib/os/api/pipeline.server";
import { FeedbackApiSchema, createFeedbackFromApi } from "@/lib/os/api/feedback.server";

export const Route = createFileRoute("/api/v1/feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return executePipeline(request, {
          requiredScopes: ["support.feedback.create"],
          validationSchema: FeedbackApiSchema,
          handler: async (context) => {
            const result = await createFeedbackFromApi({
              input: context.payload,
              applicationId: context.auth.applicationId,
              saasProductId: context.auth.saasProductId!,
              requestId: context.requestId,
            });

            return {
              status: context.isReplay ? 200 : 201,
              data: result,
            };
          },
        });
      },
    },
  },
});
