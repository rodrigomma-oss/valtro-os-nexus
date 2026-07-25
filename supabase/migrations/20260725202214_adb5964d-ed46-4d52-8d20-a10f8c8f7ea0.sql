-- ============================================================
-- Sprint 13.5 — Onboarding pós-venda por contratação
-- ============================================================

-- 1) Status do onboarding
DO $$ BEGIN
  CREATE TYPE public.onboarding_status AS ENUM ('pendente','enviado','em_preenchimento','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Novos tipos de evento na timeline da contratação
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'onboarding_created';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'onboarding_sent';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'onboarding_started';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'onboarding_completed';
ALTER TYPE public.client_service_event_type ADD VALUE IF NOT EXISTS 'onboarding_revoked';

-- 3) Entidade principal: onboarding da contratação
CREATE TABLE public.client_service_onboardings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  status public.onboarding_status NOT NULL DEFAULT 'pendente',
  owner_id UUID,
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.client_service_onboardings TO authenticated;
GRANT ALL ON public.client_service_onboardings TO service_role;
ALTER TABLE public.client_service_onboardings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_onboardings_select_authenticated"
  ON public.client_service_onboardings FOR SELECT TO authenticated USING (true);
CREATE POLICY "cs_onboardings_insert_admin_operator"
  ON public.client_service_onboardings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "cs_onboardings_update_admin_operator"
  ON public.client_service_onboardings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE INDEX idx_cs_onboardings_client_service ON public.client_service_onboardings(client_service_id);
-- Apenas UM onboarding ativo por contratação/template
CREATE UNIQUE INDEX uq_cs_onboardings_active
  ON public.client_service_onboardings(client_service_id, template_key)
  WHERE status IN ('pendente','enviado','em_preenchimento');

CREATE TRIGGER trg_cs_onboardings_updated_at
  BEFORE UPDATE ON public.client_service_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Tokens públicos (vinculados ao onboarding, nunca ao cliente)
CREATE TABLE public.onboarding_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_onboarding_id UUID NOT NULL REFERENCES public.client_service_onboardings(id) ON DELETE CASCADE,
  status public.token_status NOT NULL DEFAULT 'pendente',
  expires_at TIMESTAMPTZ NOT NULL,
  last_access_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.onboarding_tokens TO authenticated;
GRANT ALL ON public.onboarding_tokens TO service_role;
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_tokens_select_authenticated"
  ON public.onboarding_tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "onboarding_tokens_insert_admin_operator"
  ON public.onboarding_tokens FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "onboarding_tokens_update_admin_operator"
  ON public.onboarding_tokens FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE INDEX idx_onboarding_tokens_onboarding ON public.onboarding_tokens(client_service_onboarding_id);

CREATE TRIGGER trg_onboarding_tokens_updated_at
  BEFORE UPDATE ON public.onboarding_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Respostas do onboarding
