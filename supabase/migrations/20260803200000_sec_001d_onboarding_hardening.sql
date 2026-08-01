-- SEC-001D — Hardening de Onboarding, Tokens e Respostas
-- 1. Funções Auxiliares de Segurança
CREATE OR REPLACE FUNCTION public.can_access_onboarding(_user_id uuid, _onboarding_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Admin e Operator (via has_role)
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  -- Se for operator, verifica ownership
  IF public.has_role(_user_id, 'operator') THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.client_service_onboardings o
      JOIN public.client_services cs ON cs.id = o.client_service_id
      JOIN public.clients c ON c.id = cs.client_id
      WHERE o.id = _onboarding_id
        AND (cs.owner_id = _user_id OR c.owner_id = _user_id OR o.owner_id = _user_id)
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_onboarding(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_onboarding(uuid, uuid) TO authenticated, service_role;

-- 2. Grants: Limpeza total
REVOKE ALL ON public.client_service_onboardings FROM anon;
REVOKE ALL ON public.onboarding_tokens FROM anon;
REVOKE ALL ON public.onboarding_responses FROM anon;

REVOKE ALL ON public.client_service_onboardings FROM authenticated;
REVOKE ALL ON public.onboarding_tokens FROM authenticated;
REVOKE ALL ON public.onboarding_responses FROM authenticated;

-- Grants mínimos para authenticated
GRANT SELECT ON public.client_service_onboardings TO authenticated;
GRANT SELECT ON public.onboarding_tokens TO authenticated;
GRANT SELECT ON public.onboarding_responses TO authenticated;
GRANT UPDATE (status, revoked_at) ON public.onboarding_tokens TO authenticated; -- Para revogação via RLS se necessário, embora prefira server functions

-- 3. RLS: Hardening
ALTER TABLE public.client_service_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_onboardings_select_authenticated ON public.client_service_onboardings;
CREATE POLICY cs_onboardings_select_authenticated ON public.client_service_onboardings
FOR SELECT TO authenticated
USING (public.can_access_onboarding(auth.uid(), id));

DROP POLICY IF EXISTS cs_onboardings_insert_admin_operator ON public.client_service_onboardings;
CREATE POLICY cs_onboardings_insert_admin_operator ON public.client_service_onboardings
FOR INSERT TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  AND (EXISTS (
    SELECT 1 FROM public.client_services cs 
    JOIN public.clients c ON c.id = cs.client_id
    WHERE cs.id = client_service_id 
    AND (cs.owner_id = auth.uid() OR c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ))
);

DROP POLICY IF EXISTS cs_onboardings_update_admin_operator ON public.client_service_onboardings;
CREATE POLICY cs_onboardings_update_admin_operator ON public.client_service_onboardings
FOR UPDATE TO authenticated
USING (public.can_access_onboarding(auth.uid(), id))
WITH CHECK (public.can_access_onboarding(auth.uid(), id));

-- Tokens RLS
DROP POLICY IF EXISTS onboarding_tokens_select_authenticated ON public.onboarding_tokens;
CREATE POLICY onboarding_tokens_select_authenticated ON public.onboarding_tokens
FOR SELECT TO authenticated
USING (public.can_access_onboarding(auth.uid(), client_service_onboarding_id));

DROP POLICY IF EXISTS onboarding_tokens_insert_admin_operator ON public.onboarding_tokens;
CREATE POLICY onboarding_tokens_insert_admin_operator ON public.onboarding_tokens
FOR INSERT TO authenticated
WITH CHECK (public.can_access_onboarding(auth.uid(), client_service_onboarding_id));

DROP POLICY IF EXISTS onboarding_tokens_update_admin_operator ON public.onboarding_tokens;
CREATE POLICY onboarding_tokens_update_admin_operator ON public.onboarding_tokens
FOR UPDATE TO authenticated
USING (public.can_access_onboarding(auth.uid(), client_service_onboarding_id))
WITH CHECK (public.can_access_onboarding(auth.uid(), client_service_onboarding_id));

-- Responses RLS
DROP POLICY IF EXISTS onboarding_responses_select_authenticated ON public.onboarding_responses;
CREATE POLICY onboarding_responses_select_authenticated ON public.onboarding_responses
FOR SELECT TO authenticated
USING (
  public.can_access_onboarding(auth.uid(), client_service_onboarding_id)
  AND NOT (public.has_role(auth.uid(), 'viewer')) -- Viewer não vê respostas brutas
);

-- 4. Função hydrate_onboarding_defaults Hardening
CREATE OR REPLACE FUNCTION public.hydrate_onboarding_defaults(_client_service_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
  -- Autorização explícita: chamador deve ter acesso à contratação
  -- Se chamado via server function (contexto Supabase), auth.uid() estará setado.
  -- Se for cron/service_role, auth.uid() pode ser nulo, mas SECURITY DEFINER roda como postgres.
  -- Adicionamos verificação para authenticated se não for service_role.
  
  IF auth.role() = 'authenticated' AND NOT (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (
      SELECT 1 FROM public.client_services cs 
      JOIN public.clients c ON c.id = cs.client_id
      WHERE cs.id = _client_service_id 
      AND (cs.owner_id = auth.uid() OR c.owner_id = auth.uid())
    )
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

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
END;
$$;
