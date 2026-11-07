import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquireIdempotency, commitIdempotency, calculatePayloadHash } from "@/lib/os/api/idempotency.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Mock Supabase Admin
vi.mock("@/integrations/supabase/client.server", () => {
  const mockFrom = vi.fn();
  return {
    supabaseAdmin: {
      from: mockFrom
    }
  };
});

describe("Idempotency Infrastructure", () => {
  const appId = crypto.randomUUID();
  const validKey = crypto.randomUUID();
  const method = "POST";
  const path = "/api/v1/test";
  const payload = { foo: "bar" };
  const payloadHash = calculatePayloadHash(payload);
  const requestId = "req_123";

  function createMockChain(result: any) {
    const chain: any = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result)
    };
    chain.single.mockResolvedValue(result);
    return chain;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. should allow first use of an idempotency key", async () => {
    const mockChain = createMockChain({ data: { id: "1" }, error: null });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);

    const result = await acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    });

    expect(result).toBeNull();
    expect(supabaseAdmin.from).toHaveBeenCalledWith("api_idempotency_keys");
  });

  it("2. should return replay data for a valid existing key (replay)", async () => {
    const mockChain = createMockChain({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);
    
    const existingRecord = {
      id: "1",
      application_id: appId,
      idempotency_key: validKey,
      method,
      path,
      payload_hash: payloadHash,
      status: 'completed',
      response_status: 201,
      response_body: { success: true },
      response_headers: { "Content-Type": "application/json" }
    };
    
    mockChain.single.mockResolvedValueOnce({ data: existingRecord, error: null });

    const result = await acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe('completed');
    expect(result?.responseStatus).toBe(201);
  });

  it("3. should reject same key with different payload (409 Conflict)", async () => {
    const mockChain = createMockChain({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);

    const existingRecord = {
      id: "1",
      method,
      path,
      payload_hash: "different_hash",
      status: 'completed'
    };
    mockChain.single.mockResolvedValueOnce({ data: existingRecord, error: null });

    await expect(acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    })).rejects.toThrow(/Chave de idempotência já utilizada/);
  });

  it("4. should reject same key with different path (409 Conflict)", async () => {
    const mockChain = createMockChain({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);

    const existingRecord = {
      id: "1",
      method,
      path: "/api/v1/other-path",
      payload_hash: payloadHash,
      status: 'completed'
    };
    mockChain.single.mockResolvedValueOnce({ data: existingRecord, error: null });

    await expect(acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    })).rejects.toThrow(/Chave de idempotência já utilizada/);
  });

  it("5. should allow same key in different applications", async () => {
    const mockChain = createMockChain({ data: { id: "2" }, error: null });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);

    const result = await acquireIdempotency({
      applicationId: crypto.randomUUID(), // Different App
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    });

    expect(result).toBeNull();
  });

  it("6. should reject concurrent requests (two processing at once)", async () => {
    const mockChain = createMockChain({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);

    const existingRecord = {
      id: "1",
      method,
      path,
      payload_hash: payloadHash,
      status: 'processing'
    };
    mockChain.single.mockResolvedValueOnce({ data: existingRecord, error: null });

    await expect(acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    })).rejects.toThrow(/operação já está sendo processada/);
  });

  it("7. should return replay for new nonce + same idempotency key", async () => {
    const mockChain = createMockChain({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any).mockReturnValue(mockChain);
    
    const existingRecord = {
      id: "1",
      application_id: appId,
      idempotency_key: validKey,
      method,
      path,
      payload_hash: payloadHash,
      status: 'completed',
      response_status: 200,
      response_body: { ok: true }
    };
    
    mockChain.single.mockResolvedValueOnce({ data: existingRecord, error: null });

    const result = await acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId: "new_request_id_different_nonce",
    });

    expect(result).not.toBeNull();
    expect(result?.responseBody).toEqual({ ok: true });
  });

  it("8. should reject invalid idempotency key format", async () => {
    await expect(acquireIdempotency({
      applicationId: appId,
      idempotencyKey: "invalid-uuid",
      method,
      path,
      payloadHash,
      requestId,
    })).rejects.toThrow(/Chave de idempotência inválida/);
  });
});
