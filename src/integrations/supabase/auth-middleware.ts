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

    // CRITICAL: We MUST establish session state for the client so PostgREST applies auth.uid()
    // and auth.role() in RLS policies. Manual headers alone are sometimes insufficient 
    // depending on how the listener is configured.
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error(`[AuthMiddleware] Auth validation failed: ${error?.message}`);
      throw new Error('Unauthorized: Invalid session');
    }

    // Force set session for the client instance
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    return next({
      context: {
        supabase,
        userId: user.id,
        claims: user,
      },
    });
  },
);
