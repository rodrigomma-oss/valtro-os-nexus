-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.saas_product_status AS ENUM ('active','inactive','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.beta_program_status AS ENUM ('draft','planned','active','paused','completed','cancelled','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) saas_products
CREATE TABLE IF NOT EXISTS public.saas_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.saas_product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saas_products_code_snake_case CHECK (code ~ '^[a-z0-9_]+$'),
  CONSTRAINT saas_products_name_not_blank CHECK (btrim(name) <> '')
);

GRANT SELECT, INSERT, UPDATE ON public.saas_products TO authenticated;
GRANT ALL ON public.saas_products TO service_role;
ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saas_products_select_authenticated" ON public.saas_products;
CREATE POLICY "saas_products_select_authenticated"
  ON public.saas_products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "saas_products_insert_admin" ON public.saas_products;
CREATE POLICY "saas_products_insert_admin"
  ON public.saas_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "saas_products_update_admin" ON public.saas_products;
CREATE POLICY "saas_products_update_admin"
  ON public.saas_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.saas_products_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Produtos SaaS não podem ser excluídos; use o status arquivado.' USING ERRCODE = 'check_violation';
END $$;

CREATE OR REPLACE FUNCTION public.saas_products_code_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código do produto SaaS é imutável.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_saas_products_updated_at ON public.saas_products;
CREATE TRIGGER trg_saas_products_updated_at
  BEFORE UPDATE ON public.saas_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_products_code_immutable ON public.saas_products;
CREATE TRIGGER trg_saas_products_code_immutable
  BEFORE UPDATE ON public.saas_products
  FOR EACH ROW EXECUTE FUNCTION public.saas_products_code_immutable();

DROP TRIGGER IF EXISTS trg_saas_products_block_delete ON public.saas_products;
CREATE TRIGGER trg_saas_products_block_delete
  BEFORE DELETE ON public.saas_products
  FOR EACH ROW EXECUTE FUNCTION public.saas_products_block_delete();

-- 3) beta_programs
CREATE TABLE IF NOT EXISTS public.beta_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_product_id UUID NOT NULL REFERENCES public.saas_products(id) ON DELETE RESTRICT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.beta_program_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  enrollment_starts_at TIMESTAMPTZ,
  enrollment_ends_at TIMESTAMPTZ,
  target_participants INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT beta_programs_code_snake_case CHECK (code ~ '^[a-z0-9_]+$'),
  CONSTRAINT beta_programs_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT beta_programs_target_participants_positive CHECK (target_participants IS NULL OR target_participants > 0),
  CONSTRAINT beta_programs_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT beta_programs_enrollment_dates_check CHECK (enrollment_ends_at IS NULL OR enrollment_starts_at IS NULL OR enrollment_ends_at >= enrollment_starts_at)
);

CREATE INDEX IF NOT EXISTS beta_programs_saas_product_id_idx ON public.beta_programs (saas_product_id);

GRANT SELECT, INSERT, UPDATE ON public.beta_programs TO authenticated;
GRANT ALL ON public.beta_programs TO service_role;
ALTER TABLE public.beta_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_programs_select_authenticated" ON public.beta_programs;
CREATE POLICY "beta_programs_select_authenticated"
  ON public.beta_programs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "beta_programs_insert_write_roles" ON public.beta_programs;
CREATE POLICY "beta_programs_insert_write_roles"
  ON public.beta_programs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

DROP POLICY IF EXISTS "beta_programs_update_write_roles" ON public.beta_programs;
CREATE POLICY "beta_programs_update_write_roles"
  ON public.beta_programs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

CREATE OR REPLACE FUNCTION public.beta_programs_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
BEGIN
  RAISE EXCEPTION 'Programas beta não podem ser excluídos; use o status arquivado/cancelado.' USING ERRCODE = 'check_violation';
END $$;

DROP TRIGGER IF EXISTS trg_beta_programs_updated_at ON public.beta_programs;
CREATE TRIGGER trg_beta_programs_updated_at
  BEFORE UPDATE ON public.beta_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_beta_programs_block_delete ON public.beta_programs;
CREATE TRIGGER trg_beta_programs_block_delete
  BEFORE DELETE ON public.beta_programs
  FOR EACH ROW EXECUTE FUNCTION public.beta_programs_block_delete();

-- 4) Seeds idempotentes
INSERT INTO public.saas_products (code, name, status, description)
VALUES ('valtro_pricing', 'Valtro Pricing', 'active',
        'Plataforma de precificação e análise financeira para vendedores de marketplaces.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.beta_programs (saas_product_id, code, name, status, created_by)
SELECT sp.id, 'valtro_pricing_closed_beta', 'Beta Fechado — Valtro Pricing', 'draft',
       (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.created_at LIMIT 1)
FROM public.saas_products sp
WHERE sp.code = 'valtro_pricing'
ON CONFLICT (code) DO NOTHING;

-- 5) tickets.product_id -> saas_products.id
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_product_id_fkey;

UPDATE public.tickets t
SET product_id = (SELECT sp.id FROM public.saas_products sp WHERE sp.code = 'valtro_pricing')
WHERE NOT EXISTS (SELECT 1 FROM public.saas_products sp WHERE sp.id = t.product_id);

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.saas_products(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS tickets_product_id_idx ON public.tickets (product_id);