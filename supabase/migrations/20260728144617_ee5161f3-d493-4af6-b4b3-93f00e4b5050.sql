-- ============================================================
-- Sprint 15.2 — Produtos Acompanhados
-- ============================================================

-- 1) Tabela principal ----------------------------------------
CREATE TABLE public.project_tracked_products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  name                    TEXT NOT NULL,
  external_reference      TEXT,
  classification          TEXT NOT NULL,
  priority                TEXT NOT NULL DEFAULT 'media',
  objective               TEXT,
  status                  TEXT NOT NULL DEFAULT 'ativo',
  position                INTEGER NOT NULL DEFAULT 0,

  -- Responsável específico do produto. NULL => herda logicamente
  -- projects.owner_id na leitura (nunca copiado para cá).
  owner_id                UUID,

  product_cost_cents      INTEGER,
  packaging_cost_cents    INTEGER,
  taxes_cents             INTEGER,
  other_costs_cents       INTEGER,

  stock_quantity          INTEGER,
  restock_lead_time_days  INTEGER,

  operational_limitations TEXT,
  notes                   TEXT,

  archived_at             TIMESTAMPTZ,
  archived_by             UUID,

  created_by              UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ptp_name_len CHECK (length(btrim(name)) BETWEEN 2 AND 200),
  CONSTRAINT ptp_external_ref_len CHECK (external_reference IS NULL OR length(external_reference) <= 120),
  -- Conjunto atual da metodologia operacional. Mantido como TEXT + CHECK
  -- (e não ENUM) para permitir expansão futura sem migração destrutiva,
  -- inclusive promoção para tabela de domínio com FK.
  CONSTRAINT ptp_classification CHECK (classification IN
    ('escala','validacao','rentabilidade','liquidacao','organico','pausado')),
  CONSTRAINT ptp_priority CHECK (priority IN ('baixa','media','alta')),
  CONSTRAINT ptp_status CHECK (status IN ('ativo','arquivado')),
  CONSTRAINT ptp_objective_len CHECK (objective IS NULL OR length(objective) <= 2000),
  CONSTRAINT ptp_limitations_len CHECK (operational_limitations IS NULL OR length(operational_limitations) <= 2000),
  CONSTRAINT ptp_notes_len CHECK (notes IS NULL OR length(notes) <= 4000),
  CONSTRAINT ptp_costs_non_negative CHECK (
    COALESCE(product_cost_cents, 0)   >= 0 AND
    COALESCE(packaging_cost_cents, 0) >= 0 AND
    COALESCE(taxes_cents, 0)          >= 0 AND
    COALESCE(other_costs_cents, 0)    >= 0
  ),
  CONSTRAINT ptp_stock_non_negative CHECK (
    COALESCE(stock_quantity, 0) >= 0 AND COALESCE(restock_lead_time_days, 0) >= 0
  )
);

GRANT SELECT, INSERT, UPDATE ON public.project_tracked_products TO authenticated;
GRANT ALL ON public.project_tracked_products TO service_role;

ALTER TABLE public.project_tracked_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários com papel podem ler produtos acompanhados"
  ON public.project_tracked_products FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operator')
    OR public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "Admin e operador criam produtos acompanhados"
  ON public.project_tracked_products FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')
  );

CREATE POLICY "Admin e operador editam produtos acompanhados"
  ON public.project_tracked_products FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')
  );

-- Índices -----------------------------------------------------
CREATE INDEX idx_ptp_project_order
  ON public.project_tracked_products (project_id, position, created_at);
CREATE INDEX idx_ptp_project_ativo
  ON public.project_tracked_products (project_id) WHERE status = 'ativo';
CREATE INDEX idx_ptp_project_classification
  ON public.project_tracked_products (project_id, classification);
CREATE INDEX idx_ptp_project_priority
  ON public.project_tracked_products (project_id, priority);

