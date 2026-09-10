DROP POLICY IF EXISTS cs_onboardings_select_authenticated ON public.client_service_onboardings;

CREATE POLICY cs_onboardings_select_authenticated
ON public.client_service_onboardings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'operator')
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.client_services cs
        JOIN public.clients c ON c.id = cs.client_id
        WHERE cs.id = client_service_onboardings.client_service_id
          AND (cs.owner_id = auth.uid() OR c.owner_id = auth.uid())
      )
    )
  )
);