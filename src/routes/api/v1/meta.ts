import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  apiErrorResponse,
  apiSuccessResponse,
  createApiRequestId,
} from "@/lib/os/api/responses.server";

export const Route = createFileRoute("/api/v1/meta")({
  server: {
    handlers: {
      GET: async () => {
        const requestId = createApiRequestId();

        try {
          // Busca a versão estável atual (v1)
          const { data: version, error } = await supabaseAdmin
            .from("api_versions")
            .select(
              "version_code, status, released_at, deprecated_at, sunset_at, replacement_version_id",
            )
            .eq("version_code", "v1")
            .single();

          if (error || !version) {
            return apiErrorResponse({
              code: "VERSION_UNAVAILABLE",
              message: "API version information is unavailable.",
              status: 404,
              requestId,
              headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
              },
            });
          }

          // Se a versão estiver desabilitada, retorna 503
          if (version.status === "disabled") {
            return apiErrorResponse({
              code: "VERSION_UNAVAILABLE",
              message: "API version is unavailable.",
              status: 503,
              requestId,
            });
          }

          const responseData = {
            version: version.version_code,
            status: version.status,
            deprecated: version.status === "deprecated" || version.status === "sunset",
            releasedAt: version.released_at,
            deprecationAt: version.deprecated_at,
            sunsetAt: version.sunset_at,
            replacementVersion: version.replacement_version_id,
          };

          const headers = new Headers({
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
            "X-Valtro-API-Version": version.version_code,
            "X-Valtro-Request-ID": requestId,
          });

          // Headers de depreciação se aplicável
          if (version.deprecated_at) {
            headers.set("Deprecation", new Date(version.deprecated_at).toUTCString());
          }
          if (version.sunset_at) {
            headers.set("Sunset", new Date(version.sunset_at).toUTCString());
          }

          return apiSuccessResponse({
            data: responseData,
            requestId,
            headers,
          });
        } catch (err) {
          console.error("[API-META-ERROR]", err);
          return apiErrorResponse({
            code: "INTERNAL_ERROR",
            message: "An internal error occurred.",
            status: 500,
            requestId,
          });
        }
      },
    },
  },
});
