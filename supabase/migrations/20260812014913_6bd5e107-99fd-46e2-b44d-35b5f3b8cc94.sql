DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS sig, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    IF r.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(r.proconfig) c WHERE c LIKE 'search_path=%'
    ) THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', r.sig);
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_lead(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_onboarding(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hydrate_onboarding_defaults(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_user_admin_event(uuid, uuid, text, jsonb) TO service_role;