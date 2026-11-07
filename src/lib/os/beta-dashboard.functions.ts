/**
 * VOS-001G — Dashboard Operacional do Beta Fechado (server function).
 * Autenticada via requireSupabaseAuth, somente leitura, com Request ID.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readBetaOverview } from "@/lib/os/beta-dashboard.server";
import type { BetaOperationalOverview } from "@/lib/os/beta-dashboard";

export const getBetaOperationalOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BetaOperationalOverview> => {
    let requestId: string | null = null;
    try {
      requestId = getRequestHeader("x-request-id") ?? null;
    } catch {
      requestId = null;
    }

    const overview = await readBetaOverview(context.supabase as never);

    console.info(
      JSON.stringify({
        scope: "os.beta_dashboard",
        action: "overview",
        request_id: requestId,
        user_id: context.userId,
        attention_total: overview.counts.total,
        timeline: overview.timeline.length,
      }),
    );

    return overview;
  });
