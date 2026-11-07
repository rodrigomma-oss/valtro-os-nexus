
-- Migration: OPS-INT-003-R9 - Reconciliação Total de Permissões (Profiles)
-- Objetivo: Garantir que administradores tenham SELECT na tabela profiles,
-- permitindo que os JOINs de criador/responsável não silenciem os registros.

BEGIN;

-- 1. Garantir privilégios de SELECT para authenticated e service_role em profiles
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

-- 2. Atualizar a política de SELECT em profiles para usar subquery direta (robusto)
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    (auth.uid() = id) OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'operator', 'viewer')
    )
);

COMMIT;
