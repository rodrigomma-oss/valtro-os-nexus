
-- 1. Extend lead_event_type enum
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'briefing_iniciado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'briefing_retomado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'briefing_concluido';

-- 2. Table briefing_responses
CREATE TABLE public.briefing_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL UNIQUE REFERENCES public.briefing_tokens(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_type public.template_type NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefing_responses_lead_id ON public.briefing_responses(lead_id);

-- 3. Grants (writes go through server functions with service_role; authenticated only reads)
GRANT SELECT ON public.briefing_responses TO authenticated;
GRANT ALL ON public.briefing_responses TO service_role;

-- 4. RLS
ALTER TABLE public.briefing_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver todas as respostas"
  ON public.briefing_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operadores veem respostas de seus leads"
  ON public.briefing_responses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'operator')
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = briefing_responses.lead_id
        AND l.owner_id = auth.uid()
    )
  );

CREATE POLICY "Viewers autenticados podem ver respostas"
  ON public.briefing_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

-- 5. updated_at trigger
CREATE TRIGGER trg_briefing_responses_updated_at
  BEFORE UPDATE ON public.briefing_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
