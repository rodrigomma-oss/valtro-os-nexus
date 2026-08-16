-- Sprint 15.2.2B - Correção de RLS para Leads (Operador Amplo)

-- 1. Atualizar can_access_lead para refletir visualização ampla para Operador
CREATE OR REPLACE FUNCTION public.can_access_lead(_user_id uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id
      AND (
        public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'operator') -- Operador vê todos
        OR (public.has_role(_user_id, 'viewer') AND l.owner_id = _user_id)
      )
  );
$$;

-- 2. Recriar a policy de SELECT para garantir consistência
DROP POLICY IF EXISTS leads_select_policy ON public.leads;
DROP POLICY IF EXISTS leads_select ON public.leads;
CREATE POLICY leads_select_policy ON public.leads
FOR SELECT TO authenticated
USING (public.can_access_lead(auth.uid(), id));

-- 3. Atualizar INSERT (Permitir Admin e Operator)
DROP POLICY IF EXISTS leads_insert ON public.leads;
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
);

-- 4. Atualizar UPDATE
-- USING: Define se pode atuar sobre a linha atual (Operator só atua se for o dono atual)
DROP POLICY IF EXISTS leads_update ON public.leads;
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'operator'))
);

-- 5. Garantir DELETE apenas para Admin
DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
