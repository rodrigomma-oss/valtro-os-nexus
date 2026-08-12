/**
 * OPS-AUTH-002 — BLOCO 10B
 *
 * Middleware de função (client) que anexa o bearer token da sessão do
 * navegador a TODA chamada de Server Function, de forma request-scoped.
 *
 * Por que substituir o `attachSupabaseAuth` gerado:
 * o gerado chama `supabase.auth.getSession()` uma única vez e, se a sessão
 * ainda não estiver hidratada (primeiro paint após o retorno do Google OAuth,
 * ou durante SSR), envia a RPC SEM `Authorization` — o servidor então rejeita
 * com `Unauthorized: Missing token`. Aqui aguardamos brevemente a hidratação
 * e, se necessário, tentamos um refresh explícito antes de seguir.
 *
 * Não altera Google OAuth, /auth, roles, RLS, gate de admissão nem o banner.
 */
import { createMiddleware } from '@tanstack/react-start';
import { supabase } from './client';

/** Aguarda a hidratação da sessão no cliente (localStorage) por até ~1.2s. */
async function resolveAccessToken(): Promise<string | null> {
  // Durante SSR não existe sessão de navegador para propagar.
  if (typeof window === 'undefined') return null;

  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  // Sessão ainda não hidratada: espera o evento INITIAL_SESSION/SIGNED_IN.
  const viaEvent = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, 1200);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(session.access_token);
      }
    });
  });
  if (viaEvent) return viaEvent;

  // Último recurso: token expirado em memória — tenta renovar silenciosamente.
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

export const attachRequestScopedSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const token = await resolveAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
