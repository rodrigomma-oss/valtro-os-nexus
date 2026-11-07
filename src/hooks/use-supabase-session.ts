/**
 * OPS-AUTH-002 — BLOCO 10B
 * Hook mínimo de estado de sessão para gatear queries autenticadas.
 * Não altera o fluxo de autenticação: apenas observa.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export function useSupabaseSession(): { status: SessionStatus } {
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setStatus(data.session ? "authenticated" : "unauthenticated");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { status };
}
