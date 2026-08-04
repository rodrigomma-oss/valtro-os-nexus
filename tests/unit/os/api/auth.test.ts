import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateRequest } from "@/lib/os/api/auth.server";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(),
    })),
  },
}));

describe("authenticateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve rejeitar se headers estiverem ausentes", async () => {
    const request = new Request("http://localhost/api", { method: "POST" });
    const result = await authenticateRequest(request, "req_test_missing");

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      expect(result.error.code).toBe("MISSING_HEADERS");
      expect(result.requestId).toBe("req_test_missing");
    }
  });

  it("deve rejeitar timestamp fora da janela", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: {
        "x-valtro-timestamp": (Date.now() - 20 * 60 * 1000).toString(),
        "x-valtro-nonce": "1234567890123456",
        "x-valtro-key-id": "vlt_key_123",
        "x-valtro-signature": "sig",
      },
    });
    const result = await authenticateRequest(request, "req_test_timestamp");

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      expect(result.error.code).toBe("INVALID_TIMESTAMP");
      expect(result.requestId).toBe("req_test_timestamp");
    }
  });
});
