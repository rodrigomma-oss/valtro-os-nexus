import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mocks de infraestrutura
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// 2. Mock do TanStack Router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: (path: string) => (options: any) => ({
    path,
    options,
  }),
  Outlet: () => null,
  redirect: (args: any) => ({ ...args, isRedirect: true }),
}));

// Mock do middleware
vi.mock('@/integrations/supabase/auth-middleware', () => ({
  requireSupabaseAuth: {
    server: (fn: any) => fn
  }
}));

// 3. Import do componente alvo
import { Route as AuthenticatedRoute } from '../../../src/routes/_authenticated';

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
    const mockUser = { id: 'new-google-user', email: 'test@gmail.com' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

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
    const rolesToTest = [['viewer'], ['operator'], ['admin']];
    
    for (const roles of rolesToTest) {
      const mockUser = { id: `user-with-${roles[0]}`, email: 'test@valtro.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

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
    const mockUser = { id: 'user-no-role', email: 'test@gmail.com' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext();
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    const result = await (AuthenticatedRoute as any).options.beforeLoad({
      location: { pathname: '/unauthorized', href: '/unauthorized' },
      context,
    });

    expect(result.user.id).toBe(mockUser.id);
  });
});
