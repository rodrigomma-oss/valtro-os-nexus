
-- SEC-001E: Hardening of operational tables RLS and Grants

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND (
        public.has_role(_user_id, 'admin')
        OR (public.has_role(_user_id, 'operator') AND c.owner_id = _user_id)
        OR (public.has_role(_user_id, 'viewer') AND c.owner_id = _user_id)
      )
  );
$$;

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
        OR (public.has_role(_user_id, 'operator') AND l.owner_id = _user_id)
        OR (public.has_role(_user_id, 'viewer') AND l.owner_id = _user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (
        public.has_role(_user_id, 'admin')
        OR (public.has_role(_user_id, 'operator') AND p.owner_id = _user_id)
        OR (public.has_role(_user_id, 'viewer') AND p.owner_id = _user_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_client TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_lead TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_project TO authenticated, service_role;

-- 2. Revoke Anon Grants
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.projects FROM anon;
REVOKE ALL ON public.client_services FROM anon;
REVOKE ALL ON public.proposals FROM anon;
REVOKE ALL ON public.proposal_items FROM anon;
REVOKE ALL ON public.follow_ups FROM anon;
REVOKE ALL ON public.lead_field_conflicts FROM anon;
REVOKE ALL ON public.project_tracked_products FROM anon;
REVOKE ALL ON public.client_service_events FROM anon;
REVOKE ALL ON public.project_events FROM anon;
REVOKE ALL ON public.lead_contacts FROM anon;
REVOKE ALL ON public.lead_notes FROM anon;
REVOKE ALL ON public.project_tracked_product_events FROM anon;

-- 3. Hardened Policies

-- CLIENTS
DROP POLICY IF EXISTS clients_select_authenticated ON public.clients;
CREATE POLICY clients_select_policy ON public.clients
FOR SELECT TO authenticated
USING (public.can_access_client(auth.uid(), id));

-- LEADS
DROP POLICY IF EXISTS leads_select ON public.leads;
CREATE POLICY leads_select_policy ON public.leads
FOR SELECT TO authenticated
USING (public.can_access_lead(auth.uid(), id));

-- PROJECTS
DROP POLICY IF EXISTS projects_select_authenticated ON public.projects;
CREATE POLICY projects_select_policy ON public.projects
FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), id));

-- CLIENT SERVICES
DROP POLICY IF EXISTS client_services_select_authenticated ON public.client_services;
CREATE POLICY client_services_select_policy ON public.client_services
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  (public.has_role(auth.uid(), 'operator') AND public.can_access_client(auth.uid(), client_id)) OR
  (public.has_role(auth.uid(), 'viewer') AND public.can_access_client(auth.uid(), client_id))
);

-- PROPOSALS
DROP POLICY IF EXISTS proposals_select_authenticated ON public.proposals;
CREATE POLICY proposals_select_policy ON public.proposals
FOR SELECT TO authenticated
USING (public.can_access_lead(auth.uid(), lead_id));

-- PROPOSAL ITEMS
DROP POLICY IF EXISTS proposal_items_select ON public.proposal_items;
CREATE POLICY proposal_items_select_policy ON public.proposal_items
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.proposals p
  WHERE p.id = proposal_items.proposal_id
  AND public.can_access_lead(auth.uid(), p.lead_id)
));

-- FOLLOW UPS
DROP POLICY IF EXISTS follow_ups_select_authenticated ON public.follow_ups;
CREATE POLICY follow_ups_select_policy ON public.follow_ups
FOR SELECT TO authenticated
USING (public.can_access_lead(auth.uid(), lead_id));

-- LEAD FIELD CONFLICTS
DROP POLICY IF EXISTS "Autenticados podem ver conflitos" ON public.lead_field_conflicts;
CREATE POLICY lead_field_conflicts_select_policy ON public.lead_field_conflicts
FOR SELECT TO authenticated
USING (public.can_access_lead(auth.uid(), lead_id));

-- PROJECT TRACKED PRODUCTS
DROP POLICY IF EXISTS "Usuários com papel podem ler produtos acompanhados" ON public.project_tracked_products;
CREATE POLICY project_tracked_products_select_policy ON public.project_tracked_products
FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));
