import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    applicationId: z.string().optional(),
    method: z.string().optional(),
    period: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional()
  }).optional())
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./services.server");
    await assertAdmin(context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Manual join to avoid relationship errors between api_audit_logs, api_applications and profiles
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('api_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) throw logsError;

    const appIds = [...new Set((logs ?? []).map(l => l.application_id).filter((id): id is string => !!id))];

    let appsMap: Record<string, { id: string; display_name: string }> = {};

    if (appIds.length > 0) {
      const { data: apps } = await supabaseAdmin
        .from('api_applications')
        .select('id, display_name')
        .in('id', appIds);

      appsMap = (apps || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    }

    return (logs ?? []).map(log => ({
      ...log,
      application: log.application_id ? appsMap[log.application_id] ?? null : null,
    }));
  });
