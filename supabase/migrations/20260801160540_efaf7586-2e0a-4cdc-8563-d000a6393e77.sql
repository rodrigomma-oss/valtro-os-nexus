-- =====================================================================
-- SEC-001G — Hardening das funções SECURITY DEFINER
-- Escopo: search_path, grants de EXECUTE, autorização de auditoria.
-- Nenhuma alteração de RLS/policies, regras comerciais ou interface.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. log_user_admin_event — vulnerabilidade real (actor_id arbitrário,
--    EXECUTE para PUBLIC/anon, sem validação de papel).
--    Reescrita: actor derivado de auth.uid(), exigência de admin,
--    snapshots de identidade capturados internamente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_user_admin_event(
    _actor_id uuid,
    _target_user_id uuid,
    _action text,
    _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    _event_id uuid;
    _caller uuid := auth.uid();
    _actor_email text;
    _actor_name text;
    _target_email text;
    _target_name text;
BEGIN
    -- Identidade NUNCA vem do cliente: o parâmetro _actor_id é ignorado como
    -- fonte de verdade e apenas validado para detectar tentativa de forja.
    IF _caller IS NULL THEN
        RAISE EXCEPTION 'Auditoria administrativa exige sessão autenticada.'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NOT public.has_role(_caller, 'admin') THEN
        RAISE EXCEPTION 'Apenas administradores podem registrar eventos administrativos.'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF _actor_id IS NOT NULL AND _actor_id <> _caller THEN
        RAISE EXCEPTION 'Autor do evento administrativo não pode ser falsificado.'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF _action NOT IN ('invite', 'role_change', 'block', 'unblock') THEN
        RAISE EXCEPTION 'Ação de auditoria não suportada: %', _action
          USING ERRCODE = 'check_violation';
    END IF;

    SELECT u.email INTO _actor_email FROM auth.users u WHERE u.id = _caller;
    SELECT p.full_name INTO _actor_name FROM public.profiles p WHERE p.id = _caller;

    IF _target_user_id IS NOT NULL THEN
        SELECT u.email INTO _target_email FROM auth.users u WHERE u.id = _target_user_id;
        SELECT p.full_name INTO _target_name FROM public.profiles p WHERE p.id = _target_user_id;
    END IF;

    INSERT INTO public.user_admin_audit_events (
        actor_id, target_user_id, action, metadata,
        actor_email, actor_name, target_email, target_name
    )
    VALUES (
        _caller, _target_user_id, _action, COALESCE(_metadata, '{}'::jsonb),
        _actor_email, _actor_name, _target_email, _target_name
    )
    RETURNING id INTO _event_id;

    RETURN _event_id;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2. search_path seguro e determinístico para TODAS as funções
--    SECURITY DEFINER do schema public (preserva a lógica atual).
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r record;
  _path text;
BEGIN
  FOR r IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.prorettype = 'pg_catalog.trigger'::regtype AS is_trigger,
           coalesce(array_to_string(p.proconfig, ','), '') AS cfg
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.cfg LIKE '%vault%' THEN
      _path := 'pg_catalog, public, vault, pg_temp';
    ELSIF r.is_trigger THEN
      _path := 'pg_catalog, public, pg_temp';
    ELSE
      _path := 'pg_catalog, public';
    END IF;

    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = %s',
                   r.proname, r.args, _path);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Grants de EXECUTE — princípio do menor privilégio.
--    3a. Revoga PUBLIC/anon/authenticated de toda função SECURITY DEFINER.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
                   r.proname, r.args);
  END LOOP;
END $$;

-- 3b. Reconcede EXECUTE a `authenticated` apenas onde o fluxo autenticado
--     depende diretamente da função (policies RLS e server functions).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lead(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_onboarding(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_attachment_entity(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_admin_event(uuid, uuid, text, jsonb) TO authenticated;
