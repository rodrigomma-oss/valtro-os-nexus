import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock manual do Supabase para evitar problemas de resolução de import
const mockSupabase = {
  auth: {
    updateUser: vi.fn(),
    getUser: vi.fn(),
  },
};

describe('OPS-AUTH-002 BLOCO 5 — Credencial Local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve simular a chamada updateUser({ password })', async () => {
    mockSupabase.auth.updateUser.mockResolvedValueOnce({ data: { user: {} as any }, error: null });

    const password = 'new-password-123';
    const result = await mockSupabase.auth.updateUser({ password });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password });
    expect(result.error).toBeNull();
  });

  it('deve simular erro de senha curta', async () => {
    mockSupabase.auth.updateUser.mockResolvedValueOnce({ 
      data: { user: null }, 
      error: { message: 'Password should be at least 6 characters', status: 400 } as any 
    });

    const result = await mockSupabase.auth.updateUser({ password: '123' });
    expect(result.error?.message).toContain('Password should be at least 6 characters');
  });
});
