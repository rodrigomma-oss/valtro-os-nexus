CREATE OR REPLACE FUNCTION public.can_access_onboarding(_user_id uuid, _onboarding_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF _user_id IS NULL OR _onboarding_id IS NULL THEN
    RETURN false;
  END IF;

  -- Registro inexistente nunca concede acesso, inclusive para admin.
  IF NOT EXISTS (
    SELECT 1 FROM public.client_service_onboardings o WHERE o.id = _onboarding_id
  ) THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

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
$function$;

REVOKE ALL ON FUNCTION public.can_access_onboarding(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_onboarding(uuid, uuid) TO authenticated, service_role;
