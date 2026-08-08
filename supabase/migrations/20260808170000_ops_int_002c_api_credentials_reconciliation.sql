-- OPS-INT-002C.1 — BLOCO 1 — MIGRATION DE RECONCILIAÇÃO DE SCHEMA
-- Objetivo: Alinhar public.api_credentials ao código de rotação e versionamento.

-- 1. Adicionar colunas ausentes na tabela principal
ALTER TABLE public.api_credentials 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ NULL;

-- 2. Atualizar View Segura (api_credentials_safe)
-- Esta view oculta material criptográfico sensível.
-- Preservamos os campos existentes e adicionamos os novos campos de versionamento.

CREATE OR REPLACE VIEW public.api_credentials_safe AS
SELECT 
    id,
    application_id,
    key_id,
    status,
    version, -- Novo campo
    created_at,
    activated_at,
    revoked_at,
    rotated_at, -- Novo campo
    revocation_reason,
    created_by
FROM public.api_credentials;

-- 3. Garantir que as permissões sejam mantidas para a View
-- A view herda permissões mas é boa prática reafirmar para o papel authenticated.
GRANT SELECT ON public.api_credentials_safe TO authenticated;
GRANT ALL ON public.api_credentials_safe TO service_role;

COMMENT ON COLUMN public.api_credentials.version IS 'Versão da credencial (incrementada em rotações).';
COMMENT ON COLUMN public.api_credentials.rotated_at IS 'Data/hora da última rotação desta credencial.';
