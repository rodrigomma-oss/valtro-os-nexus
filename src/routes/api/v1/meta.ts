import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/v1/meta')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestId = `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        
        try {
          // Busca a versão estável atual (v1)
          const { data: version, error } = await supabaseAdmin
            .from('api_versions')
            .select('version_code, status, released_at, deprecated_at, sunset_at, replacement_version_id')
            .eq('version_code', 'v1')
            .single();

          if (error || !version) {
            return new Response(JSON.stringify({
              success: false,
              error: 'API version information not found',
              requestId
            }), {
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
              }
            });
          }

          // Se a versão estiver desabilitada, retorna 503
          if (version.status === 'disabled') {
            return new Response(JSON.stringify({
              success: false,
              error: 'API version is disabled',
              requestId
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const responseData = {
            success: true,
            data: {
              version: version.version_code,
              status: version.status,
              deprecated: version.status === 'deprecated' || version.status === 'sunset',
              releasedAt: version.released_at,
              deprecationAt: version.deprecated_at,
              sunsetAt: version.sunset_at,
              replacementVersion: version.replacement_version_id
            },
            requestId
          };

          const headers = new Headers({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            'X-Valtro-API-Version': version.version_code,
            'X-Valtro-Request-ID': requestId
          });

          // Headers de depreciação se aplicável
          if (version.deprecated_at) {
            headers.set('Deprecation', new Date(version.deprecated_at).toUTCString());
          }
          if (version.sunset_at) {
            headers.set('Sunset', new Date(version.sunset_at).toUTCString());
          }

          return new Response(JSON.stringify(responseData), {
            status: 200,
            headers
          });

        } catch (err) {
          console.error('[API-META-ERROR]', err);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            requestId
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
