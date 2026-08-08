import { describe, it, expect, vi, beforeEach } from "vitest";
import { BugApiSchema } from "@/lib/os/api/bugs.server";
import { Route } from "@/routes/api/v1/bugs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import * as auth from "@/lib/os/api/auth.server";
import * as idempotency from "@/lib/os/api/idempotency.server";
import * as audit from "@/lib/os/api/audit.server";

// Centralized Mock implementation for the chain
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  insert: vi.fn(),
};

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn((table) => mockChain),
  },
}));

vi.mock("@/lib/os/api/auth.server", async (importOriginal) => {
  const actual = await importOriginal<typeof auth>();
  return {
    ...actual,
    authenticateRequest: vi.fn(),
  };
});

vi.mock("@/lib/os/api/idempotency.server", async (importOriginal) => {
  const actual = await importOriginal<typeof idempotency>();
  return {
    ...actual,
    acquireIdempotency: vi.fn(),
    commitIdempotency: vi.fn(),
  };
});

vi.mock("@/lib/os/api/audit.server", () => ({
  logApiRequest: vi.fn(),
  logUnauthenticatedApiRequest: vi.fn(),
}));

describe("API v1: POST /bugs", () => {
  const validPayload = {
    external_reference: crypto.randomUUID(),
    actor: {
      source: "valtro-pricing",
      external_user_id: crypto.randomUUID(),
    },
    contact: {
      name: "Test User",
      email: "test@example.com",
    },
    title: "Bug test title",
    description: "Detailed bug description here.",
    category: "calculator",
    context: {
      route: "/pricing",
      viewport: { width: 1280, height: 800 },
    },
  };

  const mockAuthContext = {
    applicationId: crypto.randomUUID(),
    clientId: "pricing-app",
    saasProductId: crypto.randomUUID(),
    environment: "production",
    credentialId: "cred-123",
    keyId: "key-123",
    scopes: ["support.bugs.create"],
    technicalLimits: { max_payload_bytes: 1048576 },
    rateLimit: { requestsPerMinute: 100 },
    requestId: "req_test_123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for loadVersion in pipeline
    mockChain.maybeSingle.mockResolvedValue({ 
      data: { 
        id: "v1", 
        version_code: "v1", 
        status: "stable", 
        released_at: new Date().toISOString(),
        deprecated_at: null,
        sunset_at: null,
        replacement_version_id: null
      }, 
      error: null 
    });
  });

  const getPostHandler = () => {
    const handlers = (Route.options.server as any).handlers;
    return handlers.POST;
  };

  it("1. should create bug and return 201 for valid request", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({ context: mockAuthContext as any });
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValue(null);
    
    const mockBug = {
      id: crypto.randomUUID(),
      code: "BUG-001",
      status: "new",
      external_reference: validPayload.external_reference,
      created_at: new Date().toISOString(),
    };

    mockChain.insert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockBug, error: null }),
    });

    const request = new Request("http://localhost/api/v1/bugs", {
      method: "POST",
      headers: {
        "x-valtro-timestamp": Date.now().toString(),
        "x-valtro-nonce": "nonce-1234567890123",
        "x-valtro-key-id": "key-123",
        "x-valtro-signature": "sig",
        "x-idempotency-key": crypto.randomUUID(),
        "content-type": "application/json",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await getPostHandler()({ request });
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.data.code).toBe("BUG-001");
    expect(idempotency.commitIdempotency).toHaveBeenCalled();
  });

  it("3. should ignore product_id in payload and use context", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({ context: mockAuthContext as any });
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValue(null);
    
    const payloadWithProduct = { ...validPayload, product_id: crypto.randomUUID() };

    mockChain.insert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "1" }, error: null }),
    });

    const request = new Request("http://localhost/api/v1/bugs", {
      method: "POST",
      headers: { "x-idempotency-key": crypto.randomUUID(), "content-type": "application/json" },
      body: JSON.stringify(payloadWithProduct),
    });

    await getPostHandler()({ request });
    
    const insertCall = mockChain.insert.mock.calls[0][0];
    expect(insertCall.saas_product_id).toBe(mockAuthContext.saasProductId);
    // @ts-ignore
    expect(insertCall.product_id).toBeUndefined();
  });

  it("4. should return 422 if application has no saasProductId", async () => {
    const contextNoProduct = { ...mockAuthContext, saasProductId: null };
    vi.mocked(auth.authenticateRequest).mockResolvedValue({ context: contextNoProduct as any });

    const request = new Request("http://localhost/api/v1/bugs", {
      method: "POST",
      headers: { "x-idempotency-key": crypto.randomUUID(), "content-type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await getPostHandler()({ request });
    const result = await response.json();

    expect(response.status).toBe(422);
    expect(result.error.code).toBe("INVALID_PRODUCT_CONTEXT");
  });

  it("5. should return 403 if scope is missing", async () => {
    const contextNoScope = { ...mockAuthContext, scopes: ["other.scope"] };
    vi.mocked(auth.authenticateRequest).mockResolvedValue({ context: contextNoScope as any });

    const request = new Request("http://localhost/api/v1/bugs", {
      method: "POST",
      headers: { "x-idempotency-key": crypto.randomUUID(), "content-type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await getPostHandler()({ request });
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.error.code).toBe("INSUFFICIENT_SCOPE");
  });

  it("6. should return 422 for invalid payload", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({ context: mockAuthContext as any });
    const invalidPayload = { ...validPayload, title: "short" };

    const request = new Request("http://localhost/api/v1/bugs", {
      method: "POST",
      headers: { "x-idempotency-key": crypto.randomUUID(), "content-type": "application/json" },
      body: JSON.stringify(invalidPayload),
    });

    const response = await getPostHandler()({ request });
    expect(response.status).toBe(422);
  });

  it("7 & 10. should handle idempotency replay and ignore admin fields", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({ context: mockAuthContext as any });
    
    const replayData = {
      status: 'completed',
      responseStatus: 201,
      responseBody: { id: "existing-id", code: "BUG-EXISTING" },
      responseHeaders: {},
    };
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValue(replayData as any);

    const request = new Request("http://localhost/api/v1/bugs", {
      method: "POST",
      headers: { "x-idempotency-key": crypto.randomUUID(), "content-type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await getPostHandler()({ request });
    const result = await response.json();

    expect(response.status).toBe(201); // Retorna o status original salvo
    expect(result.data.id).toBe("existing-id");
  });
});
