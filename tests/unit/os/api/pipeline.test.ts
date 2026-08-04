import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ApiAuthContext } from "@/lib/os/api/auth.server";
import {
  createApiHandler,
  type ApiPipelineDependencies,
  type ApiVersionContext,
} from "@/lib/os/api/pipeline.server";

const requestId = "req_a1b2c3d4e5f60708";
const now = new Date("2026-08-04T12:00:00.000Z");

const stableVersion: ApiVersionContext = {
  id: "version-id",
  versionCode: "v1",
  status: "stable",
  releasedAt: "2026-08-03T00:00:00.000Z",
  deprecatedAt: null,
  sunsetAt: null,
  replacementVersionId: null,
};

const authContext: ApiAuthContext = {
  applicationId: "app-id",
  clientId: "vlt_app_0123456789abcdef01234567",
  productId: "product-id",
  environment: "development",
  credentialId: "credential-id",
  keyId: "vlt_key_0123456789abcdef01234567",
  scopes: ["tickets:read", "tickets:write"],
  technicalLimits: {
    max_payload_bytes: 1024,
    max_attachment_bytes: 4096,
    max_attachments_per_entity: 2,
  },
  rateLimit: { requestsPerMinute: 100 },
  requestId,
  requestTimestamp: String(now.getTime()),
};

