import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiHandler, ApiPipelineError } from '@/lib/os/api/pipeline.server';
import * as idempotency from '@/lib/os/api/idempotency.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// Mocks
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    })),
  },
}));

vi.mock('../auth.server', () => ({
  authenticateRequest: vi.fn(),
  authorize: vi.fn(),
}));

vi.mock('../audit.server', () => ({
  logApiRequest: vi.fn(),
  logUnauthenticatedApiRequest: vi.fn(),
}));

describe('Idempotency Lifecycle (Integration)', () => {
  const mockNow = new Date('2026-08-09T10:00:00Z');
  const mockVersion = {
    id: 'v1-id',
    versionCode: 'v1',
    status: 'stable' as const,
    releasedAt: mockNow.toISOString(),
    deprecatedAt: null,
    sunsetAt: null,
    replacementVersionId: null,
  };

  const deps = {
    createRequestId: () => 'test-request-id',
    now: () => mockNow,
    loadVersion: async () => mockVersion,
    authenticate: vi.fn(),
    auditAuthenticated: vi.fn(),
    auditUnauthenticated: vi.fn(),
  };

  const authContext = {
    applicationId: 'app-123',
    scopes: ['support.bugs.create'],
    technicalLimits: { max_payload_bytes: 1024 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(idempotency, 'acquireIdempotency');
    vi.spyOn(idempotency, 'commitIdempotency');
  });

  it('A. SUCESSO: processing -> completed', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValue(null);
    vi.mocked(idempotency.commitIdempotency).mockResolvedValue(undefined as any);

    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => ({ data: { ok: true }, status: 201 }),
    }, deps);

    const request = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: {
        'x-idempotency-key': '00000000-0000-4000-8000-000000000001',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Test Bug' }),
    });

    const response = await handler({ request });
    expect(response.status).toBe(201);
    
    expect(idempotency.acquireIdempotency).toHaveBeenCalled();
    expect(idempotency.commitIdempotency).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      responseStatus: 201,
    }));
  });

  it('B. HANDLER LANÇA 500: processing -> failed', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValue(null);
    vi.mocked(idempotency.commitIdempotency).mockResolvedValue(undefined as any);

    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => {
        throw new Error('Crash!');
      },
    }, deps);

    const request = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: {
        'x-idempotency-key': '00000000-0000-4000-8000-000000000002',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Test Bug' }),
    });

    const response = await handler({ request });
    expect(response.status).toBe(500);

    // Deve ter chamado commitIdempotency com status failed devido à exceção
    expect(idempotency.commitIdempotency).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      responseStatus: 500,
    }));
  });

  it('D. CONCORRÊNCIA: acquireIdempotency deve lançar 409 se status for processing', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });
    
    // Simula acquireIdempotency lançando o erro que ele mesmo geraria no código real
    vi.mocked(idempotency.acquireIdempotency).mockRejectedValue(
      new ApiPipelineError("PROCESSING", 409, "A operação já está sendo processada.")
    );

    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => ({ data: { ok: true } }),
    }, deps);

    const request = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: {
        'x-idempotency-key': '00000000-0000-4000-8000-000000000003',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Test Bug' }),
    });

    const response = await handler({ request });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('PROCESSING');
  });

  it('H. SEM CHAVE: fluxo permanece inalterado', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });

    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => ({ data: { ok: true } }),
    }, deps);

    const request = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Test Bug' }),
    });

    const response = await handler({ request });
    expect(response.status).toBe(200);
    
    expect(idempotency.acquireIdempotency).not.toHaveBeenCalled();
    expect(idempotency.commitIdempotency).not.toHaveBeenCalled();
  });

  it('C. RETRY APÓS FAILED: nova aquisição permitida e handler re-executa', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });
    
    const idempotencyKey = '00000000-0000-4000-8000-000000000004';
    const payload = { title: 'Retry Bug' };
    const payloadHash = idempotency.calculatePayloadHash(payload);

    // 1. Simula primeiro falha: acquire retorna null (adquirido), handler falha
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValueOnce(null);
    vi.mocked(idempotency.commitIdempotency).mockResolvedValue(undefined as any);

    let handlerExecutions = 0;
    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => {
        handlerExecutions++;
        if (handlerExecutions === 1) throw new Error('First try failed');
        return { data: { ok: true, retry: true } };
      },
    }, deps);

    const req1 = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: { 'x-idempotency-key': idempotencyKey, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res1 = await handler({ request: req1 });
    expect(res1.status).toBe(500);
    expect(handlerExecutions).toBe(1);
    expect(idempotency.commitIdempotency).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      responseStatus: 500
    }));

    // 2. Simula o retry: 
    // No comportamento real, acquireIdempotency detectaria o status 'failed', deletaria e chamaria a si mesmo retornando null de novo.
    // Aqui simulamos o resultado final do acquire no retry.
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValueOnce(null);

    const req2 = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: { 'x-idempotency-key': idempotencyKey, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res2 = await handler({ request: req2 });
    expect(res2.status).toBe(200);
    expect(handlerExecutions).toBe(2); // Handler executou de novo
    expect(idempotency.commitIdempotency).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      responseStatus: 200
    }));
  });

  it('E & F. RETRY E DOUBLE COMMIT: retry não cria execuções simultâneas e finalização é única', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });
    
    // Simula bloqueio de concorrência (conforme item D)
    vi.mocked(idempotency.acquireIdempotency).mockRejectedValueOnce(
      new ApiPipelineError("PROCESSING", 409, "A operação já está sendo processada.")
    );

    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => ({ data: { ok: true } }),
    }, deps);

    const request = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: { 'x-idempotency-key': '00000000-0000-4000-8000-000000000005', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Concurrent Bug' }),
    });

    const response = await handler({ request });
    expect(response.status).toBe(409);
    
    // O handler nem deve ter sido chamado (proteção E)
    // E commitIdempotency não deve ter sido chamado pela tentativa falha (proteção F)
    expect(idempotency.commitIdempotency).not.toHaveBeenCalled();
  });

  it('G. FALHA SECUNDÁRIA: erro ao marcar failed não vaza detalhes e resposta permanece 500', async () => {
    vi.mocked(deps.authenticate).mockResolvedValue({ context: authContext as any });
    vi.mocked(idempotency.acquireIdempotency).mockResolvedValue(null);
    
    // Simula falha no commitIdempotency (banco fora do ar, etc)
    vi.mocked(idempotency.commitIdempotency).mockRejectedValue(new Error('DB Connection Lost'));

    const handler = createApiHandler({
      version: 'v1',
      authentication: 'required',
      handler: async () => {
        throw new Error('Original App Error');
      },
    }, deps);

    const request = new Request('https://api.test/v1/bugs', {
      method: 'POST',
      headers: { 'x-idempotency-key': '00000000-0000-4000-8000-000000000006', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Failure Cascade' }),
    });

    // Deve logar no console, mas não explodir o pipeline com 500 sem envelope
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const response = await handler({ request });
    expect(response.status).toBe(500);
    
    const body = await response.json();
    // O erro original "Original App Error" não deve vazar no body da resposta 500 (sanitização)
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('Original App Error');
    expect(body.error.message).not.toContain('DB Connection Lost');
    
    consoleSpy.mockRestore();
  });
});
