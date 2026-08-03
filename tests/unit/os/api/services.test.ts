import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createApplication, generateCredential, revokeApplication, ALLOWED_SCOPES } from '@/lib/os/api/services.server';

// Mock Supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockIn = vi.fn(() => ({ single: mockSingle }));
const mockEq = vi.fn(() => ({ single: mockSingle, in: mockIn }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockOrder = vi.fn(() => ({ single: mockSingle }));
const mockFrom = vi.fn(() => ({ insert: mockInsert, select: mockSelect, update: mockUpdate, order: mockOrder }));

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

  it('should generate a credential and return the secret only once', async () => {
    const appId = 'app-123';
    mockSingle.mockResolvedValueOnce({ data: { id: appId, client_id: 'vlt_app_123' }, error: null }); // get app
    mockSingle.mockResolvedValueOnce({ 
      data: { id: 'cred-123', key_id: 'vlt_key_123', status: 'active', created_at: new Date().toISOString() }, 
      error: null 
    }); // insert cred

    const result = await generateCredential(appId, 'user-123');
    
    expect(result.secret).toBeDefined();
    expect(result.secret).toHaveLength(64);
    expect(result.key_id).toBe('vlt_key_123');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      application_id: appId,
      encrypted_secret: expect.any(String),
    }));
  });

  it('should revoke an application and its credentials', async () => {
    const appId = 'app-123';
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ in: mockIn });
    
    await revokeApplication(appId, 'Security breach', 'admin-123');
    
    expect(mockFrom).toHaveBeenCalledWith('api_applications');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'revoked',
    }));
    
    expect(mockFrom).toHaveBeenCalledWith('api_credentials');
    expect(mockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'revoked',
    }));
  });
});
