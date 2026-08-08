-- OPS-INT-002C.1 — BLOCO 2 — APLICAÇÃO CONTROLADA DA MIGRATION
-- Objetivo: Corrigir View Segura e Adicionar colunas de versionamento.

-- 1. Adicionar colunas ausentes na tabela principal
ALTER TABLE public.api_credentials 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ NULL;

-- 2. Recriar View Segura (Removendo o desalinhamento identificado)
-- A view anterior tinha colunas em ordens diferentes da tabela física, causando erros no CREATE OR REPLACE.
DROP VIEW IF EXISTS public.api_credentials_safe;

CREATE VIEW public.api_credentials_safe AS
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

-- 3. Restaurar permissões
GRANT SELECT ON public.api_credentials_safe TO authenticated;
GRANT ALL ON public.api_credentials_safe TO service_role;

COMMENT ON COLUMN public.api_credentials.version IS 'Versão da credencial (incrementada em rotações).';
COMMENT ON COLUMN public.api_credentials.rotated_at IS 'Data/hora da última rotação desta credencial.';

-- 4. Registrar histórico
INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260808170000');
