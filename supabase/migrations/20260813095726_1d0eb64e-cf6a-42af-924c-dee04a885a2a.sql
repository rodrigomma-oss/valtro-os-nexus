CREATE TABLE public.project_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  agenda text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.follow_up_status NOT NULL DEFAULT 'agendado',
  outcome_notes text,
  cancel_reason text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  rescheduled_from uuid REFERENCES public.project_meetings(id) ON DELETE SET NULL,
  rescheduled_to uuid REFERENCES public.project_meetings(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.project_meetings TO authenticated;
GRANT ALL ON public.project_meetings TO service_role;

ALTER TABLE public.project_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_meetings_select" ON public.project_meetings
  FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "project_meetings_insert" ON public.project_meetings
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "project_meetings_update" ON public.project_meetings
  FOR UPDATE TO authenticated
  USING (public.can_access_project(auth.uid(), project_id))
  WITH CHECK (public.can_access_project(auth.uid(), project_id));

CREATE INDEX idx_project_meetings_project ON public.project_meetings (project_id);
CREATE INDEX idx_project_meetings_owner ON public.project_meetings (owner_id);
CREATE UNIQUE INDEX idx_project_meetings_one_open
  ON public.project_meetings (project_id)
  WHERE (status = 'agendado'::public.follow_up_status);

CREATE TRIGGER trg_project_meetings_updated_at
  BEFORE UPDATE ON public.project_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_project_meetings_block_delete
  BEFORE DELETE ON public.project_meetings
  FOR EACH ROW EXECUTE FUNCTION public.block_physical_delete();

CREATE OR REPLACE FUNCTION public.enqueue_project_meeting_calendar_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.calendar_sync_links (
    entity_type, entity_id, provider, calendar_scope, sync_status, payload_hash, next_attempt_at
  )
  VALUES ('project_meeting', NEW.id, 'google', 'empresa', 'pendente',
          md5(NEW.scheduled_at::text || COALESCE(NEW.agenda,'') || NEW.duration_minutes::text || NEW.status::text),
          now())
  ON CONFLICT (provider, entity_type, entity_id, calendar_scope, COALESCE(calendar_owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET sync_status     = 'pendente',
                payload_hash    = EXCLUDED.payload_hash,
                sync_attempts   = 0,
                next_attempt_at = now(),
                last_error      = NULL,
                updated_at      = now();
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public.enqueue_project_meeting_calendar_sync() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_project_meetings_enqueue_sync
  AFTER INSERT OR UPDATE OF scheduled_at, duration_minutes, agenda, status, owner_id
  ON public.project_meetings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_project_meeting_calendar_sync();

CREATE OR REPLACE FUNCTION public.sync_project_next_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  _project_id uuid;
  _next timestamptz;
BEGIN
  _project_id := COALESCE(NEW.project_id, OLD.project_id);

  SELECT MIN(scheduled_at) INTO _next
  FROM public.project_meetings
  WHERE project_id = _project_id AND status = 'agendado';

  UPDATE public.project_operations
     SET next_meeting_at = _next
   WHERE project_id = _project_id
     AND next_meeting_at IS DISTINCT FROM _next;

  RETURN NULL;
END $function$;

REVOKE ALL ON FUNCTION public.sync_project_next_meeting() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_project_meetings_sync_next
  AFTER INSERT OR UPDATE ON public.project_meetings
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_next_meeting();