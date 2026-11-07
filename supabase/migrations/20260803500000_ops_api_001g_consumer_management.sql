-- OPS-API-001G — Gestão de Consumidores, Capacidades e Ciclo de Vida da API

-- 1. Enums de Versão e Status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_version_status') THEN
        CREATE TYPE public.api_version_status AS ENUM ('development', 'stable', 'deprecated', 'sunset', 'disabled');
    END IF;
END $$;

-- 2. Tabela de Versões da API
CREATE TABLE IF NOT EXISTS public.api_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code TEXT NOT NULL UNIQUE CHECK (version_code ~ '^v[0-9]+$'),
    display_name TEXT NOT NULL,
    status public.api_version_status NOT NULL DEFAULT 'development',
    released_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    sunset_at TIMESTAMPTZ,
    replacement_version_id UUID REFERENCES public.api_versions(id),
    documentation_url TEXT,
    public_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_dates CHECK (
        (deprecated_at IS NULL OR sunset_at IS NULL OR deprecated_at <= sunset_at)
    )
);

-- 3. Configurações Estendidas da Aplicação (Consumer Settings)
-- Decidi manter em api_applications para evitar joins complexos no middleware,
-- mas adicionando campos estruturados.
ALTER TABLE public.api_applications 
ADD COLUMN IF NOT EXISTS capabilities TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS min_api_version_id UUID REFERENCES public.api_versions(id),
ADD COLUMN IF NOT EXISTS max_api_version_id UUID REFERENCES public.api_versions(id),
ADD COLUMN IF NOT EXISTS preferred_api_version_id UUID REFERENCES public.api_versions(id),
ADD COLUMN IF NOT EXISTS technical_limits JSONB NOT NULL DEFAULT '{
    "max_payload_bytes": 1048576,
    "max_attachment_bytes": 10485760,
    "max_attachments_per_entity": 5
}'::jsonb,
ADD COLUMN IF NOT EXISTS activation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deprecation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sunset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_message TEXT;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_api_versions_status ON public.api_versions(status);
CREATE INDEX IF NOT EXISTS idx_api_applications_product_id ON public.api_applications(product_id);

-- 5. Triggers de Auditoria e Validação
CREATE OR REPLACE FUNCTION public.validate_api_version_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Uma versão disabled não pode voltar automaticamente para stable (exige intervenção manual via migration se necessário, ou admin service)
    IF OLD.status = 'disabled' AND NEW.status = 'stable' THEN
        RAISE EXCEPTION 'Versão desabilitada não pode retornar para estável sem revisão técnica.';
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_api_versions_validation
    BEFORE UPDATE ON public.api_versions
    FOR EACH ROW EXECUTE FUNCTION public.validate_api_version_transition();

-- 6. Segurança (Grants e RLS)
ALTER TABLE public.api_versions ENABLE ROW LEVEL SECURITY;

-- Revoga acessos públicos a tudo relacionado a API (Hardening)
REVOKE ALL ON public.api_applications FROM PUBLIC, authenticated, anon;
REVOKE ALL ON public.api_credentials FROM PUBLIC, authenticated, anon;
REVOKE ALL ON public.api_versions FROM PUBLIC, authenticated, anon;
REVOKE ALL ON public.api_audit_logs FROM PUBLIC, authenticated, anon;
REVOKE ALL ON public.api_request_nonces FROM PUBLIC, authenticated, anon;

-- Permissões para service_role (usado pelo middleware e server functions)
GRANT ALL ON public.api_applications TO service_role;
GRANT ALL ON public.api_credentials TO service_role;
GRANT ALL ON public.api_versions TO service_role;
GRANT ALL ON public.api_audit_logs TO service_role;
GRANT ALL ON public.api_request_nonces TO service_role;

-- Permissões de leitura para authenticated (apenas para a UI administrativa interna, via RLS)
GRANT SELECT ON public.api_applications TO authenticated;
GRANT SELECT ON public.api_credentials TO authenticated;
GRANT SELECT ON public.api_versions TO authenticated;
GRANT SELECT ON public.api_audit_logs TO authenticated;

-- Policies restritas
CREATE POLICY "Admins can view api_versions" ON public.api_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage api_versions" ON public.api_versions FOR ALL TO service_role USING (true);

-- 7. Seed Inicial da v1
INSERT INTO public.api_versions (version_code, display_name, status, released_at)
VALUES ('v1', 'Valtro API v1', 'stable', '2026-08-03T00:00:00Z')
ON CONFLICT (version_code) DO NOTHING;

