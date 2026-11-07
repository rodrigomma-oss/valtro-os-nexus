
-- 1) Extend lead_status enum (safe, idempotent)
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'em_triagem';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'aguardando_briefing';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'briefing_enviado';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'em_analise';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'descartado';

-- 2) Extend lead_event_type enum
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'triagem_iniciada';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'proxima_acao_alterada';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'interesse_alterado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'responsavel_alterado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'oportunidade_descartada';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'oportunidade_convertida';

-- 3) Add triage columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS triage_notes text,
  ADD COLUMN IF NOT EXISTS triage_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_next_action ON public.leads(next_action);
