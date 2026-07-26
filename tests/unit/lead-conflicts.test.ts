/**
 * Resolução de divergências cadastrais — aplicar, descartar e permissões.
 */
import { describe, expect, it } from "vitest";
import { resolveConflictCore } from "@/lib/lead-conflicts.core";

interface FakeState {
  roles: string[];
  conflict: Record<string, unknown> | null;
  leadUpdates: Record<string, unknown>[];
  conflictUpdates: Record<string, unknown>[];
  events: Record<string, unknown>[];
}

function makeSupabase(state: FakeState) {
  return {
    from(table: string) {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: async () => ({
              data: state.roles.map((role) => ({ role })),
              error: null,
            }),
          }),
        };
      }
      if (table === "lead_field_conflicts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.conflict, error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              state.conflictUpdates.push(patch);
              return { error: null };
            },
          }),
        };
      }
      if (table === "leads") {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              state.leadUpdates.push(patch);
              return { error: null };
            },
          }),
        };
      }
      if (table === "lead_events") {
        return {
          insert: async (row: Record<string, unknown>) => {
            state.events.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`tabela inesperada: ${table}`);
    },
  };
}

function baseState(roles: string[]): FakeState {
  return {
    roles,
    conflict: {
      id: "c1",
      lead_id: "l1",
      briefing_token_id: "t1",
      field: "phone",
      current_value: "83999999999",
      briefing_value: "83988887777",
      status: "pendente",
      created_at: new Date().toISOString(),
    },
    leadUpdates: [],
    conflictUpdates: [],
    events: [],
  };
}

describe("resolveConflictCore", () => {
  it("aplica o valor do briefing e marca como aceito (operator)", async () => {
    const state = baseState(["operator"]);
    const res = await resolveConflictCore(makeSupabase(state), "u1", {
      id: "c1",
      action: "aceitar",
    });

    expect(res).toEqual({ ok: true, status: "aceito" });
    expect(state.leadUpdates).toEqual([{ phone: "83988887777" }]);
    expect(state.conflictUpdates[0]).toMatchObject({
      status: "aceito",
      resolved_by: "u1",
    });
    expect(state.events[0]).toMatchObject({
      type: "cadastro_atualizado_por_briefing",
      metadata: { campos_atualizados: ["phone"], briefing_token_id: "t1" },
    });
  });

  it("descarta sem alterar o Lead e sem evento de atualização", async () => {
    const state = baseState(["admin"]);
    const res = await resolveConflictCore(makeSupabase(state), "u1", {
      id: "c1",
      action: "descartar",
    });

    expect(res).toEqual({ ok: true, status: "descartado" });
    expect(state.leadUpdates).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.conflictUpdates[0]).toMatchObject({ status: "descartado" });
  });

  it("viewer não pode resolver", async () => {
    const state = baseState(["viewer"]);
    await expect(
      resolveConflictCore(makeSupabase(state), "u2", {
        id: "c1",
        action: "aceitar",
      }),
    ).rejects.toThrow(/permissão/i);
    expect(state.leadUpdates).toEqual([]);
    expect(state.conflictUpdates).toEqual([]);
  });

  it("recusa conflito já resolvido", async () => {
    const state = baseState(["admin"]);
    (state.conflict as Record<string, unknown>).status = "aceito";
    await expect(
      resolveConflictCore(makeSupabase(state), "u1", {
        id: "c1",
        action: "aceitar",
      }),
    ).rejects.toThrow(/já foi resolvida/i);
  });

  it("recusa campo fora da whitelist", async () => {
    const state = baseState(["admin"]);
    (state.conflict as Record<string, unknown>).field = "status";
    await expect(
      resolveConflictCore(makeSupabase(state), "u1", {
        id: "c1",
        action: "aceitar",
      }),
    ).rejects.toThrow(/não permitido/i);
  });
});
