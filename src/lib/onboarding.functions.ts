/**
 * Onboarding pós-venda por contratação — Server Functions (Sprint 13.5).
 *
 * Invariantes desta camada:
 * 1. O onboarding pertence à contratação (`client_services`). Nunca ao
 *    cliente genérico e nunca ao Lead.
 * 2. Abertura é MANUAL (action "Iniciar onboarding"). Não há automatismo na
 *    transição pendente → ativo da contratação nesta sprint.
 * 3. Apenas um onboarding ativo por contratação/template (índice único no
 *    banco + verificação prévia aqui).
 * 4. O Portal Público é anônimo: a autorização é o próprio token
 *    (existência, expiração, revogação, conclusão). Nenhuma tabela interna
 *    é exposta ao papel `anon`; as escritas usam `supabaseAdmin`, importado
 *    dinamicamente dentro dos handlers.
 * 5. O payload do cliente passa por whitelist explícita (ids das perguntas
 *    do template). Qualquer chave desconhecida é descartada.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { onboardingAllowedKeys, getOnboardingTemplate } from "@/config/onboarding-templates";
import type {
  ClientServiceOnboarding,
  OnboardingPortalPayload,
  OnboardingContext,
  OnboardingStatus,
  OnboardingTokenStatus,
} from "@/types/onboarding";

const ONBOARDING_SELECT =
  "id, client_service_id, template_key, status, owner_id, due_at, started_at, completed_at, created_by, created_at, updated_at";
const TOKEN_SELECT =
  "id, client_service_onboarding_id, status, expires_at, last_access_at, revoked_at, completed_at, created_at";

const DEFAULT_TTL_DAYS = 14;
const DEFAULT_DUE_DAYS = 7;

const ACTIVE_ONBOARDING_STATUS: OnboardingStatus[] = [
  "pendente",
  "enviado",
  "em_preenchimento",
];

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ============================================================
// getOnboardingContext — a contratação pode iniciar onboarding?
// ============================================================
export const getOnboardingContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_service_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<OnboardingContext> => {
    const { supabase } = context;

    const { data: cs, error } = await supabase
      .from("client_services")
      .select("id, status, service_id")
      .eq("id", data.client_service_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cs) throw new Error("Contratação não encontrada.");

    let templateKey: string | null = null;
    if (cs.service_id) {
      const { data: svc } = await supabase
        .from("services")
        .select("onboarding_template_key")
        .eq("id", cs.service_id)
        .maybeSingle();
      templateKey = (svc?.onboarding_template_key as string | null) ?? null;
    }

    let blocked: string | null = null;
    if (!templateKey) {
      blocked = "Este serviço não exige onboarding.";
    } else if (cs.status === "cancelado" || cs.status === "concluido") {
      blocked = "Contratação encerrada — não é possível abrir onboarding.";
    } else {
      const { data: active } = await supabase
        .from("client_service_onboardings")
        .select("id")
        .eq("client_service_id", cs.id)
        .eq("template_key", templateKey)
        .in("status", ACTIVE_ONBOARDING_STATUS)
        .limit(1);
      if (active && active.length > 0) {
        blocked = "Já existe um onboarding ativo para este template.";
      }
    }

    return {
      client_service_id: cs.id,
      template_key: templateKey,
      can_start: blocked === null,
      blocked_reason: blocked,
    };
  });

// ============================================================
// listOnboardings — onboardings de uma contratação
// ============================================================
export const listOnboardings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_service_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ClientServiceOnboarding[]> => {
    const { supabase } = context;

    const { data: rows, error } = await supabase
      .from("client_service_onboardings")
      .select(ONBOARDING_SELECT)
      .eq("client_service_id", data.client_service_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as any[];
    if (list.length === 0) return [];

    const ids = list.map((r) => r.id);
    const { data: tokens } = await supabase
      .from("onboarding_tokens")
      .select(TOKEN_SELECT)
      .in("client_service_onboarding_id", ids)
      .order("created_at", { ascending: false });

    const latestToken = new Map<string, any>();
    for (const t of (tokens ?? []) as any[]) {
      if (!latestToken.has(t.client_service_onboarding_id)) {
        latestToken.set(t.client_service_onboarding_id, t);
      }
    }

    const ownerIds = Array.from(
      new Set(list.map((r) => r.owner_id).filter((v): v is string => !!v)),
    );
    const names = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);
      for (const p of (profiles ?? []) as any[]) names.set(p.id, p.full_name);
    }

    return list.map((r) => {
      const t = latestToken.get(r.id) ?? null;
      return {
        ...r,
        owner_name: r.owner_id ? (names.get(r.owner_id) ?? null) : null,
        token: t
          ? {
              id: t.id,
              status: t.status as OnboardingTokenStatus,
              expires_at: t.expires_at,
              last_access_at: t.last_access_at,
              revoked_at: t.revoked_at,
              completed_at: t.completed_at,
              created_at: t.created_at,
            }
          : null,
      } as ClientServiceOnboarding;
    });
  });

// ============================================================
// startOnboarding — action manual (cria onboarding + token/link)
// ============================================================
export const startOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        client_service_id: z.string().uuid(),
        ttl_days: z.number().int().min(1).max(90).optional(),
        due_days: z.number().int().min(1).max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: cs, error: csErr } = await supabase
      .from("client_services")
      .select("id, status, service_id, owner_id, name_snapshot")
      .eq("id", data.client_service_id)
      .maybeSingle();
    if (csErr) throw new Error(csErr.message);
    if (!cs) throw new Error("Contratação não encontrada.");
    if (cs.status === "cancelado" || cs.status === "concluido") {
      throw new Error("Contratação encerrada — não é possível abrir onboarding.");
    }

    let templateKey: string | null = null;
    if (cs.service_id) {
      const { data: svc } = await supabase
        .from("services")
        .select("onboarding_template_key")
        .eq("id", cs.service_id)
        .maybeSingle();
      templateKey = (svc?.onboarding_template_key as string | null) ?? null;
    }
    if (!templateKey) {
      throw new Error("Este serviço não possui template de onboarding configurado.");
    }
    if (!getOnboardingTemplate(templateKey)) {
      throw new Error(`Template de onboarding "${templateKey}" não implementado.`);
    }

    const { data: active } = await supabase
      .from("client_service_onboardings")
      .select("id")
      .eq("client_service_id", cs.id)
      .eq("template_key", templateKey)
      .in("status", ACTIVE_ONBOARDING_STATUS)
      .limit(1);
    if (active && active.length > 0) {
      throw new Error(
        "Já existe um onboarding ativo para este template. Conclua ou revogue antes de abrir outro.",
      );
    }

    const { data: created, error: insErr } = await supabase
      .from("client_service_onboardings")
      .insert({
        client_service_id: cs.id,
        template_key: templateKey,
        status: "pendente",
        owner_id: cs.owner_id ?? userId,
        due_at: inDays(data.due_days ?? DEFAULT_DUE_DAYS),
        created_by: userId,
      } as any)
      .select(ONBOARDING_SELECT)
      .maybeSingle();
    if (insErr) {
      if ((insErr as any).code === "23505") {
        throw new Error("Já existe um onboarding ativo para este template.");
      }
      throw new Error(insErr.message);
    }
    const onboarding = created as any;

    const { data: token, error: tokErr } = await supabase
      .from("onboarding_tokens")
      .insert({
        client_service_onboarding_id: onboarding.id,
        status: "pendente",
        expires_at: inDays(data.ttl_days ?? DEFAULT_TTL_DAYS),
        created_by: userId,
      } as any)
      .select(TOKEN_SELECT)
      .maybeSingle();
    if (tokErr) throw new Error(tokErr.message);

    // Onboarding com link disponível → "enviado" (evento na timeline).
    const { error: updErr } = await supabase
      .from("client_service_onboardings")
      .update({ status: "enviado" })
      .eq("id", onboarding.id);
    if (updErr) throw new Error(updErr.message);

    return {
      onboarding_id: onboarding.id as string,
      template_key: templateKey,
      token_id: (token as any).id as string,
      expires_at: (token as any).expires_at as string,
    };
  });

// ============================================================
// revokeOnboarding — revoga token e cancela o onboarding
// ============================================================
export const revokeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ onboarding_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const now = new Date().toISOString();

    const { data: current, error: readErr } = await supabase
      .from("client_service_onboardings")
      .select("id, status")
      .eq("id", data.onboarding_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Onboarding não encontrado.");
    if (current.status === "concluido") {
      throw new Error("Onboarding concluído não pode ser revogado.");
    }
    if (current.status === "cancelado") return { ok: true, already: true };

    const { error: tokErr } = await supabase
      .from("onboarding_tokens")
      .update({ status: "revogado", revoked_at: now })
      .eq("client_service_onboarding_id", data.onboarding_id)
      .in("status", ["pendente", "ativo", "expirado"]);
    if (tokErr) throw new Error(tokErr.message);

    const { error } = await supabase
      .from("client_service_onboardings")
      .update({ status: "cancelado" })
      .eq("id", data.onboarding_id);
    if (error) throw new Error(error.message);

    return { ok: true, already: false };
  });

// ============================================================
// getOnboardingResponseForOperator — visualizar respostas
// ============================================================
export const getOnboardingResponseForOperator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ onboarding_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: response, error } = await context.supabase
      .from("onboarding_responses")
      .select("template_key, data, current_step, started_at, completed_at, updated_at")
      .eq("client_service_onboarding_id", data.onboarding_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!response) return null;

    return {
      template_key: response.template_key as string,
      data: (response.data as Record<string, any>) ?? {},
      current_step: response.current_step ?? 0,
      started_at: response.started_at as string | null,
      completed_at: response.completed_at as string | null,
      updated_at: response.updated_at as string,
    };
  });

// ---------------------------------------------------------------------------
// Portal Público (anônimo)
// ---------------------------------------------------------------------------

/** Whitelist explícita por template — nada fora dela é persistido. */
function sanitizeOnboardingData(
  templateKey: string,
  data: Record<string, any>,
): Record<string, any> {
  const allowed = new Set(onboardingAllowedKeys(templateKey));
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!allowed.has(k)) continue;
    out[k] = v;
  }
  return out;
}

