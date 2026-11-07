-- 1. has_role: impede que um usuário logado consulte papéis de outras pessoas.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _user_id IS NULL OR _role IS NULL THEN
    RETURN false;
  END IF;

  -- Contextos internos (service_role / cron / triggers sem sessão) não têm auth.uid().
  -- Chamadas com sessão só podem perguntar sobre o próprio usuário, exceto admins.
  IF _caller IS NOT NULL AND _user_id <> _caller THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _caller AND ur.role = 'admin'
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
END;
$function$;

-- 2. Tabelas de calendário: acesso exclusivo às rotinas de servidor.
REVOKE ALL ON public.calendar_integrations FROM anon, authenticated;
REVOKE ALL ON public.calendar_oauth_states FROM anon, authenticated;
REVOKE ALL ON public.calendar_sync_links FROM anon, authenticated;
GRANT ALL ON public.calendar_integrations TO service_role;
GRANT ALL ON public.calendar_oauth_states TO service_role;
GRANT ALL ON public.calendar_sync_links TO service_role;

COMMENT ON TABLE public.calendar_integrations IS 'Credenciais OAuth cifradas. Sem policies e sem grants para anon/authenticated: acesso apenas via service_role nos server functions.';
COMMENT ON TABLE public.calendar_oauth_states IS 'Nonces OAuth. Acesso apenas via service_role nos server functions.';

-- 3. onboarding_tokens: papel explícito na criação + sem acesso anônimo.
REVOKE ALL ON public.onboarding_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.onboarding_tokens TO authenticated;
GRANT ALL ON public.onboarding_tokens TO service_role;

DROP POLICY IF EXISTS onboarding_tokens_insert_admin_operator ON public.onboarding_tokens;
CREATE POLICY onboarding_tokens_insert_admin_operator
ON public.onboarding_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  AND public.can_access_onboarding(auth.uid(), client_service_onboarding_id)
);

DROP POLICY IF EXISTS onboarding_tokens_update_admin_operator ON public.onboarding_tokens;
CREATE POLICY onboarding_tokens_update_admin_operator
ON public.onboarding_tokens
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  AND public.can_access_onboarding(auth.uid(), client_service_onboarding_id)
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  AND public.can_access_onboarding(auth.uid(), client_service_onboarding_id)
);

-- 4. Respostas de briefing/onboarding: escrita apenas server-side (fail-closed explícito).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.briefing_responses FROM anon, authenticated;
REVOKE ALL ON public.briefing_responses FROM anon;
GRANT SELECT ON public.briefing_responses TO authenticated;
GRANT ALL ON public.briefing_responses TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.onboarding_responses FROM anon, authenticated;
REVOKE ALL ON public.onboarding_responses FROM anon;
GRANT SELECT ON public.onboarding_responses TO authenticated;
GRANT ALL ON public.onboarding_responses TO service_role;

COMMENT ON TABLE public.briefing_responses IS 'Escrita exclusivamente via server functions (service_role) que validam o token público antes de persistir. Leitura por authenticated restrita pelas policies de SELECT.';
COMMENT ON TABLE public.onboarding_responses IS 'Escrita exclusivamente via server functions (service_role) que validam o token público antes de persistir. Leitura por authenticated restrita pelas policies de SELECT.';