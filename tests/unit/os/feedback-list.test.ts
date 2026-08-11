import { describe, it, expect, vi } from 'vitest';
import { listFeedback } from '@/lib/os/feedback.functions';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('listFeedback', () => {
  it('should return internal feedback with valid created_by', async () => {
    const mockData = [
      {
        id: '1',
        code: 'FDB-001',
        created_by: 'user-1',
        creator: { full_name: 'User One' },
        saas_products: { name: 'Product A' }
      }
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
    });

    const result = await listFeedback({ data: { page: 1, pageSize: 20 } });
    
    expect(result.items[0].created_by_name).toBe('User One');
    expect(result.total).toBe(1);
  });

  it('should return API feedback with NULL created_by', async () => {
    const mockData = [
      {
        id: '2',
        code: 'FDB-002',
        created_by: null,
        creator: null,
        saas_products: { name: 'Product B' }
      }
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
    });

    const result = await listFeedback({ data: { page: 1, pageSize: 20 } });
    
    expect(result.items[0].created_by_name).toBeUndefined();
    expect(result.total).toBe(1);
  });
});
