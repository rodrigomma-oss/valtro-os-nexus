/**
 * Fase 1A — Encerramento de contratações e status de clientes.
 *
 * Regras aplicadas:
 * - O encerramento usa os status existentes `concluido` e `cancelado`
 *   (grafo em `src/lib/client-service-transitions.ts`).
 * - "nao_renovacao" é MOTIVO, nunca status.
 * - Pagamentos e ciclos pendentes não impedem o encerramento: são apenas
 *   avisados no resumo de pendências.
 * - Nada é apagado: ciclos, pagamentos, projetos e eventos permanecem.
 * - O evento de encerramento é gravado pela trigger do banco
 *   (`log_client_service_termination_trg`), reaproveitando a estrutura já
 *   existente de `client_service_events` — sem duplicar evento aqui.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTransitionAllowed } from "@/lib/client-service-transitions";
import {
  CLIENT_SERVICE_STATUS_LABEL,
  ONGOING_SERVICE_STATUSES,
  TERMINATION_REASON_LABEL,
  TERMINATION_REASON_TARGET,
  TERMINATION_REASONS,
} from "@/types/client-service";
import type {
  ClientService,
  ClientServiceStatus,
  TerminationReason,
} from "@/types/client-service";
import type { ClientStatus } from "@/types/client";

/**
 * Status que ainda representa vínculo comercial em aberto.
 * Reutiliza a lista única do domínio (`ONGOING_SERVICE_STATUSES`) para não
 * duplicar a regra de "em andamento".
 */
const ONGOING_STATUSES: readonly ClientServiceStatus[] = ONGOING_SERVICE_STATUSES;

/**
 * `z.enum` exige uma tupla de literais. `TERMINATION_REASONS` é `as const`
 * (readonly), por isso é convertido para a tupla mutável que o zod espera —
 * sem duplicar a lista de motivos.
 */
const REASON_TUPLE = TERMINATION_REASONS as unknown as [
  TerminationReason,
  ...TerminationReason[],
];

/**
 * Contexto do middleware (`requireSupabaseAuth`). O tipo é normalizado aqui
 * porque as funções abaixo também são chamadas em testes com `context`
 * parcialmente tipado.
 */
interface TerminationContext {
  supabase: any;
  userId: string | null;
}

function readContext(context: unknown): TerminationContext {
  // `unknown` intermediário: o tipo real do contexto do TanStack Start pode
  // não ter sobreposição suficiente com `Partial<TerminationContext>` e o
  // TS strict rejeitaria a conversão direta.
  const ctx = (context ?? {}) as unknown as Partial<TerminationContext>;
  return {
    supabase: ctx.supabase as any,
    userId: (ctx.userId ?? null) as string | null,
  };
}

export interface ServiceTerminationPreview {
  serviceId: string;
  serviceLabel: string;
  currentStatus: ClientServiceStatus;
  targetStatus: ClientServiceStatus;
  reason: TerminationReason;
  reasonLabel: string;
  openCycles: number;
  pendingPayments: number;
  pendingPaymentsAmountCents: number;
  hasPending: boolean;
  otherActiveServices: number;
  suggestsClientDeactivation: boolean;
  canTerminate: boolean;
  blockedReason: string | null;
}

export interface TerminateServiceResult {
  ok: boolean;
  serviceId: string;
  status: ClientServiceStatus;
  reason: TerminationReason;
  message: string;
  suggestsClientDeactivation: boolean;
}

/** Dados de encerramento já persistidos (motivo, responsável, data). */
export interface TerminationRecord {
  termination_reason: TerminationReason | null;
  termination_note: string | null;
  terminated_by: string | null;
  terminated_at: string | null;
}

/**
 * Admin e operator podem alterar clientes e contratações.
 * O RLS do banco é a autoridade final; aqui apenas damos um erro claro.
 */
async function requireManager(supabase: any, userId: string | null): Promise<void> {
  if (!userId) return;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) return; // RLS do banco é a autoridade final.
  const roles = ((data ?? []) as Array<{ role: string }>).map((r) => r.role);
  if (roles.length === 0) return;
  if (!roles.some((r) => r === "admin" || r === "operator")) {
    throw new Error(
      "Permissão insuficiente: apenas admin e operator podem alterar clientes e contratações.",
    );
  }
}

