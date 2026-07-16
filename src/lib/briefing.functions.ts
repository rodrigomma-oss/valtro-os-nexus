/**
 * Valtro Briefing Engine (VBE) — Server Functions
 * Sprint 2B.3.1: fundação. Sem Portal público, sem templates, sem timeline.
 *
 * Estas server functions são autenticadas e respeitam RLS via
 * `requireSupabaseAuth`. A validação pública de token (chamada pelo cliente
 * final via link) será implementada em sprint futura — a estrutura já está
 * preparada, mas o handler retorna 501 até então.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BriefingToken, ServiceType, TemplateType } from "@/types/briefing";

const SERVICE_TYPE_VALUES = [
  "nao_definido",
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

// Default: 14 dias
const DEFAULT_TTL_DAYS = 14;

// =============================================================
// generateBriefingToken
// =============================================================
export const generateBriefingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        lead_id: z.string().uuid(),
        service_type: z.enum(SERVICE_TYPE_VALUES),
        template_type: z.enum(TEMPLATE_TYPE_VALUES).default("padrao"),
        ttl_days: z.number().int().min(1).max(90).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const ttl = data.ttl_days ?? DEFAULT_TTL_DAYS;
    const expires_at = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();

    const { data: row, error } = await context.supabase
      .from("briefing_tokens")
      .insert({
        lead_id: data.lead_id,
        service_type: data.service_type,
        template_type: data.template_type,
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
// listLeadBriefingTokens
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
// revokeBriefingToken
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
// resendBriefingToken (estrutura preparada)
// -------------------------------------------------------------
// Sprint futura: dispara reenvio por e-mail/WhatsApp e estende expires_at.
// Nesta sprint apenas estende validade e reativa se estava expirado.
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

    // Reativa apenas se ainda não concluído/revogado
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
    // TODO(sprint futura): enfileirar envio de e-mail / WhatsApp com o link.
    return { ok: true, expires_at };
  });

// =============================================================
// validateBriefingToken (estrutura preparada — Portal Público)
// -------------------------------------------------------------
// Chamado pelo cliente final via link com token; NÃO usa requireSupabaseAuth
// porque o cliente final é anônimo. Implementação completa em sprint futura,
// quando o Portal Público for construído. Por enquanto retorna 501.
// =============================================================
export const validateBriefingToken = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async () => {
    // Sprint futura: validar via supabaseAdmin (bypass RLS), checar expires_at,
    // status ativo/pendente, atualizar last_access_at, retornar template + dados.
    throw new Error("validateBriefingToken: not implemented (Sprint futura — Portal Público).");
  });
