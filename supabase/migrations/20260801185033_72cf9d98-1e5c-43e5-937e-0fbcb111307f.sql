-- 2) Sequence: first code must be BUG-000001 (table is empty)
DO $$
BEGIN
  IF (SELECT count(*) FROM public.bugs) = 0 THEN
    PERFORM setval('public.bug_code_seq', 1, false);
  END IF;
END $$;

-- 3) Trigger functions with fixed search_path
CREATE OR REPLACE FUNCTION public.generate_bug_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.code := 'BUG-' || lpad(nextval('public.bug_code_seq')::text, 6, '0');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.block_bug_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'Exclusão física de bugs não é permitida. Use closed ou rejected.' USING ERRCODE='check_violation';
END $$;

CREATE OR REPLACE FUNCTION public.block_bug_event_modification()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'Eventos de bug são imutáveis (append-only).' USING ERRCODE='check_violation';
END $$;

CREATE OR REPLACE FUNCTION public.bugs_code_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código do bug é imutável.' USING ERRCODE='check_violation';
  END IF;
  IF NEW.reported_by IS DISTINCT FROM OLD.reported_by THEN
    RAISE EXCEPTION 'O autor do registro do bug é imutável.' USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.validate_bug_status_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE _ok boolean;
BEGIN
  IF OLD.status IN ('rejected','wont_fix','duplicate') THEN
    RAISE EXCEPTION 'Bug em estado terminal (%) não pode ser alterado.', OLD.status USING ERRCODE='check_violation';
  END IF;

  _ok := CASE
    WHEN OLD.status = 'new'         AND NEW.status IN ('triage','rejected') THEN true
    WHEN OLD.status = 'triage'      AND NEW.status IN ('confirmed','rejected') THEN true
    WHEN OLD.status = 'confirmed'   AND NEW.status IN ('in_progress','rejected') THEN true
    WHEN OLD.status = 'in_progress' AND NEW.status IN ('in_testing') THEN true
    WHEN OLD.status = 'in_testing'  AND NEW.status IN ('fixed','in_progress') THEN true
    WHEN OLD.status = 'fixed'       AND NEW.status IN ('closed','in_progress') THEN true
    WHEN OLD.status = 'closed'      AND NEW.status IN ('in_progress') THEN true
    ELSE false
  END;

  IF NOT _ok THEN
    RAISE EXCEPTION 'Transição inválida de % para %.', OLD.status, NEW.status USING ERRCODE='check_violation';
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_bug_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status = 'fixed' THEN
    IF NEW.fixed_version IS NULL OR btrim(NEW.fixed_version) = '' THEN
      RAISE EXCEPTION 'A versão de correção (fixed_version) é obrigatória no status fixed.' USING ERRCODE='check_violation';
    END IF;
    NEW.fixed_at := COALESCE(NEW.fixed_at, now());
  ELSIF OLD.status = 'fixed' THEN
    NEW.fixed_at := NULL;
  END IF;

  IF NEW.status = 'confirmed' THEN
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  END IF;

  IF NEW.status = 'closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSE
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.log_bug_event_automated()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  _actor uuid := auth.uid();
  _type public.bug_event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'created', format('Bug %s registrado.', NEW.code), COALESCE(_actor, NEW.reported_by),
            jsonb_build_object('status', NEW.status, 'severity', NEW.severity,
                               'category', NEW.category, 'environment', NEW.environment,
                               'saas_product_id', NEW.saas_product_id, 'ticket_id', NEW.ticket_id));
    RETURN NULL;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _type := CASE
      WHEN NEW.status = 'fixed' THEN 'fixed'
      WHEN NEW.status = 'closed' THEN 'closed'
      WHEN NEW.status = 'rejected' THEN 'rejected'
      WHEN NEW.status = 'confirmed' THEN 'confirmed'
      WHEN OLD.status = 'closed' AND NEW.status = 'in_progress' THEN 'reopened'
      ELSE 'status_changed'
    END;
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, _type, format('Situação alterada de "%s" para "%s".', OLD.status, NEW.status), _actor,
            jsonb_build_object('field','status','from', OLD.status, 'to', NEW.status,
                               'fixed_at', NEW.fixed_at, 'closed_at', NEW.closed_at));
  END IF;

  IF NEW.severity IS DISTINCT FROM OLD.severity THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'severity_changed', 'Severidade alterada.', _actor,
            jsonb_build_object('field','severity','from', OLD.severity, 'to', NEW.severity));
  END IF;

  IF NEW.category IS DISTINCT FROM OLD.category THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'category_changed', 'Categoria alterada.', _actor,
            jsonb_build_object('field','category','from', OLD.category, 'to', NEW.category));
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'owner_changed', 'Responsável alterado.', _actor,
            jsonb_build_object('field','owner_id','from', OLD.owner_id, 'to', NEW.owner_id));
  END IF;

  IF NEW.affected_version IS DISTINCT FROM OLD.affected_version THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'affected_version_changed', 'Versão afetada alterada.', _actor,
            jsonb_build_object('field','affected_version','from', OLD.affected_version, 'to', NEW.affected_version));
  END IF;

  IF NEW.fixed_version IS DISTINCT FROM OLD.fixed_version THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'fixed_version_changed', 'Versão de correção alterada.', _actor,
            jsonb_build_object('field','fixed_version','from', OLD.fixed_version, 'to', NEW.fixed_version));
  END IF;

  IF NEW.request_id IS DISTINCT FROM OLD.request_id THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'request_id_changed', 'Request ID alterado.', _actor,
            jsonb_build_object('field','request_id','from', OLD.request_id, 'to', NEW.request_id));
  END IF;

  IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id AND NEW.ticket_id IS NOT NULL THEN
    INSERT INTO public.bug_events (bug_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'linked_to_ticket', 'Chamado vinculado ao bug.', _actor,
            jsonb_build_object('field','ticket_id','from', OLD.ticket_id, 'to', NEW.ticket_id));
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_bugs_code_immutable ON public.bugs;
CREATE TRIGGER trg_bugs_code_immutable BEFORE UPDATE ON public.bugs
FOR EACH ROW EXECUTE FUNCTION public.bugs_code_immutable();

