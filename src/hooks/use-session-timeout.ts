import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SESSION_ACTIVITY_WRITE_THROTTLE_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_DURATION_MS,
  SESSION_TICK_INTERVAL_MS,
  SESSION_WARNING_MS,
} from "@/config/session";
import {
  clearSessionMarkers,
  ensureSessionStartedAt,
  getLastActivity,
  getSessionStartedAt,
  setLastActivity,
} from "@/lib/session";

export type SessionExpiryReason = "idle" | "max_duration";

export interface SessionTimeoutState {
  /** Verdadeiro quando o aviso pré-logout deve ser exibido. */
  warningOpen: boolean;
  /** Motivo do encerramento iminente. */
  reason: SessionExpiryReason | null;
  /** Segundos restantes até o logout automático. */
  secondsRemaining: number;
  /** Renova a sessão (só tem efeito quando o motivo é inatividade). */
  extendSession: () => void;
  /** Encerra a sessão imediatamente. */
  signOutNow: () => void;
}

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "click",
  "keydown",
  "scroll",
  "wheel",
  "touchstart",
] as const;

/**
 * Controle inteligente de sessão do painel autenticado.
 *
 * Arquitetura:
 * - Marcadores de tempo vivem em `localStorage`, portanto todas as abas
 *   compartilham o mesmo relógio de inatividade e o mesmo início de sessão.
 * - Um único tick de 1s avalia os dois limites (inatividade e duração máxima),
 *   evitando timers concorrentes por evento.
 * - O logout usa `supabase.auth.signOut()`, cujo evento `SIGNED_OUT` já é
 *   propagado pelo Supabase para as demais abas.
 */
export function useSessionTimeout(): SessionTimeoutState {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const href = useRouterState({ select: (s) => s.location.href });

  const [warningOpen, setWarningOpen] = useState(false);
  const [reason, setReason] = useState<SessionExpiryReason | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const warningOpenRef = useRef(false);
  const lastWriteRef = useRef(0);
  const signingOutRef = useRef(false);

  warningOpenRef.current = warningOpen;

  const recordActivity = useCallback((force = false) => {
    // Enquanto o aviso está aberto, movimentos do mouse não devem renovar
    // a sessão silenciosamente: exige-se ação explícita do usuário.
    if (!force && warningOpenRef.current) return;
    const now = Date.now();
    if (!force && now - lastWriteRef.current < SESSION_ACTIVITY_WRITE_THROTTLE_MS) return;
    lastWriteRef.current = now;
    setLastActivity(now);
  }, []);

  const performSignOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      clearSessionMarkers();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[session] falha ao encerrar sessão", error);
    } finally {
      setWarningOpen(false);
      navigate({ to: "/auth", replace: true });
      signingOutRef.current = false;
    }
  }, [navigate, queryClient]);

  const extendSession = useCallback(() => {
    setWarningOpen(false);
    setReason(null);
    recordActivity(true);
  }, [recordActivity]);

  // Inicialização + escuta de eventos de autenticação.
  useEffect(() => {
    ensureSessionStartedAt();
    recordActivity(true);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearSessionMarkers();
        setWarningOpen(false);
      }
      if (event === "SIGNED_IN") {
        clearSessionMarkers();
        ensureSessionStartedAt();
        recordActivity(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [recordActivity]);

  // Atividade do usuário (mouse, teclado, scroll, clique, toque).
  useEffect(() => {
    const handler = () => recordActivity();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handler, { passive: true }),
    );
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handler));
    };
  }, [recordActivity]);

  // Navegação entre páginas conta como atividade.
  useEffect(() => {
    recordActivity(true);
  }, [href, recordActivity]);

  // Tick único de avaliação dos limites.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const lastActivity = getLastActivity() ?? now;
      const startedAt = getSessionStartedAt() ?? ensureSessionStartedAt(now);

      const idleDeadline = lastActivity + SESSION_IDLE_TIMEOUT_MS;
      const maxDeadline = startedAt + SESSION_MAX_DURATION_MS;
      const isMax = maxDeadline <= idleDeadline;
      const deadline = isMax ? maxDeadline : idleDeadline;
      const remaining = deadline - now;

      if (remaining <= 0) {
        void performSignOut();
        return;
      }

      if (remaining <= SESSION_WARNING_MS) {
        setReason(isMax ? "max_duration" : "idle");
        setSecondsRemaining(Math.max(1, Math.ceil(remaining / 1000)));
        setWarningOpen(true);
      } else if (warningOpenRef.current) {
        setWarningOpen(false);
        setReason(null);
      }
    };

    const id = window.setInterval(tick, SESSION_TICK_INTERVAL_MS);
    tick();
    return () => window.clearInterval(id);
  }, [performSignOut]);

  return {
    warningOpen,
    reason,
    secondsRemaining,
    extendSession,
    signOutNow: () => void performSignOut(),
  };
}
