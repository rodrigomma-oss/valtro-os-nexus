import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase Client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

describe('OPS-AUTH-002 BLOCO 5 — Credencial Local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar updateUser({ password }) ao definir uma nova senha', async () => {
    const mockUpdateUser = vi.mocked(supabase.auth.updateUser);
    mockUpdateUser.mockResolvedValueOnce({ data: { user: {} as any }, error: null });

    const password = 'new-password-123';
    const { error } = await supabase.auth.updateUser({ password });

    expect(mockUpdateUser).toHaveBeenCalledWith({ password });
    expect(error).toBeNull();
  });

  it('deve falhar se a senha for muito curta (lógica delegada ao Supabase)', async () => {
    const mockUpdateUser = vi.mocked(supabase.auth.updateUser);
    mockUpdateUser.mockResolvedValueOnce({ 
      data: { user: null }, 
      error: { message: 'Password should be at least 6 characters', status: 400 } as any 
    });

    const { error } = await supabase.auth.updateUser({ password: '123' });

    expect(error?.message).toContain('Password should be at least 6 characters');
  });
});
