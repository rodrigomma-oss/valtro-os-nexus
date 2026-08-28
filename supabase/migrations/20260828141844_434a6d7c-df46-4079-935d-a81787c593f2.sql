DROP POLICY IF EXISTS leads_select_policy ON public.leads;

CREATE POLICY leads_select_policy ON public.leads
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operator')
  OR (public.has_role(auth.uid(), 'viewer') AND owner_id = auth.uid())
);

DELETE FROM public.leads WHERE company_name = 'RLS Probe' AND contact_name = 'Probe';