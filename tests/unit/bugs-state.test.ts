import { describe, expect, it } from "vitest";
import {
  BUG_TRANSITIONS,
  BUG_TERMINAL_STATUSES,
  canTransitionBug,
  requiresFixedVersion,
} from "@/lib/os/bugs-state";
import type { BugStatus } from "@/types/bug";

describe("bugs — máquina de estados (VOS-001D.1)", () => {
  const valid: Array<[BugStatus, BugStatus]> = [
    ["new", "triage"],
    ["triage", "confirmed"],
    ["confirmed", "in_progress"],
    ["in_progress", "in_testing"],
    ["in_testing", "fixed"],
    ["fixed", "closed"],
    ["in_testing", "in_progress"],
    ["fixed", "in_progress"],
    ["closed", "in_progress"],
    ["new", "rejected"],
    ["triage", "rejected"],
    ["confirmed", "rejected"],
  ];

  it.each(valid)("permite %s -> %s", (from, to) => {
    expect(canTransitionBug(from, to)).toBe(true);
  });

  const invalid: Array<[BugStatus, BugStatus]> = [
    ["new", "fixed"],
    ["new", "closed"],
    ["in_testing", "closed"],
    ["in_progress", "fixed"],
    ["closed", "fixed"],
    ["rejected", "in_progress"],
    ["rejected", "triage"],
    ["fixed", "triage"],
    ["new", "new"],
  ];

  it.each(invalid)("bloqueia %s -> %s", (from, to) => {
    expect(canTransitionBug(from, to)).toBe(false);
  });

  it("rejected é terminal", () => {
    expect(BUG_TERMINAL_STATUSES).toEqual(["rejected"]);
    expect(BUG_TRANSITIONS.rejected).toEqual([]);
  });

  it("closed só reabre para in_progress", () => {
    expect(BUG_TRANSITIONS.closed).toEqual(["in_progress"]);
  });

  it("fixed exige versão de correção", () => {
    expect(requiresFixedVersion("fixed")).toBe(true);
    expect(requiresFixedVersion("closed")).toBe(false);
  });
});