async function loadService(supabase: any, serviceId: string): Promise<ClientService> {
  const { data, error } = await supabase
    .from("client_services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contratação não encontrada.");
  return data as unknown as ClientService;
}

async function loadPendingSummary(supabase: any, serviceId: string) {
  // `select("*")` de propósito: os nomes exatos das colunas de ciclo/valor
  // variam entre implantações e uma coluna inexistente quebraria a leitura
  // do resumo de pendências. O cálculo é defensivo.
  const { data, error } = await supabase
    .from("client_service_cycles")
    .select("*")
    .eq("client_service_id", serviceId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, any>>;

  const openCycles = rows.filter((c) =>
    ["previsto", "ativo", "aberto"].includes(String(c.status ?? "")),
  ).length;

  const pending = rows.filter((c) =>
    ["pendente", "vencido", "atrasado"].includes(String(c.payment_status ?? "")),
  );

  return {
    openCycles,
    pendingPayments: pending.length,
    pendingPaymentsAmountCents: pending.reduce(
      (sum, c) => sum + toCents(c.amount_cents ?? c.amount ?? 0),
      0,
    ),
  };
}

/** Valores podem estar em centavos (inteiro) ou em reais (decimal). */
function toCents(value: unknown): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric);
}

async function listOngoingServices(supabase: any, clientId: string) {
  const { data, error } = await supabase
    .from("client_services")
    .select("id, status")
    .eq("client_id", clientId)
    .in("status", [...ONGOING_STATUSES]);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    status: ClientServiceStatus;
  }>;
}

/**
 * As colunas de encerramento só existem depois da migração
 * `fase1a_encerramento_contratacoes` ser aplicada no banco. Como o app pode
 * rodar antes disso, a ausência da coluna é tratada como "sem dados" — nunca
 * como erro fatal.
 */
function isMissingColumn(error: unknown): boolean {
  const code = (error as any)?.code;
  const message = String((error as any)?.message ?? "").toLowerCase();
  if (code === "PGRST204" || code === "42703") return true;
  // Coluna ainda não migrada (PostgREST/PG) — mensagens de coluna ausente.
  if (message.includes("does not exist")) return true;
  if (message.includes("could not find the") && message.includes("column")) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// previewServiceTermination — pendências antes da confirmação
// ---------------------------------------------------------------
export const previewServiceTermination = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        serviceId: z.string().uuid(),
        reason: z.enum(REASON_TUPLE),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ServiceTerminationPreview> => {
    const { supabase, userId } = readContext(context);
    await requireManager(supabase, userId);

    const service = await loadService(supabase, data.serviceId);
    const targetStatus = TERMINATION_REASON_TARGET[data.reason];
    const pending = await loadPendingSummary(supabase, service.id);

    const ongoing = await listOngoingServices(supabase, service.client_id);
    const otherActiveServices = ongoing.filter((s) => s.id !== service.id).length;

    const canTerminate = isTransitionAllowed(service.status, targetStatus);

    return {
      serviceId: service.id,
      serviceLabel: service.name_snapshot || "Contratação",
      currentStatus: service.status,
      targetStatus,
      reason: data.reason,
      reasonLabel: TERMINATION_REASON_LABEL[data.reason],
      openCycles: pending.openCycles,
      pendingPayments: pending.pendingPayments,
      pendingPaymentsAmountCents: pending.pendingPaymentsAmountCents,
      hasPending: pending.openCycles > 0 || pending.pendingPayments > 0,
      otherActiveServices,
      suggestsClientDeactivation: otherActiveServices === 0,
      canTerminate,
      blockedReason: canTerminate
        ? null
        : `Não é possível encerrar uma contratação com status "${CLIENT_SERVICE_STATUS_LABEL[service.status]}".`,
    };
  });

