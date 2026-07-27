ALTER TABLE public.project_operations
  ADD COLUMN meeting_preferred_time text,
  ADD COLUMN meeting_preference_declared boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.project_operations.meeting_preferred_time IS 'Horário/faixa preferencial de reunião informada pelo cliente (ex.: "14h", "manhã"). Nunca armazenar em notes.';
COMMENT ON COLUMN public.project_operations.meeting_preference_declared IS 'True quando o cliente respondeu à preferência de reunião, mesmo sem dia preferencial.';