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
  return {
    createFileRoute: (path: string) => (options: any) => ({
      path,
      options,
    }),
    Outlet: () => null,
    redirect: (args: any) => ({ ...args, isRedirect: true }),
  };
});

// Agora importamos o componente usando o caminho relativo correto
import { Route as AuthenticatedRoute } from '../../src/routes/_authenticated';

const createMockContext = () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
});

describe('OPS-AUTH-002 — Admission Gate Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('A. Google novo sem convite (sem role) -> should redirect to /unauthorized', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockUser = { id: 'new-google-user', email: 'test@gmail.com' };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    try {
      await (AuthenticatedRoute as any).options.beforeLoad({
        location: { pathname: '/os/dashboard', href: '/os/dashboard' },
        context,
      });
      throw new Error('Should have thrown redirect');
    } catch (e: any) {
      expect(e.to).toBe('/unauthorized');
    }
  });

  it('C, D, E. Usuário existente com role -> should allow access', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const rolesToTest = [['viewer'], ['operator'], ['admin']];
    
    for (const roles of rolesToTest) {
      const mockUser = { id: `user-with-${roles[0]}`, email: 'test@valtro.com' };
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

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
    const { supabase } = await import('@/integrations/supabase/client');
    const mockUser = { id: 'user-no-role', email: 'test@gmail.com' };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    const result = await (AuthenticatedRoute as any).options.beforeLoad({
      location: { pathname: '/unauthorized', href: '/unauthorized' },
      context,
    });

    expect(result.user.id).toBe(mockUser.id);
  });
  
  it('H. Metadata arbitrária não cria role no frontend', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockUser = { 
      id: 'hacker-user', 
      email: 'hacker@gmail.com',
      user_metadata: { role: 'admin' }
    };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    try {
      await (AuthenticatedRoute as any).options.beforeLoad({
        location: { pathname: '/os/dashboard', href: '/os/dashboard' },
        context,
      });
      throw new Error('Should have thrown redirect');
    } catch (e: any) {
      expect(e.to).toBe('/unauthorized');
    }
  });
});
