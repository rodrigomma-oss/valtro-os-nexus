/**
 * Sprint 14.1 — API do CRM para a integração com o Google Calendar.
 *
 * Este arquivo é um invólucro fino: nenhuma lógica de runtime vive aqui,
 * apenas declarações de server functions (exigência do splitter do
 * TanStack Start). A implementação está em `google-calendar/*.server.ts`,
 * que jamais entra no bundle do navegador.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AvailableCalendar, IntegrationStatus } from "@/lib/google-calendar/admin.server";
import type { SyncResult } from "@/lib/google-calendar/worker.server";

export type { AvailableCalendar, IntegrationStatus, SyncResult };

export const getCalendarIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationStatus> => {
    const { assertAdmin, readStatus } = await import("@/lib/google-calendar/admin.server");
    await assertAdmin(context.supabase, context.userId);
    return readStatus(context.supabase);
  });

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { assertAdmin, startAuthorization } = await import("@/lib/google-calendar/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const origin = getRequestHeader("origin") ?? `https://${getRequestHeader("host") ?? ""}`;
    return { url: await startAuthorization(context.userId, origin) };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { assertAdmin, disconnectIntegration } = await import(
      "@/lib/google-calendar/admin.server"
    );
    await assertAdmin(context.supabase, context.userId);
    await disconnectIntegration();
    return { ok: true };
  });

export const listGoogleCalendars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailableCalendar[]> => {
    const { assertAdmin, fetchAvailableCalendars } = await import(
      "@/lib/google-calendar/admin.server"
    );
    await assertAdmin(context.supabase, context.userId);
    return fetchAvailableCalendars();
  });

export const selectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ calendar_id: z.string().min(1), summary: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { assertAdmin, selectCalendar } = await import("@/lib/google-calendar/admin.server");
    await assertAdmin(context.supabase, context.userId);
    await selectCalendar(data.calendar_id, data.summary);
    return { ok: true };
  });

export const retryCalendarSyncFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ link_id: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }): Promise<{ requeued: number }> => {
    const { assertAdmin, requeueFailures } = await import("@/lib/google-calendar/admin.server");
    await assertAdmin(context.supabase, context.userId);
    return { requeued: await requeueFailures(data.link_id) };
  });

/**
 * Copia o segredo do cron do runtime do servidor para o cofre do banco.
 * Admin-only e idempotente. Nunca devolve o valor.
 */
export const provisionCalendarCronSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { assertAdmin } = await import("@/lib/google-calendar/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { provisionCronSecret } = await import("@/lib/google-calendar/cron.server");
    await provisionCronSecret();
    return { ok: true };
  });

/**
 * Executa a fila. Autenticado (qualquer papel), porque é disparado logo após
 * as ações de follow-up. Nunca lança: uma falha do Google jamais pode
 * quebrar a tela do lead.
 */
export const runCalendarSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<SyncResult> => {
    const { runCalendarSyncWorker } = await import("@/lib/google-calendar/worker.server");
    const origin = getRequestHeader("origin") ?? `https://${getRequestHeader("host") ?? ""}`;
    try {
      return await runCalendarSyncWorker(origin);
    } catch (error) {
      console.error("[google-calendar] worker falhou", error);
      return {
        processed: 0,
        synced: 0,
        removed: 0,
        failed: 0,
        skipped: (error as Error).message,
      };
    }
  });
