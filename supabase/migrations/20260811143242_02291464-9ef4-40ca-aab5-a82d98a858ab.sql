-- Homologação de Acesso Administrativo para Feedback (OPS-INT-003)

-- 1. Garantir privilégios de execução na função has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 2. Garantir privilégios de leitura na tabela user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO service_role;

-- 3. Atualizar a policy de SELECT na tabela feedback
DROP POLICY IF EXISTS "Admins, operators and viewers can read all feedback" ON public.feedback;

CREATE POLICY "Admins, operators and viewers can read all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'operator'::public.app_role) 
    OR public.has_role(auth.uid(), 'viewer'::public.app_role)
    OR (auth.uid() = created_by)
);

-- 4. Garantir privilégios de leitura na tabela feedback
GRANT SELECT ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO service_role;

-- 5. Garantir privilégios nas tabelas relacionadas
GRANT SELECT ON public.saas_products TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.bugs TO authenticated;

COMMENT ON POLICY "Admins, operators and viewers can read all feedback" ON public.feedback IS 'Permite leitura total para papéis administrativos e leitura própria para usuários comuns. OPS-INT-003.';