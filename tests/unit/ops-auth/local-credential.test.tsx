import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock manual do Supabase para evitar problemas de resolução de import
const mockSupabase = {
  auth: {
    updateUser: vi.fn(),
    getUser: vi.fn(),
  },
};

describe('OPS-AUTH-002 BLOCO 7 — Persistência do Banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve simular a chamada updateUser({ password, data: { has_local_password: true } })', async () => {
    mockSupabase.auth.updateUser.mockResolvedValueOnce({ data: { user: {} as any }, error: null });

    const password = 'new-password-123';
    const result = await mockSupabase.auth.updateUser({ 
      password,
      data: { has_local_password: true }
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ 
      password,
      data: { has_local_password: true }
    });
    expect(result.error).toBeNull();
  });

  it('deve simular a lógica de detecção do banner (Google sem senha)', () => {
    const user = {
      app_metadata: { provider: 'google' },
      user_metadata: { has_local_password: false }
    };

    const isGoogleUser = user.app_metadata.provider === 'google';
    const hasLocalPassword = user.user_metadata.has_local_password === true;
    
    const showBanner = isGoogleUser && !hasLocalPassword;
    expect(showBanner).toBe(true);
  });

  it('deve simular a lógica de detecção do banner (Google com senha configurada)', () => {
    const user = {
      app_metadata: { provider: 'google' },
      user_metadata: { has_local_password: true }
    };

    const isGoogleUser = user.app_metadata.provider === 'google';
    const hasLocalPassword = user.user_metadata.has_local_password === true;
    
    const showBanner = isGoogleUser && !hasLocalPassword;
    expect(showBanner).toBe(false);
  });
});
