
-- Migration: OPS-INT-003-R8 - Reconciliação Definitiva de RLS e Segurança
-- Objetivo: Resolver o bloqueio de visibilidade dos registros API (created_by IS NULL)
-- eliminando a dependência da função has_role que está falhando por privilégios no runtime.

-- 1. Garantir que a role authenticated tenha acesso ao esquema public e tabelas básicas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT SELECT ON public.saas_products TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.bugs TO authenticated;

-- 2. Recriar a política de RLS para FEEDBACK usando subquery direta (robusto contra falhas de EXECUTE)
DROP POLICY IF EXISTS "Admins, operators and viewers can read all feedback" ON public.feedback;

CREATE POLICY "Admins, operators and viewers can read all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
    -- O próprio criador ou owner
    (auth.uid() = created_by) OR 
    (auth.uid() = owner_id) OR
    -- Ou qualquer usuário com papel administrativo (verificado via subquery para evitar has_role)
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'operator', 'viewer')
    )
);

-- 3. Limpar políticas obsoletas de BUGS e aplicar o novo padrão robusto
-- A tabela bugs usa 'reported_by' em vez de 'created_by'
DROP POLICY IF EXISTS "Admins can select all bugs" ON public.bugs;
DROP POLICY IF EXISTS "Operators can select all bugs" ON public.bugs;
DROP POLICY IF EXISTS "Viewers can select all bugs" ON public.bugs;
DROP POLICY IF EXISTS "Admins, operators and viewers can read all bugs" ON public.bugs;

CREATE POLICY "Admins, operators and viewers can read all bugs"
ON public.bugs
FOR SELECT
TO authenticated
USING (
    (auth.uid() = reported_by) OR 
    (auth.uid() = owner_id) OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'operator', 'viewer')
    )
);

-- 4. Garantir privilégios na função has_role de forma explícita caso ela seja usada em outros lugares
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
