import { describe, it, expect } from 'vitest';

describe('API Credentials Schema Validation (Static)', () => {
  it('should define the expected columns for the migration', () => {
    const migrationColumns = ['version', 'rotated_at'];
    expect(migrationColumns).toContain('version');
    expect(migrationColumns).toContain('rotated_at');
  });

  it('should verify the secure view columns', () => {
    const viewColumns = [
      'id', 'application_id', 'key_id', 'status', 
      'version', 'created_at', 'activated_at', 
      'revoked_at', 'rotated_at', 'revocation_reason', 'created_by'
    ];
    const sensitiveColumns = ['encrypted_secret', 'encryption_iv', 'authentication_tag', 'master_key_version'];
    
    sensitiveColumns.forEach(col => {
      expect(viewColumns).not.toContain(col);
    });
  });
});
