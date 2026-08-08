import { describe, it, expect, vi } from "vitest";
import { FeedbackApiSchema } from "@/lib/os/api/feedback.server";

describe("API v1: POST /feedback (Homologation)", () => {
  const validPayload = {
    external_reference: "11111111-1111-1111-1111-111111111111",
    actor: {
      source: "valtro-pricing",
      external_user_id: "22222222-2222-2222-2222-222222222222",
    },
    contact: {
      name: "Test User",
      email: "test@example.com",
    },
    title: "Feedback Title",
    description: "Detailed description of the feedback.",
    category: "feature",
    context: {
      plan: "enterprise",
      app_version: "1.0.0",
    },
  };

  it("should validate a correct feedback payload", () => {
    const result = FeedbackApiSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should reject feedback without external_reference", () => {
    const { external_reference, ...invalid } = validPayload;
    const result = FeedbackApiSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject feedback with invalid category", () => {
    const invalid = { ...validPayload, category: "invalid_cat" };
    const result = FeedbackApiSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject feedback with wrong actor source", () => {
    const invalid = { ...validPayload, actor: { ...validPayload.actor, source: "other" } };
    const result = FeedbackApiSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
