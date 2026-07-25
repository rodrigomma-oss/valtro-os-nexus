
-- =========================================================
-- Sprint 13.1 — Catálogo de Serviços (SKU comercial)
-- Mantém enum service_type (categoria) intacto.
-- =========================================================

-- Enum de tipo de cobrança
DO $$ BEGIN
  CREATE TYPE public.service_billing_type AS ENUM ('pontual','recorrente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.service_type NOT NULL DEFAULT 'nao_definido',
  description TEXT,
  default_price_cents INTEGER CHECK (default_price_cents IS NULL OR default_price_cents >= 0),
  billing_type public.service_billing_type NOT NULL DEFAULT 'pontual',
  active BOOLEAN NOT NULL DEFAULT true,
  default_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  briefing_template_key TEXT,
  onboarding_template_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_active_idx ON public.services (active);
CREATE INDEX IF NOT EXISTS services_category_idx ON public.services (category);
CREATE INDEX IF NOT EXISTS services_sort_idx ON public.services (sort_order);

GRANT SELECT ON public.services TO authenticated;
GRANT INSERT, UPDATE ON public.services TO authenticated; -- restringido por RLS (admin only)
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_authenticated" ON public.services;
CREATE POLICY "services_select_authenticated"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "services_insert_admin" ON public.services;
CREATE POLICY "services_insert_admin"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "services_update_admin" ON public.services;
CREATE POLICY "services_update_admin"
  ON public.services FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sem policy de DELETE: catálogo não permite exclusão física nesta sprint.

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed inicial (idempotente via ON CONFLICT DO NOTHING no code)
-- =========================================================
INSERT INTO public.services
  (code, name, category, description, default_price_cents, billing_type, default_limits, sort_order)
VALUES
  ('diagnostico_shopee',
   'Diagnóstico Shopee',
   'diagnostico',
   'Diagnóstico consultivo da operação atual na Shopee.',
   NULL, 'pontual', '{}'::jsonb, 10),
  ('otimizacao_anuncios_shopee',
   'Otimização de Anúncios Shopee',
   'gestao_shopee',
   'Otimização de anúncios existentes na Shopee.',
   NULL, 'pontual', '{}'::jsonb, 20),
  ('otimizacao_implementacao_shopee',
   'Otimização com Implementação Shopee',
   'gestao_shopee',
   'Otimização com implementação executada pela Valtro.',
   NULL, 'pontual', '{}'::jsonb, 30),
  ('estruturacao_shopee_ads',
   'Estruturação de Shopee Ads',
   'trafego_pago',
   'Estruturação inicial de campanhas Shopee Ads.',
   NULL, 'pontual', '{}'::jsonb, 40),
  ('acompanhamento_shopee',
   'Acompanhamento Shopee',
   'gestao_shopee',
   'Acompanhamento recorrente da operação Shopee.',
   29700, 'recorrente', '{"max_products": 10}'::jsonb, 50),
  ('desenvolvimento_projeto',
   'Desenvolvimento de Projeto',
   'desenvolvimento_projeto',
   'Projeto digital sob medida.',
   NULL, 'pontual', '{}'::jsonb, 60)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- Vínculo com proposal_items (não altera comportamento atual)
-- =========================================================
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS proposal_items_service_id_idx ON public.proposal_items (service_id);