// ---------------------------------------------------------------
// listTerminationRecords — motivo/responsável/data por contratação
// ---------------------------------------------------------------
export const listTerminationRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ client_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Record<string, TerminationRecord>> => {
    const { supabase } = readContext(context);
    const { data: rows, error } = await supabase
      .from("client_services")
      .select("id, termination_reason, termination_note, terminated_by, terminated_at")
      .eq("client_id", data.client_id);
    if (error) {
      if (isMissingColumn(error)) return {};
      throw new Error(error.message);
    }
    const out: Record<string, TerminationRecord> = {};
    for (const row of (rows ?? []) as Array<Record<string, any>>) {
      out[row.id] = {
        termination_reason: row.termination_reason ?? null,
        termination_note: row.termination_note ?? null,
        terminated_by: row.terminated_by ?? null,
        terminated_at: row.terminated_at ?? null,
      };
    }
    return out;
  });

// ---------------------------------------------------------------
// terminateService — encerra usando os status existentes
// ---------------------------------------------------------------
export const terminateService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        serviceId: z.string().uuid(),
        reason: z.enum(REASON_TUPLE),
        note: z.string().trim().max(1000).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<TerminateServiceResult> => {
    const { supabase, userId } = readContext(context);
    await requireManager(supabase, userId);

    const service = await loadService(supabase, data.serviceId);
    const targetStatus = TERMINATION_REASON_TARGET[data.reason];

    if (!isTransitionAllowed(service.status, targetStatus)) {
      throw new Error(
        `Transição inválida: ${CLIENT_SERVICE_STATUS_LABEL[service.status]} → ${CLIENT_SERVICE_STATUS_LABEL[targetStatus]}.`,
      );
    }

    const ongoing = await listOngoingServices(supabase, service.client_id);
    const otherActiveServices = ongoing.filter((s) => s.id !== service.id).length;

    const now = new Date().toISOString();
    const note = data.note?.trim() ? data.note.trim() : null;

    // Status + motivo + responsável + data. A trigger do banco registra o
    // evento de encerramento em `client_service_events`.
    // As colunas de encerramento ainda não existem nos tipos gerados do
    // Supabase (dependem da migração), por isso o client é usado sem tipo
    // aqui — o RLS do banco continua sendo a autoridade final.
    const { error: updateError } = await supabase
      .from("client_services")
      .update({
        status: targetStatus,
        termination_reason: data.reason,
        termination_note: note,
        terminated_by: userId,
        terminated_at: now,
      })
      .eq("id", service.id);
    if (updateError) {
      if (isMissingColumn(updateError)) {
        throw new Error(
          "Encerramento indisponível: a migração fase1a_encerramento_contratacoes ainda não foi aplicada no banco.",
        );
      }
      throw new Error(updateError.message);
    }

    return {
      ok: true,
      serviceId: service.id,
      status: targetStatus,
      reason: data.reason,
      message:
        otherActiveServices === 0
          ? "Contratação encerrada. O cliente não possui outras contratações em andamento e pode ser marcado como Inativo."
          : "Contratação encerrada com sucesso.",
      suggestsClientDeactivation: otherActiveServices === 0,
    };
  });

// ---------------------------------------------------------------
// setClientStatus — inativar/reativar cliente (sem tocar em arquivados)
// ---------------------------------------------------------------
export const setClientStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        clientId: z.string().uuid(),
        status: z.enum(["ativo", "inativo"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; status: ClientStatus }> => {
    const { supabase, userId } = readContext(context);
    await requireManager(supabase, userId);

    const { data: client, error } = await supabase
      .from("clients")
      .select("id, status")
      .eq("id", data.clientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!client) throw new Error("Cliente não encontrado.");
    if (client.status === "arquivado") {
      throw new Error("Clientes arquivados não têm o status alterado.");
    }
    if (client.status === data.status) {
      return { ok: true, status: data.status };
    }

    if (data.status === "inativo") {
      const ongoing = await listOngoingServices(supabase, client.id);
      if (ongoing.length > 0) {
        throw new Error(
          "Não é possível inativar: o cliente possui contratações em andamento (pendente, ativo ou pausado).",
        );
      }
    }

    const { error: updateError } = await supabase
      .from("clients")
      .update({ status: data.status })
      .eq("id", client.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true, status: data.status };
  });
