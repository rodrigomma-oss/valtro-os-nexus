/**
 * Sprint 14.1 (etapa final) — Execução agendada do worker (server-only).
 *
 * Duas responsabilidades, ambas de segurança:
 *
 * 1. Autenticação do chamador: o pg_cron envia
 *    `Authorization: Bearer <GOOGLE_CALENDAR_CRON_SECRET>`. A comparação é
 *    feita em tempo constante sobre digests SHA-256, para que nem o
 *    conteúdo nem o comprimento do segredo vazem por timing. O segredo é
 *    lido de `process.env` dentro do handler e jamais é retornado, logado
 *    ou enviado ao navegador.
 *
 * 2. Concorrência: um lease curto (`worker_running_until`) adquirido de
 *    forma atômica em um único UPDATE condicional. Uma segunda chamada
 *    enquanto houver execução ativa retorna `skipped: "lease_ativo"` sem
 *    tocar na fila. Se o processo morrer, o lease expira sozinho — não há
 *    estado preso. A idempotência do worker (ids determinísticos) continua
 *    como segunda linha de defesa.
 */
import { createHash, timingSafeEqual } from "node:crypto";

import { loadIntegration } from "./client.server";
import { runCalendarSyncWorker, type SyncResult } from "./worker.server";

/** Janela do lease: folga confortável sobre um lote de 25 itens. */
const LEASE_SECONDS = 90;

/** Comparação em tempo constante, independente do comprimento das entradas. */
export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Extrai o token do header `Authorization: Bearer <token>`. */
export function readBearer(header: string | null): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join("");
  return token.length > 0 ? token : null;
}

export interface ScheduledSyncResult extends SyncResult {
  lease: "adquirido" | "ocupado" | "sem_integracao";
}

/**
 * Executa uma rodada agendada. Nunca lança: o cron não pode ficar em erro
 * permanente por uma indisponibilidade momentânea do Google.
 */
export async function runScheduledSync(origin: string): Promise<ScheduledSyncResult> {
  const empty: SyncResult = { processed: 0, synced: 0, removed: 0, failed: 0, skipped: null };
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  let integrationId: string | null = null;
  try {
    const integration = await loadIntegration(admin);
    integrationId = integration?.id ?? null;
  } catch {
    integrationId = null;
  }

  if (!integrationId) {
    return { ...empty, lease: "sem_integracao", skipped: "Integração não configurada." };
  }

  // ---- Aquisição atômica do lease (vence quem escrever primeiro) ----
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_SECONDS * 1000).toISOString();
  const { data: acquired, error: leaseError } = await admin
    .from("calendar_integrations")
    .update({ worker_running_until: until })
    .eq("id", integrationId)
    .or(`worker_running_until.is.null,worker_running_until.lt.${now.toISOString()}`)
    .select("id");

  if (leaseError) {
    return { ...empty, lease: "ocupado", skipped: leaseError.message };
  }
  if (!acquired || acquired.length === 0) {
    return { ...empty, lease: "ocupado", skipped: "lease_ativo" };
  }

  let result: SyncResult;
  try {
    result = await runCalendarSyncWorker(origin);
  } catch (error) {
    result = { ...empty, skipped: (error as Error).message };
  } finally {
    // Liberação garantida em sucesso e em falha.
    await admin
      .from("calendar_integrations")
      .update({
        worker_running_until: null,
        last_cron_run_at: new Date().toISOString(),
        last_cron_result: (result! ?? empty) as unknown as Record<string, unknown>,
      })
      .eq("id", integrationId);
  }

  return { ...result, lease: "adquirido" };
}

/**
 * Copia o segredo do runtime do servidor para o Vault do banco, de onde o
 * pg_cron o resolve em tempo de execução. O valor nunca passa pelo
 * navegador, pelo comando do cron, por migração ou por log.
 */
export async function provisionCronSecret(): Promise<void> {
  const value = process.env.GOOGLE_CALENDAR_CRON_SECRET;
  if (!value) throw new Error("GOOGLE_CALENDAR_CRON_SECRET não está configurado no servidor.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("set_calendar_cron_secret", { _value: value });
  if (error) throw new Error(`Falha ao gravar o segredo do cron no cofre: ${error.message}`);
}
