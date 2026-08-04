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
    let query = supabaseAdmin
      .from('api_audit_logs')
      .select(`
        *,
        application:api_applications(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data?.applicationId) {
      query = query.eq('application_id', data.applicationId);
    }
    
    if (data?.method) {
      query = query.eq('method', data.method);
    }

    if (data?.period?.from) {
      query = query.gte('created_at', data.period.from);
    }

    if (data?.period?.to) {
      query = query.lte('created_at', data.period.to);
    }

    const { data: logs, error } = await query;

    if (error) throw error;
    return logs;
  });
