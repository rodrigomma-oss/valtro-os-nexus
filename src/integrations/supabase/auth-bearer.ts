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

  // 1. Tenta pegar a sessão síncrona/cacheada primeiro.
  const { data: initial } = await supabase.auth.getSession();
  
  // Verifica validade (margem de 10s para evitar race conditions no server).
  const isExpired = (session: any) => {
    if (!session?.expires_at) return true;
    return session.expires_at <= Math.floor(Date.now() / 1000) + 10;
  };

  if (initial.session && !isExpired(initial.session)) {
    return initial.session.access_token;
  }

  // 2. Se não tem sessão ou está expirada, aguarda hidratação/evento.
  const viaEvent = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, 2500); // Aumentado para 2.5s para conexões lentas pós-OAuth

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Aceita SIGNED_IN ou INITIAL_SESSION com token válido.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.access_token && !isExpired(session)) {
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(session.access_token);
      }
    });
  });

  if (viaEvent) return viaEvent;

  // 3. Último recurso: tenta refresh explícito se o evento demorou.
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed.session && !isExpired(refreshed.session)) {
    return refreshed.session.access_token;
  }

  return null;
}

export const attachRequestScopedSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const token = await resolveAccessToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
