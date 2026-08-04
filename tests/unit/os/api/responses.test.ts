import { describe, expect, it } from "vitest";
import {
  apiErrorResponse,
  apiSuccessResponse,
  createApiRequestId,
  getApiClientRequestId,
} from "@/lib/os/api/responses.server";

describe("API response primitives", () => {
  it("creates request IDs using the public contract format", () => {
    expect(createApiRequestId()).toMatch(/^req_[a-f0-9]{16}$/);
  });

  it("accepts only bounded client correlation IDs", () => {
    expect(
      getApiClientRequestId(
        new Request("https://api.example.com", {
          headers: { "x-valtro-request-id": "consumer_req-001" },
        }),
      ),
    ).toBe("consumer_req-001");
    expect(
      getApiClientRequestId(
        new Request("https://api.example.com", {
          headers: { "x-valtro-request-id": "invalid request id" },
        }),
      ),
    ).toBeUndefined();
  });

  it("creates a consistent error envelope and response headers", async () => {
    const response = apiErrorResponse({
      code: "INVALID_SIGNATURE",
      message: "Invalid signature.",
      status: 401,
      requestId: "req_a1b2c3d4e5f60708",
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("x-valtro-request-id")).toBe("req_a1b2c3d4e5f60708");
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code: "INVALID_SIGNATURE", message: "Invalid signature." },
      requestId: "req_a1b2c3d4e5f60708",
    });
  });

  it("creates a consistent success envelope", async () => {
    const response = apiSuccessResponse({
      data: { version: "v1" },
      requestId: "req_a1b2c3d4e5f60708",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { version: "v1" },
      requestId: "req_a1b2c3d4e5f60708",
    });
  });
});
