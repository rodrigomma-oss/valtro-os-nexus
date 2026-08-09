import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiAuthContext } from "@/lib/os/api/auth.server";
import type { ApiPipelineDependencies, ApiVersionContext } from "@/lib/os/api/pipeline.server";
import { createMetaHandler } from "@/routes/api/v1/meta";
import { createAuthCheckHandler } from "@/routes/api/v1/[_]internal/auth-check";

const requestId = "req_0011223344556677";
const now = new Date("2026-08-04T12:00:00.000Z");
const version: ApiVersionContext = {
  id: "version-id",
  versionCode: "v1",
  status: "deprecated",
  releasedAt: "2026-08-03T00:00:00.000Z",
  deprecatedAt: "2026-09-01T00:00:00.000Z",
  sunsetAt: "2026-12-01T00:00:00.000Z",
  replacementVersionId: "replacement-id",
};
const context: ApiAuthContext = {
  applicationId: "app-id",
  clientId: "vlt_app_0123456789abcdef01234567",
  environment: "development",
  credentialId: "credential-id",
  keyId: "vlt_key_0123456789abcdef01234567",
  scopes: ["tickets:read"],
  technicalLimits: {
    max_payload_bytes: 1024,
    max_attachment_bytes: 4096,
    max_attachments_per_entity: 2,
  },
  rateLimit: { requestsPerMinute: 100 },
  requestId,
  requestTimestamp: String(now.getTime()),
};

function deps(overrides: Partial<ApiPipelineDependencies> = {}) {
  return {
    createRequestId: vi.fn(() => requestId),
    now: vi.fn(() => now),
    loadVersion: vi.fn(async () => version),
    authenticate: vi.fn(async () => ({ context })),
    auditAuthenticated: vi.fn(async () => undefined),
    auditUnauthenticated: vi.fn(async () => undefined),
    ...overrides,
  } satisfies Partial<ApiPipelineDependencies>;
}

afterEach(() => vi.unstubAllEnvs());

describe("migrated API handlers", () => {
  it("serves /api/v1/meta through the shared pipeline", async () => {
    const dependencies = deps();
    const handler = createMetaHandler(dependencies);
    const response = await handler({
      request: new Request("https://api.example.com/api/v1/meta"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-valtro-api-version")).toBe("v1");
    expect(response.headers.get("x-valtro-request-id")).toBe(requestId);
    expect(response.headers.get("deprecation")).toBe(new Date(version.deprecatedAt!).toUTCString());
    expect(response.headers.get("sunset")).toBe(new Date(version.sunsetAt!).toUTCString());
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        version: "v1",
        status: "deprecated",
        deprecated: true,
        releasedAt: version.releasedAt,
        deprecationAt: version.deprecatedAt,
        sunsetAt: version.sunsetAt,
        replacementVersion: version.replacementVersionId,
        platform: "Valtro Labs Ecosystem",
        capabilities: [
          "support.tickets",
          "support.bugs",
          "support.feedback",
          "support.suggestions",
          "support.attachments",
        ],
      },
      requestId,
    });
    expect(dependencies.auditUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("serves the internal auth check through HMAC context outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const dependencies = deps();
    const handler = createAuthCheckHandler(dependencies);
    const response = await handler({
      request: new Request("https://api.example.com/api/v1/_internal/auth-check", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        status: "authenticated",
        identity: {
          applicationId: context.applicationId,
          clientId: context.clientId,
          keyId: context.keyId,
          scopes: context.scopes,
        },
        request: { id: requestId, timestamp: context.requestTimestamp },
      },
      requestId,
    });
    expect(dependencies.authenticate).toHaveBeenCalledTimes(1);
    expect(dependencies.auditAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("keeps the internal auth check hidden in production without touching auth or version", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const dependencies = deps();
    const handler = createAuthCheckHandler(dependencies);
    const response = await handler({
      request: new Request("https://api.example.com/api/v1/_internal/auth-check", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
      requestId,
    });
    expect(dependencies.loadVersion).not.toHaveBeenCalled();
    expect(dependencies.authenticate).not.toHaveBeenCalled();
    expect(dependencies.auditUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("keeps authentication failures in the standard envelope", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const handler = createAuthCheckHandler(
      deps({
        authenticate: vi.fn(async () => ({
          error: { code: "REPLAY_ATTACK", message: "Nonce already used.", status: 401 },
          requestId,
        })),
      }),
    );
    const response = await handler({
      request: new Request("https://api.example.com/api/v1/_internal/auth-check", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "REPLAY_ATTACK" },
      requestId,
    });
  });
});
