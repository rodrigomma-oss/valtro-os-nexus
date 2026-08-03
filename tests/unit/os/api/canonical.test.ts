import { describe, it, expect } from 'vitest';
import { createCanonicalRequest } from '@/lib/os/api/canonical.server';

describe('Canonical Request Generator', () => {
  const defaultParams = {
    method: 'POST',
    path: '/api/v1/support/tickets',
    queryString: 'priority=high&status=open',
    contentType: 'application/json',
    timestamp: '2026-08-03T23:00:00Z',
    nonce: 'nonce_12345',
    body: JSON.stringify({ title: 'Issue' }),
  };

  it('should generate a correct canonical string with ordered query params', () => {
    const canonical = createCanonicalRequest(defaultParams);
    const lines = canonical.split('\n');
    
    expect(lines[0]).toBe('VALTRO-HMAC-SHA256-V1');
    expect(lines[1]).toBe(defaultParams.timestamp);
    expect(lines[2]).toBe(defaultParams.nonce);
    expect(lines[3]).toBe('POST');
    expect(lines[4]).toBe('/api/v1/support/tickets');
    expect(lines[5]).toBe('priority=high&status=open');
    expect(lines[6]).toBe('application/json');
    expect(lines[7]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
  });

  it('should order query parameters alphabetically by key and then value', () => {
    const params = {
      ...defaultParams,
      queryString: 'z=1&a=2&a=1&b=3',
    };
    const canonical = createCanonicalRequest(params);
    const queryStringLine = canonical.split('\n')[5];
    expect(queryStringLine).toBe('a=1&a=2&b=3&z=1');
  });

  it('should preserve path casing', () => {
    const params = {
      ...defaultParams,
      path: '/API/V1/MyPath/',
    };
    const canonical = createCanonicalRequest(params);
    const pathLine = canonical.split('\n')[4];
    expect(pathLine).toBe('/API/V1/MyPath/');
  });

  it('should handle empty body correctly', () => {
    const params = {
      ...defaultParams,
      body: '',
    };
    const canonical = createCanonicalRequest(params);
    const hashLine = canonical.split('\n')[7];
    // SHA-256 of empty string
    expect(hashLine).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should handle repeating parameters and empty values', () => {
    const params = {
      ...defaultParams,
      queryString: 'tag=&tag=blue&tag=red&active=true',
    };
    const canonical = createCanonicalRequest(params);
    const queryStringLine = canonical.split('\n')[5];
    expect(queryStringLine).toBe('active=true&tag=&tag=blue&tag=red');
  });

  it('should ensure path starts with /', () => {
    const params = {
      ...defaultParams,
      path: 'api/v1/resource',
    };
    const canonical = createCanonicalRequest(params);
    expect(canonical.split('\n')[4]).toBe('/api/v1/resource');
  });

  it('should lowercase content type', () => {
    const params = {
      ...defaultParams,
      contentType: 'Application/JSON; Charset=UTF-8',
    };
    const canonical = createCanonicalRequest(params);
    expect(canonical.split('\n')[6]).toBe('application/json; charset=utf-8');
  });
});
