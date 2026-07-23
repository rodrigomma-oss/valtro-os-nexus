
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.project_status AS ENUM (
  'nao_iniciado','planejamento','em_desenvolvimento','em_revisao','aguardando_cliente','concluido','cancelado'
);

CREATE TYPE public.project_event_type AS ENUM (
  'projeto_criado','status_alterado','responsavel_alterado','datas_alteradas',
  'observacao_adicionada','projeto_concluido','projeto_cancelado','vinculo_proposta','cliente_atualizado'
);

CREATE TYPE public.client_status AS ENUM ('ativo','inativo','arquivado');

-- =========================
-- CLIENTS
-- =========================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  segment TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.client_status NOT NULL DEFAULT 'ativo',
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_authenticated" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert_admin_operator" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "clients_update_admin_operator" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "clients_delete_admin" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- LEADS.client_id
-- =========================
ALTER TABLE public.leads
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX idx_leads_client_id ON public.leads(client_id);

-- =========================
-- PROJECTS
-- =========================
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'nao_iniciado',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_proposal_id ON public.projects(proposal_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_authenticated" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert_admin_operator" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "projects_update_admin_operator" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PROJECT_EVENTS
-- =========================
CREATE TABLE public.project_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type public.project_event_type NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_events_project_id ON public.project_events(project_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_events TO authenticated;
GRANT ALL ON public.project_events TO service_role;

ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_events_select_authenticated" ON public.project_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_events_insert_admin_operator" ON public.project_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

-- =========================
-- FUNCTIONS
-- =========================

-- Numeração automática
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  _year TEXT := to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY');
  _seq INT;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(code FROM 'PROJ-' || _year || '-(\d+)')::INT), 0) + 1
      INTO _seq FROM public.projects WHERE code LIKE 'PROJ-' || _year || '-%';
    NEW.code := 'PROJ-' || _year || '-' || lpad(_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_generate_project_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.generate_project_code();

-- Log criação
CREATE OR REPLACE FUNCTION public.log_project_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  INSERT INTO public.project_events (project_id, type, description, created_by, metadata)
  VALUES (NEW.id, 'projeto_criado',
          format('Projeto %s criado.', COALESCE(NEW.code, NEW.name)),
          NEW.created_by,
          jsonb_build_object('code', NEW.code, 'name', NEW.name, 'client_id', NEW.client_id, 'proposal_id', NEW.proposal_id));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_created();

-- Log alterações relevantes
CREATE OR REPLACE FUNCTION public.log_project_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_events (project_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'status_alterado',
            format('Status alterado de "%s" para "%s".', OLD.status, NEW.status),
            auth.uid(),
            jsonb_build_object('from', OLD.status, 'to', NEW.status));

    IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      INSERT INTO public.project_events (project_id, type, description, created_by)
      VALUES (NEW.id, 'projeto_concluido', format('Projeto %s concluído.', NEW.code), auth.uid());
    END IF;

    IF NEW.status = 'cancelado' AND (OLD.status IS DISTINCT FROM 'cancelado') THEN
      INSERT INTO public.project_events (project_id, type, description, created_by)
      VALUES (NEW.id, 'projeto_cancelado', format('Projeto %s cancelado.', NEW.code), auth.uid());
    END IF;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO public.project_events (project_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'responsavel_alterado', 'Responsável do projeto alterado.', auth.uid(),
            jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id));
  END IF;

  IF NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.project_events (project_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'datas_alteradas', 'Datas do projeto atualizadas.', auth.uid(),
            jsonb_build_object('start_date', NEW.start_date, 'due_date', NEW.due_date));
  END IF;

  IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id AND NEW.proposal_id IS NOT NULL THEN
    INSERT INTO public.project_events (project_id, type, description, created_by, metadata)
    VALUES (NEW.id, 'vinculo_proposta', 'Proposta vinculada ao projeto.', auth.uid(),
            jsonb_build_object('proposal_id', NEW.proposal_id));
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_project_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_updated();

-- Conversão Lead -> Cliente (idempotente)
CREATE OR REPLACE FUNCTION public.convert_lead_to_client(_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  _client_id UUID;
  _lead public.leads%ROWTYPE;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead % não encontrado.', _lead_id;
  END IF;
  IF _lead.contact_name IS NULL OR _lead.company_name IS NULL THEN
    RAISE EXCEPTION 'Lead sem dados mínimos para conversão.';
  END IF;

  SELECT id INTO _client_id FROM public.clients WHERE lead_id = _lead_id;
  IF _client_id IS NOT NULL THEN
    RETURN _client_id;
  END IF;

  INSERT INTO public.clients (
    lead_id, company_name, contact_name, email, phone, city, state, segment, owner_id, created_by
  ) VALUES (
    _lead.id, _lead.company_name, _lead.contact_name, _lead.email, _lead.phone,
    _lead.city, _lead.state, _lead.segment, _lead.owner_id, COALESCE(auth.uid(), _lead.owner_id)
  )
  RETURNING id INTO _client_id;

  UPDATE public.leads SET client_id = _client_id WHERE id = _lead_id;

  INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
  VALUES (_lead_id, 'oportunidade_convertida',
          format('Lead convertido em cliente.'),
          auth.uid(),
          jsonb_build_object('client_id', _client_id));

  RETURN _client_id;
END $$;

-- Extensão do trigger de status de proposta:
-- ao aprovar, cria Cliente + Projeto (idempotente).
CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  _type public.lead_event_type;
  _desc TEXT;
  _client_id UUID;
  _project_id UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'aprovada' THEN
      _type := 'proposta_aprovada';
      _desc := format('Proposta %s aprovada.', NEW.number);

      UPDATE public.leads
        SET status = 'ganho', next_action = NULL
        WHERE id = NEW.lead_id AND status <> 'ganho';

      -- Cria cliente (idempotente)
      BEGIN
        _client_id := public.convert_lead_to_client(NEW.lead_id);
      EXCEPTION WHEN OTHERS THEN
        _client_id := NULL;
      END;

      -- Cria projeto vinculado se ainda não existir para essa proposta
      IF _client_id IS NOT NULL THEN
        SELECT id INTO _project_id FROM public.projects WHERE proposal_id = NEW.id;
        IF _project_id IS NULL THEN
          INSERT INTO public.projects (client_id, proposal_id, name, description, status, owner_id, created_by)
          VALUES (_client_id, NEW.id, NEW.title,
                  'Projeto originado da proposta ' || NEW.number,
                  'nao_iniciado', NEW.owner_id, COALESCE(auth.uid(), NEW.owner_id));
        END IF;
      END IF;

    ELSIF NEW.status = 'rejeitada' THEN
      _type := 'proposta_rejeitada';
      _desc := format('Proposta %s rejeitada.', NEW.number);
    ELSE
      _type := 'proposta_status_alterado';
      _desc := format('Proposta %s: status alterado de "%s" para "%s".', NEW.number, OLD.status, NEW.status);
    END IF;

    INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
    VALUES (NEW.lead_id, _type, _desc, auth.uid(),
            jsonb_build_object('proposal_id', NEW.id, 'number', NEW.number, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;
