import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/lib/os/api/auth.server";
import { logApiRequest, logUnauthorizedAccess } from "@/lib/os/api/audit.server";
import {
  apiErrorResponse,
  apiSuccessResponse,
  createApiRequestId,
} from "@/lib/os/api/responses.server";

export const Route = createFileRoute("/api/v1/_internal/auth-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        const requestId = createApiRequestId();

        // 1. Bloqueio server-side para produção
        const env = process.env.NODE_ENV;
        if (env === "production") {
          return apiErrorResponse({
            code: "NOT_FOUND",
            message: "Resource not found.",
            status: 404,
            requestId,
          });
        }

        // 2. Autenticação HMAC
        const authResult = await authenticateRequest(request, requestId);

        if ("error" in authResult) {
          await logUnauthorizedAccess(
            request.method,
            "/api/v1/_internal/auth-check",
            authResult.error.status,
            authResult.error.code,
            requestId,
            request.headers.get("x-forwarded-for") || undefined,
          );

          return apiErrorResponse({
            code: authResult.error.code,
            message: authResult.error.message,
            status: authResult.error.status,
            requestId,
          });
        }

        const { context } = authResult;

        // 3. Validação de Escopo (Exemplo técnico)
        // Esta rota não exige escopos operacionais, apenas validação de identidade

        const durationMs = Date.now() - startTime;
        await logApiRequest({
          context,
          method: request.method,
          path: "/api/v1/_internal/auth-check",
          statusCode: 200,
          durationMs,
        });

        return apiSuccessResponse({
          data: {
            status: "authenticated",
            identity: {
              applicationId: context.applicationId,
              clientId: context.clientId,
              environment: context.environment,
              keyId: context.keyId,
              scopes: context.scopes,
            },
            request: {
              id: context.requestId,
              timestamp: context.requestTimestamp,
            },
          },
          requestId,
        });
      },
    },
  },
});
