import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const diagFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Verificar Auth
    const { data: { user }, error: authError } = await context.supabase.auth.getUser();
    
    // 2. Tentar Query Directa
    const { data: feedbackRows, count, error: queryError } = await context.supabase
      .from("feedback")
      .select("*", { count: "exact" });

    return {
      auth: {
        userId: context.userId,
        email: context.claims?.email,
        userPresent: !!user,
        authError: authError?.message
      },
      query: {
        count: count || 0,
        rows: feedbackRows?.map(r => r.code) || [],
        error: queryError?.message
      }
    };
  });
