
-- Sprint de segurança — corrige alertas "Detected Issues"
-- 1) Restringe RLS de propostas/itens/negociações a authenticated (removendo TO public)
-- 2) Revoga privilégios de anon nessas tabelas
-- 3) Corrige search_path e grants em SECURITY DEFINER

-- =========================================================================
-- ETAPA 1: PROPOSTAS — recriar policies TO authenticated
-- =========================================================================
DROP POLICY IF EXISTS proposals_select ON public.proposals;
DROP POLICY IF EXISTS proposals_insert ON public.proposals;
DROP POLICY IF EXISTS proposals_update ON public.proposals;
DROP POLICY IF EXISTS proposals_delete ON public.proposals;

CREATE POLICY proposals_select ON public.proposals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'viewer'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'operator'::public.app_role)
      AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid())
    )
  );

CREATE POLICY proposals_insert ON public.proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'operator'::public.app_role)
      AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid())
    )
  );

CREATE POLICY proposals_update ON public.proposals
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'operator'::public.app_role)
      AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'operator'::public.app_role)
      AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid())
    )
  );

CREATE POLICY proposals_delete ON public.proposals
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND status <> 'aprovada'::public.proposal_status
  );

-- proposal_items
DROP POLICY IF EXISTS proposal_items_select ON public.proposal_items;
DROP POLICY IF EXISTS proposal_items_write ON public.proposal_items;

CREATE POLICY proposal_items_select ON public.proposal_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id));

CREATE POLICY proposal_items_write ON public.proposal_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR (
            public.has_role(auth.uid(), 'operator'::public.app_role)
            AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR (
            public.has_role(auth.uid(), 'operator'::public.app_role)
            AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid())
          )
        )
    )
  );

-- proposal_negotiations (notas confidenciais)
DROP POLICY IF EXISTS proposal_negotiations_select ON public.proposal_negotiations;
DROP POLICY IF EXISTS proposal_negotiations_insert ON public.proposal_negotiations;

CREATE POLICY proposal_negotiations_select ON public.proposal_negotiations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_negotiations.proposal_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'viewer'::public.app_role)
          OR (
            public.has_role(auth.uid(), 'operator'::public.app_role)
            AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid())
          )
        )
    )
  );

CREATE POLICY proposal_negotiations_insert ON public.proposal_negotiations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_negotiations.proposal_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR (
            public.has_role(auth.uid(), 'operator'::public.app_role)
            AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid())
          )
        )
    )
  );

-- =========================================================================
-- ETAPA 2: Revogar acesso de anon nas tabelas de propostas
-- =========================================================================
REVOKE ALL ON public.proposals FROM anon;
REVOKE ALL ON public.proposal_items FROM anon;
REVOKE ALL ON public.proposal_negotiations FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_items TO authenticated;
GRANT SELECT, INSERT ON public.proposal_negotiations TO authenticated;
GRANT ALL ON public.proposals TO service_role;
GRANT ALL ON public.proposal_items TO service_role;
GRANT ALL ON public.proposal_negotiations TO service_role;

-- =========================================================================
-- ETAPA 3: SECURITY DEFINER — search_path e grants
-- =========================================================================

-- Corrigir função sem search_path
ALTER FUNCTION public.prevent_approved_proposal_delete() SET search_path = public, pg_temp;

-- Reforçar search_path seguro nas demais (inclui pg_temp)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.proposal_recalc_final() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_proposal_created() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_proposal_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_lead_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_lead_created() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_briefing_token_created() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_briefing_token_updated() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_lead_contact_created() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_lead_follow_up_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_lead_from_briefing() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_proposal_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.proposal_item_recalc() SET search_path = public, pg_temp;

-- Revogar EXECUTE de PUBLIC/anon/authenticated em funções exclusivas de trigger
-- (triggers executam como owner e não dependem de grants a roles chamadoras)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proposal_recalc_final() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_proposal_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_proposal_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_approved_proposal_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_briefing_token_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_briefing_token_updated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_contact_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_follow_up_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_lead_from_briefing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_proposal_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proposal_item_recalc() FROM PUBLIC, anon, authenticated;

-- has_role é usado por policies RLS avaliadas no contexto do chamador → requer EXECUTE de authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
