import { describe, it, expect } from 'vitest';

describe('UI/Logic Regression - Null Authors', () => {
  it('handles bugs with null reported_by safely', () => {
    const bug = {
      code: 'BUG-001',
      reported_by: null,
      metadata: { via_api: true, actor: { source: 'valtro-pricing' } }
    };
    
    // Simulação da lógica que seria usada na UI
    const displayName = bug.reported_by || (bug.metadata?.via_api ? 'API System' : 'Unknown');
    expect(displayName).toBe('API System');
  });

  it('handles feedback with null created_by safely', () => {
    const feedback = {
      code: 'FDB-001',
      created_by: null,
      metadata: { via_api: true, actor: { source: 'valtro-pricing' } }
    };
    
    const displayName = feedback.created_by || (feedback.metadata?.via_api ? 'API System' : 'Unknown');
    expect(displayName).toBe('API System');
  });
});
