-- ============================================================
-- SEC-001E-R1 — Leituras residuais + defesa em profundidade
-- ============================================================

-- 1. proposals: remover policy legada permissiva
DROP POLICY IF EXISTS proposals_select ON public.proposals;

-- 2. client_service_cycles
DROP POLICY IF EXISTS cs_cycles_select_authenticated ON public.client_service_cycles;
DROP POLICY IF EXISTS client_service_cycles_select_authenticated ON public.client_service_cycles;
CREATE POLICY cs_cycles_select_scoped ON public.client_service_cycles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_services cs
    WHERE cs.id = client_service_cycles.client_service_id
      AND public.can_access_client(auth.uid(), cs.client_id)
  ));

-- 3. tickets + ticket_events (acesso operacional por papel — VOS-001C)
DROP POLICY IF EXISTS tickets_select_authenticated ON public.tickets;
CREATE POLICY tickets_select_roles ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operator')
    OR public.has_role(auth.uid(), 'viewer')
  );

DROP POLICY IF EXISTS ticket_events_select_authenticated ON public.ticket_events;
CREATE POLICY ticket_events_select_roles ON public.ticket_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_events.ticket_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'operator')
        OR public.has_role(auth.uid(), 'viewer')
      )
  ));

-- 4. project_operations
DROP POLICY IF EXISTS project_operations_select_authenticated ON public.project_operations;
CREATE POLICY project_operations_select_scoped ON public.project_operations
  FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));

-- 5. project_events (append-only)
DROP POLICY IF EXISTS project_events_select_authenticated ON public.project_events;
CREATE POLICY project_events_select_scoped ON public.project_events
  FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));

-- 6. client_service_events (append-only)
DROP POLICY IF EXISTS client_service_events_select_authenticated ON public.client_service_events;
CREATE POLICY client_service_events_select_scoped ON public.client_service_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_services cs
    WHERE cs.id = client_service_events.client_service_id
      AND public.can_access_client(auth.uid(), cs.client_id)
  ));

-- 7. calendar_sync_links — uso exclusivo backend (service_role)
DROP POLICY IF EXISTS calendar_sync_links_select_authenticated ON public.calendar_sync_links;
REVOKE ALL ON public.calendar_sync_links FROM authenticated;
REVOKE ALL ON public.calendar_sync_links FROM anon;
GRANT ALL ON public.calendar_sync_links TO service_role;

-- 8. lead_contacts / lead_notes — remover ramo viewer amplo
DROP POLICY IF EXISTS lead_contacts_select ON public.lead_contacts;
CREATE POLICY lead_contacts_select ON public.lead_contacts
  FOR SELECT TO authenticated
  USING (public.can_access_lead(auth.uid(), lead_id));

DROP POLICY IF EXISTS lead_notes_select ON public.lead_notes;
CREATE POLICY lead_notes_select ON public.lead_notes
  FOR SELECT TO authenticated
  USING (public.can_access_lead(auth.uid(), lead_id));

-- 9. EXECUTE das funções auxiliares
REVOKE ALL ON FUNCTION public.can_access_client(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_client(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_lead(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_lead(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_project(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_project(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_lead(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated, service_role;

-- 10. Redução de grants técnicos (defesa em profundidade)
-- anon: nenhum acesso em nenhuma tabela auditada
REVOKE ALL ON public.clients, public.leads, public.projects, public.client_services,
  public.proposals, public.proposal_items, public.follow_ups, public.lead_field_conflicts,
  public.project_tracked_products, public.lead_contacts, public.lead_notes,
  public.project_events, public.client_service_events, public.client_service_cycles,
  public.tickets, public.ticket_events, public.project_operations FROM anon;

-- authenticated: remover TRUNCATE / REFERENCES / TRIGGER / MAINTAIN e DELETE
REVOKE ALL ON public.clients, public.leads, public.projects, public.client_services,
  public.proposals, public.proposal_items, public.follow_ups, public.lead_field_conflicts,
  public.project_tracked_products, public.lead_contacts, public.lead_notes,
  public.project_events, public.client_service_events, public.client_service_cycles,
  public.tickets, public.ticket_events, public.project_operations FROM authenticated;

-- SELECT/INSERT/UPDATE onde o frontend autenticado realmente escreve
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.client_services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.follow_ups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_field_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.project_tracked_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.client_service_cycles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.project_operations TO authenticated;
-- DELETE preservado: exclusão real existe no app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
-- append-only: sem UPDATE/DELETE
GRANT SELECT, INSERT ON public.project_events TO authenticated;
GRANT SELECT, INSERT ON public.client_service_events TO authenticated;
GRANT SELECT, INSERT ON public.ticket_events TO authenticated;

-- service_role mantém acesso técnico completo
GRANT ALL ON public.clients, public.leads, public.projects, public.client_services,
  public.proposals, public.proposal_items, public.follow_ups, public.lead_field_conflicts,
  public.project_tracked_products, public.lead_contacts, public.lead_notes,
  public.project_events, public.client_service_events, public.client_service_cycles,
  public.tickets, public.ticket_events, public.project_operations TO service_role;