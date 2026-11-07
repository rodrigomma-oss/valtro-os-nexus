import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const debugRLS = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: feedback, error } = await context.supabase
      .from("feedback")
      .select("id, code, title");
    
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role");

    return {
      userId: context.userId,
      feedbackCount: feedback?.length || 0,
      feedbackError: error?.message,
      roles: roles
    };
  });