async function loadTokenChain(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: tok, error } = await supabaseAdmin
    .from("onboarding_tokens")
    .select(TOKEN_SELECT)
    .eq("id", token)
    .maybeSingle();
  if (error) throw new Error("Erro ao validar o onboarding.");
  if (!tok) return null;

  const { data: onb, error: onbErr } = await supabaseAdmin
    .from("client_service_onboardings")
    .select("id, client_service_id, template_key, status")
    .eq("id", (tok as any).client_service_onboarding_id)
    .maybeSingle();
  if (onbErr || !onb) throw new Error("Erro ao carregar o onboarding.");

  const { data: cs, error: csErr } = await supabaseAdmin
    .from("client_services")
    .select("id, name_snapshot")
    .eq("id", (onb as any).client_service_id)
    .maybeSingle();
  if (csErr) throw new Error("Erro ao carregar a contratação.");

  return {
    supabaseAdmin,
    token: tok as any,
    onboarding: onb as any,
    serviceName: ((cs as any)?.name_snapshot as string) ?? "Serviço contratado",
  };
}

// ============================================================
// validateOnboardingToken (anônima)
// ============================================================
export const validateOnboardingToken = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<OnboardingPortalPayload> => {
    const chain = await loadTokenChain(data.token);
    if (!chain) return { state: "invalido", onboarding: null, response: null };

    const { supabaseAdmin, token: t, onboarding: o, serviceName } = chain;

    const publicOnboarding = (status: OnboardingStatus) => ({
      token_id: t.id as string,
      template_key: o.template_key as string,
      service_name: serviceName,
      status,
      expires_at: t.expires_at as string,
      completed_at: t.completed_at as string | null,
    });

    if (t.status === "revogado" || o.status === "cancelado") {
      return { state: "revogado", onboarding: publicOnboarding("cancelado"), response: null };
    }

    if (t.status === "concluido" || o.status === "concluido") {
      const { data: resp } = await supabaseAdmin
        .from("onboarding_responses")
        .select("data, current_step, completed_at")
        .eq("token_id", t.id)
        .maybeSingle();
      return {
        state: "concluido",
        onboarding: publicOnboarding("concluido"),
        response: resp
          ? {
              data: (resp.data as Record<string, any>) ?? {},
              current_step: resp.current_step ?? 0,
              completed_at: resp.completed_at,
            }
          : null,
      };
    }

    if (new Date(t.expires_at).getTime() < Date.now()) {
      if (t.status !== "expirado") {
        await supabaseAdmin
          .from("onboarding_tokens")
          .update({ status: "expirado" })
          .eq("id", t.id);
      }
      return { state: "expirado", onboarding: publicOnboarding(o.status), response: null };
    }
    if (t.status === "expirado") {
      return { state: "expirado", onboarding: publicOnboarding(o.status), response: null };
    }

    const now = new Date().toISOString();

    const tokenPatch: { last_access_at: string; status?: OnboardingTokenStatus } = {
      last_access_at: now,
    };
    if (t.status === "pendente") tokenPatch.status = "ativo";
    const { error: tokUpdErr } = await supabaseAdmin
      .from("onboarding_tokens")
      .update(tokenPatch)
      .eq("id", t.id);
    if (tokUpdErr) throw new Error("Erro ao ativar o onboarding.");

    // Primeiro acesso do cliente → em_preenchimento (evento na timeline).
    let onboardingStatus = o.status as OnboardingStatus;
    if (onboardingStatus === "pendente" || onboardingStatus === "enviado") {
      const { error: onbUpdErr } = await supabaseAdmin
        .from("client_service_onboardings")
        .update({ status: "em_preenchimento", started_at: now })
        .eq("id", o.id);
      if (onbUpdErr) throw new Error("Erro ao iniciar o onboarding.");
      onboardingStatus = "em_preenchimento";
    }

    // Garante a resposta com pré-preenchimento seguro (whitelist no banco).
    const { data: existing, error: respErr } = await supabaseAdmin
      .from("onboarding_responses")
      .select("data, current_step, completed_at")
      .eq("token_id", t.id)
      .maybeSingle();
    if (respErr) throw new Error("Erro ao carregar respostas do onboarding.");

    let response = existing;
    if (!response) {
      const { data: defaults } = await supabaseAdmin.rpc("hydrate_onboarding_defaults", {
        _client_service_id: o.client_service_id,
      });
      const prefill = sanitizeOnboardingData(
        o.template_key,
        (defaults as Record<string, any>) ?? {},
      );

      const { data: createdResp, error: createErr } = await supabaseAdmin
        .from("onboarding_responses")
        .insert({
          token_id: t.id,
          client_service_onboarding_id: o.id,
          template_key: o.template_key,
          data: prefill,
          current_step: 0,
          started_at: now,
        } as any)
        .select("data, current_step, completed_at")
        .single();
      if (createErr) throw new Error("Erro ao criar respostas do onboarding.");
      response = createdResp;
    }

    return {
      state: "valido",
      onboarding: publicOnboarding(onboardingStatus),
      response: {
        data: (response.data as Record<string, any>) ?? {},
        current_step: response.current_step ?? 0,
        completed_at: response.completed_at,
      },
    };
  });

