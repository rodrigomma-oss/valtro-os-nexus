import { describe, it, expect } from "vitest";
import { API_CAPABILITIES, API_VERSION_STATUS, TechnicalLimitsSchema } from "@/lib/os/api/types";

describe("API Capabilities", () => {
  it("should have the required core capabilities", () => {
    expect(API_CAPABILITIES).toContain("support.tickets");
    expect(API_CAPABILITIES).toContain("support.bugs");
    expect(API_CAPABILITIES).toContain("support.feedback");
    expect(API_CAPABILITIES).toContain("support.attachments");
  });

  it("should be an immutable array of strings", () => {
    expect(Array.isArray(API_CAPABILITIES)).toBe(true);
    expect(typeof API_CAPABILITIES[0]).toBe("string");
  });
});

describe("API Version Status", () => {
  it("should include all required lifecycle stages", () => {
    expect(API_VERSION_STATUS).toContain("development");
    expect(API_VERSION_STATUS).toContain("stable");
    expect(API_VERSION_STATUS).toContain("deprecated");
    expect(API_VERSION_STATUS).toContain("sunset");
    expect(API_VERSION_STATUS).toContain("disabled");
  });
});

describe("Technical Limits Schema", () => {
  it("should validate and set default values correctly", () => {
    const validData = {
      max_payload_bytes: 2048,
      max_attachment_bytes: 5242880,
      max_attachments_per_entity: 10,
    };

    const result = TechnicalLimitsSchema.parse(validData);
    expect(result.max_payload_bytes).toBe(2048);
    expect(result.max_attachments_per_entity).toBe(10);
  });

  it("should apply defaults for missing fields", () => {
    const result = TechnicalLimitsSchema.parse({});
    expect(result.max_payload_bytes).toBe(1048576);
    expect(result.max_attachment_bytes).toBe(10485760);
    expect(result.max_attachments_per_entity).toBe(5);
  });

  it("should fail on invalid types", () => {
    expect(() => TechnicalLimitsSchema.parse({ max_payload_bytes: -100 })).toThrow();
    expect(() => TechnicalLimitsSchema.parse({ max_payload_bytes: "large" })).toThrow();
  });
});
