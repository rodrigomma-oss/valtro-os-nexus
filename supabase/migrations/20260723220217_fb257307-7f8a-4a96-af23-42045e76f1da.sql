
-- === ENUMS ===
CREATE TYPE public.proposal_status AS ENUM (
  'rascunho','em_elaboracao','enviada','em_negociacao','aprovada','rejeitada','expirada','cancelada'
);

CREATE TYPE public.proposal_negotiation_type AS ENUM (
  'contraproposta','desconto','alteracao','observacao'
);

ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'proposta_criada';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'proposta_status_alterado';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'proposta_aprovada';
ALTER TYPE public.lead_event_type ADD VALUE IF NOT EXISTS 'proposta_rejeitada';

-- === proposals ===
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status public.proposal_status NOT NULL DEFAULT 'rascunho',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  issued_at DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  valid_until DATE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  snapshot_json JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX proposals_lead_id_idx ON public.proposals(lead_id);
CREATE INDEX proposals_status_idx ON public.proposals(status);
CREATE INDEX proposals_owner_idx ON public.proposals(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON public.proposals FOR SELECT
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'viewer')
  OR (public.has_role(auth.uid(),'operator') AND EXISTS(
    SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid()
  ))
);
CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR (public.has_role(auth.uid(),'operator') AND EXISTS(
    SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid()
  ))
);
CREATE POLICY "proposals_update" ON public.proposals FOR UPDATE
USING (
  public.has_role(auth.uid(),'admin')
  OR (public.has_role(auth.uid(),'operator') AND EXISTS(
    SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid()
  ))
) WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR (public.has_role(auth.uid(),'operator') AND EXISTS(
    SELECT 1 FROM public.leads l WHERE l.id = proposals.lead_id AND l.owner_id = auth.uid()
  ))
);
CREATE POLICY "proposals_delete" ON public.proposals FOR DELETE
USING (public.has_role(auth.uid(),'admin') AND status <> 'aprovada');

-- === proposal_items ===
CREATE TABLE public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  service_key TEXT,
  service_label TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX proposal_items_proposal_idx ON public.proposal_items(proposal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_items TO authenticated;
GRANT ALL ON public.proposal_items TO service_role;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_items_select" ON public.proposal_items FOR SELECT
USING (EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id));
CREATE POLICY "proposal_items_write" ON public.proposal_items FOR ALL
USING (EXISTS(
  SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id
    AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'operator') AND EXISTS(
        SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid()
      ))
    )
))
WITH CHECK (EXISTS(
  SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id
    AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'operator') AND EXISTS(
        SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid()
      ))
    )
));

-- === proposal_negotiations ===
CREATE TABLE public.proposal_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  type public.proposal_negotiation_type NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX proposal_negotiations_proposal_idx ON public.proposal_negotiations(proposal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_negotiations TO authenticated;
GRANT ALL ON public.proposal_negotiations TO service_role;
ALTER TABLE public.proposal_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_negotiations_select" ON public.proposal_negotiations FOR SELECT
USING (EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = proposal_negotiations.proposal_id));
CREATE POLICY "proposal_negotiations_insert" ON public.proposal_negotiations FOR INSERT
WITH CHECK (EXISTS(
  SELECT 1 FROM public.proposals p WHERE p.id = proposal_negotiations.proposal_id
    AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'operator') AND EXISTS(
        SELECT 1 FROM public.leads l WHERE l.id = p.lead_id AND l.owner_id = auth.uid()
      ))
    )
));

-- === updated_at triggers ===
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_proposal_items_updated_at BEFORE UPDATE ON public.proposal_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Numeração automática ===
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _year TEXT := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY');
  _seq  INT;
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    SELECT COALESCE(MAX(SUBSTRING(number FROM 'PROP-' || _year || '-(\d+)')::INT), 0) + 1
    INTO _seq FROM public.proposals WHERE number LIKE 'PROP-' || _year || '-%';
    NEW.number := 'PROP-' || _year || '-' || lpad(_seq::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_proposals_number BEFORE INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.generate_proposal_number();

-- === Recalcular subtotal do item + total da proposta ===
CREATE OR REPLACE FUNCTION public.proposal_item_recalc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _proposal_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _proposal_id := OLD.proposal_id;
  ELSE
    NEW.subtotal := ROUND(NEW.quantity * NEW.unit_price, 2);
    _proposal_id := NEW.proposal_id;
  END IF;

  UPDATE public.proposals p
  SET total_amount = COALESCE((SELECT SUM(subtotal) FROM public.proposal_items WHERE proposal_id = _proposal_id), 0),
      final_amount = GREATEST(0, COALESCE((SELECT SUM(subtotal) FROM public.proposal_items WHERE proposal_id = _proposal_id), 0) - p.discount_amount)
  WHERE p.id = _proposal_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_proposal_items_recalc_biu BEFORE INSERT OR UPDATE ON public.proposal_items
FOR EACH ROW EXECUTE FUNCTION public.proposal_item_recalc();

CREATE TRIGGER trg_proposal_items_recalc_after AFTER INSERT OR UPDATE OR DELETE ON public.proposal_items
FOR EACH ROW EXECUTE FUNCTION public.proposal_item_recalc();

-- Ao alterar desconto direto na proposta, recalcular final_amount
CREATE OR REPLACE FUNCTION public.proposal_recalc_final()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.final_amount := GREATEST(0, COALESCE(NEW.total_amount,0) - COALESCE(NEW.discount_amount,0));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_proposals_recalc_final BEFORE INSERT OR UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.proposal_recalc_final();

-- === Log em lead_events (eventos principais) + conversão do Lead ===
CREATE OR REPLACE FUNCTION public.log_proposal_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
  VALUES (NEW.lead_id, 'proposta_criada',
          format('Proposta %s criada.', NEW.number),
          NEW.created_by,
          jsonb_build_object('proposal_id', NEW.id, 'number', NEW.number, 'title', NEW.title));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_proposals_log_created AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.log_proposal_created();

CREATE OR REPLACE FUNCTION public.log_proposal_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _type public.lead_event_type;
        _desc TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'aprovada' THEN
      _type := 'proposta_aprovada';
      _desc := format('Proposta %s aprovada.', NEW.number);
      -- Converter Lead
      UPDATE public.leads
      SET status = 'ganho', next_action = NULL
      WHERE id = NEW.lead_id AND status <> 'ganho';
    ELSIF NEW.status = 'rejeitada' THEN
      _type := 'proposta_rejeitada';
      _desc := format('Proposta %s rejeitada.', NEW.number);
    ELSE
      _type := 'proposta_status_alterado';
      _desc := format('Proposta %s: status alterado de "%s" para "%s".', NEW.number, OLD.status, NEW.status);
    END IF;

    INSERT INTO public.lead_events (lead_id, type, description, created_by, metadata)
    VALUES (NEW.lead_id, _type, _desc, auth.uid(),
            jsonb_build_object('proposal_id', NEW.id, 'number', NEW.number, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_proposals_log_status AFTER UPDATE OF status ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.log_proposal_status_change();

-- Bloquear DELETE de proposta aprovada
CREATE OR REPLACE FUNCTION public.prevent_approved_proposal_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'aprovada' THEN
    RAISE EXCEPTION 'Não é permitido excluir uma proposta aprovada.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_proposals_prevent_approved_delete BEFORE DELETE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_proposal_delete();
