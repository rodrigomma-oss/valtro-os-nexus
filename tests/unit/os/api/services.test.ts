import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createApplication, generateCredential, ALLOWED_SCOPES } from '@/lib/os/api/services.server';

// Mock Supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ insert: mockInsert, select: mockSelect }));

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('API Services Module', () => {
  beforeAll(() => {
    process.env.API_MASTER_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('should create an application with valid scopes', async () => {
    const params = {
      displayName: 'Test App',
      environment: 'development' as const,
      allowedScopes: ['support:tickets:create' as any],
      userId: 'user-123',
    };

    mockSingle.mockResolvedValueOnce({ data: { id: 'app-123', ...params }, error: null });

    const result = await createApplication(params);
    
    expect(mockFrom).toHaveBeenCalledWith('api_applications');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      display_name: 'Test App',
      client_id: expect.stringMatching(/^vlt_app_[a-z0-9]{24}$/),
    }));
    expect(result.id).toBe('app-123');
  });

  it('should fail to create an application with invalid scopes', async () => {
    const params = {
      displayName: 'Test App',
      environment: 'development' as const,
      allowedScopes: ['invalid:scope' as any],
      userId: 'user-123',
    };

    await expect(createApplication(params)).rejects.toThrow(/Escopos inválidos/);
  });
});
