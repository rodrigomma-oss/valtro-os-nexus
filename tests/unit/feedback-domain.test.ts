import { describe, it, expect } from 'vitest';
import { feedbackActionsFor } from '../../src/lib/os/feedback-ui';

describe('Feedback Domain Logic', () => {
  it('should define valid actions correctly', () => {
    const fromNew = feedbackActionsFor('new');
    expect(fromNew.map(a => a.to)).toContain('under_review');
    expect(fromNew.map(a => a.to)).toContain('dismissed');
    expect(fromNew.map(a => a.to)).not.toContain('implemented');

    const fromClosed = feedbackActionsFor('closed');
    expect(fromClosed).toHaveLength(0); // Terminal state
  });
});
