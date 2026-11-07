-- Sprint 13.3 — Contratações (client_services)

-- 1. Periodicidade de cobrança
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_interval') THEN
    CREATE TYPE public.billing_interval AS ENUM ('monthly');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_service_status') THEN
    CREATE TYPE public.client_service_status AS ENUM ('pendente','ativo','pausado','concluido','cancelado');
  END IF;
END $$;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS billing_interval public.billing_interval;

-- Pontual nunca tem intervalo; recorrente exige intervalo
CREATE OR REPLACE FUNCTION public.services_validate_billing_interval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.billing_type = 'pontual' THEN
    NEW.billing_interval := NULL;
  ELSIF NEW.billing_interval IS NULL THEN
    NEW.billing_interval := 'monthly';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_services_billing_interval ON public.services;
CREATE TRIGGER trg_services_billing_interval
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.services_validate_billing_interval();

UPDATE public.services
   SET billing_type = 'recorrente',
       billing_interval = 'monthly',
       default_price_cents = 29700,
       default_limits = COALESCE(default_limits, '{}'::jsonb) || jsonb_build_object('max_products', 10)
 WHERE code = 'acompanhamento_shopee';

UPDATE public.services SET billing_interval = NULL WHERE billing_type = 'pontual';

-- 2. Tabela de contratações
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  proposal_item_id UUID REFERENCES public.proposal_items(id) ON DELETE SET NULL,

  service_code_snapshot TEXT,
  name_snapshot TEXT NOT NULL,
  description_snapshot TEXT,
  billing_type_snapshot public.service_billing_type NOT NULL DEFAULT 'pontual',
  billing_interval_snapshot public.billing_interval,

  unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  contracted_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (contracted_amount_cents >= 0),
  scope_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  status public.client_service_status NOT NULL DEFAULT 'pendente',

  contracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotência: um item de proposta origina no máximo uma contratação
CREATE UNIQUE INDEX IF NOT EXISTS client_services_proposal_item_uniq
  ON public.client_services (proposal_item_id)
  WHERE proposal_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_services_client ON public.client_services (client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_proposal ON public.client_services (proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service ON public.client_services (service_id);
CREATE INDEX IF NOT EXISTS idx_client_services_status ON public.client_services (status);
CREATE INDEX IF NOT EXISTS idx_client_services_created_at ON public.client_services (created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.client_services TO authenticated;
GRANT ALL ON public.client_services TO service_role;

ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_services_select_authenticated ON public.client_services;
CREATE POLICY client_services_select_authenticated ON public.client_services
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS client_services_insert_admin_operator ON public.client_services;
CREATE POLICY client_services_insert_admin_operator ON public.client_services
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

DROP POLICY IF EXISTS client_services_update_admin_operator ON public.client_services;
CREATE POLICY client_services_update_admin_operator ON public.client_services
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- Sem policy de DELETE: exclusão física bloqueada por RLS

DROP TRIGGER IF EXISTS trg_client_services_updated_at ON public.client_services;
CREATE TRIGGER trg_client_services_updated_at
  BEFORE UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coerência de datas por status
CREATE OR REPLACE FUNCTION public.client_services_sync_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.billing_type_snapshot = 'pontual' THEN
    NEW.billing_interval_snapshot := NULL;
  END IF;
  IF NEW.status = 'ativo' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  IF NEW.status = 'concluido' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  IF NEW.status = 'cancelado' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_client_services_sync_dates ON public.client_services;
CREATE TRIGGER trg_client_services_sync_dates
  BEFORE INSERT OR UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.client_services_sync_dates();