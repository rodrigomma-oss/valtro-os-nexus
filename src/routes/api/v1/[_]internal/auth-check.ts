import { createFileRoute } from "@tanstack/react-router";
import { createApiHandler, type ApiPipelineDependencies } from "@/lib/os/api/pipeline.server";

export function createAuthCheckHandler(dependencies: Partial<ApiPipelineDependencies> = {}) {
  return createApiHandler(
    {
      version: "v1",
      authentication: "required",
      requiredScopes: [],
      payload: {},
      rateLimit: false,
      audit: true,
      available: () => process.env.NODE_ENV !== "production",
      handler: async ({ auth }) => {
        if (!auth) throw new Error("Authenticated context is unavailable.");

        return {
          data: {
            status: "authenticated",
            identity: {
              applicationId: auth.applicationId,
              clientId: auth.clientId,
              environment: auth.environment,
              keyId: auth.keyId,
              scopes: auth.scopes,
            },
            request: {
              id: auth.requestId,
              timestamp: auth.requestTimestamp,
            },
          },
        };
      },
    },
    dependencies,
  );
}

const authCheckHandler = createAuthCheckHandler();

export const Route = createFileRoute("/api/v1/_internal/auth-check")({
  server: {
    handlers: {
      POST: ({ request }) => authCheckHandler({ request }),
    },
  },
});
