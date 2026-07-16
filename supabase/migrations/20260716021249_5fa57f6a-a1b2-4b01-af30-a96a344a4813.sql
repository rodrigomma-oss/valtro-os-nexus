
-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE public.lead_status AS ENUM (
  'novo', 'contato', 'qualificado', 'proposta', 'ganho', 'perdido'
);

CREATE TYPE public.lead_source AS ENUM (
  'instagram', 'indicacao', 'site', 'google', 'evento', 'outbound', 'diagnostico', 'manual'
);

CREATE TYPE public.lead_event_type AS ENUM (
  'lead_criado',
  'status_alterado',
  'observacao_adicionada',
  'observacao_editada',
  'observacao_removida',
  'briefing_enviado',
  'briefing_recebido',
  'lead_arquivado',
  'lead_atualizado'
);

-- ============================================================
-- Helper: is viewer or above (any authenticated with a role row)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated;

-- ============================================================
-- Table: leads
-- ============================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  city TEXT,
  state TEXT,
  segment TEXT,
  source public.lead_source NOT NULL DEFAULT 'manual',
  status public.lead_status NOT NULL DEFAULT 'novo',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_archived_at ON public.leads(archived_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- SELECT: admin (all), operator (own), viewer (all not archived-only rule enforced client-side)
CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'viewer')
  OR (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
);

-- INSERT: admin or operator (operator must set owner_id = self)
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
);

-- UPDATE: admin or operator (only own)
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'operator') AND owner_id = auth.uid())
);

-- DELETE: admin only (soft delete via archived_at é o caminho preferido)
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Table: lead_events (imutável)
-- ============================================================
CREATE TABLE public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type public.lead_event_type NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_events_lead_id ON public.lead_events(lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Espelha visibilidade do lead pai
CREATE POLICY lead_events_select ON public.lead_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'viewer')
        OR (public.has_role(auth.uid(), 'operator') AND l.owner_id = auth.uid())
      )
  )
);

CREATE POLICY lead_events_insert ON public.lead_events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'operator') AND l.owner_id = auth.uid())
      )
  )
);

-- Sem UPDATE/DELETE — imutável para não-admin. Admin pode deletar via service_role se necessário.

-- ============================================================
-- Table: lead_notes
-- ============================================================
CREATE TABLE public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_notes_select ON public.lead_notes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'viewer')
        OR (public.has_role(auth.uid(), 'operator') AND l.owner_id = auth.uid())
      )
  )
);

CREATE POLICY lead_notes_insert ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'operator') AND l.owner_id = auth.uid())
      )
  )
);

CREATE POLICY lead_notes_update ON public.lead_notes FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

CREATE POLICY lead_notes_delete ON public.lead_notes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

-- ============================================================
-- Triggers: updated_at
-- ============================================================
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lead_notes_updated_at
BEFORE UPDATE ON public.lead_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Triggers: timeline automática
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lead_events (lead_id, type, description, created_by)
  VALUES (
    NEW.id,
    'lead_criado',
    'Lead cadastrado no CRM.',
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_after_insert
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_created();

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
    VALUES (
      NEW.id,
      'status_alterado',
      format('Status alterado de "%s" para "%s".', OLD.status, NEW.status),
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;

  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at AND NEW.archived_at IS NOT NULL THEN
    INSERT INTO public.lead_events (lead_id, type, description, created_by)
    VALUES (NEW.id, 'lead_arquivado', 'Lead arquivado.', auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_after_update
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();

REVOKE EXECUTE ON FUNCTION public.log_lead_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_lead_status_change() FROM PUBLIC;
