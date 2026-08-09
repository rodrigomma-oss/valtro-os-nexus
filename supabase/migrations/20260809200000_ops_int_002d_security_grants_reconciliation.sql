-- Migration: OPS-INT-002D - Security Grants Reconciliation & Hardening
-- Objetivo: Eliminar drift de produção, restaurar privilégio mínimo e versionar security_invoker.

-- 1. HARDENING DE ACESSOS (REVOKE)
-- Revogar acessos excessivos concedidos a roles públicas/anônimas.
REVOKE ALL ON public.bugs FROM anon, authenticated, public;
REVOKE ALL ON public.feedback FROM anon, authenticated, public;
REVOKE ALL ON public.api_credentials_safe FROM anon, authenticated, public;
REVOKE ALL ON public.api_idempotency_keys FROM anon, authenticated, public;

-- 2. RESTAURAÇÃO DE PRIVILÉGIOS MÍNIMOS (GRANT)

-- BUGS & FEEDBACK:
-- service_role: Precisa de acesso total para o pipeline server-side.
GRANT ALL ON public.bugs TO service_role;
GRANT ALL ON public.feedback TO service_role;

-- authenticated: Precisa de acesso para a interface administrativa interna (sujeito a RLS).
GRANT SELECT, INSERT, UPDATE ON public.bugs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;

-- API_CREDENTIALS_SAFE (VIEW):
-- service_role: Precisa ler para autenticação da API.
GRANT SELECT ON public.api_credentials_safe TO service_role;

-- authenticated: Precisa ler para gerenciar credenciais no Operations Center.
GRANT SELECT ON public.api_credentials_safe TO authenticated;

-- API_IDEMPOTENCY_KEYS:
-- service_role: Precisa de acesso total para gerir o lifecycle (acquire/commit).
GRANT ALL ON public.api_idempotency_keys TO service_role;

-- authenticated: Precisa de leitura para auditoria admin.
GRANT SELECT ON public.api_idempotency_keys TO authenticated;

-- 3. VERSIONAMENTO DA VIEW COM SECURITY_INVOKER
-- Recriamos a view explicitando security_invoker=true para evitar drift manual e garantir segurança.
DROP VIEW IF EXISTS public.api_credentials_safe;

CREATE VIEW public.api_credentials_safe 
WITH (security_invoker = true)
AS
SELECT 
    id,
    application_id,
    key_id,
    status,
    version,
    created_at,
    activated_at,
    revoked_at,
    rotated_at,
    revocation_reason,
    created_by
FROM public.api_credentials;

-- Reaplica grants na view recriada
GRANT SELECT ON public.api_credentials_safe TO service_role;
GRANT SELECT ON public.api_credentials_safe TO authenticated;

-- 4. RLS CHECK (ASSEGURAR QUE CONTINUAM ATIVOS)
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Nota: Policies existentes são preservadas pois referenciam os nomes das tabelas.
