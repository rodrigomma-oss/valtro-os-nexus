import { describe, it, expect } from 'vitest';
import { describeFeedbackEvent, feedbackEventTone, parseFeedbackSearch } from '../../src/lib/os/feedback-ui';

describe('Feedback Functional UI Helpers', () => {
  it('should describe events correctly', () => {
    expect(describeFeedbackEvent({ event_type: 'created', metadata: {} })).toContain('Feedback registrado');
    expect(describeFeedbackEvent({ event_type: 'status_changed', metadata: { from: 'new', to: 'under_review' } })).toContain('Em análise');
  });

  it('should return correct tones', () => {
    expect(feedbackEventTone('accepted')).toBe('success');
    expect(feedbackEventTone('dismissed')).toBe('neutral');
  });

  it('should parse search terms', () => {
    expect(parseFeedbackSearch('FDB-000001')).toEqual({ code: 'FDB-000001' });
    expect(parseFeedbackSearch('user@example.com')).toEqual({ participant_email: 'user@example.com' });
    expect(parseFeedbackSearch('  text  ')).toEqual({ text: 'text' });
  });
});
