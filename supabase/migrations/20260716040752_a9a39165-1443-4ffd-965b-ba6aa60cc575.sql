
-- Extend lead_event_type with briefing lifecycle events
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'briefing_gerado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'briefing_revogado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'briefing_reenviado';
