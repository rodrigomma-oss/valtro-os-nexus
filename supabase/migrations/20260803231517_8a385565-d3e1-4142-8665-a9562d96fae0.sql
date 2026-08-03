-- OPS-API-001E — Fundação de Aplicações e Credenciais da API
-- Implementação da infraestrutura de aplicações e credenciais criptografadas.

-- 1. Enums e Tipos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_application_status') THEN
        CREATE TYPE public.api_application_status AS ENUM ('active', 'suspended', 'revoked');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_application_environment') THEN
        CREATE TYPE public.api_application_environment AS ENUM ('development', 'staging', 'production');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_credential_status') THEN
        CREATE TYPE public.api_credential_status AS ENUM ('pending', 'active', 'revoked', 'expired');
    END IF;
END $$;

-- 2. Tabela de Aplicações
CREATE TABLE IF NOT EXISTS public.api_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL UNIQUE CHECK (client_id ~ '^vlt_app_[a-z0-9]{24}$'),
    display_name TEXT NOT NULL,
    product_id UUID REFERENCES public.saas_products(id) ON DELETE SET NULL,
    environment public.api_application_environment NOT NULL DEFAULT 'development',
    status public.api_application_status NOT NULL DEFAULT 'active',
    allowed_scopes TEXT[] NOT NULL DEFAULT '{}',
    rate_limit_config JSONB DEFAULT '{"requests_per_minute": 100}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Tabela de Credenciais
CREATE TABLE IF NOT EXISTS public.api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
    key_id TEXT NOT NULL UNIQUE CHECK (key_id ~ '^vlt_key_[a-z0-9]{24}$'),
    encrypted_secret TEXT NOT NULL, -- AES-256-GCM ciphertext em base64
    encryption_iv TEXT NOT NULL, -- IV em base64
    authentication_tag TEXT NOT NULL, -- GCM Tag em base64
    encryption_version INTEGER NOT NULL DEFAULT 1,
    master_key_version TEXT NOT NULL,
    status public.api_credential_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Índices e Constraints de Imutabilidade
CREATE INDEX IF NOT EXISTS idx_api_applications_client_id ON public.api_applications(client_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_key_id ON public.api_credentials(key_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_application_id ON public.api_credentials(application_id);

-- Triggers para timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_api_applications_updated_at
    BEFORE UPDATE ON public.api_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proteção de imutabilidade e regras de negócio
CREATE OR REPLACE FUNCTION public.enforce_api_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloqueia alteração de client_id e key_id
    IF TG_TABLE_NAME = 'api_applications' THEN
        IF OLD.client_id <> NEW.client_id THEN
            RAISE EXCEPTION 'client_id é imutável.';
        END IF;
    ELSIF TG_TABLE_NAME = 'api_credentials' THEN
        IF OLD.key_id <> NEW.key_id THEN
            RAISE EXCEPTION 'key_id é imutável.';
        END IF;
        IF OLD.application_id <> NEW.application_id THEN
            RAISE EXCEPTION 'application_id de uma credencial é imutável.';
        END IF;
        -- Proíbe reativar credencial revogada
        IF OLD.status = 'revoked' AND NEW.status <> 'revoked' THEN
            RAISE EXCEPTION 'Não é permitido reativar uma credencial revogada.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_api_applications_immutability
    BEFORE UPDATE ON public.api_applications
    FOR EACH ROW EXECUTE FUNCTION public.enforce_api_immutability();

CREATE TRIGGER tr_api_credentials_immutability
    BEFORE UPDATE ON public.api_credentials
    FOR EACH ROW EXECUTE FUNCTION public.enforce_api_immutability();

-- 5. Segurança (Grants e RLS)
ALTER TABLE public.api_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Grants mínimos
GRANT SELECT ON public.api_applications TO authenticated;
GRANT ALL ON public.api_applications TO service_role;

GRANT SELECT ON public.api_credentials TO authenticated;
GRANT ALL ON public.api_credentials TO service_role;

-- Policies: Somente Admins podem ver/gerir estas tabelas
CREATE POLICY "Admins can manage api_applications" 
ON public.api_applications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage api_credentials"
ON public.api_credentials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- View segura para listagem (sem campos sensíveis)
CREATE OR REPLACE VIEW public.api_credentials_safe AS
SELECT 
    id, 
    application_id, 
    key_id, 
    encryption_version, 
    master_key_version, 
    status, 
    created_at, 
    activated_at, 
    expires_at, 
    revoked_at, 
    last_used_at
FROM public.api_credentials;

GRANT SELECT ON public.api_credentials_safe TO authenticated;
