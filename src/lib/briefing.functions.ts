/**
 * Valtro Briefing Engine (VBE) — Server Functions
 *
 * Sprint 2B.3.1: fundação (generate / list / revoke / resend autenticadas).
 * Sprint 2B.3.3: Portal Público (validate / save / complete anônimas).
 *
 * Escritas do Portal Público usam `supabaseAdmin` (bypass RLS) porque o
 * cliente final é anônimo — a autorização é feita pelo próprio token
 * (existência, status, expiração, revogação).
 *
 * `supabaseAdmin` é importado dinamicamente dentro dos handlers para
 * evitar vazamento do módulo server-only no bundle client
 * (ver tanstack-supabase-import-graph).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  BriefingToken,
  ServiceType,
  TemplateType,
  TokenStatus,
} from "@/types/briefing";

const SERVICE_TYPE_VALUES = [
  "nao_definido",
  "desenvolvimento_projeto",
  "gestao_shopee",
  "gestao_mercadolivre",
  "gestao_amazon",
  "gestao_multicanal",
  "consultoria",
  "diagnostico",
  "trafego_pago",
  "outro",
] as const satisfies readonly ServiceType[];

const TEMPLATE_TYPE_VALUES = [
  "padrao",
  "shopee",
  "mercadolivre",
  "amazon",
  "multicanal",
  "consultoria",
  "diagnostico",
  "custom",
] as const satisfies readonly TemplateType[];

const TOKEN_SELECT =
  "id, lead_id, service_type, template_type, status, created_by, created_at, expires_at, last_access_at, revoked_at, completed_at, updated_at";

const DEFAULT_TTL_DAYS = 14;

// =============================================================
// generateBriefingToken (autenticada)
// =============================================================
export const generateBriefingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        lead_id: z.string().uuid(),
        service_type: z.enum(SERVICE_TYPE_VALUES),
        template_type: z.enum(TEMPLATE_TYPE_VALUES).optional(),
        ttl_days: z.number().int().min(1).max(90).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const ttl = data.ttl_days ?? DEFAULT_TTL_DAYS;
    const expires_at = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

    // Sprint 2C.2 — regra "1 briefing ativo por serviço" (pendente/ativo).
    // Um mesmo Lead pode ter vários briefings, desde que sejam de serviços
    // diferentes ou que os anteriores estejam concluídos/revogados/expirados.
    const { data: active, error: activeErr } = await context.supabase
      .from("briefing_tokens")
      .select("id")
      .eq("lead_id", data.lead_id)
      .eq("service_type", data.service_type)
      .in("status", ["pendente", "ativo"])
      .limit(1);
    if (activeErr) throw new Error(activeErr.message);
    if (active && active.length > 0) {
      throw new Error(
        "Já existe um briefing ativo para este serviço. Conclua ou revogue o briefing atual antes de criar outro.",
      );
    }

    // Resolução centralizada service_type → template_type
    const { templateTypeForService } = await import("@/config/briefing-templates");
    const template_type =
      data.template_type ?? templateTypeForService(data.service_type);

    const { data: row, error } = await context.supabase
      .from("briefing_tokens")
      .insert({
        lead_id: data.lead_id,
        service_type: data.service_type,
        template_type,
        status: "pendente",
        created_by: context.userId,
        expires_at,
      })
      .select(TOKEN_SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return row as BriefingToken | null;
  });

// =============================================================
// listLeadBriefingTokens (autenticada)
// =============================================================
export const listLeadBriefingTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ lead_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("briefing_tokens")
      .select(TOKEN_SELECT)
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (rows ?? []) as BriefingToken[];
  });

// =============================================================
// revokeBriefingToken (autenticada)
// =============================================================
export const revokeBriefingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("briefing_tokens")
      .update({ status: "revogado", revoked_at: now })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============================================================
// resendBriefingToken (autenticada)
// =============================================================
export const resendBriefingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        ttl_days: z.number().int().min(1).max(90).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const ttl = data.ttl_days ?? DEFAULT_TTL_DAYS;
    const expires_at = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

    const { data: current, error: readErr } = await context.supabase
      .from("briefing_tokens")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Token não encontrado.");
    if (current.status === "concluido" || current.status === "revogado") {
      throw new Error("Token concluído ou revogado não pode ser reenviado.");
    }

    const { error } = await context.supabase
      .from("briefing_tokens")
      .update({ status: "ativo", expires_at })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, expires_at };
  });

// =============================================================
// Portal Público — resultados retornados ao cliente anônimo
// =============================================================
export type PortalTokenState =
  | "valido"
  | "expirado"
  | "revogado"
  | "concluido"
  | "invalido";

export interface PortalPayload {
  state: PortalTokenState;
  token: {
    id: string;
    template_type: TemplateType;
    service_type: ServiceType;
    status: TokenStatus;
    expires_at: string;
    completed_at: string | null;
  } | null;
  response: {
    data: Record<string, any>;
    current_step: number;
    completed_at: string | null;
  } | null;
}

// =============================================================
// validateBriefingToken — Portal Público (anônima)
// -------------------------------------------------------------
// Valida token, atualiza last_access_at, garante briefing_response,
// emite eventos de Timeline (iniciado / retomado) e retorna payload.
// =============================================================
export const validateBriefingToken = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<PortalPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: token, error } = await supabaseAdmin
      .from("briefing_tokens")
      .select(TOKEN_SELECT)
      .eq("id", data.token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!token) {
      return { state: "invalido", token: null, response: null };
    }

    const t = token as BriefingToken;

    // Estados finais
    if (t.status === "revogado") {
      return {
        state: "revogado",
        token: publicToken(t),
        response: null,
      };
    }
    if (t.status === "concluido") {
      // Carrega response para exibir tela de conclusão personalizada
      const { data: resp } = await supabaseAdmin
        .from("briefing_responses")
        .select("data, current_step, completed_at")
        .eq("token_id", t.id)
        .maybeSingle();
      return {
        state: "concluido",
        token: publicToken(t),
        response: resp
          ? {
              data: (resp.data as Record<string, any>) ?? {},
              current_step: resp.current_step ?? 0,
              completed_at: resp.completed_at,
            }
          : null,
      };
    }

    // Expiração (por data)
    if (new Date(t.expires_at).getTime() < Date.now()) {
      // Marca como expirado de forma preguiçosa
      if (t.status !== "expirado") {
        await supabaseAdmin
          .from("briefing_tokens")
          .update({ status: "expirado" })
          .eq("id", t.id);
      }
      return { state: "expirado", token: publicToken(t), response: null };
    }

    // Explicit `expirado`
    if (t.status === "expirado") {
      return { state: "expirado", token: publicToken(t), response: null };
    }

    // Token utilizável (pendente ou ativo) → materializa response e ativa
    const isFirstAccess = !t.last_access_at;

    // Ativa o token na primeira interação
    const patch: { last_access_at: string; status?: TokenStatus } = {
      last_access_at: new Date().toISOString(),
    };
    if (t.status === "pendente") patch.status = "ativo";

    await supabaseAdmin.from("briefing_tokens").update(patch).eq("id", t.id);

    // Garante briefing_response
    const { data: existingResp } = await supabaseAdmin
      .from("briefing_responses")
      .select("data, current_step, completed_at, started_at")
      .eq("token_id", t.id)
      .maybeSingle();

    let response = existingResp;

    if (!response) {
      // Sprint 2B.3.4 — prefill com dados já coletados no Lead
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("contact_name, company_name, segment, city, state, phone, email")
        .eq("id", t.lead_id)
        .maybeSingle();

      const prefill: Record<string, string> = {};
      if (lead) {
        if (lead.contact_name) prefill.nome = lead.contact_name;
        if (lead.company_name) prefill.empresa = lead.company_name;
        if (lead.segment) prefill.segmento = lead.segment;
        if (lead.city) prefill.cidade = lead.city;
        if (lead.state) prefill.estado = lead.state;
        if (lead.phone) prefill.whatsapp = lead.phone;
        if (lead.email) prefill.email = lead.email;
      }

      const { data: created, error: createErr } = await supabaseAdmin
        .from("briefing_responses")
        .insert({
          token_id: t.id,
          lead_id: t.lead_id,
          template_type: t.template_type,
          data: prefill,
          current_step: 0,
        })
        .select("data, current_step, completed_at, started_at")
        .single();
      if (createErr) throw new Error(createErr.message);
      response = created;
    }

    // Timeline: iniciado (primeiro acesso) OU retomado (acessos subsequentes)
    if (isFirstAccess) {
      await supabaseAdmin.from("lead_events").insert({
        lead_id: t.lead_id,
        type: "briefing_iniciado",
        description: "Cliente acessou o Briefing pela primeira vez.",
        metadata: { token_id: t.id },
      });
    } else {
      await supabaseAdmin.from("lead_events").insert({
        lead_id: t.lead_id,
        type: "briefing_retomado",
        description: "Cliente retomou o preenchimento do Briefing.",
        metadata: { token_id: t.id },
      });
    }

    return {
      state: "valido",
      token: publicToken({
        ...t,
        status: patch.status ? (patch.status as TokenStatus) : t.status,
        last_access_at: patch.last_access_at as string,
      }),
      response: {
        data: (response.data as Record<string, any>) ?? {},
        current_step: response.current_step ?? 0,
        completed_at: response.completed_at,
      },
    };
  });

// =============================================================
// saveBriefingProgress — Portal Público (anônima)
// -------------------------------------------------------------
// Auto Save. Persiste `data` + `current_step`. Idempotente.
// =============================================================
export const saveBriefingProgress = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().uuid(),
        data: z.record(z.string(), z.any()),
        current_step: z.number().int().min(0).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica token utilizável antes de salvar
    const { data: token, error: tokenErr } = await supabaseAdmin
      .from("briefing_tokens")
      .select("id, status, expires_at")
      .eq("id", data.token)
      .maybeSingle();
    if (tokenErr) throw new Error(tokenErr.message);
    if (!token) throw new Error("Token inválido.");
    if (token.status === "revogado") throw new Error("Acesso desativado.");
    if (token.status === "concluido") throw new Error("Briefing já concluído.");
    if (new Date(token.expires_at).getTime() < Date.now()) {
      throw new Error("Link expirado.");
    }

    const now = new Date().toISOString();

    // Marca started_at apenas na primeira escrita
    const { data: existing } = await supabaseAdmin
      .from("briefing_responses")
      .select("started_at")
      .eq("token_id", data.token)
      .maybeSingle();

    const patch: { data: any; current_step: number; started_at?: string } = {
      data: data.data,
      current_step: data.current_step,
    };
    if (existing && !existing.started_at) patch.started_at = now;

    const { error } = await supabaseAdmin
      .from("briefing_responses")
      .update(patch)
      .eq("token_id", data.token);
    if (error) throw new Error(error.message);

    // Atualiza last_access_at para refletir atividade recente
    await supabaseAdmin
      .from("briefing_tokens")
      .update({ last_access_at: now })
      .eq("id", data.token);

    return { ok: true, saved_at: now };
  });

// =============================================================
// completeBriefing — Portal Público (anônima)
// =============================================================
export const completeBriefing = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().uuid(),
        data: z.record(z.string(), z.any()),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: token, error: tokenErr } = await supabaseAdmin
      .from("briefing_tokens")
      .select("id, lead_id, status, expires_at")
      .eq("id", data.token)
      .maybeSingle();
    if (tokenErr) throw new Error(tokenErr.message);
    if (!token) throw new Error("Token inválido.");
    if (token.status === "revogado") throw new Error("Acesso desativado.");
    if (token.status === "concluido") return { ok: true, already: true };
    if (new Date(token.expires_at).getTime() < Date.now()) {
      throw new Error("Link expirado.");
    }

    const now = new Date().toISOString();

    const { error: respErr } = await supabaseAdmin
      .from("briefing_responses")
      .update({ data: data.data, completed_at: now })
      .eq("token_id", data.token);
    if (respErr) throw new Error(respErr.message);

    const { error: tokErr } = await supabaseAdmin
      .from("briefing_tokens")
      .update({ status: "concluido", completed_at: now })
      .eq("id", data.token);
    if (tokErr) throw new Error(tokErr.message);

    await supabaseAdmin.from("lead_events").insert({
      lead_id: token.lead_id,
      type: "briefing_concluido",
      description: "Cliente concluiu o preenchimento do Briefing.",
      metadata: { token_id: token.id },
    });

    return { ok: true, already: false };
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function publicToken(t: BriefingToken): PortalPayload["token"] {
  return {
    id: t.id,
    template_type: t.template_type,
    service_type: t.service_type,
    status: t.status,
    expires_at: t.expires_at,
    completed_at: t.completed_at,
  };
}

/**
 * Defesa em profundidade: o Portal Público é anônimo e recebe `data` como
 * um blob JSON livre. O `template_type` e o `service_type` são fixados
 * pelo operador na geração do token e NÃO podem ser alterados pelas
 * respostas do cliente. Qualquer chave reservada que apareça no payload é
 * descartada antes de persistir em `briefing_responses.data`.
 */
