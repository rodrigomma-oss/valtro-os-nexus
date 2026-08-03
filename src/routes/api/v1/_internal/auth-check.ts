import { createFileRoute } from '@tanstack/react-router';
import { authenticateRequest, authorize } from '@/lib/os/api/auth.server';
import { logApiRequest, logUnauthorizedAccess } from '@/lib/os/api/audit.server';

export const Route = createFileRoute('/api/v1/_internal/auth-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        
        // 1. Bloqueio server-side para produção
        const env = process.env.NODE_ENV;
        if (env === 'production') {
          return new Response(JSON.stringify({ error: 'Not Found' }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const requestId = crypto.randomUUID();

        // 2. Autenticação HMAC
        const authResult = await authenticateRequest(request);

        if ('error' in authResult) {
          await logUnauthorizedAccess(
            request.method,
            '/api/v1/_internal/auth-check',
            authResult.error.status,
            authResult.error.code,
            requestId,
            request.headers.get('x-forwarded-for') || undefined
          );

          return new Response(JSON.stringify({ 
            error: authResult.error.code,
            message: authResult.error.message
          }), { 
            status: authResult.error.status,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { context } = authResult;

        // 3. Validação de Escopo (Exemplo técnico)
        // Esta rota não exige escopos operacionais, apenas validação de identidade
        
        const durationMs = Date.now() - startTime;
        await logApiRequest({
          context,
          method: request.method,
          path: '/api/v1/_internal/auth-check',
          statusCode: 200,
          durationMs
        });

        return new Response(JSON.stringify({
          status: 'authenticated',
          identity: {
            applicationId: context.applicationId,
            clientId: context.clientId,
            environment: context.environment,
            keyId: context.keyId,
            scopes: context.scopes,
          },
          request: {
            id: context.requestId,
            timestamp: context.requestTimestamp,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});