-- 4) RLS cleanup: explicit roles only, no generic USING (true)
DROP POLICY IF EXISTS "Admins can do everything on bugs" ON public.bugs;
DROP POLICY IF EXISTS "Viewers can see all bugs" ON public.bugs;
DROP POLICY IF EXISTS "Anyone authenticated can see events of accessible bugs" ON public.bug_events;

CREATE POLICY "bug_events_select_internal_roles" ON public.bug_events
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operator')
  OR public.has_role(auth.uid(), 'viewer')
);

-- 5) Grants: strip excessive technical privileges, no anon access
REVOKE ALL ON public.bugs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bug_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.bug_code_seq FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.bugs TO authenticated;
GRANT SELECT, INSERT ON public.bug_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.bug_code_seq TO authenticated;
GRANT ALL ON public.bugs TO service_role;
GRANT ALL ON public.bug_events TO service_role;

-- 6) Attachments authorization must recognize 'bug'
CREATE OR REPLACE FUNCTION public.can_access_attachment_entity(_entity_type text, _entity_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  _uid uuid := auth.uid();
  _client_id uuid;
BEGIN
  IF _uid IS NULL OR _entity_id IS NULL OR _entity_type IS NULL THEN
    RETURN false;
  END IF;

  CASE _entity_type
    WHEN 'ticket' THEN
      IF NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'bug' THEN
      IF NOT EXISTS (SELECT 1 FROM public.bugs b WHERE b.id = _entity_id) THEN
        RETURN false;
      END IF;
      RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'operator') OR public.has_role(_uid, 'viewer');

    WHEN 'client' THEN
      RETURN public.can_access_client(_uid, _entity_id);

    WHEN 'lead' THEN
      RETURN public.can_access_lead(_uid, _entity_id);

    WHEN 'project' THEN
      RETURN public.can_access_project(_uid, _entity_id);

    WHEN 'client_service' THEN
      SELECT cs.client_id INTO _client_id FROM public.client_services cs WHERE cs.id = _entity_id;
      IF _client_id IS NULL THEN
        RETURN false;
      END IF;
      RETURN public.can_access_client(_uid, _client_id);

    ELSE
      RETURN false;
  END CASE;
END $$;

REVOKE ALL ON FUNCTION public.can_access_attachment_entity(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated, service_role;

-- 7) Supporting indexes
CREATE INDEX IF NOT EXISTS idx_bug_events_bug_created ON public.bug_events (bug_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bugs_product ON public.bugs (saas_product_id);
CREATE INDEX IF NOT EXISTS idx_bugs_owner ON public.bugs (owner_id);