function dependencies(overrides: Partial<ApiPipelineDependencies> = {}): ApiPipelineDependencies {
  return {
    createRequestId: vi.fn(() => requestId),
    now: vi.fn(() => now),
    loadVersion: vi.fn(async () => stableVersion),
    authenticate: vi.fn(async () => ({ context: authContext })),
    auditAuthenticated: vi.fn(async () => undefined),
    auditUnauthenticated: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("public API pipeline", () => {
  it("uses one server request ID across context, response, envelope, and audit", async () => {
    const deps = dependencies();
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        handler: async ({ requestId: contextRequestId, auth }) => ({
          data: { contextRequestId, authRequestId: auth?.requestId },
        }),
      },
      deps,
    );

    const response = await handler({
      request: new Request("https://api.example.com/api/v1/test", { method: "POST" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-valtro-request-id")).toBe(requestId);
    expect(await json(response)).toMatchObject({
      success: true,
      data: { contextRequestId: requestId, authRequestId: requestId },
      requestId,
    });
    expect(deps.createRequestId).toHaveBeenCalledTimes(1);
    expect(deps.auditAuthenticated).toHaveBeenCalledTimes(1);
    expect(deps.auditAuthenticated).toHaveBeenCalledWith(
      expect.objectContaining({
        context: authContext,
        statusCode: 200,
        errorCode: undefined,
      }),
    );
  });

  it("checks version before authentication and rejects a missing version", async () => {
    const order: string[] = [];
    const deps = dependencies({
      loadVersion: vi.fn(async () => {
        order.push("version");
        return null;
      }),
      authenticate: vi.fn(async () => {
        order.push("auth");
        return { context: authContext };
      }),
    });
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        handler: async () => ({ data: {} }),
      },
      deps,
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(404);
    expect(await json(response)).toMatchObject({
      error: { code: "VERSION_UNAVAILABLE" },
      requestId,
    });
    expect(order).toEqual(["version"]);
    expect(deps.auditUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ ...stableVersion, status: "disabled" as const }, "disabled"],
    [
      { ...stableVersion, status: "sunset" as const, sunsetAt: "2026-08-04T11:59:59.000Z" },
      "elapsed sunset",
    ],
  ])("rejects an unavailable version (%s)", async (version) => {
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "none",
        handler: async () => ({ data: {} }),
      },
      dependencies({ loadVersion: vi.fn(async () => version) }),
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(503);
    expect(response.headers.get("x-valtro-api-version")).toBe("v1");
    expect(await json(response)).toMatchObject({ error: { code: "VERSION_UNAVAILABLE" } });
  });

  it("propagates controlled authentication failures without executing the handler", async () => {
    const businessHandler = vi.fn(async () => ({ data: {} }));
    const deps = dependencies({
      authenticate: vi.fn(async () => ({
        error: { code: "INVALID_SIGNATURE", message: "Invalid signature.", status: 401 },
        requestId,
      })),
    });
    const handler = createApiHandler(
      { version: "v1", authentication: "required", handler: businessHandler },
      deps,
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(401);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_SIGNATURE" } });
    expect(businessHandler).not.toHaveBeenCalled();
    expect(deps.auditUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("requires every configured scope", async () => {
    const deps = dependencies();
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        requiredScopes: ["tickets:read", "admin:write"],
        handler: async () => ({ data: {} }),
      },
      deps,
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ error: { code: "INSUFFICIENT_SCOPE" } });
    expect(deps.auditAuthenticated).toHaveBeenCalledTimes(1);
    expect(deps.auditAuthenticated).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "INSUFFICIENT_SCOPE", statusCode: 403 }),
    );
  });

  it("executes the handler when every configured scope is present", async () => {
    const businessHandler = vi.fn(async () => ({ data: { allowed: true } }));
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        requiredScopes: ["tickets:read", "tickets:write"],
        handler: businessHandler,
      },
      dependencies(),
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(200);
    expect(businessHandler).toHaveBeenCalledTimes(1);
  });

  it("validates body, query, and path before rate limiting and the handler", async () => {
    const order: string[] = [];
    const deps = dependencies({
      loadVersion: vi.fn(async () => {
        order.push("version");
        return stableVersion;
      }),
      authenticate: vi.fn(async () => {
        order.push("auth");
        return { context: authContext };
      }),
      auditAuthenticated: vi.fn(async () => {
        order.push("audit");
      }),
      checkRateLimit: vi.fn(async () => {
        order.push("rate-limit");
        return { allowed: true, limit: 100, remaining: 99, resetAt: now };
      }),
    });
    const businessHandler = vi.fn(async ({ body, query, params }) => {
      order.push("handler");
      return { data: { body, query, params } };
    });
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        bodySchema: z.preprocess(
          (input) => {
            order.push("body-validation");
            return input;
          },
          z.object({ name: z.string().trim().min(1) }),
        ),
        querySchema: z.preprocess(
          (input) => {
            order.push("query-validation");
            return input;
          },
          z.object({ page: z.coerce.number().int().positive() }),
        ),
        paramsSchema: z.preprocess(
          (input) => {
            order.push("path-validation");
            return input;
          },
          z.object({ id: z.string().uuid() }),
        ),
        rateLimit: { enabled: true },
        handler: businessHandler,
      },
      deps,
    );

    const response = await handler({
      request: new Request("https://api.example.com/api/v1/test?page=2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "  Valtro  " }),
      }),
      params: { id: "72efb38f-2f75-4ec0-8cb1-35f6fcdabde0" },
    });

    expect(response.status).toBe(200);
    expect(order).toEqual([
      "version",
      "auth",
      "body-validation",
      "query-validation",
      "path-validation",
      "rate-limit",
      "handler",
      "audit",
    ]);
    expect(response.headers.get("ratelimit-remaining")).toBe("99");
    expect(await json(response)).toMatchObject({
      data: {
        body: { name: "Valtro" },
        query: { page: 2 },
        params: { id: "72efb38f-2f75-4ec0-8cb1-35f6fcdabde0" },
      },
    });
  });

  it.each([
    ["malformed JSON", '{"secret":"must-not-leak"', "must-not-leak"],
    ["schema mismatch", JSON.stringify({ name: "", secret: "must-not-leak" }), "must-not-leak"],
  ])("returns a sanitized validation error for %s", async (_case, body, sensitiveValue) => {
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "none",
        bodySchema: z.object({ name: z.string().min(1) }),
        handler: async () => ({ data: {} }),
      },
      dependencies(),
    );

    const response = await handler({
      request: new Request("https://api.example.com/api/v1/test", {
        method: "POST",
        body,
      }),
    });

    expect(response.status).toBe(422);
    const bodyJson = await json(response);
    expect(bodyJson).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(JSON.stringify(bodyJson)).not.toContain(sensitiveValue);
  });

  it("rejects actual body bytes when Content-Length is absent", async () => {
    const limitedContext = {
      ...authContext,
      technicalLimits: { ...authContext.technicalLimits, max_payload_bytes: 4 },
    };
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        handler: async () => ({ data: {} }),
      },
      dependencies({ authenticate: vi.fn(async () => ({ context: limitedContext })) }),
    );

    const response = await handler({
      request: new Request("https://api.example.com/api/v1/test", {
        method: "POST",
        body: "12345",
      }),
    });

    expect(response.status).toBe(413);
    expect(await json(response)).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
  });

  it("fails closed when a route enables rate limiting without persistent enforcement", async () => {
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        rateLimit: { enabled: true },
        handler: async () => ({ data: {} }),
      },
      dependencies(),
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(503);
    expect(await json(response)).toMatchObject({ error: { code: "RATE_LIMIT_UNAVAILABLE" } });
  });

  it("returns 429 and standard rate headers when the distributed limiter denies", async () => {
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        rateLimit: { enabled: true },
        handler: async () => ({ data: {} }),
      },
      dependencies({
        checkRateLimit: vi.fn(async () => ({
          allowed: false,
          limit: 100,
          remaining: 0,
          resetAt: now,
          retryAfterSeconds: 30,
        })),
      }),
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("ratelimit-limit")).toBe("100");
    expect(await json(response)).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("hides unexpected errors and audits the failure exactly once", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = dependencies();
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "required",
        handler: async () => {
          throw new Error("internal diagnostic must never reach the client");
        },
      },
      deps,
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });
    const responseBody = await json(response);

    expect(response.status).toBe(500);
    expect(responseBody).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(responseBody)).not.toContain("internal diagnostic");
    expect(consoleError).toHaveBeenCalledWith(
      "[API_PIPELINE_INTERNAL_ERROR]",
      expect.objectContaining({ requestId }),
    );
    expect(deps.auditAuthenticated).toHaveBeenCalledTimes(1);
    expect(deps.auditAuthenticated).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, errorCode: "INTERNAL_ERROR" }),
    );
    consoleError.mockRestore();
  });

  it("does not change the API response when audit persistence fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = createApiHandler(
      {
        version: "v1",
        authentication: "none",
        handler: async () => ({ data: { ok: true } }),
      },
      dependencies({
        auditUnauthenticated: vi.fn(async () => {
          throw new Error("audit unavailable");
        }),
      }),
    );

    const response = await handler({ request: new Request("https://api.example.com/api/v1/test") });

    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ data: { ok: true } });
    expect(consoleError).toHaveBeenCalledWith(
      "[API_PIPELINE_AUDIT_ERROR]",
      expect.objectContaining({ requestId }),
    );
    consoleError.mockRestore();
  });
});
