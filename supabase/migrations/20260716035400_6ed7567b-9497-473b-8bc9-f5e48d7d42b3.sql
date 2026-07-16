
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.service_type AS ENUM (
  'nao_definido',
  'gestao_shopee',
  'gestao_mercadolivre',
  'gestao_amazon',
  'gestao_multicanal',
  'consultoria',
  'diagnostico',
  'trafego_pago',
  'outro'
);

CREATE TYPE public.token_status AS ENUM (
  'pendente',
  'ativo',
  'concluido',
  'expirado',
  'revogado'
);

CREATE TYPE public.template_type AS ENUM (
  'padrao',
  'shopee',
  'mercadolivre',
  'amazon',
  'multicanal',
  'consultoria',
  'diagnostico',
  'custom'
);

-- =========================================================
-- LEADS: adicionar service_type
-- =========================================================
ALTER TABLE public.leads
  ADD COLUMN service_type public.service_type NOT NULL DEFAULT 'nao_definido';

CREATE INDEX idx_leads_service_type ON public.leads(service_type);

-- =========================================================
-- BRIEFING_TOKENS
-- =========================================================
CREATE TABLE public.briefing_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  service_type public.service_type NOT NULL,
  template_type public.template_type NOT NULL,
  status public.token_status NOT NULL DEFAULT 'pendente',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  last_access_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefing_tokens_lead_id ON public.briefing_tokens(lead_id);
CREATE INDEX idx_briefing_tokens_status ON public.briefing_tokens(status);
CREATE INDEX idx_briefing_tokens_expires_at ON public.briefing_tokens(expires_at);

-- GRANTS (auth-only; validação pública será via server function server-side)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_tokens TO authenticated;
GRANT ALL ON public.briefing_tokens TO service_role;

-- updated_at trigger
CREATE TRIGGER trg_briefing_tokens_updated_at
BEFORE UPDATE ON public.briefing_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.briefing_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/viewer todos; operator só de leads próprios
CREATE POLICY "briefing_tokens_select" ON public.briefing_tokens
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'viewer')
  OR (
    public.has_role(auth.uid(), 'operator')
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = briefing_tokens.lead_id AND l.owner_id = auth.uid()
    )
  )
);

-- INSERT: admin ou operator dono do lead
CREATE POLICY "briefing_tokens_insert" ON public.briefing_tokens
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'operator')
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = briefing_tokens.lead_id AND l.owner_id = auth.uid()
    )
  )
);

-- UPDATE: admin ou operator dono do lead
CREATE POLICY "briefing_tokens_update" ON public.briefing_tokens
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'operator')
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = briefing_tokens.lead_id AND l.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'operator')
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = briefing_tokens.lead_id AND l.owner_id = auth.uid()
    )
  )
);

-- DELETE: apenas admin
CREATE POLICY "briefing_tokens_delete" ON public.briefing_tokens
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
