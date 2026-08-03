-- OPS-API-001F — Hardening Final e Infraestrutura de Autenticação
-- Implementação de Auditoria e Prevenção de Replay.

-- 1. Tabela de Nonces para Prevenção de Replay
CREATE TABLE IF NOT EXISTS public.api_request_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES public.api_credentials(id) ON DELETE CASCADE,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Um nonce só pode ser usado uma vez por credencial
    UNIQUE (credential_id, nonce)
);

-- Constraint de tamanho do nonce (entre 16 e 64 caracteres)
ALTER TABLE public.api_request_nonces 
ADD CONSTRAINT check_nonce_length 
CHECK (length(nonce) >= 16 AND length(nonce) <= 64);

CREATE INDEX IF NOT EXISTS idx_api_request_nonces_expires_at ON public.api_request_nonces(expires_at);

-- 2. Tabela de Auditoria de API
CREATE TABLE IF NOT EXISTS public.api_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.api_applications(id) ON DELETE SET NULL,
    credential_id UUID REFERENCES public.api_credentials(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.saas_products(id) ON DELETE SET NULL,
    environment public.api_application_environment,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    request_id TEXT NOT NULL,
    client_request_id TEXT,
    ip TEXT,
    user_agent TEXT,
    scopes TEXT[],
    error_code TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_audit_logs_request_id ON public.api_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_application_id ON public.api_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_api_audit_logs_created_at ON public.api_audit_logs(created_at);

-- 3. Hardening Final de Segurança (Grants e RLS)
ALTER TABLE public.api_request_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;

-- Revogar todos os acessos diretos de usuários autenticados e anônimos
REVOKE ALL ON public.api_credentials FROM authenticated, anon;
REVOKE ALL ON public.api_applications FROM authenticated, anon;

-- Conceder acesso apenas para service_role
GRANT ALL ON public.api_applications TO service_role;
GRANT ALL ON public.api_credentials TO service_role;
GRANT ALL ON public.api_credentials_safe TO service_role;
GRANT ALL ON public.api_request_nonces TO service_role;
GRANT ALL ON public.api_audit_logs TO service_role;

-- A view segura continua acessível para admins via CRM
GRANT SELECT ON public.api_credentials_safe TO authenticated;

-- Policies para Auditoria: Apenas admins
CREATE POLICY "Admins can view audit logs"
ON public.api_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
