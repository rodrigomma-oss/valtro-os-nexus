import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { Route as AuthenticatedRoute } from '@/routes/_authenticated';

// Mocks
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

// Mock do TanStack Router context
const createMockContext = (userId?: string) => ({
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
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext(mockUser.id);
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    try {
      await (AuthenticatedRoute as any).options.beforeLoad({
        location: { pathname: '/os/dashboard', href: '/os/dashboard' },
        context,
      });
      throw new Error('Should have redirected');
    } catch (e: any) {
      // TanStack redirect error object check
      expect(e.to).toBe('/unauthorized');
    }
  });

  it('C, D, E. Usuário existente com role (viewer, operator, admin) -> should allow access', async () => {
    const rolesToTest = [['viewer'], ['operator'], ['admin'], ['admin', 'operator']];
    
    for (const roles of rolesToTest) {
      const mockUser = { id: `user-with-${roles[0]}`, email: 'test@valtro.com' };
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

      const context = createMockContext(mockUser.id);
      (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles });

      const result = await (AuthenticatedRoute as any).options.beforeLoad({
        location: { pathname: '/os/dashboard', href: '/os/dashboard' },
        context,
      });

      expect(result.user.id).toBe(mockUser.id);
    }
  });

  it('F. Profile existe mas sem role -> should redirect to /unauthorized', async () => {
    const mockUser = { id: 'user-with-profile-no-role', email: 'test@valtro.com' };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext(mockUser.id);
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    try {
      await (AuthenticatedRoute as any).options.beforeLoad({
        location: { pathname: '/os/dashboard', href: '/os/dashboard' },
        context,
      });
      throw new Error('Should have redirected');
    } catch (e: any) {
      expect(e.to).toBe('/unauthorized');
    }
  });

  it('G. Loop redirect prevention -> should not throw if already on /unauthorized', async () => {
     const mockUser = { id: 'user-no-role', email: 'test@gmail.com' };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null });

    const context = createMockContext(mockUser.id);
    (context.queryClient.ensureQueryData as any).mockResolvedValue({ roles: [] });

    const result = await (AuthenticatedRoute as any).options.beforeLoad({
      location: { pathname: '/unauthorized', href: '/unauthorized' },
      context,
    });

    expect(result.user.id).toBe(mockUser.id);
  });
});
