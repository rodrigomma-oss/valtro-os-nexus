import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateRequest } from './auth.server';
import * as crypto from 'node:crypto';
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Mock Supabase
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

describe('authenticateRequest', () => {
  const mockApp = {
    id: 'app-123',
    client_id: 'vlt_app_123456789012345678901234',
    status: 'active',
    allowed_scopes: ['test:scope'],
    environment: 'development'
  };

  const mockCred = {
    id: 'cred-123',
    key_id: 'vlt_key_123456789012345678901234',
    status: 'active',
    encrypted_secret: 'encrypted',
    encryption_iv: 'iv',
    authentication_tag: 'tag',
    encryption_version: 1,
    master_key_version: 'v1',
    api_applications: mockApp
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rejeitar se headers estiverem ausentes', async () => {
    const request = new Request('http://localhost/api', { method: 'POST' });
    const result = await authenticateRequest(request);
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error.code).toBe('MISSING_HEADERS');
    }
  });

  it('deve rejeitar timestamp fora da janela', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: {
        'x-valtro-timestamp': (Date.now() - 20 * 60 * 1000).toString(),
        'x-valtro-nonce': '1234567890123456',
        'x-valtro-key-id': 'vlt_key_123',
        'x-valtro-signature': 'sig'
      }
    });
    const result = await authenticateRequest(request);
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error.code).toBe('INVALID_TIMESTAMP');
    }
  });
});
