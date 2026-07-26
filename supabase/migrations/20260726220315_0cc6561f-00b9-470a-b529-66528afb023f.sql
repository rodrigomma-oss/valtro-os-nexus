ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'cadastro_atualizado_por_briefing';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'cadastro_conflito_por_briefing';

DO $$ BEGIN
  CREATE TYPE public.lead_field_conflict_status AS ENUM ('pendente','aceito','descartado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.lead_field_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  briefing_token_id UUID REFERENCES public.briefing_tokens(id) ON DELETE SET NULL,
  field TEXT NOT NULL,
  current_value TEXT,
  briefing_value TEXT NOT NULL,
  status public.lead_field_conflict_status NOT NULL DEFAULT 'pendente',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_field_conflicts_lead_id ON public.lead_field_conflicts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_field_conflicts_status ON public.lead_field_conflicts(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_field_conflicts_pending
  ON public.lead_field_conflicts(lead_id, field)
  WHERE status = 'pendente';

GRANT SELECT, INSERT, UPDATE ON public.lead_field_conflicts TO authenticated;
GRANT ALL ON public.lead_field_conflicts TO service_role;

ALTER TABLE public.lead_field_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver conflitos"
  ON public.lead_field_conflicts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin e operador criam conflitos"
  ON public.lead_field_conflicts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Admin e operador resolvem conflitos"
  ON public.lead_field_conflicts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE TRIGGER trg_lead_field_conflicts_updated_at
  BEFORE UPDATE ON public.lead_field_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.lead_field_conflicts_block_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Conflitos cadastrais não podem ser excluídos; use os status aceito/descartado.'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER trg_lead_field_conflicts_block_delete
  BEFORE DELETE ON public.lead_field_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.lead_field_conflicts_block_delete();