import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquireIdempotency, commitIdempotency, calculatePayloadHash } from "@/lib/os/api/idempotency.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Mock Supabase Admin
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  },
}));

describe("Idempotency Infrastructure", () => {
  const appId = crypto.randomUUID();
  const validKey = crypto.randomUUID();
  const method = "POST";
  const path = "/api/v1/test";
  const payload = { foo: "bar" };
  const payloadHash = calculatePayloadHash(payload);
  const requestId = "req_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow first use of an idempotency key", async () => {
    // Mock insert success
    (supabaseAdmin.from as any)().insert.mockResolvedValueOnce({ data: { id: "1" }, error: null });
    (supabaseAdmin.from as any)().select.mockReturnThis();
    (supabaseAdmin.from as any)().maybeSingle.mockResolvedValueOnce({ data: { id: "1" }, error: null });

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

  it("should return replay data for a valid existing key", async () => {
    // Mock insert conflict (code 23505)
    (supabaseAdmin.from as any)().insert.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any)().maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    
    // Mock select existing record
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
    (supabaseAdmin.from as any)().select.mockReturnThis();
    (supabaseAdmin.from as any)().eq.mockReturnThis();
    (supabaseAdmin.from as any)().single.mockResolvedValueOnce({ data: existingRecord, error: null });

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
    expect(result?.responseBody).toEqual({ success: true });
  });

  it("should reject same key with different payload (409 Conflict)", async () => {
    (supabaseAdmin.from as any)().insert.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any)().maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } });

    const existingRecord = {
      id: "1",
      method,
      path,
      payload_hash: "different_hash",
      status: 'completed'
    };
    (supabaseAdmin.from as any)().single.mockResolvedValueOnce({ data: existingRecord, error: null });

    await expect(acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    })).rejects.toThrow(/Chave de idempotência já utilizada/);
  });

  it("should throw 409 if operation is still processing", async () => {
    (supabaseAdmin.from as any)().insert.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    (supabaseAdmin.from as any)().maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } });

    const existingRecord = {
      id: "1",
      method,
      path,
      payload_hash: payloadHash,
      status: 'processing'
    };
    (supabaseAdmin.from as any)().single.mockResolvedValueOnce({ data: existingRecord, error: null });

    await expect(acquireIdempotency({
      applicationId: appId,
      idempotencyKey: validKey,
      method,
      path,
      payloadHash,
      requestId,
    })).rejects.toThrow(/operação já está sendo processada/);
  });

  it("should reject invalid idempotency key format", async () => {
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
