import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBugFromApi, type BugApiInput } from '../bugs.server';
import { createFeedbackFromApi, type FeedbackApiInput } from '../feedback.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// Mock Supabase
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe('Persistence Logic (Bugs & Feedback)', () => {
  const applicationId = '42330f39-c465-45f2-8eb0-b9cf80a25a50';
  const saasProductId = 'valtro_pricing_id';
  const requestId = 'req_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBugFromApi', () => {
    it('persist bug with metadata and null reported_by', async () => {
      const input: BugApiInput = {
        external_reference: '550e8400-e29b-41d4-a716-446655440000',
        actor: {
          source: 'valtro-pricing',
          external_user_id: '660e8400-e29b-41d4-a716-446655440001',
        },
        contact: { name: 'Test User', email: 'test@example.com' },
        title: 'API Bug Title',
        description: 'Detailed description of the API bug.',
        category: 'calculator',
        context: { route: '/calc', plan: 'pro' }
      };

      const mockData = { id: 'bug-123', code: 'BUG-001' };
      const fromSpy = vi.mocked(supabaseAdmin.from);
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      });
      fromSpy.mockReturnValue({ insert: insertSpy } as any);

      const result = await createBugFromApi({
        input,
        applicationId,
        saasProductId,
        requestId,
      });

      expect(result).toEqual(mockData);
      expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: input.title,
        reported_by: null,
        external_reference: input.external_reference,
        request_id: requestId,
        metadata: expect.objectContaining({
          via_api: true,
          application_id: applicationId,
          actor: input.actor
        })
      }));
    });
  });

  describe('createFeedbackFromApi', () => {
    it('persist feedback with metadata and null created_by', async () => {
      const input: FeedbackApiInput = {
        external_reference: '770e8400-e29b-41d4-a716-446655440002',
        actor: {
          source: 'valtro-pricing',
          external_user_id: '880e8400-e29b-41d4-a716-446655440003',
        },
        title: 'API Feedback',
        description: 'Great feature!',
        category: 'feature',
      };

      const mockData = { id: 'fdb-123', code: 'FDB-001' };
      const fromSpy = vi.mocked(supabaseAdmin.from);
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      });
      fromSpy.mockReturnValue({ insert: insertSpy } as any);

      const result = await createFeedbackFromApi({
        input,
        applicationId,
        saasProductId,
        requestId,
      });

      expect(result).toEqual(mockData);
      expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: input.title,
        created_by: null,
        external_reference: input.external_reference,
        request_id: requestId,
        metadata: expect.objectContaining({
          via_api: true,
          application_id: applicationId,
          actor: input.actor
        })
      }));
    });
  });
});
