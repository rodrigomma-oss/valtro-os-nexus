import * as crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateRequest } from "@/lib/os/api/auth.server";
import { createCanonicalRequest } from "@/lib/os/api/canonical.server";
import { encryptSecret } from "@/lib/os/api/crypto.server";

const db = vi.hoisted(() => ({
  credentialResult: vi.fn(),
  nonceResult: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: db.from },
}));

const masterKey = "11".repeat(32);
const secret = "consumer-hmac-secret";
const app = {
  id: "app-id",
  client_id: "vlt_app_0123456789abcdef01234567",
  product_id: "product-id",
  environment: "development",
  status: "active",
  allowed_scopes: ["tickets:read"],
  technical_limits: {
    max_payload_bytes: 2048,
    max_attachment_bytes: 4096,
    max_attachments_per_entity: 2,
  },
  rate_limit_config: { requests_per_minute: 75 },
};

async function activeCredential(overrides: Record<string, unknown> = {}) {
  const encrypted = await encryptSecret(secret, `${app.id}:vlt_key_0123456789abcdef01234567`);
  return {
    id: "credential-id",
    key_id: "vlt_key_0123456789abcdef01234567",
    encrypted_secret: encrypted.ciphertext,
    encryption_iv: encrypted.iv,
    authentication_tag: encrypted.authTag,
    encryption_version: encrypted.version,
    master_key_version: encrypted.masterKeyVersion,
    expires_at: null,
    api_applications: app,
    ...overrides,
  };
}

function databaseCredentialQuery() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ single: db.credentialResult })),
      })),
    })),
  };
}

async function signedRequest(
  options: {
    body?: string;
    signature?: string;
    nonce?: string;
    timestamp?: string;
  } = {},
) {
  const body = options.body ?? JSON.stringify({ title: "Test" });
  const timestamp = options.timestamp ?? String(Date.now());
  const nonce = options.nonce ?? "nonce_1234567890abcdef";
  const canonical = createCanonicalRequest({
    method: "POST",
    path: "/api/v1/test",
    contentType: "application/json",
    timestamp,
    nonce,
    body,
  });
  const signature =
    options.signature ?? crypto.createHmac("sha256", secret).update(canonical).digest("hex");

  return new Request("https://api.example.com/api/v1/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-valtro-timestamp": timestamp,
      "x-valtro-nonce": nonce,
      "x-valtro-key-id": "vlt_key_0123456789abcdef01234567",
      "x-valtro-signature": signature,
      "x-valtro-request-id": "consumer-request-1",
    },
    body,
  });
}

describe("authenticateRequest", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.API_MASTER_ENCRYPTION_KEY = masterKey;
    process.env.API_MASTER_KEY_VERSION = "test-v1";
    db.credentialResult.mockResolvedValue({ data: await activeCredential(), error: null });
    db.nonceResult.mockResolvedValue({ error: null });
    db.from.mockImplementation((table: string) => {
      if (table === "api_credentials") return databaseCredentialQuery();
      if (table === "api_request_nonces") return { insert: db.nonceResult };
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("rejects missing authentication headers", async () => {
    const result = await authenticateRequest(
      new Request("https://api.example.com/api/v1/test", { method: "POST" }),
      "req_test_missing",
    );

    expect(result).toMatchObject({
      error: { code: "MISSING_HEADERS", status: 401 },
      requestId: "req_test_missing",
    });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects a timestamp outside the replay window", async () => {
    const request = await signedRequest({ timestamp: String(Date.now() - 20 * 60 * 1000) });
    const result = await authenticateRequest(request, "req_test_timestamp");

    expect(result).toMatchObject({
      error: { code: "INVALID_TIMESTAMP", status: 401 },
      requestId: "req_test_timestamp",
    });
  });

  it("authenticates a valid signature, consumes the nonce, and returns sanitized config", async () => {
    const request = await signedRequest();
    const rawBody = new Uint8Array(await request.clone().arrayBuffer());
    const result = await authenticateRequest(request, "req_valid_signature", rawBody);

    expect(result).toEqual({
      context: {
        applicationId: app.id,
        clientId: app.client_id,
        productId: app.product_id,
        environment: app.environment,
        credentialId: "credential-id",
        keyId: "vlt_key_0123456789abcdef01234567",
        scopes: ["tickets:read"],
        technicalLimits: app.technical_limits,
        rateLimit: { requestsPerMinute: 75 },
        requestId: "req_valid_signature",
        clientRequestId: "consumer-request-1",
        requestTimestamp: request.headers.get("x-valtro-timestamp"),
        ip: undefined,
        userAgent: undefined,
      },
    });
    expect(db.nonceResult).toHaveBeenCalledWith(
      expect.objectContaining({
        credential_id: "credential-id",
        nonce: "nonce_1234567890abcdef",
      }),
    );
    expect(JSON.stringify(result)).not.toContain("consumer-hmac-secret");
    expect(JSON.stringify(result)).not.toContain("encrypted_secret");
  });

  it("rejects an invalid signature without consuming the nonce", async () => {
    const request = await signedRequest({ signature: "00".repeat(32) });
    const result = await authenticateRequest(request, "req_invalid_signature");

    expect(result).toMatchObject({ error: { code: "INVALID_SIGNATURE", status: 401 } });
    expect(db.nonceResult).not.toHaveBeenCalled();
  });

  it("rejects replay when atomic nonce insertion reports a unique violation", async () => {
    db.nonceResult.mockResolvedValue({ error: { code: "23505" } });
    const result = await authenticateRequest(await signedRequest(), "req_replay");

    expect(result).toMatchObject({ error: { code: "REPLAY_ATTACK", status: 401 } });
  });

  it("rejects an unknown, inactive, revoked, or expired credential lookup", async () => {
    db.credentialResult.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    const result = await authenticateRequest(await signedRequest(), "req_invalid_credential");

    expect(result).toMatchObject({ error: { code: "INVALID_CREDENTIAL", status: 401 } });
  });

  it("rejects a credential whose expiry has elapsed", async () => {
    db.credentialResult.mockResolvedValue({
      data: await activeCredential({ expires_at: "2020-01-01T00:00:00.000Z" }),
      error: null,
    });
    const result = await authenticateRequest(await signedRequest(), "req_expired_credential");

    expect(result).toMatchObject({ error: { code: "INVALID_CREDENTIAL", status: 401 } });
  });

  it("rejects a suspended application", async () => {
    db.credentialResult.mockResolvedValue({
      data: await activeCredential({ api_applications: { ...app, status: "suspended" } }),
      error: null,
    });
    const result = await authenticateRequest(await signedRequest(), "req_suspended_app");

    expect(result).toMatchObject({ error: { code: "APPLICATION_SUSPENDED", status: 403 } });
  });
});
