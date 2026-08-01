-- ============================================================
-- VOS-001C — Atendimento / Chamados
-- ============================================================

CREATE TYPE public.ticket_status AS ENUM ('open','waiting_customer','waiting_internal','resolved','closed','cancelled');
CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high','urgent');
CREATE TYPE public.ticket_category AS ENUM ('support','question','commercial','billing','technical','other');
CREATE TYPE public.ticket_source AS ENUM ('admin','portal','email','api');
CREATE TYPE public.ticket_event_type AS ENUM (
  'created','status_changed','owner_changed','priority_changed','closed','reopened','note_added'
);

CREATE SEQUENCE public.ticket_protocol_seq START 1;

CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES public.services(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES auth.users(id),
  owner_id UUID REFERENCES auth.users(id),
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  category public.ticket_category NOT NULL DEFAULT 'support',
  source public.ticket_source NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
GRANT USAGE ON SEQUENCE public.ticket_protocol_seq TO authenticated, service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select_authenticated" ON public.tickets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tickets_insert_admin_operator" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "tickets_update_admin_operator" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE INDEX tickets_status_idx ON public.tickets(status);
CREATE INDEX tickets_owner_idx ON public.tickets(owner_id);
CREATE INDEX tickets_product_idx ON public.tickets(product_id);

-- ------------------------------------------------------------
-- ticket_events (imutável)
-- ------------------------------------------------------------
CREATE TABLE public.ticket_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  type public.ticket_event_type NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_events TO authenticated;
GRANT ALL ON public.ticket_events TO service_role;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_events_select_authenticated" ON public.ticket_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ticket_events_insert_admin_operator" ON public.ticket_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE INDEX ticket_events_ticket_idx ON public.ticket_events(ticket_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ticket_events_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Eventos de chamado são imutáveis.' USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER ticket_events_no_update BEFORE UPDATE ON public.ticket_events
  FOR EACH ROW EXECUTE FUNCTION public.ticket_events_immutable();
CREATE TRIGGER ticket_events_no_delete BEFORE DELETE ON public.ticket_events
  FOR EACH ROW EXECUTE FUNCTION public.ticket_events_immutable();

-- ------------------------------------------------------------
-- Protocolo automático TCK-000001
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ticket_protocol()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public','pg_temp' AS $$
BEGIN
  IF NEW.protocol IS NULL OR btrim(NEW.protocol) = '' THEN
    NEW.protocol := 'TCK-' || lpad(nextval('public.ticket_protocol_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tickets_set_protocol BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_protocol();

CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Coerência de datas + bloqueio de DELETE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tickets_sync_dates()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public','pg_temp' AS $$
BEGIN
  NEW.title := btrim(NEW.title);
  IF NEW.status IN ('closed','cancelled','resolved') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  ELSE
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tickets_sync_dates_trg BEFORE INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_sync_dates();

CREATE OR REPLACE FUNCTION public.tickets_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Chamados não podem ser excluídos; use os status encerrado/cancelado.'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER tickets_no_delete BEFORE DELETE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_block_delete();

-- ------------------------------------------------------------
-- Log automático de eventos
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public','pg_temp' AS $$
BEGIN
  INSERT INTO public.ticket_events (ticket_id, type, description, created_by, metadata)
  VALUES (NEW.id, 'created', format('Chamado %s aberto.', NEW.protocol),
          COALESCE(NEW.created_by, auth.uid()),
          jsonb_build_object('protocol', NEW.protocol, 'status', NEW.status,
                             'priority', NEW.priority, 'category', NEW.category, 'source', NEW.source));
  RETURN NEW;
END $$;

CREATE TRIGGER tickets_log_created AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_created();

CREATE OR REPLACE FUNCTION public.log_ticket_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public','pg_temp' AS $$
DECLARE _actor UUID := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('closed','cancelled') THEN
      INSERT INTO public.ticket_events (ticket_id, type, description, created_by, metadata)
      VALUES (NEW.id, 'closed', format('Chamado encerrado (%s).', NEW.status), _actor,
              jsonb_build_object('from', OLD.status, 'to', NEW.status));
    ELSIF OLD.status IN ('closed','cancelled','resolved') THEN
      INSERT INTO public.ticket_events (ticket_id, type, description, created_by, metadata)
      VALUES (NEW.id, 'reopened', 'Chamado reaberto.', _actor,
              jsonb_build_object('from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.ticket_events (ticket_id, type, description, created_by, metadata)
      VALUES (NEW.id, 'status_changed',
              format('Status alterado de "%s" para "%s".', OLD.status, NEW.status), _actor,
              jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO public.ticket_events (ticket_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'owner_changed', 'Responsável do chamado alterado.', _actor,
            jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id));
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.ticket_events (ticket_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'priority_changed',
            format('Prioridade alterada de "%s" para "%s".', OLD.priority, NEW.priority), _actor,
            jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tickets_log_updated AFTER UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_updated();

-- ============================================================
-- Anexos (infraestrutura ausente no banco) — usada pela tela do chamado
-- ============================================================
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select_authenticated" ON public.attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "attachments_insert_admin_operator" ON public.attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "attachments_update_admin_operator" ON public.attachments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE INDEX attachments_entity_idx ON public.attachments(entity_type, entity_id) WHERE deleted_at IS NULL;

CREATE TRIGGER attachments_updated_at BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();