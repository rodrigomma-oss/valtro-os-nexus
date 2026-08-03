import { describe, it, expect, beforeAll } from 'vitest';
import { generateHmacSecret, encryptSecret, decryptSecret, generateSecureId, secureCompare } from '@/lib/os/api/crypto.server';

describe('API Crypto Module', () => {
  beforeAll(() => {
    process.env.API_MASTER_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.API_MASTER_KEY_VERSION = 'v1_test';
  });

  it('should generate a 32-byte (64 hex chars) secret', () => {
    const secret = generateHmacSecret();
    expect(secret).toHaveLength(64);
  });

  it('should encrypt and decrypt a secret correctly', async () => {
    const secret = 'my-super-secret-hmac-key';
    const aad = 'app_123:key_456';
    
    const encrypted = await encryptSecret(secret, aad);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.masterKeyVersion).toBe('v1_test');

    const decrypted = await decryptSecret(encrypted, aad);
    expect(decrypted).toBe(secret);
  });

  it('should fail decryption if AAD is incorrect', async () => {
    const secret = 'test-secret';
    const encrypted = await encryptSecret(secret, 'correct-aad');
    
    await expect(decryptSecret(encrypted, 'wrong-aad')).rejects.toThrow();
  });

  it('should fail decryption if auth tag is tampered', async () => {
    const secret = 'test-secret';
    const encrypted = await encryptSecret(secret, 'aad');
    
    const buf = Buffer.from(encrypted.authTag, 'base64');
    buf[0] ^= 1;
    encrypted.authTag = buf.toString('base64');

    await expect(decryptSecret(encrypted, 'aad')).rejects.toThrow();
  });

  it('should generate distinct IVs for same data', async () => {
    const secret = 'same-secret';
    const enc1 = await encryptSecret(secret, 'aad');
    const enc2 = await encryptSecret(secret, 'aad');
    
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it('should generate secure IDs with correct prefixes', () => {
    expect(generateSecureId('vlt_app_')).toMatch(/^vlt_app_[a-z0-9]{24}$/);
    expect(generateSecureId('vlt_key_')).toMatch(/^vlt_key_[a-z0-9]{24}$/);
  });

  it('should perform secure timing-safe comparison', () => {
    expect(secureCompare('abc', 'abc')).toBe(true);
    expect(secureCompare('abc', 'abd')).toBe(false);
    expect(secureCompare('abc', 'abcd')).toBe(false);
  });

  it('should fail if master key is missing', async () => {
    const originalKey = process.env.API_MASTER_ENCRYPTION_KEY;
    delete process.env.API_MASTER_ENCRYPTION_KEY;
    
    await expect(encryptSecret('test', 'aad')).rejects.toThrow(/não configurada/);
    
    process.env.API_MASTER_ENCRYPTION_KEY = originalKey;
  });

  it('should fail if master key is invalid length', async () => {
    const originalKey = process.env.API_MASTER_ENCRYPTION_KEY;
    process.env.API_MASTER_ENCRYPTION_KEY = 'too-short';
    
    await expect(encryptSecret('test', 'aad')).rejects.toThrow(/string hex de 32 bytes/);
    
    process.env.API_MASTER_ENCRYPTION_KEY = originalKey;
  });

  it('should fail decryption if ciphertext is tampered', async () => {
    const secret = 'test-secret';
    const encrypted = await encryptSecret(secret, 'aad');
    
    const buf = Buffer.from(encrypted.ciphertext, 'base64');
    buf[0] ^= 1;
    encrypted.ciphertext = buf.toString('base64');

    await expect(decryptSecret(encrypted, 'aad')).rejects.toThrow();
  });
});