// ============================================================
// saveOnboardingProgress (anônima) — autosave idempotente
// ============================================================
export const saveOnboardingProgress = createServerFn({ method: "POST" })
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
    const chain = await loadTokenChain(data.token);
    if (!chain) throw new Error("Token inválido.");
    const { supabaseAdmin, token: t, onboarding: o } = chain;

    if (t.status === "revogado" || o.status === "cancelado") {
      throw new Error("Acesso desativado.");
    }
    if (t.status === "concluido" || o.status === "concluido") {
      throw new Error("Onboarding já concluído.");
    }
    if (new Date(t.expires_at).getTime() < Date.now()) throw new Error("Link expirado.");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("onboarding_responses")
      .update({
        data: sanitizeOnboardingData(o.template_key, data.data) as any,
        current_step: data.current_step,
      })
      .eq("token_id", t.id);
    if (error) throw new Error("Erro ao salvar o progresso.");

    await supabaseAdmin
      .from("onboarding_tokens")
      .update({ last_access_at: now })
      .eq("id", t.id);

    return { ok: true, saved_at: now };
  });

// ============================================================
// completeOnboarding (anônima)
// ============================================================
export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().uuid(),
        data: z.record(z.string(), z.any()),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const chain = await loadTokenChain(data.token);
    if (!chain) throw new Error("Token inválido.");
    const { supabaseAdmin, token: t, onboarding: o } = chain;

    if (t.status === "revogado" || o.status === "cancelado") {
      throw new Error("Acesso desativado.");
    }
    if (t.status === "concluido" || o.status === "concluido") {
      return { ok: true, already: true };
    }
    if (new Date(t.expires_at).getTime() < Date.now()) throw new Error("Link expirado.");

    const now = new Date().toISOString();

    const { error: respErr } = await supabaseAdmin
      .from("onboarding_responses")
      .update({
        data: sanitizeOnboardingData(o.template_key, data.data) as any,
        completed_at: now,
      })
      .eq("token_id", t.id);
    if (respErr) throw new Error("Erro ao registrar as respostas.");

    const { error: tokErr } = await supabaseAdmin
      .from("onboarding_tokens")
      .update({ status: "concluido", completed_at: now })
      .eq("id", t.id);
    if (tokErr) throw new Error("Erro ao concluir o onboarding.");

    // Dispara o evento onboarding_completed na timeline da contratação.
    const { error: onbErr } = await supabaseAdmin
      .from("client_service_onboardings")
      .update({ status: "concluido", completed_at: now })
      .eq("id", o.id);
    if (onbErr) throw new Error("Erro ao concluir o onboarding.");

    return { ok: true, already: false };
  });
