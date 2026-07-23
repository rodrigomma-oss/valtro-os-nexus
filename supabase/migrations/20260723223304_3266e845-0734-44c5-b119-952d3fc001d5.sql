
-- Endurecer has_role: usuários só podem consultar suas próprias roles.
-- RLS sempre chama com auth.uid() — o comportamento das policies não muda.
-- service_role continua com acesso irrestrito para operações administrativas.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _user_id = auth.uid()
        OR auth.uid() IS NULL   -- permite chamadas internas (triggers/definer chains)
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
