import { describe, it, expect } from 'vitest';
import { sanitizeAuthRedirect } from '@/utils/auth-redirect';

describe('sanitizeAuthRedirect', () => {
  const defaultFallback = '/os/dashboard';

  it('should return fallback if target is empty', () => {
    expect(sanitizeAuthRedirect(null)).toBe(defaultFallback);
    expect(sanitizeAuthRedirect('')).toBe(defaultFallback);
    expect(sanitizeAuthRedirect(undefined)).toBe(defaultFallback);
  });

  it('should return target if it is a valid internal path', () => {
    expect(sanitizeAuthRedirect('/os/atendimento/chamados')).toBe('/os/atendimento/chamados');
    expect(sanitizeAuthRedirect('/crm/leads?id=123')).toBe('/crm/leads?id=123');
  });

  it('should block external URLs', () => {
    expect(sanitizeAuthRedirect('https://malicious.com')).toBe(defaultFallback);
    expect(sanitizeAuthRedirect('http://malicious.com')).toBe(defaultFallback);
    expect(sanitizeAuthRedirect('//malicious.com')).toBe(defaultFallback);
  });

  it('should block dangerous protocols', () => {
    expect(sanitizeAuthRedirect('javascript:alert(1)')).toBe(defaultFallback);
    expect(sanitizeAuthRedirect('data:text/html,<html>')).toBe(defaultFallback);
  });

  it('should block backslash attacks', () => {
    expect(sanitizeAuthRedirect('\\malicious.com')).toBe(defaultFallback);
  });

  it('should block auth loop', () => {
    expect(sanitizeAuthRedirect('/auth')).toBe(defaultFallback);
    expect(sanitizeAuthRedirect('/auth?redirect=/foo')).toBe(defaultFallback);
  });

  it('should handle full internal URLs', () => {
    // Como o ambiente de teste é Node (sem window), o fallback do helper usa http://localhost:8080
    expect(sanitizeAuthRedirect('http://localhost:8080/os/test')).toBe('/os/test');
  });

  it('should handle encoded paths', () => {
    expect(sanitizeAuthRedirect(encodeURIComponent('/os/test?v=1'))).toBe('/os/test?v=1');
  });
});
