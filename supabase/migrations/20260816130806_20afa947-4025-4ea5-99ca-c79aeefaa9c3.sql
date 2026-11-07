-- 1. Garante que a função has_role seja acessível
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2. Refina a política de INSERT para permitir criação pelo Operador
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
);

-- 3. Refina a política de SELECT para garantir visibilidade imediata
DROP POLICY IF EXISTS "leads_select_policy" ON public.leads;
CREATE POLICY "leads_select_policy" ON public.leads
FOR SELECT TO authenticated
USING (public.can_access_lead(auth.uid(), id));

-- 4. Refina UPDATE para permitir transferência pelo Operador (se ele for o dono atual)
DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update" ON public.leads
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  (public.has_role(auth.uid(), 'operator'))
);

GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;