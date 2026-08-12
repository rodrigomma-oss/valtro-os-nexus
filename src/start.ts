import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
// OPS-AUTH-002 — BLOCO 10B: substitui intencionalmente o `attachSupabaseAuth`
// gerado, que enviava RPCs sem bearer quando a sessão ainda não estava hidratada.
import { attachRequestScopedSupabaseAuth } from "@/integrations/supabase/auth-bearer";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachRequestScopedSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
