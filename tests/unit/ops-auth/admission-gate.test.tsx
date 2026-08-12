import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks manuais antes de importar o componente para evitar falhas de resolução de ambiente
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock do TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    redirect: (args: any) => args, // Simplesmente retorna o objeto para validação
  };
});

// Agora importamos o componente
import { Route as AuthenticatedRoute } from '../../../src/routes/_authenticated';

const createMockContext = () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
});

describe('OPS-AUTH-002 — Admission Gate Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetando os mocks do supabase importado
    const { supabase } = require('@/integrations/supabase/client');
    supabase.auth.getUser.mockReset();
    supabase.auth.signOut.mockReset();
    supabase.from().select().eq.mockReset();
  });

  it('A. Google novo sem convite (sem role) -> should redirect to /unauthorized', async () => {
    const { supabase } = require('@/integrations/supabase/client');
    const mockUser = { id: 'new-google-user', email: 'test@gmail.com' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    const result = await (AuthenticatedRoute as any).options.beforeLoad({
      location: { pathname: '/os/dashboard', href: '/os/dashboard' },
      context,
    });
    
    // Como mockamos redirect para retornar o objeto
    expect(result.to).toBe('/unauthorized');
  });

  it('C, D, E. Usuário existente com role -> should allow access', async () => {
    const { supabase } = require('@/integrations/supabase/client');
    const rolesToTest = [['viewer'], ['operator'], ['admin']];
    
    for (const roles of rolesToTest) {
      const mockUser = { id: `user-with-${roles[0]}`, email: 'test@valtro.com' };
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const context = createMockContext();
      (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles });

      const result = await (AuthenticatedRoute as any).options.beforeLoad({
        location: { pathname: '/os/dashboard', href: '/os/dashboard' },
        context,
      });

      expect(result.user.id).toBe(mockUser.id);
    }
  });

  it('G. Loop redirect prevention -> should not throw if already on /unauthorized', async () => {
    const { supabase } = require('@/integrations/supabase/client');
    const mockUser = { id: 'user-no-role', email: 'test@gmail.com' };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    const result = await (AuthenticatedRoute as any).options.beforeLoad({
      location: { pathname: '/unauthorized', href: '/unauthorized' },
      context,
    });

    expect(result.user.id).toBe(mockUser.id);
  });
  
  it('H. Metadata arbitrária não cria role no frontend -> visual verification', async () => {
    // A role no frontend vem de user_roles no banco, não do metadado do JWT
    // Este teste garante que a lógica de query é executada e não depende do user object
    const { supabase } = require('@/integrations/supabase/client');
    const mockUser = { 
      id: 'hacker-user', 
      email: 'hacker@gmail.com',
      user_metadata: { role: 'admin' } // Tentativa de injeção no metadado
    };
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    // O banco retorna vazio apesar do metadado no objeto user
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    const result = await (AuthenticatedRoute as any).options.beforeLoad({
      location: { pathname: '/os/dashboard', href: '/os/dashboard' },
      context,
    });

    expect(result.to).toBe('/unauthorized');
  });
});
