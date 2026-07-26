CREATE OR REPLACE FUNCTION public.convert_lead_to_client(_lead_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _client_id UUID;
  _lead public.leads%ROWTYPE;
  _caller UUID := auth.uid();
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead % não encontrado.', _lead_id;
  END IF;

  -- Autorização explícita (sem bypass por auth.uid() IS NULL):
  -- admin converte qualquer lead; operator apenas o lead do qual é responsável.
  IF NOT (
    public.has_role(_caller, 'admin')
    OR (public.has_role(_caller, 'operator') AND _lead.owner_id = _caller)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para converter este lead em cliente.'
      USING ERRCODE = 'insufficient_privilege';
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
    _lead.city, _lead.state, _lead.segment, _lead.owner_id, COALESCE(_caller, _lead.owner_id)
  )
  RETURNING id INTO _client_id;

  UPDATE public.leads SET client_id = _client_id WHERE id = _lead_id;

  INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
  VALUES (_lead_id, 'oportunidade_convertida',
          format('Lead convertido em cliente.'),
          _caller,
          jsonb_build_object('client_id', _client_id));

  RETURN _client_id;
END $function$;