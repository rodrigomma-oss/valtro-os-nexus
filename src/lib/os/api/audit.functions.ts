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
    const userIds = [...new Set(logs.map(l => l.user_id).filter((id): id is string => !!id))];

    let appsMap: Record<string, any> = {};
    let profilesMap: Record<string, string> = {};
    
    const [appsRes, profilesRes] = await Promise.all([
      appIds.length > 0 
        ? supabaseAdmin.from('api_applications').select('id, display_name').in('id', appIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
        : Promise.resolve({ data: [] })
    ]);
      
    appsMap = (appsRes.data || []).reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {});

    return logs.map(log => ({
      ...log,
      application: log.application_id ? appsMap[log.application_id] : null,
      user_full_name: log.user_id ? profilesMap[log.user_id] : null
    }));

  });