-- 2) Timeline dedicada ---------------------------------------
CREATE TABLE public.project_tracked_product_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID NOT NULL REFERENCES public.project_tracked_products(id) ON DELETE CASCADE,
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type         TEXT NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id           UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ptpe_type CHECK (event_type IN (
    'criado','classificacao_alterada','prioridade_alterada','estoque_atualizado',
    'custos_atualizados','objetivo_alterado','responsavel_alterado',
    'arquivado','reativado','editado','observacao_adicionada'
  ))
);

GRANT SELECT, INSERT ON public.project_tracked_product_events TO authenticated;
GRANT ALL ON public.project_tracked_product_events TO service_role;

ALTER TABLE public.project_tracked_product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários com papel leem histórico do produto"
  ON public.project_tracked_product_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operator')
    OR public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "Admin e operador registram histórico do produto"
  ON public.project_tracked_product_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator')
  );

CREATE INDEX idx_ptpe_product_created
  ON public.project_tracked_product_events (tracked_product_id, created_at DESC);
CREATE INDEX idx_ptpe_project_created
  ON public.project_tracked_product_events (project_id, created_at DESC);

-- 3) Imutabilidade e bloqueio de DELETE ----------------------
CREATE OR REPLACE FUNCTION public.project_tracked_products_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Produtos acompanhados não podem ser excluídos; use o status arquivado.'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER trg_ptp_block_delete
  BEFORE DELETE ON public.project_tracked_products
  FOR EACH ROW EXECUTE FUNCTION public.project_tracked_products_block_delete();

CREATE OR REPLACE FUNCTION public.project_tracked_product_events_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Eventos do produto acompanhado são imutáveis.' USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER trg_ptpe_immutable
  BEFORE UPDATE OR DELETE ON public.project_tracked_product_events
  FOR EACH ROW EXECUTE FUNCTION public.project_tracked_product_events_immutable();

-- 4) Coerência: arquivamento / reativação / normalização -----
CREATE OR REPLACE FUNCTION public.project_tracked_products_coherence()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  IF NEW.external_reference IS NOT NULL AND btrim(NEW.external_reference) = '' THEN
    NEW.external_reference := NULL;
  END IF;
  IF NEW.objective IS NOT NULL AND btrim(NEW.objective) = '' THEN
    NEW.objective := NULL;
  END IF;
  IF NEW.operational_limitations IS NOT NULL AND btrim(NEW.operational_limitations) = '' THEN
    NEW.operational_limitations := NULL;
  END IF;
  IF NEW.notes IS NOT NULL AND btrim(NEW.notes) = '' THEN
    NEW.notes := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'arquivado' THEN
      NEW.archived_at := COALESCE(NEW.archived_at, now());
      NEW.archived_by := COALESCE(NEW.archived_by, auth.uid());
    ELSE
      NEW.archived_at := NULL;
      NEW.archived_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: projeto é imutável (produto não migra entre projetos).
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION 'O projeto de um produto acompanhado é imutável.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'arquivado' THEN
      NEW.archived_at := now();
      NEW.archived_by := auth.uid();
    ELSE -- reativação permitida
      NEW.archived_at := NULL;
      NEW.archived_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_ptp_coherence
  BEFORE INSERT OR UPDATE ON public.project_tracked_products
  FOR EACH ROW EXECUTE FUNCTION public.project_tracked_products_coherence();

CREATE TRIGGER trg_ptp_updated_at
  BEFORE UPDATE ON public.project_tracked_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Log automático ------------------------------------------
CREATE OR REPLACE FUNCTION public.log_tracked_product_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  INSERT INTO public.project_tracked_product_events
    (tracked_product_id, project_id, event_type, title, description, actor_id, metadata)
  VALUES (NEW.id, NEW.project_id, 'criado', 'Produto adicionado',
          format('Produto "%s" passou a ser acompanhado.', NEW.name),
          COALESCE(NEW.created_by, auth.uid()),
          jsonb_build_object('classification', NEW.classification, 'priority', NEW.priority));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ptp_log_created
  AFTER INSERT ON public.project_tracked_products
  FOR EACH ROW EXECUTE FUNCTION public.log_tracked_product_created();

