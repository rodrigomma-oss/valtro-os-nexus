
-- Migration: OPS-INT-002D - Reconciliação de Persistência (Bugs & Feedback)
ALTER TABLE public.bugs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.bugs ALTER COLUMN reported_by DROP NOT NULL;

ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS external_reference TEXT;
ALTER TABLE public.feedback ALTER COLUMN created_by DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.bugs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.bugs TO service_role;
GRANT ALL ON public.feedback TO service_role;
