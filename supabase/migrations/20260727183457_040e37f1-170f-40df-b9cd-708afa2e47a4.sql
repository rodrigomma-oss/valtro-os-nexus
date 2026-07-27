ALTER TABLE public.projects
  ADD COLUMN client_service_id UUID
    REFERENCES public.client_services(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_client_service_id
  ON public.projects(client_service_id) WHERE client_service_id IS NOT NULL;

UPDATE public.projects p
SET client_service_id = cs.id
FROM public.client_services cs
WHERE p.client_service_id IS NULL
  AND p.proposal_id IS NOT NULL
  AND cs.proposal_id = p.proposal_id
  AND cs.client_id  = p.client_id
  AND (SELECT count(*) FROM public.client_services x
        WHERE x.proposal_id = p.proposal_id AND x.client_id = p.client_id) = 1;

CREATE TYPE public.shopee_access_status AS ENUM
  ('nao_solicitado','pendente','ativo','revogado');

CREATE TABLE public.project_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE
    REFERENCES public.projects(id) ON DELETE CASCADE,
  operational_access_status public.shopee_access_status NOT NULL DEFAULT 'nao_solicitado',
  operational_access_notes TEXT,
  current_objective TEXT,
  ads_monthly_budget_cents INTEGER CHECK (ads_monthly_budget_cents >= 0),
  ads_autonomy_limit_cents INTEGER CHECK (ads_autonomy_limit_cents >= 0),
  meeting_weekday SMALLINT CHECK (meeting_weekday BETWEEN 0 AND 6),
  next_meeting_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.project_operations TO authenticated;
GRANT ALL ON public.project_operations TO service_role;

ALTER TABLE public.project_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_operations_select_authenticated
  ON public.project_operations FOR SELECT TO authenticated USING (true);

CREATE POLICY project_operations_insert_admin_operator
  ON public.project_operations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE POLICY project_operations_update_admin_operator
  ON public.project_operations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

CREATE TRIGGER trg_project_operations_updated_at
  BEFORE UPDATE ON public.project_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();