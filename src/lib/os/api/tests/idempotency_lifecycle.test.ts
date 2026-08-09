import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiHandler, ApiPipelineError } from '../pipeline.server';
import * as idempotency from '../idempotency.server';

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
});
