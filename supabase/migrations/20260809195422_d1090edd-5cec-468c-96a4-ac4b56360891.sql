-- Migration: OPS-INT-002D - Security Grants Reconciliation & Hardening
-- Aplicando via migration tool para garantir modo read-write e persistência no histórico.

REVOKE ALL ON public.bugs FROM anon, authenticated, public;
REVOKE ALL ON public.feedback FROM anon, authenticated, public;
REVOKE ALL ON public.api_credentials_safe FROM anon, authenticated, public;
REVOKE ALL ON public.api_idempotency_keys FROM anon, authenticated, public;

GRANT ALL ON public.bugs TO service_role;
GRANT ALL ON public.feedback TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.bugs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;

GRANT ALL ON public.api_idempotency_keys TO service_role;
GRANT SELECT ON public.api_idempotency_keys TO authenticated;

DROP VIEW IF EXISTS public.api_credentials_safe;
CREATE VIEW public.api_credentials_safe WITH (security_invoker = true) AS
SELECT id, application_id, key_id, status, version, created_at, activated_at, revoked_at, rotated_at, revocation_reason, created_by
FROM public.api_credentials;

GRANT SELECT ON public.api_credentials_safe TO service_role;
GRANT SELECT ON public.api_credentials_safe TO authenticated;

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;