ALTER TABLE public.project_tracked_products
  ADD COLUMN sku                      TEXT,
  ADD COLUMN listing_url              TEXT,
  ADD COLUMN current_sale_price_cents INTEGER,
  ADD COLUMN stock_unit               TEXT NOT NULL DEFAULT 'unidade',
  ADD COLUMN tax_rate_bps             INTEGER;

COMMENT ON COLUMN public.project_tracked_products.taxes_cents IS
  'Custo fixo de imposto por unidade, em centavos. Percentual vive em tax_rate_bps.';
COMMENT ON COLUMN public.project_tracked_products.tax_rate_bps IS
  'Aliquota em basis points: 700 = 7%. Nunca valor monetario.';
COMMENT ON COLUMN public.project_tracked_products.current_sale_price_cents IS
  'Preco de venda atual em centavos. Estado operacional corrente, sem historico.';

ALTER TABLE public.project_tracked_products
  ADD CONSTRAINT ptp_sku_len CHECK (sku IS NULL OR length(btrim(sku)) BETWEEN 1 AND 64),
  ADD CONSTRAINT ptp_listing_url_https CHECK (
    listing_url IS NULL OR (listing_url ~ '^https://' AND length(listing_url) <= 2048)
  ),
  ADD CONSTRAINT ptp_sale_price_non_negative CHECK (
    current_sale_price_cents IS NULL OR current_sale_price_cents >= 0
  ),
  ADD CONSTRAINT ptp_stock_unit CHECK (
    stock_unit = ANY (ARRAY['unidade','peca','kit','conjunto','outro'])
  ),
  ADD CONSTRAINT ptp_tax_rate_bps_range CHECK (
    tax_rate_bps IS NULL OR (tax_rate_bps >= 0 AND tax_rate_bps <= 10000)
  );

CREATE UNIQUE INDEX idx_ptp_project_sku_unique
  ON public.project_tracked_products (project_id, lower(btrim(sku)))
  WHERE sku IS NOT NULL;

CREATE OR REPLACE FUNCTION public.log_tracked_product_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF NEW.product_cost_cents      IS DISTINCT FROM OLD.product_cost_cents
     OR NEW.packaging_cost_cents IS DISTINCT FROM OLD.packaging_cost_cents
     OR NEW.taxes_cents          IS DISTINCT FROM OLD.taxes_cents
     OR NEW.other_costs_cents    IS DISTINCT FROM OLD.other_costs_cents
     OR NEW.tax_rate_bps         IS DISTINCT FROM OLD.tax_rate_bps
     OR NEW.current_sale_price_cents IS DISTINCT FROM OLD.current_sale_price_cents THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id)
    VALUES (NEW.id, NEW.project_id, 'custos_atualizados', 'Custos atualizados',
            'Estrutura de custos ou preço do produto foi atualizada.', _actor);
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
    OR NEW.sku IS DISTINCT FROM OLD.sku
    OR NEW.listing_url IS DISTINCT FROM OLD.listing_url
    OR NEW.stock_unit IS DISTINCT FROM OLD.stock_unit
    OR NEW.operational_limitations IS DISTINCT FROM OLD.operational_limitations
    OR NEW.notes IS DISTINCT FROM OLD.notes
  ) THEN
    INSERT INTO public.project_tracked_product_events
      (tracked_product_id, project_id, event_type, title, description, actor_id)
    VALUES (NEW.id, NEW.project_id, 'editado', 'Produto editado',
            'Dados cadastrais do produto foram atualizados.', _actor);
  END IF;

  RETURN NEW;
END $function$;