CREATE TABLE public.onboarding_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL UNIQUE REFERENCES public.onboarding_tokens(id) ON DELETE CASCADE,
  client_service_onboarding_id UUID NOT NULL REFERENCES public.client_service_onboardings(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.onboarding_responses TO authenticated;
GRANT ALL ON public.onboarding_responses TO service_role;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_responses_select_authenticated"
  ON public.onboarding_responses FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_onboarding_responses_onboarding ON public.onboarding_responses(client_service_onboarding_id);

CREATE TRIGGER trg_onboarding_responses_updated_at
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Timeline: eventos automáticos em client_service_events
CREATE OR REPLACE FUNCTION public.log_onboarding_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.client_service_events (client_service_id, event_type, title, description, actor_id, metadata)
  VALUES (NEW.client_service_id, 'onboarding_created', 'Onboarding criado',
          format('Onboarding "%s" aberto.', NEW.template_key),
          COALESCE(NEW.created_by, auth.uid()),
          jsonb_build_object('onboarding_id', NEW.id, 'template_key', NEW.template_key));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_onboarding_created
  AFTER INSERT ON public.client_service_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.log_onboarding_created();

CREATE OR REPLACE FUNCTION public.log_onboarding_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE _type public.client_service_event_type; _title TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'enviado' THEN _type := 'onboarding_sent'; _title := 'Onboarding enviado';
    ELSIF NEW.status = 'em_preenchimento' THEN _type := 'onboarding_started'; _title := 'Onboarding iniciado pelo cliente';
    ELSIF NEW.status = 'concluido' THEN _type := 'onboarding_completed'; _title := 'Onboarding concluído';
    ELSIF NEW.status = 'cancelado' THEN _type := 'onboarding_revoked'; _title := 'Onboarding revogado';
    ELSE _type := NULL;
    END IF;

    IF _type IS NOT NULL THEN
      INSERT INTO public.client_service_events (client_service_id, event_type, title, description, actor_id, metadata)
      VALUES (NEW.client_service_id, _type, _title,
              format('Status do onboarding alterado de "%s" para "%s".', OLD.status, NEW.status),
              auth.uid(),
              jsonb_build_object('onboarding_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_onboarding_status_change
  AFTER UPDATE ON public.client_service_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.log_onboarding_status_change();

-- 7) Pré-preenchimento com whitelist explícita (nunca credenciais)
CREATE OR REPLACE FUNCTION public.hydrate_onboarding_defaults(_client_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _client_id UUID; _lead_id UUID;
  _company TEXT; _contact TEXT; _email TEXT; _phone TEXT; _city TEXT; _state TEXT; _segment TEXT;
  _service_name TEXT; _scope JSONB;
  _out JSONB := '{}'::jsonb; _briefing JSONB; _prev JSONB; _k TEXT;
  _allowed TEXT[] := ARRAY[
    'empresa','nome','email','whatsapp','cidade','estado','segmento',
    'loja_nome','link_loja','categorias','ticket_medio','objetivo_principal'
  ];
BEGIN
  SELECT cs.client_id, cs.name_snapshot, cs.scope_snapshot,
         c.lead_id, c.company_name, c.contact_name, c.email, c.phone, c.city, c.state, c.segment
    INTO _client_id, _service_name, _scope,
         _lead_id, _company, _contact, _email, _phone, _city, _state, _segment
  FROM public.client_services cs
  JOIN public.clients c ON c.id = cs.client_id
  WHERE cs.id = _client_service_id;

  IF _client_id IS NULL THEN RETURN _out; END IF;

  _out := jsonb_strip_nulls(jsonb_build_object(
    'empresa', _company,
    'nome', _contact,
    'email', _email,
    'whatsapp', _phone,
    'cidade', _city,
    'estado', _state,
    'segmento', _segment,
    'servico_contratado', _service_name
  ));

  IF _lead_id IS NOT NULL THEN
    SELECT br.data INTO _briefing
    FROM public.briefing_responses br
    WHERE br.lead_id = _lead_id AND br.completed_at IS NOT NULL
    ORDER BY br.completed_at DESC LIMIT 1;

    IF _briefing IS NOT NULL THEN
      FOREACH _k IN ARRAY _allowed LOOP
        IF (_briefing ? _k) AND NOT (_out ? _k) AND jsonb_typeof(_briefing->_k) = 'string' THEN
          _out := _out || jsonb_build_object(_k, _briefing->_k);
        END IF;
      END LOOP;
    END IF;
  END IF;

  SELECT r.data INTO _prev
  FROM public.onboarding_responses r
  JOIN public.client_service_onboardings o ON o.id = r.client_service_onboarding_id
  JOIN public.client_services cs2 ON cs2.id = o.client_service_id
  WHERE cs2.client_id = _client_id AND r.completed_at IS NOT NULL
  ORDER BY r.completed_at DESC LIMIT 1;

  IF _prev IS NOT NULL THEN
    FOREACH _k IN ARRAY _allowed LOOP
      IF (_prev ? _k) AND NOT (_out ? _k) AND jsonb_typeof(_prev->_k) = 'string' THEN
        _out := _out || jsonb_build_object(_k, _prev->_k);
      END IF;
    END LOOP;
  END IF;

  RETURN _out;
END $$;

REVOKE ALL ON FUNCTION public.hydrate_onboarding_defaults(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hydrate_onboarding_defaults(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.hydrate_onboarding_defaults(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_onboarding_created() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_onboarding_status_change() FROM PUBLIC;