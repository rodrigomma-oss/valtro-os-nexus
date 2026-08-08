-- OPS-INT-002B: Infraestrutura de Idempotência de Negócio
-- Objetivo: Garantir que operações críticas POST não sejam processadas em duplicidade por uma mesma aplicação.

BEGIN;

-- 1. Enum para status da idempotência
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_idempotency_status') THEN
        CREATE TYPE public.api_idempotency_status AS ENUM ('processing', 'completed', 'failed');
    END IF;
END $$;

-- 2. Tabela de chaves de idempotência
CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
    idempotency_key UUID NOT NULL,
    
    -- Dados da requisição para detecção de conflito (payload diferente para mesma chave)
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    payload_hash TEXT NOT NULL, -- Hash determinístico do body
    
    -- Estado e Resposta
    status public.api_idempotency_status NOT NULL DEFAULT 'processing',
    response_status INTEGER,
    response_body JSONB,
    response_headers JSONB,
    
    -- Auditoria e Rastreamento
    request_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ, -- Para controle de concorrência se necessário
    
    -- Constraint de unicidade por aplicação
    UNIQUE (application_id, idempotency_key)
);

-- 3. Índices para performance e expurgo
CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_app_key ON public.api_idempotency_keys(application_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_created_at ON public.api_idempotency_keys(created_at);

-- 4. RLS e Grants
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas leitura interna via server functions ou service role
CREATE POLICY "Admins can view all idempotency keys"
    ON public.api_idempotency_keys
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE ON public.api_idempotency_keys TO authenticated;
GRANT ALL ON public.api_idempotency_keys TO service_role;

-- 5. Comentários
COMMENT ON TABLE public.api_idempotency_keys IS 'Armazena chaves de idempotência para evitar processamento duplicado de operações POST.';
COMMENT ON COLUMN public.api_idempotency_keys.payload_hash IS 'SHA-256 do corpo da requisição para validar se o retry é idêntico.';

COMMIT;