CREATE OR REPLACE FUNCTION public.log_tracked_product_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  _actor UUID := auth.uid();
  _logged BOOLEAN := false;
BEGIN
  IF NEW.classification IS DISTINCT FROM OLD.classification THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id, metadata)
    VALUES (NEW.id, NEW.project_id, 'classificacao_alterada', 'Classificação alterada',
            format('Classificação alterada de "%s" para "%s".', OLD.classification, NEW.classification),
            _actor, jsonb_build_object('from', OLD.classification, 'to', NEW.classification));
    _logged := true;
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id, metadata)
    VALUES (NEW.id, NEW.project_id, 'prioridade_alterada', 'Prioridade alterada',
            format('Prioridade alterada de "%s" para "%s".', OLD.priority, NEW.priority),
            _actor, jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
    _logged := true;
  END IF;

  IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity
     OR NEW.restock_lead_time_days IS DISTINCT FROM OLD.restock_lead_time_days THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id, metadata)
    VALUES (NEW.id, NEW.project_id, 'estoque_atualizado', 'Estoque atualizado',
            'Quantidade em estoque ou prazo de reposição atualizado.',
            _actor, jsonb_build_object(
              'stock_from', OLD.stock_quantity, 'stock_to', NEW.stock_quantity,
              'lead_time_from', OLD.restock_lead_time_days, 'lead_time_to', NEW.restock_lead_time_days));
    _logged := true;
  END IF;

  -- Custos: registra o fato, nunca os valores (informação comercial).
  IF NEW.product_cost_cents   IS DISTINCT FROM OLD.product_cost_cents
     OR NEW.packaging_cost_cents IS DISTINCT FROM OLD.packaging_cost_cents
     OR NEW.taxes_cents          IS DISTINCT FROM OLD.taxes_cents
     OR NEW.other_costs_cents    IS DISTINCT FROM OLD.other_costs_cents THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id)
    VALUES (NEW.id, NEW.project_id, 'custos_atualizados', 'Custos atualizados',
            'Estrutura de custos do produto foi atualizada.', _actor);
    _logged := true;
  END IF;

  IF NEW.objective IS DISTINCT FROM OLD.objective THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id)
    VALUES (NEW.id, NEW.project_id, 'objetivo_alterado', 'Objetivo alterado',
            'Objetivo operacional do produto foi atualizado.', _actor);
    _logged := true;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id, metadata)
    VALUES (NEW.id, NEW.project_id, 'responsavel_alterado', 'Responsável alterado',
            CASE WHEN NEW.owner_id IS NULL
                 THEN 'Responsável específico removido; passa a valer o responsável do projeto.'
                 ELSE 'Responsável específico definido para o produto.' END,
            _actor, jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id));
    _logged := true;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'arquivado' THEN
      INSERT INTO public.project_tracked_product_events
        (tracked_product_id, project_id, event_type, title, description, actor_id)
      VALUES (NEW.id, NEW.project_id, 'arquivado', 'Produto arquivado',
              format('Produto "%s" arquivado.', NEW.name), _actor);
    ELSE
      INSERT INTO public.project_tracked_product_events
        (tracked_product_id, project_id, event_type, title, description, actor_id)
      VALUES (NEW.id, NEW.project_id, 'reativado', 'Produto reativado',
              format('Produto "%s" voltou a ser acompanhado.', NEW.name), _actor);
    END IF;
    _logged := true;
  END IF;

  IF NOT _logged AND (
       NEW.name IS DISTINCT FROM OLD.name
    OR NEW.external_reference IS DISTINCT FROM OLD.external_reference
    OR NEW.operational_limitations IS DISTINCT FROM OLD.operational_limitations
    OR NEW.notes IS DISTINCT FROM OLD.notes
  ) THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id)
    VALUES (NEW.id, NEW.project_id, 'editado', 'Produto editado',
            'Dados cadastrais do produto foram atualizados.', _actor);
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_ptp_log_updated
  AFTER UPDATE ON public.project_tracked_products
  FOR EACH ROW EXECUTE FUNCTION public.log_tracked_product_updated();