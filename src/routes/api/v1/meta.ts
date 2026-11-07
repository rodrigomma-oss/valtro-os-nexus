import { createFileRoute } from "@tanstack/react-router";
import { createApiHandler, type ApiPipelineDependencies } from "@/lib/os/api/pipeline.server";

export function createMetaHandler(dependencies: Partial<ApiPipelineDependencies> = {}) {
  return createApiHandler(
    {
      version: "v1",
      authentication: "none",
      requiredScopes: [],
      payload: {},
      rateLimit: false,
      audit: true,
      handler: async ({ version }) => ({
        data: {
          platform: "Valtro Labs Ecosystem",
          version: version.versionCode,
          status: version.status,
          deprecated: version.status === "deprecated" || version.status === "sunset",
          releasedAt: version.releasedAt,
          deprecationAt: version.deprecatedAt,
          sunsetAt: version.sunsetAt,
          replacementVersion: version.replacementVersionId,
          capabilities: [
            "support.tickets",
            "support.bugs",
            "support.feedback",
            "support.suggestions",
            "support.attachments"
          ],
        },
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }),
    },
    dependencies,
  );
}

const metaHandler = createMetaHandler();

export const Route = createFileRoute("/api/v1/meta")({
  server: {
    handlers: {
      GET: ({ request }) => metaHandler({ request }),
    },
  },
});