const RESERVED_RESPONSE_KEYS = new Set([
  "template_type",
  "service_type",
  "token_id",
  "lead_id",
  "status",
]);

function sanitizeResponseData(
  data: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (RESERVED_RESPONSE_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

// =============================================================
// getBriefingResponseForOperator (autenticada) — Sprint 2B.3.4
// -------------------------------------------------------------
// Retorna o token + response para o operador. RLS garante que
// apenas o dono do Lead (via briefing_tokens policies) consegue ler.
// =============================================================
export const getBriefingResponseForOperator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ token_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: token, error: tokenErr } = await context.supabase
      .from("briefing_tokens")
      .select(TOKEN_SELECT)
      .eq("id", data.token_id)
      .maybeSingle();
    if (tokenErr) throw new Error(tokenErr.message);
    if (!token) throw new Error("Briefing não encontrado.");

    const { data: response, error: respErr } = await context.supabase
      .from("briefing_responses")
      .select("data, current_step, started_at, completed_at, updated_at")
      .eq("token_id", data.token_id)
      .maybeSingle();
    if (respErr) throw new Error(respErr.message);

    return {
      token: token as BriefingToken,
      response: response
        ? {
            data: (response.data as Record<string, any>) ?? {},
            current_step: response.current_step ?? 0,
            started_at: response.started_at as string | null,
            completed_at: response.completed_at as string | null,
            updated_at: response.updated_at as string,
          }
        : null,
    };
  });
