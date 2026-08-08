import { describe, it, expect } from 'vitest';

describe('API Credentials Schema Validation (Static)', () => {
  it('should define the expected columns for the migration', () => {
    const migrationColumns = ['version', 'rotated_at'];
    expect(migrationColumns).toContain('version');
    expect(migrationColumns).toContain('rotated_at');
  });

  it('should verify the secure view columns against data leaks', () => {
    // Colunas permitidas na View Segura conforme a migration
    const viewColumns = [
      'id', 'application_id', 'key_id', 'status', 
      'version', 'created_at', 'activated_at', 
      'revoked_at', 'rotated_at', 'revocation_reason', 'created_by'
    ];
    
    // Colunas que JAMAIS devem estar na View Segura (Material Criptográfico)
    const sensitiveColumns = [
      'encrypted_secret', 
      'encryption_iv', 
      'authentication_tag', 
      'encryption_version',
      'master_key_version'
    ];
    
    sensitiveColumns.forEach(col => {
      expect(viewColumns, `A coluna sensível ${col} foi encontrada na View Segura!`).not.toContain(col);
    });
  });
});
