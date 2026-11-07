-- 1. Revogar grants perigosos de PUBLIC e anon na função atual (limpeza prévia)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- 2. Recriar a função has_role com contrato endurecido
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- Retorna true somente se o par usuário/papel existir
  -- Retorna false se _user_id for nulo ou o par não for encontrado
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 3. Configurar Owner (deve ser postgres para SECURITY DEFINER em tabelas do sistema)
ALTER FUNCTION public.has_role(uuid, app_role) OWNER TO postgres;

-- 4. Gerenciar Grants de EXECUTE (Estado Final)
-- Revoga de PUBLIC explicitamente (redundância de segurança)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;

-- Concede apenas a authenticated (para RLS) e service_role (para server functions/jobs)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 5. Auditoria e Hardening de user_roles (Estado Final)
-- Garante que anon não tem acesso algum
REVOKE ALL ON TABLE public.user_roles FROM anon;

-- Garante que authenticated tem apenas SELECT (necessário para has_role funcionar se fosse invoker, 
-- mas como é SECURITY DEFINER, authenticated nem precisaria de SELECT direto, 
-- porém mantemos SELECT para que o usuário veja seus próprios papéis no CRM/UI)
REVOKE ALL ON TABLE public.user_roles FROM authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

-- INSERT/UPDATE/DELETE restritos a service_role (usado pelas funções administrativas SECURITY DEFINER)
GRANT ALL ON TABLE public.user_roles TO service_role;

-- 6. Garantir RLS em user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Recriar as políticas de user_roles para garantir que usuários não se promovam
DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem alterar papéis (através do app/funções administrativas)
-- Se houver necessidade de INSERT direto via SQL (não recomendado), restringimos:
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
CREATE POLICY "user_roles_update_admin" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Comentário de Auditoria
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 'Função central de autorização. Hardened na Sprint SEC-001C. Não aceita bypass.';
