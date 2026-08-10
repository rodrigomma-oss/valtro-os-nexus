/**
 * Gestão dos Participantes do Beta — Server Functions (VOS-001F).
 * Todas autenticadas via requireSupabaseAuth, com Zod, context.userId,
 * logs estruturados e Request ID. Nenhuma operação de DELETE.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  BetaParticipant,
  BetaParticipantEvent,
} from "@/types/beta-participant";

const STATUS = ["invited", "accepted", "active", "inactive", "removed", "converted"] as const;
const INTEREST = ["no", "maybe", "yes", "already_customer", "unknown"] as const;

const PARTICIPANT_SELECT =
  "id, code, beta_program_id, saas_product_id, user_id, email, name, status, interest_to_subscribe, invited_by, notes, invited_at, accepted_at, activated_at, ended_at, converted_at, created_by, created_at, updated_at";

type RawParticipant = Omit<
  BetaParticipant,
  "program_name" | "program_code" | "product_name" | "invited_by_name" | "linked_user_name"
>;

function requestId(): string | null {
  try {
    return getRequestHeader("x-request-id") ?? null;
  } catch {
    return null;
  }
}

function log(action: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({ scope: "os.beta_participants", action, request_id: requestId(), ...payload }),
  );
}

async function hydrate(supabase: any, rows: RawParticipant[]): Promise<BetaParticipant[]> {
  if (rows.length === 0) return [];

  const programIds = Array.from(new Set(rows.map((r) => r.beta_program_id).filter(Boolean)));
  const productIds = Array.from(new Set(rows.map((r) => r.saas_product_id).filter(Boolean)));
  const profileIds = Array.from(
    new Set(
      [...rows.map((r) => r.invited_by), ...rows.map((r) => r.user_id)].filter(Boolean) as string[],
    ),
  );

  const [programs, products, profiles] = await Promise.all([
    programIds.length
      ? supabase.from("beta_programs").select("id, code, name").in("id", programIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from("saas_products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const progMap = new Map<string, { code: string; name: string }>(
    (programs.data ?? []).map((p: any) => [p.id, { code: p.code, name: p.name }]),
  );
  const prodMap = new Map<string, string>((products.data ?? []).map((p: any) => [p.id, p.name]));
  const userMap = new Map<string, string>((profiles.data ?? []).map((p: any) => [p.id, p.full_name]));

  return rows.map((r) => ({
    ...r,
    program_name: progMap.get(r.beta_program_id)?.name ?? null,
    program_code: progMap.get(r.beta_program_id)?.code ?? null,
    product_name: prodMap.get(r.saas_product_id) ?? null,
    invited_by_name: r.invited_by ? userMap.get(r.invited_by) ?? null : null,
    linked_user_name: r.user_id ? userMap.get(r.user_id) ?? null : null,
  }));
}

async function hydrateEvents(supabase: any, rows: any[]): Promise<BetaParticipantEvent[]> {
  const authorIds = Array.from(new Set(rows.map((e) => e.created_by).filter(Boolean) as string[]));
  let names: Record<string, string | null> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
  }
  return rows.map((e) => ({
    ...e,
    created_by_name: e.created_by ? names[e.created_by] ?? null : null,
  }));
}

// ---------------------------------------------------------------
// listParticipants
// ---------------------------------------------------------------
export const listParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        code: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        status: z.enum(STATUS).optional(),
        interest_to_subscribe: z.enum(INTEREST).optional(),
        beta_program_id: z.string().uuid().optional(),
        saas_product_id: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ items: BetaParticipant[]; total: number }> => {
    let query = context.supabase
      .from("beta_participants")
      .select(PARTICIPANT_SELECT, { count: "exact" })
      .order("updated_at", { ascending: false });

    if (data.code) query = query.ilike("code", `%${data.code}%`);
    if (data.name) query = query.ilike("name", `%${data.name}%`);
    if (data.email) query = query.ilike("email", `%${data.email}%`);
    if (data.status) query = query.eq("status", data.status);
    if (data.interest_to_subscribe)
      query = query.eq("interest_to_subscribe", data.interest_to_subscribe);
    if (data.beta_program_id) query = query.eq("beta_program_id", data.beta_program_id);
    if (data.saas_product_id) query = query.eq("saas_product_id", data.saas_product_id);

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: rows, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const items = await hydrate(context.supabase, (rows ?? []) as unknown as RawParticipant[]);
    log("listParticipants", { count: items.length, total: count, user_id: context.userId });

    return { items, total: count ?? 0 };
  });

// ---------------------------------------------------------------
// getParticipant
// ---------------------------------------------------------------
export const getParticipant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ participant: BetaParticipant; events: BetaParticipantEvent[] }> => {
      const { data: row, error } = await context.supabase
        .from("beta_participants")
        .select(PARTICIPANT_SELECT)
        .eq("id", data.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!row) throw new Error("Participante não encontrado.");

      const { data: evs, error: evErr } = await context.supabase
        .from("beta_participant_events")
        .select("id, beta_participant_id, type, description, metadata, created_by, created_at")
        .eq("beta_participant_id", data.id)
        .order("created_at", { ascending: false });

      if (evErr) throw new Error(evErr.message);

      const [participant] = await hydrate(context.supabase, [row as unknown as RawParticipant]);
      const events = await hydrateEvents(context.supabase, (evs ?? []) as any[]);

      log("getParticipant", { participant_id: data.id, user_id: context.userId });
      return { participant: participant!, events };
    },
  );

// ---------------------------------------------------------------
// createParticipant — código e created_by nunca vêm do frontend
// ---------------------------------------------------------------
export const createParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().trim().min(2, "Informe o nome do participante.").max(160),
        email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
        beta_program_id: z.string().uuid("Selecione o programa beta."),
        saas_product_id: z.string().uuid("Selecione o produto."),
        interest_to_subscribe: z.enum(INTEREST).default("unknown"),
        notes: z.string().trim().max(4000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("beta_participants")
      .insert({
        name: data.name,
        email: data.email,
        beta_program_id: data.beta_program_id,
        saas_product_id: data.saas_product_id,
        interest_to_subscribe: data.interest_to_subscribe,
        notes: data.notes ?? null,
        status: "invited",
        invited_by: context.userId,
        created_by: context.userId,
      } as any)
      .select("id, code")
      .single();

    if (error) {
      log("createParticipant_error", { user_id: context.userId, error: error.message });
      throw new Error(error.message);
    }

    const created = row as { id: string; code: string };
    log("createParticipant", { participant_id: created.id, code: created.code, user_id: context.userId });
    return created;
  });

// ---------------------------------------------------------------
// updateParticipant — status nunca é alterado por aqui
// ---------------------------------------------------------------
export const updateParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(160).optional(),
        email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").optional(),
        saas_product_id: z.string().uuid().optional(),
        interest_to_subscribe: z.enum(INTEREST).optional(),
        notes: z.string().trim().max(4000).nullable().optional(),
        user_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;

    const { error } = await context.supabase
      .from("beta_participants")
      .update(patch as any)
      .eq("id", id);

    if (error) {
      log("updateParticipant_error", { participant_id: id, user_id: context.userId, error: error.message });
      throw new Error(error.message);
    }

    log("updateParticipant", { participant_id: id, fields: Object.keys(patch), user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// changeParticipantStatus — a máquina de estados é validada no banco
// ---------------------------------------------------------------
export const changeParticipantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: z.enum(STATUS) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("beta_participants")
      .update({ status: data.status } as any)
      .eq("id", data.id);

    if (error) {
      log("changeParticipantStatus_error", {
        participant_id: data.id,
        status: data.status,
        user_id: context.userId,
        error: error.message,
      });
      throw new Error(error.message);
    }

    log("changeParticipantStatus", {
      participant_id: data.id,
      status: data.status,
      user_id: context.userId,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------
// convertParticipant
// ---------------------------------------------------------------
export const convertParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("beta_participants")
      .update({ status: "converted" } as any)
      .eq("id", data.id);

    if (error) {
      log("convertParticipant_error", {
        participant_id: data.id,
        user_id: context.userId,
        error: error.message,
      });
      throw new Error(error.message);
    }

    log("convertParticipant", { participant_id: data.id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// reopenParticipant — inactive -> active
// ---------------------------------------------------------------
export const reopenParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("beta_participants")
      .update({ status: "active" } as any)
      .eq("id", data.id);

    if (error) {
      log("reopenParticipant_error", {
        participant_id: data.id,
        user_id: context.userId,
        error: error.message,
      });
      throw new Error(error.message);
    }

    log("reopenParticipant", { participant_id: data.id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// listParticipantEvents
// ---------------------------------------------------------------
export const listParticipantEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ participantId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<BetaParticipantEvent[]> => {
    const { data: evs, error } = await context.supabase
      .from("beta_participant_events")
      .select("id, beta_participant_id, type, description, metadata, created_by, created_at")
      .eq("beta_participant_id", data.participantId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const events = await hydrateEvents(context.supabase, (evs ?? []) as any[]);
    log("listParticipantEvents", {
      participant_id: data.participantId,
      count: events.length,
      user_id: context.userId,
    });
    return events;
  });

// ---------------------------------------------------------------
// listBetaPrograms — apoio aos filtros e ao cadastro
// ---------------------------------------------------------------
export const listBetaProgramsForParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<Array<{ id: string; code: string; name: string; saas_product_id: string }>> => {
      const { data, error } = await context.supabase
        .from("beta_programs")
        .select("id, code, name, saas_product_id")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        saas_product_id: string;
      }>;
    },
  );

// ---------------------------------------------------------------
// registerInvitation — registra o envio do convite (invited_at)
// ---------------------------------------------------------------
export const registerInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("beta_participants")
      .update({ invited_at: new Date().toISOString() } as any)
      .eq("id", data.id);

    if (error) {
      log("registerInvitation_error", {
        participant_id: data.id,
        user_id: context.userId,
        error: error.message,
      });
      throw new Error(error.message);
    }

    log("registerInvitation", { participant_id: data.id, user_id: context.userId });
    return { ok: true };
  });

// ---------------------------------------------------------------
// listParticipantInteractions — busca bugs e feedback correlacionados
// ---------------------------------------------------------------
export const listParticipantInteractions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data) =>
      z
        .object({
          email: z.string().email(),
          saas_product_id: z.string().uuid(),
          external_user_id: z.string().uuid().nullable().optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { email, saas_product_id, external_user_id } = data;
    const emailLower = email.toLowerCase();

    // 1. Buscar Bugs
    // Prioridade 1: external_reference (se for UUID compatível com external_user_id)
    // Fallback: metadata -> actor_email ou similar, ou busca por external_reference se for o e-mail
    let bugsQuery = context.supabase
      .from("bugs")
      .select("id, code, title, status, severity, created_at")
      .eq("saas_product_id", saas_product_id);

    if (external_user_id) {
      bugsQuery = bugsQuery.or(`external_reference.eq.${external_user_id},metadata->>actor_email.eq.${emailLower}`);
    } else {
      bugsQuery = bugsQuery.or(`external_reference.eq.${emailLower},metadata->>actor_email.eq.${emailLower}`);
    }

    // 2. Buscar Feedback
    // Feedback já tem participant_email nativo
    let feedbackQuery = context.supabase
      .from("feedback")
      .select("id, code, title, status, type, created_at")
      .eq("saas_product_id", saas_product_id);

    if (external_user_id) {
       feedbackQuery = feedbackQuery.or(`participant_user_id.eq.${external_user_id},participant_email.ilike.${emailLower},external_reference.eq.${external_user_id}`);
    } else {
       feedbackQuery = feedbackQuery.ilike("participant_email", emailLower);
    }

    const [bugsRes, feedbackRes] = await Promise.all([
      bugsQuery.order("created_at", { ascending: false }).limit(50),
      feedbackQuery.order("created_at", { ascending: false }).limit(50),
    ]);

    log("listParticipantInteractions", {
      email,
      saas_product_id,
      bugs_count: bugsRes.data?.length ?? 0,
      feedback_count: feedbackRes.data?.length ?? 0,
      user_id: context.userId,
    });

    return {
      bugs: (bugsRes.data ?? []) as any[],
      feedback: (feedbackRes.data ?? []) as any[],
    };
  });
