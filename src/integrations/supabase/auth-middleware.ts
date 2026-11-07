import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Missing Supabase environment variables.');
    }
    
    const request = getRequest();
    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Missing token');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Valida o token da requisição contra o Auth (revalidação real, não decode local).
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(`[AuthMiddleware] Auth validation failed: ${error?.message} (Code: ${error?.status || 'unknown'})`);
      
      // Se o token for inválido/expirado, retornamos 401 explícito.
      // O stack trace da mensagem de erro informada pelo usuário aponta para aqui.
      throw new Error(`Unauthorized: ${error?.message || 'Invalid session'}`);
    }

    /**
     * OPS-AUTH-002 — BLOCO 10B
     * `setSession({ access_token, refresh_token: '' })` foi removido após
     * confirmação de redundância: o header global `Authorization: Bearer <token>`
     * definido acima já é enviado em todas as chamadas PostgREST, e é exatamente
     * o mecanismo homologado em `request-client.server.ts` (OPS-INT-003 /
     * feedback, leads, bugs, participantes) — que nunca chamou `setSession` e
     * aplica `auth.uid()`/`auth.role()` corretamente nas policies de RLS.
     * Além disso, `refresh_token: ''` fazia o cliente tentar persistir/renovar
     * uma sessão inválida, podendo transformar um token válido em erro.
     */


    return next({
      context: {
        supabase,
        userId: user.id,
        claims: user,
      },
    });
  },
);
