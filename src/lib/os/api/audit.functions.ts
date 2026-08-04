import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAuditLogs = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    applicationId: z.string().optional(),
    method: z.string().optional(),
    period: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional()
  }).optional())
  .handler(async ({ data }) => {
    // Manual join to avoid relationship errors between api_audit_logs, api_applications and profiles
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('api_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) throw logsError;

    // Fetch associated applications
    const appIds = [...new Set(logs.map(l => l.application_id).filter((id): id is string => !!id))];
    // The logs don't have user_id, they have created_by implicitly or we use only application context
    // Actually, looking at types.ts, api_audit_logs doesn't have a user_id or created_by.
    // However, applications have created_by.
    
    let appsMap: Record<string, any> = {};
    
    if (appIds.length > 0) {
      const { data: apps } = await supabaseAdmin
        .from('api_applications')
        .select('id, display_name')
        .in('id', appIds);
      
      appsMap = (apps || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    }

    return logs.map(log => ({
      ...log,
      application: log.application_id ? appsMap[log.application_id] : null,
    }));


  });
