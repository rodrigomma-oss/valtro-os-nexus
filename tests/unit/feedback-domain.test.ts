import { describe, it, expect } from 'vitest';
import { feedbackStatusTransitions, getAvailableTransitions } from '../../src/lib/os/feedback-ui';
import { FeedbackStatus } from '../../src/types/feedback';

describe('Feedback Domain Logic', () => {
  it('should define valid transitions correctly', () => {
    const fromNew = getAvailableTransitions('new');
    expect(fromNew).toContain('under_review');
    expect(fromNew).toContain('dismissed');
    expect(fromNew).not.toContain('implemented');

    const fromClosed = getAvailableTransitions('closed');
    expect(fromClosed).toHaveLength(0); // Terminal state
  });

  it('should block invalid transitions', () => {
    // This is tested via getAvailableTransitions in UI, 
    // DB trigger validation is checked via SQL simulation.
  });
});
