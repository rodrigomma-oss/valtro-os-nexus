-- ============================================================
-- Sprint 15.2.3B — Reestruturação do Catálogo Comercial
-- Fonte única: public.services
-- ============================================================

-- 1) Enums comerciais
CREATE TYPE public.service_pricing_mode AS ENUM ('fixo', 'sob_consulta');
CREATE TYPE public.service_offer_type   AS ENUM ('principal', 'complementar', 'recorrente');

-- 2) Novas colunas
ALTER TABLE public.services
  ADD COLUMN objective         TEXT,
  ADD COLUMN pricing_mode      public.service_pricing_mode NOT NULL DEFAULT 'fixo',
  ADD COLUMN offer_type        public.service_offer_type   NOT NULL DEFAULT 'principal',
  ADD COLUMN origin_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX idx_services_origin_service_id ON public.services(origin_service_id)
  WHERE origin_service_id IS NOT NULL;
CREATE INDEX idx_services_offer_type ON public.services(offer_type);

-- 3) Backfill: sem preço => sob consulta (estado explícito, não NULL implícito)
UPDATE public.services SET pricing_mode = 'sob_consulta' WHERE default_price_cents IS NULL;

-- 4) Backfill: tipo de oferta
UPDATE public.services SET offer_type = 'recorrente' WHERE billing_type = 'recorrente';
UPDATE public.services SET offer_type = 'complementar'
  WHERE code IN ('otimizacao_implementacao_shopee', 'estruturacao_shopee_ads');

-- 5) Backfill: serviço de origem (informativo)
UPDATE public.services s
   SET origin_service_id = o.id
  FROM public.services o
 WHERE s.code = 'otimizacao_implementacao_shopee'
   AND o.code = 'otimizacao_anuncios_shopee';

-- 6) Backfill: objetivo comercial dos serviços atuais
UPDATE public.services SET objective = CASE code
  WHEN 'diagnostico_shopee'              THEN 'Identificar oportunidades de melhoria da loja e priorizar ações de curto prazo.'
  WHEN 'otimizacao_anuncios_shopee'      THEN 'Elevar a qualidade e a conversão dos anúncios existentes na Shopee.'
  WHEN 'otimizacao_implementacao_shopee' THEN 'Executar diretamente as otimizações recomendadas nos anúncios do cliente.'
  WHEN 'estruturacao_shopee_ads'         THEN 'Estruturar campanhas de Shopee Ads com controle de investimento e metas claras.'
  WHEN 'acompanhamento_shopee'           THEN 'Conduzir a operação contínua da loja com rotina de análise, ajustes e reporte.'
  WHEN 'desenvolvimento_projeto'         THEN 'Entregar soluções digitais sob medida a partir de escopo definido em orçamento.'
  ELSE objective
END
WHERE objective IS NULL;

-- 7) Coerência preço x modelo de precificação
CREATE OR REPLACE FUNCTION public.services_validate_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.pricing_mode = 'sob_consulta' THEN
    NEW.default_price_cents := NULL;
  ELSIF NEW.default_price_cents IS NULL THEN
    RAISE EXCEPTION 'Serviço com preço fixo exige default_price_cents; use pricing_mode = sob_consulta.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.origin_service_id IS NOT NULL AND NEW.origin_service_id = NEW.id THEN
    RAISE EXCEPTION 'O serviço de origem não pode ser o próprio serviço.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.objective IS NOT NULL AND btrim(NEW.objective) = '' THEN
    NEW.objective := NULL;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_services_validate_pricing
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.services_validate_pricing();

-- 8) Contrato conhecido de default_limits
--    Chaves permitidas: max_products, max_campaigns, max_users (inteiros >= 0).
CREATE OR REPLACE FUNCTION public.services_validate_default_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  _allowed TEXT[] := ARRAY['max_products', 'max_campaigns', 'max_users'];
  _k TEXT;
BEGIN
  IF NEW.default_limits IS NULL OR jsonb_typeof(NEW.default_limits) <> 'object' THEN
    NEW.default_limits := '{}'::jsonb;
    RETURN NEW;
  END IF;

  FOR _k IN SELECT jsonb_object_keys(NEW.default_limits) LOOP
    IF NOT (_k = ANY(_allowed)) THEN
      RAISE EXCEPTION 'Limite desconhecido "%": use apenas %.', _k, array_to_string(_allowed, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
    IF jsonb_typeof(NEW.default_limits -> _k) NOT IN ('number', 'null') THEN
      RAISE EXCEPTION 'Limite "%" deve ser numérico ou nulo.', _k USING ERRCODE = 'check_violation';
    END IF;
    IF jsonb_typeof(NEW.default_limits -> _k) = 'number'
       AND (NEW.default_limits ->> _k)::numeric < 0 THEN
      RAISE EXCEPTION 'Limite "%" não pode ser negativo.', _k USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_services_validate_default_limits
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.services_validate_default_limits();

-- 9) Decisão arquitetural: remover briefing_template_key (Opção B).
--    Briefings são emitidos por categoria (service_type -> template_type) e nunca
--    por SKU; o campo estava 100% NULL e sem consumidor. onboarding_template_key
--    permanece porque é resolvido por serviço contratado.
ALTER TABLE public.services DROP COLUMN briefing_template_key;

COMMENT ON COLUMN public.services.objective IS 'Objetivo comercial do serviço (distinto da descrição operacional).';
COMMENT ON COLUMN public.services.pricing_mode IS 'fixo = possui default_price_cents; sob_consulta = comercializado sob orçamento.';
COMMENT ON COLUMN public.services.offer_type IS 'Posição no portfólio: principal, complementar ou recorrente.';
COMMENT ON COLUMN public.services.origin_service_id IS 'Serviço do qual esta oferta normalmente se origina (informativo).';
COMMENT ON COLUMN public.services.default_limits IS 'Contrato fechado: max_products, max_campaigns, max_users (inteiros >= 0).';
COMMENT ON COLUMN public.services.sort_order IS 'Ordem manual de apresentação no catálogo.';