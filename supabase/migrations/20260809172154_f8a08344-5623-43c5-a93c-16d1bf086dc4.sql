DROP VIEW IF EXISTS public.api_credentials_safe;

CREATE VIEW public.api_credentials_safe WITH (security_invoker = true) AS
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

GRANT SELECT ON public.api_credentials_safe TO authenticated;
GRANT ALL ON public.api_credentials_safe TO service_role;