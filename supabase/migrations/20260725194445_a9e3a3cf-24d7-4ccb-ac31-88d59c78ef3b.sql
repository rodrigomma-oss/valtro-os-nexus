
DO $$ BEGIN
  CREATE TYPE public.client_service_event_type AS ENUM (
    'created','activated','paused','resumed','completed','cancelled','status_changed','note_added'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.client_service_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  event_type public.client_service_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_service_events_service_idx
  ON public.client_service_events (client_service_id, created_at DESC);

GRANT SELECT, INSERT ON public.client_service_events TO authenticated;
GRANT ALL ON public.client_service_events TO service_role;

ALTER TABLE public.client_service_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_service_events_select_authenticated ON public.client_service_events;
CREATE POLICY client_service_events_select_authenticated
  ON public.client_service_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS client_service_events_insert_admin_operator ON public.client_service_events;
CREATE POLICY client_service_events_insert_admin_operator
  ON public.client_service_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- Imutabilidade: sem UPDATE/DELETE (nenhuma policy) + bloqueio explícito
CREATE OR REPLACE FUNCTION public.client_service_events_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Eventos de contratação são imutáveis.' USING ERRCODE = 'check_violation';
END $$;

DROP TRIGGER IF EXISTS client_service_events_no_mutation ON public.client_service_events;
CREATE TRIGGER client_service_events_no_mutation
  BEFORE UPDATE OR DELETE ON public.client_service_events
  FOR EACH ROW EXECUTE FUNCTION public.client_service_events_immutable();

-- Sem DELETE físico em client_services
CREATE OR REPLACE FUNCTION public.client_services_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Contratações não podem ser excluídas; use o status cancelado.' USING ERRCODE = 'check_violation';
END $$;

DROP TRIGGER IF EXISTS client_services_no_delete ON public.client_services;
CREATE TRIGGER client_services_no_delete
  BEFORE DELETE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.client_services_block_delete();

-- Validação central de transição
CREATE OR REPLACE FUNCTION public.client_service_transition_allowed(
  _from public.client_service_status, _to public.client_service_status
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $$
  SELECT CASE
    WHEN _from = _to THEN false
    WHEN _from = 'pendente'  AND _to IN ('ativo','cancelado') THEN true
    WHEN _from = 'ativo'     AND _to IN ('pausado','concluido','cancelado') THEN true
    WHEN _from = 'pausado'   AND _to IN ('ativo','cancelado') THEN true
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.client_services_validate_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.client_service_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %.', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS client_services_validate_transition_trg ON public.client_services;
CREATE TRIGGER client_services_validate_transition_trg
  BEFORE UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.client_services_validate_transition();

-- Datas coerentes (não sobrescreve histórico)
DROP TRIGGER IF EXISTS client_services_sync_dates_trg ON public.client_services;
CREATE TRIGGER client_services_sync_dates_trg
  BEFORE INSERT OR UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.client_services_sync_dates();

DROP TRIGGER IF EXISTS client_services_set_updated_at ON public.client_services;
CREATE TRIGGER client_services_set_updated_at
  BEFORE UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoria automática
CREATE OR REPLACE FUNCTION public.log_client_service_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  INSERT INTO public.client_service_events (client_service_id, event_type, title, description, actor_id, metadata)
  VALUES (NEW.id, 'created', 'Contratação criada',
          format('Contratação de "%s" registrada.', NEW.name_snapshot),
          COALESCE(NEW.created_by, auth.uid()),
          jsonb_build_object('status', NEW.status, 'proposal_id', NEW.proposal_id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS log_client_service_created_trg ON public.client_services;
CREATE TRIGGER log_client_service_created_trg
  AFTER INSERT ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.log_client_service_created();

CREATE OR REPLACE FUNCTION public.log_client_service_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  _type public.client_service_event_type;
  _title TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'ativo' AND OLD.status = 'pausado' THEN
      _type := 'resumed'; _title := 'Contratação retomada';
    ELSIF NEW.status = 'ativo' THEN
      _type := 'activated'; _title := 'Contratação ativada';
    ELSIF NEW.status = 'pausado' THEN
      _type := 'paused'; _title := 'Contratação pausada';
    ELSIF NEW.status = 'concluido' THEN
      _type := 'completed'; _title := 'Contratação concluída';
    ELSIF NEW.status = 'cancelado' THEN
      _type := 'cancelled'; _title := 'Contratação cancelada';
    ELSE
      _type := 'status_changed'; _title := 'Status alterado';
    END IF;

    INSERT INTO public.client_service_events (client_service_id, event_type, title, description, actor_id, metadata)
    VALUES (NEW.id, _type, _title,
            format('Status alterado de "%s" para "%s".', OLD.status, NEW.status),
            auth.uid(),
            jsonb_build_object('from', OLD.status, 'to', NEW.status, 'at', now()));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS log_client_service_status_change_trg ON public.client_services;
CREATE TRIGGER log_client_service_status_change_trg
  AFTER UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.log_client_service_status_change();
