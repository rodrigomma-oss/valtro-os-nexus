-- ============================================================
-- Sprint 14.0 — Follow-ups como entidade própria
-- ============================================================

ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'follow_up_reagendado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'follow_up_cancelado';

DO $$ BEGIN
  CREATE TYPE public.follow_up_status AS ENUM ('agendado','concluido','cancelado','reagendado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.calendar_sync_status AS ENUM ('pendente','sincronizado','falha','removido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.calendar_scope AS ENUM ('empresa','usuario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- follow_ups
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id            uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at       timestamptz NOT NULL,
  duration_minutes   integer NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 480),
  timezone           text NOT NULL DEFAULT 'America/Sao_Paulo',
  reason             text,
  owner_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status             public.follow_up_status NOT NULL DEFAULT 'agendado',
  outcome_notes      text,
  cancel_reason      text,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  rescheduled_from   uuid REFERENCES public.follow_ups(id) ON DELETE SET NULL,
  rescheduled_to     uuid REFERENCES public.follow_ups(id) ON DELETE SET NULL,
  created_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_owner ON public.follow_ups(owner_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_open ON public.follow_ups(scheduled_at) WHERE status = 'agendado';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_ups_select_authenticated" ON public.follow_ups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "follow_ups_insert_write_roles" ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE POLICY "follow_ups_update_write_roles" ON public.follow_ups
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE POLICY "follow_ups_delete_admin" ON public.follow_ups
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_follow_ups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- calendar_sync_links (projeção externa — sem chamadas nesta sprint)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_sync_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         text NOT NULL DEFAULT 'follow_up' CHECK (entity_type IN ('follow_up')),
  entity_id           uuid NOT NULL,
  provider            text NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
  calendar_scope      public.calendar_scope NOT NULL DEFAULT 'empresa',
  calendar_owner_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  calendar_id         text,
  external_event_id   text,
  external_html_link  text,
  sync_status         public.calendar_sync_status NOT NULL DEFAULT 'pendente',
  sync_attempts       integer NOT NULL DEFAULT 0,
  last_synced_at      timestamptz,
  last_error          text,
  payload_hash        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_sync_links_target
  ON public.calendar_sync_links(provider, entity_type, entity_id, calendar_scope, COALESCE(calendar_owner_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_calendar_sync_links_pending
  ON public.calendar_sync_links(sync_status, updated_at);

GRANT SELECT ON public.calendar_sync_links TO authenticated;
GRANT ALL ON public.calendar_sync_links TO service_role;
ALTER TABLE public.calendar_sync_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_sync_links_select_authenticated" ON public.calendar_sync_links
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_calendar_sync_links_updated_at
  BEFORE UPDATE ON public.calendar_sync_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Compatibilidade: espelha o follow-up agendado mais próximo em leads.next_follow_up_*
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_lead_next_follow_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  _lead_id uuid := COALESCE(NEW.lead_id, OLD.lead_id);
  _next public.follow_ups%ROWTYPE;
BEGIN
  SELECT * INTO _next
  FROM public.follow_ups
  WHERE lead_id = _lead_id AND status = 'agendado'
  ORDER BY scheduled_at ASC
  LIMIT 1;

  UPDATE public.leads
  SET next_follow_up_at       = _next.scheduled_at,
      next_follow_up_reason   = _next.reason,
      next_follow_up_owner_id = _next.owner_id
  WHERE id = _lead_id
    AND (next_follow_up_at IS DISTINCT FROM _next.scheduled_at
      OR next_follow_up_reason IS DISTINCT FROM _next.reason
      OR next_follow_up_owner_id IS DISTINCT FROM _next.owner_id);

  RETURN NULL;
END $$;

CREATE TRIGGER trg_follow_ups_sync_lead
  AFTER INSERT OR UPDATE OR DELETE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_next_follow_up();

-- ------------------------------------------------------------
-- Timeline: reagendamento e cancelamento (agendar/concluir já são logados via leads)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_follow_up_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelado' THEN
      INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
      VALUES (NEW.lead_id, 'follow_up_cancelado', 'Follow-up cancelado.', auth.uid(),
              jsonb_build_object('follow_up_id', NEW.id, 'scheduled_at', NEW.scheduled_at, 'reason', NEW.cancel_reason));
    ELSIF NEW.status = 'reagendado' THEN
      INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
      VALUES (NEW.lead_id, 'follow_up_reagendado', 'Follow-up reagendado.', auth.uid(),
              jsonb_build_object('follow_up_id', NEW.id, 'from', NEW.scheduled_at, 'rescheduled_to', NEW.rescheduled_to));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_follow_ups_log_status
  AFTER UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.log_follow_up_status_change();

-- ------------------------------------------------------------
-- Fila de projeção externa (apenas registro; sem chamadas ao Google)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_follow_up_calendar_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  INSERT INTO public.calendar_sync_links (entity_type, entity_id, provider, calendar_scope, sync_status, payload_hash)
  VALUES ('follow_up', NEW.id, 'google', 'empresa', 'pendente',
          md5(NEW.scheduled_at::text || COALESCE(NEW.reason,'') || NEW.duration_minutes::text || NEW.status::text))
  ON CONFLICT (provider, entity_type, entity_id, calendar_scope, COALESCE(calendar_owner_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET sync_status = 'pendente',
                payload_hash = EXCLUDED.payload_hash,
                updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_follow_ups_enqueue_sync
  AFTER INSERT OR UPDATE OF scheduled_at, duration_minutes, reason, status, owner_id
  ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_follow_up_calendar_sync();

-- ------------------------------------------------------------
-- Backfill dos follow-ups atuais
-- ------------------------------------------------------------
INSERT INTO public.follow_ups (lead_id, scheduled_at, reason, owner_id, status, created_by)
SELECT l.id, l.next_follow_up_at, l.next_follow_up_reason, l.next_follow_up_owner_id, 'agendado', l.owner_id
FROM public.leads l
WHERE l.next_follow_up_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.follow_ups f WHERE f.lead_id = l.id AND f.status = 'agendado');
